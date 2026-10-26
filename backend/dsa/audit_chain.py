"""
Tamper-Evident Cryptographic Audit Trail using SHA-256 Hash Chaining.

Core concepts:
- Every event is recorded with:
  * Event ID
  * ISO Timestamp
  * Actor (user, doctor, nurse, system)
  * Action (REGISTER_PATIENT, UPDATE_STATUS, ALLOCATE_BED, ASSIGN_DOCTOR, LAB_ORDER, LAB_RESULT, EXPORT_DATA, etc.)
  * Related Record ID
  * Event Details (JSON payload or string)
  * Previous Block Hash (SHA-256)
  * Current Block Hash (SHA-256)

Integrity Verification:
- Verifies that:
  1. Block[0].previous_hash == GENESIS_HASH
  2. For every i > 0, Block[i].previous_hash == Block[i-1].current_hash
  3. Recomputed SHA-256 of Block[i] fields exactly matches Block[i].current_hash

Complexity:
- Verification: O(N) linear scan over N audit entries
- Appending new event: O(1) hash computation
"""

import hashlib
import json
from typing import List, Dict, Any, Tuple, Optional

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def canonicalize_details(details: Any) -> str:
    """Produces canonical deterministic string for hashing and storage."""
    if isinstance(details, (dict, list)):
        return json.dumps(details, sort_keys=True)
    d_str = str(details or "")
    try:
        parsed = json.loads(d_str)
        if isinstance(parsed, (dict, list)):
            return json.dumps(parsed, sort_keys=True)
    except Exception:
        pass
    return d_str


def compute_audit_hash(
    prev_hash: str,
    timestamp: str,
    actor: str,
    action: str,
    record_id: str,
    details: Any
) -> str:
    """
    Computes deterministic SHA-256 hash over canonical representation
    of audit event attributes.
    """
    details_str = canonicalize_details(details)
    payload = f"{prev_hash}|{timestamp}|{actor}|{action}|{record_id}|{details_str}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class AuditChainVerifier:
    @staticmethod
    def verify_chain(events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates entire audit trail.
        Returns detailed verification status, broken block index (if any),
        and verification metrics.
        """
        if not events:
            return {
                "is_valid": True,
                "total_events": 0,
                "verified_blocks": 0,
                "message": "Audit trail is empty. No integrity violations.",
            }

        verified_count = 0
        expected_prev_hash = GENESIS_HASH

        for idx, event in enumerate(events):
            actual_prev_hash = event.get("prev_hash")
            stored_current_hash = event.get("current_hash")
            timestamp = str(event.get("timestamp", ""))
            actor = str(event.get("actor", ""))
            action = str(event.get("action", ""))
            record_id = str(event.get("record_id", ""))
            details = event.get("details", "")

            # Check 1: Previous hash link
            if actual_prev_hash != expected_prev_hash:
                return {
                    "is_valid": False,
                    "tampered_index": idx,
                    "event_id": event.get("id"),
                    "error_type": "PREV_HASH_MISMATCH",
                    "expected_prev_hash": expected_prev_hash,
                    "actual_prev_hash": actual_prev_hash,
                    "message": f"Tampering detected at block #{idx} (Event {event.get('id')}): Previous hash pointer is broken!",
                }

            # Check 2: Content integrity
            recomputed = compute_audit_hash(actual_prev_hash, timestamp, actor, action, record_id, details)
            if recomputed != stored_current_hash:
                return {
                    "is_valid": False,
                    "tampered_index": idx,
                    "event_id": event.get("id"),
                    "error_type": "HASH_CORRUPTION",
                    "expected_hash": recomputed,
                    "stored_hash": stored_current_hash,
                    "message": f"Tampering detected at block #{idx} (Event {event.get('id')}): Payload modified! SHA-256 recomputation failed.",
                }

            expected_prev_hash = stored_current_hash
            verified_count += 1

        return {
            "is_valid": True,
            "total_events": len(events),
            "verified_blocks": verified_count,
            "latest_hash": expected_prev_hash,
            "message": f"Cryptographic integrity verified across all {verified_count} audit blocks. No tampering detected.",
        }
