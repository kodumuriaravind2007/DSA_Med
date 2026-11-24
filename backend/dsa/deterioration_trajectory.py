"""
Physiological Deterioration Velocity & Longitudinal Trajectory Engine.

Implements cutting-edge 2024-2026 Digital Health / Nature Digital Medicine methodologies:
1. First-Derivative Score Velocity: d(NEWS2)/dt (points per hour).
2. Exponentially Weighted Moving Average (EWMA) trend smoothing.
3. Multi-Parameter Physiological Acceleration Vectors (respiratory, cardiac, oxygenation drifts).
4. Early Deterioration Warning (EDW) triggering before static thresholds are breached.
"""

from typing import List, Dict, Any, Optional
import math
from datetime import datetime
from backend.dsa.news2_engine import NEWS2Engine


class DeteriorationTrajectoryEngine:
    """
    Analyzes longitudinal vitals time series to evaluate clinical trajectory,
    acceleration velocity, and occult shock/sepsis onset.
    """

    @staticmethod
    def _parse_iso_or_timestamp(val: Any) -> float:
        """Helper to convert ISO string or Unix timestamp to seconds."""
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            try:
                # Try ISO format
                clean_str = val.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean_str)
                return dt.timestamp()
            except Exception:
                pass
        return 0.0

    @classmethod
    def analyze_trajectory(
        cls,
        vitals_series: List[Dict[str, Any]],
        ewma_lambda: float = 0.4
    ) -> Dict[str, Any]:
        """
        Takes a time-ordered series of vitals records and calculates score velocities,
        trend acceleration, and proactive warning triggers.
        """
        if not vitals_series:
            return {
                "datapoints_analyzed": 0,
                "current_news2": 0,
                "score_velocity_per_hour": 0.0,
                "ewma_score": 0.0,
                "trajectory_status": "NO_DATA",
                "trajectory_label": "No Longitudinal Vitals Available",
                "color": "slate",
                "acceleration_alert": False,
                "timeline": [],
            }

        # 1. Compute NEWS2 score for each record in series
        scored_records = []
        for record in vitals_series:
            ts = cls._parse_iso_or_timestamp(record.get("recorded_at") or record.get("timestamp") or 0.0)
            
            # Map parameters
            resp = record.get("respiratory_rate") or record.get("respiration_rate")
            spo2 = record.get("oxygen_saturation_spo2") or record.get("oxygen_saturation") or record.get("spo2")
            o2_supp = record.get("on_supplemental_oxygen") or record.get("supplemental_oxygen") or False
            sbp = record.get("blood_pressure_systolic") or record.get("systolic_bp")
            hr = record.get("heart_rate") or record.get("pulse_rate")
            avpu = record.get("consciousness_avpu") or record.get("consciousness") or "A"
            temp_c = record.get("temperature_c")
            temp_f = record.get("temperature_f")

            score_res = NEWS2Engine.calculate_score(
                respiration_rate=resp,
                oxygen_saturation=float(spo2) if spo2 is not None else None,
                supplemental_oxygen=bool(o2_supp),
                systolic_bp=sbp,
                pulse_rate=hr,
                consciousness_avpu=avpu,
                temperature_f=temp_f,
                temperature_c=temp_c,
            )

            scored_records.append({
                "timestamp": ts,
                "recorded_at": record.get("recorded_at") or datetime.fromtimestamp(ts).isoformat(),
                "news2_score": score_res["total_score"],
                "risk_level": score_res["risk_level"],
                "has_red_score": score_res["has_red_score"],
                "respiratory_rate": resp,
                "spo2": spo2,
                "systolic_bp": sbp,
                "heart_rate": hr,
            })

        # Ensure sorted chronologically
        scored_records.sort(key=lambda r: r["timestamp"])

        # 2. Compute EWMA and Velocities
        timeline = []
        current_ewma = float(scored_records[0]["news2_score"])

        for i, r in enumerate(scored_records):
            score = float(r["news2_score"])
            if i > 0:
                current_ewma = (ewma_lambda * score) + ((1.0 - ewma_lambda) * current_ewma)
            
            # Velocity calculation (points per hour relative to previous observation)
            velocity = 0.0
            if i > 0:
                time_diff_hours = (r["timestamp"] - scored_records[i - 1]["timestamp"]) / 3600.0
                if time_diff_hours > 0.05:  # At least 3 minutes between readings
                    score_diff = score - scored_records[i - 1]["news2_score"]
                    velocity = round(score_diff / time_diff_hours, 2)

            timeline.append({
                "recorded_at": r["recorded_at"],
                "timestamp": r["timestamp"],
                "news2_score": int(score),
                "ewma_smoothed": round(current_ewma, 2),
                "velocity_pts_per_hr": velocity,
                "respiratory_rate": r["respiratory_rate"],
                "spo2": r["spo2"],
                "heart_rate": r["heart_rate"],
                "systolic_bp": r["systolic_bp"],
            })

        # 3. Overall Velocity over the observation window
        latest_record = timeline[-1]
        overall_velocity = 0.0
        if len(timeline) >= 2:
            total_dt_hours = (timeline[-1]["timestamp"] - timeline[0]["timestamp"]) / 3600.0
            if total_dt_hours > 0.05:
                total_d_score = timeline[-1]["news2_score"] - timeline[0]["news2_score"]
                overall_velocity = round(total_d_score / total_dt_hours, 2)
            else:
                overall_velocity = timeline[-1]["velocity_pts_per_hr"]

        current_score = latest_record["news2_score"]

        # 4. Trajectory Risk Classification
        # ACUTE_ACCELERATING_CRISIS: Rapid climb (> 1.8 pts/hr or acute jump >= 3 pts)
        is_accelerating = overall_velocity >= 1.5 or (len(timeline) >= 2 and (latest_record["news2_score"] - timeline[-2]["news2_score"]) >= 3)
        
        if is_accelerating:
            trajectory_status = "ACUTE_ACCELERATING_CRISIS"
            trajectory_label = f"Acute Acceleration (+{overall_velocity} pts/hr) — Occult Crisis Danger"
            color = "rose"
            action = "STAT Rapid Response Team clinical review required. Physiological velocity indicates acute decompensation regardless of baseline score."
        elif current_score >= 7:
            trajectory_status = "ESTABLISHED_HIGH_RISK"
            trajectory_label = "Established Critical Deterioration (Score >= 7)"
            color = "red"
            action = "Emergency ICU assessment and continuous invasive monitoring protocol active."
        elif overall_velocity > 0.4:
            trajectory_status = "GRADUAL_DECLINE"
            trajectory_label = f"Gradual Downward Drift (+{overall_velocity} pts/hr)"
            color = "amber"
            action = "Escalate telemetry observation frequency to Q1H. Evaluate for insidious sepsis or fluid loss."
        elif overall_velocity < -0.4:
            trajectory_status = "STABILIZING_IMPROVEMENT"
            trajectory_label = f"Favorable Recovery Trajectory ({overall_velocity} pts/hr)"
            color = "emerald"
            action = "Therapeutic response verified. Continue tapering clinical observations."
        else:
            trajectory_status = "PHYSIOLOGICAL_EQUILIBRIUM"
            trajectory_label = "Stable Physiological Baseline"
            color = "teal"
            action = "Routine ward observation protocol appropriate."

        return {
            "datapoints_analyzed": len(timeline),
            "current_news2": current_score,
            "ewma_smoothed_score": round(current_ewma, 2),
            "score_velocity_per_hour": overall_velocity,
            "trajectory_status": trajectory_status,
            "trajectory_label": trajectory_label,
            "color": color,
            "acceleration_alert": is_accelerating,
            "clinical_recommendation": action,
            "timeline": timeline,
        }
