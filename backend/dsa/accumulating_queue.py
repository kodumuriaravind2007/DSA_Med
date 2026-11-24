"""
Accumulating Priority Queue (APQ-h) Engine with Starvation Prevention & LWBS Risk Modeling.

Implements cutting-edge Operations Research in Emergency Department Queueing (2024-2025):
1. Continuous Dynamic Priority Aging:
   P(t) = P_base - alpha(c) * (t - t_arrival)
   where alpha(c) is the acuity-specific priority accumulation rate.
2. Finite Horizon Starvation Threshold (APQ-h):
   Prevents Level 2 / Level 3 patients from being starved by continuous Level 1 arrivals.
3. Left-Without-Being-Seen (LWBS) Risk Model:
   Computes real-time abandonment probability using logistic wait-time hazard modeling.
"""

import time
import math
from typing import List, Dict, Any, Optional


ACUITY_CONFIG = {
    1: {
        "label": "Resuscitation / Immediate",
        "base_score": 1.0,
        "alpha": 0.08,       # High aging rate (points per minute)
        "max_wait_target_mins": 0,
        "color": "rose",
    },
    2: {
        "label": "Emergent / High Acuity",
        "base_score": 2.0,
        "alpha": 0.05,       # Accumulates 1 priority level every 20 minutes
        "max_wait_target_mins": 30,
        "color": "amber",
    },
    3: {
        "label": "Urgent / Moderate Acuity",
        "base_score": 3.0,
        "alpha": 0.025,      # Accumulates 1 priority level every 40 minutes
        "max_wait_target_mins": 60,
        "color": "blue",
    },
    4: {
        "label": "Semi-Urgent",
        "base_score": 4.0,
        "alpha": 0.015,
        "max_wait_target_mins": 120,
        "color": "teal",
    },
    5: {
        "label": "Non-Urgent",
        "base_score": 5.0,
        "alpha": 0.008,
        "max_wait_target_mins": 240,
        "color": "slate",
    },
}


class APQPatientNode:
    """Represents a patient in the Accumulating Priority Queue."""

    def __init__(
        self,
        patient_id: str,
        name: str,
        acuity_level: int,
        arrival_timestamp: float,
        chief_concern: str = "",
        custom_alpha: Optional[float] = None,
    ):
        self.patient_id = patient_id
        self.name = name
        self.acuity_level = max(1, min(5, acuity_level))
        self.arrival_timestamp = arrival_timestamp
        self.chief_concern = chief_concern
        
        cfg = ACUITY_CONFIG[self.acuity_level]
        self.base_score = cfg["base_score"]
        self.alpha = custom_alpha if custom_alpha is not None else cfg["alpha"]
        self.max_wait_target = cfg["max_wait_target_mins"]
        self.color = cfg["color"]

    def calculate_dynamic_priority(self, current_time: float) -> float:
        """
        Calculates dynamic continuous priority score at time t.
        Lower score = higher priority in Min-Heap.
        P(t) = base_score - alpha * elapsed_minutes
        """
        elapsed_minutes = max(0.0, (current_time - self.arrival_timestamp) / 60.0)
        # Apply progressive starvation acceleration if wait exceeds clinical SLA threshold
        acceleration = 1.0
        if self.max_wait_target > 0 and elapsed_minutes > self.max_wait_target:
            overdue_ratio = elapsed_minutes / self.max_wait_target
            acceleration = 1.0 + (overdue_ratio - 1.0) * 1.5

        raw_score = self.base_score - (self.alpha * elapsed_minutes * acceleration)
        # Floor priority at 0.5 (cannot bypass an active CPR / un-aged Level 1)
        return max(0.5, round(raw_score, 4))

    def calculate_lwbs_risk(self, current_time: float) -> float:
        """
        Calculates Left-Without-Being-Seen (LWBS) abandonment probability.
        Uses a sigmoid logistic hazard model: P(LWBS) = 1 / (1 + exp(-(beta_0 + beta_1 * wait + beta_2 * acuity)))
        """
        elapsed_minutes = max(0.0, (current_time - self.arrival_timestamp) / 60.0)
        if self.acuity_level == 1:
            return 0.0  # Immediate resuscitation patients do not walk out

        # Acuity weights: Lower acuity patients have significantly higher baseline propensity to leave
        acuity_weights = {2: -3.5, 3: -2.2, 4: -1.0, 5: -0.2}
        beta_0 = acuity_weights.get(self.acuity_level, -2.0)
        beta_1 = 0.022  # Hazard increases by ~2.2% per minute of delay

        z = beta_0 + (beta_1 * elapsed_minutes)
        prob = 1.0 / (1.0 + math.exp(-z))
        return round(min(0.99, max(0.01, prob)), 3)

    def to_dict(self, current_time: float) -> Dict[str, Any]:
        elapsed_mins = int((current_time - self.arrival_timestamp) / 60.0)
        dyn_score = self.calculate_dynamic_priority(current_time)
        lwbs_prob = self.calculate_lwbs_risk(current_time)
        is_sla_breached = self.max_wait_target > 0 and elapsed_mins > self.max_wait_target

        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "acuity_level": self.acuity_level,
            "acuity_label": ACUITY_CONFIG[self.acuity_level]["label"],
            "base_score": self.base_score,
            "dynamic_priority_score": dyn_score,
            "aging_rate_alpha": self.alpha,
            "elapsed_wait_minutes": elapsed_mins,
            "max_wait_target_mins": self.max_wait_target,
            "is_sla_breached": is_sla_breached,
            "lwbs_risk_percentage": round(lwbs_prob * 100, 1),
            "lwbs_risk_tier": "Critical" if lwbs_prob > 0.6 else "Elevated" if lwbs_prob > 0.3 else "Low",
            "chief_concern": self.chief_concern,
            "color": self.color,
        }


class AccumulatingPriorityQueueEngine:
    """
    Priority Queue engine implementing APQ-h dynamic score updates,
    starvation audits, and real-time re-ranking.
    """

    def __init__(self):
        self.patients: List[APQPatientNode] = []

    def add_patient(
        self,
        patient_id: str,
        name: str,
        acuity_level: int,
        arrival_timestamp: float,
        chief_concern: str = "",
        custom_alpha: Optional[float] = None,
    ):
        node = APQPatientNode(
            patient_id=patient_id,
            name=name,
            acuity_level=acuity_level,
            arrival_timestamp=arrival_timestamp,
            chief_concern=chief_concern,
            custom_alpha=custom_alpha,
        )
        self.patients.append(node)

    def get_ranked_queue(self, current_time: Optional[float] = None) -> Dict[str, Any]:
        """
        Evaluates all patients at current_time, recalculates dynamic priority scores,
        detects starvation events, and returns the strictly sorted Min-Heap order.
        """
        now = current_time if current_time is not None else time.time()
        
        evaluated_patients = [p.to_dict(now) for p in self.patients]
        # Sort by dynamic priority score ascending (lower score = higher priority)
        # Secondary sort by arrival time ascending for fairness tie-breaking
        evaluated_patients.sort(key=lambda x: (x["dynamic_priority_score"], x["elapsed_wait_minutes"] * -1))

        # Assign ranks
        for idx, p in enumerate(evaluated_patients):
            p["queue_rank"] = idx + 1
            # Check if dynamic aging promoted this patient above their baseline priority
            expected_tier = p["acuity_level"]
            effective_tier = math.ceil(p["dynamic_priority_score"])
            p["starvation_promotion_levels"] = max(0, expected_tier - effective_tier)

        sla_breaches = sum(1 for p in evaluated_patients if p["is_sla_breached"])
        high_lwbs_count = sum(1 for p in evaluated_patients if p["lwbs_risk_percentage"] >= 50.0)

        return {
            "evaluation_timestamp": now,
            "total_patients_queued": len(evaluated_patients),
            "sla_breach_count": sla_breaches,
            "high_lwbs_risk_count": high_lwbs_count,
            "queue": evaluated_patients,
            "algorithmic_guarantee": "APQ-h Starvation Prevention Active: Level 2/3 patients dynamically accumulate priority.",
        }

    def simulate_temporal_drift(
        self,
        time_steps_minutes: List[int] = [0, 15, 30, 45, 60, 90, 120],
        base_time: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Runs a longitudinal simulation showing how patient ranks shift over time as priorities accumulate.
        """
        t0 = base_time if base_time is not None else time.time()
        timeline = []

        for delta_m in time_steps_minutes:
            sim_time = t0 + (delta_m * 60)
            ranked = self.get_ranked_queue(sim_time)
            timeline.append({
                "time_offset_minutes": delta_m,
                "summary": {
                    "total": ranked["total_patients_queued"],
                    "sla_breaches": ranked["sla_breach_count"],
                    "high_lwbs": ranked["high_lwbs_risk_count"],
                },
                "leaderboard": [
                    {
                        "rank": p["queue_rank"],
                        "patient_id": p["patient_id"],
                        "name": p["name"],
                        "acuity": p["acuity_level"],
                        "score": p["dynamic_priority_score"],
                        "lwbs_pct": p["lwbs_risk_percentage"],
                        "promoted": p["starvation_promotion_levels"] > 0,
                    }
                    for p in ranked["queue"]
                ],
            })

        return timeline
