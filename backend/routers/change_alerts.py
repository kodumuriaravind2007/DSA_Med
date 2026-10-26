"""
Feature B: Patient History Change Alerts Router.
Tracks clinically significant modifications to patient history, allergies, vitals,
laboratory results, medications, and diagnoses, alerting clinicians until reviewed.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from ..database import get_db
from ..models import PatientHistoryChangeAlert, Patient, AuditLog
from ..schemas import PatientHistoryChangeAlertCreate, PatientHistoryChangeAlertResponse
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .websocket import manager

router = APIRouter(prefix="/api/change-alerts", tags=["Patient History Change Alerts"])


def emit_patient_change_alert(
    db: Session,
    patient_id: str,
    record_type: str,
    field_name: str,
    new_value: str,
    old_value: str = "",
    author_name: str = "System",
    author_role: str = "doctor",
    reason: str = "",
    record_id: str = ""
) -> PatientHistoryChangeAlert:
    """
    Programmatic helper to record a clinically significant alteration to patient history.
    Can be invoked from other routers (e.g., patient update, labs, vitals, corrections).
    """
    alert_id = f"PCA-{uuid.uuid4().hex[:6].upper()}"
    alert = PatientHistoryChangeAlert(
        id=alert_id,
        patient_id=patient_id,
        record_type=record_type,
        record_id=record_id or alert_id,
        field_name=field_name,
        old_value=str(old_value or ""),
        new_value=str(new_value or ""),
        author_name=author_name,
        author_role=author_role,
        reason=reason or f"Clinically significant update to {field_name}",
        is_reviewed=False,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/unreviewed", response_model=List[PatientHistoryChangeAlertResponse])
def get_all_unreviewed_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve all pending unreviewed change alerts across the hospital."""
    alerts = (
        db.query(PatientHistoryChangeAlert)
        .filter(PatientHistoryChangeAlert.is_reviewed == False)
        .order_by(PatientHistoryChangeAlert.created_at.desc())
        .limit(limit)
        .all()
    )
    return alerts


@router.get("/{patient_id}", response_model=List[PatientHistoryChangeAlertResponse])
def get_patient_change_alerts(
    patient_id: str,
    unreviewed_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Retrieve clinical history change alerts for a specific patient."""
    query = db.query(PatientHistoryChangeAlert).filter(
        PatientHistoryChangeAlert.patient_id == patient_id
    )
    if unreviewed_only:
        query = query.filter(PatientHistoryChangeAlert.is_reviewed == False)
    return query.order_by(PatientHistoryChangeAlert.created_at.desc()).all()


@router.post("", response_model=PatientHistoryChangeAlertResponse)
def create_change_alert(
    payload: PatientHistoryChangeAlertCreate,
    db: Session = Depends(get_db)
):
    """Explicitly create a patient history change alert."""
    patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {payload.patient_id} not found")

    alert = emit_patient_change_alert(
        db=db,
        patient_id=payload.patient_id,
        record_type=payload.record_type,
        field_name=payload.field_name,
        new_value=payload.new_value,
        old_value=payload.old_value or "",
        author_name=payload.author_name,
        author_role=payload.author_role,
        reason=payload.reason or "",
        record_id=payload.record_id or ""
    )
    return alert


@router.post("/{alert_id}/review", response_model=PatientHistoryChangeAlertResponse)
async def review_change_alert(
    alert_id: str,
    reviewed_by: str = Query("Dr. Attending Physician"),
    db: Session = Depends(get_db)
):
    """
    Mark a change alert as formally reviewed by a clinician.
    Generates a cryptographically chained audit log entry.
    """
    alert = db.query(PatientHistoryChangeAlert).filter(
        PatientHistoryChangeAlert.id == alert_id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert.is_reviewed = True
    alert.reviewed_by = reviewed_by
    alert.reviewed_at = datetime.utcnow().isoformat()

    # Cryptographic Audit Log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Clinician {reviewed_by} reviewed change alert on {alert.record_type} ({alert.field_name})"
    timestamp = datetime.utcnow().isoformat()
    curr_h = compute_audit_hash(
        prev_h, timestamp, reviewed_by, "CHANGE_ALERT_REVIEW", alert.id, details
    )

    audit_entry = AuditLog(
        timestamp=timestamp,
        actor=reviewed_by,
        action="CHANGE_ALERT_REVIEW",
        record_id=alert.id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(alert)

    # Real-time WebSocket broadcast
    try:
        await manager.broadcast({
            "type": "CHANGE_ALERT_REVIEWED",
            "alert_id": alert.id,
            "patient_id": alert.patient_id,
            "reviewed_by": reviewed_by,
            "timestamp": timestamp
        })
    except Exception:
        pass

    return alert


@router.post("/review-all/{patient_id}")
async def review_all_patient_alerts(
    patient_id: str,
    reviewed_by: str = Query("Dr. Attending Physician"),
    db: Session = Depends(get_db)
):
    """Acknowledge/review all pending history alerts for a patient at once."""
    unreviewed = db.query(PatientHistoryChangeAlert).filter(
        PatientHistoryChangeAlert.patient_id == patient_id,
        PatientHistoryChangeAlert.is_reviewed == False
    ).all()

    now_iso = datetime.utcnow().isoformat()
    for alert in unreviewed:
        alert.is_reviewed = True
        alert.reviewed_by = reviewed_by
        alert.reviewed_at = now_iso

    # Audit log entry for batch review
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Clinician {reviewed_by} reviewed all ({len(unreviewed)}) pending change alerts for patient {patient_id}"
    curr_h = compute_audit_hash(
        prev_h, now_iso, reviewed_by, "BATCH_CHANGE_ALERT_REVIEW", patient_id, details
    )

    audit_entry = AuditLog(
        timestamp=now_iso,
        actor=reviewed_by,
        action="BATCH_CHANGE_ALERT_REVIEW",
        record_id=patient_id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h
    )
    db.add(audit_entry)
    db.commit()

    return {"reviewed_count": len(unreviewed), "patient_id": patient_id, "reviewed_by": reviewed_by}
