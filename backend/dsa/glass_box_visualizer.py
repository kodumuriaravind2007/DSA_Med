"""
Glass-Box DSA Algorithm Visualizer Engine.
Generates fully transparent, pedagogical step-by-step execution traces for:
1. Levenshtein Dynamic Programming Edit Distance Grid with cell costs, operations, and traceback path.
2. Min-Heap Sift-Up and Sift-Down operation traces with parent/child index formulas and swap animations.
"""

from typing import List, Dict, Any


def compute_levenshtein_dp_matrix(s1: str, s2: str) -> Dict[str, Any]:
    """
    Computes full (M+1) x (N+1) Dynamic Programming grid for Levenshtein Distance
    between s1 and s2, with operation tags ('match', 'substitution', 'insertion', 'deletion')
    and exact traceback alignment path.
    """
    s1 = s1.strip().lower()
    s2 = s2.strip().lower()
    m, n = len(s1), len(s2)

    # Initialize dp matrix
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    ops = [[""] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
        ops[i][0] = "delete" if i > 0 else "start"
    for j in range(n + 1):
        dp[0][j] = j
        ops[0][j] = "insert" if j > 0 else "start"

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
                ops[i][j] = "match"
            else:
                cost_del = dp[i - 1][j] + 1
                cost_ins = dp[i][j - 1] + 1
                cost_sub = dp[i - 1][j - 1] + 1

                min_cost = min(cost_del, cost_ins, cost_sub)
                dp[i][j] = min_cost

                if min_cost == cost_del:
                    ops[i][j] = "delete"
                elif min_cost == cost_ins:
                    ops[i][j] = "insert"
                else:
                    ops[i][j] = "substitute"

    # Traceback path
    traceback_path = []
    curr_i, curr_j = m, n
    while curr_i > 0 or curr_j > 0:
        op = ops[curr_i][curr_j]
        traceback_path.append({
            "row": curr_i,
            "col": curr_j,
            "char1": s1[curr_i - 1] if curr_i > 0 else "ε",
            "char2": s2[curr_j - 1] if curr_j > 0 else "ε",
            "operation": op,
            "cost_at_cell": dp[curr_i][curr_j],
        })
        if op == "match" or op == "substitute":
            curr_i -= 1
            curr_j -= 1
        elif op == "delete":
            curr_i -= 1
        elif op == "insert":
            curr_j -= 1
        else:
            if curr_i > 0:
                curr_i -= 1
            elif curr_j > 0:
                curr_j -= 1

    traceback_path.reverse()

    # Format matrix for UI table
    matrix_rows = []
    header = ["ε"] + list(s2)

    for i in range(m + 1):
        row_char = "ε" if i == 0 else s1[i - 1]
        row_cells = []
        for j in range(n + 1):
            is_in_path = any(p["row"] == i and p["col"] == j for p in traceback_path)
            row_cells.append({
                "value": dp[i][j],
                "operation": ops[i][j],
                "is_optimal_path": is_in_path,
            })
        matrix_rows.append({
            "row_header": row_char,
            "cells": row_cells,
        })

    max_len = max(m, n, 1)
    similarity_ratio = round(1.0 - (dp[m][n] / max_len), 3)

    return {
        "string_1": s1,
        "string_2": s2,
        "distance": dp[m][n],
        "similarity_ratio": similarity_ratio,
        "columns": header,
        "rows": matrix_rows,
        "traceback_path": traceback_path,
        "time_complexity": "O(M × N)",
        "space_complexity": "O(M × N)",
    }


def compute_heap_stepthrough(initial_elements: List[int], new_val: int) -> Dict[str, Any]:
    """
    Simulates insertion of a new element into a binary Min-Heap
    and returns the step-by-step sift-up comparison and swap trace.
    """
    arr = list(initial_elements)
    steps = []

    # Step 0: Append to end
    arr.append(new_val)
    curr_idx = len(arr) - 1

    steps.append({
        "step": 0,
        "action": "APPEND",
        "array_state": list(arr),
        "active_index": curr_idx,
        "parent_index": None,
        "explanation": f"Appended new element {new_val} at index {curr_idx} (end of array) to maintain complete binary tree structure.",
    })

    # Sift-up
    step_num = 1
    while curr_idx > 0:
        parent_idx = (curr_idx - 1) // 2
        steps.append({
            "step": step_num,
            "action": "COMPARE",
            "array_state": list(arr),
            "active_index": curr_idx,
            "parent_index": parent_idx,
            "explanation": f"Comparing child at index {curr_idx} (val: {arr[curr_idx]}) with parent at index {parent_idx} (val: {arr[parent_idx]}). Formula: parent = floor(({curr_idx}-1)/2) = {parent_idx}.",
        })
        step_num += 1

        if arr[curr_idx] < arr[parent_idx]:
            # Swap
            arr[curr_idx], arr[parent_idx] = arr[parent_idx], arr[curr_idx]
            steps.append({
                "step": step_num,
                "action": "SWAP",
                "array_state": list(arr),
                "active_index": parent_idx,
                "swapped_with": curr_idx,
                "explanation": f"Invariant violated (child {arr[parent_idx]} < parent {arr[curr_idx]}). Swapped elements! Active element is now at index {parent_idx}.",
            })
            curr_idx = parent_idx
            step_num += 1
        else:
            steps.append({
                "step": step_num,
                "action": "RESTORED",
                "array_state": list(arr),
                "active_index": curr_idx,
                "parent_index": parent_idx,
                "explanation": f"Min-heap property satisfied: child ({arr[curr_idx]}) >= parent ({arr[parent_idx]}). Sift-up terminates.",
            })
            break

    return {
        "initial_elements": initial_elements,
        "inserted_element": new_val,
        "final_heap_array": arr,
        "total_swaps": step_num // 2,
        "steps": steps,
        "complexity": "Time: O(log N), Space: O(1) auxiliary",
    }
