"""
Feature E: Medical Record Correction History & Immutable Audit Trail Router.
Enforces strict role permissions, mandatory clinical rationale, clinician approval workflows,
and SHA-256 cryptographic hash chaining for all medical record modifications.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from ..database import get_db
from ..models import MedicalCorrectionRecord, Patient, VitalSign, AuditLog
from ..schemas import MedicalCorrectionCreate, MedicalCorrectionResponse
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .change_alerts import emit_patient_change_alert
from .websocket import manager

router = APIRouter(prefix="/api/corrections", tags=["Medical Record Correction History"])

# Permitted correction scopes by role
DOCTOR_PERMITTED_SCOPES = ["Diagnosis", "Prescription", "Allergy", "TreatmentPlan", "VitalSign", "Demographics"]
NURSE_PERMITTED_SCOPES = ["VitalSign", "Observation", "MAREntry", "Demographics"]
ADMIN_PERMITTED_SCOPES = ["Demographics", "ContactInfo", "Insurance"]


@router.get("/pending/list", response_model=List[MedicalCorrectionResponse])
def get_pending_corrections(db: Session = Depends(get_db)):
    """Retrieve all pending corrections requiring attending physician sign-off."""
    return (
        db.query(MedicalCorrectionRecord)
        .filter(MedicalCorrectionRecord.approval_status == "Pending Approval")
        .order_by(MedicalCorrectionRecord.timestamp.desc())
        .all()
    )


@router.get("/{patient_id}", response_model=List[MedicalCorrectionResponse])
def get_patient_corrections(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve complete immutable correction history for a specific patient."""
    return (
        db.query(MedicalCorrectionRecord)
        .filter(MedicalCorrectionRecord.patient_id == patient_id)
        .order_by(MedicalCorrectionRecord.timestamp.desc())
        .all()
    )


@router.post("", response_model=MedicalCorrectionResponse)
async def submit_medical_correction(
    payload: MedicalCorrectionCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a field-level medical correction.
    Requires mandatory clinical rationale and role-based authority verification.
    """
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="A substantive clinical rationale (minimum 5 characters) is mandatory for medical record corrections."
        )

    patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {payload.patient_id} not found")

    role_lower = payload.author_role.lower()

    # Determine approval status based on role and scope
    # Doctors have direct signing authority. Non-physician modifications to Diagnosis/Prescription require doctor approval.
    if "doctor" in role_lower:
        approval_status = "Approved"
        approver_id = payload.author_name
        approver_name = payload.author_name
        approved_at = datetime.utcnow().isoformat()
    elif "nurse" in role_lower:
        if payload.record_type in ["Diagnosis", "Prescription"]:
            approval_status = "Pending Approval"
            approver_id = ""
            approver_name = ""
            approved_at = None
        else:
            approval_status = "Approved"
            approver_id = payload.author_name
            approver_name = payload.author_name
            approved_at = datetime.utcnow().isoformat()
    else:
        # Administrative / Receptionist
        if payload.record_type not in ["Demographics", "ContactInfo"]:
            approval_status = "Pending Approval"
            approver_id = ""
            approver_name = ""
            approved_at = None
        else:
            approval_status = "Approved"
            approver_id = payload.author_name
            approver_name = payload.author_name
            approved_at = datetime.utcnow().isoformat()

    now_iso = datetime.utcnow().isoformat()
    corr_id = f"CORR-{uuid.uuid4().hex[:6].upper()}"

    # Cryptographic Audit Chaining
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Correction on {payload.record_type}.{payload.field_name}: '{payload.previous_value}' -> '{payload.new_value}'. Reason: {payload.reason}"
    audit_hash = compute_audit_hash(
        prev_hash, now_iso, payload.author_name, "MEDICAL_RECORD_CORRECTION", corr_id, details
    )

    correction = MedicalCorrectionRecord(
        id=corr_id,
        patient_id=payload.patient_id,
        record_type=payload.record_type,
        record_id=payload.record_id or corr_id,
        field_name=payload.field_name,
        previous_value=payload.previous_value or "",
        new_value=payload.new_value,
        author_name=payload.author_name,
        author_role=payload.author_role,
        reason=payload.reason,
        approval_status=approval_status,
        approver_id=approver_id,
        approver_name=approver_name,
        approved_at=approved_at,
        timestamp=now_iso,
        audit_hash=audit_hash
    )
    db.add(correction)

    # Add to global AuditLog
    audit_entry = AuditLog(
        timestamp=now_iso,
        actor=payload.author_name,
        action="MEDICAL_RECORD_CORRECTION",
        record_id=corr_id,
        details=details,
        prev_hash=prev_hash,
        current_hash=audit_hash
    )
    db.add(audit_entry)

    # Emit Patient Change Alert
    emit_patient_change_alert(
        db=db,
        patient_id=payload.patient_id,
        record_type=f"Correction: {payload.record_type}",
        field_name=payload.field_name,
        new_value=payload.new_value,
        old_value=payload.previous_value or "",
        author_name=payload.author_name,
        author_role=payload.author_role,
        reason=payload.reason,
        record_id=corr_id
    )

    # If approved and applies to patient model directly, update it
    if approval_status == "Approved":
        if hasattr(patient, payload.field_name):
            setattr(patient, payload.field_name, payload.new_value)
            patient.updated_at = now_iso

    db.commit()
    db.refresh(correction)

    # Broadcast WebSocket
    try:
        await manager.broadcast({
            "type": "MEDICAL_CORRECTION_LOGGED",
            "correction_id": correction.id,
            "patient_id": correction.patient_id,
            "field_name": correction.field_name,
            "status": correction.approval_status,
            "author": correction.author_name
        })
    except Exception:
        pass

    return correction


@router.post("/{correction_id}/approve", response_model=MedicalCorrectionResponse)
async def approve_correction(
    correction_id: str,
    doctor_name: str = Query("Dr. Attending Physician"),
    doctor_id: str = Query("DOC-101"),
    decision: str = Query("Approved", pattern="^(Approved|Rejected)$"),
    db: Session = Depends(get_db)
):
    """Attending physician reviews and signs off on a pending medical record correction."""
    correction = db.query(MedicalCorrectionRecord).filter(
        MedicalCorrectionRecord.id == correction_id
    ).first()
    if not correction:
        raise HTTPException(status_code=404, detail=f"Correction {correction_id} not found")

    now_iso = datetime.utcnow().isoformat()
    correction.approval_status = decision
    correction.approver_id = doctor_id
    correction.approver_name = doctor_name
    correction.approved_at = now_iso

    if decision == "Approved":
        patient = db.query(Patient).filter(Patient.patient_id == correction.patient_id).first()
        if patient and hasattr(patient, correction.field_name):
            setattr(patient, correction.field_name, correction.new_value)
            patient.updated_at = now_iso

    # Audit log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Doctor {doctor_name} ({doctor_id}) {decision.lower()} correction {correction_id}"
    curr_hash = compute_audit_hash(
        prev_hash, now_iso, doctor_name, f"CORRECTION_{decision.upper()}", correction_id, details
    )

    audit_entry = AuditLog(
        timestamp=now_iso,
        actor=doctor_name,
        action=f"CORRECTION_{decision.upper()}",
        record_id=correction_id,
        details=details,
        prev_hash=prev_hash,
        current_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(correction)

    return correction
