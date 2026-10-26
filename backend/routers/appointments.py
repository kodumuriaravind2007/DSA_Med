"""
Appointments and Check-In Router for MedTree X.
Manages patient appointment scheduling, check-in workflow, and dynamic triage queue entry.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from ..database import get_db
from ..models import Appointment, Patient, Doctor, TimelineEvent
from ..schemas import AppointmentCreate, AppointmentResponse
from .patients import log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def generate_next_appointment_id(db: Session) -> str:
    """Generates sequential ID: APT-501, APT-502..."""
    apts = db.query(Appointment.id).all()
    max_num = 500
    for (a_id,) in apts:
        if a_id and a_id.startswith("APT-"):
            try:
                num = int(a_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"APT-{max_num + 1}"


@router.get("", response_model=List[AppointmentResponse])
@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists appointments with optional filters for patient, doctor, or status."""
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    return query.order_by(Appointment.scheduled_time.asc()).all()


@router.post("", response_model=AppointmentResponse)
@router.post("/", response_model=AppointmentResponse)
def create_appointment(req: AppointmentCreate, db: Session = Depends(get_db)):
    """Creates a new appointment for a patient."""
    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{req.patient_id}' not found.")

    doctor = db.query(Doctor).filter(Doctor.doctor_id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail=f"Doctor '{req.doctor_id}' not found.")

    apt_id = generate_next_appointment_id(db)
    now_iso = datetime.now().isoformat()

    appointment = Appointment(
        id=apt_id,
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        department=req.department,
        scheduled_time=req.scheduled_time,
        reason=req.reason or "",
        status="Scheduled",
        created_at=now_iso,
    )
    db.add(appointment)

    # Timeline event
    db.add(TimelineEvent(
        patient_id=req.patient_id,
        timestamp=now_iso,
        event_type="Appointment",
        title="Consultation Scheduled",
        description=f"Appointment scheduled with Dr. {doctor.name} ({req.department}) at {req.scheduled_time}.",
        actor="System Scheduling"
    ))

    log_audit_event(
        db,
        actor="Scheduling Staff",
        action="CREATE_APPOINTMENT",
        record_id=apt_id,
        details={"patient_id": req.patient_id, "doctor_id": req.doctor_id, "scheduled_time": req.scheduled_time}
    )
    db.commit()
    db.refresh(appointment)

    manager.broadcast_sync("APPOINTMENT_CREATED", {"appointment_id": apt_id, "patient_id": req.patient_id})
    return appointment


@router.post("/{appointment_id}/check-in")
def check_in_appointment(appointment_id: str, actor: str = "Reception Desk", db: Session = Depends(get_db)):
    """
    Checks in a patient for an appointment:
    - Changes appointment status to 'Checked In'
    - Updates patient status to 'Waiting' and resets arrival timestamp to now
    - Triggers Min-Heap priority queue inclusion
    - Logs audit event and fires WebSocket broadcast
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if appointment.status == "Checked In":
        return {"status": "already_checked_in", "message": "Patient is already checked in."}

    appointment.status = "Checked In"
    patient = db.query(Patient).filter(Patient.patient_id == appointment.patient_id).first()
    if patient:
        now_ts = datetime.now().timestamp()
        now_iso = datetime.now().isoformat()
        patient.status = "Waiting"
        patient.arrival_time = now_ts
        patient.updated_at = now_iso
        if not patient.assigned_doctor_id:
            patient.assigned_doctor_id = appointment.doctor_id

        db.add(TimelineEvent(
            patient_id=patient.patient_id,
            timestamp=now_iso,
            event_type="Check-In",
            title="Appointment Check-In Complete",
            description=f"Patient checked in for appointment {appointment_id}. Placed into department triage queue.",
            actor=actor
        ))

    log_audit_event(
        db,
        actor=actor,
        action="APPOINTMENT_CHECK_IN",
        record_id=appointment_id,
        details={"patient_id": appointment.patient_id, "doctor_id": appointment.doctor_id}
    )
    db.commit()

    manager.broadcast_sync("APPOINTMENT_CHECKED_IN", {"appointment_id": appointment_id, "patient_id": appointment.patient_id})
    manager.broadcast_sync("QUEUE_UPDATED", {"patient_id": appointment.patient_id, "action": "CHECK_IN"})

    return {
        "status": "success",
        "message": f"Patient {appointment.patient_id} successfully checked in and enqueued for consultation.",
        "appointment_id": appointment_id,
        "patient_status": "Waiting"
    }
