"""
DSA Module Package for MedTree X.
Contains:
- PriorityMinHeap
- BinarySearchTree & AVLTree
- CustomHashTable
- HospitalResourceGraph
- DuplicateDetector
- AuditChainVerifier
- WaitingTimeEstimator
"""

from .min_heap import PriorityMinHeap, PatientQueueNode
from .bst import BinarySearchTree, AVLTree, BSTNode
from .hash_table import CustomHashTable
from .graph import HospitalResourceGraph
from .duplicate_detector import DuplicateDetector, levenshtein_distance, name_similarity_score
from .audit_chain import AuditChainVerifier, compute_audit_hash, GENESIS_HASH
from .waiting_time_estimator import WaitingTimeEstimator

__all__ = [
    "PriorityMinHeap",
    "PatientQueueNode",
    "BinarySearchTree",
    "AVLTree",
    "BSTNode",
    "CustomHashTable",
    "HospitalResourceGraph",
    "DuplicateDetector",
    "levenshtein_distance",
    "name_similarity_score",
    "AuditChainVerifier",
    "compute_audit_hash",
    "GENESIS_HASH",
    "WaitingTimeEstimator",
]
