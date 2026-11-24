"""
DSA Board Interactive API Router.

Powers the dedicated educational workspace for:
- Binary Search Tree (BST) & AVL Self-Balancing Tree
- Priority Min-Heap & Binary Heap Tree
- Custom Hash Table & Separate Chaining Collision Analysis
- Hospital Resource Graph (Live BFS, DFS, Pathfinding)
- Queue vs Timeline Comparative Model
- Master DSA Complexity Matrix
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import time

from ..database import get_db
from ..models import Patient, Doctor, Bed
from ..dsa.bst import BinarySearchTree, AVLTree
from ..dsa.min_heap import PriorityMinHeap, PatientQueueNode
from ..dsa.hash_table import CustomHashTable
from ..dsa.graph import HospitalResourceGraph
from ..routers.resources import build_live_resource_graph
from ..routers.queue import build_live_heap

router = APIRouter(prefix="/api/dsa", tags=["Professional DSA Board"])


# --- IN-MEMORY DEMO INSTANCES FOR NON-DESTRUCTIVE TESTING ---
demo_bst = BinarySearchTree()
demo_avl = AVLTree()
demo_heap = PriorityMinHeap()
demo_hash_table = CustomHashTable(initial_capacity=16)

# Pre-populate demo BST & AVL
for k, p_id, name in [
    (105, "PT-105", "Priya Sharma"),
    (102, "PT-102", "Amit Patel"),
    (108, "PT-108", "Rahul Sen"),
    (101, "PT-101", "Sara Khan"),
    (103, "PT-103", "Kavita Reddy"),
    (106, "PT-106", "Vikram Malhotra"),
    (110, "PT-110", "Neha Gupta"),
]:
    demo_bst.insert(k, p_id, {"name": name, "dept": "Emergency"})
    demo_avl.insert(k, p_id, {"name": name, "dept": "Emergency"})

# Pre-populate demo heap
now = time.time()
demo_heap.insert(PatientQueueNode("PT-101", "Sara Khan", 1, now - 600, "Severe Chest Pain", "Cardiology"))
demo_heap.insert(PatientQueueNode("PT-102", "Amit Patel", 2, now - 500, "Fractured Arm", "Orthopedics"))
demo_heap.insert(PatientQueueNode("PT-103", "Kavita Reddy", 3, now - 400, "Fever & Cough", "General Medicine"))
demo_heap.insert(PatientQueueNode("PT-104", "Rohan Das", 1, now - 300, "Acute Respiratory Distress", "Emergency"))
demo_heap.insert(PatientQueueNode("PT-105", "Priya Sharma", 2, now - 200, "Severe Migraine", "Neurology"))

# Pre-populate demo hash table
for key, val in [
    ("9876543210", {"patient_id": "PT-101", "name": "Sara Khan"}),
    ("9876543211", {"patient_id": "PT-102", "name": "Amit Patel"}),
    ("9123456789", {"patient_id": "PT-103", "name": "Kavita Reddy"}),
    ("PT-101", {"name": "Sara Khan", "priority": 1}),
    ("PT-102", {"name": "Amit Patel", "priority": 2}),
    ("PT-103", {"name": "Kavita Reddy", "priority": 3}),
]:
    demo_hash_table.insert(key, val)


class BSTInsertRequest(BaseModel):
    key: int
    patient_id: str
    patient_name: str
    department: str = "General Medicine"


class HeapInsertRequest(BaseModel):
    patient_id: str
    patient_name: str
    priority: int
    concern: str
    department: str = "Emergency"


class HashInsertRequest(BaseModel):
    key: str
    value: str


# --- 1. BINARY SEARCH TREE & AVL ---

@router.get("/bst/live")
def get_live_bst(db: Session = Depends(get_db)):
    """Builds a real BST directly from all existing patients in the database."""
    patients = db.query(Patient).all()
    bst = BinarySearchTree()
    avl = AVLTree()

    for p in patients:
        try:
            numeric_key = int(p.patient_id.replace("PT-", ""))
        except ValueError:
            numeric_key = abs(hash(p.patient_id)) % 1000

        data = {
            "name": p.full_name,
            "department": p.department,
            "priority": p.priority,
            "status": p.status
        }
        bst.insert(numeric_key, p.patient_id, data)
        avl.insert(numeric_key, p.patient_id, data)

    return {
        "bst_tree": bst.to_json(),
        "avl_tree": avl.to_json(),
        "bst_height": bst.get_height(),
        "avl_height": avl.get_height(),
        "inorder_sorted_keys": bst.inorder_traversal(),
        "is_balanced_guaranteed": avl.get_height() <= (1.44 * (len(patients).bit_length() or 1)),
    }


@router.get("/bst/demo")
def get_demo_bst():
    """Returns the current state of the demo BST and AVL tree."""
    return {
        "bst_tree": demo_bst.to_json(),
        "avl_tree": demo_avl.to_json(),
        "bst_height": demo_bst.get_height(),
        "avl_height": demo_avl.get_height(),
        "inorder_sorted": demo_bst.inorder_traversal(),
    }


@router.post("/bst/demo/insert")
def demo_bst_insert(req: BSTInsertRequest):
    """Inserts a demo key into both BST and AVL tree, returning trace."""
    data = {"name": req.patient_name, "dept": req.department}
    bst_trace = demo_bst.insert(req.key, req.patient_id, data)
    avl_trace = demo_avl.insert(req.key, req.patient_id, data)

    return {
        "inserted_key": req.key,
        "bst_trace": bst_trace,
        "avl_trace": avl_trace,
        "bst_tree": demo_bst.to_json(),
        "avl_tree": demo_avl.to_json(),
        "bst_height": demo_bst.get_height(),
        "avl_height": demo_avl.get_height(),
    }


@router.post("/bst/demo/search")
def demo_bst_search(key: int):
    """Searches for a key in the demo BST, returning the step-by-step traversal path."""
    node, trace = demo_bst.search(key)
    return {
        "searched_key": key,
        "found": node is not None,
        "matched_patient": node.to_dict() if node else None,
        "search_path": trace,
        "comparisons": len(trace) - (1 if not node else 0),
    }


@router.post("/bst/demo/delete")
def demo_bst_delete(key: int):
    """Deletes a key from the demo BST, explaining child substitution or in-order successor."""
    found, trace = demo_bst.delete(key)
    return {
        "deleted_key": key,
        "success": found,
        "trace": trace,
        "bst_tree": demo_bst.to_json(),
        "new_height": demo_bst.get_height(),
    }


@router.get("/bst/degradation-demo")
def demonstrate_bst_vs_avl_degradation():
    """
    Shows what happens when sorted keys (e.g., 100, 101, 102, 103, 104, 105, 106)
    are inserted sequentially.
    - BST degrades to a skewed linked list: Height = N, Search = O(N)
    - AVL rotates (RR rotations) to stay balanced: Height = log2(N), Search = O(log N)
    """
    sorted_keys = [100, 101, 102, 103, 104, 105, 106]
    test_bst = BinarySearchTree()
    test_avl = AVLTree()

    for k in sorted_keys:
        test_bst.insert(k, f"PT-{k}", {"note": "Sequential entry"})
        test_avl.insert(k, f"PT-{k}", {"note": "Sequential entry"})

    return {
        "sequence": sorted_keys,
        "bst": {
            "type": "Unbalanced Standard BST",
            "height": test_bst.get_height(),
            "tree": test_bst.to_json(),
            "worst_case_lookup_comparisons": test_bst.get_height(),
            "complexity": "Degraded to O(N) linear linked list",
        },
        "avl": {
            "type": "Self-Balancing AVL Tree",
            "height": test_avl.get_height(),
            "tree": test_avl.to_json(),
            "worst_case_lookup_comparisons": test_avl.get_height(),
            "complexity": "Maintained at O(log2 N) via automatic tree rotations",
        },
        "explanation": "Inserting sorted records into an unaugmented BST creates an O(N) skewed chain. AVL trees use height balance factors to trigger rotations, preserving logarithmic bounds."
    }


# --- 2. PRIORITY MIN-HEAP ---

@router.get("/heap/live")
def get_live_heap_view(db: Session = Depends(get_db)):
    """Returns the live heap state for waiting patients."""
    heap = build_live_heap(db)
    return {
        "total_nodes": heap.size(),
        "peek_root": heap.peek().to_dict() if heap.peek() else None,
        "tree_representation": heap.to_tree_json(),
        "array_representation": heap.to_array_representation(),
    }


@router.get("/heap/demo")
def get_demo_heap():
    """Returns the current state of demo heap."""
    return {
        "total_nodes": demo_heap.size(),
        "peek_root": demo_heap.peek().to_dict() if demo_heap.peek() else None,
        "tree_representation": demo_heap.to_tree_json(),
        "array_representation": demo_heap.to_array_representation(),
    }


@router.post("/heap/demo/insert")
def demo_heap_insert(req: HeapInsertRequest):
    """Inserts a node into the demo heap and traces sift-up swaps."""
    node = PatientQueueNode(
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        priority=req.priority,
        arrival_time=time.time(),
        reported_concern=req.concern,
        department=req.department,
    )
    trace = demo_heap.insert(node)
    return {
        "inserted_node": node.to_dict(),
        "sift_up_trace": trace,
        "tree_representation": demo_heap.to_tree_json(),
        "array_representation": demo_heap.to_array_representation(),
    }


@router.post("/heap/demo/extract-min")
def demo_heap_extract():
    """Extracts the root (highest priority) and traces sift-down swaps."""
    extracted, trace = demo_heap.extract_min()
    return {
        "extracted_node": extracted.to_dict() if extracted else None,
        "sift_down_trace": trace,
        "remaining_size": demo_heap.size(),
        "tree_representation": demo_heap.to_tree_json(),
        "array_representation": demo_heap.to_array_representation(),
    }


# --- 3. HASH TABLE ---

@router.get("/hash-table/demo")
def get_demo_hash_table():
    """Returns demo hash table buckets, load factor, and collision count."""
    return {
        "capacity": demo_hash_table.capacity,
        "size": demo_hash_table.size,
        "load_factor": demo_hash_table.load_factor,
        "total_collisions": demo_hash_table.total_collisions,
        "buckets": demo_hash_table.get_bucket_distribution(),
    }


@router.post("/hash-table/demo/lookup")
def demo_hash_table_lookup(key: str):
    """Looks up a key in the demo hash table, reporting bucket index and probe steps."""
    val, trace = demo_hash_table.search(key)
    return {
        "key": key,
        "value": val,
        "trace": trace,
    }


@router.post("/hash-table/demo/insert")
def demo_hash_table_insert(req: HashInsertRequest):
    """Inserts a key-value into the demo hash table and returns collision trace."""
    trace = demo_hash_table.insert(req.key, req.value)
    return {
        "trace": trace,
        "load_factor": demo_hash_table.load_factor,
        "buckets": demo_hash_table.get_bucket_distribution(),
    }


# --- 4. HOSPITAL RESOURCE GRAPH ---

@router.get("/graph/demo")
def get_demo_graph(db: Session = Depends(get_db)):
    """Returns graph representation with live nodes and edges."""
    g = build_live_resource_graph(db)
    return g.to_graph_data()


@router.post("/graph/bfs")
def run_demo_bfs(start_node_id: str, db: Session = Depends(get_db)):
    """Runs BFS on the hospital graph."""
    g = build_live_resource_graph(db)
    return g.bfs_traversal(start_node_id)


@router.post("/graph/dfs")
def run_demo_dfs(start_node_id: str, db: Session = Depends(get_db)):
    """Runs DFS on the hospital graph."""
    g = build_live_resource_graph(db)
    return g.dfs_traversal(start_node_id)


# --- 5. QUEUE VS TIMELINE COMPARISON ---

@router.get("/queue-vs-timeline/{patient_id}")
def compare_queue_and_timeline(patient_id: str, db: Session = Depends(get_db)):
    """
    Demonstrates the structural distinction between:
    1. Priority Queue (Dynamic scheduling based on clinical urgency & arrival preemption)
    2. Chronological Timeline (Immutable chronological log of hospital lifecycle events)
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        patient = db.query(Patient).first()

    timeline_events = (
        db.query(Patient.patient_id, Patient.full_name, Patient.priority, Patient.arrival_time)
        .order_by(Patient.arrival_time.asc())
        .all()
    )

    heap = build_live_heap(db)
    heap_ordered = heap.get_ordered_queue()

    return {
        "patient_id": patient.patient_id if patient else "PT-101",
        "concepts": {
            "priority_queue": {
                "name": "Min-Heap Priority Queue",
                "purpose": "Dynamic scheduling & triage allocation",
                "ordering_rule": "Primary: Priority (1 > 2 > 3). Secondary: Arrival timestamp (FIFO tie-breaker).",
                "time_complexity": "O(1) peek next patient, O(log N) insert/extract",
                "current_order": [
                    {
                        "patient_id": n.patient_id,
                        "name": n.patient_name,
                        "priority": n.priority,
                        "arrival": datetime.fromtimestamp(n.arrival_time).strftime("%I:%M:%S %p")
                    }
                    for n in heap_ordered
                ]
            },
            "timeline": {
                "name": "Chronological Event Stream",
                "purpose": "Immutable clinical history & forensic event tracking",
                "ordering_rule": "Strictly chronological: T_0 < T_1 < T_2 ... (never reordered by urgency)",
                "time_complexity": "O(1) append event, O(N) linear time scan",
                "current_order": [
                    {
                        "patient_id": p[0],
                        "name": p[1],
                        "priority": p[2],
                        "arrival": datetime.fromtimestamp(p[3]).strftime("%I:%M:%S %p")
                    }
                    for p in timeline_events
                ]
            }
        },
        "pedagogical_summary": (
            "A Priority Queue alters arrival sequence to ensure critical patients are attended first. "
            "In contrast, the Patient Timeline preserves the exact historical order of clinical events."
        )
    }


# --- 6. MASTER DSA COMPLEXITY TABLE ---

@router.get("/complexity-matrix")
def get_dsa_complexity_matrix():
    """Returns master complexity table comparing all data structures in MedTree X."""
    return [
        {
            "data_structure": "Binary Search Tree (BST)",
            "use_case": "Patient ID index lookup & sorted traversal",
            "search_best": "O(1)",
            "search_avg": "O(log N)",
            "search_worst": "O(N) (skewed)",
            "insert_avg": "O(log N)",
            "delete_avg": "O(log N)",
            "space": "O(N)",
            "notes": "Unbalanced BST degrades to O(N) under sorted sequential insertions."
        },
        {
            "data_structure": "AVL Tree (Balanced BST)",
            "use_case": "Guaranteed logarithmic patient ID search",
            "search_best": "O(1)",
            "search_avg": "O(log N)",
            "search_worst": "O(log N)",
            "insert_avg": "O(log N)",
            "delete_avg": "O(log N)",
            "space": "O(N)",
            "notes": "Maintains |height(left) - height(right)| <= 1 via 4 rotation types (LL, RR, LR, RL)."
        },
        {
            "data_structure": "Priority Min-Heap",
            "use_case": "Patient triage flow & next patient dispatch",
            "search_best": "O(1) (peek root)",
            "search_avg": "O(1) peek",
            "search_worst": "O(N) arbitrary search",
            "insert_avg": "O(log N)",
            "delete_avg": "O(log N) (extract-min)",
            "space": "O(N) compact array",
            "notes": "Binary heap satisfies the heap property: parent <= children. Floyd's rebuild is O(N)."
        },
        {
            "data_structure": "Hash Table (Separate Chaining)",
            "use_case": "O(1) lookup by phone, email, and Aadhaar/Govt ID",
            "search_best": "O(1)",
            "search_avg": "O(1)",
            "search_worst": "O(N) (collision cluster)",
            "insert_avg": "O(1)",
            "delete_avg": "O(1)",
            "space": "O(N + M)",
            "notes": "Uses DJB2 hashing with separate chaining; dynamically doubles capacity when load factor > 0.75."
        },
        {
            "data_structure": "Hospital Resource Graph",
            "use_case": "Entity relationships (Patients, Doctors, Beds, Labs)",
            "search_best": "O(1) vertex lookup",
            "search_avg": "O(V + E) BFS/DFS",
            "search_worst": "O(V + E)",
            "insert_avg": "O(1) add vertex/edge",
            "delete_avg": "O(V + E) remove edge",
            "space": "O(V + E)",
            "notes": "Adjacency list representation enables shortest-path matching and department traversal."
        },
        {
            "data_structure": "Cryptographic Hash Chain",
            "use_case": "Tamper-evident audit trail & log verification",
            "search_best": "O(1) append",
            "search_avg": "O(1) append",
            "search_worst": "O(N) full verification",
            "insert_avg": "O(1)",
            "delete_avg": "N/A (Append-only immutable)",
            "space": "O(N)",
            "notes": "SHA-256 block hashing: Block[i] = SHA256(Block[i-1].hash + payload). Single modification breaks all downstream hashes."
        },
        {
            "data_structure": "Levenshtein Distance Matrix",
            "use_case": "Duplicate record name similarity detection",
            "search_best": "O(M * K)",
            "search_avg": "O(M * K) dynamic programming",
            "search_worst": "O(M * K)",
            "insert_avg": "N/A",
            "delete_avg": "N/A",
            "space": "O(M * K) or O(min(M,K))",
            "notes": "Calculates minimum insert/delete/substitute edit operations between patient names."
        }
    ]
