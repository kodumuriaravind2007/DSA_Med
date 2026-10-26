"""
Hospital Surge Forecasting & Bottleneck Simulation Router for MedTree X.
Simulates parametric crisis scenarios (mass casualties, epidemic waves, staff strikes, supply disruptions)
using queueing models and resource capacity equations.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List

from ..database import get_db
from ..models import Patient, Doctor, Bed, InventoryItem
from ..schemas import SurgeSimulationRequest, SurgeSimulationResponse

router = APIRouter(prefix="/api/surge", tags=["Surge & Capacity Forecasting"])


@router.post("/simulate", response_model=SurgeSimulationResponse)
def simulate_hospital_surge(req: SurgeSimulationRequest, db: Session = Depends(get_db)):
    """
    Parametric hospital surge simulation:
    Evaluates queuing delays, resource exhaustion horizons, and bottlenecks under crisis conditions.
    """
    # 1. Gather baseline reality from live database
    total_patients = db.query(Patient).count()
    waiting_patients = db.query(Patient).filter(Patient.status == "Waiting").count()
    critical_waiting = db.query(Patient).filter(Patient.status == "Waiting", Patient.priority == 1).count()
    urgent_waiting = db.query(Patient).filter(Patient.status == "Waiting", Patient.priority == 2).count()
    normal_waiting = db.query(Patient).filter(Patient.status == "Waiting", Patient.priority == 3).count()

    total_doctors = db.query(Doctor).count()
    on_duty_doctors = db.query(Doctor).filter(Doctor.duty_status == "On Duty").count() or 1
    total_beds = db.query(Bed).count() or 1
    occupied_beds = db.query(Bed).filter(Bed.status == "Occupied").count()
    available_beds = db.query(Bed).filter(Bed.status == "Available").count()

    # Baseline operational constants
    baseline_arrival_rate_per_hr = 8.0  # patients/hr
    avg_consult_duration_mins = 20.0
    baseline_avg_wait_mins = 25.0

    # 2. Compute simulated crisis parameters
    sim_arrival_rate = baseline_arrival_rate_per_hr * req.arrival_surge_multiplier
    effective_doctors = max(1.0, on_duty_doctors * (1.0 - req.doctor_shortage_pct / 100.0))
    effective_total_beds = max(1, int(total_beds * (1.0 - req.bed_capacity_reduction_pct / 100.0)))
    effective_avail_beds = max(0, effective_total_beds - occupied_beds)

    # Doctor service capacity in patients per hour
    physician_capacity_per_hr = effective_doctors * (60.0 / avg_consult_duration_mins)
    doctor_utilization_pct = min(100.0, round((sim_arrival_rate / physician_capacity_per_hr) * 100.0, 1))

    # Queue delay estimation based on arrival rate and doctor availability
    utilization_ratio = sim_arrival_rate / max(1.0, physician_capacity_per_hr)
    stress_multiplier = max(1.0, utilization_ratio ** 1.8)

    sim_wait_critical = round(max(3.0, 5.0 * (req.arrival_surge_multiplier ** 0.5)), 1)
    sim_wait_urgent = round(max(15.0, 20.0 * stress_multiplier), 1)
    sim_wait_normal = round(max(30.0, 45.0 * stress_multiplier * (1.0 + req.doctor_shortage_pct / 50.0)), 1)

    # Bed saturation forecast
    net_admissions_per_hr = sim_arrival_rate * 0.35  # ~35% of hospital arrivals require inpatient admission
    hours_to_bed_saturation = (
        round(effective_avail_beds / net_admissions_per_hr, 1) if net_admissions_per_hr > 0 and effective_avail_beds > 0 else 0.0
    )

    # Projected queue counts over 4-hour surge
    sim_waiting_critical = critical_waiting + int(sim_arrival_rate * 4 * 0.15)
    sim_waiting_urgent = urgent_waiting + int(sim_arrival_rate * 4 * 0.35 * stress_multiplier)
    sim_waiting_normal = normal_waiting + int(sim_arrival_rate * 4 * 0.50 * stress_multiplier * 1.5)

    # Department breakdown
    departments = [
        {
            "name": "Emergency Department",
            "baseline_load_pct": 65,
            "simulated_load_pct": min(100, int(65 * req.arrival_surge_multiplier)),
            "status": "Critical Saturation" if req.arrival_surge_multiplier >= 1.8 else "Elevated Load"
        },
        {
            "name": "Intensive Care Unit (ICU)",
            "baseline_load_pct": 75,
            "simulated_load_pct": min(100, int(75 * (1.0 + (req.arrival_surge_multiplier - 1.0) * 0.6))),
            "status": "Capacity Deficit" if hours_to_bed_saturation < 3.0 else "Managing"
        },
        {
            "name": "Cardiology Ward",
            "baseline_load_pct": 50,
            "simulated_load_pct": min(100, int(50 * (1.0 + (req.arrival_surge_multiplier - 1.0) * 0.5))),
            "status": "Heavy Flow" if req.arrival_surge_multiplier > 1.5 else "Normal"
        },
        {
            "name": "General Surgery",
            "baseline_load_pct": 40,
            "simulated_load_pct": min(100, int(40 * (1.0 + (req.arrival_surge_multiplier - 1.0) * 0.4))),
            "status": "Normal Operating"
        }
    ]

    # Identify primary critical bottleneck
    if hours_to_bed_saturation <= 2.5:
        critical_bottleneck = f"Inpatient Bed Exhaustion: Zero beds available within {hours_to_bed_saturation} hours."
    elif doctor_utilization_pct >= 95.0:
        critical_bottleneck = f"Physician Exhaustion Deficit: On-duty clinicians operating at {doctor_utilization_pct}% capacity limit."
    elif sim_wait_normal > 120.0:
        critical_bottleneck = f"Triage Wait Escalation: Priority 3 wait times exceed 2 hours ({sim_wait_normal} mins)."
    else:
        critical_bottleneck = "Emergency Department Triage Inflow Bottleneck."

    # Actionable operational recommendations
    recommendations = []
    if doctor_utilization_pct > 80.0:
        recommendations.append("Activate On-Call Physician Secondary Roster to augment Emergency triage capacity.")
    if hours_to_bed_saturation < 5.0:
        recommendations.append("Fast-track medically stable step-down patient discharges to free Inpatient/ICU beds.")
    if req.supply_strain_factor > 1.2:
        recommendations.append("Enact conserved supply dispensation protocol for IV fluids and sterile consumables.")
    if sim_wait_normal > 90.0:
        recommendations.append("Redirect non-critical Priority 3 walk-ins to Outpatient Urgent Care annex.")
    if not recommendations:
        recommendations.append("Maintain baseline observation; all hospital operational buffers remain within safe parameters.")

    return SurgeSimulationResponse(
        scenario_params={
            "arrival_surge_multiplier": req.arrival_surge_multiplier,
            "doctor_shortage_pct": req.doctor_shortage_pct,
            "bed_capacity_reduction_pct": req.bed_capacity_reduction_pct,
            "supply_strain_factor": req.supply_strain_factor,
        },
        baseline_stats={
            "arrival_rate_per_hr": baseline_arrival_rate_per_hr,
            "on_duty_doctors": on_duty_doctors,
            "available_beds": available_beds,
            "total_beds": total_beds,
            "avg_wait_minutes": baseline_avg_wait_mins,
            "waiting_count": waiting_patients,
        },
        simulated_stats={
            "simulated_arrival_rate_per_hr": round(sim_arrival_rate, 1),
            "effective_doctors": round(effective_doctors, 1),
            "effective_available_beds": effective_avail_beds,
            "doctor_utilization_pct": doctor_utilization_pct,
            "hours_to_bed_saturation": hours_to_bed_saturation,
            "wait_time_critical_mins": sim_wait_critical,
            "wait_time_urgent_mins": sim_wait_urgent,
            "wait_time_normal_mins": sim_wait_normal,
            "projected_total_waiting": sim_waiting_critical + sim_waiting_urgent + sim_waiting_normal,
        },
        department_load=departments,
        projected_queue=[
            {"tier": "Priority 1 - Critical", "baseline_count": critical_waiting, "surge_count": sim_waiting_critical, "avg_wait_mins": sim_wait_critical},
            {"tier": "Priority 2 - Urgent", "baseline_count": urgent_waiting, "surge_count": sim_waiting_urgent, "avg_wait_mins": sim_wait_urgent},
            {"tier": "Priority 3 - Normal", "baseline_count": normal_waiting, "surge_count": sim_waiting_normal, "avg_wait_mins": sim_wait_normal},
        ],
        critical_bottleneck=critical_bottleneck,
        recommendations=recommendations
    )
