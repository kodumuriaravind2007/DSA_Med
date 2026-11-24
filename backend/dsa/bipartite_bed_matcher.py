"""
Optimal Bipartite Matching for Dynamic Bed & Specialist Allocation.

Implements the Kuhn-Munkres (Hungarian) Algorithm (O(V^3)) to globally optimize
patient-to-bed allocation under clinical acuity, specialized equipment,
infection isolation, and scarce asset conservation constraints.
"""

from typing import List, Dict, Any, Tuple, Optional
import math


class HungarianAlgorithm:
    """
    Pure Python zero-dependency implementation of the Kuhn-Munkres (Hungarian) algorithm
    for solving the minimum-cost bipartite assignment problem.
    """

    @staticmethod
    def solve(cost_matrix: List[List[float]]) -> Tuple[List[int], float]:
        """
        Takes an N x M cost matrix (where N <= M) and returns:
        - List of assigned column indices for each row: assignment[row_i] = col_j (-1 if unassigned)
        - Total optimal matching cost
        """
        n_rows = len(cost_matrix)
        if n_rows == 0:
            return [], 0.0
        n_cols = len(cost_matrix[0])
        if n_cols == 0:
            return [-1] * n_rows, 0.0

        # If more rows than columns, pad columns with dummy high costs
        n = max(n_rows, n_cols)
        matrix = [[0.0] * n for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if r < n_rows and c < n_cols:
                    matrix[r][c] = float(cost_matrix[r][c])
                else:
                    matrix[r][c] = 999999.0  # Dummy cell penalty

        # Hungarian algorithm using potential reduction & shortest augmenting path
        u = [0.0] * (n + 1)
        v = [0.0] * (n + 1)
        p = [0] * (n + 1)
        way = [0] * (n + 1)

        for i in range(1, n + 1):
            p[0] = i
            j0 = 0
            minv = [float("inf")] * (n + 1)
            used = [False] * (n + 1)

            while True:
                used[j0] = True
                i0 = p[j0]
                delta = float("inf")
                j1 = 0

                for j in range(1, n + 1):
                    if not used[j]:
                        cur = matrix[i0 - 1][j - 1] - u[i0] - v[j]
                        if cur < minv[j]:
                            minv[j] = cur
                            way[j] = j0
                        if minv[j] < delta:
                            delta = minv[j]
                            j1 = j

                for j in range(n + 1):
                    if used[j]:
                        u[p[j]] += delta
                        v[j] -= delta
                    else:
                        minv[j] -= delta

                j0 = j1
                if p[j0] == 0:
                    break

            while True:
                j1 = way[j0]
                p[j0] = p[j1]
                j0 = j1
                if j0 == 0:
                    break

        ans = [-1] * n_rows
        total_cost = 0.0
        for j in range(1, n + 1):
            if p[j] != 0:
                row_idx = p[j] - 1
                col_idx = j - 1
                if row_idx < n_rows:
                    if col_idx < n_cols and matrix[row_idx][col_idx] < 900000.0:
                        ans[row_idx] = col_idx
                        total_cost += cost_matrix[row_idx][col_idx]
                    else:
                        ans[row_idx] = -1

        return ans, round(total_cost, 2)


class BedAllocationEngine:
    """
    Constructs weighted bipartite graph between patients needing beds and available beds,
    evaluating multi-objective constraints to output globally optimal matches.
    """

    @staticmethod
    def calculate_compatibility_cost(patient: Dict[str, Any], bed: Dict[str, Any]) -> Tuple[float, List[str]]:
        """
        Calculates matching cost between a patient and a bed.
        Lower cost = better match. Cost of 0.0 is a perfect match.
        Costs > 1000 indicate severe clinical mismatch or impossible assignment.
        """
        cost = 0.0
        reasons = []

        patient_priority = patient.get("priority", 3)
        requires_isolation = patient.get("requires_isolation", False)
        requires_ventilator = patient.get("requires_ventilator", False)
        patient_dept = patient.get("department", "Emergency")

        bed_ward = bed.get("ward", "General")
        is_isolation = bed.get("is_isolation", False)
        has_ventilator = bed.get("has_ventilator", False)
        bed_status = bed.get("status", "Available")

        # Ineligible bed if already occupied
        if bed_status != "Available":
            return 99999.0, ["Bed already occupied"]

        # 1. Isolation Requirement (Airborne / Contact Infection Control)
        if requires_isolation:
            if is_isolation:
                cost += 0.0
                reasons.append("Infection control satisfied (Isolation room)")
            else:
                cost += 5000.0
                reasons.append("CRITICAL MISMATCH: Patient requires negative pressure isolation")
        else:
            if is_isolation:
                # Squandering scarce isolation bed on non-isolated patient
                cost += 80.0
                reasons.append("Inefficient asset use: Non-infectious patient assigned to isolation bed")

        # 2. Ventilator / Critical Care Requirement
        if requires_ventilator:
            if has_ventilator:
                cost += 0.0
                reasons.append("Mechanical ventilation matched")
            else:
                cost += 6000.0
                reasons.append("CRITICAL MISMATCH: Patient requires life-support mechanical ventilator")
        else:
            if has_ventilator:
                cost += 70.0
                reasons.append("Asset squander: Ventilator bed assigned to spontaneous breathing patient")

        # 3. Acuity-to-Ward Alignment
        if patient_priority == 1:  # Critical / Resuscitation
            if "ICU" in bed_ward or "Trauma" in bed_ward:
                cost += 5.0
                reasons.append("Optimal high-acuity intensive care alignment")
            elif "Step-Down" in bed_ward or "Telemetry" in bed_ward:
                cost += 25.0
                reasons.append("Suboptimal: High-acuity patient in intermediate step-down bed")
            else:
                cost += 250.0
                reasons.append("Dangerously low-monitoring bed for critical patient")
        elif patient_priority == 2:  # Urgent
            if "Step-Down" in bed_ward or "Telemetry" in bed_ward or "Surgical" in bed_ward:
                cost += 5.0
                reasons.append("Optimal telemetry / intermediate ward alignment")
            elif "ICU" in bed_ward:
                cost += 40.0
                reasons.append("Mild asset overhead: Urgent patient taking ICU bed")
            else:
                cost += 15.0
                reasons.append("Acceptable standard ward placement")
        else:  # Normal (Priority 3)
            if "ICU" in bed_ward:
                cost += 150.0
                reasons.append("Severe asset misuse: Stable patient assigned to ICU bed")
            elif "General" in bed_ward or "Observation" in bed_ward:
                cost += 2.0
                reasons.append("Standard ward bed aligned")

        # 4. Department Cohorting
        if bed.get("department") and bed.get("department") == patient_dept:
            cost -= 5.0
            reasons.append(f"Department matched: {patient_dept}")

        normalized_cost = max(1.0, cost)
        return normalized_cost, reasons

    @classmethod
    def match_patients_to_beds(
        cls,
        patients: List[Dict[str, Any]],
        beds: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes the Hungarian matching algorithm across all unplaced patients and available beds.
        """
        if not patients or not beds:
            return {
                "matched_count": 0,
                "unassigned_patients": [p.get("patient_id") for p in patients],
                "unoccupied_beds": [b.get("bed_id") for b in beds if b.get("status") == "Available"],
                "total_matching_cost": 0.0,
                "allocation_efficiency_pct": 0.0,
                "assignments": [],
                "bipartite_graph": {"patients": [], "beds": [], "edges": []},
            }

        # Build cost matrix
        cost_matrix: List[List[float]] = []
        reason_matrix: List[List[List[str]]] = []

        for p in patients:
            row_costs = []
            row_reasons = []
            for b in beds:
                c, r = cls.calculate_compatibility_cost(p, b)
                row_costs.append(c)
                row_reasons.append(r)
            cost_matrix.append(row_costs)
            reason_matrix.append(row_reasons)

        assignment_indices, total_cost = HungarianAlgorithm.solve(cost_matrix)

        assigned_pairs = []
        assigned_bed_indices = set()
        unassigned_patients = []

        for p_idx, b_idx in enumerate(assignment_indices):
            patient = patients[p_idx]
            if b_idx != -1 and b_idx < len(beds) and cost_matrix[p_idx][b_idx] < 2000.0:
                bed = beds[b_idx]
                assigned_bed_indices.add(b_idx)
                cost_val = cost_matrix[p_idx][b_idx]
                reasons = reason_matrix[p_idx][b_idx]
                
                # Compute quality percentage: 1.0 cost = 100%, 100 cost = 50%
                quality_pct = max(10, min(100, int(100.0 - (cost_val * 0.5))))

                assigned_pairs.append({
                    "patient_id": patient.get("patient_id"),
                    "patient_name": patient.get("full_name") or patient.get("name"),
                    "patient_priority": patient.get("priority", 3),
                    "patient_condition": patient.get("reported_concern") or patient.get("condition", "General"),
                    "bed_id": bed.get("bed_id"),
                    "bed_number": bed.get("bed_number") or bed.get("bed_id"),
                    "ward": bed.get("ward", "General"),
                    "matching_cost": round(cost_val, 2),
                    "match_quality_percentage": quality_pct,
                    "clinical_rationale": reasons,
                })
            else:
                unassigned_patients.append({
                    "patient_id": patient.get("patient_id"),
                    "name": patient.get("full_name") or patient.get("name"),
                    "priority": patient.get("priority", 3),
                    "reason": "No clinically compatible bed with required capabilities available.",
                })

        unoccupied_beds = []
        for b_idx, bed in enumerate(beds):
            if b_idx not in assigned_bed_indices and bed.get("status") == "Available":
                unoccupied_beds.append({
                    "bed_id": bed.get("bed_id"),
                    "bed_number": bed.get("bed_number") or bed.get("bed_id"),
                    "ward": bed.get("ward", "General"),
                })

        # Global allocation efficiency metric
        if assigned_pairs:
            avg_quality = sum(pair["match_quality_percentage"] for pair in assigned_pairs) / len(assigned_pairs)
            efficiency = round(avg_quality, 1)
        else:
            efficiency = 0.0

        # Construct bipartite graph representation for UI visualization
        graph_nodes_patients = [
            {
                "id": p.get("patient_id"),
                "name": p.get("full_name") or p.get("name"),
                "priority": p.get("priority", 3),
                "side": "patient",
            }
            for p in patients
        ]
        graph_nodes_beds = [
            {
                "id": b.get("bed_id"),
                "name": f"{b.get('ward')} ({b.get('bed_number') or b.get('bed_id')})",
                "ward": b.get("ward"),
                "side": "bed",
            }
            for b in beds
        ]
        graph_edges = [
            {
                "source": pair["patient_id"],
                "target": pair["bed_id"],
                "cost": pair["matching_cost"],
                "quality": pair["match_quality_percentage"],
            }
            for pair in assigned_pairs
        ]

        return {
            "algorithm": "Hungarian Algorithm (Kuhn-Munkres Bipartite Matching)",
            "complexity": "O(V^3) Polynomial Time Guarantee",
            "total_patients_evaluated": len(patients),
            "total_beds_evaluated": len(beds),
            "matched_count": len(assigned_pairs),
            "unassigned_patient_count": len(unassigned_patients),
            "remaining_bed_count": len(unoccupied_beds),
            "total_optimal_cost": total_cost,
            "allocation_efficiency_pct": efficiency,
            "assignments": assigned_pairs,
            "unassigned_patients": unassigned_patients,
            "unoccupied_beds": unoccupied_beds,
            "bipartite_graph": {
                "patients": graph_nodes_patients,
                "beds": graph_nodes_beds,
                "matching_edges": graph_edges,
            },
        }
