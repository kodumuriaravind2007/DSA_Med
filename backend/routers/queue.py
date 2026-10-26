"""
Live Patient Queue & Min-Heap Flow Engine.

Features:
- Live Min-Heap queue of waiting patients
- Next patient selection with transparent justification
- Extract-min to start treatment
- Tree and Array heap inspection for Live Patient Flow
- Dynamic waiting time estimation per queued patient
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..database import get_db
from ..models import Patient, Doctor, TimelineEvent, AuditLog
from ..dsa.min_heap import PriorityMinHeap, PatientQueueNode
from ..dsa.waiting_time_estimator import WaitingTimeEstimator
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH

router = APIRouter(prefix="/api/queue", tags=["Patient Flow & Queue"])


def build_live_heap(db: Session) -> PriorityMinHeap:
    """Builds and populates a PriorityMinHeap from all currently waiting patients in DB."""
    waiting_patients = db.query(Patient).filter(Patient.status == "Waiting").all()
    heap = PriorityMinHeap()
    nodes = [
        PatientQueueNode(
            patient_id=p.patient_id,
            patient_name=p.full_name,
            priority=p.priority,
            arrival_time=p.arrival_time,
            reported_concern=p.reported_concern,
            department=p.department,
            status=p.status,
            assigned_doctor_id=p.assigned_doctor_id,
        )
        for p in waiting_patients
    ]
    heap.rebuild_from_list(nodes)
    return heap


@router.get("")
@router.get("/")
def get_live_queue(db: Session = Depends(get_db)):
    """Returns the ordered waiting queue, next patient, and heap structures."""
    heap = build_live_heap(db)
    ordered_nodes = heap.get_ordered_queue()

    # Active doctors for wait time estimation
    active_doctors = db.query(Doctor).filter(Doctor.duty_status == "On Duty", Doctor.is_available == True).count()
    active_doctors = max(1, active_doctors)

    # Annotate waiting time
    annotated_queue = []
    for idx, node in enumerate(ordered_nodes):
        node_dict = node.to_dict()
        patients_ahead = [n.to_dict() for n in ordered_nodes[:idx]]
        wait_info = WaitingTimeEstimator.calculate_estimated_wait(
            node.priority,
            patients_ahead,
            active_doctors
        )
        node_dict["queue_position"] = idx + 1
        node_dict["estimated_wait_minutes"] = wait_info["estimated_wait_minutes"]
        # Human readable arrival
        dt = datetime.fromtimestamp(node.arrival_time)
        node_dict["formatted_arrival"] = dt.strftime("%I:%M %p")
        # Minutes elapsed since arrival
        elapsed_mins = int((datetime.utcnow().timestamp() - node.arrival_time) / 60)
        node_dict["waiting_duration_mins"] = max(0, elapsed_mins)
        annotated_queue.append(node_dict)

    # Next patient explanation
    next_node = heap.peek()
    next_patient_summary = None
    if next_node:
        prio_label = {1: "Critical (Priority 1)", 2: "Urgent (Priority 2)", 3: "Normal (Priority 3)"}[next_node.priority]
        dt = datetime.fromtimestamp(next_node.arrival_time).strftime("%I:%M %p")
        explanation = (
            f"Patient {next_node.patient_id} ({next_node.patient_name}) is at root of Min-Heap. "
            f"Categorized as {prio_label} with arrival at {dt}. "
            f"Under priority queue invariants, Priority 1 cases preempt Priority 2/3 cases; "
            f"equal priority ties are broken by earliest arrival (FIFO)."
        )
        next_patient_summary = {
            "node": next_node.to_dict(),
            "explanation": explanation,
            "priority_label": prio_label,
            "formatted_arrival": dt,
        }

    return {
        "total_waiting": len(ordered_nodes),
        "queue": annotated_queue,
        "next_patient": next_patient_summary,
        "heap_tree": heap.to_tree_json(),
        "heap_array": heap.to_array_representation(),
    }


@router.post("/call-next")
def call_next_patient(actor: str = "Triage Clinician", db: Session = Depends(get_db)):
    """
    Pulls the next patient from the Min-Heap and transitions their status to 'In Treatment'.
    """
    heap = build_live_heap(db)
    next_node, trace = heap.extract_min()

    if not next_node:
        raise HTTPException(status_code=400, detail="Queue is currently empty. No waiting patients.")

    patient = db.query(Patient).filter(Patient.patient_id == next_node.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found in database.")

    old_status = patient.status
    patient.status = "In Treatment"
    patient.updated_at = datetime.utcnow().isoformat()

    timeline = TimelineEvent(
        patient_id=patient.patient_id,
        timestamp=datetime.utcnow().isoformat(),
        event_type="Triage Call",
        title="Called for Treatment",
        description=f"Extracted from Min-Heap (Priority {patient.priority}). Status updated to 'In Treatment'.",
        actor=actor
    )
    db.add(timeline)

    # Audit
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    ts = datetime.utcnow().isoformat()
    act = "START_TREATMENT"
    det = f"Called patient {patient.patient_id} ({patient.full_name}) for treatment from queue root."
    curr_h = compute_audit_hash(prev_h, ts, actor, act, patient.patient_id, det)

    audit = AuditLog(
        timestamp=ts,
        actor=actor,
        action=act,
        record_id=patient.patient_id,
        details=det,
        prev_hash=prev_h,
        current_hash=curr_h,
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "called_patient": patient.patient_id,
        "patient_name": patient.full_name,
        "priority": patient.priority,
        "heap_extract_trace": trace,
    }
