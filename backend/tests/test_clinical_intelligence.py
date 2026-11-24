"""
Unit and Integration Tests for MedTree X Clinical Intelligence & Differentiator Engines:
- NEWS2 Deterioration & Rapid Response Scoring
- Pharmacological Drug-Drug and Contraindication Conflict Graph
- Mass Casualty Incident (MCI) START Triage & Surge Simulator
- Glass-Box DSA Step-Through Visualizers (Levenshtein Matrix & Heap Sift)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_news2_calculation_normal_patient():
    """Verify normal baseline vitals produce score of 0 and Normal risk."""
    payload = {
        "respiration_rate": 16,
        "oxygen_saturation": 98.0,
        "supplemental_oxygen": False,
        "systolic_bp": 120,
        "pulse_rate": 72,
        "consciousness_avpu": "A",
        "temperature_c": 37.0,
        "spo2_scale": 1
    }
    response = client.post("/api/intelligence/news2/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] == 0
    assert data["risk_level"] == "Normal"
    assert data["urgency"] == "STABLE"
    assert data["has_red_score"] is False
    assert "12 hourly" in data["monitoring_frequency"]


def test_news2_calculation_red_score_and_high_risk():
    """Verify severe respiration derangement triggers RED score and High Risk protocol."""
    payload = {
        "respiration_rate": 28,          # Score 3 (RED score)
        "oxygen_saturation": 91.0,       # Score 2
        "supplemental_oxygen": True,     # Score 2
        "systolic_bp": 88,               # Score 3 (RED score)
        "pulse_rate": 135,               # Score 3 (RED score)
        "consciousness_avpu": "V",       # Score 3 (RED score)
        "temperature_c": 39.5,           # Score 2
        "spo2_scale": 1
    }
    response = client.post("/api/intelligence/news2/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] >= 7
    assert data["risk_level"] == "High"
    assert data["urgency"] == "EMERGENCY_RAPID_RESPONSE"
    assert data["has_red_score"] is True
    assert data["suggested_heap_priority"] == 1
    assert "EMERGENCY" in data["clinical_response"]


def test_news2_patient_endpoint():
    """Test retrieving patient NEWS2 score from database vitals."""
    response = client.get("/api/intelligence/news2/patient/PT-101")
    assert response.status_code == 200
    data = response.json()
    assert "total_score" in data
    assert "risk_level" in data
    assert "clinical_response" in data


def test_drug_interaction_check_severe_ddi():
    """Test conflict detection between Warfarin and Aspirin."""
    payload = {
        "candidate_drug": "Aspirin",
        "active_medications": ["Warfarin Sodium", "Atorvastatin"],
        "known_conditions": ["Atrial Fibrillation"],
        "patient_allergies": []
    }
    response = client.post("/api/intelligence/drug-interactions/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_prescribing_safe"] is False
    assert data["conflict_count"] >= 1
    assert data["safety_status"] in ["CRITICAL_BLOCKED", "WARNING_REQUIRES_OVERRIDE"]
    # Check conflict graph
    assert len(data["graph_visualization"]["nodes"]) >= 2
    assert len(data["graph_visualization"]["edges"]) >= 1


def test_drug_interaction_check_contraindication():
    """Test condition contraindication: Metformin in Chronic Kidney Disease."""
    payload = {
        "candidate_drug": "Metformin",
        "active_medications": ["Lisinopril"],
        "known_conditions": ["Chronic Kidney Disease (CKD)", "Type 2 Diabetes"],
        "patient_allergies": []
    }
    response = client.post("/api/intelligence/drug-interactions/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_prescribing_safe"] is False
    assert data["conflict_count"] >= 1


def test_drug_interaction_check_allergy_cross_reactivity():
    """Test allergy cross-reactivity: Amoxicillin with Penicillin allergy."""
    payload = {
        "candidate_drug": "Amoxicillin",
        "active_medications": [],
        "known_conditions": ["Bacterial Pneumonia"],
        "patient_allergies": ["Penicillin"]
    }
    response = client.post("/api/intelligence/drug-interactions/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_prescribing_safe"] is False
    assert data["conflict_count"] >= 1


def test_drug_interaction_check_safe_drug():
    """Test that safe benign prescription passes with is_prescribing_safe=True."""
    payload = {
        "candidate_drug": "Paracetamol",
        "active_medications": ["Atorvastatin"],
        "known_conditions": ["Hyperlipidemia"],
        "patient_allergies": []
    }
    response = client.post("/api/intelligence/drug-interactions/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_prescribing_safe"] is True
    assert data["conflict_count"] == 0
    assert data["safety_status"] == "CLEARED"


def test_patient_drug_interaction_check_endpoint():
    """Test checking a candidate drug against patient PT-101's clinical chart."""
    response = client.get("/api/intelligence/drug-interactions/patient/PT-101/check?candidate_drug=Aspirin")
    assert response.status_code == 200
    data = response.json()
    assert "safety_status" in data
    assert "graph_visualization" in data


def test_mci_scenarios_and_simulation():
    """Test retrieving pre-configured scenarios and running START triage simulation."""
    # 1. Fetch scenarios
    scenarios_resp = client.get("/api/intelligence/mci/scenarios")
    assert scenarios_resp.status_code == 200
    scenarios = scenarios_resp.json()
    assert len(scenarios) >= 3
    first_scenario = scenarios[0]

    # 2. Run simulation with first scenario
    sim_payload = {
        "scenario": first_scenario["key"]
    }
    sim_resp = client.post("/api/intelligence/mci/simulate", json=sim_payload)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["total_victims"] > 0
    assert "Red" in sim_data["category_counts"]
    assert "Yellow" in sim_data["category_counts"]
    assert "Green" in sim_data["category_counts"]
    assert "Black" in sim_data["category_counts"]
    assert "surge_analysis" in sim_data
    assert len(sim_data["victims"]) > 0


def test_levenshtein_matrix_endpoint():
    """Test glass-box Levenshtein DP matrix computation."""
    response = client.get("/api/intelligence/dsa/levenshtein-matrix?s1=PATIENT&s2=POTIENT")
    assert response.status_code == 200
    data = response.json()
    assert data["string_1"] == "patient"
    assert data["string_2"] == "potient"
    assert data["distance"] == 1
    assert data["similarity_ratio"] > 0.8
    assert len(data["rows"]) == len("PATIENT") + 1
    assert len(data["columns"]) == len("POTIENT") + 1
    assert len(data["traceback_path"]) > 0


def test_heap_stepthrough_endpoint():
    """Test glass-box Min-Heap sift-up stepthrough trace."""
    payload = {
        "initial_elements": [10, 20, 15, 30, 40],
        "new_val": 5
    }
    response = client.post("/api/intelligence/dsa/heap-stepthrough", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["steps"]) >= 2
    assert data["final_heap_array"][0] == 5  # New minimum should have sifted up to root
    first_step = data["steps"][0]
    assert "action" in first_step
    assert "explanation" in first_step
