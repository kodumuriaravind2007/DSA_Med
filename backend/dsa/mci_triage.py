"""
Mass Casualty Incident (MCI) START Triage & Surge Balancing Engine.
Implements the globally standardized START (Simple Triage and Rapid Treatment) algorithm:
1. Ambulatory Assessment (Can the victim walk?) -> Green
2. Spontaneous Respiration Check & Airway Positioning -> Black / Red
3. Respiratory Rate (RR > 30 bpm) -> Red
4. Perfusion Assessment (Capillary Refill > 2s or Absent Radial Pulse) -> Red
5. Mental Status (Follows simple commands?) -> Yellow vs Red

Includes scenario generators and real-time hospital surge load balancing.
"""

from typing import List, Dict, Any, Optional
import random


class STARTTriageEngine:
    @staticmethod
    def evaluate_casualty(
        victim_id: str,
        name: str,
        age: int,
        can_walk: bool,
        is_breathing: bool,
        breathing_resumed_after_airway: bool = False,
        respiratory_rate: int = 18,
        radial_pulse_present: bool = True,
        capillary_refill_seconds: float = 1.5,
        can_follow_commands: bool = True,
        injuries_description: str = "Multiple lacerations and contusions",
    ) -> Dict[str, Any]:
        """
        Executes the formal START Triage decision tree on a casualty.
        Returns triage color code, priority level, decision path, and immediate medical actions.
        """
        decision_steps = []

        # Step 1: Ambulatory / Walking check
        if can_walk:
            decision_steps.append("Ambulatory Status: Patient able to walk upon instruction.")
            decision_steps.append("START Protocol: Routed to Green Collection Point for delayed evaluation.")
            return {
                "victim_id": victim_id,
                "name": name,
                "age": age,
                "category": "Green",
                "label": "Minor (Walking Wounded)",
                "priority": 3,
                "tag_color": "emerald",
                "immediate_action": "Direct to secondary triage area. Apply sterile dressings and monitor.",
                "decision_path": decision_steps,
                "injuries": injuries_description,
            }

        decision_steps.append("Ambulatory Status: Non-ambulatory / unable to walk.")

        # Step 2: Spontaneous Respiration check
        if not is_breathing:
            decision_steps.append("Breathing Check: Apneic (No spontaneous respirations).")
            if breathing_resumed_after_airway:
                decision_steps.append("Airway Maneuver: Respirations resumed after manual head-tilt / chin-lift.")
                decision_steps.append("START Protocol: Immediate respiratory support indicated -> RED.")
                return {
                    "victim_id": victim_id,
                    "name": name,
                    "age": age,
                    "category": "Red",
                    "label": "Immediate (Life Threat)",
                    "priority": 1,
                    "tag_color": "red",
                    "immediate_action": "Insert oral/nasal airway adjunct. Initiate manual bag-valve-mask ventilation.",
                    "decision_path": decision_steps,
                    "injuries": injuries_description,
                }
            else:
                decision_steps.append("Airway Maneuver: Airway cleared and positioned; patient remains apneic.")
                decision_steps.append("START Protocol: Resuscitation contraindicated in mass casualty triage -> BLACK.")
                return {
                    "victim_id": victim_id,
                    "name": name,
                    "age": age,
                    "category": "Black",
                    "label": "Expectant / Deceased",
                    "priority": 4,
                    "tag_color": "gray",
                    "immediate_action": "Tag as Expectant/Deceased. Comfort measures only if agonal; do not divert acute resources.",
                    "decision_path": decision_steps,
                    "injuries": injuries_description,
                }

        decision_steps.append(f"Breathing Check: Spontaneous respirations present (Rate: {respiratory_rate} bpm).")

        # Step 3: Respiratory Rate assessment
        if respiratory_rate > 30 or respiratory_rate < 10:
            decision_steps.append(f"Respiratory Rate ({respiratory_rate} bpm) exceeds critical threshold (>30 or <10).")
            decision_steps.append("START Protocol: Severe tachypnea/bradypnea indicates respiratory failure -> RED.")
            return {
                "victim_id": victim_id,
                "name": name,
                "age": age,
                "category": "Red",
                "label": "Immediate (Tachypnea / Hypoxia)",
                "priority": 1,
                "tag_color": "red",
                "immediate_action": "Administer high-flow supplemental oxygen. Inspect for tension pneumothorax or flail chest.",
                "decision_path": decision_steps,
                "injuries": injuries_description,
            }

        decision_steps.append(f"Respiratory Rate ({respiratory_rate} bpm) within acceptable parameters (10-30 bpm).")

        # Step 4: Perfusion check (Capillary Refill & Radial Pulse)
        if not radial_pulse_present or capillary_refill_seconds > 2.0:
            decision_steps.append(
                f"Perfusion Assessment: Radial pulse {'absent' if not radial_pulse_present else 'present'}, "
                f"Capillary refill {capillary_refill_seconds}s (>2.0s)."
            )
            decision_steps.append("START Protocol: Hemodynamic shock / compromised perfusion -> RED.")
            return {
                "victim_id": victim_id,
                "name": name,
                "age": age,
                "category": "Red",
                "label": "Immediate (Hypovolemic Shock)",
                "priority": 1,
                "tag_color": "red",
                "immediate_action": "Control active external hemorrhage. Establish bilateral large-bore IV access; rapid crystalloid infusion.",
                "decision_path": decision_steps,
                "injuries": injuries_description,
            }

        decision_steps.append(f"Perfusion Assessment: Radial pulse palpable, Capillary refill {capillary_refill_seconds}s (<=2.0s).")

        # Step 5: Mental Status check
        if not can_follow_commands:
            decision_steps.append("Mental Status: Unable to follow simple commands (Altered level of consciousness).")
            decision_steps.append("START Protocol: Acute neurological impairment / traumatic brain injury -> RED.")
            return {
                "victim_id": victim_id,
                "name": name,
                "age": age,
                "category": "Red",
                "label": "Immediate (Acute Head Injury)",
                "priority": 1,
                "tag_color": "red",
                "immediate_action": "C-spine stabilization. Urgent head CT and neurosurgical evaluation.",
                "decision_path": decision_steps,
                "injuries": injuries_description,
            }

        decision_steps.append("Mental Status: Alert and follows simple commands.")
        decision_steps.append("START Protocol: Stable physiological parameters; care may be safely delayed -> YELLOW.")

        return {
            "victim_id": victim_id,
            "name": name,
            "age": age,
            "category": "Yellow",
            "label": "Delayed (Serious Non-Critical)",
            "priority": 2,
            "tag_color": "amber",
            "immediate_action": "Splint fractures, apply sterile dressings, monitor vitals Q15-Q30M pending operating theater clearance.",
            "decision_path": decision_steps,
            "injuries": injuries_description,
        }


SCENARIO_TEMPLATES = {
    "Highway Pileup": {
        "title": "Massive Multi-Vehicle Highway Collision",
        "description": "Multi-car and passenger coach collision with heavy vehicle rollover in low visibility. 10 victims extricated.",
        "victim_pool": [
            ("MCI-01", "Marcus Vance", 42, False, True, False, 36, True, 1.8, True, "Crush injury to lower thorax, severe chest wall contusion"),
            ("MCI-02", "Elena Rostova", 28, True, True, False, 18, True, 1.2, True, "Superficial facial glass lacerations, mild wrist sprain"),
            ("MCI-03", "Arthur Pendelton", 61, False, False, False, 0, False, 5.0, False, "Severe closed head injury with basal skull fracture"),
            ("MCI-04", "Chloe Bennett", 19, False, True, False, 22, False, 3.5, True, "Compound femur fracture with pulsatile arterial bleeding"),
            ("MCI-05", "Devon Cole", 35, True, True, False, 16, True, 1.4, True, "Cervical whiplash strain, minor abrasions"),
            ("MCI-06", "Siddharth Rao", 50, False, True, False, 24, True, 1.6, False, "Concussion with retrograde amnesia, disorientation"),
            ("MCI-07", "Hannah Abbott", 31, False, True, False, 20, True, 1.5, True, "Closed bimalleolar ankle fracture, stable vitals"),
            ("MCI-08", "David Kim", 47, False, False, True, 12, False, 2.5, False, "Traumatic asphyxia from seatbelt entrapment"),
            ("MCI-09", "Priya Sharma", 26, True, True, False, 19, True, 1.1, True, "Forearm contusion, psychological distress"),
            ("MCI-10", "Jordan Lee", 58, False, True, False, 34, False, 3.2, False, "Blunt abdominal trauma, massive internal hemorrhage, rigid abdomen"),
        ]
    },
    "Chemical Plant Explosion": {
        "title": "Industrial Vapor Cloud & Solvent Storage Blast",
        "description": "Explosion in chemical distillation unit producing toxic gas release, blast wave polytrauma, and thermal burns.",
        "victim_pool": [
            ("MCI-01", "Vikram Patel", 38, False, True, False, 38, True, 1.7, True, "Severe toxic inhalation injury, chemical pneumonitis, stridor"),
            ("MCI-02", "Sarah Connor", 44, False, True, False, 20, False, 3.8, True, "Blast trauma with traumatic below-knee amputation"),
            ("MCI-03", "Frank Miller", 55, False, False, False, 0, False, 4.0, False, "Fatal blast overpressure trauma"),
            ("MCI-04", "Leila Chen", 29, True, True, False, 18, True, 1.3, True, "First-degree chemical irritant skin burn, ambulatory"),
            ("MCI-05", "Rajesh Nair", 49, False, True, False, 28, True, 1.8, False, "Blast concussion, tympanic membrane rupture, stupor"),
            ("MCI-06", "Emma Watson", 33, True, True, False, 16, True, 1.2, True, "Mild smoke exposure, walking wounded"),
            ("MCI-07", "Carlos Mendes", 51, False, True, False, 22, True, 1.9, True, "Second-degree burns across 15% TBSA, stable airway"),
            ("MCI-08", "Zack Taylor", 23, False, True, False, 32, False, 3.0, False, "Third-degree circumferential chest burns, hypovolemic shock"),
        ]
    },
    "Metro Train Derailment": {
        "title": "Subway Rapid Transit High-Speed Derailment",
        "description": "Peak-hour underground train derailment inside tunnel with structural collapse and electrical fire.",
        "victim_pool": [
            ("MCI-01", "Aiden Pearce", 34, False, True, False, 32, True, 1.9, True, "Flail chest, severe respiratory distress, hemothorax"),
            ("MCI-02", "Maya Lin", 22, True, True, False, 18, True, 1.2, True, "Walking wounded, mild abrasions, tinnitus"),
            ("MCI-03", "Robert Chen", 64, False, False, False, 0, False, 5.0, False, "Crush decapitation / fatal traumatic arrest"),
            ("MCI-04", "Fatima Al-Sayed", 41, False, True, False, 26, False, 3.2, True, "Pelvic ring disruption, internal hemorrhage, weak radial pulse"),
            ("MCI-05", "Lucas Vance", 27, False, True, False, 18, True, 1.5, False, "Severe traumatic brain injury, GCS 7, non-responsive to voice"),
            ("MCI-06", "Clara Oswald", 30, True, True, False, 16, True, 1.3, True, "Minor scalp laceration, fully ambulatory"),
            ("MCI-07", "Dmitri Volkov", 52, False, True, False, 22, True, 1.8, True, "Open tibia-fibula fracture, distal pulses intact"),
            ("MCI-08", "Anita Roy", 39, False, False, True, 10, False, 2.8, False, "Positional airway obstruction, breathing restored after jaw thrust"),
        ]
    }
}


def get_mci_scenarios() -> List[Dict[str, Any]]:
    """Returns metadata for all available pre-configured MCI disaster scenarios."""
    scenarios = []
    for key, val in SCENARIO_TEMPLATES.items():
        scenarios.append({
            "key": key,
            "title": val["title"],
            "description": val["description"],
            "casualty_count": len(val["victim_pool"])
        })
    return scenarios


def run_mci_simulation(
    scenario_key: str = "Highway Pileup",
    victims_override: Optional[List[Dict[str, Any]]] = None,
    available_red_beds: int = 4,
    available_yellow_beds: int = 12,
    available_ventilators: int = 5,
    available_trauma_surgeons: int = 3
) -> Dict[str, Any]:
    """Runs a complete MCI START triage simulation and hospital surge analysis."""
    scenario = SCENARIO_TEMPLATES.get(scenario_key, SCENARIO_TEMPLATES["Highway Pileup"])
    victims = []
    category_counts = {"Red": 0, "Yellow": 0, "Green": 0, "Black": 0}

    if victims_override:
        for v in victims_override:
            result = STARTTriageEngine.evaluate_casualty(
                victim_id=v.get("victim_id", "MCI-X"),
                name=v.get("name", "Unknown Casualty"),
                age=v.get("age", 30),
                can_walk=v.get("can_walk", False),
                is_breathing=v.get("is_breathing", True),
                breathing_resumed_after_airway=v.get("breathing_resumed_after_airway", False),
                respiratory_rate=v.get("respiratory_rate", 20),
                radial_pulse_present=v.get("radial_pulse_present", True),
                capillary_refill_seconds=v.get("capillary_refill_seconds", 1.5),
                can_follow_commands=v.get("can_follow_commands", True),
                injuries_description=v.get("injuries_description", "Blast / crash trauma"),
            )
            victims.append(result)
            category_counts[result["category"]] += 1
    else:
        for (v_id, name, age, walk, breath, resumed, rr, pulse, cap, cmd, injuries) in scenario["victim_pool"]:
            result = STARTTriageEngine.evaluate_casualty(
                victim_id=v_id,
                name=name,
                age=age,
                can_walk=walk,
                is_breathing=breath,
                breathing_resumed_after_airway=resumed,
                respiratory_rate=rr,
                radial_pulse_present=pulse,
                capillary_refill_seconds=cap,
                can_follow_commands=cmd,
                injuries_description=injuries,
            )
            victims.append(result)
            category_counts[result["category"]] += 1

    # Sort victims by priority (1=Red, 2=Yellow, 3=Green, 4=Black)
    victims.sort(key=lambda v: v["priority"])

    # Hospital Surge Capacity Calculations
    immediate_count = category_counts["Red"]
    delayed_count = category_counts["Yellow"]
    minor_count = category_counts["Green"]
    deceased_count = category_counts["Black"]

    est_trauma_bays_needed = immediate_count
    est_ventilators_needed = max(1, round(immediate_count * 0.7)) if immediate_count > 0 else 0
    est_or_suites_needed = max(1, round(immediate_count * 0.5)) if immediate_count > 0 else 0

    red_deficit = max(0, est_trauma_bays_needed - available_red_beds)
    vent_deficit = max(0, est_ventilators_needed - available_ventilators)

    surge_code = "CODE RED (MCI ACTIVATION)" if immediate_count >= 3 else "CODE YELLOW (ELEVATED DISASTER ALERT)"

    return {
        "scenario_key": scenario_key,
        "scenario_title": scenario["title"],
        "scenario_description": scenario["description"],
        "total_victims": len(victims),
        "total_casualties": len(victims),
        "category_counts": category_counts,
        "triage_summary": {
            "red_immediate": immediate_count,
            "yellow_delayed": delayed_count,
            "green_minor": minor_count,
            "black_expectant": deceased_count,
        },
        "surge_resource_demand": {
            "trauma_bays_required": est_trauma_bays_needed,
            "ventilators_required": est_ventilators_needed,
            "operating_rooms_required": est_or_suites_needed,
            "surge_code": surge_code,
        },
        "surge_analysis": {
            "available_red_beds": available_red_beds,
            "available_yellow_beds": available_yellow_beds,
            "available_ventilators": available_ventilators,
            "available_trauma_surgeons": available_trauma_surgeons,
            "red_bed_deficit": red_deficit,
            "ventilator_deficit": vent_deficit,
            "is_capacity_exceeded": (red_deficit > 0 or vent_deficit > 0),
            "surge_code": surge_code
        },
        "victims": victims,
        "triage_results": victims,
    }
