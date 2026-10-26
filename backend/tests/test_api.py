import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "PriorityMinHeap (Patient Flow Engine)" in data["dsa_features_active"]


def test_command_center():
    res = client.get("/api/analytics/command-center")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert data["kpis"]["total_patients"] > 0
    assert "load_metrics" in data
    assert "priority_distribution" in data


def test_patients_crud():
    # 1. List patients
    list_res = client.get("/api/patients/")
    assert list_res.status_code == 200
    patients = list_res.json()
    assert len(patients) >= 10

    # 2. Get Patient 360
    p360_res = client.get("/api/patients/PT-101")
    assert p360_res.status_code == 200
    p360 = p360_res.json()
    assert p360["patient"]["patient_id"] == "PT-101"
    assert len(p360["vitals"]) > 0
    assert len(p360["timeline"]) > 0

    # 3. Register a new patient
    new_patient_payload = {
        "full_name": "Test Vikram",
        "age": 45,
        "gender": "Male",
        "phone": "+91 99999-11111",
        "email": "vikram.test@gmail.com",
        "govt_id": "AADHAAR-1234-5678",
        "priority": 2,
        "department": "Emergency",
        "reported_concern": "Fractured Arm",
        "initial_vitals": {
            "blood_pressure_systolic": 125,
            "blood_pressure_diastolic": 80,
            "heart_rate": 88,
            "oxygen_saturation_spo2": 98
        }
    }
    reg_res = client.post("/api/patients/", json=new_patient_payload)
    assert reg_res.status_code == 200
    created = reg_res.json()
    assert created["patient_id"].startswith("PT-")
    assert created["full_name"] == "Test Vikram"


def test_live_queue_and_dispatch():
    res = client.get("/api/queue/")
    assert res.status_code == 200
    q = res.json()
    assert "queue" in q
    assert "next_patient" in q
    if q["next_patient"]:
        assert "explanation" in q["next_patient"]


def test_resources_and_graph():
    # Beds
    beds_res = client.get("/api/resources/beds")
    assert beds_res.status_code == 200
    assert len(beds_res.json()) > 0

    # Doctors
    docs_res = client.get("/api/resources/doctors")
    assert docs_res.status_code == 200
    assert len(docs_res.json()) > 0

    # Graph
    graph_res = client.get("/api/resources/graph")
    assert graph_res.status_code == 200
    g = graph_res.json()
    assert "nodes" in g
    assert "edges" in g


def test_audit_verification():
    verify_res = client.get("/api/audit/verify")
    assert verify_res.status_code == 200
    v = verify_res.json()
    assert v["is_valid"] is True
    assert v["verified_blocks"] > 0


def test_duplicate_scan():
    scan_res = client.get("/api/duplicates/scan")
    assert scan_res.status_code == 200
    d = scan_res.json()
    assert d["total_scanned_patients"] > 0
    # Our seed data includes the intentional duplicate pair Rajesh Kumar & Rajesh K. Kumar
    assert d["total_duplicate_candidates_found"] >= 1


def test_fhir_export():
    fhir_res = client.get("/api/export/patient/PT-101/fhir")
    assert fhir_res.status_code == 200
    fhir = fhir_res.json()
    assert fhir["resourceType"] == "Bundle"
    assert len(fhir["entry"]) > 0
    # Verify FHIR Patient resource exists
    first_res = fhir["entry"][0]["resource"]
    assert first_res["resourceType"] == "Patient"


def test_dsa_board_endpoints_removed():
    """Verify that DSA Algorithms Board exclusive endpoints have been completely removed."""
    res = client.get("/api/dsa/bst/live")
    assert res.status_code == 404
