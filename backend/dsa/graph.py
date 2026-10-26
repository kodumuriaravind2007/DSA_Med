"""
Hospital Resource Graph with Adjacency List, BFS, DFS, and Resource Matching.

Nodes represent:
- Patients (P-101, P-102...)
- Departments (Emergency, Cardiology, Orthopedics, ICU, Pediatrics, General Medicine)
- Doctors (DOC-101, DOC-102...)
- Beds (BED-ICU-01, BED-EMG-02...)
- Diagnostic Services (Pathology Lab, Radiology, ECG Unit)

Edges represent relationships:
- (Patient) --[assigned_to]--> (Doctor)
- (Patient) --[admitted_to]--> (Bed)
- (Doctor) --[belongs_to]--> (Department)
- (Bed) --[located_in]--> (Department)
- (Patient) --[ordered_for]--> (Diagnostic Service)

Complexity:
- BFS Traversal: O(V + E)
- DFS Traversal: O(V + E)
- Resource Matching (Pathfinding): O(V + E)
"""

from typing import List, Dict, Any, Optional, Set
from collections import deque


class GraphNode:
    def __init__(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self.label = label
        self.node_type = node_type  # 'patient', 'department', 'doctor', 'bed', 'service'
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.node_id,
            "label": self.label,
            "type": self.node_type,
            "metadata": self.metadata,
        }


class GraphEdge:
    def __init__(self, source: str, target: str, relationship: str, metadata: Optional[Dict[str, Any]] = None):
        self.source = source
        self.target = target
        self.relationship = relationship
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "relationship": self.relationship,
            "metadata": self.metadata,
        }


class HospitalResourceGraph:
    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        # Adjacency list: node_id -> list of (neighbor_id, relationship)
        self.adj_list: Dict[str, List[Dict[str, str]]] = {}
        self.edges: List[GraphEdge] = []

    def add_node(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        if node_id not in self.nodes:
            self.nodes[node_id] = GraphNode(node_id, label, node_type, metadata)
            self.adj_list[node_id] = []
        else:
            self.nodes[node_id].label = label
            self.nodes[node_id].metadata.update(metadata or {})

    def add_edge(self, source: str, target: str, relationship: str, bidirectional: bool = True) -> None:
        if source not in self.nodes or target not in self.nodes:
            return

        # Check existing edge
        for edge in self.adj_list[source]:
            if edge["target"] == target and edge["relationship"] == relationship:
                return

        self.adj_list[source].append({"target": target, "relationship": relationship})
        self.edges.append(GraphEdge(source, target, relationship))

        if bidirectional:
            self.adj_list[target].append({"target": source, "relationship": relationship + "_of"})

    def remove_edge(self, source: str, target: str, relationship: Optional[str] = None) -> None:
        if source in self.adj_list:
            self.adj_list[source] = [
                e for e in self.adj_list[source]
                if not (e["target"] == target and (relationship is None or e["relationship"] == relationship))
            ]
        if target in self.adj_list:
            self.adj_list[target] = [
                e for e in self.adj_list[target]
                if not (e["target"] == source and (relationship is None or e["relationship"].startswith(relationship or "")))
            ]
        self.edges = [
            e for e in self.edges
            if not ((e.source == source and e.target == target) or (e.source == target and e.target == source))
        ]

    def bfs_traversal(self, start_node_id: str) -> Dict[str, Any]:
        """
        Executes Breadth-First Search from start_node_id.
        Returns visited order, queue history, and step-by-step trace.
        """
        if start_node_id not in self.nodes:
            return {"error": f"Start node {start_node_id} not found."}

        visited: Set[str] = set()
        queue = deque([start_node_id])
        visited.add(start_node_id)
        visited_order = []
        steps = []
        parent_map = {start_node_id: None}

        steps.append({
            "step": 0,
            "action": "initialize",
            "current_node": start_node_id,
            "queue": list(queue),
            "visited": list(visited),
            "description": f"Enqueued start node {start_node_id} ({self.nodes[start_node_id].label})"
        })

        step_count = 0
        while queue:
            curr = queue.popleft()
            visited_order.append(curr)
            step_count += 1

            neighbors = [n["target"] for n in self.adj_list.get(curr, [])]
            newly_enqueued = []

            for neighbor in neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
                    parent_map[neighbor] = curr
                    newly_enqueued.append(neighbor)

            steps.append({
                "step": step_count,
                "action": "dequeue_and_explore",
                "current_node": curr,
                "current_label": self.nodes[curr].label,
                "newly_enqueued": newly_enqueued,
                "queue": list(queue),
                "visited": list(visited),
                "description": f"Dequeued {curr}. Explored {len(neighbors)} neighbors; enqueued unvisited: {', '.join(newly_enqueued) if newly_enqueued else 'none'}."
            })

        return {
            "algorithm": "BFS (Breadth-First Search)",
            "start_node": start_node_id,
            "visited_order": visited_order,
            "total_visited": len(visited_order),
            "steps": steps,
            "complexity": "Time: O(V + E), Space: O(V)",
        }

    def dfs_traversal(self, start_node_id: str) -> Dict[str, Any]:
        """
        Executes Depth-First Search from start_node_id.
        Returns visited order, call stack history, and step-by-step trace.
        """
        if start_node_id not in self.nodes:
            return {"error": f"Start node {start_node_id} not found."}

        visited: Set[str] = set()
        visited_order = []
        steps = []
        stack = [start_node_id]

        step_count = 0
        while stack:
            curr = stack.pop()
            if curr not in visited:
                visited.add(curr)
                visited_order.append(curr)
                step_count += 1

                neighbors = [n["target"] for n in self.adj_list.get(curr, [])]
                unvisited_neighbors = [n for n in reversed(neighbors) if n not in visited]
                for n in unvisited_neighbors:
                    stack.append(n)

                steps.append({
                    "step": step_count,
                    "action": "pop_and_visit",
                    "current_node": curr,
                    "current_label": self.nodes[curr].label,
                    "stack": list(stack),
                    "visited": list(visited),
                    "description": f"Popped and visited {curr}. Pushed unvisited neighbors onto stack: {', '.join(unvisited_neighbors) if unvisited_neighbors else 'none'}."
                })

        return {
            "algorithm": "DFS (Depth-First Search)",
            "start_node": start_node_id,
            "visited_order": visited_order,
            "total_visited": len(visited_order),
            "steps": steps,
            "complexity": "Time: O(V + E), Space: O(V)",
        }

    def find_resource_path(self, patient_id: str, target_department: str) -> Dict[str, Any]:
        """
        Demonstrates pathfinding to match patient with:
        Patient -> Department -> Available Doctor & Available Bed.
        """
        trace = []
        if patient_id not in self.nodes:
            return {"success": False, "message": f"Patient {patient_id} not in graph."}

        trace.append(f"Starting resource search for Patient {patient_id} in {target_department}")

        dept_node_id = None
        for nid, node in self.nodes.items():
            if node.node_type == "department" and target_department.lower() in node.label.lower():
                dept_node_id = nid
                break

        if not dept_node_id:
            return {"success": False, "message": f"Department '{target_department}' not found in hospital graph."}

        trace.append(f"Located Department node: {dept_node_id} ({self.nodes[dept_node_id].label})")

        # Find connected available doctors
        available_doctor = None
        for edge in self.adj_list.get(dept_node_id, []):
            nid = edge["target"]
            node = self.nodes.get(nid)
            if node and node.node_type == "doctor":
                if node.metadata.get("duty_status") == "On Duty" and node.metadata.get("is_available", True):
                    available_doctor = node
                    break

        # Find connected available beds
        available_bed = None
        for edge in self.adj_list.get(dept_node_id, []):
            nid = edge["target"]
            node = self.nodes.get(nid)
            if node and node.node_type == "bed":
                if node.metadata.get("status") == "Available":
                    available_bed = node
                    break

        path_nodes = [patient_id, dept_node_id]
        if available_doctor:
            path_nodes.append(available_doctor.node_id)
            trace.append(f"Matched on-duty Doctor: {available_doctor.label} ({available_doctor.node_id})")
        else:
            trace.append(f"No available on-duty doctor currently found in {target_department}")

        if available_bed:
            path_nodes.append(available_bed.node_id)
            trace.append(f"Matched available Bed: {available_bed.label} ({available_bed.node_id})")
        else:
            trace.append(f"No available bed currently in {target_department}")

        return {
            "success": available_doctor is not None and available_bed is not None,
            "department": target_department,
            "matched_doctor": available_doctor.to_dict() if available_doctor else None,
            "matched_bed": available_bed.to_dict() if available_bed else None,
            "path": path_nodes,
            "trace": trace,
        }

    def to_graph_data(self) -> Dict[str, Any]:
        """Returns nodes and edges formatted for visual force-directed or topological graph display."""
        return {
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
            "adjacency_list": {
                nid: [f"{e['relationship']} -> {e['target']}" for e in edges]
                for nid, edges in self.adj_list.items()
            }
        }
