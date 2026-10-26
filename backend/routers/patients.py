"""
Patient Management Router for MedTree X.
Implements:
- Patient Registration with unique ID generation
- Duplicate candidate pre-check
- Automatic priority heap queuing
- Patient 360° unified profile retrieval
- Status workflow transitions
- Audit logging with cryptographic hash chaining
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from ..database import get_db
from ..models import (
    Patient, VitalSign, Allergy, Medication, LabOrder, LabResult,
    Visit, TimelineEvent, AuditLog, CDSRecord, Doctor, Bed
)
from ..schemas import (
    PatientCreate, PatientUpdate, PatientResponse, Patient360Response,
    StatusTransitionRequest, PriorityUpdateRequest
)
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from ..dsa.duplicate_detector import DuplicateDetector
from ..dsa.waiting_time_estimator import WaitingTimeEstimator
from .websocket import manager
from ..auth import get_current_user_optional

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def generate_next_patient_id(db: Session) -> str:
    """Generates sequential zero-padded ID: PT-101, PT-102..."""
    patients = db.query(Patient.patient_id).all()
    max_num = 100
    for (p_id,) in patients:
        if p_id.startswith("PT-"):
            try:
                num = int(p_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"PT-{max_num + 1}"


def log_audit_event(db: Session, actor: str, action: str, record_id: str, details: Any) -> AuditLog:
    """Computes SHA-256 hash link and writes event to audit table."""
    from ..dsa.audit_chain import canonicalize_details
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    ts = datetime.utcnow().isoformat()
    details_str = canonicalize_details(details)
    curr_h = compute_audit_hash(prev_h, ts, actor, action, record_id, details_str)

    entry = AuditLog(
        timestamp=ts,
        actor=actor,
        action=action,
        record_id=record_id,
        details=details_str,
        prev_hash=prev_h,
        current_hash=curr_h,
    )
    db.add(entry)
    db.flush()
    return entry


@router.post("", response_model=PatientResponse)
@router.post("/", response_model=PatientResponse)
def register_patient(req: PatientCreate, db: Session = Depends(get_db)):
    """Registers a new patient, verifies duplicates, initial vitals, and updates audit chain."""
    patient_id = generate_next_patient_id(db)

    # Check for potential duplicates
    existing_patients = db.query(Patient).all()
    detector = DuplicateDetector()
    existing_dicts = [
        {
            "patient_id": p.patient_id,
            "full_name": p.full_name,
            "phone": p.phone,
            "email": p.email,
            "date_of_birth": "",
            "gender": p.gender,
        }
        for p in existing_patients
    ]
    candidate_dict = {
        "patient_id": patient_id,
        "full_name": req.full_name,
        "phone": req.phone,
        "email": req.email,
        "date_of_birth": "",
        "gender": req.gender,
    }
    matches = detector.find_potential_duplicates(candidate_dict, existing_dicts, threshold=0.65)
    is_dup_flag = len(matches) > 0

    now_ts = datetime.utcnow().timestamp()
    iso_now = datetime.utcnow().isoformat()

    new_patient = Patient(
        patient_id=patient_id,
        full_name=req.full_name,
        age=req.age,
        gender=req.gender,
        phone=req.phone or "",
        email=req.email or "",
        govt_id=req.govt_id or "",
        address=req.address or "",
        blood_group=req.blood_group or "",
        priority=req.priority,
        status="Waiting",
        department=req.department or "Emergency",
        reported_concern=req.reported_concern or "",
        arrival_time=now_ts,
        registration_date=iso_now,
        updated_at=iso_now,
        is_duplicate_flag=is_dup_flag,
        triage_notes=req.triage_notes or "",
    )
    db.add(new_patient)
    db.flush()

    # Initial vitals if provided
    if req.initial_vitals:
        v = req.initial_vitals
        vital_entry = VitalSign(
            patient_id=patient_id,
            blood_pressure_systolic=v.blood_pressure_systolic,
            blood_pressure_diastolic=v.blood_pressure_diastolic,
            heart_rate=v.heart_rate,
            temperature_f=v.temperature_f,
            respiratory_rate=v.respiratory_rate,
            oxygen_saturation_spo2=v.oxygen_saturation_spo2,
            recorded_at=iso_now,
        )
        db.add(vital_entry)

    # Initial allergies if provided
    if req.initial_allergies:
        for al in req.initial_allergies:
            al_entry = Allergy(
                patient_id=patient_id,
                allergen=al.allergen,
                severity=al.severity,
                reaction=al.reaction or "",
            )
            db.add(al_entry)

    # Add initial timeline event
    timeline_event = TimelineEvent(
        patient_id=patient_id,
        timestamp=iso_now,
        event_type="Registration",
        title="Patient Registered",
        description=f"Registered in {req.department} with complaint: {req.reported_concern or 'Routine'}. Assigned initial Priority {req.priority}.",
        actor="Triage Officer",
    )
    db.add(timeline_event)

    # Tamper-evident audit log
    log_audit_event(
        db,
        actor="Triage Officer",
        action="REGISTER_PATIENT",
        record_id=patient_id,
        details={
            "name": req.full_name,
            "priority": req.priority,
            "department": req.department,
            "is_duplicate_suspect": is_dup_flag,
        }
    )

    db.commit()
    db.refresh(new_patient)

    manager.broadcast_sync("NEW_PATIENT_REGISTRATION", {
        "patient_id": patient_id,
        "full_name": req.full_name,
        "priority": req.priority,
        "department": req.department
    })
    manager.broadcast_sync("QUEUE_UPDATED", {"patient_id": patient_id, "action": "ENQUEUE"})

    return new_patient


@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse])
def list_patients(
    search: Optional[str] = None,
    priority: Optional[int] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists patients with flexible searching and filtering."""
    query = db.query(Patient)

    if priority:
        query = query.filter(Patient.priority == priority)
    if department and department != "All":
        query = query.filter(Patient.department.ilike(f"%{department}%"))
    if status and status != "All":
        query = query.filter(Patient.status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Patient.patient_id.ilike(s)) |
            (Patient.full_name.ilike(s)) |
            (Patient.phone.ilike(s)) |
            (Patient.email.ilike(s)) |
            (Patient.govt_id.ilike(s))
        )

    return query.order_by(Patient.priority.asc(), Patient.arrival_time.asc()).all()


@router.get("/{patient_id}", response_model=Patient360Response)
def get_patient_360(
    patient_id: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieves unified Patient 360 profile with complete clinical history and timeline."""
    current_user = get_current_user_optional(authorization, token, db)
    if current_user and current_user.role == "patient" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: You are only authorized to view your own patient records."
        )

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Calculate queue position & estimated wait
    queue_pos = None
    estimated_wait = None
    if patient.status == "Waiting":
        waiting_ahead = (
            db.query(Patient)
            .filter(
                Patient.status == "Waiting",
                (Patient.priority < patient.priority) |
                ((Patient.priority == patient.priority) & (Patient.arrival_time < patient.arrival_time))
            )
            .all()
        )
        queue_pos = len(waiting_ahead) + 1
        active_docs = db.query(Doctor).filter(
            Doctor.department == patient.department,
            Doctor.duty_status == "On Duty",
            Doctor.is_available == True
        ).count()
        wait_info = WaitingTimeEstimator.calculate_estimated_wait(
            patient.priority,
            [p.__dict__ for p in waiting_ahead],
            active_docs
        )
        estimated_wait = wait_info["estimated_wait_minutes"]

    return Patient360Response(
        patient=patient,
        vitals=patient.vitals,
        allergies=patient.allergies,
        medications=patient.medications,
        lab_orders=patient.lab_orders,
        visits=patient.visits,
        timeline=patient.timeline_events,
        estimated_wait_minutes=estimated_wait,
        queue_position=queue_pos,
        critical_followups=[
            {
                "id": c.id,
                "test_name": c.test_name,
                "parameter_name": c.parameter_name,
                "result_value": c.result_value,
                "status": c.status,
                "deadline": c.deadline,
                "critical_rationale": c.critical_rationale,
                "acknowledged_by": c.acknowledged_by,
                "created_at": c.created_at,
            }
            for c in (patient.critical_followups or [])
        ],
        change_alerts=[
            {
                "id": a.id,
                "record_type": a.record_type,
                "field_name": a.field_name,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "author_name": a.author_name,
                "reason": a.reason,
                "is_reviewed": a.is_reviewed,
                "created_at": a.created_at,
            }
            for a in (patient.history_change_alerts or [])
        ],
        handovers=[
            {
                "id": h.id,
                "ward": h.ward,
                "outgoing_staff_name": h.outgoing_staff_name,
                "outgoing_role": h.outgoing_role,
                "status": h.status,
                "clinical_summary": h.clinical_summary,
                "critical_concerns": h.critical_concerns,
                "created_at": h.created_at,
            }
            for h in (patient.clinical_handovers or [])
        ],
        corrections=[
            {
                "id": cr.id,
                "record_type": cr.record_type,
                "field_name": cr.field_name,
                "previous_value": cr.previous_value,
                "new_value": cr.new_value,
                "author_name": cr.author_name,
                "author_role": cr.author_role,
                "reason": cr.reason,
                "approval_status": cr.approval_status,
                "timestamp": cr.timestamp,
                "audit_hash": cr.audit_hash,
            }
            for cr in (patient.medical_corrections or [])
        ],
    )


@router.patch("/{patient_id}/status")
def update_patient_status(patient_id: str, req: StatusTransitionRequest, db: Session = Depends(get_db)):
    """Updates patient status through clinical workflow transitions."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    old_status = patient.status
    patient.status = req.new_status
    patient.updated_at = datetime.utcnow().isoformat()

    # Timeline event
    timeline = TimelineEvent(
        patient_id=patient.patient_id,
        timestamp=datetime.utcnow().isoformat(),
        event_type="Status Transition",
        title=f"Status Changed: {old_status} -> {req.new_status}",
        description=req.notes or f"Workflow transition initiated by {req.actor}.",
        actor=req.actor
    )
    db.add(timeline)

    # If completed or discharged, release bed if assigned
    if req.new_status in ["Completed", "Discharged"] and patient.assigned_bed_id:
        bed = db.query(Bed).filter(Bed.bed_id == patient.assigned_bed_id).first()
        if bed:
            bed.status = "Cleaning"
            bed.current_patient_id = None
            db.add(bed)

    log_audit_event(
        db,
        actor=req.actor,
        action="UPDATE_STATUS",
        record_id=patient_id,
        details={"old_status": old_status, "new_status": req.new_status, "notes": req.notes}
    )

    db.commit()
    manager.broadcast_sync("QUEUE_UPDATED", {"patient_id": patient_id, "new_status": req.new_status})
    return {"status": "success", "patient_id": patient_id, "new_status": req.new_status}


@router.patch("/{patient_id}/priority")
def update_patient_priority(patient_id: str, req: PriorityUpdateRequest, db: Session = Depends(get_db)):
    """Updates triage priority level and maintains audit trace."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    old_prio = patient.priority
    patient.priority = req.new_priority
    patient.updated_at = datetime.utcnow().isoformat()

    timeline = TimelineEvent(
        patient_id=patient.patient_id,
        timestamp=datetime.utcnow().isoformat(),
        event_type="Triage Update",
        title=f"Priority Escalation: Priority {old_prio} -> Priority {req.new_priority}",
        description=f"Reason: {req.reason}",
        actor=req.actor
    )
    db.add(timeline)

    log_audit_event(
        db,
        actor=req.actor,
        action="UPDATE_PRIORITY",
        record_id=patient_id,
        details={"old_priority": old_prio, "new_priority": req.new_priority, "reason": req.reason}
    )

    db.commit()
    manager.broadcast_sync("QUEUE_UPDATED", {"patient_id": patient_id, "new_priority": req.new_priority})
    return {"status": "success", "patient_id": patient_id, "new_priority": req.new_priority}
