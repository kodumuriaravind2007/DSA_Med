"""
Comprehensive Unit & Integration Tests for MedTree X Intelligent Clinical Features:
1. Critical Result Follow-Up System
2. Patient History Change Alerts
3. Intelligent Doctor-Nurse Handover
4. Duplicate Patient Detection & Hospital Data Quality Audit
5. Medical Record Correction History & Immutable Chaining
6. Phase 4: Doctor-Specific Bedside QR Access Verification
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_critical_results_workflow():
    # 1. Trigger evaluation
    eval_resp = client.post("/api/critical-results/evaluate")
    assert eval_resp.status_code == 200
    assert "active_rules_count" in eval_resp.json()

    # 2. Fetch list of critical followups
    res = client.get("/api/critical-results")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    first_item = items[0]
    fu_id = first_item["id"]

    # 3. Acknowledge
    ack_resp = client.post(f"/api/critical-results/{fu_id}/acknowledge", json={
        "acknowledged_by": "Dr. Ayesha Mukherjee",
        "notes": "Acknowledged STAT. Preparing cardiology intervention."
    })
    assert ack_resp.status_code == 200
    assert ack_resp.json()["record"]["status"] == "Acknowledged"

    # 4. Action
    act_resp = client.post(f"/api/critical-results/{fu_id}/action", json={
        "action_taken": "Administered heparin bolus and transferred to cardiac cath lab.",
        "actor": "Dr. Ayesha Mukherjee"
    })
    assert act_resp.status_code == 200
    assert act_resp.json()["record"]["status"] == "Follow-up In Progress"

    # 5. Resolve
    resolve_resp = client.post(f"/api/critical-results/{fu_id}/resolve", json={
        "resolution_details": "Coronary angiogram completed with stent placement. Patient stable.",
        "resolved_by": "Dr. Vikram Sethi"
    })
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["record"]["status"] == "Resolved"


def test_change_alerts_workflow():
    # 1. Create a change alert
    create_resp = client.post("/api/change-alerts", json={
        "patient_id": "PT-101",
        "record_type": "VitalSign",
        "field_name": "BloodPressure",
        "old_value": "120/80",
        "new_value": "170/110",
        "author_name": "Nurse Sarah Jenkins, RN",
        "author_role": "nurse",
        "reason": "Sudden acute hypertensive spike noted during routine ward rounds."
    })
    assert create_resp.status_code == 200
    alert_id = create_resp.json()["id"]

    # 2. Fetch unreviewed alerts
    unreviewed = client.get("/api/change-alerts/unreviewed")
    assert unreviewed.status_code == 200
    assert any(a["id"] == alert_id for a in unreviewed.json())

    # 3. Review the alert
    rev_resp = client.post(f"/api/change-alerts/{alert_id}/review?reviewed_by=Dr.%20Ayesha%20Mukherjee")
    assert rev_resp.status_code == 200
    assert rev_resp.json()["is_reviewed"] is True

    # 4. Batch review
    batch_resp = client.post("/api/change-alerts/review-all/PT-101?reviewed_by=Dr.%20Ayesha%20Mukherjee")
    assert batch_resp.status_code == 200
    assert "reviewed_count" in batch_resp.json()


def test_handovers_workflow():
    # 1. Generate intelligent handover summary
    gen_resp = client.get("/api/handovers/generate/PT-101")
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert "clinical_summary" in data
    assert "pending_tasks" in data
    assert "contingency_plans" in data

    # 2. Submit new handover
    handover_resp = client.post("/api/handovers", json={
        "patient_id": "PT-101",
        "ward": "ICU",
        "outgoing_staff_id": "DOC-101",
        "outgoing_staff_name": "Dr. Ayesha Mukherjee",
        "outgoing_role": "doctor",
        "incoming_staff_name": "Nurse Sarah Jenkins, RN",
        "incoming_role": "nurse",
        "clinical_summary": data["clinical_summary"],
        "pending_tasks": "[\"Perform continuous telemetry monitoring\", \"Review repeat troponin at 18:00\"]",
        "critical_concerns": "Elevated troponin trend.",
        "contingency_plans": data["contingency_plans"]
    })
    assert handover_resp.status_code == 200
    h_id = handover_resp.json()["id"]
    assert handover_resp.json()["status"] == "Submitted"

    # 3. Acknowledge handover
    ack_resp = client.post(f"/api/handovers/{h_id}/acknowledge", json={
        "acknowledged_by": "Nurse Sarah Jenkins, RN",
        "notes": "Handover received and verified at bedside."
    })
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "Acknowledged"

    # 4. Query handovers
    list_resp = client.get("/api/handovers?patient_id=PT-101")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1


def test_duplicate_review_and_data_quality():
    # 1. Run data quality audit
    dq_resp = client.get("/api/duplicates/data-quality")
    assert dq_resp.status_code == 200
    dq = dq_resp.json()
    assert "data_quality_score" in dq
    assert "total_records_analyzed" in dq
    assert dq["data_quality_score"] > 0

    # 2. Record duplicate review
    rev_resp = client.post("/api/duplicates/review", json={
        "patient_id_1": "PT-102",
        "patient_id_2": "PT-107",
        "decision": "Requires Further Review",
        "similarity_percentage": 85.0,
        "matched_fields": "Full Name, Year of Birth",
        "notes": "Verified phonetics match; pending biometrics.",
        "reviewed_by": "Records Officer Elena"
    })
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "success"

    # 3. Query duplicate reviews history
    reviews_list = client.get("/api/duplicates/reviews")
    assert reviews_list.status_code == 200
    assert len(reviews_list.json()) >= 1


def test_medical_corrections_workflow():
    # 1. Validation test: missing reason fails with 400
    fail_resp = client.post("/api/corrections", json={
        "patient_id": "PT-101",
        "record_type": "Diagnosis",
        "record_id": "DIAG-1",
        "field_name": "diagnosis",
        "previous_value": "Angina",
        "new_value": "NSTEMI",
        "reason": "",
        "author_name": "Dr. Ayesha",
        "author_role": "doctor"
    })
    assert fail_resp.status_code == 400

    # 2. Doctor submits correction: auto-approved
    doc_corr = client.post("/api/corrections", json={
        "patient_id": "PT-101",
        "record_type": "Diagnosis",
        "record_id": "DIAG-1",
        "field_name": "diagnosis",
        "previous_value": "Atypical Angina Pectoris",
        "new_value": "Acute Coronary Syndrome / NSTEMI",
        "reason": "Elevated serial cardiac biomarkers and persistent chest tightness.",
        "author_name": "Dr. Ayesha Mukherjee",
        "author_role": "doctor"
    })
    assert doc_corr.status_code == 200
    assert doc_corr.json()["approval_status"] == "Approved"
    assert doc_corr.json()["audit_hash"] != ""

    # 3. Nurse submits diagnosis correction: pending approval
    nurse_corr = client.post("/api/corrections", json={
        "patient_id": "PT-101",
        "record_type": "Diagnosis",
        "record_id": "DIAG-2",
        "field_name": "diagnosis",
        "previous_value": "Acute Coronary Syndrome / NSTEMI",
        "new_value": "Cardiogenic Shock",
        "reason": "Observed severe hypotension and cold extremities on floor rounds.",
        "author_name": "Nurse Sarah Jenkins, RN",
        "author_role": "nurse"
    })
    assert nurse_corr.status_code == 200
    corr_id = nurse_corr.json()["id"]
    assert nurse_corr.json()["approval_status"] == "Pending Approval"

    # 4. Doctor approves the pending correction
    approve_resp = client.post(
        f"/api/corrections/{corr_id}/approve?doctor_name=Dr.%20Ayesha%20Mukherjee&doctor_id=DOC-101&decision=Approved"
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["approval_status"] == "Approved"

    # 5. Fetch patient corrections
    p_corr = client.get("/api/corrections/PT-101")
    assert p_corr.status_code == 200
    assert len(p_corr.json()) >= 2


def test_doctor_specific_qr_access():
    # 1. Fetch QR token for PT-101 (Assigned doctor is DOC-102)
    tok_resp = client.get("/api/qr/token/PT-101")
    assert tok_resp.status_code == 200
    qr_token = tok_resp.json()["qr_token"]

    # 2. Assigned doctor DOC-102 verifies access -> Granted
    assigned_doc_resp = client.post("/api/qr/verify-doctor-access", json={
        "qr_token": qr_token,
        "username": "dr_sharma",
        "role": "doctor",
        "doctor_id": "DOC-102"
    })
    assert assigned_doc_resp.status_code == 200
    assert assigned_doc_resp.json()["status"] == "authorized"
    assert assigned_doc_resp.json()["access_type"] == "Primary Attending Physician"

    # 3. Unassigned doctor DOC-103 attempts access without grant -> 403 Forbidden
    unassigned_doc_resp = client.post("/api/qr/verify-doctor-access", json={
        "qr_token": qr_token,
        "username": "dr_adams",
        "role": "doctor",
        "doctor_id": "DOC-103"
    })
    assert unassigned_doc_resp.status_code == 403
    assert "Bedside Access Denied" in unassigned_doc_resp.json()["detail"]

    # 4. Primary doctor DOC-102 grants temporary access to DOC-103
    grant_resp = client.post("/api/qr/grant-temporary-access", json={
        "patient_id": "PT-101",
        "covering_doctor_id": "DOC-103",
        "granted_by_doctor_id": "DOC-102",
        "duration_hours": 8,
        "access_level": "Emergency Covering Care"
    })
    assert grant_resp.status_code == 200
    grant_id = grant_resp.json()["id"]

    # 5. Doctor DOC-103 now retries with active temporary grant -> Granted
    covering_resp = client.post("/api/qr/verify-doctor-access", json={
        "qr_token": qr_token,
        "username": "dr_adams",
        "role": "doctor",
        "doctor_id": "DOC-103"
    })
    assert covering_resp.status_code == 200
    assert covering_resp.json()["status"] == "authorized"
    assert "Temporary Covering Grant" in covering_resp.json()["access_type"]

    # 6. Revoke grant
    revoke_resp = client.post(f"/api/qr/grants/{grant_id}/revoke?revoked_by=Dr.%20Vikram%20Sethi")
    assert revoke_resp.status_code == 200

    # 7. Retrying after revocation -> 403 Forbidden
    post_revoke_resp = client.post("/api/qr/verify-doctor-access", json={
        "qr_token": qr_token,
        "username": "dr_adams",
        "role": "doctor",
        "doctor_id": "DOC-103"
    })
    assert post_revoke_resp.status_code == 403
