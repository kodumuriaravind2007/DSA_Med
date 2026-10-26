"""
Priority Min-Heap implementation for Hospital Patient Triage Flow Engine.

Priority Levels:
- Priority 1: Critical (e.g., severe trauma, cardiac arrest, respiratory failure)
- Priority 2: Urgent (e.g., severe asthma, fractures, high fever with lethargy)
- Priority 3: Normal (e.g., mild fever, minor cuts, routine checkups)

Tie-breaking:
- When priorities are equal, the earlier arrival time (lower timestamp) has higher precedence (FIFO within priority).

Complexity:
- Peek: O(1)
- Insert: O(log N)
- Extract-Min: O(log N)
- Priority Update: O(N) lookup + O(log N) sift
- Heap Construction (Rebuild): O(N) using Floyd's build-heap algorithm
"""

from typing import List, Dict, Any, Optional
import time


class PatientQueueNode:
    def __init__(
        self,
        patient_id: str,
        patient_name: str,
        priority: int,  # 1 (Critical), 2 (Urgent), 3 (Normal)
        arrival_time: float,
        reported_concern: str = "",
        department: str = "Emergency",
        status: str = "Waiting",
        assigned_doctor_id: Optional[str] = None,
        estimated_service_mins: int = 15,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.patient_id = patient_id
        self.patient_name = patient_name
        self.priority = int(priority)
        self.arrival_time = float(arrival_time)
        self.reported_concern = reported_concern
        self.department = department
        self.status = status
        self.assigned_doctor_id = assigned_doctor_id
        self.estimated_service_mins = estimated_service_mins
        self.metadata = metadata or {}

    def key(self):
        """Composite key for min-heap comparison: (priority, arrival_time)."""
        return (self.priority, self.arrival_time)

    def __lt__(self, other: "PatientQueueNode") -> bool:
        return self.key() < other.key()

    def __le__(self, other: "PatientQueueNode") -> bool:
        return self.key() <= other.key()

    def __gt__(self, other: "PatientQueueNode") -> bool:
        return self.key() > other.key()

    def __ge__(self, other: "PatientQueueNode") -> bool:
        return self.key() >= other.key()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "priority": self.priority,
            "arrival_time": self.arrival_time,
            "reported_concern": self.reported_concern,
            "department": self.department,
            "status": self.status,
            "assigned_doctor_id": self.assigned_doctor_id,
            "estimated_service_mins": self.estimated_service_mins,
            "metadata": self.metadata,
        }


class PriorityMinHeap:
    def __init__(self):
        self.heap: List[PatientQueueNode] = []

    def size(self) -> int:
        return len(self.heap)

    def is_empty(self) -> bool:
        return len(self.heap) == 0

    def parent(self, i: int) -> int:
        return (i - 1) // 2

    def left_child(self, i: int) -> int:
        return 2 * i + 1

    def right_child(self, i: int) -> int:
        return 2 * i + 2

    def insert(self, node: PatientQueueNode) -> List[Dict[str, Any]]:
        """
        Inserts a patient node and bubbles it up.
        Returns step-by-step trace for DSA visualization.
        """
        trace = []
        self.heap.append(node)
        curr_idx = len(self.heap) - 1
        trace.append({
            "step": "append",
            "index": curr_idx,
            "node": node.to_dict(),
            "description": f"Appended {node.patient_id} at index {curr_idx}"
        })

        while curr_idx > 0:
            p_idx = self.parent(curr_idx)
            if self.heap[curr_idx] < self.heap[p_idx]:
                trace.append({
                    "step": "swap",
                    "from_index": curr_idx,
                    "to_index": p_idx,
                    "current": self.heap[curr_idx].to_dict(),
                    "parent": self.heap[p_idx].to_dict(),
                    "description": f"Sift-up: {self.heap[curr_idx].patient_id} (Priority {self.heap[curr_idx].priority}) higher precedence than {self.heap[p_idx].patient_id} (Priority {self.heap[p_idx].priority})"
                })
                self.heap[curr_idx], self.heap[p_idx] = self.heap[p_idx], self.heap[curr_idx]
                curr_idx = p_idx
            else:
                break

        return trace

    def peek(self) -> Optional[PatientQueueNode]:
        """Returns the highest priority (min key) patient without removing."""
        if not self.heap:
            return None
        return self.heap[0]

    def extract_min(self) -> tuple[Optional[PatientQueueNode], List[Dict[str, Any]]]:
        """
        Removes and returns highest-priority patient.
        Also returns step-by-step trace of the sift-down process.
        """
        if not self.heap:
            return None, []

        trace = []
        min_node = self.heap[0]
        trace.append({
            "step": "extract_root",
            "node": min_node.to_dict(),
            "description": f"Selected root {min_node.patient_id} for treatment"
        })

        if len(self.heap) == 1:
            self.heap.pop()
            return min_node, trace

        # Move the last element to root and sift down
        last_node = self.heap.pop()
        self.heap[0] = last_node
        trace.append({
            "step": "replace_root_with_last",
            "node": last_node.to_dict(),
            "description": f"Moved last leaf {last_node.patient_id} to root (index 0)"
        })

        self._sift_down(0, trace)
        return min_node, trace

    def _sift_down(self, i: int, trace: Optional[List[Dict[str, Any]]] = None) -> None:
        smallest = i
        n = len(self.heap)
        left = self.left_child(i)
        right = self.right_child(i)

        if left < n and self.heap[left] < self.heap[smallest]:
            smallest = left

        if right < n and self.heap[right] < self.heap[smallest]:
            smallest = right

        if smallest != i:
            if trace is not None:
                trace.append({
                    "step": "sift_down_swap",
                    "from_index": i,
                    "to_index": smallest,
                    "parent": self.heap[i].to_dict(),
                    "child": self.heap[smallest].to_dict(),
                    "description": f"Sift-down swap: index {i} ({self.heap[i].patient_id}) with smaller child index {smallest} ({self.heap[smallest].patient_id})"
                })
            self.heap[i], self.heap[smallest] = self.heap[smallest], self.heap[i]
            self._sift_down(smallest, trace)

    def remove(self, patient_id: str) -> bool:
        """Removes a specific patient by ID and restores the min-heap property."""
        idx = -1
        for i, node in enumerate(self.heap):
            if node.patient_id == patient_id:
                idx = i
                break
        if idx == -1:
            return False

        last_node = self.heap.pop()
        if idx < len(self.heap):
            self.heap[idx] = last_node
            # May need sift up or sift down
            p = self.parent(idx)
            if idx > 0 and self.heap[idx] < self.heap[p]:
                curr = idx
                while curr > 0 and self.heap[curr] < self.heap[self.parent(curr)]:
                    par = self.parent(curr)
                    self.heap[curr], self.heap[par] = self.heap[par], self.heap[curr]
                    curr = par
            else:
                self._sift_down(idx)
        return True

    def update_priority(self, patient_id: str, new_priority: int) -> bool:
        """Updates priority and reheapifies in O(log N)."""
        idx = -1
        for i, node in enumerate(self.heap):
            if node.patient_id == patient_id:
                idx = i
                break
        if idx == -1:
            return False

        old_priority = self.heap[idx].priority
        self.heap[idx].priority = int(new_priority)

        if new_priority < old_priority:
            # Priority improved (e.g. 3 -> 1): sift up
            curr = idx
            while curr > 0 and self.heap[curr] < self.heap[self.parent(curr)]:
                p = self.parent(curr)
                self.heap[curr], self.heap[p] = self.heap[p], self.heap[curr]
                curr = p
        else:
            # Priority worsened (e.g. 1 -> 3): sift down
            self._sift_down(idx)
        return True

    def rebuild_from_list(self, nodes: List[PatientQueueNode]) -> None:
        """Floyd's O(N) build-heap algorithm."""
        self.heap = list(nodes)
        n = len(self.heap)
        for i in range(n // 2 - 1, -1, -1):
            self._sift_down(i)

    def get_ordered_queue(self) -> List[PatientQueueNode]:
        """
        Returns a sorted list of all patients currently in the queue
        without destroying the internal heap.
        """
        temp_heap = list(self.heap)
        result = []
        # Simulate extraction
        while self.heap:
            node, _ = self.extract_min()
            if node:
                result.append(node)
        self.heap = temp_heap
        return result

    def to_tree_json(self) -> Optional[Dict[str, Any]]:
        """
        Serializes the heap into a hierarchical tree representation
        with left and right child pointers suitable for SVG/D3 rendering.
        """
        if not self.heap:
            return None

        def build_node(idx: int) -> Optional[Dict[str, Any]]:
            if idx >= len(self.heap):
                return None
            item = self.heap[idx]
            left_idx = self.left_child(idx)
            right_idx = self.right_child(idx)
            return {
                "index": idx,
                "patient_id": item.patient_id,
                "patient_name": item.patient_name,
                "priority": item.priority,
                "arrival_time": item.arrival_time,
                "concern": item.reported_concern,
                "department": item.department,
                "status": item.status,
                "left": build_node(left_idx),
                "right": build_node(right_idx),
            }

        return build_node(0)

    def to_array_representation(self) -> List[Dict[str, Any]]:
        """Returns the raw 0-indexed array with child pointer calculations."""
        res = []
        for i, node in enumerate(self.heap):
            res.append({
                "index": i,
                "parent_index": self.parent(i) if i > 0 else None,
                "left_child_index": self.left_child(i) if self.left_child(i) < len(self.heap) else None,
                "right_child_index": self.right_child(i) if self.right_child(i) < len(self.heap) else None,
                "node": node.to_dict(),
            })
        return res
