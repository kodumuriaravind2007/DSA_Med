"""
Laboratory Orders & Clinical Diagnostic Records.

Supports:
- Expanded configurable concerns & clinical test catalog
- Lab ordering and entering parameter-level results
- Standard reference ranges and abnormal flags
- Timeline and audit integration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..database import get_db
from ..models import LabOrder, LabResult, Patient, TimelineEvent, AuditLog
from ..schemas import LabOrderCreate, LabOrderResponse, LabResultCreate
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH

router = APIRouter(prefix="/api/labs", tags=["Laboratory & Diagnostic Services"])

CLINICAL_CONCERNS_LIST = [
    "Fever", "Cough", "Sore throat", "Headache", "Dizziness",
    "Chest pain", "Difficulty breathing", "Abdominal pain", "Vomiting",
    "Diarrhea", "Dehydration", "Wounds and cuts", "Burns", "Sprains",
    "Joint pain", "Back pain", "Skin rash or allergy", "High blood pressure",
    "Diabetes follow-up", "Fatigue", "Urinary symptoms", "Ear pain",
    "Eye irritation", "Routine check-up"
]

LAB_TEST_CATALOG = {
    "Complete Blood Count (CBC)": [
        {"parameter": "Hemoglobin", "unit": "g/dL", "ref_range": "12.0 - 17.5"},
        {"parameter": "WBC Count", "unit": "10^3/uL", "ref_range": "4.5 - 11.0"},
        {"parameter": "Platelets", "unit": "10^3/uL", "ref_range": "150 - 450"},
        {"parameter": "RBC Count", "unit": "10^6/uL", "ref_range": "4.2 - 5.9"},
        {"parameter": "Hematocrit", "unit": "%", "ref_range": "37.0 - 50.0"},
    ],
    "Blood Glucose": [
        {"parameter": "Fasting Blood Glucose", "unit": "mg/dL", "ref_range": "70 - 99"},
        {"parameter": "Random Blood Glucose", "unit": "mg/dL", "ref_range": "80 - 140"},
    ],
    "HbA1c": [
        {"parameter": "Glycated Hemoglobin (HbA1c)", "unit": "%", "ref_range": "4.0 - 5.6"},
    ],
    "Kidney Function Test (KFT)": [
        {"parameter": "Serum Creatinine", "unit": "mg/dL", "ref_range": "0.6 - 1.2"},
        {"parameter": "Blood Urea Nitrogen (BUN)", "unit": "mg/dL", "ref_range": "7 - 20"},
        {"parameter": "eGFR", "unit": "mL/min/1.73m2", "ref_range": "> 90"},
        {"parameter": "Uric Acid", "unit": "mg/dL", "ref_range": "3.5 - 7.2"},
    ],
    "Liver Function Test (LFT)": [
        {"parameter": "Total Bilirubin", "unit": "mg/dL", "ref_range": "0.2 - 1.2"},
        {"parameter": "SGOT / AST", "unit": "U/L", "ref_range": "10 - 40"},
        {"parameter": "SGPT / ALT", "unit": "U/L", "ref_range": "7 - 56"},
        {"parameter": "Alkaline Phosphatase (ALP)", "unit": "U/L", "ref_range": "44 - 147"},
        {"parameter": "Serum Albumin", "unit": "g/dL", "ref_range": "3.4 - 5.4"},
    ],
    "Lipid Profile": [
        {"parameter": "Total Cholesterol", "unit": "mg/dL", "ref_range": "< 200"},
        {"parameter": "Triglycerides", "unit": "mg/dL", "ref_range": "< 150"},
        {"parameter": "HDL Cholesterol", "unit": "mg/dL", "ref_range": "> 40"},
        {"parameter": "LDL Cholesterol", "unit": "mg/dL", "ref_range": "< 100"},
    ],
    "C-Reactive Protein (CRP)": [
        {"parameter": "High-Sensitivity CRP", "unit": "mg/L", "ref_range": "< 3.0"},
    ],
    "Electrolytes": [
        {"parameter": "Serum Sodium (Na+)", "unit": "mEq/L", "ref_range": "135 - 145"},
        {"parameter": "Serum Potassium (K+)", "unit": "mEq/L", "ref_range": "3.5 - 5.0"},
        {"parameter": "Serum Chloride (Cl-)", "unit": "mEq/L", "ref_range": "96 - 106"},
    ],
    "Thyroid Profile": [
        {"parameter": "TSH", "unit": "uIU/mL", "ref_range": "0.4 - 4.0"},
        {"parameter": "Free T3", "unit": "pg/mL", "ref_range": "2.3 - 4.2"},
        {"parameter": "Free T4", "unit": "ng/dL", "ref_range": "0.8 - 1.8"},
    ],
    "Urinalysis": [
        {"parameter": "Urine Protein", "unit": "mg/dL", "ref_range": "Negative (< 10)"},
        {"parameter": "Urine Glucose", "unit": "mg/dL", "ref_range": "Negative"},
        {"parameter": "Urine Pus Cells (WBC)", "unit": "/HPF", "ref_range": "0 - 5"},
    ],
    "Blood Culture": [
        {"parameter": "Aerobic Culture", "unit": "Status", "ref_range": "No growth after 48 hrs"},
    ],
    "Hemoglobin": [
        {"parameter": "Hemoglobin (Spot)", "unit": "g/dL", "ref_range": "12.0 - 17.5"},
    ],
}


@router.get("/catalog")
def get_clinical_catalog():
    """Returns lists of supported reported concerns and laboratory test profiles."""
    return {
        "concerns": CLINICAL_CONCERNS_LIST,
        "lab_test_catalog": LAB_TEST_CATALOG,
        "disclaimer": "Reference ranges provided are standard adult reference baselines for demonstration."
    }


@router.post("/patient/{patient_id}/order", response_model=LabOrderResponse)
def order_lab_test(patient_id: str, req: LabOrderCreate, db: Session = Depends(get_db)):
    """Creates a new laboratory order for a patient."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    order_count = db.query(LabOrder).count()
    order_id = f"LAB-{700 + order_count + 1}"
    iso_now = datetime.utcnow().isoformat()

    order = LabOrder(
        id=order_id,
        patient_id=patient_id,
        test_name=req.test_name,
        order_date=iso_now,
        status="Pending",
        ordering_doctor=req.ordering_doctor or "Attending Physician"
    )
    db.add(order)
    db.flush()

    # If initial results provided (e.g. pre-filled demo)
    if req.initial_results:
        for res in req.initial_results:
            r_entry = LabResult(
                lab_order_id=order_id,
                patient_id=patient_id,
                test_name=req.test_name,
                parameter_name=res.parameter_name,
                result_value=res.result_value,
                unit=res.unit or "",
                reference_range=res.reference_range or "",
                flag=res.flag or "Normal",
                verified_by=res.verified_by or "Staff Pathologist",
                verified_at=iso_now,
            )
            db.add(r_entry)
        order.status = "Completed"

    # Update patient status if waiting
    if patient.status in ["Waiting", "In Treatment"]:
        patient.status = "Lab Requested"
        patient.updated_at = iso_now

    # Timeline event
    timeline = TimelineEvent(
        patient_id=patient_id,
        timestamp=iso_now,
        event_type="Lab Ordered",
        title=f"Lab Ordered: {req.test_name}",
        description=f"Order {order_id} generated by {req.ordering_doctor}.",
        actor=req.ordering_doctor or "Physician"
    )
    db.add(timeline)

    # Audit log
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    details_str = f"Test: {req.test_name} for {patient.full_name} ({patient_id})"
    curr_h = compute_audit_hash(prev_h, iso_now, req.ordering_doctor or "Physician", "ORDER_LAB", order_id, details_str)
    db.add(AuditLog(
        timestamp=iso_now,
        actor=req.ordering_doctor or "Physician",
        action="ORDER_LAB",
        record_id=order_id,
        details=details_str,
        prev_hash=prev_h,
        current_hash=curr_h,
    ))

    db.commit()
    db.refresh(order)
    return order


@router.post("/order/{order_id}/result")
def enter_lab_result(order_id: str, req: LabResultCreate, db: Session = Depends(get_db)):
    """Enters a laboratory result parameter and marks order completed."""
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    iso_now = datetime.utcnow().isoformat()
    result_entry = LabResult(
        lab_order_id=order_id,
        patient_id=order.patient_id,
        test_name=order.test_name,
        parameter_name=req.parameter_name,
        result_value=req.result_value,
        unit=req.unit or "",
        reference_range=req.reference_range or "",
        flag=req.flag or "Normal",
        verified_by=req.verified_by or "Staff Pathologist",
        verified_at=iso_now,
    )
    db.add(result_entry)
    order.status = "Completed"

    # Timeline
    timeline = TimelineEvent(
        patient_id=order.patient_id,
        timestamp=iso_now,
        event_type="Lab Result Available",
        title=f"Lab Result: {req.parameter_name} = {req.result_value} {req.unit} ({req.flag})",
        description=f"Verified by {req.verified_by}. Normal range: {req.reference_range}",
        actor=req.verified_by or "Pathologist"
    )
    db.add(timeline)

    # Audit
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    curr_h = compute_audit_hash(prev_h, iso_now, req.verified_by or "Pathologist", "ENTER_LAB_RESULT", order_id, f"{req.parameter_name}={req.result_value}")
    db.add(AuditLog(
        timestamp=iso_now,
        actor=req.verified_by or "Pathologist",
        action="ENTER_LAB_RESULT",
        record_id=order_id,
        details=f"{req.parameter_name}: {req.result_value} {req.unit} ({req.flag})",
        prev_hash=prev_h,
        current_hash=curr_h,
    ))

    db.commit()
    return {"status": "success", "order_id": order_id, "parameter": req.parameter_name}


@router.post("/order/{order_id}/status")
def update_lab_status(order_id: str, new_status: str, actor: str = "Laboratory Staff", db: Session = Depends(get_db)):
    """Transitions lab order status through its lifecycle."""
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    iso_now = datetime.utcnow().isoformat()
    order.status = new_status

    timeline = TimelineEvent(
        patient_id=order.patient_id,
        timestamp=iso_now,
        event_type="Lab Status Update",
        title=f"Lab Order Status: {new_status}",
        description=f"Diagnostic test '{order.test_name}' is now {new_status}.",
        actor=actor
    )
    db.add(timeline)

    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    curr_h = compute_audit_hash(prev_h, iso_now, actor, "UPDATE_LAB_STATUS", order_id, f"Status: {new_status}")
    db.add(AuditLog(
        timestamp=iso_now,
        actor=actor,
        action="UPDATE_LAB_STATUS",
        record_id=order_id,
        details=f"Order {order_id} ({order.test_name}) updated to {new_status}",
        prev_hash=prev_h,
        current_hash=curr_h,
    ))
    db.commit()
    return {"status": "success", "order_id": order_id, "new_status": new_status}


@router.post("/order/{order_id}/release-to-patient")
def release_lab_to_patient(order_id: str, reviewed_by: str = "Attending Physician", notes: str = "", db: Session = Depends(get_db)):
    """Clinician confirms review and releases diagnostic results to Patient Portal."""
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found.")

    iso_now = datetime.utcnow().isoformat()
    order.is_released_to_patient = True
    order.status = "Clinician Reviewed"

    timeline = TimelineEvent(
        patient_id=order.patient_id,
        timestamp=iso_now,
        event_type="Lab Released",
        title=f"Lab Results Released to Patient: {order.test_name}",
        description=f"Results for '{order.test_name}' reviewed by {reviewed_by} and released to Patient Portal. {notes}".strip(),
        actor=reviewed_by
    )
    db.add(timeline)

    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    curr_h = compute_audit_hash(prev_h, iso_now, reviewed_by, "RELEASE_LAB_TO_PATIENT", order_id, f"Released by {reviewed_by}")
    db.add(AuditLog(
        timestamp=iso_now,
        actor=reviewed_by,
        action="RELEASE_LAB_TO_PATIENT",
        record_id=order_id,
        details=f"Results for order {order_id} ({order.test_name}) verified and released to patient by {reviewed_by}",
        prev_hash=prev_h,
        current_hash=curr_h,
    ))
    db.commit()
    return {"status": "success", "order_id": order_id, "is_released_to_patient": True}
