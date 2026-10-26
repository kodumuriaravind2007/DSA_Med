"""
Binary Search Tree (BST) and Self-Balancing AVL Tree implementations.

Used in MedTree X for:
- Indexed patient lookups by numeric/normalized Patient ID
- Demonstrating O(log N) average search vs O(N) worst-case degradation in degenerate BST
- Guaranteed O(log N) depth and balance factor maintenance via AVL Rotations
- In-order traversal providing sorted patient registries

Complexity:
- BST Average: Search O(log N), Insert O(log N), Delete O(log N)
- BST Worst (Degenerate): Search O(N), Insert O(N), Delete O(N)
- AVL Tree Guaranteed: Search O(log N), Insert O(log N), Delete O(log N), Height <= 1.44 log2(N)
"""

from typing import List, Dict, Any, Optional, Tuple


class BSTNode:
    def __init__(self, key: int, patient_id: str, data: Dict[str, Any]):
        self.key = key  # Numeric key for BST ordering (e.g. 101, 204)
        self.patient_id = patient_id
        self.data = data
        self.left: Optional["BSTNode"] = None
        self.right: Optional["BSTNode"] = None
        self.height: int = 1  # Used for AVL balancing

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "patient_id": self.patient_id,
            "data": self.data,
            "height": self.height,
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }


class BinarySearchTree:
    def __init__(self):
        self.root: Optional[BSTNode] = None

    def insert(self, key: int, patient_id: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Inserts a key into the BST and returns the path trace."""
        trace = []
        new_node = BSTNode(key, patient_id, data)
        if self.root is None:
            self.root = new_node
            trace.append({
                "step": "set_root",
                "key": key,
                "description": f"Tree was empty; set {key} ({patient_id}) as root"
            })
            return trace

        curr = self.root
        while True:
            trace.append({
                "step": "compare",
                "current_key": curr.key,
                "target_key": key,
                "description": f"Comparing target key {key} with current node {curr.key}"
            })
            if key < curr.key:
                if curr.left is None:
                    curr.left = new_node
                    trace.append({
                        "step": "insert_left",
                        "parent_key": curr.key,
                        "key": key,
                        "description": f"Inserted {key} ({patient_id}) as left child of {curr.key}"
                    })
                    break
                else:
                    curr = curr.left
            elif key > curr.key:
                if curr.right is None:
                    curr.right = new_node
                    trace.append({
                        "step": "insert_right",
                        "parent_key": curr.key,
                        "key": key,
                        "description": f"Inserted {key} ({patient_id}) as right child of {curr.key}"
                    })
                    break
                else:
                    curr = curr.right
            else:
                # Key already exists: update payload
                curr.data = data
                curr.patient_id = patient_id
                trace.append({
                    "step": "update_existing",
                    "key": key,
                    "description": f"Key {key} already exists. Updated patient data."
                })
                break

        return trace

    def search(self, key: int) -> Tuple[Optional[BSTNode], List[Dict[str, Any]]]:
        """Searches for key and returns (node, trace)."""
        trace = []
        curr = self.root
        comparisons = 0
        while curr is not None:
            comparisons += 1
            trace.append({
                "step": "inspect",
                "current_key": curr.key,
                "patient_id": curr.patient_id,
                "comparisons": comparisons,
                "direction": "match" if key == curr.key else ("left" if key < curr.key else "right"),
                "description": f"Step {comparisons}: Inspecting node {curr.key}. "
                               f"{'Found match!' if key == curr.key else ('Key < node -> go left' if key < curr.key else 'Key > node -> go right')}"
            })
            if key == curr.key:
                return curr, trace
            elif key < curr.key:
                curr = curr.left
            else:
                curr = curr.right

        trace.append({
            "step": "not_found",
            "comparisons": comparisons,
            "description": f"Key {key} was not found in the BST after {comparisons} comparisons."
        })
        return None, trace

    def delete(self, key: int) -> Tuple[bool, List[Dict[str, Any]]]:
        """Deletes a node and returns success + trace."""
        trace = []
        found = [False]

        def _delete_node(root: Optional[BSTNode], k: int) -> Optional[BSTNode]:
            if root is None:
                return None
            if k < root.key:
                trace.append({"step": "traverse_left", "key": root.key, "description": f"{k} < {root.key}, descending left"})
                root.left = _delete_node(root.left, k)
            elif k > root.key:
                trace.append({"step": "traverse_right", "key": root.key, "description": f"{k} > {root.key}, descending right"})
                root.right = _delete_node(root.right, k)
            else:
                found[0] = True
                trace.append({"step": "match_for_deletion", "key": root.key, "description": f"Found node {k} to delete"})
                # Case 1 & 2: 0 or 1 child
                if root.left is None:
                    trace.append({"step": "replace_with_right", "key": root.key, "description": f"Node {k} has no left child, replacing with right child"})
                    return root.right
                elif root.right is None:
                    trace.append({"step": "replace_with_left", "key": root.key, "description": f"Node {k} has no right child, replacing with left child"})
                    return root.left

                # Case 3: 2 children. Find in-order successor (min in right subtree)
                trace.append({"step": "find_inorder_successor", "key": root.key, "description": f"Node {k} has 2 children. Finding in-order successor in right subtree..."})
                succ = root.right
                while succ.left is not None:
                    succ = succ.left
                trace.append({"step": "inorder_successor_found", "successor_key": succ.key, "description": f"In-order successor is {succ.key}. Copying key and deleting successor from right subtree."})
                root.key = succ.key
                root.patient_id = succ.patient_id
                root.data = succ.data
                root.right = _delete_node(root.right, succ.key)

            return root

        self.root = _delete_node(self.root, key)
        return found[0], trace

    def inorder_traversal(self) -> List[Dict[str, Any]]:
        """In-order (Left, Root, Right) traversal produces strictly ascending sorted keys."""
        res = []
        def _inorder(node: Optional[BSTNode]):
            if node:
                _inorder(node.left)
                res.append({"key": node.key, "patient_id": node.patient_id, "data": node.data})
                _inorder(node.right)
        _inorder(self.root)
        return res

    def get_height(self) -> int:
        def _h(node: Optional[BSTNode]) -> int:
            if not node:
                return 0
            return 1 + max(_h(node.left), _h(node.right))
        return _h(self.root)

    def to_json(self) -> Optional[Dict[str, Any]]:
        return self.root.to_dict() if self.root else None


class AVLTree:
    """Self-balancing AVL Tree guaranteeing O(log N) operations with rotations."""

    def __init__(self):
        self.root: Optional[BSTNode] = None

    def _height(self, node: Optional[BSTNode]) -> int:
        return node.height if node else 0

    def _balance_factor(self, node: Optional[BSTNode]) -> int:
        return self._height(node.left) - self._height(node.right) if node else 0

    def _right_rotate(self, y: BSTNode) -> BSTNode:
        x = y.left
        T2 = x.right
        x.right = y
        y.left = T2
        y.height = 1 + max(self._height(y.left), self._height(y.right))
        x.height = 1 + max(self._height(x.left), self._height(x.right))
        return x

    def _left_rotate(self, x: BSTNode) -> BSTNode:
        y = x.right
        T2 = y.left
        y.left = x
        x.right = T2
        x.height = 1 + max(self._height(x.left), self._height(x.right))
        y.height = 1 + max(self._height(y.left), self._height(y.right))
        return y

    def insert(self, key: int, patient_id: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        trace = []

        def _insert(node: Optional[BSTNode], k: int) -> BSTNode:
            if not node:
                trace.append({"step": "insert_leaf", "key": k, "description": f"Inserted key {k} as new node"})
                return BSTNode(k, patient_id, data)

            if k < node.key:
                node.left = _insert(node.left, k)
            elif k > node.key:
                node.right = _insert(node.right, k)
            else:
                node.data = data
                node.patient_id = patient_id
                return node

            node.height = 1 + max(self._height(node.left), self._height(node.right))
            balance = self._balance_factor(node)

            # Left Left
            if balance > 1 and k < node.left.key:
                trace.append({"step": "rotation", "type": "Right Rotation (LL)", "node": node.key, "balance": balance, "description": f"LL Imbalance at {node.key} (BF={balance}): Performing Right Rotation"})
                return self._right_rotate(node)

            # Right Right
            if balance < -1 and k > node.right.key:
                trace.append({"step": "rotation", "type": "Left Rotation (RR)", "node": node.key, "balance": balance, "description": f"RR Imbalance at {node.key} (BF={balance}): Performing Left Rotation"})
                return self._left_rotate(node)

            # Left Right
            if balance > 1 and k > node.left.key:
                trace.append({"step": "rotation", "type": "Left-Right Rotation (LR)", "node": node.key, "balance": balance, "description": f"LR Imbalance at {node.key} (BF={balance}): Left-Rotate child then Right-Rotate"})
                node.left = self._left_rotate(node.left)
                return self._right_rotate(node)

            # Right Left
            if balance < -1 and k < node.right.key:
                trace.append({"step": "rotation", "type": "Right-Left Rotation (RL)", "node": node.key, "balance": balance, "description": f"RL Imbalance at {node.key} (BF={balance}): Right-Rotate child then Left-Rotate"})
                node.right = self._right_rotate(node.right)
                return self._left_rotate(node)

            return node

        self.root = _insert(self.root, key)
        return trace

    def to_json(self) -> Optional[Dict[str, Any]]:
        def _build(node: Optional[BSTNode]) -> Optional[Dict[str, Any]]:
            if not node:
                return None
            return {
                "key": node.key,
                "patient_id": node.patient_id,
                "data": node.data,
                "height": node.height,
                "balance_factor": self._balance_factor(node),
                "left": _build(node.left),
                "right": _build(node.right),
            }
        return _build(self.root)

    def get_height(self) -> int:
        return self._height(self.root)
