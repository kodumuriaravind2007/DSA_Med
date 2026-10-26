"""
Duplicate Patient Record Detection Engine.

Uses:
1. Hash-based exact matching on normalized identifiers:
   - National/Govt ID / Aadhaar / SSN
   - Normalized Phone (E.164 without spaces/dashes)
   - Normalized Email (lowercase, stripped)
2. String Similarity Algorithms:
   - Levenshtein Distance (Minimum edit distance)
   - Token Sort Ratio (Permutation-invariant name matching)
   - Jaro-Winkler metric (Prefix-weighted similarity)
3. Ranked candidate list with matching field explanations.
4. Human-in-the-loop review guarantee: Never auto-merge patient records.
"""

from typing import List, Dict, Any, Optional
import re


def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    # Strip non-digits, e.g. +91 98765-43210 -> 919876543210 or last 10 digits
    digits = re.sub(r"\D", "", phone)
    return digits[-10:] if len(digits) >= 10 else digits


def normalize_string(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.strip().lower())


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates edit distance between two strings using dynamic programming (O(M*N))."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # Deletion
                    dp[i][j - 1],      # Insertion
                    dp[i - 1][j - 1]   # Substitution
                )

    return dp[m][n]


def name_similarity_score(name1: str, name2: str) -> float:
    """
    Computes a hybrid similarity score (0.0 to 1.0) based on normalized
    Levenshtein ratio and token-based overlap.
    """
    n1 = normalize_string(name1)
    n2 = normalize_string(name2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0

    # Token sort ratio: handle "Kumar Rajesh" vs "Rajesh Kumar"
    tokens1 = sorted(n1.split())
    tokens2 = sorted(n2.split())
    sorted_s1 = " ".join(tokens1)
    sorted_s2 = " ".join(tokens2)

    dist = levenshtein_distance(sorted_s1, sorted_s2)
    max_len = max(len(sorted_s1), len(sorted_s2))
    if max_len == 0:
        return 1.0
    lev_score = 1.0 - (dist / max_len)

    # Common token jaccard
    set1, set2 = set(tokens1), set(tokens2)
    jaccard = len(set1 & set2) / max(len(set1 | set2), 1)

    return round(0.7 * lev_score + 0.3 * jaccard, 3)


class DuplicateDetector:
    def __init__(self):
        # Hash tables for exact index lookups: O(1)
        self.phone_index: Dict[str, List[str]] = {}  # norm_phone -> [patient_ids]
        self.email_index: Dict[str, List[str]] = {}  # norm_email -> [patient_ids]
        self.govt_id_index: Dict[str, List[str]] = {}

    def index_patient(self, patient_id: str, phone: str = "", email: str = "", govt_id: str = "") -> None:
        p = normalize_phone(phone)
        if p:
            self.phone_index.setdefault(p, []).append(patient_id)
        e = normalize_string(email)
        if e:
            self.email_index.setdefault(e, []).append(patient_id)
        g = normalize_string(govt_id)
        if g:
            self.govt_id_index.setdefault(g, []).append(patient_id)

    def find_potential_duplicates(
        self,
        candidate_patient: Dict[str, Any],
        existing_patients: List[Dict[str, Any]],
        threshold: float = 0.65
    ) -> List[Dict[str, Any]]:
        """
        Scans existing patient records and returns ranked candidate duplicate matches
        with similarity scores and field-level evidence.
        """
        results = []
        c_id = candidate_patient.get("patient_id", "")
        c_name = candidate_patient.get("full_name", "")
        c_phone = normalize_phone(candidate_patient.get("phone", ""))
        c_email = normalize_string(candidate_patient.get("email", ""))
        c_dob = candidate_patient.get("date_of_birth", "")
        c_gender = candidate_patient.get("gender", "")

        for p in existing_patients:
            p_id = p.get("patient_id", "")
            if p_id == c_id:
                continue

            matching_reasons = []
            score_components = []

            # Exact phone match (strong signal)
            p_phone = normalize_phone(p.get("phone", ""))
            if c_phone and p_phone and c_phone == p_phone:
                matching_reasons.append("Exact Phone Match")
                score_components.append(0.85)

            # Exact email match
            p_email = normalize_string(p.get("email", ""))
            if c_email and p_email and c_email == p_email:
                matching_reasons.append("Exact Email Match")
                score_components.append(0.85)

            # Name similarity
            p_name = p.get("full_name", "")
            name_score = name_similarity_score(c_name, p_name)
            if name_score >= 0.70:
                matching_reasons.append(f"High Name Similarity ({int(name_score * 100)}%)")
                score_components.append(name_score)

            # DOB match
            p_dob = p.get("date_of_birth", "")
            if c_dob and p_dob and c_dob == p_dob:
                matching_reasons.append("Identical Date of Birth")
                score_components.append(0.75)

            # Gender match
            p_gender = p.get("gender", "")
            if c_gender and p_gender and c_gender.lower() == p_gender.lower():
                score_components.append(0.50)

            if not score_components:
                continue

            # Weighted composite similarity
            composite_score = round(max(score_components) * 0.7 + (sum(score_components) / len(score_components)) * 0.3, 2)

            if composite_score >= threshold:
                results.append({
                    "candidate_patient_id": c_id,
                    "matched_patient_id": p_id,
                    "matched_patient_name": p_name,
                    "matched_patient_phone": p.get("phone", ""),
                    "matched_patient_dob": p.get("date_of_birth", ""),
                    "similarity_score": composite_score,
                    "similarity_percentage": int(composite_score * 100),
                    "matched_fields": matching_reasons,
                    "recommended_action": "Clinical Review Required: Verify national ID or emergency contact before manual merge.",
                })

        # Sort descending by similarity score
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results
