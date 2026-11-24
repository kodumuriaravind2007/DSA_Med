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
- NEWS2Engine (Early Warning Clinical Deterioration)
- DrugInteractionEngine (Pharmacological Interaction Network)
- STARTTriageEngine & run_mci_simulation (Disaster Mass Casualty Triage)
- Glass-Box DSA Visualizers (Levenshtein DP Grid & Heap Step-Through)
"""

from .min_heap import PriorityMinHeap, PatientQueueNode
from .bst import BinarySearchTree, AVLTree, BSTNode
from .hash_table import CustomHashTable
from .graph import HospitalResourceGraph
from .duplicate_detector import DuplicateDetector, levenshtein_distance, name_similarity_score
from .audit_chain import AuditChainVerifier, compute_audit_hash, GENESIS_HASH
from .waiting_time_estimator import WaitingTimeEstimator
from .news2_engine import NEWS2Engine
from .drug_interaction_graph import DrugInteractionEngine
from .mci_triage import STARTTriageEngine, run_mci_simulation, get_mci_scenarios
from .glass_box_visualizer import compute_levenshtein_dp_matrix, compute_heap_stepthrough
from .accumulating_queue import AccumulatingPriorityQueueEngine, APQPatientNode
from .bipartite_bed_matcher import BedAllocationEngine, HungarianAlgorithm
from .deterioration_trajectory import DeteriorationTrajectoryEngine
from .merkle_tree import MerkleTree, MerkleTreeNode

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
    "NEWS2Engine",
    "DrugInteractionEngine",
    "STARTTriageEngine",
    "run_mci_simulation",
    "get_mci_scenarios",
    "compute_levenshtein_dp_matrix",
    "compute_heap_stepthrough",
    "AccumulatingPriorityQueueEngine",
    "APQPatientNode",
    "BedAllocationEngine",
    "HungarianAlgorithm",
    "DeteriorationTrajectoryEngine",
    "MerkleTree",
    "MerkleTreeNode",
]
