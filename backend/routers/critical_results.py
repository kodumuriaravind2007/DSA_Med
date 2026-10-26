"""
Feature A: Critical Diagnostic Result Follow-Up System.
Manages critical / panic laboratory result detection, clinician notification,
formal acknowledgement, documented clinical action, and resolution workflows.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from ..database import get_db
from ..models import (
    CriticalResultFollowUp, LabOrder, LabResult, Patient,
    TimelineEvent, AuditLog, PatientHistoryChangeAlert
)
from ..schemas import (
    CriticalFollowUpResponse, CriticalFollowUpAcknowledge,
    CriticalFollowUpAction, CriticalFollowUpResolve
)
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .websocket import manager

router = APIRouter(prefix="/api/critical-results", tags=["Critical Result Follow-Up System"])

# Configurable Clinical Panic / Critical Value Rules
CRITICAL_VALUE_RULES = [
    {
        "test_name": "Troponin-I (High Sensitivity)",
        "parameter_name": "Troponin-I",
        "threshold": 0.04,
        "operator": ">",
        "unit": "ng/mL",
        "rationale": "High-sensitivity Troponin-I above diagnostic ischemic threshold. High risk of Acute Myocardial Infarction.",
        "urgency": "Immediate STAT (within 15 mins)"
    },
    {
        "test_name": "Electrolytes",
        "parameter_name": "Serum Potassium (K+)",
        "low_threshold": 2.8,
        "high_threshold": 6.0,
        "unit": "mEq/L",
        "rationale": "Potassium out of critical range (<2.8 or >6.0). High risk of life-threatening cardiac dysrhythmias.",
        "urgency": "STAT (within 30 mins)"
    },
    {
        "test_name": "Complete Blood Count (CBC)",
        "parameter_name": "Platelets",
        "threshold": 40,
        "operator": "<",
        "unit": "10^3/uL",
        "rationale": "Severe thrombocytopenia (<40k). Severe spontaneous bleeding danger.",
        "urgency": "Urgent (within 1 hour)"
    },
    {
        "test_name": "Complete Blood Count (CBC)",
        "parameter_name": "WBC Count",
        "high_threshold": 25.0,
        "low_threshold": 1.5,
        "unit": "10^3/uL",
        "rationale": "Marked leukocytosis (>25k) or profound leukopenia (<1.5k). Severe sepsis / agranulocytosis concern.",
        "urgency": "Urgent (within 1 hour)"
    },
    {
        "test_name": "Blood Glucose",
        "parameter_name": "Random Blood Glucose",
        "high_threshold": 450,
        "low_threshold": 50,
        "unit": "mg/dL",
        "rationale": "Profound hypoglycemia (<50) or severe hyperglycemia (>450). Risk of coma, ketoacidosis or irreversible neuroglycopenia.",
        "urgency": "Immediate STAT (within 15 mins)"
    },
    {
        "test_name": "Kidney Function Test (KFT)",
        "parameter_name": "Serum Creatinine",
        "threshold": 3.5,
        "operator": ">",
        "unit": "mg/dL",
        "rationale": "Acute renal failure threshold. Impending dialysis or severe nephrotoxicity indication.",
        "urgency": "Urgent (within 2 hours)"
    }
]


def _evaluate_numeric_rule(val_str: str, rule: dict) -> bool:
    """Safely extracts numeric portion of result and applies threshold checks."""
    try:
        # Strip extraneous words e.g. "0.08 ng/mL" or "> 100"
        cleaned = "".join(ch for ch in val_str if ch.isdigit() or ch == ".")
        if not cleaned:
            return False
        num = float(cleaned)

        if "operator" in rule and "threshold" in rule:
            if rule["operator"] == ">" and num > rule["threshold"]:
                return True
            if rule["operator"] == "<" and num < rule["threshold"]:
                return True

        if "high_threshold" in rule and num > rule["high_threshold"]:
            return True
        if "low_threshold" in rule and num < rule["low_threshold"]:
            return True

        return False
    except Exception:
        return False


def scan_and_generate_critical_followups(db: Session) -> List[CriticalResultFollowUp]:
    """
    Scans all recorded laboratory results against configured critical panic rules.
    Idempotent: prevents duplicate follow-ups for already flagged results.
    """
    results = db.query(LabResult).all()
    created_followups = []
    iso_now = datetime.utcnow().isoformat()

    for res in results:
        is_critical = (res.flag or "").lower() == "critical"
        matching_rule = None

        for rule in CRITICAL_VALUE_RULES:
            if (
                rule["parameter_name"].lower() in res.parameter_name.lower() or
                res.parameter_name.lower() in rule["parameter_name"].lower()
            ):
                if _evaluate_numeric_rule(res.result_value, rule):
                    is_critical = True
                    matching_rule = rule
                    break

        if is_critical:
            # Check if follow-up already exists for this exact order and parameter
            existing = (
                db.query(CriticalResultFollowUp)
                .filter(
                    CriticalResultFollowUp.patient_id == res.patient_id,
                    CriticalResultFollowUp.lab_order_id == res.lab_order_id,
                    CriticalResultFollowUp.parameter_name == res.parameter_name,
                )
                .first()
            )
            if not existing:
                count = db.query(CriticalResultFollowUp).count()
                cf_id = f"CRF-{count + 101}"
                rationale = matching_rule["rationale"] if matching_rule else f"Flagged as critical value by diagnostic laboratory ({res.result_value} {res.unit})."
                deadline_iso = (datetime.utcnow() + timedelta(hours=1)).isoformat()

                patient = db.query(Patient).filter(Patient.patient_id == res.patient_id).first()
                doc_id = patient.assigned_doctor_id if patient else None

                followup = CriticalResultFollowUp(
                    id=cf_id,
                    patient_id=res.patient_id,
                    lab_order_id=res.lab_order_id,
                    lab_result_id=res.id,
                    test_name=res.test_name,
                    parameter_name=res.parameter_name,
                    result_value=res.result_value,
                    unit=res.unit,
                    reference_range=res.reference_range,
                    critical_rationale=rationale,
                    status="Awaiting Acknowledgement",
                    deadline=deadline_iso,
                    assigned_doctor_id=doc_id,
                    created_at=iso_now
                )
                db.add(followup)

                # Emit Patient History Change Alert as well
                change_alert = PatientHistoryChangeAlert(
                    id=f"PCA-{db.query(PatientHistoryChangeAlert).count() + 201}",
                    patient_id=res.patient_id,
                    record_type="LabResult",
                    record_id=res.lab_order_id,
                    field_name=f"Critical {res.parameter_name}",
                    old_value="Normal Baseline",
                    new_value=f"{res.result_value} {res.unit} (CRITICAL)",
                    author_name="Diagnostic Pathology Lab",
                    author_role="lab",
                    reason=rationale,
                    is_reviewed=False,
                    created_at=iso_now
                )
                db.add(change_alert)

                # Add to timeline
                db.add(TimelineEvent(
                    patient_id=res.patient_id,
                    timestamp=iso_now,
                    event_type="Critical Alert",
                    title=f"CRITICAL LAB VALUE: {res.parameter_name} = {res.result_value}",
                    description=rationale,
                    actor="Diagnostic Pathology Lab"
                ))

                created_followups.append(followup)

    if created_followups:
        db.commit()
    return created_followups


@router.get("", response_model=List[CriticalFollowUpResponse])
@router.get("/", response_model=List[CriticalFollowUpResponse])
def get_critical_followups(
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
    unacknowledged_only: bool = False,
    db: Session = Depends(get_db)
):
    """Retrieves all critical result follow-ups with clinical filter options."""
    # Ensure any recent lab records are evaluated
    scan_and_generate_critical_followups(db)

    query = db.query(CriticalResultFollowUp)
    if patient_id:
        query = query.filter(CriticalResultFollowUp.patient_id == patient_id)
    if status and status != "All":
        query = query.filter(CriticalResultFollowUp.status == status)
    if unacknowledged_only:
        query = query.filter(CriticalResultFollowUp.status == "Awaiting Acknowledgement")

    return query.order_by(CriticalResultFollowUp.created_at.desc()).all()


@router.post("/evaluate")
def evaluate_critical_rules(db: Session = Depends(get_db)):
    """Triggers on-demand evaluation of laboratory results against critical value rules."""
    new_followups = scan_and_generate_critical_followups(db)
    return {
        "status": "success",
        "newly_flagged_count": len(new_followups),
        "new_followups": [f.id for f in new_followups],
        "active_rules_count": len(CRITICAL_VALUE_RULES)
    }


@router.post("/{followup_id}/acknowledge")
def acknowledge_critical_followup(
    followup_id: str,
    req: CriticalFollowUpAcknowledge,
    db: Session = Depends(get_db)
):
    """
    Authorised clinician formally acknowledges receipt of critical laboratory finding.
    Moves status from 'Awaiting Acknowledgement' to 'Acknowledged'.
    """
    fu = db.query(CriticalResultFollowUp).filter(CriticalResultFollowUp.id == followup_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Critical follow-up record not found.")

    iso_now = datetime.utcnow().isoformat()
    fu.acknowledged_by = req.acknowledged_by
    fu.acknowledged_at = iso_now
    fu.status = "Acknowledged"

    note_text = f"Acknowledged by {req.acknowledged_by}. {req.notes or ''}".strip()

    # Timeline event
    db.add(TimelineEvent(
        patient_id=fu.patient_id,
        timestamp=iso_now,
        event_type="Critical Alert Acknowledged",
        title=f"Critical Result Acknowledged: {fu.parameter_name}",
        description=note_text,
        actor=req.acknowledged_by
    ))

    # Audit trail event
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details_str = f"Critical result {fu.parameter_name} ({fu.result_value}) acknowledged by {req.acknowledged_by}. Notes: {req.notes or 'None'}"
    curr_h = compute_audit_hash(
        prev_h, iso_now, req.acknowledged_by, "ACKNOWLEDGE_CRITICAL_RESULT",
        fu.id, details_str
    )
    db.add(AuditLog(
        timestamp=iso_now,
        actor=req.acknowledged_by,
        action="ACKNOWLEDGE_CRITICAL_RESULT",
        record_id=fu.id,
        details=details_str,
        prev_hash=prev_h,
        current_hash=curr_h,
    ))

    db.commit()
    db.refresh(fu)
    return {"status": "success", "message": "Critical result successfully acknowledged.", "record": fu}


@router.post("/{followup_id}/action")
def record_clinical_action(
    followup_id: str,
    req: CriticalFollowUpAction,
    db: Session = Depends(get_db)
):
    """Records intermediate diagnostic or therapeutic action taken in response to critical result."""
    fu = db.query(CriticalResultFollowUp).filter(CriticalResultFollowUp.id == followup_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Critical follow-up record not found.")

    iso_now = datetime.utcnow().isoformat()
    existing_actions = fu.action_taken or ""
    new_entry = f"[{iso_now[:19].replace('T', ' ')}] {req.actor}: {req.action_taken}"
    fu.action_taken = f"{existing_actions}\n{new_entry}".strip()
    fu.status = "Follow-up In Progress"

    db.add(TimelineEvent(
        patient_id=fu.patient_id,
        timestamp=iso_now,
        event_type="Clinical Action",
        title=f"Action on Critical Result ({fu.parameter_name})",
        description=req.action_taken,
        actor=req.actor
    ))

    db.commit()
    db.refresh(fu)
    return {"status": "success", "message": "Clinical action logged.", "record": fu}


@router.post("/{followup_id}/resolve")
def resolve_critical_followup(
    followup_id: str,
    req: CriticalFollowUpResolve,
    db: Session = Depends(get_db)
):
    """
    Formally closes and resolves the critical result follow-up with documented clinical outcome.
    Moves status to 'Resolved'.
    """
    fu = db.query(CriticalResultFollowUp).filter(CriticalResultFollowUp.id == followup_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Critical follow-up record not found.")

    iso_now = datetime.utcnow().isoformat()
    fu.status = "Resolved"
    fu.resolved_by = req.resolved_by
    fu.resolved_at = iso_now
    fu.resolution_details = req.resolution_details

    # Timeline event
    db.add(TimelineEvent(
        patient_id=fu.patient_id,
        timestamp=iso_now,
        event_type="Critical Alert Resolved",
        title=f"Critical Result Resolved: {fu.parameter_name}",
        description=f"Resolved by {req.resolved_by}. Resolution: {req.resolution_details}",
        actor=req.resolved_by
    ))

    # Audit trail
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details_str = f"Critical follow-up {fu.id} resolved by {req.resolved_by}. Resolution: {req.resolution_details}"
    curr_h = compute_audit_hash(
        prev_h, iso_now, req.resolved_by, "RESOLVE_CRITICAL_RESULT",
        fu.id, details_str
    )
    db.add(AuditLog(
        timestamp=iso_now,
        actor=req.resolved_by,
        action="RESOLVE_CRITICAL_RESULT",
        record_id=fu.id,
        details=details_str,
        prev_hash=prev_h,
        current_hash=curr_h,
    ))

    db.commit()
    db.refresh(fu)
    return {"status": "success", "message": "Critical result follow-up successfully resolved.", "record": fu}
