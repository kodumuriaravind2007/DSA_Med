"""
Explainable Rule-Based Clinical Decision Support (CDS) Engine.

Safety & Educational Disclaimer:
This decision-support module is an educational prototype demonstrating explainable
rule-based algorithms and transparent triage logic. It is NOT a medically validated
diagnostic or clinical-triage device. Final triage urgency and treatment decisions
must always be established by authorized, qualified healthcare professionals.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime

from ..database import get_db
from ..models import CDSRecord, Patient, TimelineEvent, AuditLog
from ..schemas import CDSCheckRequest, CDSReviewRequest
from ..dsa.audit_chain import compute_audit_hash

router = APIRouter(prefix="/api/cds", tags=["Clinical Decision Support"])

DISCLAIMER_TEXT = (
    "EDUCATIONAL PROTOTYPE ONLY: This system provides transparent rule-based triage suggestions "
    "for educational demonstrations. It is not a diagnostic device or validated clinical triage tool. "
    "All decisions require confirmation and assessment by licensed healthcare personnel."
)


def evaluate_clinical_rules(
    concern: str,
    age: int = 35,
    vitals: Dict[str, Any] = None,
    conditions: List[str] = None
) -> Dict[str, Any]:
    """
    Transparent rule evaluation with step-by-step triggered rules,
    rationale, and missing information alerts.
    """
    vitals = vitals or {}
    conditions = [c.lower() for c in (conditions or [])]
    concern_lower = (concern or "").lower()

    triggered_rules = []
    missing_info = []
    suggested_priority = 3  # Default: Normal
    suggested_department = "General Medicine"
    confidence_rationale = []

    # Vital checks
    spo2 = vitals.get("oxygen_saturation_spo2")
    hr = vitals.get("heart_rate")
    temp = vitals.get("temperature_f")
    sbp = vitals.get("blood_pressure_systolic")
    dbp = vitals.get("blood_pressure_diastolic")

    # Missing info assessment
    if spo2 is None:
        missing_info.append("Oxygen Saturation (SpO2) not recorded")
    if hr is None:
        missing_info.append("Pulse / Heart Rate not recorded")
    if sbp is None or dbp is None:
        missing_info.append("Blood Pressure reading not recorded")
    if temp is None:
        missing_info.append("Body Temperature not recorded")

    # RULE 1: Severe Hypoxemia
    if spo2 is not None and spo2 < 90:
        triggered_rules.append({
            "rule_id": "CRIT-RESP-01",
            "name": "Severe Hypoxemia Rule",
            "criteria": f"SpO2 ({spo2}%) < 90%",
            "suggested_priority": 1,
            "recommended_dept": "Emergency",
            "rationale": "Severe arterial desaturation indicates critical acute respiratory failure requiring immediate oxygenation."
        })
        suggested_priority = 1
        suggested_department = "Emergency"
        confidence_rationale.append("SpO2 under 90% triggers automatic Critical Priority 1.")

    # RULE 2: Acute Chest Pain / Cardiac Emergency
    if any(k in concern_lower for k in ["chest pain", "cardiac", "heart attack", "crushing pain"]):
        triggered_rules.append({
            "rule_id": "CRIT-CARD-01",
            "name": "Acute Coronary Syndrome Alert",
            "criteria": "Reported complaint mentions chest pain or cardiac distress",
            "suggested_priority": 1,
            "recommended_dept": "Cardiology",
            "rationale": "High-risk acute coronary syndrome or pulmonary embolism cannot be ruled out without immediate ECG/troponin."
        })
        suggested_priority = 1
        suggested_department = "Cardiology"
        confidence_rationale.append("Reported chest pain warrants immediate ECG and priority emergency evaluation.")

    # RULE 3: Severe Hemodynamic Instability (Shock / Hypotension / Tachycardia)
    if sbp is not None and (sbp < 85 or sbp > 200):
        prio = 1 if sbp < 85 else 2
        triggered_rules.append({
            "rule_id": "CRIT-HEMO-01",
            "name": "Hemodynamic Instability Rule",
            "criteria": f"Systolic BP ({sbp} mmHg) is extreme (<85 or >200 mmHg)",
            "suggested_priority": prio,
            "recommended_dept": "Emergency",
            "rationale": "Hypotension indicates potential hypovolemic or septic shock; hypertensive crisis risks end-organ damage."
        })
        if prio == 1:
            suggested_priority = 1
            suggested_department = "Emergency"
        elif suggested_priority > 2:
            suggested_priority = 2

    # RULE 4: Severe Respiratory Distress
    if any(k in concern_lower for k in ["difficulty breathing", "shortness of breath", "severe asthma", "stridor"]):
        if suggested_priority > 2:
            suggested_priority = 2
            suggested_department = "Emergency"
        triggered_rules.append({
            "rule_id": "URG-RESP-02",
            "name": "Acute Respiratory Distress Protocol",
            "criteria": "Reported dyspnea / shortness of breath",
            "suggested_priority": min(suggested_priority, 2),
            "recommended_dept": "Emergency",
            "rationale": "Active breathing difficulty requires rapid auscultation and bronchodilator / airway assessment."
        })

    # RULE 5: High Fever / Hyperpyrexia
    if temp is not None and temp >= 103.0:
        if suggested_priority > 2:
            suggested_priority = 2
        triggered_rules.append({
            "rule_id": "URG-TEMP-01",
            "name": "Hyperpyrexia Rule",
            "criteria": f"Body Temperature ({temp}°F) >= 103.0°F",
            "suggested_priority": 2,
            "recommended_dept": "General Medicine" if age > 14 else "Pediatrics",
            "rationale": "High fever indicates significant systemic inflammatory response or febrile seizure risk."
        })

    # RULE 6: Fracture / Severe Burns / Wounds
    if any(k in concern_lower for k in ["burns", "wounds and cuts", "sprains", "joint pain", "fracture"]):
        dept = "Orthopedics" if "fracture" in concern_lower or "sprain" in concern_lower else "Emergency"
        if suggested_priority > 2:
            suggested_priority = 2
        suggested_department = dept
        triggered_rules.append({
            "rule_id": "URG-TRAUMA-01",
            "name": "Acute Trauma Assessment",
            "criteria": "Reported physical injury, burn, or acute orthopedic complaint",
            "suggested_priority": 2,
            "recommended_dept": dept,
            "rationale": "Requires wound cleaning, immobilization, and radiological evaluation."
        })

    # Pediatric Department Routing
    if age is not None and age <= 14:
        suggested_department = "Pediatrics"

    # Default Rule if no high-acuity triggers
    if not triggered_rules:
        triggered_rules.append({
            "rule_id": "NORM-ROUTINE-01",
            "name": "Standard Outpatient Protocol",
            "criteria": "No red-flag vital signs or acute critical complaints detected",
            "suggested_priority": 3,
            "recommended_dept": suggested_department,
            "rationale": "Stable vitals and routine presentation appropriate for normal outpatient consultation queue."
        })

    return {
        "suggested_priority": suggested_priority,
        "suggested_priority_label": {1: "Priority 1 — Critical", 2: "Priority 2 — Urgent", 3: "Priority 3 — Normal"}[suggested_priority],
        "suggested_department": suggested_department,
        "triggered_rules": triggered_rules,
        "missing_information": missing_info,
        "rationale_summary": " ".join(confidence_rationale) if confidence_rationale else "Evaluated against 6 clinical triage guidelines.",
        "disclaimer": DISCLAIMER_TEXT
    }


@router.post("/evaluate")
def evaluate_triage(req: CDSCheckRequest):
    """Evaluates rules for given concern and vitals without storing."""
    vitals_dict = req.vitals.dict() if req.vitals else {}
    return evaluate_clinical_rules(
        concern=req.reported_concern,
        age=req.age or 30,
        vitals=vitals_dict,
        conditions=req.known_conditions
    )


@router.get("/history/{patient_id}")
def get_patient_cds_history(patient_id: str, db: Session = Depends(get_db)):
    """Retrieves previous CDS evaluations and clinician review decisions for a patient."""
    records = db.query(CDSRecord).filter(CDSRecord.patient_id == patient_id).order_by(CDSRecord.id.desc()).all()
    return records


@router.post("/review")
def record_clinician_decision(req: CDSReviewRequest, db: Session = Depends(get_db)):
    """
    Records clinician confirmation or override with justification notes.
    Updates the patient's triage status and writes to the audit chain.
    """
    record = db.query(CDSRecord).filter(CDSRecord.id == req.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="CDS record not found.")

    record.clinician_decision = req.decision
    record.clinician_notes = req.clinician_notes
    record.reviewed_by = req.reviewed_by
    record.timestamp = datetime.utcnow().isoformat()

    # Update patient priority
    patient = db.query(Patient).filter(Patient.patient_id == record.patient_id).first()
    if patient:
        old_prio = patient.priority
        patient.priority = req.final_priority
        patient.updated_at = datetime.utcnow().isoformat()

        # Add timeline event
        timeline = TimelineEvent(
            patient_id=patient.patient_id,
            timestamp=datetime.utcnow().isoformat(),
            event_type="Triage Decision",
            title=f"Triage Decision: {req.decision} (Priority {req.final_priority})",
            description=f"Reviewed by {req.reviewed_by}. Notes: {req.clinician_notes}",
            actor=req.reviewed_by
        )
        db.add(timeline)

        # Audit event
        last_audit = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        prev_h = last_audit.current_hash if last_audit else "0" * 64
        ts = datetime.utcnow().isoformat()
        act = "CLINICAL_DECISION_REVIEW"
        details = f"Decision={req.decision}, OldPriority={old_prio}, FinalPriority={req.final_priority}, Notes={req.clinician_notes}"
        curr_h = compute_audit_hash(prev_h, ts, req.reviewed_by, act, patient.patient_id, details)

        audit_entry = AuditLog(
            timestamp=ts,
            actor=req.reviewed_by,
            action=act,
            record_id=patient.patient_id,
            details=details,
            prev_hash=prev_h,
            current_hash=curr_h,
        )
        db.add(audit_entry)

    db.commit()
    return {"status": "success", "message": "Clinician decision and override rationale recorded successfully."}
