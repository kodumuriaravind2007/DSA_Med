"""
Comprehensive Tests for MedTree X System Upgrades:
- Authentication, JWT, and Patient Isolation
- Appointments and Live Check-In
- Medication Administration Records (MAR)
- Post-Operative Recovery Plans & Inpatient Vitals
- Nutrition, Diet Orders & Allergen Interception
- Inventory Movements & Low-Stock Alerts
- Hospital Surge Forecasting Simulation
- Cryptographic QR Identification
- WebSocket Status & Real-Time Hub
"""

import pytest
import time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.database import SessionLocal
from backend.auth import hash_password, verify_password, create_access_token, decode_access_token
from backend.models import Patient, User, Appointment, MARTask, InventoryItem, DietOrder, MealDelivery

client = TestClient(app)


def test_auth_crypto_primitives():
    # 1. Test PBKDF2 password hashing & verification
    plain = "SecureClinicalPassword2026!"
    hashed = hash_password(plain)
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    # 2. Test RFC 7519 JWT generation & verification
    payload = {"sub": "dr_smith", "role": "doctor", "doctor_id": "DOC-101"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "dr_smith"
    assert decoded["role"] == "doctor"
    assert decoded["doctor_id"] == "DOC-101"

    # 3. Tampered token verification fails
    tampered_token = token[:-4] + "xxxx"
    assert decode_access_token(tampered_token) is None


def test_auth_endpoints_and_isolation():
    # 1. Staff Login
    res = client.post("/api/auth/login", json={"username": "dr_smith", "password": "doctor123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "doctor"
    doctor_token = data["access_token"]

    # 2. Patient Login
    res = client.post("/api/auth/login", json={"username": "patient101", "password": "password123"})
    assert res.status_code == 200
    p_data = res.json()
    assert p_data["role"] == "patient"
    assert p_data["patient_id"] == "PT-101"
    patient_token = p_data["access_token"]

    # 3. Patient accessing their own record: SUCCESS
    res = client.get("/api/patients/PT-101", headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 200
    assert res.json()["patient"]["patient_id"] == "PT-101"

    # 4. Patient attempting to access another patient's record (PT-102): 403 FORBIDDEN
    res = client.get("/api/patients/PT-102", headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403
    assert "Access forbidden" in res.json()["detail"]

    # 5. Doctor accessing any patient record: SUCCESS
    res = client.get("/api/patients/PT-102", headers={"Authorization": f"Bearer {doctor_token}"})
    assert res.status_code == 200


def test_patient_portal_self_registration():
    unique_un = f"alex_{int(time.time() * 1000)}"
    reg_payload = {
        "full_name": "Alexander Hayes",
        "username": unique_un,
        "password": "mypassword123",
        "age": 34,
        "gender": "Male",
        "phone": "+91 98999-11223",
        "email": "alex.hayes@example.com",
        "department": "Emergency",
        "reported_concern": "Sudden onset severe right lower abdominal pain"
    }
    res = client.post("/api/auth/patient/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "patient"
    new_pid = data["patient_id"]
    assert new_pid.startswith("PT-")

    # Verify patient can query their newly created profile
    res2 = client.get(f"/api/patients/{new_pid}", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert res2.status_code == 200
    assert res2.json()["patient"]["full_name"] == "Alexander Hayes"


def test_appointment_lifecycle_and_check_in():
    # 1. Create appointment
    apt_payload = {
        "patient_id": "PT-101",
        "doctor_id": "DOC-101",
        "department": "Emergency",
        "scheduled_time": "2026-10-23T15:00:00",
        "reason": "Routine clinical follow-up"
    }
    res = client.post("/api/appointments", json=apt_payload)
    assert res.status_code == 200
    apt_id = res.json()["id"]
    assert apt_id.startswith("APT-")

    # 2. Check-in appointment -> triggers triage queue inclusion
    res_ci = client.post(f"/api/appointments/{apt_id}/check-in")
    assert res_ci.status_code == 200
    assert res_ci.json()["status"] == "success"

    # Verify patient status changed to Waiting
    p_res = client.get("/api/patients/PT-101")
    assert p_res.json()["patient"]["status"] == "Waiting"


def test_mar_administration_and_hold():
    # 1. Fetch MAR tasks for PT-101
    res = client.get("/api/mar/patient/PT-101")
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) > 0
    task_id = tasks[0]["id"]

    # 2. Administer medication
    admin_res = client.post(f"/api/mar/tasks/{task_id}/administer", json={
        "administered_by": "Nurse Sarah Jenkins, RN",
        "notes": "Administered via primary IV line."
    })
    assert admin_res.status_code == 200
    assert admin_res.json()["status"] == "Administered"

    # 3. Hold medication with required rationale
    task_due = next((t for t in tasks if t["status"] in ["Due", "Due Soon", "Delayed"]), None)
    if task_due:
        hold_res = client.post(f"/api/mar/tasks/{task_due['id']}/hold", json={
            "reason": "Patient is experiencing nausea; physician requested 1-hour delay.",
            "action": "Delayed",
            "nurse_name": "Nurse Sarah Jenkins, RN"
        })
        assert hold_res.status_code == 200
        assert hold_res.json()["status"] == "Delayed"
        assert "nausea" in hold_res.json()["hold_reason"]


def test_post_op_care_and_inpatient_vitals():
    # 1. Fetch post-op plan for PT-101
    res = client.get("/api/inpatient/post-op/PT-101")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) > 0
    assert "Coronary" in plans[0]["procedure_name"]

    # 2. Complete post-op task
    task = plans[0]["tasks"][0]
    c_res = client.post(f"/api/inpatient/post-op/tasks/{task['id']}/complete", json={
        "nurse_name": "Nurse Sarah Jenkins, RN",
        "notes": "Recovery telemetry stable; sinus rhythm confirmed."
    })
    assert c_res.status_code == 200
    assert c_res.json()["status"] == "Completed"

    # 3. Record inpatient vitals with pain score
    v_res = client.post("/api/inpatient/vitals?patient_id=PT-101", json={
        "blood_pressure_systolic": 128,
        "blood_pressure_diastolic": 82,
        "heart_rate": 74,
        "temperature_f": 98.6,
        "respiratory_rate": 16,
        "oxygen_saturation_spo2": 99,
        "pain_score": 3
    })
    assert v_res.status_code == 200
    assert v_res.json()["pain_score"] == 3

    # 4. Fetch vital trends
    t_res = client.get("/api/inpatient/vitals/trends/PT-101")
    assert t_res.status_code == 200
    assert t_res.json()["readings_count"] > 0


def test_nutrition_allergen_conflict_detection():
    # 1. Deliver meal that has zero conflicts
    deliveries = client.get("/api/nutrition/deliveries?patient_id=PT-101").json()
    assert len(deliveries) > 0
    sched_delivery = next((d for d in deliveries if d["delivery_status"] == "Scheduled"), None)
    if sched_delivery:
        # Safe meal
        safe_res = client.post(
            f"/api/nutrition/deliveries/{sched_delivery['id']}/verify-and-deliver?meal_items=Steamed%20Oatmeal%20and%20Apples"
        )
        assert safe_res.status_code == 200
        assert safe_res.json()["delivery_status"] == "Delivered"

    # 2. Attempt delivery containing patient's documented allergen (PT-101 is allergic to Peanuts)
    if deliveries:
        first_d = deliveries[0]
        # Simulate allergic item
        allergy_res = client.post(
            f"/api/nutrition/deliveries/{first_d['id']}/verify-and-deliver?meal_items=Granola%20Bar%20with%20Peanuts"
        )
        assert allergy_res.status_code == 200
        assert allergy_res.json()["delivery_status"] == "Conflict Blocked"
        assert allergy_res.json()["allergy_check_passed"] is False
        assert "CONFLICT" in allergy_res.json()["conflict_details"]


def test_inventory_management_and_alerts():
    # 1. List inventory items
    res = client.get("/api/inventory/items")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 10

    # 2. Issue stock to ensure item is low stock
    issue_res = client.post("/api/inventory/transaction", json={
        "item_id": "INV-107",
        "transaction_type": "Issue",
        "quantity": 5,
        "actor": "Lab Technician",
        "notes": "Testing stock issue"
    })
    assert issue_res.status_code in [200, 400]

    # 3. Check alerts endpoint
    alerts_res = client.get("/api/inventory/alerts")
    assert alerts_res.status_code == 200
    alert_data = alerts_res.json()
    assert "low_stock_count" in alert_data
    assert "near_expiry_count" in alert_data

    # 4. Record stock receipt
    rec_res = client.post("/api/inventory/transaction", json={
        "item_id": "INV-101",
        "transaction_type": "Receipt",
        "quantity": 10,
        "actor": "Pharmacy Tech",
        "notes": "Routine replenishment"
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["quantity"] == 10


def test_surge_forecasting_simulation():
    res = client.post("/api/surge/simulate", json={
        "arrival_surge_multiplier": 2.5,
        "doctor_shortage_pct": 30.0,
        "bed_capacity_reduction_pct": 20.0,
        "supply_strain_factor": 1.5
    })
    assert res.status_code == 200
    sim = res.json()
    assert "critical_bottleneck" in sim
    assert "simulated_stats" in sim
    assert sim["simulated_stats"]["doctor_utilization_pct"] > 0
    assert len(sim["recommendations"]) > 0


def test_qr_patient_identification():
    # 1. Generate signed QR token for PT-101
    res = client.get("/api/qr/token/PT-101")
    assert res.status_code == 200
    data = res.json()
    assert data["qr_token"].startswith("MTX-")

    # 2. Verify token bedside
    v_res = client.post("/api/qr/verify", json={"qr_token": data["qr_token"]})
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["status"] == "verified"
    assert v_data["patient_id"] == "PT-101"
    assert "Sara Khan" in v_data["full_name"]

    # 3. Tampered token fails verification
    tampered_token = data["qr_token"][:-5] + "ABCDE"
    bad_res = client.post("/api/qr/verify", json={"qr_token": tampered_token})
    assert bad_res.status_code == 400


def test_websocket_status():
    res = client.get("/api/ws/status")
    assert res.status_code == 200
    assert res.json()["status"] == "online"
