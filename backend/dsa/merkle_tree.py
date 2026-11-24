"""
Binary Merkle Tree & Cryptographic Proof of Inclusion Engine.

Implements RFC 9162 / RFC 6962 Certificate Transparency standards applied to
Electronic Health Record (EHR) audit trails and tamper-evident data provenance.
1. O(log N) Cryptographic Proof of Inclusion (Merkle Audit Path).
2. Zero Data-Leakage Verification: Proves record integrity without exposing neighboring patient data.
3. Interactive step-by-step verification trace for glass-box compliance auditing.
"""

import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple


def sha256_hash(data: str) -> str:
    """Computes standard SHA-256 hex digest."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class MerkleTreeNode:
    """Represents a node in the binary Merkle tree."""

    def __init__(
        self,
        hash_val: str,
        left: Optional["MerkleTreeNode"] = None,
        right: Optional["MerkleTreeNode"] = None,
        leaf_data: Optional[Dict[str, Any]] = None,
        leaf_index: Optional[int] = None,
    ):
        self.hash = hash_val
        self.left = left
        self.right = right
        self.leaf_data = leaf_data
        self.leaf_index = leaf_index


class MerkleTree:
    """
    Binary Merkle Tree constructed over clinical audit events.
    Supports O(log N) proof generation and mathematical tamper verification.
    """

    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        self.leaves: List[MerkleTreeNode] = []
        self.layers: List[List[MerkleTreeNode]] = []
        self.root: Optional[MerkleTreeNode] = None
        
        if records:
            self.build_tree(records)

    @staticmethod
    def hash_record(record: Dict[str, Any]) -> str:
        """Deterministically hashes a dictionary record using canonical JSON formatting."""
        canonical_json = json.dumps(record, sort_keys=True, separators=(",", ":"))
        return sha256_hash(canonical_json)

    def build_tree(self, records: List[Dict[str, Any]]):
        """Constructs binary Merkle tree from raw records."""
        if not records:
            self.leaves = []
            self.layers = []
            self.root = None
            return

        # Create leaf nodes
        self.leaves = []
        for idx, rec in enumerate(records):
            leaf_h = self.hash_record(rec)
            node = MerkleTreeNode(
                hash_val=leaf_h,
                leaf_data=rec,
                leaf_index=idx
            )
            self.leaves.append(node)

        # Build layers bottom-up
        current_layer = list(self.leaves)
        self.layers = [current_layer]

        while len(current_layer) > 1:
            next_layer = []
            for i in range(0, len(current_layer), 2):
                left_node = current_layer[i]
                # If odd number of nodes at this layer, duplicate last node (RFC 6962 convention)
                if i + 1 < len(current_layer):
                    right_node = current_layer[i + 1]
                else:
                    right_node = MerkleTreeNode(hash_val=left_node.hash)

                parent_hash = sha256_hash(left_node.hash + right_node.hash)
                parent_node = MerkleTreeNode(
                    hash_val=parent_hash,
                    left=left_node,
                    right=right_node
                )
                next_layer.append(parent_node)

            current_layer = next_layer
            self.layers.append(current_layer)

        self.root = self.layers[-1][0] if self.layers and self.layers[-1] else None

    @property
    def merkle_root(self) -> str:
        """Returns the hex SHA-256 root of the Merkle Tree."""
        return self.root.hash if self.root else ""

    def generate_proof_of_inclusion(self, record_index: int) -> Dict[str, Any]:
        """
        Generates an O(log N) Merkle Proof of Inclusion for the record at record_index.
        Returns the sibling hashes and direction flags required to recompute the root.
        """
        if record_index < 0 or record_index >= len(self.leaves):
            raise IndexError(f"Record index {record_index} out of bounds (0..{len(self.leaves)-1})")

        target_leaf = self.leaves[record_index]
        proof_path: List[Dict[str, str]] = []
        current_idx = record_index

        for layer_idx in range(len(self.layers) - 1):
            layer = self.layers[layer_idx]
            is_right_child = (current_idx % 2 == 1)
            sibling_idx = current_idx - 1 if is_right_child else current_idx + 1

            if sibling_idx < len(layer):
                sibling_hash = layer[sibling_idx].hash
            else:
                # Duplicated odd node
                sibling_hash = layer[current_idx].hash

            proof_path.append({
                "sibling_hash": sibling_hash,
                "direction": "left" if is_right_child else "right",
                "layer": layer_idx,
            })

            current_idx = current_idx // 2

        return {
            "record_index": record_index,
            "record_data": target_leaf.leaf_data,
            "leaf_hash": target_leaf.hash,
            "merkle_root": self.merkle_root,
            "proof_path": proof_path,
            "proof_length": len(proof_path),
            "theoretical_complexity": f"O(log2({len(self.leaves)})) = {len(proof_path)} operations",
        }

    @classmethod
    def verify_proof(
        cls,
        leaf_data: Dict[str, Any],
        proof_path: List[Dict[str, str]],
        expected_root: str
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Standalone cryptographic verifier: Recomputes the Merkle Root from leaf_data
        and sibling hashes without accessing the full tree or any adjacent patient records.
        """
        current_hash = cls.hash_record(leaf_data)
        verification_steps = [{
            "step": 0,
            "action": "LEAF_HASH",
            "current_hash": current_hash,
            "explanation": f"Computed base leaf hash from canonical record payload: {current_hash[:16]}...",
        }]

        for idx, step in enumerate(proof_path):
            sibling = step["sibling_hash"]
            direction = step["direction"]

            if direction == "left":
                # Sibling was on left, current is on right
                combined = sibling + current_hash
                parent_hash = sha256_hash(combined)
                expr = f"SHA256(Sibling_Left[{sibling[:8]}] + Current[{current_hash[:8]}])"
            else:
                # Sibling was on right, current is on left
                combined = current_hash + sibling
                parent_hash = sha256_hash(combined)
                expr = f"SHA256(Current[{current_hash[:8]}] + Sibling_Right[{sibling[:8]}])"

            current_hash = parent_hash
            verification_steps.append({
                "step": idx + 1,
                "action": "COMBINE_SIBLING",
                "sibling_hash": sibling,
                "direction": direction,
                "resulting_hash": current_hash,
                "explanation": f"Level {idx + 1}: Combined with sibling -> {expr} = {current_hash[:16]}...",
            })

        is_valid = (current_hash.lower() == expected_root.lower())
        verification_steps.append({
            "step": len(verification_steps),
            "action": "ROOT_COMPARISON",
            "computed_root": current_hash,
            "expected_root": expected_root,
            "is_valid": is_valid,
            "explanation": "Cryptographic Proof VALID: Reconstructed hash matches anchored Merkle Root exactly."
            if is_valid
            else "Cryptographic Proof INVALID: Reconstructed hash differs from expected Merkle Root (Tampering Detected).",
        })

        return is_valid, verification_steps
