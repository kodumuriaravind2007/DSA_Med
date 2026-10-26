"""
Resource Management Router: Beds, Doctors, and Hospital Resource Graph.

Features:
- Bed management (Available, Occupied, Cleaning, Reserved) across hospital wards
- Doctor directory with on-duty controls and patient assignments
- Strict conflict prevention: Cannot assign unavailable beds or off-duty physicians
- Live Hospital Resource Graph with BFS, DFS, and path matching
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..database import get_db
from ..models import Bed, Doctor, Patient, TimelineEvent, AuditLog
from ..schemas import (
    BedAllocateRequest, BedStatusUpdateRequest,
    DoctorAssignRequest, DoctorDutyUpdateRequest
)
from ..dsa.graph import HospitalResourceGraph
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .websocket import manager

router = APIRouter(prefix="/api/resources", tags=["Resource Management"])


def log_resource_audit(db: Session, actor: str, action: str, record_id: str, details: str):
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    ts = datetime.utcnow().isoformat()
    curr_h = compute_audit_hash(prev_h, ts, actor, action, record_id, details)
    entry = AuditLog(
        timestamp=ts,
        actor=actor,
        action=action,
        record_id=record_id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h,
    )
    db.add(entry)
    db.flush()


# --- BEDS ---

@router.get("/beds")
def list_beds(department: Optional[str] = None, ward: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists all hospital beds with current occupants."""
    query = db.query(Bed)
    if department and department != "All":
        query = query.filter(Bed.department == department)
    if ward and ward != "All":
        query = query.filter(Bed.ward == ward)
    if status and status != "All":
        query = query.filter(Bed.status == status)

    beds = query.all()
    results = []
    for b in beds:
        patient_name = None
        if b.current_patient_id:
            p = db.query(Patient).filter(Patient.patient_id == b.current_patient_id).first()
            if p:
                patient_name = p.full_name
        results.append({
            "bed_id": b.bed_id,
            "ward": b.ward,
            "department": b.department,
            "status": b.status,
            "current_patient_id": b.current_patient_id,
            "current_patient_name": patient_name,
            "last_cleaned_at": b.last_cleaned_at,
        })
    return results


@router.post("/beds/{bed_id}/allocate")
def allocate_bed(bed_id: str, req: BedAllocateRequest, db: Session = Depends(get_db)):
    """Allocates an available bed to a patient with strict conflict prevention."""
    bed = db.query(Bed).filter(Bed.bed_id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found.")

    if bed.status != "Available":
        raise HTTPException(
            status_code=400,
            detail=f"Bed Conflict: Bed {bed_id} is currently '{bed.status}'. Only 'Available' beds can be assigned."
        )

    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # If patient was in another bed, release it
    if patient.assigned_bed_id and patient.assigned_bed_id != bed_id:
        old_bed = db.query(Bed).filter(Bed.bed_id == patient.assigned_bed_id).first()
        if old_bed:
            old_bed.status = "Cleaning"
            old_bed.current_patient_id = None

    bed.status = "Occupied"
    bed.current_patient_id = patient.patient_id
    patient.assigned_bed_id = bed_id
    patient.updated_at = datetime.utcnow().isoformat()

    # Timeline
    timeline = TimelineEvent(
        patient_id=patient.patient_id,
        timestamp=datetime.utcnow().isoformat(),
        event_type="Bed Allocation",
        title=f"Admitted to {bed.ward} ({bed_id})",
        description=f"Bed assigned by {req.actor}.",
        actor=req.actor
    )
    db.add(timeline)

    log_resource_audit(
        db,
        actor=req.actor,
        action="ALLOCATE_BED",
        record_id=bed_id,
        details=f"Assigned Bed {bed_id} in {bed.ward} to patient {patient.patient_id} ({patient.full_name})"
    )

    db.commit()
    manager.broadcast_sync("BED_ALLOCATED", {"bed_id": bed_id, "patient_id": patient.patient_id, "ward": bed.ward})
    return {"status": "success", "bed_id": bed_id, "patient_id": patient.patient_id}


@router.post("/beds/{bed_id}/release")
def release_bed(bed_id: str, actor: str = "Ward Staff", mark_as: str = "Cleaning", db: Session = Depends(get_db)):
    """Releases an occupied bed and triggers cleaning cycle."""
    bed = db.query(Bed).filter(Bed.bed_id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found.")

    prev_patient_id = bed.current_patient_id
    bed.status = mark_as
    bed.current_patient_id = None
    bed.last_cleaned_at = datetime.utcnow().isoformat()

    if prev_patient_id:
        patient = db.query(Patient).filter(Patient.patient_id == prev_patient_id).first()
        if patient and patient.assigned_bed_id == bed_id:
            patient.assigned_bed_id = None
            timeline = TimelineEvent(
                patient_id=prev_patient_id,
                timestamp=datetime.utcnow().isoformat(),
                event_type="Bed Release",
                title=f"Released from Bed {bed_id}",
                description=f"Released by {actor}.",
                actor=actor
            )
            db.add(timeline)

    log_resource_audit(
        db,
        actor=actor,
        action="RELEASE_BED",
        record_id=bed_id,
        details=f"Bed {bed_id} released from patient {prev_patient_id or 'none'}, status marked as {mark_as}."
    )

    db.commit()
    manager.broadcast_sync("BED_RELEASED", {"bed_id": bed_id, "new_status": bed.status})
    return {"status": "success", "bed_id": bed_id, "new_status": bed.status}


@router.patch("/beds/{bed_id}/status")
def update_bed_status(bed_id: str, req: BedStatusUpdateRequest, db: Session = Depends(get_db)):
    """Updates bed status (e.g., from Cleaning to Available)."""
    bed = db.query(Bed).filter(Bed.bed_id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found.")

    old = bed.status
    bed.status = req.status
    if req.status == "Available":
        bed.current_patient_id = None
        bed.last_cleaned_at = datetime.utcnow().isoformat()

    log_resource_audit(
        db,
        actor=req.actor,
        action="UPDATE_BED_STATUS",
        record_id=bed_id,
        details=f"Bed {bed_id} state changed from {old} to {req.status}."
    )

    db.commit()
    return {"status": "success", "bed_id": bed_id, "status": bed.status}


# --- DOCTORS ---

@router.get("/doctors")
def list_doctors(department: Optional[str] = None, duty_status: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists doctors with specialty, duty status, and assigned patient load."""
    query = db.query(Doctor)
    if department and department != "All":
        query = query.filter(Doctor.department == department)
    if duty_status and duty_status != "All":
        query = query.filter(Doctor.duty_status == duty_status)

    doctors = query.all()
    results = []
    for doc in doctors:
        patient_count = db.query(Patient).filter(
            Patient.assigned_doctor_id == doc.doctor_id,
            Patient.status.in_(["Waiting", "In Treatment", "Lab Requested", "Observation"])
        ).count()
        results.append({
            "doctor_id": doc.doctor_id,
            "name": doc.name,
            "specialty": doc.specialty,
            "department": doc.department,
            "duty_status": doc.duty_status,
            "is_available": doc.is_available and (patient_count < doc.max_active_patients),
            "current_patient_count": patient_count,
            "max_active_patients": doc.max_active_patients,
            "phone": doc.phone,
            "email": doc.email,
        })
    return results


@router.post("/doctors/{doctor_id}/assign")
def assign_doctor(doctor_id: str, req: DoctorAssignRequest, db: Session = Depends(get_db)):
    """Assigns an on-duty doctor to a patient with conflict prevention."""
    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if doctor.duty_status != "On Duty":
        raise HTTPException(
            status_code=400,
            detail=f"Doctor Conflict: {doctor.name} is currently '{doctor.duty_status}'. Cannot assign off-duty physician."
        )

    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    patient.assigned_doctor_id = doctor_id
    patient.updated_at = datetime.utcnow().isoformat()

    # Timeline event
    timeline = TimelineEvent(
        patient_id=patient.patient_id,
        timestamp=datetime.utcnow().isoformat(),
        event_type="Doctor Assignment",
        title=f"Assigned to {doctor.name} ({doctor.specialty})",
        description=f"Assigned in {doctor.department} by {req.actor}.",
        actor=req.actor
    )
    db.add(timeline)

    log_resource_audit(
        db,
        actor=req.actor,
        action="ASSIGN_DOCTOR",
        record_id=doctor_id,
        details=f"Assigned doctor {doctor.name} ({doctor_id}) to patient {patient.patient_id} ({patient.full_name})."
    )

    db.commit()
    return {"status": "success", "doctor_id": doctor_id, "patient_id": patient.patient_id}


@router.patch("/doctors/{doctor_id}/duty")
def update_doctor_duty(doctor_id: str, req: DoctorDutyUpdateRequest, db: Session = Depends(get_db)):
    """Updates doctor duty status (On Duty, Off Duty, On Call, In Consultation)."""
    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    old = doctor.duty_status
    doctor.duty_status = req.duty_status
    doctor.is_available = req.is_available

    log_resource_audit(
        db,
        actor=req.actor,
        action="UPDATE_DOCTOR_DUTY",
        record_id=doctor_id,
        details=f"Doctor {doctor.name} duty status updated from {old} to {req.duty_status} (Available={req.is_available})."
    )

    db.commit()
    return {"status": "success", "doctor_id": doctor_id, "duty_status": doctor.duty_status}


# --- HOSPITAL RESOURCE GRAPH ---

def build_live_resource_graph(db: Session) -> HospitalResourceGraph:
    """Constructs real graph of live database entities and relations."""
    g = HospitalResourceGraph()

    # 1. Departments
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "General Medicine", "ICU"]
    for dept in departments:
        g.add_node(f"DEPT-{dept.upper()[:3]}", dept, "department", {"name": dept})

    # 2. Diagnostic services
    diag_services = [
        ("DIAG-PATH", "Central Pathology Lab", "service"),
        ("DIAG-RAD", "Radiology & Imaging Unit", "service"),
        ("DIAG-ECG", "Cardiovascular ECG Unit", "service"),
    ]
    for s_id, s_name, s_type in diag_services:
        g.add_node(s_id, s_name, s_type)

    # 3. Doctors
    doctors = db.query(Doctor).all()
    for d in doctors:
        d_node_id = f"DOC-{d.doctor_id}"
        g.add_node(d_node_id, d.name, "doctor", {
            "specialty": d.specialty,
            "department": d.department,
            "duty_status": d.duty_status,
            "is_available": d.is_available,
        })
        # Doctor -> Department
        dept_code = f"DEPT-{d.department.upper()[:3]}"
        g.add_edge(d_node_id, dept_code, "belongs_to")

    # 4. Beds
    beds = db.query(Bed).all()
    for b in beds:
        b_node_id = f"BED-{b.bed_id}"
        g.add_node(b_node_id, f"{b.ward} ({b.bed_id})", "bed", {
            "status": b.status,
            "ward": b.ward,
            "department": b.department,
        })
        dept_code = f"DEPT-{b.department.upper()[:3]}"
        g.add_edge(b_node_id, dept_code, "located_in")

    # 5. Active Patients
    active_patients = db.query(Patient).filter(Patient.status.in_(["Waiting", "In Treatment", "Lab Requested", "Observation"])).all()
    for p in active_patients:
        p_node_id = f"PT-{p.patient_id}"
        g.add_node(p_node_id, p.full_name, "patient", {
            "priority": p.priority,
            "status": p.status,
            "concern": p.reported_concern,
        })
        # Patient -> Department
        dept_code = f"DEPT-{p.department.upper()[:3]}"
        g.add_edge(p_node_id, dept_code, "registered_in")

        # Patient -> Doctor
        if p.assigned_doctor_id:
            g.add_edge(p_node_id, f"DOC-{p.assigned_doctor_id}", "assigned_to")

        # Patient -> Bed
        if p.assigned_bed_id:
            g.add_edge(p_node_id, f"BED-{p.assigned_bed_id}", "admitted_to")

        # Patient -> Diagnostic services (if in Lab Requested or cardiac)
        if p.status == "Lab Requested":
            g.add_edge(p_node_id, "DIAG-PATH", "ordered_for")
        if "chest pain" in (p.reported_concern or "").lower():
            g.add_edge(p_node_id, "DIAG-ECG", "ordered_for")

    return g


@router.get("/graph")
def get_resource_graph(db: Session = Depends(get_db)):
    """Returns the live hospital resource graph nodes, edges, and adjacency list."""
    g = build_live_resource_graph(db)
    return g.to_graph_data()


@router.get("/graph/bfs/{node_id}")
@router.post("/graph/bfs")
def run_bfs(node_id: Optional[str] = None, start_node_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Executes live BFS traversal from start node."""
    g = build_live_resource_graph(db)
    target = node_id or start_node_id or "DEPT-EME"
    return g.bfs_traversal(target)


@router.get("/graph/dfs/{node_id}")
@router.post("/graph/dfs")
def run_dfs(node_id: Optional[str] = None, start_node_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Executes live DFS traversal from start node."""
    g = build_live_resource_graph(db)
    target = node_id or start_node_id or "DEPT-EME"
    return g.dfs_traversal(target)


@router.get("/graph/match-resource")
def match_patient_resource(patient_id: str, department: str = "Emergency", db: Session = Depends(get_db)):
    """Demonstrates graph pathfinding to match patient with available doctor and bed."""
    g = build_live_resource_graph(db)
    target_node = f"PT-{patient_id}" if not patient_id.startswith("PT-") else patient_id
    return g.find_resource_path(target_node, department)
