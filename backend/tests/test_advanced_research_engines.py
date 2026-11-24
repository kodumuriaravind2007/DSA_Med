"""
Unit and Integration Tests for Advanced Research Engines (2024-2026 Literature):
- Accumulating Priority Queue (APQ-h) & LWBS Hazard Modeling
- Kuhn-Munkres Hungarian Bipartite Bed Matching Algorithm
- Deterioration Velocity d(NEWS2)/dt & EWMA Sepsis Trajectory
- Binary Merkle Tree O(log N) Cryptographic Proof of Inclusion
- Contextual Biomarker-Conditioned Alert Fatigue Suppression
"""

import pytest
import time
from fastapi.testclient import TestClient
from backend.main import app
from backend.dsa.accumulating_queue import AccumulatingPriorityQueueEngine
from backend.dsa.bipartite_bed_matcher import HungarianAlgorithm, BedAllocationEngine
from backend.dsa.deterioration_trajectory import DeteriorationTrajectoryEngine
from backend.dsa.merkle_tree import MerkleTree
from backend.dsa.drug_interaction_graph import DrugInteractionEngine

client = TestClient(app)


def test_apq_dynamic_aging_and_starvation_prevention():
    """Verify that lower-acuity patients dynamically accumulate priority over time."""
    engine = AccumulatingPriorityQueueEngine()
    t0 = 1000000.0

    # Patient 1: Level 1 (immediate), arrived at t0 + 60 mins
    engine.add_patient("P-1", "CPR Patient", 1, t0 + 3600)
    # Patient 2: Level 2 (emergent), arrived at t0 (waiting 60 mins)
    engine.add_patient("P-2", "Asthma Patient", 2, t0)
    # Patient 3: Level 3 (urgent), arrived at t0 - 120 mins (waiting 180 mins)
    engine.add_patient("P-3", "Laceration Patient", 3, t0 - 7200)

    # Evaluate at t0 + 60 mins (3600s)
    eval_time = t0 + 3600
    ranked = engine.get_ranked_queue(eval_time)
    queue = ranked["queue"]
    assert len(queue) == 3

    # Patient 3 has waited 180 minutes: SLA breached (target is 60m), so priority accumulated significantly
    p3 = next(p for p in queue if p["patient_id"] == "P-3")
    assert p3["is_sla_breached"] is True
    assert p3["dynamic_priority_score"] < 3.0  # Priority aged down (more urgent)
    assert p3["lwbs_risk_percentage"] > 20.0   # Long wait drives up walkout risk

    # Test API endpoint
    res = client.post("/api/intelligence/apq/simulate", json={"simulated_elapsed_mins": 60})
    assert res.status_code == 200
    data = res.json()
    assert "current_ranking" in data
    assert "temporal_drift_projections" in data
    assert len(data["temporal_drift_projections"]) > 0


def test_hungarian_bipartite_bed_matching_algorithm():
    """Verify Hungarian algorithm finds optimal matching respecting ventilator & isolation constraints."""
    patients = [
        {"patient_id": "P-1", "name": "Critically Ill", "priority": 1, "requires_ventilator": True, "requires_isolation": False},
        {"patient_id": "P-2", "name": "Infectious TB", "priority": 2, "requires_ventilator": False, "requires_isolation": True},
        {"patient_id": "P-3", "name": "Stable Ward", "priority": 3, "requires_ventilator": False, "requires_isolation": False},
    ]
    beds = [
        {"bed_id": "B-GEN", "ward": "General Medical", "status": "Available", "has_ventilator": False, "is_isolation": False},
        {"bed_id": "B-ICU", "ward": "ICU", "status": "Available", "has_ventilator": True, "is_isolation": False},
        {"bed_id": "B-ISO", "ward": "Isolation", "status": "Available", "has_ventilator": False, "is_isolation": True},
    ]

    result = BedAllocationEngine.match_patients_to_beds(patients, beds)
    assert result["matched_count"] == 3
    assert result["unassigned_patient_count"] == 0

    assignments = {a["patient_id"]: a["bed_id"] for a in result["assignments"]}
    # P-1 (needs vent) must get B-ICU
    assert assignments["P-1"] == "B-ICU"
    # P-2 (needs isolation) must get B-ISO
    assert assignments["P-2"] == "B-ISO"
    # P-3 gets B-GEN
    assert assignments["P-3"] == "B-GEN"

    # Test API endpoint
    res = client.post("/api/intelligence/beds/optimal-match", json={
        "patients_override": patients,
        "beds_override": beds
    })
    assert res.status_code == 200
    data = res.json()
    assert data["matched_count"] == 3
    assert "bipartite_graph" in data


def test_deterioration_velocity_and_ewma():
    """Verify first-derivative velocity and EWMA trajectory detection."""
    t0 = 1000000.0
    series = [
        {"recorded_at": t0, "respiratory_rate": 16, "oxygen_saturation": 98, "systolic_bp": 120, "pulse_rate": 72, "temperature_c": 37.0},
        {"recorded_at": t0 + 3600, "respiratory_rate": 20, "oxygen_saturation": 96, "systolic_bp": 110, "pulse_rate": 88, "temperature_c": 37.5},
        {"recorded_at": t0 + 7200, "respiratory_rate": 28, "oxygen_saturation": 90, "systolic_bp": 92, "pulse_rate": 128, "temperature_c": 39.2},
    ]

    result = DeteriorationTrajectoryEngine.analyze_trajectory(series)
    assert result["datapoints_analyzed"] == 3
    assert result["score_velocity_per_hour"] > 1.0
    assert result["acceleration_alert"] is True
    assert result["trajectory_status"] in ["ACUTE_ACCELERATING_CRISIS", "ESTABLISHED_HIGH_RISK"]

    # Test API endpoint
    res = client.post("/api/intelligence/trajectory/analyze", json={"vitals_series": series})
    assert res.status_code == 200
    data = res.json()
    assert "score_velocity_per_hour" in data
    assert "ewma_smoothed_score" in data
    assert len(data["timeline"]) == 3


def test_merkle_tree_proof_of_inclusion_and_tampering():
    """Verify O(log N) Merkle Proof of Inclusion and tamper rejection."""
    records = [
        {"id": f"REC-{i}", "event": f"Action {i}", "data": f"Val-{i*10}"}
        for i in range(8)
    ]

    tree = MerkleTree(records)
    assert len(tree.merkle_root) == 64  # SHA-256 hex string

    # Generate proof for record 3
    proof = tree.generate_proof_of_inclusion(3)
    assert proof["proof_length"] == 3  # log2(8) = 3
    assert proof["merkle_root"] == tree.merkle_root

    # Verify original proof matches
    is_valid, steps = MerkleTree.verify_proof(
        leaf_data=proof["record_data"],
        proof_path=proof["proof_path"],
        expected_root=proof["merkle_root"]
    )
    assert is_valid is True
    assert len(steps) == 5  # 1 leaf + 3 siblings + 1 root comparison

    # Test Tampering: If 1 character in the record data is altered, proof must fail!
    tampered_data = dict(proof["record_data"])
    tampered_data["data"] = "TAMPERED_VAL"
    is_tampered_valid, _ = MerkleTree.verify_proof(
        leaf_data=tampered_data,
        proof_path=proof["proof_path"],
        expected_root=proof["merkle_root"]
    )
    assert is_tampered_valid is False

    # Test API endpoints
    gen_res = client.post("/api/intelligence/merkle/generate-proof", json={"record_index": 2, "records": records})
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["verification_preview"]["is_valid"] is True

    verify_res = client.post("/api/intelligence/merkle/verify-proof", json={
        "leaf_data": gen_data["proof_of_inclusion"]["record_data"],
        "proof_path": gen_data["proof_of_inclusion"]["proof_path"],
        "expected_root": gen_data["merkle_root"]
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["verdict"] == "VERIFIED_AUTHENTIC"


def test_biomarker_alert_fatigue_suppression():
    """Verify that normal laboratory biomarkers contextually suppress CDS alert noise (JAMIA 2024)."""
    engine = DrugInteractionEngine()

    # Case 1: Spironolactone + Lisinopril with normal potassium (3.9 mEq/L)
    res_normal = engine.check_conflicts(
        candidate_drug="Spironolactone",
        active_medications=["Lisinopril"],
        biomarkers={"potassium": 3.9}
    )
    assert res_normal["alert_fatigue_stats"]["contextually_suppressed"] >= 1
    assert any("Serum Potassium is normal" in s["suppression_reason"] for s in res_normal["suppressed_conflicts"])

    # Case 2: Same drugs but potassium is critically elevated (5.4 mEq/L) -> Hard stop!
    res_high = engine.check_conflicts(
        candidate_drug="Spironolactone",
        active_medications=["Lisinopril"],
        biomarkers={"potassium": 5.4}
    )
    assert res_high["safety_status"] == "CRITICAL_BLOCKED"
    assert any("CRITICAL HYPERKALEMIA" in c["mechanism"] for c in res_high["conflicts"])
