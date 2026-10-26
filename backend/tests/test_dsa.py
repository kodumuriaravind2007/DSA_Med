import pytest
import time
from backend.dsa.min_heap import PriorityMinHeap, PatientQueueNode
from backend.dsa.bst import BinarySearchTree, AVLTree
from backend.dsa.hash_table import CustomHashTable
from backend.dsa.graph import HospitalResourceGraph
from backend.dsa.audit_chain import AuditChainVerifier, compute_audit_hash, GENESIS_HASH
from backend.dsa.duplicate_detector import (
    DuplicateDetector, levenshtein_distance, name_similarity_score, normalize_phone
)
from backend.dsa.waiting_time_estimator import WaitingTimeEstimator
from backend.routers.cds import evaluate_clinical_rules


def test_priority_min_heap_ordering():
    heap = PriorityMinHeap()
    t0 = 1000.0

    # Insert Priority 3 arrived early
    heap.insert(PatientQueueNode("P3-early", "Alice", 3, t0))
    # Insert Priority 1 arrived late
    heap.insert(PatientQueueNode("P1-late", "Bob", 1, t0 + 500))
    # Insert Priority 2 arrived middle
    heap.insert(PatientQueueNode("P2-mid", "Charlie", 2, t0 + 200))
    # Insert another Priority 1 arrived earlier
    heap.insert(PatientQueueNode("P1-early", "David", 1, t0 + 100))

    # Expect: P1-early (Prio 1, 1100), then P1-late (Prio 1, 1500), then P2-mid (Prio 2), then P3-early (Prio 3)
    n1, _ = heap.extract_min()
    assert n1.patient_id == "P1-early"
    assert n1.priority == 1

    n2, _ = heap.extract_min()
    assert n2.patient_id == "P1-late"
    assert n2.priority == 1

    n3, _ = heap.extract_min()
    assert n3.patient_id == "P2-mid"
    assert n3.priority == 2

    n4, _ = heap.extract_min()
    assert n4.patient_id == "P3-early"
    assert n4.priority == 3


def test_bst_and_avl():
    bst = BinarySearchTree()
    avl = AVLTree()

    keys = [50, 30, 70, 20, 40, 60, 80]
    for k in keys:
        bst.insert(k, f"PT-{k}", {"val": k})
        avl.insert(k, f"PT-{k}", {"val": k})

    # Search existing
    node, trace = bst.search(40)
    assert node is not None
    assert node.key == 40
    assert len(trace) > 0

    # Search non-existing
    node_none, _ = bst.search(999)
    assert node_none is None

    # Inorder traversal produces strictly sorted keys
    inorder = bst.inorder_traversal()
    extracted_keys = [item["key"] for item in inorder]
    assert extracted_keys == sorted(keys)

    # Deletion test
    success, del_trace = bst.delete(30)
    assert success is True
    assert bst.search(30)[0] is None
    # Remaining keys should still be sorted
    inorder2 = bst.inorder_traversal()
    assert [item["key"] for item in inorder2] == [20, 40, 50, 60, 70, 80]


def test_custom_hash_table():
    ht = CustomHashTable(initial_capacity=8)
    ht.insert("phone:9876543210", "PT-101")
    ht.insert("phone:9876543211", "PT-102")
    ht.insert("email:sara@med.org", "PT-101")

    val, trace = ht.search("phone:9876543210")
    assert val == "PT-101"
    assert trace["found"] is True

    val_miss, trace_miss = ht.search("phone:0000000000")
    assert val_miss is None
    assert trace_miss["found"] is False


def test_hospital_resource_graph_bfs_dfs():
    g = HospitalResourceGraph()
    g.add_node("PT-1", "Patient 1", "patient")
    g.add_node("DEPT-EMG", "Emergency", "department")
    g.add_node("DOC-1", "Dr. A", "doctor", {"duty_status": "On Duty", "is_available": True})
    g.add_node("BED-1", "Bed 1", "bed", {"status": "Available"})

    g.add_edge("PT-1", "DEPT-EMG", "registered_in")
    g.add_edge("DOC-1", "DEPT-EMG", "belongs_to")
    g.add_edge("BED-1", "DEPT-EMG", "located_in")

    bfs_res = g.bfs_traversal("PT-1")
    assert "PT-1" in bfs_res["visited_order"]
    assert "DEPT-EMG" in bfs_res["visited_order"]
    assert len(bfs_res["visited_order"]) == 4

    dfs_res = g.dfs_traversal("PT-1")
    assert len(dfs_res["visited_order"]) == 4

    match = g.find_resource_path("PT-1", "Emergency")
    assert match["success"] is True
    assert match["matched_doctor"]["id"] == "DOC-1"
    assert match["matched_bed"]["id"] == "BED-1"


def test_audit_chain_verification_and_tampering():
    events = []
    prev_h = GENESIS_HASH

    for i in range(4):
        ts = f"2026-10-18T10:0{i}:00"
        actor = "Nurse"
        action = f"ACTION_{i}"
        rec_id = f"REC-{i}"
        details = f"Detail payload {i}"
        curr_h = compute_audit_hash(prev_h, ts, actor, action, rec_id, details)
        events.append({
            "id": i + 1,
            "timestamp": ts,
            "actor": actor,
            "action": action,
            "record_id": rec_id,
            "details": details,
            "prev_hash": prev_h,
            "current_hash": curr_h,
        })
        prev_h = curr_h

    # Initial valid chain
    result = AuditChainVerifier.verify_chain(events)
    assert result["is_valid"] is True
    assert result["verified_blocks"] == 4

    # Tamper with block 2
    events[2]["details"] = "Altered unauthorized text"
    tampered_result = AuditChainVerifier.verify_chain(events)
    assert tampered_result["is_valid"] is False
    assert tampered_result["tampered_index"] == 2


def test_duplicate_detection_and_levenshtein():
    assert levenshtein_distance("Rajesh", "Rajesh") == 0
    assert levenshtein_distance("Kiran", "Karan") == 1

    sim = name_similarity_score("Rajesh Kumar", "Rajesh K. Kumar")
    assert sim >= 0.70

    detector = DuplicateDetector()
    existing = [
        {"patient_id": "PT-1", "full_name": "Rajesh Kumar", "phone": "9876543210", "email": "r@k.com", "date_of_birth": "1985-05-10", "gender": "Male"},
        {"patient_id": "PT-2", "full_name": "Deepa Roy", "phone": "9999988888", "email": "d@r.com", "date_of_birth": "1992-01-15", "gender": "Female"}
    ]
    candidate = {"patient_id": "PT-3", "full_name": "Rajesh K Kumar", "phone": "9876543210", "email": "rajesh3@gmail.com", "date_of_birth": "1985-05-10", "gender": "Male"}

    matches = detector.find_potential_duplicates(candidate, existing, threshold=0.7)
    assert len(matches) == 1
    assert matches[0]["matched_patient_id"] == "PT-1"
    assert "Exact Phone Match" in matches[0]["matched_fields"]


def test_clinical_decision_support_rules():
    # Severe hypoxemia should trigger Critical Priority 1
    res = evaluate_clinical_rules("Shortness of breath", 45, {"oxygen_saturation_spo2": 86, "heart_rate": 115})
    assert res["suggested_priority"] == 1
    assert any(r["rule_id"] == "CRIT-RESP-01" for r in res["triggered_rules"])

    # High fever in child should suggest Pediatrics and Priority 2
    res_child = evaluate_clinical_rules("Fever", 8, {"temperature_f": 103.5})
    assert res_child["suggested_priority"] == 2
    assert res_child["suggested_department"] == "Pediatrics"


def test_waiting_time_estimator():
    wait = WaitingTimeEstimator.calculate_estimated_wait(
        patient_priority=2,
        patients_ahead=[
            {"priority": 1},  # 30 mins
            {"priority": 2},  # 20 mins
        ],
        active_doctors_count=2
    )
    # Total service = 30 + 20 = 50 mins. Divided by 2 doctors = 25 mins.
    assert wait["estimated_wait_minutes"] == 25
