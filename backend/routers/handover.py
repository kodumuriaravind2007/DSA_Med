"""
Feature C: Intelligent Doctor–Nurse Handover Router.
Provides structured clinical handoffs capturing care context, vital trends,
pending actions, critical concerns, and receiving staff acknowledgements.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import uuid

from ..database import get_db
from ..models import (
    ClinicalHandover, Patient, VitalSign, MARTask,
    CriticalResultFollowUp, PatientHistoryChangeAlert, AuditLog
)
from ..schemas import (
    ClinicalHandoverCreate, ClinicalHandoverResponse, ClinicalHandoverAcknowledge
)
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .websocket import manager

router = APIRouter(prefix="/api/handovers", tags=["Intelligent Doctor-Nurse Handover"])


@router.get("", response_model=List[ClinicalHandoverResponse])
def get_handovers(
    patient_id: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve list of clinical handovers filtered by patient, ward, or status."""
    query = db.query(ClinicalHandover)
    if patient_id:
        query = query.filter(ClinicalHandover.patient_id == patient_id)
    if ward:
        query = query.filter(ClinicalHandover.ward == ward)
    if status:
        query = query.filter(ClinicalHandover.status == status)

    return query.order_by(ClinicalHandover.created_at.desc()).all()


@router.get("/{handover_id}", response_model=ClinicalHandoverResponse)
def get_handover_by_id(handover_id: str, db: Session = Depends(get_db)):
    """Retrieve specific handover record."""
    handover = db.query(ClinicalHandover).filter(ClinicalHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=404, detail=f"Handover {handover_id} not found")
    return handover


@router.get("/generate/{patient_id}")
def generate_handover_summary(patient_id: str, db: Session = Depends(get_db)):
    """
    Intelligent aggregation engine: automatically synthesizes current vitals,
    pending critical laboratory results, active MAR orders, recent alerts, and bed assignment
    into a structured clinical handover recommendation.
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    # Latest Vitals
    latest_vital = (
        db.query(VitalSign)
        .filter(VitalSign.patient_id == patient_id)
        .order_by(VitalSign.recorded_at.desc())
        .first()
    )
    vital_str = "No vitals recorded"
    if latest_vital:
        vital_str = (
            f"BP {latest_vital.blood_pressure_systolic}/{latest_vital.blood_pressure_diastolic} mmHg, "
            f"HR {latest_vital.heart_rate} bpm, SpO2 {latest_vital.oxygen_saturation_spo2}%, "
            f"Temp {latest_vital.temperature_f}°F, RR {latest_vital.respiratory_rate}/min "
            f"({latest_vital.recorded_at[:16] if latest_vital.recorded_at else ''})"
        )

    # Active MAR Orders
    active_mars = (
        db.query(MARTask)
        .filter(MARTask.patient_id == patient_id, MARTask.status.in_(["Due", "Due Soon", "Active"]))
        .all()
    )
    med_list = [f"{m.medication_name} {m.dosage} ({m.route}, status: {m.status})" for m in active_mars]

    # Pending Critical Labs
    pending_criticals = (
        db.query(CriticalResultFollowUp)
        .filter(
            CriticalResultFollowUp.patient_id == patient_id,
            CriticalResultFollowUp.status.in_(["Awaiting Acknowledgement", "Acknowledged", "Follow-up In Progress"])
        )
        .all()
    )
    critical_concerns = []
    for c in pending_criticals:
        critical_concerns.append(f"STAT LAB: {c.test_name} - {c.parameter_name}: {c.result_value} ({c.status})")

    # Unreviewed change alerts
    unreviewed_alerts = (
        db.query(PatientHistoryChangeAlert)
        .filter(PatientHistoryChangeAlert.patient_id == patient_id, PatientHistoryChangeAlert.is_reviewed == False)
        .all()
    )
    for a in unreviewed_alerts:
        critical_concerns.append(f"Unreviewed Alert: {a.field_name} changed to '{a.new_value}' by {a.author_name}")

    bed_info = f"{patient.assigned_bed.bed_id} ({patient.assigned_bed.ward})" if patient.assigned_bed else "Unassigned / Outpatient"
    allergy_names = ", ".join([a.allergen for a in patient.allergies]) if patient.allergies else "No Known Drug Allergies (NKDA)"

    # Auto-generate recommended summary
    clinical_summary = (
        f"{patient.full_name} ({patient.age}y/{patient.gender}), ID: {patient.patient_id}. "
        f"Location: {bed_info}. Department: {patient.department}. "
        f"Reported Concern: {patient.reported_concern or 'Routine review'}. "
        f"Known Allergies: {allergy_names}. "
        f"Latest Vitals: {vital_str}."
    )

    suggested_tasks = []
    if pending_criticals:
        suggested_tasks.append("Follow up critical lab results and adjust treatment regimen")
    if active_mars:
        suggested_tasks.append(f"Administer scheduled MAR doses ({len(active_mars)} active medications)")
    suggested_tasks.append("Monitor vital signs every 4 hours")
    if not patient.assigned_bed:
        suggested_tasks.append("Verify bed placement or discharge readiness")

    contingency = (
        "If systolic BP < 90 or SpO2 < 92%, notify on-call physician immediately and initiate O2 therapy. "
        "Escalate acute cardiac symptoms to Rapid Response Team."
    )

    return {
        "patient_id": patient_id,
        "patient_name": patient.full_name,
        "ward": patient.assigned_bed.ward if patient.assigned_bed else "General Ward",
        "bed_number": patient.assigned_bed.bed_id if patient.assigned_bed else "N/A",
        "clinical_summary": clinical_summary,
        "active_medications": med_list,
        "pending_tasks": suggested_tasks,
        "critical_concerns": "\n".join(critical_concerns) if critical_concerns else "No immediate critical flags.",
        "contingency_plans": contingency
    }


@router.post("", response_model=ClinicalHandoverResponse)
async def create_handover(
    payload: ClinicalHandoverCreate,
    db: Session = Depends(get_db)
):
    """Create a new shift clinical handover record."""
    patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {payload.patient_id} not found")

    # Determine version if previous handovers exist
    prev_count = db.query(ClinicalHandover).filter(ClinicalHandover.patient_id == payload.patient_id).count()

    handover_id = f"HND-{uuid.uuid4().hex[:6].upper()}"
    handover = ClinicalHandover(
        id=handover_id,
        patient_id=payload.patient_id,
        ward=payload.ward or (patient.assigned_bed.ward if patient.assigned_bed else "General Ward"),
        outgoing_staff_id=payload.outgoing_staff_id or "",
        outgoing_staff_name=payload.outgoing_staff_name,
        outgoing_role=payload.outgoing_role,
        incoming_staff_name=payload.incoming_staff_name or "",
        incoming_role=payload.incoming_role or "nurse",
        status="Submitted",
        clinical_summary=payload.clinical_summary,
        pending_tasks=payload.pending_tasks or "[]",
        critical_concerns=payload.critical_concerns or "",
        contingency_plans=payload.contingency_plans or "",
        version=prev_count + 1,
        created_at=datetime.utcnow().isoformat(),
        notes=payload.notes or ""
    )
    db.add(handover)

    # Chained Audit Log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Shift handover created for {patient.full_name} ({payload.patient_id}) by {payload.outgoing_staff_name} ({payload.outgoing_role})"
    timestamp = datetime.utcnow().isoformat()
    curr_hash = compute_audit_hash(prev_hash, timestamp, payload.outgoing_staff_name, "CLINICAL_HANDOVER_SUBMITTED", handover_id, details)

    audit_entry = AuditLog(
        timestamp=timestamp,
        actor=payload.outgoing_staff_name,
        action="CLINICAL_HANDOVER_SUBMITTED",
        record_id=handover_id,
        details=details,
        prev_hash=prev_hash,
        current_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(handover)

    # Broadcast WebSocket
    try:
        await manager.broadcast({
            "type": "HANDOVER_SUBMITTED",
            "handover_id": handover.id,
            "patient_id": handover.patient_id,
            "patient_name": patient.full_name,
            "outgoing_staff": payload.outgoing_staff_name,
            "ward": handover.ward,
            "timestamp": timestamp
        })
    except Exception:
        pass

    return handover


@router.post("/{handover_id}/acknowledge", response_model=ClinicalHandoverResponse)
async def acknowledge_handover(
    handover_id: str,
    payload: ClinicalHandoverAcknowledge,
    db: Session = Depends(get_db)
):
    """Incoming clinician acknowledges shift handover responsibility."""
    handover = db.query(ClinicalHandover).filter(ClinicalHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=404, detail=f"Handover {handover_id} not found")

    now_iso = datetime.utcnow().isoformat()
    handover.status = "Acknowledged"
    handover.acknowledged_by = payload.acknowledged_by
    handover.acknowledged_at = now_iso
    if payload.notes:
        handover.notes = f"{handover.notes}\n[Ack Note by {payload.acknowledged_by}]: {payload.notes}".strip()

    # Chained Audit Log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Shift handover {handover_id} acknowledged by {payload.acknowledged_by}"
    curr_hash = compute_audit_hash(prev_hash, now_iso, payload.acknowledged_by, "CLINICAL_HANDOVER_ACKNOWLEDGED", handover_id, details)

    audit_entry = AuditLog(
        timestamp=now_iso,
        actor=payload.acknowledged_by,
        action="CLINICAL_HANDOVER_ACKNOWLEDGED",
        record_id=handover_id,
        details=details,
        prev_hash=prev_hash,
        current_hash=curr_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(handover)

    # Broadcast WebSocket
    try:
        await manager.broadcast({
            "type": "HANDOVER_ACKNOWLEDGED",
            "handover_id": handover.id,
            "patient_id": handover.patient_id,
            "acknowledged_by": payload.acknowledged_by,
            "timestamp": now_iso
        })
    except Exception:
        pass

    return handover
