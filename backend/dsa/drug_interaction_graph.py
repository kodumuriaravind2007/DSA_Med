"""
Pharmacological Interaction Network & Contraindication Graph Engine.
Uses bipartite and conflict graph data structures to identify:
1. Drug-Drug Interactions (DDI) with severity classifications and pharmacokinetic/pharmacodynamic mechanisms.
2. Drug-Condition Contraindications (e.g., NSAIDs in Chronic Kidney Disease, Beta-blockers in Asthma).
3. Drug-Allergy Cross-Reactivity (e.g., Cephalosporins in Penicillin-allergic patients).
"""

from typing import List, Dict, Any, Optional, Set, Tuple


class InteractionEdge:
    def __init__(
        self,
        item1: str,
        item2: str,
        interaction_type: str,  # 'drug-drug', 'drug-condition', 'drug-allergy'
        severity: str,          # 'Severe Contraindication', 'Major Warning', 'Moderate Precaution'
        mechanism: str,
        recommendation: str,
    ):
        self.item1 = item1
        self.item2 = item2
        self.interaction_type = interaction_type
        self.severity = severity
        self.mechanism = mechanism
        self.recommendation = recommendation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "item1": self.item1,
            "item2": self.item2,
            "interaction_type": self.interaction_type,
            "severity": self.severity,
            "mechanism": self.mechanism,
            "recommendation": self.recommendation,
        }


# Clinical Pharmacological Knowledge Base
KNOWLEDGE_BASE_DRUG_DRUG = [
    (
        "warfarin", "aspirin", "Severe Contraindication",
        "Synergistic anticoagulant and antiplatelet inhibition markedly increases life-threatening gastrointestinal and intracerebral hemorrhage risk.",
        "Avoid co-administration unless specifically indicated with tight INR monitoring and gastroprotective PPI cover."
    ),
    (
        "warfarin", "ibuprofen", "Severe Contraindication",
        "NSAID displacement of warfarin from plasma albumin binding plus platelet COX-1 inhibition accelerates severe bleeding risk.",
        "Switch analgesic to Paracetamol / Acetaminophen (max 2g/day) or topical formulation."
    ),
    (
        "clopidogrel", "omeprazole", "Major Warning",
        "Omeprazole inhibits hepatic CYP2C19, impeding bio-activation of clopidogrel and reducing its antiplatelet cardioprotective efficacy.",
        "Substitute omeprazole with pantoprazole or famotidine (H2-blocker) which exhibit minimal CYP2C19 inhibition."
    ),
    (
        "lisinopril", "spironolactone", "Major Warning",
        "Combined renin-angiotensin-aldosterone blockade dramatically elevates potassium retention, risking fatal hyperkalemia and ventricular arrhythmias.",
        "Monitor serum potassium and renal function within 7 days. Limit dietary potassium intake."
    ),
    (
        "lisinopril", "potassium", "Major Warning",
        "ACE inhibitors decrease aldosterone production, causing severe potassium accumulation when exogenous potassium is supplemented.",
        "Discontinue routine potassium supplementation unless documented hypokalemia is being corrected under continuous telemetry."
    ),
    (
        "ciprofloxacin", "sotalol", "Severe Contraindication",
        "Additive cardiac hERG channel blockade causing pathological QTc interval prolongation and lethal Torsades de Pointes.",
        "Absolute contraindication. Select an alternative non-QTc prolonging antimicrobial agent."
    ),
    (
        "ciprofloxacin", "amiodarone", "Severe Contraindication",
        "Profound synergistic prolongation of cardiac action potential duration and QTc interval.",
        "Contraindicated. Perform continuous ECG monitoring if no alternative antimicrobials exist."
    ),
    (
        "metformin", "contrast dye", "Major Warning",
        "Radiographic iodinated contrast medium can induce acute kidney injury, precipitating toxic systemic metformin accumulation and lactic acidosis.",
        "Withhold metformin 48 hours prior to and 48 hours following iodinated contrast administration."
    ),
    (
        "tramadol", "fluoxetine", "Major Warning",
        "Inhibition of CYP2D6 by fluoxetine plus cumulative serotonergic stimulation triggers life-threatening Serotonin Syndrome and lowers seizure threshold.",
        "Avoid combination. If analgesia required, consider non-serotonergic opioid or multimodal non-opioid regimens."
    ),
    (
        "tramadol", "sertraline", "Major Warning",
        "Excessive central serotonin receptor activation. Risk of agitation, neuromuscular hyperactivity, hyperthermia, and seizures.",
        "Monitor for autonomic instability. Reduce dosage or select alternative non-serotonergic agent."
    ),
    (
        "digoxin", "amiodarone", "Major Warning",
        "Amiodarone inhibits P-glycoprotein, reducing renal and non-renal elimination of digoxin and doubling serum digoxin levels.",
        "Reduce digoxin maintenance dose by 50% and monitor serum digoxin concentration weekly."
    ),
    (
        "atorvastatin", "clarithromycin", "Major Warning",
        "Potent CYP3A4 inhibition by clarithromycin causes substantial atorvastatin accumulation, dramatically increasing rhabdomyolysis and acute myopathy risk.",
        "Temporarily suspend atorvastatin during macrolide therapy or switch to azithromycin."
    ),
    (
        "nitroglycerin", "sildenafil", "Severe Contraindication",
        "Profound cGMP-mediated vascular smooth muscle relaxation causing catastrophic refractory hypotension and cardiovascular collapse.",
        "Absolute contraindication. Sildenafil must not be co-administered within 24-48 hours of any nitrate."
    ),
    (
        "methotrexate", "ibuprofen", "Major Warning",
        "NSAIDs reduce renal tubular secretion and renal blood flow, causing toxic systemic accumulation of methotrexate and bone marrow suppression.",
        "Avoid NSAIDs in patients taking intermediate or high-dose methotrexate."
    ),
]

KNOWLEDGE_BASE_DRUG_CONDITION = [
    (
        "metformin", "chronic kidney disease", "Severe Contraindication",
        "Severely impaired renal clearance (eGFR < 30 mL/min) triggers life-threatening lactic acidosis accumulation.",
        "Discontinue metformin when eGFR < 30 mL/min. Adjust dose if eGFR 30-45 mL/min."
    ),
    (
        "ibuprofen", "chronic kidney disease", "Severe Contraindication",
        "Renal prostaglandin inhibition promotes acute renal hemodynamic decompensation and rapid worsening of renal failure.",
        "Strictly avoid all systemic NSAIDs in renal insufficiency."
    ),
    (
        "ibuprofen", "gastric ulcer", "Severe Contraindication",
        "Inhibition of gastric protective COX-1 prostaglandin synthesis causes mucosal erosion, peptic ulceration, and catastrophic upper GI hemorrhage.",
        "Absolute contraindication in active peptic ulcer disease."
    ),
    (
        "metoprolol", "asthma", "Major Warning",
        "Non-cardioselective or high-dose beta-blocker antagonizes bronchial beta-2 receptors, inducing life-threatening severe bronchospasm.",
        "Avoid beta-blockers in reactive airway disease or use highly cardioselective beta-1 agents with emergency bronchodilators available."
    ),
    (
        "propranolol", "asthma", "Severe Contraindication",
        "Non-selective beta blockade induces intense bronchial smooth muscle constriction and refractory status asthmaticus.",
        "Absolute contraindication in asthma."
    ),
    (
        "gentamicin", "myasthenia gravis", "Major Warning",
        "Aminoglycosides inhibit pre-synaptic acetylcholine release and post-synaptic sensitivity, producing severe neuromuscular blockade exacerbation.",
        "Avoid aminoglycosides; choose alternative antibiotic classes."
    ),
    (
        "prednisone", "diabetes", "Moderate Precaution",
        "Systemic glucocorticoids increase hepatic gluconeogenesis and induce peripheral insulin resistance, triggering severe hyperglycemia.",
        "Intensify blood glucose telemetry and titrate insulin or hypoglycemic therapy."
    ),
]

KNOWLEDGE_BASE_DRUG_ALLERGY = [
    (
        "amoxicillin", "penicillin", "Severe Contraindication",
        "Direct beta-lactam core allergen cross-reactivity causing Type-I IgE-mediated anaphylaxis.",
        "Absolute contraindication. Select macrolides, fluoroquinolones, or glycopeptides."
    ),
    (
        "ampicillin", "penicillin", "Severe Contraindication",
        "Direct beta-lactam class allergen cross-reactivity.",
        "Avoid all penicillins and aminopenicillins."
    ),
    (
        "cephalexin", "penicillin", "Major Warning",
        "Structural similarity between 1st generation cephalosporins and penicillin side chains carries 5-10% cross-allergenicity risk.",
        "Avoid 1st generation cephalosporins if penicillin reaction was severe anaphylaxis."
    ),
    (
        "ciprofloxacin", "fluoroquinolones", "Severe Contraindication",
        "Class-wide quinolone anaphylactoid hypersensitivity.",
        "Contraindicated."
    ),
    (
        "aspirin", "nsaids", "Severe Contraindication",
        "Cross-reactive pseudoallergic leukotriene overproduction inducing severe bronchospasm and angioedema (Samter's Triad).",
        "Avoid all non-steroidal anti-inflammatory drugs."
    ),
]


class DrugInteractionEngine:
    def __init__(self):
        self._build_indices()

    def _build_indices(self):
        self.ddi_map: Dict[Tuple[str, str], InteractionEdge] = {}
        for d1, d2, sev, mech, rec in KNOWLEDGE_BASE_DRUG_DRUG:
            k1 = (d1.lower(), d2.lower())
            k2 = (d2.lower(), d1.lower())
            edge = InteractionEdge(d1, d2, "drug-drug", sev, mech, rec)
            self.ddi_map[k1] = edge
            self.ddi_map[k2] = edge

        self.condition_map: List[InteractionEdge] = [
            InteractionEdge(d, c, "drug-condition", sev, mech, rec)
            for d, c, sev, mech, rec in KNOWLEDGE_BASE_DRUG_CONDITION
        ]

        self.allergy_map: List[InteractionEdge] = [
            InteractionEdge(d, a, "drug-allergy", sev, mech, rec)
            for d, a, sev, mech, rec in KNOWLEDGE_BASE_DRUG_ALLERGY
        ]

    def check_conflicts(
        self,
        candidate_drug: str,
        active_medications: List[str],
        known_conditions: Optional[List[str]] = None,
        patient_allergies: Optional[List[str]] = None,
        biomarkers: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes a proposed candidate medication against current regimens,
        chronic conditions, documented allergies, and active laboratory biomarkers
        using contextual alert fatigue suppression (JAMIA 2024-2025).
        """
        c_clean = candidate_drug.strip().lower()
        active_clean = [m.strip().lower() for m in active_medications if m.strip()]
        conditions_clean = [c.strip().lower() for c in (known_conditions or []) if c.strip()]
        allergies_clean = [a.strip().lower() for a in (patient_allergies or []) if a.strip()]
        bio = biomarkers or {}

        detected_conflicts: List[Dict[str, Any]] = []
        suppressed_conflicts: List[Dict[str, Any]] = []
        nodes: Set[str] = {c_clean}
        edges_out: List[Dict[str, Any]] = []

        # 1. Check Drug-Drug Interactions
        for active in active_clean:
            nodes.add(active)
            # Exact or substring match (e.g., "Aspirin 81mg" matches "aspirin")
            matched_edge = None
            for (d1, d2), edge in self.ddi_map.items():
                if (d1 in c_clean or c_clean in d1) and (d2 in active or active in d2):
                    matched_edge = edge
                    break

            if matched_edge:
                conflict_dict = {
                    "type": "Drug-Drug Interaction",
                    "offending_item": active.title(),
                    "severity": matched_edge.severity,
                    "mechanism": matched_edge.mechanism,
                    "recommendation": matched_edge.recommendation,
                }
                detected_conflicts.append(conflict_dict)
                edges_out.append({
                    "source": c_clean.title(),
                    "target": active.title(),
                    "type": "DDI",
                    "severity": matched_edge.severity,
                })

        # 2. Check Drug-Condition Contraindications
        for cond in conditions_clean:
            nodes.add(cond)
            for edge in self.condition_map:
                if (edge.item1 in c_clean or c_clean in edge.item1) and (edge.item2 in cond or cond in edge.item2):
                    conflict_dict = {
                        "type": "Drug-Condition Contraindication",
                        "offending_item": cond.title(),
                        "severity": edge.severity,
                        "mechanism": edge.mechanism,
                        "recommendation": edge.recommendation,
                    }
                    detected_conflicts.append(conflict_dict)
                    edges_out.append({
                        "source": c_clean.title(),
                        "target": cond.title(),
                        "type": "Condition",
                        "severity": edge.severity,
                    })

        # 3. Check Drug-Allergy Cross-Reactivity
        for allergy in allergies_clean:
            nodes.add(allergy)
            for edge in self.allergy_map:
                if (edge.item1 in c_clean or c_clean in edge.item1) and (edge.item2 in allergy or allergy in edge.item2):
                    conflict_dict = {
                        "type": "Allergy Cross-Reactivity",
                        "offending_item": allergy.title(),
                        "severity": edge.severity,
                        "mechanism": edge.mechanism,
                        "recommendation": edge.recommendation,
                    }
                    detected_conflicts.append(conflict_dict)
                    edges_out.append({
                        "source": c_clean.title(),
                        "target": allergy.title(),
                        "type": "Allergy",
                        "severity": edge.severity,
                    })

        # Contextual Biomarker-Conditioned Alert Fatigue Suppression (JAMIA 2024-2025)
        filtered_conflicts = []
        suppressed_conflicts = []

        for conflict in detected_conflicts:
            mech_lower = conflict["mechanism"].lower()
            
            # 1. Check Potassium Context
            if "hyperkalemia" in mech_lower or "potassium" in mech_lower:
                k_val = bio.get("potassium")
                if k_val is not None:
                    if k_val < 4.5:
                        suppressed_conflicts.append({
                            **conflict,
                            "original_severity": conflict["severity"],
                            "suppression_reason": f"Alert Fatigue Suppressed: Recent Serum Potassium is normal ({k_val} mEq/L <= 4.5). Downgraded to routine observation.",
                        })
                        continue
                    elif k_val >= 5.2:
                        conflict["severity"] = "Severe Contraindication"
                        conflict["mechanism"] += f" [CRITICAL HYPERKALEMIA LAB INTERLOCK: K+ = {k_val} mEq/L]"

            # 2. Check Renal Function (eGFR) Context
            if "renal" in mech_lower or "kidney" in mech_lower or "lactic acidosis" in mech_lower:
                egfr_val = bio.get("egfr")
                if egfr_val is not None and egfr_val >= 60.0 and conflict["severity"] != "Severe Contraindication":
                    suppressed_conflicts.append({
                        **conflict,
                        "original_severity": conflict["severity"],
                        "suppression_reason": f"Alert Fatigue Suppressed: Preserved Renal Function verified (eGFR {egfr_val} mL/min >= 60).",
                    })
                    continue

            filtered_conflicts.append(conflict)

        # Sort conflicts: Severe first, then Major, then Moderate
        severity_rank = {
            "Severe Contraindication": 1,
            "Major Warning": 2,
            "Moderate Precaution": 3,
        }
        filtered_conflicts.sort(key=lambda x: severity_rank.get(x["severity"], 99))

        has_severe = any(c["severity"] == "Severe Contraindication" for c in filtered_conflicts)
        has_major = any(c["severity"] == "Major Warning" for c in filtered_conflicts)

        if has_severe:
            safety_status = "CRITICAL_BLOCKED"
            safety_label = "Contraindicated: Prescription Unsafe"
            color = "red"
        elif has_major:
            safety_status = "WARNING_REQUIRES_OVERRIDE"
            safety_label = "Major Clinical Warning: Monitor Closely"
            color = "amber"
        elif filtered_conflicts:
            safety_status = "PRECAUTION_NOTED"
            safety_label = "Precaution: Minor Interaction Detected"
            color = "yellow"
        else:
            safety_status = "CLEARED"
            safety_label = "Safe: 0 Pharmacological Conflicts Detected"
            color = "emerald"

        total_raw = len(detected_conflicts)
        suppressed_count = len(suppressed_conflicts)
        fatigue_reduction = round((suppressed_count / total_raw * 100), 1) if total_raw > 0 else 0.0

        return {
            "candidate_drug": candidate_drug.title(),
            "safety_status": safety_status,
            "safety_label": safety_label,
            "color": color,
            "is_prescribing_safe": not has_severe,
            "conflict_count": len(filtered_conflicts),
            "conflicts": filtered_conflicts,
            "suppressed_conflicts": suppressed_conflicts,
            "alert_fatigue_stats": {
                "raw_alerts_generated": total_raw,
                "contextually_suppressed": suppressed_count,
                "actionable_alerts_surfaced": len(filtered_conflicts),
                "fatigue_reduction_pct": fatigue_reduction,
            },
            "graph_visualization": {
                "nodes": [{"id": n.title(), "name": n.title()} for n in nodes],
                "edges": edges_out,
            },
        }
