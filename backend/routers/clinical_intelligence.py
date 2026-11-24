"""Clinical Intelligence and Advanced Simulation Router for MedTree X.

Provides endpoints for:
1. NEWS2 continuous clinical deterioration and Rapid Response Team scoring.
2. Pharmacological Drug-Drug and Contraindication Conflict Graph engine.
3. Mass Casualty Incident (MCI) START Protocol Triage & Surge Simulator.
4. Glass-Box Data Structure & Algorithm (DSA) Visualizer for Levenshtein DP and Min-Heap.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from backend.database import get_db
from backend.models import Patient, VitalSign, Medication, Allergy, Visit, Bed, AuditLog
from backend.dsa.news2_engine import NEWS2Engine
from backend.dsa.drug_interaction_graph import DrugInteractionEngine
from backend.dsa.mci_triage import STARTTriageEngine, run_mci_simulation, get_mci_scenarios
from backend.dsa.glass_box_visualizer import compute_levenshtein_dp_matrix, compute_heap_stepthrough
from backend.dsa.accumulating_queue import AccumulatingPriorityQueueEngine
from backend.dsa.bipartite_bed_matcher import BedAllocationEngine
from backend.dsa.deterioration_trajectory import DeteriorationTrajectoryEngine
from backend.dsa.merkle_tree import MerkleTree
from backend.schemas import (
    NEWS2CalculateRequest,
    DrugInteractionCheckRequest,
    MCISimulationRequest,
    HeapStepthroughRequest,
    APQSimulateRequest,
    HungarianBedMatchRequest,
    TrajectoryAnalysisRequest,
    MerkleProofRequest,
    MerkleVerifyRequest,
)

router = APIRouter(prefix="/api/intelligence", tags=["Clinical Intelligence & Algorithms"])


# ============================================================================
# 1. NEWS2 Deterioration & Rapid Response Engine
# ============================================================================

@router.post("/news2/calculate")
def calculate_news2_score(payload: NEWS2CalculateRequest):
    """
    Calculate National Early Warning Score 2 (NEWS2) from raw physiological parameters.
    Returns composite score, single-parameter RED scores, risk tier, and clinical action protocol.
    """
    result = NEWS2Engine.calculate_score(
        respiration_rate=payload.respiration_rate,
        oxygen_saturation=payload.oxygen_saturation,
        supplemental_oxygen=payload.supplemental_oxygen,
        systolic_bp=payload.systolic_bp,
        pulse_rate=payload.pulse_rate,
        consciousness_avpu=payload.consciousness_avpu,
        temperature_f=payload.temperature_f,
        temperature_c=payload.temperature_c,
        spo2_scale=payload.spo2_scale
    )
    return result


@router.get("/news2/patient/{patient_id}")
def get_patient_news2_score(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve latest stored vitals for a patient and compute real-time NEWS2 score.
    If no vitals record exists, computes baseline default.
    """
    patient = (
        db.query(Patient)
        .filter((Patient.patient_id == patient_id) | (Patient.patient_id == f"PT-{patient_id}"))
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    # Fetch latest vitals
    vitals = (
        db.query(VitalSign)
        .filter(VitalSign.patient_id == patient.patient_id)
        .order_by(VitalSign.recorded_at.desc(), VitalSign.id.desc())
        .first()
    )

    if not vitals:
        resp_rate = 16
        spo2 = 98.0
        systolic = 120
        pulse = 72
        temp_c = 36.8
        temp_f = None
        on_o2 = False
        consciousness = "A"
    else:
        resp_rate = vitals.respiratory_rate if vitals.respiratory_rate is not None else 16
        spo2 = float(vitals.oxygen_saturation_spo2) if vitals.oxygen_saturation_spo2 is not None else 98.0
        systolic = vitals.blood_pressure_systolic if vitals.blood_pressure_systolic is not None else 120
        pulse = vitals.heart_rate if vitals.heart_rate is not None else 72
        temp_f = vitals.temperature_f
        temp_c = None
        on_o2 = False
        consciousness = "A"

    result = NEWS2Engine.calculate_score(
        respiration_rate=resp_rate,
        oxygen_saturation=spo2,
        supplemental_oxygen=on_o2,
        systolic_bp=systolic,
        pulse_rate=pulse,
        consciousness_avpu=consciousness,
        temperature_f=temp_f,
        temperature_c=temp_c,
        spo2_scale=1
    )
    result["patient_id"] = patient.patient_id
    result["patient_name"] = patient.full_name
    return result


# ============================================================================
# 2. Pharmacological Drug-Drug & Contraindication Graph Engine
# ============================================================================

@router.post("/drug-interactions/check")
def check_drug_interactions(payload: DrugInteractionCheckRequest):
    """
    Analyze candidate drug against active medications, patient clinical conditions,
    allergy history, and optional active laboratory biomarkers (JAMIA 2024 Alert Fatigue Suppression).
    """
    engine = DrugInteractionEngine()
    result = engine.check_conflicts(
        candidate_drug=payload.candidate_drug,
        active_medications=payload.active_medications,
        known_conditions=payload.known_conditions,
        patient_allergies=payload.patient_allergies,
        biomarkers=payload.biomarkers,
    )
    return result


@router.get("/drug-interactions/patient/{patient_id}/check")
def check_patient_prescribed_drug(
    patient_id: str,
    candidate_drug: str = Query(..., description="The medication to test for safety"),
    db: Session = Depends(get_db)
):
    """
    Check a candidate drug against the patient's existing electronic health record
    (medical conditions, known allergies, active medications, and latest laboratory biomarkers).
    """
    patient = (
        db.query(Patient)
        .filter((Patient.patient_id == patient_id) | (Patient.patient_id == f"PT-{patient_id}"))
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    # Extract conditions from past visits and reported concern
    conditions: List[str] = []
    if patient.reported_concern:
        conditions.append(patient.reported_concern)
    if patient.triage_notes:
        conditions.append(patient.triage_notes)
    for v in patient.visits:
        if v.diagnosis and v.diagnosis not in conditions:
            conditions.append(v.diagnosis)

    # Extract allergies
    allergies: List[str] = [a.allergen for a in patient.allergies if a.allergen]

    # Extract active medications
    active_meds: List[str] = [
        m.name for m in patient.medications if getattr(m, "status", "Active") == "Active" and m.name
    ]

    # Extract patient biomarkers (e.g. Potassium, eGFR) from lab results if available
    biomarkers: Dict[str, float] = {}
    for lo in patient.lab_orders:
        for lr in lo.results:
            param = lr.parameter_name.lower()
            try:
                val = float(lr.result_value)
                if "potassium" in param:
                    biomarkers["potassium"] = val
                elif "egfr" in param or "gfr" in param:
                    biomarkers["egfr"] = val
            except (ValueError, TypeError):
                pass

    engine = DrugInteractionEngine()
    result = engine.check_conflicts(
        candidate_drug=candidate_drug,
        active_medications=active_meds,
        known_conditions=conditions,
        patient_allergies=allergies,
        biomarkers=biomarkers,
    )
    result["patient_id"] = patient.patient_id
    result["patient_name"] = patient.full_name
    return result


# ============================================================================
# 3. Mass Casualty Incident (MCI) START Protocol Triage & Surge Simulator
# ============================================================================

@router.get("/mci/scenarios")
def get_available_mci_scenarios():
    """
    List pre-configured MCI disaster scenarios with casualty profiles for stress-testing.
    """
    return get_mci_scenarios()


@router.post("/mci/simulate")
def simulate_mci(payload: MCISimulationRequest):
    """
    Simulate a Mass Casualty Incident using the Simple Triage and Rapid Treatment (START) algorithm.
    Evaluates victims along the RPM decision tree and computes surge resource demand against available hospital beds.
    """
    result = run_mci_simulation(scenario_key=payload.scenario)
    return result


# ============================================================================
# 4. Glass-Box Data Structure & Algorithm (DSA) Visualizers
# ============================================================================

@router.get("/dsa/levenshtein-matrix")
def visualize_levenshtein_matrix(
    s1: str = Query(..., min_length=1, max_length=50, description="Source string (e.g. query)"),
    s2: str = Query(..., min_length=1, max_length=50, description="Target string (e.g. candidate match)")
):
    """
    Compute full 2D Dynamic Programming Levenshtein distance matrix with backtrace path.
    Enables glass-box inspection of cost transitions and alignment paths.
    """
    result = compute_levenshtein_dp_matrix(s1, s2)
    return result


@router.post("/dsa/heap-stepthrough")
def visualize_heap_stepthrough(payload: HeapStepthroughRequest):
    """
    Compute step-by-step array modifications and parent/child pointer swaps
    as an element is inserted into a min-heap triage priority queue.
    """
    result = compute_heap_stepthrough(
        initial_elements=payload.initial_elements,
        new_val=payload.new_val
    )
    return result


# ============================================================================
# 5. Accumulating Priority Queue (APQ-h) & Starvation Prevention Engine
# ============================================================================

@router.post("/apq/simulate")
def simulate_apq_queue(payload: APQSimulateRequest, db: Session = Depends(get_db)):
    """
    Simulates Accumulating Priority Queue (APQ-h) dynamic priority score drift
    and Left-Without-Being-Seen (LWBS) abandonment risk over time.
    """
    engine = AccumulatingPriorityQueueEngine()
    import time
    now = time.time()

    if payload.patients_override:
        for p in payload.patients_override:
            arrival_offset = p.get("arrival_offset_minutes", 15)
            engine.add_patient(
                patient_id=p.get("patient_id", "P-DEMO"),
                name=p.get("name", "Demo Patient"),
                acuity_level=p.get("acuity_level", 3),
                arrival_timestamp=now - (arrival_offset * 60),
                chief_concern=p.get("chief_concern", "Triage Assessment"),
                custom_alpha=p.get("custom_alpha"),
            )
    else:
        # Load active Waiting patients from database
        waiting_pts = (
            db.query(Patient)
            .filter(Patient.status == "Waiting")
            .order_by(Patient.arrival_time.asc())
            .all()
        )
        if not waiting_pts:
            # Fall back to top registered patients for demonstration
            waiting_pts = db.query(Patient).limit(6).all()

        for pt in waiting_pts:
            engine.add_patient(
                patient_id=pt.patient_id,
                name=pt.full_name,
                acuity_level=pt.priority,
                arrival_timestamp=pt.arrival_time if pt.arrival_time else (now - 1800),
                chief_concern=pt.reported_concern or "Emergency Assessment",
            )

    eval_time = now + (payload.simulated_elapsed_mins * 60)
    current_ranking = engine.get_ranked_queue(eval_time)
    longitudinal_drift = engine.simulate_temporal_drift(
        time_steps_minutes=[0, 15, 30, 45, 60, 90, 120],
        base_time=now
    )

    return {
        "simulation_parameters": {
            "elapsed_minutes": payload.simulated_elapsed_mins,
            "evaluation_time": eval_time,
        },
        "current_ranking": current_ranking,
        "temporal_drift_projections": longitudinal_drift,
    }


@router.get("/apq/patient/{patient_id}/aging")
def get_patient_apq_status(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieves dynamic priority accumulation, current elapsed wait, and LWBS risk for a patient.
    """
    patient = (
        db.query(Patient)
        .filter((Patient.patient_id == patient_id) | (Patient.patient_id == f"PT-{patient_id}"))
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    import time
    now = time.time()
    engine = AccumulatingPriorityQueueEngine()
    engine.add_patient(
        patient_id=patient.patient_id,
        name=patient.full_name,
        acuity_level=patient.priority,
        arrival_timestamp=patient.arrival_time if patient.arrival_time else (now - 1200),
        chief_concern=patient.reported_concern or "Clinical Assessment",
    )

    ranked = engine.get_ranked_queue(now)
    p_info = ranked["queue"][0] if ranked["queue"] else {}
    return p_info


# ============================================================================
# 6. Optimal Bipartite Bed Allocation (Hungarian Algorithm O(V^3))
# ============================================================================

@router.post("/beds/optimal-match")
def optimize_bed_allocation(payload: HungarianBedMatchRequest, db: Session = Depends(get_db)):
    """
    Executes Kuhn-Munkres Hungarian Algorithm to compute globally optimal patient-to-bed matching
    under multi-objective isolation, acuity, and asset conservation constraints.
    """
    if payload.patients_override and payload.beds_override:
        patients_data = payload.patients_override
        beds_data = payload.beds_override
    else:
        # Load from database
        patients_query = (
            db.query(Patient)
            .filter((Patient.assigned_bed_id == None) | (Patient.assigned_bed_id == ""))
            .order_by(Patient.priority.asc(), Patient.arrival_time.asc())
            .limit(10)
            .all()
        )
        beds_query = db.query(Bed).filter(Bed.status == "Available").limit(15).all()

        patients_data = [
            {
                "patient_id": p.patient_id,
                "name": p.full_name,
                "priority": p.priority,
                "condition": p.reported_concern or "Assessment",
                "department": p.department,
                "requires_isolation": "isolation" in (p.triage_notes or "").lower() or "covid" in (p.reported_concern or "").lower(),
                "requires_ventilator": p.priority == 1 and ("arrest" in (p.reported_concern or "").lower() or "trauma" in (p.reported_concern or "").lower()),
            }
            for p in patients_query
        ]

        beds_data = [
            {
                "bed_id": b.bed_id,
                "bed_number": b.bed_id,
                "ward": b.ward,
                "department": getattr(b, "department", "General"),
                "status": b.status,
                "is_isolation": "isolation" in b.ward.lower(),
                "has_ventilator": "icu" in b.ward.lower(),
            }
            for b in beds_query
        ]

        # If database has no free beds or waiting patients, create a representative demonstration cohort
        if not patients_data or not beds_data:
            patients_data = [
                {"patient_id": "P-101", "name": "Elena Rostova", "priority": 1, "condition": "Acute Respiratory Distress (Needs Vent)", "requires_isolation": False, "requires_ventilator": True, "department": "Emergency"},
                {"patient_id": "P-102", "name": "Marcus Vance", "priority": 2, "condition": "Active Tuberculosis (Needs Isolation)", "requires_isolation": True, "requires_ventilator": False, "department": "Infectious Disease"},
                {"patient_id": "P-103", "name": "David Kim", "priority": 2, "condition": "Post-PCI Telemetry Monitoring", "requires_isolation": False, "requires_ventilator": False, "department": "Cardiology"},
                {"patient_id": "P-104", "name": "Sarah Connor", "priority": 3, "condition": "Cellulitis / IV Antibiotics", "requires_isolation": False, "requires_ventilator": False, "department": "General Medicine"},
                {"patient_id": "P-105", "name": "Jordan Lee", "priority": 3, "condition": "Closed Fracture Observation", "requires_isolation": False, "requires_ventilator": False, "department": "Orthopedics"},
            ]
            beds_data = [
                {"bed_id": "BED-ICU-01", "bed_number": "ICU-01", "ward": "Intensive Care Unit (ICU)", "status": "Available", "is_isolation": False, "has_ventilator": True, "department": "Emergency"},
                {"bed_id": "BED-ISO-01", "bed_number": "ISO-01", "ward": "Negative Pressure Isolation", "status": "Available", "is_isolation": True, "has_ventilator": False, "department": "Infectious Disease"},
                {"bed_id": "BED-TEL-01", "bed_number": "TEL-01", "ward": "Cardiac Telemetry Ward", "status": "Available", "is_isolation": False, "has_ventilator": False, "department": "Cardiology"},
                {"bed_id": "BED-GEN-01", "bed_number": "GEN-01", "ward": "General Medical Ward", "status": "Available", "is_isolation": False, "has_ventilator": False, "department": "General Medicine"},
                {"bed_id": "BED-GEN-02", "bed_number": "GEN-02", "ward": "General Medical Ward", "status": "Available", "is_isolation": False, "has_ventilator": False, "department": "Orthopedics"},
            ]

    result = BedAllocationEngine.match_patients_to_beds(patients_data, beds_data)
    return result


# ============================================================================
# 7. Physiological Deterioration Velocity & EWMA Sepsis Drift
# ============================================================================

@router.post("/trajectory/analyze")
def analyze_vitals_trajectory(payload: TrajectoryAnalysisRequest, db: Session = Depends(get_db)):
    """
    Evaluates longitudinal vitals time-series to compute first-derivative score velocity
    (dNEWS2/dt) and EWMA trend trajectories.
    """
    series = payload.vitals_series or []
    if not series and payload.patient_id:
        vitals_records = (
            db.query(VitalSign)
            .filter(
                (VitalSign.patient_id == payload.patient_id)
                | (VitalSign.patient_id == f"PT-{payload.patient_id}")
            )
            .order_by(VitalSign.recorded_at.asc(), VitalSign.id.asc())
            .all()
        )
        series = [
            {
                "recorded_at": v.recorded_at,
                "respiratory_rate": v.respiratory_rate,
                "oxygen_saturation_spo2": v.oxygen_saturation_spo2,
                "blood_pressure_systolic": v.blood_pressure_systolic,
                "heart_rate": v.heart_rate,
                "temperature_f": v.temperature_f,
            }
            for v in vitals_records
        ]

    # If still no series, generate a representative deterioration trajectory
    if not series:
        import time
        t_base = time.time() - 14400  # 4 hours ago
        series = [
            {"recorded_at": t_base, "respiratory_rate": 16, "oxygen_saturation_spo2": 98, "blood_pressure_systolic": 122, "heart_rate": 72, "temperature_c": 37.0},
            {"recorded_at": t_base + 3600, "respiratory_rate": 19, "oxygen_saturation_spo2": 96, "blood_pressure_systolic": 115, "heart_rate": 84, "temperature_c": 37.4},
            {"recorded_at": t_base + 7200, "respiratory_rate": 23, "oxygen_saturation_spo2": 94, "blood_pressure_systolic": 104, "heart_rate": 102, "temperature_c": 38.2},
            {"recorded_at": t_base + 10800, "respiratory_rate": 27, "oxygen_saturation_spo2": 91, "blood_pressure_systolic": 92, "heart_rate": 124, "temperature_c": 38.9},
            {"recorded_at": t_base + 14400, "respiratory_rate": 31, "oxygen_saturation_spo2": 88, "blood_pressure_systolic": 85, "heart_rate": 138, "temperature_c": 39.4},
        ]

    result = DeteriorationTrajectoryEngine.analyze_trajectory(series, ewma_lambda=payload.ewma_lambda)
    return result


@router.get("/trajectory/patient/{patient_id}")
def get_patient_trajectory(patient_id: str, db: Session = Depends(get_db)):
    """
    Fetches stored vitals telemetry for a specific patient and computes trajectory velocity.
    """
    vitals_records = (
        db.query(VitalSign)
        .filter(
            (VitalSign.patient_id == patient_id)
            | (VitalSign.patient_id == f"PT-{patient_id}")
        )
        .order_by(VitalSign.recorded_at.asc(), VitalSign.id.asc())
        .all()
    )
    series = [
        {
            "recorded_at": v.recorded_at,
            "respiratory_rate": v.respiratory_rate,
            "oxygen_saturation_spo2": v.oxygen_saturation_spo2,
            "blood_pressure_systolic": v.blood_pressure_systolic,
            "heart_rate": v.heart_rate,
            "temperature_f": v.temperature_f,
        }
        for v in vitals_records
    ]
    result = DeteriorationTrajectoryEngine.analyze_trajectory(series)
    return result


# ============================================================================
# 8. Binary Merkle Tree Cryptographic Proof of Inclusion (O(log N))
# ============================================================================

@router.post("/merkle/generate-proof")
def generate_merkle_proof(payload: MerkleProofRequest, db: Session = Depends(get_db)):
    """
    Builds binary Merkle tree over audit log records and generates an O(log N)
    cryptographic Proof of Inclusion for the specified record index.
    """
    records = payload.records
    if not records:
        audit_events = db.query(AuditLog).order_by(AuditLog.id.asc()).limit(16).all()
        records = [
            {
                "id": a.id,
                "action": a.action,
                "details": a.details,
                "user_id": a.user_id,
                "timestamp": a.timestamp,
                "entity": getattr(a, "entity", "EHR"),
            }
            for a in audit_events
        ]

    if not records:
        # Fallback synthetic audit events for verification
        records = [
            {"id": "EVT-01", "action": "PATIENT_TRIAGED", "details": "Priority 1 Assigned", "user": "Dr. Sarah", "timestamp": "2026-11-24T10:00:00Z"},
            {"id": "EVT-02", "action": "MEDICATION_ORDERED", "details": "Morphine 4mg IV", "user": "Dr. Smith", "timestamp": "2026-11-24T10:05:00Z"},
            {"id": "EVT-03", "action": "TELEMETRY_LOGGED", "details": "HR 120, SpO2 92%", "user": "Nurse Jenkins", "timestamp": "2026-11-24T10:10:00Z"},
            {"id": "EVT-04", "action": "BLOOD_DRAWN", "details": "Lactate STAT Order", "user": "Lab Tech Cole", "timestamp": "2026-11-24T10:15:00Z"},
            {"id": "EVT-05", "action": "BED_ASSIGNED", "details": "ICU-Bed-02", "user": "Nurse Jenkins", "timestamp": "2026-11-24T10:20:00Z"},
            {"id": "EVT-06", "action": "RAPID_RESPONSE_STAT", "details": "NEWS2 Score 8", "user": "Dr. Smith", "timestamp": "2026-11-24T10:25:00Z"},
            {"id": "EVT-07", "action": "INTUBATION_CONFIRMED", "details": "Airway Secured", "user": "Dr. Sarah", "timestamp": "2026-11-24T10:30:00Z"},
            {"id": "EVT-08", "action": "TRANSFER_ICU", "details": "Handover to ICU Team", "user": "Nurse Jenkins", "timestamp": "2026-11-24T10:35:00Z"},
        ]

    tree = MerkleTree(records)
    target_idx = max(0, min(payload.record_index, len(records) - 1))
    proof = tree.generate_proof_of_inclusion(target_idx)
    
    # Run immediate self-validation
    is_valid, steps = MerkleTree.verify_proof(
        leaf_data=proof["record_data"],
        proof_path=proof["proof_path"],
        expected_root=proof["merkle_root"]
    )

    return {
        "merkle_root": tree.merkle_root,
        "total_leaves": len(records),
        "target_record_index": target_idx,
        "proof_of_inclusion": proof,
        "verification_preview": {
            "is_valid": is_valid,
            "step_count": len(steps),
            "steps": steps,
        },
    }


@router.post("/merkle/verify-proof")
def verify_merkle_proof(payload: MerkleVerifyRequest):
    """
    Executes standalone zero-knowledge cryptographic verification of a Merkle Proof of Inclusion.
    Proves mathematical presence in the root without reading adjacent records.
    """
    is_valid, steps = MerkleTree.verify_proof(
        leaf_data=payload.leaf_data,
        proof_path=payload.proof_path,
        expected_root=payload.expected_root
    )
    return {
        "is_valid": is_valid,
        "expected_root": payload.expected_root,
        "steps": steps,
        "verdict": "VERIFIED_AUTHENTIC" if is_valid else "VERIFICATION_FAILED_TAMPERED",
    }

