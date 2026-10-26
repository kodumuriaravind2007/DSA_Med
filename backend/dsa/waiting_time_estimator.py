"""
Estimated Waiting Time and Hospital Load Forecasting Module.

Algorithm:
- Considers:
  * Queue position and priority weights of patients ahead.
  * Department on-duty physician capacity: C = number of on-duty doctors.
  * Average service duration per priority level:
    - Priority 1 (Critical): 30 minutes
    - Priority 2 (Urgent): 20 minutes
    - Priority 3 (Normal): 12 minutes
- Formula:
  Estimated Wait (minutes) = sum(service_duration_i for all i ahead of patient) / max(1, active_doctors)
- Load Index = (Total Pending Service Minutes) / (Active Doctors * Available Working Hours * 60)
- Clearly labeled as an operational baseline simulation, not a clinical diagnostic prediction.
"""

from typing import List, Dict, Any, Optional


PRIORITY_SERVICE_DURATIONS = {
    1: 30,  # Critical emergency stabilization
    2: 20,  # Urgent consultation
    3: 12,  # Normal outpatient / minor complaint
}


class WaitingTimeEstimator:
    @staticmethod
    def calculate_estimated_wait(
        patient_priority: int,
        patients_ahead: List[Dict[str, Any]],
        active_doctors_count: int = 2
    ) -> Dict[str, Any]:
        """
        Calculates estimated waiting time in minutes for a patient entering or standing in the queue.
        """
        doctors = max(1, active_doctors_count)

        # Sum expected service time of all higher-priority or earlier patients ahead
        total_service_ahead_mins = 0
        p1_ahead = 0
        p2_ahead = 0
        p3_ahead = 0

        for p in patients_ahead:
            prio = p.get("priority", 3)
            duration = PRIORITY_SERVICE_DURATIONS.get(prio, 15)
            total_service_ahead_mins += duration
            if prio == 1:
                p1_ahead += 1
            elif prio == 2:
                p2_ahead += 1
            else:
                p3_ahead += 1

        # Base wait: distributed over active physicians
        estimated_minutes = round(total_service_ahead_mins / doctors)

        # Minimum baseline
        if patient_priority == 1:
            estimated_minutes = min(estimated_minutes, 5)  # Immediate triage
        else:
            estimated_minutes = max(estimated_minutes, 5)

        return {
            "estimated_wait_minutes": estimated_minutes,
            "patients_ahead_count": len(patients_ahead),
            "breakdown_ahead": {
                "critical_p1": p1_ahead,
                "urgent_p2": p2_ahead,
                "normal_p3": p3_ahead,
            },
            "active_doctors": doctors,
            "methodology": "Transparent priority-weighted capacity queuing formula: sum(service_time) / active_physicians.",
            "disclaimer": "Educational / operational estimate only. Actual wait times vary based on clinical emergencies.",
        }

    @staticmethod
    def compute_hospital_load(
        waiting_count: int,
        in_treatment_count: int,
        active_doctors: int,
        occupied_beds: int,
        total_beds: int
    ) -> Dict[str, Any]:
        """Calculates hospital load index and stress category."""
        doctors = max(1, active_doctors)
        beds = max(1, total_beds)

        bed_occupancy_pct = round((occupied_beds / beds) * 100, 1)
        patient_to_doctor_ratio = round((waiting_count + in_treatment_count) / doctors, 1)

        # Load factor score (0 to 100)
        load_score = min(100.0, round((bed_occupancy_pct * 0.5) + (patient_to_doctor_ratio * 5), 1))

        if load_score >= 80:
            status = "High Surge (Alert)"
            color = "red"
        elif load_score >= 50:
            status = "Moderate Load"
            color = "amber"
        else:
            status = "Optimal Capacity"
            color = "green"

        return {
            "load_score": load_score,
            "status": status,
            "color": color,
            "bed_occupancy_pct": bed_occupancy_pct,
            "patient_to_doctor_ratio": patient_to_doctor_ratio,
            "active_doctors": doctors,
            "occupied_beds": occupied_beds,
            "total_beds": beds,
        }
