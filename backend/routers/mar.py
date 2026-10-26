"""
Medication Administration Record (MAR) Router for MedTree X.
Provides scheduled medication administration tracking, overdue alerts,
nurse administration recording, and clinical hold/delay documentation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from ..database import get_db
from ..models import MARTask, Medication, Patient, TimelineEvent
from ..schemas import MARTaskResponse, MARAdministerRequest, MARHoldRequest
from .patients import log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/mar", tags=["Medication Administration Record"])


def generate_next_mar_id(db: Session) -> str:
    """Generates sequential ID: MAR-801, MAR-802..."""
    tasks = db.query(MARTask.id).all()
    max_num = 800
    for (t_id,) in tasks:
        if t_id and t_id.startswith("MAR-"):
            try:
                num = int(t_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"MAR-{max_num + 1}"


@router.get("/patient/{patient_id}", response_model=List[MARTaskResponse])
def get_patient_mar_tasks(patient_id: str, db: Session = Depends(get_db)):
    """Returns all MAR tasks for a specific patient."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")

    tasks = db.query(MARTask).filter(MARTask.patient_id == patient_id).order_by(MARTask.scheduled_time.asc()).all()

    # Dynamic status update if Due and time has passed
    now_iso = datetime.now().isoformat()
    for task in tasks:
        if task.status == "Due" and task.scheduled_time < now_iso:
            task.status = "Delayed"  # overdue

    return tasks


@router.get("/due", response_model=List[MARTaskResponse])
def get_due_mar_tasks(db: Session = Depends(get_db)):
    """Returns all currently Due, Due Soon, or Delayed MAR tasks hospital-wide."""
    tasks = db.query(MARTask).filter(
        MARTask.status.in_(["Due", "Due Soon", "Delayed", "Requires Review"])
    ).order_by(MARTask.scheduled_time.asc()).all()
    return tasks


@router.post("/patient/{patient_id}/generate-schedule")
def generate_patient_mar_schedule(patient_id: str, db: Session = Depends(get_db)):
    """
    Generates scheduled doses for the patient's active prescribed medications
    for the next 24 hours.
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    active_meds = db.query(Medication).filter(
        Medication.patient_id == patient_id,
        Medication.status == "Active"
    ).all()

    if not active_meds:
        return {"status": "info", "message": "No active medications found to schedule.", "tasks_created": 0}

    now = datetime.now()
    created_tasks = []

    for med in active_meds:
        # Determine schedule based on frequency
        freq = (med.frequency or "").lower()
        offsets = [2, 8, 14] if "three" in freq or "tid" in freq else ([4, 12] if "twice" in freq or "bid" in freq else [4])
        for offset_hours in offsets:
            scheduled_dt = now + timedelta(hours=offset_hours)
            scheduled_iso = scheduled_dt.strftime("%Y-%m-%dT%H:00:00")

            # Check if duplicate already exists
            existing = db.query(MARTask).filter(
                MARTask.patient_id == patient_id,
                MARTask.medication_name == med.name,
                MARTask.scheduled_time == scheduled_iso
            ).first()

            if not existing:
                task_id = generate_next_mar_id(db)
                route = "IV" if "injection" in med.name.lower() or "saline" in med.name.lower() else "Oral"
                task = MARTask(
                    id=task_id,
                    medication_id=med.id,
                    patient_id=patient_id,
                    medication_name=med.name,
                    dosage=med.dosage,
                    route=route,
                    scheduled_time=scheduled_iso,
                    status="Due",
                    administered_by="",
                    hold_reason="",
                    notes=f"Auto-scheduled from prescription: {med.name} {med.dosage}",
                    created_at=datetime.now().isoformat()
                )
                db.add(task)
                db.flush()
                created_tasks.append(task_id)

    db.commit()

    if created_tasks:
        manager.broadcast_sync("MAR_SCHEDULE_UPDATED", {"patient_id": patient_id, "tasks_created": len(created_tasks)})

    return {
        "status": "success",
        "message": f"Generated {len(created_tasks)} medication administration task(s).",
        "tasks_created": len(created_tasks)
    }


@router.post("/tasks/{task_id}/administer", response_model=MARTaskResponse)
def administer_medication(task_id: str, req: MARAdministerRequest, db: Session = Depends(get_db)):
    """Records the successful administration of a medication dose by a nurse."""
    task = db.query(MARTask).filter(MARTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"MAR Task '{task_id}' not found.")

    now_iso = datetime.now().isoformat()
    task.status = "Administered"
    task.administered_time = now_iso
    task.administered_by = req.administered_by or "Ward Nurse, RN"
    if req.notes:
        task.notes = f"{task.notes} | Admin notes: {req.notes}".strip(" |")

    # Patient timeline event
    db.add(TimelineEvent(
        patient_id=task.patient_id,
        timestamp=now_iso,
        event_type="Medication",
        title=f"Dose Administered: {task.medication_name}",
        description=f"{task.medication_name} {task.dosage} administered via {task.route} by {task.administered_by}.",
        actor=task.administered_by
    ))

    # SHA-256 Audit trail
    log_audit_event(
        db,
        actor=task.administered_by,
        action="MAR_DOSE_ADMINISTERED",
        record_id=task.id,
        details={
            "patient_id": task.patient_id,
            "medication": task.medication_name,
            "dosage": task.dosage,
            "scheduled_time": task.scheduled_time,
            "administered_time": now_iso
        }
    )
    db.commit()
    db.refresh(task)

    manager.broadcast_sync("MAR_TASK_ADMINISTERED", {
        "task_id": task.id,
        "patient_id": task.patient_id,
        "medication": task.medication_name,
        "administered_by": task.administered_by
    })

    return task


@router.post("/tasks/{task_id}/hold", response_model=MARTaskResponse)
def hold_medication(task_id: str, req: MARHoldRequest, db: Session = Depends(get_db)):
    """Documents holding, omitting, or delaying a medication dose with required clinical rationale."""
    task = db.query(MARTask).filter(MARTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"MAR Task '{task_id}' not found.")

    if not req.reason.strip():
        raise HTTPException(status_code=400, detail="Mandatory clinical rationale required when holding a medication dose.")

    now_iso = datetime.now().isoformat()
    task.status = req.action  # "Held", "Delayed", or "Omitted"
    task.hold_reason = req.reason
    task.administered_by = req.nurse_name

    db.add(TimelineEvent(
        patient_id=task.patient_id,
        timestamp=now_iso,
        event_type="Medication",
        title=f"Medication {req.action}: {task.medication_name}",
        description=f"Dose of {task.medication_name} was {req.action.lower()} by {req.nurse_name}. Rationale: {req.reason}",
        actor=req.nurse_name
    ))

    log_audit_event(
        db,
        actor=req.nurse_name,
        action=f"MAR_DOSE_{req.action.upper()}",
        record_id=task.id,
        details={"patient_id": task.patient_id, "medication": task.medication_name, "reason": req.reason}
    )
    db.commit()
    db.refresh(task)

    manager.broadcast_sync("MAR_TASK_HELD", {
        "task_id": task.id,
        "patient_id": task.patient_id,
        "status": task.status,
        "reason": req.reason
    })

    return task
