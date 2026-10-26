"""
Inpatient Care & Post-Operative Management Router for MedTree X.
Implements:
- Post-operative care plans & observation checklists
- Inpatient vital sign monitoring with pain score (0-10) tracking
- Vital trend telemetry history for Recharts
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models import PostOpCarePlan, PostOpTask, Patient, VitalSign, TimelineEvent
from ..schemas import (
    PostOpCarePlanResponse, PostOpCarePlanCreate,
    PostOpTaskCompleteRequest, PostOpTaskResponse,
    VitalSignCreate, VitalSignResponse
)
from .patients import log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/inpatient", tags=["Inpatient & Post-Op Care"])


def generate_next_plan_id(db: Session) -> str:
    plans = db.query(PostOpCarePlan.id).all()
    max_num = 600
    for (p_id,) in plans:
        if p_id and p_id.startswith("POP-"):
            try:
                num = int(p_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"POP-{max_num + 1}"


def generate_next_task_id(db: Session) -> str:
    tasks = db.query(PostOpTask.id).all()
    max_num = 900
    for (t_id,) in tasks:
        if t_id and t_id.startswith("PTK-"):
            try:
                num = int(t_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"PTK-{max_num + 1}"


@router.get("/post-op/{patient_id}", response_model=List[PostOpCarePlanResponse])
def get_patient_post_op_plans(patient_id: str, db: Session = Depends(get_db)):
    """Retrieves all post-op care plans and associated tasks for a patient."""
    plans = db.query(PostOpCarePlan).filter(PostOpCarePlan.patient_id == patient_id).all()
    return plans


@router.post("/post-op", response_model=PostOpCarePlanResponse)
def create_post_op_care_plan(req: PostOpCarePlanCreate, db: Session = Depends(get_db)):
    """Creates a post-op recovery care plan with pre-populated clinical protocol tasks."""
    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    plan_id = generate_next_plan_id(db)
    now_iso = datetime.now().isoformat()

    plan = PostOpCarePlan(
        id=plan_id,
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        procedure_name=req.procedure_name,
        surgery_date=req.surgery_date,
        target_discharge_date=req.target_discharge_date or "",
        status="Active",
        wound_care_instructions=req.wound_care_instructions or "Maintain sterile dressing dry & intact. Inspect for erythema or discharge.",
        mobility_goal=req.mobility_goal or "Bedside sitting at Day 1, Assisted ambulation Day 2.",
        created_at=now_iso
    )
    db.add(plan)
    db.flush()

    # Pre-populate protocol tasks
    standard_tasks = [
        ("Observation", "Vitals & SpO2 Post-Op Telemetry (Q2H)", 2),
        ("Wound Care", "Incision Site & Surgical Dressing Inspection", 4),
        ("Pain Review", "Visual Analog Pain Scale & Analgesic Efficacy Check", 6),
        ("Observation", "Incentive Spirometry & Lung Auscultation", 8),
        ("Mobility Assessment", "Assisted Bedside Sitting & DVT Prophylaxis Check", 12),
        ("Wound Care", "Drain Output Measurement & Fluid Appearance Check", 16)
    ]

    now_dt = datetime.now()
    for task_type, title, offset_hrs in standard_tasks:
        task_id = generate_next_task_id(db)
        due_dt = now_dt + timedelta(hours=offset_hrs)
        t = PostOpTask(
            id=task_id,
            plan_id=plan_id,
            patient_id=req.patient_id,
            task_type=task_type,
            title=title,
            due_time=due_dt.isoformat(),
            status="Pending",
            notes="Post-operative clinical protocol task.",
            nurse_name=""
        )
        db.add(t)

    db.add(TimelineEvent(
        patient_id=req.patient_id,
        timestamp=now_iso,
        event_type="Post-Op Care",
        title=f"Post-Op Recovery Plan Initiated: {req.procedure_name}",
        description=f"Plan {plan_id} initialized following {req.procedure_name}. 6 recovery observation tasks generated.",
        actor=f"Dr. {req.doctor_id}"
    ))

    log_audit_event(
        db,
        actor=req.doctor_id,
        action="CREATE_POST_OP_PLAN",
        record_id=plan_id,
        details={"patient_id": req.patient_id, "procedure": req.procedure_name}
    )
    db.commit()
    db.refresh(plan)

    manager.broadcast_sync("POST_OP_PLAN_CREATED", {"plan_id": plan_id, "patient_id": req.patient_id})
    return plan


@router.post("/post-op/tasks/{task_id}/complete", response_model=PostOpTaskResponse)
def complete_post_op_task(task_id: str, req: PostOpTaskCompleteRequest, db: Session = Depends(get_db)):
    """Documents the completion of a post-operative nursing task."""
    task = db.query(PostOpTask).filter(PostOpTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    now_iso = datetime.now().isoformat()
    task.status = "Completed"
    task.completed_time = now_iso
    task.nurse_name = req.nurse_name
    if req.notes:
        task.notes = f"{task.notes} | Completion note: {req.notes}".strip(" |")

    db.add(TimelineEvent(
        patient_id=task.patient_id,
        timestamp=now_iso,
        event_type="Post-Op Care",
        title=f"Task Completed: {task.title}",
        description=f"Nurse {req.nurse_name} completed task '{task.title}'. Notes: {req.notes or 'Routine check'}",
        actor=req.nurse_name
    ))

    log_audit_event(
        db,
        actor=req.nurse_name,
        action="COMPLETE_POST_OP_TASK",
        record_id=task.id,
        details={"patient_id": task.patient_id, "task": task.title, "notes": req.notes}
    )
    db.commit()
    db.refresh(task)

    manager.broadcast_sync("POST_OP_TASK_COMPLETED", {"task_id": task.id, "patient_id": task.patient_id})
    return task


@router.post("/vitals", response_model=VitalSignResponse)
def record_inpatient_vitals(patient_id: str, vitals_in: VitalSignCreate, actor: str = "Ward Nurse", db: Session = Depends(get_db)):
    """Records vital signs including pain score, and detects inpatient clinical red flags."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    now_iso = datetime.now().isoformat()
    v = VitalSign(
        patient_id=patient_id,
        blood_pressure_systolic=vitals_in.blood_pressure_systolic,
        blood_pressure_diastolic=vitals_in.blood_pressure_diastolic,
        heart_rate=vitals_in.heart_rate,
        temperature_f=vitals_in.temperature_f,
        respiratory_rate=vitals_in.respiratory_rate,
        oxygen_saturation_spo2=vitals_in.oxygen_saturation_spo2,
        pain_score=vitals_in.pain_score or 0,
        recorded_at=now_iso
    )
    db.add(v)

    # Check for critical thresholds
    alerts = []
    if vitals_in.oxygen_saturation_spo2 and vitals_in.oxygen_saturation_spo2 < 90:
        alerts.append(f"CRITICAL HYPOXIA: SpO2 {vitals_in.oxygen_saturation_spo2}%")
    if vitals_in.blood_pressure_systolic and vitals_in.blood_pressure_systolic >= 180:
        alerts.append(f"HYPERTENSIVE CRISIS: Systolic BP {vitals_in.blood_pressure_systolic} mmHg")
    if vitals_in.pain_score and vitals_in.pain_score >= 8:
        alerts.append(f"SEVERE PAIN REPORTED: Score {vitals_in.pain_score}/10")

    alert_desc = f" ({'; '.join(alerts)})" if alerts else ""
    db.add(TimelineEvent(
        patient_id=patient_id,
        timestamp=now_iso,
        event_type="Vitals",
        title=f"Inpatient Vitals Recorded{alert_desc}",
        description=f"BP {vitals_in.blood_pressure_systolic}/{vitals_in.blood_pressure_diastolic}, HR {vitals_in.heart_rate} bpm, SpO2 {vitals_in.oxygen_saturation_spo2}%, Temp {vitals_in.temperature_f}°F, Pain {vitals_in.pain_score}/10.",
        actor=actor
    ))

    log_audit_event(
        db,
        actor=actor,
        action="RECORD_INPATIENT_VITALS",
        record_id=patient_id,
        details={
            "bp": f"{vitals_in.blood_pressure_systolic}/{vitals_in.blood_pressure_diastolic}",
            "hr": vitals_in.heart_rate,
            "spo2": vitals_in.oxygen_saturation_spo2,
            "pain_score": vitals_in.pain_score,
            "alerts": alerts
        }
    )
    db.commit()
    db.refresh(v)

    if alerts:
        manager.broadcast_sync("CRITICAL_VITAL_ALERT", {
            "patient_id": patient_id,
            "alerts": alerts,
            "recorded_by": actor
        })

    return v


@router.get("/vitals/trends/{patient_id}")
def get_vitals_trends(patient_id: str, db: Session = Depends(get_db)):
    """Returns chronologically ordered vital sign measurements for charting."""
    vitals = db.query(VitalSign).filter(
        VitalSign.patient_id == patient_id
    ).order_by(VitalSign.recorded_at.asc()).all()

    points = []
    for idx, v in enumerate(vitals):
        points.append({
            "index": idx + 1,
            "time": v.recorded_at[11:16] if v.recorded_at and len(v.recorded_at) >= 16 else f"Reading {idx+1}",
            "full_time": v.recorded_at,
            "systolic": v.blood_pressure_systolic,
            "diastolic": v.blood_pressure_diastolic,
            "heart_rate": v.heart_rate,
            "spo2": v.oxygen_saturation_spo2,
            "temperature": v.temperature_f,
            "respiratory_rate": v.respiratory_rate,
            "pain_score": v.pain_score or 0
        })

    return {
        "patient_id": patient_id,
        "readings_count": len(points),
        "trends": points
    }
