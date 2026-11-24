"""
National Early Warning Score 2 (NEWS2) & Clinical Deterioration Engine.
Standardized scoring system developed by the Royal College of Physicians (RCP)
to improve the detection and response to clinical deterioration in adult patients.

Evaluates 6 physiological parameters:
1. Respiration Rate
2. Oxygen Saturation (Scale 1 standard, Scale 2 hypercapnic respiratory failure)
3. Supplemental Oxygen
4. Systolic Blood Pressure
5. Pulse Rate
6. Level of Consciousness (AVPU / ACVPU)
7. Body Temperature
"""

from typing import Dict, Any, Optional, List


class NEWS2Engine:
    @staticmethod
    def _score_respiration(rate: Optional[int]) -> int:
        if rate is None:
            return 0
        if rate <= 8:
            return 3
        if 9 <= rate <= 11:
            return 1
        if 12 <= rate <= 20:
            return 0
        if 21 <= rate <= 24:
            return 2
        return 3  # >= 25

    @staticmethod
    def _score_spo2(spo2: Optional[float], scale: int = 1, on_oxygen: bool = False) -> int:
        if spo2 is None:
            return 0
        if scale == 2:
            # Scale 2: Hypercapnic respiratory failure (e.g. COPD with target 88-92%)
            if spo2 <= 83:
                return 3
            if 84 <= spo2 <= 85:
                return 2
            if 86 <= spo2 <= 87:
                return 1
            if 88 <= spo2 <= 92:
                return 0
            if 93 <= spo2 <= 94:
                return 1 if on_oxygen else 0
            if 95 <= spo2 <= 96:
                return 2 if on_oxygen else 0
            return 3 if on_oxygen else 0
        else:
            # Scale 1: Standard adult
            if spo2 <= 91:
                return 3
            if 92 <= spo2 <= 93:
                return 2
            if 94 <= spo2 <= 95:
                return 1
            return 0  # >= 96

    @staticmethod
    def _score_oxygen_device(on_oxygen: bool) -> int:
        return 2 if on_oxygen else 0

    @staticmethod
    def _score_systolic_bp(sbp: Optional[int]) -> int:
        if sbp is None:
            return 0
        if sbp <= 90:
            return 3
        if 91 <= sbp <= 100:
            return 2
        if 101 <= sbp <= 110:
            return 1
        if 111 <= sbp <= 219:
            return 0
        return 3  # >= 220

    @staticmethod
    def _score_pulse(pulse: Optional[int]) -> int:
        if pulse is None:
            return 0
        if pulse <= 40:
            return 3
        if 41 <= pulse <= 50:
            return 1
        if 51 <= pulse <= 90:
            return 0
        if 91 <= pulse <= 110:
            return 1
        if 111 <= pulse <= 130:
            return 2
        return 3  # >= 131

    @staticmethod
    def _score_consciousness(avpu: Optional[str]) -> int:
        if not avpu:
            return 0
        code = avpu.strip().upper()
        # Alert is 0; Confusion, Voice, Pain, Unresponsive is 3
        if code in ["A", "ALERT"]:
            return 0
        return 3

    @staticmethod
    def _score_temperature(temp_c: Optional[float]) -> int:
        if temp_c is None:
            return 0
        if temp_c <= 35.0:
            return 3
        if 35.1 <= temp_c <= 36.0:
            return 1
        if 36.1 <= temp_c <= 38.0:
            return 0
        if 38.1 <= temp_c <= 39.0:
            return 1
        return 2  # >= 39.1

    @classmethod
    def calculate_score(
        cls,
        respiration_rate: Optional[int] = None,
        oxygen_saturation: Optional[float] = None,
        supplemental_oxygen: bool = False,
        systolic_bp: Optional[int] = None,
        pulse_rate: Optional[int] = None,
        consciousness_avpu: str = "A",
        temperature_f: Optional[float] = None,
        temperature_c: Optional[float] = None,
        spo2_scale: int = 1,
    ) -> Dict[str, Any]:
        """
        Calculates aggregate NEWS2 score, per-parameter breakdown,
        clinical risk categorization, and recommended rapid response protocol.
        """
        # Convert Fahrenheit to Celsius if needed
        if temperature_c is None and temperature_f is not None:
            temperature_c = round((temperature_f - 32) * 5 / 9, 1)

        resp_score = cls._score_respiration(respiration_rate)
        spo2_score = cls._score_spo2(oxygen_saturation, scale=spo2_scale, on_oxygen=supplemental_oxygen)
        o2_score = cls._score_oxygen_device(supplemental_oxygen)
        bp_score = cls._score_systolic_bp(systolic_bp)
        pulse_score = cls._score_pulse(pulse_rate)
        avpu_score = cls._score_consciousness(consciousness_avpu)
        temp_score = cls._score_temperature(temperature_c)

        total_score = (
            resp_score
            + spo2_score
            + o2_score
            + bp_score
            + pulse_score
            + avpu_score
            + temp_score
        )

        # Check for RED score (score of 3 in any single parameter)
        single_scores = {
            "respiration_rate": resp_score,
            "oxygen_saturation": spo2_score,
            "supplemental_oxygen": o2_score,
            "systolic_bp": bp_score,
            "pulse_rate": pulse_score,
            "consciousness": avpu_score,
            "temperature": temp_score,
        }
        has_red_score = any(s >= 3 for s in single_scores.values())

        # Clinical Risk Stratification
        if total_score >= 7:
            risk_level = "High"
            urgency = "EMERGENCY_RAPID_RESPONSE"
            color = "red"
            monitoring_freq = "Continuous monitoring of vital signs"
            clinical_response = (
                "EMERGENCY ALERT: Immediate bedside assessment by Rapid Response Team (RRT) "
                "or Intensive Care Specialist. Consider transfer to High Dependency Unit (HDU) or ICU."
            )
            suggested_heap_priority = 1
        elif total_score >= 5 or has_red_score:
            risk_level = "Medium"
            urgency = "URGENT_CLINICAL_REVIEW"
            color = "amber"
            monitoring_freq = "Minimum hourly monitoring of vital signs"
            if has_red_score:
                clinical_response = (
                    "URGENT REVIEW: Extreme physiological disturbance in single parameter (RED score 3). "
                    "Urgent assessment by ward doctor or acute care team within 30 minutes."
                )
            else:
                clinical_response = (
                    "URGENT REVIEW: Aggregate NEWS2 score 5-6 indicates high potential for acute deterioration. "
                    "Immediate review by competent acute clinician."
                )
            suggested_heap_priority = 1 if has_red_score else 2
        elif 1 <= total_score <= 4:
            risk_level = "Low"
            urgency = "ROUTINE_WARD_OBSERVATION"
            color = "emerald"
            monitoring_freq = "Minimum 4-6 hourly monitoring"
            clinical_response = (
                "Standard ward-based care. Inform registered nurse; continue routine observation protocol."
            )
            suggested_heap_priority = 3
        else:
            risk_level = "Normal"
            urgency = "STABLE"
            color = "teal"
            monitoring_freq = "Minimum 12 hourly monitoring"
            clinical_response = "All physiological parameters within normal physiological reference ranges."
            suggested_heap_priority = 3

        return {
            "total_score": total_score,
            "risk_level": risk_level,
            "urgency": urgency,
            "color": color,
            "has_red_score": has_red_score,
            "suggested_heap_priority": suggested_heap_priority,
            "monitoring_frequency": monitoring_freq,
            "clinical_response": clinical_response,
            "parameters": {
                "respiration_rate": {"value": respiration_rate, "score": resp_score},
                "oxygen_saturation": {"value": oxygen_saturation, "score": spo2_score, "scale": spo2_scale},
                "supplemental_oxygen": {"value": supplemental_oxygen, "score": o2_score},
                "systolic_bp": {"value": systolic_bp, "score": bp_score},
                "pulse_rate": {"value": pulse_rate, "score": pulse_score},
                "consciousness": {"value": consciousness_avpu, "score": avpu_score},
                "temperature_c": {"value": temperature_c, "score": temp_score},
            },
        }
