"""
Duplicate Record Detection & Hospital Data Quality Audit Router.

Features:
- Global scan for duplicate candidates across all patient records
- Normalized phone, email, and Levenshtein name similarity scoring
- Side-by-side candidate comparison
- Strict human-in-the-loop review workflow (persisted in DuplicateReviewRecord)
- Hospital Data Quality & Completeness Engine (National ID, Vitals, Bed/Doctor assignments)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Patient, TimelineEvent, AuditLog, DuplicateReviewRecord, VitalSign
from ..schemas import DataQualityReportResponse, DataQualityIssue
from ..dsa.duplicate_detector import DuplicateDetector, name_similarity_score, normalize_phone, normalize_string
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH

router = APIRouter(prefix="/api/duplicates", tags=["Duplicate Detection & Data Quality"])


class DuplicateReviewDecision(BaseModel):
    patient_id_1: str
    patient_id_2: str
    decision: str  # "FLAG_MERGE_REQUIRED", "MARK_DISTINCT", "Requires Further Review"
    similarity_percentage: Optional[float] = 0.0
    matched_fields: Optional[str] = ""
    notes: str
    reviewed_by: str = "Records Officer"


@router.get("/scan")
def scan_all_duplicates(threshold: float = 0.65, db: Session = Depends(get_db)):
    """
    Scans the entire patient database for duplicate candidate pairs.
    Uses O(1) hash lookups and O(N^2) pairwise fuzzy comparisons.
    """
    patients = db.query(Patient).all()
    patient_dicts = [
        {
            "patient_id": p.patient_id,
            "full_name": p.full_name,
            "phone": p.phone or "",
            "email": p.email or "",
            "date_of_birth": p.registration_date[:10] if p.registration_date else "",
            "gender": p.gender or "",
            "department": p.department or "",
            "is_duplicate_flag": p.is_duplicate_flag,
        }
        for p in patients
    ]

    detector = DuplicateDetector()
    candidate_pairs = []
    seen_pairs = set()

    for i in range(len(patient_dicts)):
        for j in range(i + 1, len(patient_dicts)):
            p1 = patient_dicts[i]
            p2 = patient_dicts[j]
            pair_key = tuple(sorted([p1["patient_id"], p2["patient_id"]]))
            if pair_key in seen_pairs:
                continue

            matches = detector.find_potential_duplicates(p1, [p2], threshold=threshold)
            if matches:
                seen_pairs.add(pair_key)
                m = matches[0]
                candidate_pairs.append({
                    "patient_1": p1,
                    "patient_2": p2,
                    "similarity_score": m["similarity_score"],
                    "similarity_percentage": m["similarity_percentage"],
                    "matched_fields": m["matched_fields"],
                    "recommended_action": m["recommended_action"],
                })

    candidate_pairs.sort(key=lambda x: x["similarity_score"], reverse=True)
    return {
        "total_scanned_patients": len(patients),
        "total_duplicate_candidates_found": len(candidate_pairs),
        "candidates": candidate_pairs,
        "policy": "Human Verification Mandatory: Automatic record merging is strictly prohibited to safeguard clinical safety."
    }


@router.post("/review")
def record_duplicate_review(req: DuplicateReviewDecision, db: Session = Depends(get_db)):
    """Records human clinician/records officer review on a candidate duplicate pair."""
    p1 = db.query(Patient).filter(Patient.patient_id == req.patient_id_1).first()
    p2 = db.query(Patient).filter(Patient.patient_id == req.patient_id_2).first()
    if not p1 or not p2:
        raise HTTPException(status_code=404, detail="One or both patient records not found.")

    iso_now = datetime.utcnow().isoformat()
    if req.decision in ["FLAG_MERGE_REQUIRED", "Confirmed Duplicate"]:
        p1.is_duplicate_flag = True
        p2.is_duplicate_flag = True
        action_label = "Confirmed Potential Duplicate (Flagged for Administrative Merge Review)"
    elif req.decision in ["MARK_DISTINCT", "Not a Duplicate"]:
        p1.is_duplicate_flag = False
        p2.is_duplicate_flag = False
        action_label = "Confirmed Distinct Patients (Dismissed Duplicate Flag)"
    else:
        action_label = f"Duplicate Review: {req.decision}"

    p1.updated_at = iso_now
    p2.updated_at = iso_now

    # Persistent Duplicate Review Record
    review_record = DuplicateReviewRecord(
        patient_id_1=req.patient_id_1,
        patient_id_2=req.patient_id_2,
        decision=req.decision,
        similarity_percentage=req.similarity_percentage or 0.0,
        matched_fields=req.matched_fields or "",
        reviewed_by=req.reviewed_by,
        reviewed_at=iso_now,
        notes=req.notes
    )
    db.add(review_record)

    # Timeline events
    db.add(TimelineEvent(
        patient_id=p1.patient_id,
        timestamp=iso_now,
        event_type="Duplicate Audit",
        title=action_label,
        description=f"Compared with {p2.patient_id} ({p2.full_name}). Notes: {req.notes}",
        actor=req.reviewed_by
    ))
    db.add(TimelineEvent(
        patient_id=p2.patient_id,
        timestamp=iso_now,
        event_type="Duplicate Audit",
        title=action_label,
        description=f"Compared with {p1.patient_id} ({p1.full_name}). Notes: {req.notes}",
        actor=req.reviewed_by
    ))

    # Chained Audit log
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last.current_hash if last else GENESIS_HASH
    details = f"Decision={req.decision}. Notes={req.notes}. Fields={req.matched_fields}"
    curr_h = compute_audit_hash(
        prev_h, iso_now, req.reviewed_by, "REVIEW_DUPLICATE_RECORDS",
        f"{req.patient_id_1},{req.patient_id_2}",
        details
    )
    db.add(AuditLog(
        timestamp=iso_now,
        actor=req.reviewed_by,
        action="REVIEW_DUPLICATE_RECORDS",
        record_id=f"{req.patient_id_1},{req.patient_id_2}",
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h,
    ))

    db.commit()
    return {"status": "success", "decision": req.decision, "message": "Review recorded in persistent audit log."}


@router.get("/reviews")
def get_duplicate_reviews(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve history of duplicate patient review decisions."""
    reviews = (
        db.query(DuplicateReviewRecord)
        .order_by(DuplicateReviewRecord.reviewed_at.desc())
        .limit(limit)
        .all()
    )
    return reviews


@router.get("/data-quality", response_model=DataQualityReportResponse)
def run_data_quality_audit(db: Session = Depends(get_db)):
    """
    Intelligent Data Quality & Completeness Engine.
    Scans patient demographics, missing National IDs, clinical vitals compliance,
    and missing doctor/bed allocations.
    """
    patients = db.query(Patient).all()
    total_records = len(patients)
    issues: List[DataQualityIssue] = []

    if total_records == 0:
        return DataQualityReportResponse(
            total_records_analyzed=0,
            data_quality_score=100.0,
            issues_found=[],
            duplicate_candidates_count=0,
            timestamp=datetime.utcnow().isoformat()
        )

    deductions = 0.0

    for p in patients:
        # 1. Missing National ID / Govt ID
        if not p.govt_id or p.govt_id.strip() == "":
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Missing National ID",
                severity="Medium",
                description="Government / National ID identifier is missing or unverified."
            ))
            deductions += 2.0

        # 2. Missing Phone / Contact
        if not p.phone or len(p.phone.strip()) < 7:
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Incomplete Contact",
                severity="High",
                description="Valid telephone contact number is absent; impedes critical emergency reach."
            ))
            deductions += 3.5

        # 3. Active Patient with Unassigned Attending Physician
        if p.status in ["In Treatment", "Observation"] and not p.assigned_doctor_id:
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Unassigned Attending Physician",
                severity="High",
                description=f"Patient in active state '{p.status}' without designated attending doctor."
            ))
            deductions += 4.0

        # 4. Inpatient with No Assigned Bed
        if p.status == "Observation" and not p.assigned_bed_id:
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Unassigned Bed Placement",
                severity="Medium",
                description="Patient admitted under observation without an assigned physical bed."
            ))
            deductions += 2.5

        # 5. Missing Vitals for Active Encounter
        vitals_count = db.query(VitalSign).filter(VitalSign.patient_id == p.patient_id).count()
        if vitals_count == 0 and p.status in ["In Treatment", "Observation", "Waiting"]:
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Missing Baseline Vitals",
                severity="High",
                description="No baseline vital signs recorded for active clinical patient."
            ))
            deductions += 3.5

        # 6. Flagged duplicate
        if p.is_duplicate_flag:
            issues.append(DataQualityIssue(
                patient_id=p.patient_id,
                patient_name=p.full_name,
                issue_type="Duplicate Flag Unresolved",
                severity="Medium",
                description="Patient has active duplicate flag requiring records officer resolution."
            ))
            deductions += 2.0

    # Calculate overall hospital data quality score (normalized)
    max_possible_deductions = total_records * 15.0
    quality_score = max(0.0, min(100.0, 100.0 - (deductions / max(1.0, max_possible_deductions) * 100.0)))
    quality_score = round(quality_score, 1)

    # Count duplicate candidates
    dup_count = db.query(Patient).filter(Patient.is_duplicate_flag == True).count()

    return DataQualityReportResponse(
        total_records_analyzed=total_records,
        data_quality_score=quality_score,
        issues_found=issues,
        duplicate_candidates_count=dup_count,
        timestamp=datetime.utcnow().isoformat()
    )
