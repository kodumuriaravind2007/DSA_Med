"""
Custom Hash Table with Separate Chaining Collision Resolution.

Used in MedTree X for:
- Fast O(1) average-case Patient ID lookups
- Normalized phone number and email lookups for instant duplicate candidate checking
- Visual demonstration of bucket hashing, collision tracking, and load factor rehashing

Complexity:
- Average Case: Insert O(1), Search O(1), Delete O(1)
- Worst Case (All keys hash to same bucket): O(N)
- Load Factor alpha = N / M (rehashes when alpha > 0.75)
"""

from typing import List, Dict, Any, Optional, Tuple


class HashNode:
    def __init__(self, key: str, value: Any):
        self.key = key
        self.value = value
        self.next: Optional["HashNode"] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "value": self.value,
            "next": self.next.to_dict() if self.next else None,
        }


class CustomHashTable:
    def __init__(self, initial_capacity: int = 16):
        self.capacity = initial_capacity
        self.size = 0
        self.buckets: List[Optional[HashNode]] = [None] * self.capacity
        self.total_collisions = 0

    def _hash(self, key: str) -> int:
        """
        DJB2 hash algorithm.
        hash = (hash << 5) + hash + char
        Provides balanced distribution across buckets.
        """
        h = 5381
        for char in str(key):
            h = ((h << 5) + h) + ord(char)
            h = h & 0xFFFFFFFF  # 32-bit unsigned
        return h % self.capacity

    @property
    def load_factor(self) -> float:
        return round(self.size / self.capacity, 3)

    def insert(self, key: str, value: Any) -> Dict[str, Any]:
        """
        Inserts key-value pair. Returns trace including computed hash,
        bucket index, and collision status.
        """
        if self.load_factor > 0.75:
            self._rehash(self.capacity * 2)

        bucket_idx = self._hash(key)
        head = self.buckets[bucket_idx]
        is_collision = head is not None

        curr = head
        while curr:
            if curr.key == key:
                # Update existing
                curr.value = value
                return {
                    "key": key,
                    "bucket_index": bucket_idx,
                    "action": "updated",
                    "collision": is_collision,
                    "load_factor": self.load_factor,
                    "description": f"Key '{key}' already in bucket {bucket_idx}. Updated value."
                }
            curr = curr.next

        # Insert at front of bucket (chaining)
        new_node = HashNode(key, value)
        new_node.next = head
        self.buckets[bucket_idx] = new_node
        self.size += 1
        if is_collision:
            self.total_collisions += 1

        return {
            "key": key,
            "bucket_index": bucket_idx,
            "action": "inserted",
            "collision": is_collision,
            "chain_length": self._get_chain_length(bucket_idx),
            "load_factor": self.load_factor,
            "description": f"Hashed '{key}' to bucket {bucket_idx}." + (" (Collision resolved via chaining)" if is_collision else "")
        }

    def search(self, key: str) -> Tuple[Optional[Any], Dict[str, Any]]:
        """Searches for key and returns (value, trace)."""
        bucket_idx = self._hash(key)
        curr = self.buckets[bucket_idx]
        steps = 0

        while curr:
            steps += 1
            if curr.key == key:
                return curr.value, {
                    "found": True,
                    "bucket_index": bucket_idx,
                    "probes": steps,
                    "description": f"Found key '{key}' in bucket {bucket_idx} after {steps} step(s)."
                }
            curr = curr.next

        return None, {
            "found": False,
            "bucket_index": bucket_idx,
            "probes": steps,
            "description": f"Key '{key}' not found in bucket {bucket_idx}."
        }

    def delete(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        bucket_idx = self._hash(key)
        curr = self.buckets[bucket_idx]
        prev = None

        while curr:
            if curr.key == key:
                if prev is None:
                    self.buckets[bucket_idx] = curr.next
                else:
                    prev.next = curr.next
                self.size -= 1
                return True, {
                    "deleted": True,
                    "bucket_index": bucket_idx,
                    "description": f"Removed key '{key}' from bucket {bucket_idx}."
                }
            prev = curr
            curr = curr.next

        return False, {
            "deleted": False,
            "bucket_index": bucket_idx,
            "description": f"Key '{key}' not found."
        }

    def _get_chain_length(self, bucket_idx: int) -> int:
        count = 0
        curr = self.buckets[bucket_idx]
        while curr:
            count += 1
            curr = curr.next
        return count

    def _rehash(self, new_capacity: int) -> None:
        old_buckets = self.buckets
        self.capacity = new_capacity
        self.buckets = [None] * self.capacity
        self.size = 0
        self.total_collisions = 0

        for head in old_buckets:
            curr = head
            while curr:
                self.insert(curr.key, curr.value)
                curr = curr.next

    def get_bucket_distribution(self) -> List[Dict[str, Any]]:
        """Returns structured view of all buckets for educational visualization."""
        distribution = []
        for i in range(self.capacity):
            items = []
            curr = self.buckets[i]
            while curr:
                items.append({"key": curr.key, "value_summary": str(curr.value)[:40]})
                curr = curr.next
            distribution.append({
                "bucket_index": i,
                "chain_length": len(items),
                "items": items,
            })
        return distribution
