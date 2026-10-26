import React, { useEffect, useState } from 'react';
import {
  GitBranch, Activity, Search, Plus, Trash2, ArrowRight,
  TrendingDown, CheckCircle2, AlertCircle, Database, Layers,
  Table, HelpCircle, RefreshCw, Cpu
} from 'lucide-react';
import { api } from '../services/api';

export const DsaBoardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bst' | 'heap' | 'hash' | 'graph' | 'queue_vs_timeline' | 'complexity'>('bst');

  // --- 1. BST & AVL STATE ---
  const [bstData, setBstData] = useState<any>(null);
  const [bstMode, setBstMode] = useState<'demo' | 'live'>('demo');
  const [searchKey, setSearchKey] = useState<number>(105);
  const [searchTrace, setSearchTrace] = useState<any>(null);
  const [insertKey, setInsertKey] = useState<number>(112);
  const [insertName, setInsertName] = useState<string>('Deepak Sen');
  const [deleteKey, setDeleteKey] = useState<number>(102);
  const [degradationDemo, setDegradationDemo] = useState<any>(null);
  const [isLoadingBst, setIsLoadingBst] = useState(false);

  // --- 2. PRIORITY MIN-HEAP STATE ---
  const [heapData, setHeapData] = useState<any>(null);
  const [heapInsertPrio, setHeapInsertPrio] = useState<number>(1);
  const [heapInsertName, setHeapInsertName] = useState<string>('Manish Verma');
  const [heapInsertId, setHeapInsertId] = useState<string>('PT-125');
  const [heapInsertConcern, setHeapInsertConcern] = useState<string>('Acute Chest Pain');
  const [heapTrace, setHeapTrace] = useState<any>(null);
  const [heapExtractTrace, setHeapExtractTrace] = useState<any>(null);

  // --- 3. HASH TABLE STATE ---
  const [hashData, setHashData] = useState<any>(null);
  const [hashLookupKey, setHashLookupKey] = useState<string>('9876543210');
  const [hashLookupResult, setHashLookupResult] = useState<any>(null);
  const [hashInsertKey, setHashInsertKey] = useState<string>('PT-199');
  const [hashInsertVal, setHashInsertVal] = useState<string>('Emergency VIP Record');

  // --- 4. GRAPH STATE ---
  const [graphData, setGraphData] = useState<any>(null);
  const [graphStartNode, setGraphStartNode] = useState<string>('DEPT-EME');
  const [graphTraversal, setGraphTraversal] = useState<any>(null);

  // --- 5. QUEUE VS TIMELINE STATE ---
  const [compareData, setCompareData] = useState<any>(null);

  // --- 6. COMPLEXITY TABLE ---
  const [complexityList, setComplexityList] = useState<any[]>([]);

  const loadInitialData = async () => {
    try {
      const [bRes, hRes, htRes, gRes, cmpRes, cplxRes] = await Promise.all([
        api.getDemoBST(),
        api.getDemoHeap(),
        api.getDemoHashTable(),
        api.getResourceGraph(),
        api.getQueueVsTimeline('PT-101'),
        api.getDSAComplexityMatrix(),
      ]);
      setBstData(bRes);
      setHeapData(hRes);
      setHashData(htRes);
      setGraphData(gRes);
      setCompareData(cmpRes);
      setComplexityList(cplxRes);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // --- BST HANDLERS ---
  const handleBSTSearch = async () => {
    try {
      const res = await api.demoBSTSearch(searchKey);
      setSearchTrace(res);
    } catch (err: any) {
      alert(err.message || 'Search failed');
    }
  };

  const handleBSTInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.demoBSTInsert({
        key: insertKey,
        patient_id: `PT-${insertKey}`,
        patient_name: insertName,
      });
      setBstData({
        bst_tree: res.bst_tree,
        avl_tree: res.avl_tree,
        bst_height: res.bst_height,
        avl_height: res.avl_height,
      });
      alert(`Inserted key ${insertKey} (${insertName}). Tree recalculated!`);
    } catch (err: any) {
      alert(err.message || 'Insert failed');
    }
  };

  const handleBSTDelete = async () => {
    try {
      const res = await api.demoBSTDelete(deleteKey);
      setBstData((prev: any) => ({
        ...prev,
        bst_tree: res.bst_tree,
        bst_height: res.new_height,
      }));
      alert(`Deleted key ${deleteKey}. Trace: ${res.trace.map((t: any) => t.description).join(' -> ')}`);
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleLoadDegradation = async () => {
    try {
      const res = await api.getBSTDegradationDemo();
      setDegradationDemo(res);
    } catch (err: any) {
      alert(err.message || 'Degradation demo failed');
    }
  };

  const handleSwitchBSTLive = async () => {
    try {
      setIsLoadingBst(true);
      if (bstMode === 'demo') {
        const res = await api.getLiveBST();
        setBstData({
          bst_tree: res.bst_tree,
          avl_tree: res.avl_tree,
          bst_height: res.bst_height,
          avl_height: res.avl_height,
          inorder_sorted: res.inorder_sorted_keys,
        });
        setBstMode('live');
      } else {
        const res = await api.getDemoBST();
        setBstData(res);
        setBstMode('demo');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoadingBst(false);
    }
  };

  // --- HEAP HANDLERS ---
  const handleHeapInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.demoHeapInsert({
        patient_id: heapInsertId,
        patient_name: heapInsertName,
        priority: heapInsertPrio,
        concern: heapInsertConcern,
      });
      setHeapData({
        total_nodes: res.array_representation.length,
        tree_representation: res.tree_representation,
        array_representation: res.array_representation,
      });
      setHeapTrace(res.sift_up_trace);
    } catch (err: any) {
      alert(err.message || 'Heap insert failed');
    }
  };

  const handleHeapExtract = async () => {
    try {
      const res = await api.demoHeapExtract();
      setHeapData({
        total_nodes: res.remaining_size,
        tree_representation: res.tree_representation,
        array_representation: res.array_representation,
      });
      setHeapExtractTrace(res.sift_down_trace);
    } catch (err: any) {
      alert(err.message || 'Heap extract failed');
    }
  };

  // --- HASH HANDLERS ---
  const handleHashLookup = async () => {
    try {
      const res = await api.demoHashLookup(hashLookupKey);
      setHashLookupResult(res);
    } catch (err: any) {
      alert(err.message || 'Hash lookup failed');
    }
  };

  const handleHashInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.demoHashInsert(hashInsertKey, hashInsertVal);
      setHashData((prev: any) => ({
        ...prev,
        load_factor: res.load_factor,
        buckets: res.buckets,
      }));
      alert(`Key '${hashInsertKey}' hashed! ${res.trace.description}`);
    } catch (err: any) {
      alert(err.message || 'Hash insert failed');
    }
  };

  // --- GRAPH HANDLERS ---
  const handleGraphBFS = async () => {
    try {
      const res = await api.runGraphBFS(graphStartNode);
      setGraphTraversal(res);
    } catch (err: any) {
      alert(err.message || 'BFS failed');
    }
  };

  const handleGraphDFS = async () => {
    try {
      const res = await api.runGraphDFS(graphStartNode);
      setGraphTraversal(res);
    } catch (err: any) {
      alert(err.message || 'DFS failed');
    }
  };

  // Helper recursive SVG renderer for binary trees (BST & AVL & Heap)
  const renderTreeSVG = (node: any, x = 320, y = 40, offset = 140, depth = 0) => {
    if (!node) return null;

    const leftX = x - offset;
    const rightX = x + offset;
    const childY = y + 70;
    const nextOffset = Math.max(30, offset / 2);

    return (
      <g key={`${node.key || node.patient_id}-${x}-${y}`}>
        {/* Edges */}
        {node.left && (
          <line
            x1={x}
            y1={y}
            x2={leftX}
            y2={childY}
            stroke="#94A3B8"
            strokeWidth="2"
          />
        )}
        {node.right && (
          <line
            x1={x}
            y1={y}
            x2={rightX}
            y2={childY}
            stroke="#94A3B8"
            strokeWidth="2"
          />
        )}

        {/* Node Circle */}
        <circle
          cx={x}
          cy={y}
          r="22"
          fill={node.priority === 1 ? '#DC2626' : node.priority === 2 ? '#D97706' : '#2563EB'}
          stroke="#FFFFFF"
          strokeWidth="3"
          className="shadow-md"
        />

        {/* Node Text */}
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {node.key !== undefined ? node.key : node.patient_id}
        </text>

        {/* Node Subtitle */}
        <text
          x={x}
          y={y + 35}
          textAnchor="middle"
          fill="#1E293B"
          fontSize="9"
          fontWeight="600"
        >
          {node.patient_name || node.patient_id || ''}
        </text>

        {/* Recurse left and right */}
        {renderTreeSVG(node.left, leftX, childY, nextOffset, depth + 1)}
        {renderTreeSVG(node.right, rightX, childY, nextOffset, depth + 1)}
      </g>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DBC0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-[#7F011F]">DSA Algorithms Laboratory</h2>
              <span className="text-[10px] font-semibold bg-[#FAF0F2] text-[#7F011F] px-2.5 py-0.5 rounded-full border border-[#7F011F]/20 font-mono">
                B.Tech Core Lab
              </span>
            </div>
            <p className="text-xs text-[#6E5A5E] max-w-3xl leading-relaxed mt-0.5">
              Interactive workbench demonstrating core Data Structures: Binary Search Trees, Self-Balancing AVL Rotations,
              Priority Min-Heap, DJB2 Bucket Hash Tables, and Graph BFS/DFS.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="bg-white p-2 rounded-2xl border border-[#E8DBC0] shadow-sm flex flex-wrap gap-1.5 text-xs font-semibold">
        {[
          { id: 'bst', label: 'A. BST & AVL Tree', icon: GitBranch },
          { id: 'heap', label: 'B. Priority Min-Heap', icon: Layers },
          { id: 'hash', label: 'C. Hash Table & Chaining', icon: Database },
          { id: 'graph', label: 'D. Hospital Resource Graph', icon: Activity },
          { id: 'queue_vs_timeline', label: 'E. Queue vs Timeline', icon: Table },
          { id: 'complexity', label: 'F. Complexity Analysis Matrix', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold ${
                isActive
                  ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                  : 'text-[#6E5A5E] hover:bg-[#FAF6EC] hover:text-[#2A161B]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F5EBD0]' : 'text-[#7F011F]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* --- TAB A: BST & AVL TREE --- */}
      {/* ========================================================================= */}
      {activeTab === 'bst' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DBC0]/60">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#7F011F] text-sm">Mode:</span>
                <button
                  onClick={handleSwitchBSTLive}
                  disabled={isLoadingBst}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                    bstMode === 'demo'
                      ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                      : 'bg-[#FAF6EC] text-[#6E5A5E] hover:bg-[#F5EBD0]'
                  }`}
                >
                  Demo Mode (Safe Testing)
                </button>
                <button
                  onClick={handleSwitchBSTLive}
                  disabled={isLoadingBst}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                    bstMode === 'live'
                      ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                      : 'bg-[#FAF6EC] text-[#6E5A5E] hover:bg-[#F5EBD0]'
                  }`}
                >
                  Live Database Records Mode
                </button>
              </div>

              <div className="flex items-center gap-3 text-[#6E5A5E] font-mono text-[11px]">
                <span>BST Height: <strong className="text-[#7F011F]">{bstData?.bst_height || 0}</strong></span>
                <span>•</span>
                <span>AVL Height: <strong className="text-[#7F011F]">{bstData?.avl_height || 0}</strong> (Balanced)</span>
              </div>
            </div>

            {/* Interactive Operations: Search, Insert, Delete */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Search Operation */}
              <div className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-2">
                <div className="font-bold text-[#2A161B] flex items-center justify-between">
                  <span>1. Search Patient Key</span>
                  <span className="text-[10px] text-[#6E5A5E]">O(log N) Avg</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={searchKey}
                    onChange={(e) => setSearchKey(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Key (e.g. 105)"
                  />
                  <button
                    onClick={handleBSTSearch}
                    className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shrink-0 shadow-xs"
                  >
                    Search
                  </button>
                </div>
                {searchTrace && (
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8DBC0] text-[11px] space-y-1">
                    <div className="font-bold text-[#7F011F]">
                      {searchTrace.found ? '✓ Patient Found' : '✗ Key Not Found'} ({searchTrace.comparisons} comparisons)
                    </div>
                    <div className="text-[10px] text-[#6E5A5E] max-h-16 overflow-y-auto font-mono">
                      {searchTrace.search_path.map((p: any, idx: number) => (
                        <div key={idx}>{p.description}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Insert Operation */}
              <div className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-2">
                <div className="font-bold text-[#2A161B] flex items-center justify-between">
                  <span>2. Insert New Key</span>
                  <span className="text-[10px] text-[#6E5A5E]">O(log N)</span>
                </div>
                <form onSubmit={handleBSTInsert} className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      required
                      value={insertKey}
                      onChange={(e) => setInsertKey(parseInt(e.target.value) || 0)}
                      className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-white text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      placeholder="Key"
                    />
                    <input
                      type="text"
                      required
                      value={insertName}
                      onChange={(e) => setInsertName(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-white text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      placeholder="Name"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                  >
                    Insert Key in BST & AVL
                  </button>
                </form>
              </div>

              {/* Delete Operation */}
              <div className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-2">
                <div className="font-bold text-[#2A161B] flex items-center justify-between">
                  <span>3. Delete Key</span>
                  <span className="text-[10px] text-[#6E5A5E]">In-Order Succ.</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={deleteKey}
                    onChange={(e) => setDeleteKey(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Key to delete"
                  />
                  <button
                    onClick={handleBSTDelete}
                    className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shrink-0 shadow-xs"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-[10px] text-[#6E5A5E]">
                  Handles 0, 1, and 2 children cases using the minimum node of the right subtree (in-order successor).
                </p>
              </div>
            </div>
          </div>

          {/* Visual SVG Trees: BST vs AVL Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standard BST Tree Canvas */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#7F011F] text-sm">Standard Binary Search Tree (BST)</h3>
                  <p className="text-xs text-[#6E5A5E]">Keys ordered: Left &lt; Root &lt; Right. Height: {bstData?.bst_height}</p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FAF6EC] text-[#6E5A5E] border border-[#E8DBC0]">
                  Avg O(log N) • Worst O(N)
                </span>
              </div>
              <div className="border border-[#E8DBC0] rounded-xl bg-[#FAF6EC]/50 overflow-x-auto min-h-[340px] flex items-center justify-center p-4">
                {bstData?.bst_tree ? (
                  <svg width="650" height="320" className="mx-auto">
                    {renderTreeSVG(bstData.bst_tree, 320, 35, 130)}
                  </svg>
                ) : (
                  <span className="text-xs text-[#8C7B7E]">Empty Tree</span>
                )}
              </div>
            </div>

            {/* Self-Balancing AVL Tree Canvas */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#7F011F] text-sm">Self-Balancing AVL Tree</h3>
                  <p className="text-xs text-[#6E5A5E]">Balance factor |h_L - h_R| &le; 1 via rotations. Height: {bstData?.avl_height}</p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20 font-bold">
                  Guaranteed O(log N)
                </span>
              </div>
              <div className="border border-[#E8DBC0] rounded-xl bg-[#FAF6EC]/50 overflow-x-auto min-h-[340px] flex items-center justify-center p-4">
                {bstData?.avl_tree ? (
                  <svg width="650" height="320" className="mx-auto">
                    {renderTreeSVG(bstData.avl_tree, 320, 35, 130)}
                  </svg>
                ) : (
                  <span className="text-xs text-[#8C7B7E]">Empty Tree</span>
                )}
              </div>
            </div>
          </div>

          {/* Degraded BST vs AVL Interactive Demonstration */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DBC0]/60">
              <div>
                <h4 className="font-bold text-[#2A161B] text-sm">Degradation Proof: Sequential Inserts (100, 101, 102, 103, 104, 105, 106)</h4>
                <p className="text-[#6E5A5E]">
                  Observe how sorted insertions degrade an unaugmented BST into an O(N) linked list, while an AVL Tree maintains O(log N) balance.
                </p>
              </div>
              <button
                onClick={handleLoadDegradation}
                className="px-4 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs transition shrink-0"
              >
                Run Degradation Benchmark
              </button>
            </div>

            {degradationDemo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#FAF0F2] border border-[#7F011F]/30 rounded-xl space-y-1.5">
                  <div className="font-bold text-[#7F011F] text-sm">{degradationDemo.bst.type}</div>
                  <div className="text-[#2A161B]">Height: <strong>{degradationDemo.bst.height}</strong> (Max comparisons = {degradationDemo.bst.worst_case_lookup_comparisons})</div>
                  <div className="text-[#7F011F] font-mono text-[11px]">{degradationDemo.bst.complexity}</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-emerald-950 text-sm">{degradationDemo.avl.type}</div>
                  <div className="text-emerald-800">Height: <strong>{degradationDemo.avl.height}</strong> (Max comparisons = {degradationDemo.avl.worst_case_lookup_comparisons})</div>
                  <div className="text-emerald-700 font-mono text-[11px]">{degradationDemo.avl.complexity}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB B: PRIORITY MIN-HEAP --- */}
      {/* ========================================================================= */}
      {activeTab === 'heap' && (
        <div className="space-y-6">
          {/* Conceptual Alert: Heap is not BST */}
          <div className="p-4 bg-[#FAF0F2] border border-[#7F011F]/20 rounded-2xl text-xs text-[#7F011F] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#7F011F]" />
              <span>Core Distinction: Why a Binary Heap is NOT a Binary Search Tree (BST)</span>
            </div>
            <p className="text-[#2A161B] leading-relaxed">
              In a <strong>Binary Search Tree</strong>, all keys in the left subtree must be smaller than the root, and all keys in the right subtree larger.
              In a <strong>Priority Min-Heap</strong>, the only invariant is that each parent node is &le; both its children. There is NO left-versus-right ordering.
              This allows complete binary trees to be represented compactly inside a flat 0-indexed contiguous array where parent = <code>(i-1)/2</code> and children = <code>2i+1, 2i+2</code> with guaranteed O(1) peek and O(log N) insert/extract.
            </p>
          </div>

          {/* Interactive Operations: Insert & Extract */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-[#7F011F] text-sm">Interactive Priority Heap Operations</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Insert patient form */}
              <form onSubmit={handleHeapInsert} className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-3">
                <div className="font-bold text-[#2A161B]">Insert Patient (Traces Sift-Up Swaps)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={heapInsertId}
                    onChange={(e) => setHeapInsertId(e.target.value)}
                    className="p-2 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Patient ID"
                  />
                  <input
                    type="text"
                    required
                    value={heapInsertName}
                    onChange={(e) => setHeapInsertName(e.target.value)}
                    className="p-2 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Patient Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={heapInsertPrio}
                    onChange={(e) => setHeapInsertPrio(parseInt(e.target.value))}
                    className="p-2 rounded-xl border border-[#E8DBC0] bg-white font-bold text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  >
                    <option value={1}>Priority 1 — Critical</option>
                    <option value={2}>Priority 2 — Urgent</option>
                    <option value={3}>Priority 3 — Normal</option>
                  </select>
                  <input
                    type="text"
                    value={heapInsertConcern}
                    onChange={(e) => setHeapInsertConcern(e.target.value)}
                    className="p-2 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Reported Concern"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                >
                  Insert Node (Bubble Up)
                </button>
              </form>

              {/* Extract Min button */}
              <div className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-[#2A161B]">Extract-Min Root (Traces Sift-Down Swaps)</div>
                  <p className="text-[#6E5A5E] text-[11px] mt-1">
                    Pops the minimum priority node from the root, moves the last leaf to index 0, and restores heap invariant via sift-down comparisons with the smaller child.
                  </p>
                </div>
                <button
                  onClick={handleHeapExtract}
                  className="w-full py-2.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                >
                  Extract Root Patient
                </button>
              </div>
            </div>

            {/* Trace consoles */}
            {(heapTrace || heapExtractTrace) && (
              <div className="p-3.5 bg-[#2A161B] text-[#F5EBD0] rounded-xl text-xs font-mono space-y-1">
                <div className="text-[#F5EBD0] font-bold">Latest Heap Operation Sift Trace:</div>
                <div className="text-[11px] text-white/80 max-h-24 overflow-y-auto space-y-0.5">
                  {(heapTrace || heapExtractTrace).map((t: any, idx: number) => (
                    <div key={idx}>↳ Step {idx + 1}: {t.description}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dual View: Binary Heap SVG Tree + Flat Array Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Heap Tree */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#7F011F] text-sm">Binary Heap Tree Structure</h3>
                <span className="text-xs font-mono text-[#6E5A5E]">Root = Priority 1</span>
              </div>
              <div className="border border-[#E8DBC0] rounded-xl bg-[#FAF6EC]/50 overflow-x-auto min-h-[320px] flex items-center justify-center p-4">
                {heapData?.tree_representation ? (
                  <svg width="600" height="300" className="mx-auto">
                    {renderTreeSVG(heapData.tree_representation, 300, 35, 120)}
                  </svg>
                ) : (
                  <span className="text-xs text-[#8C7B7E]">Empty Heap</span>
                )}
              </div>
            </div>

            {/* Readable Flat Array Representation Table */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#7F011F] text-sm">Contiguous Array Storage</h3>
                <span className="text-[10px] font-mono text-[#6E5A5E]">0-Indexed Vector</span>
              </div>
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6EC] text-[#6E5A5E] uppercase font-semibold text-[10px] border-b border-[#E8DBC0]">
                    <tr>
                      <th className="py-2.5 px-3">Index i</th>
                      <th className="py-2.5 px-3">Parent (i-1)/2</th>
                      <th className="py-2.5 px-3">Children 2i+1, 2i+2</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DBC0]/40 font-mono text-[11px] text-[#2A161B]">
                    {heapData?.array_representation?.map((item: any) => (
                      <tr key={item.index} className="hover:bg-[#FAF6EC]/60">
                        <td className="py-2 px-3 font-bold text-[#7F011F]">[{item.index}]</td>
                        <td className="py-2 px-3 text-[#6E5A5E]">{item.parent_index !== null ? `[${item.parent_index}]` : 'Root'}</td>
                        <td className="py-2 px-3 text-[#6E5A5E]">
                          {item.left_child_index !== null ? `[${item.left_child_index}]` : '-'},{' '}
                          {item.right_child_index !== null ? `[${item.right_child_index}]` : '-'}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-[#2A161B]">
                          {item.node.patient_id} ({item.node.patient_name})
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.node.priority === 1 ? 'bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20' :
                            item.node.priority === 2 ? 'bg-amber-100 text-amber-800' :
                            'bg-[#FAF6EC] text-[#6E5A5E] border border-[#E8DBC0]'
                          }`}>
                            P{item.node.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB C: HASH TABLE & CHAINING --- */}
      {/* ========================================================================= */}
      {activeTab === 'hash' && (
        <div className="space-y-6">
          {/* Hash Table Stats & Controls */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DBC0]/60">
              <div>
                <h3 className="font-bold text-[#7F011F] text-sm">Custom Hash Table with Separate Chaining</h3>
                <p className="text-[#6E5A5E]">DJB2 32-bit polynomial rolling hash function with linked-list collision resolution buckets</p>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-[#6E5A5E]">
                <span>Capacity M: <strong>{hashData?.capacity}</strong></span>
                <span>•</span>
                <span>Size N: <strong>{hashData?.size}</strong></span>
                <span>•</span>
                <span>Load Factor &alpha;: <strong>{hashData?.load_factor}</strong> (&le; 0.75)</span>
                <span>•</span>
                <span>Collisions: <strong>{hashData?.total_collisions}</strong></span>
              </div>
            </div>

            {/* Lookup & Insert Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-2">
                <div className="font-bold text-[#2A161B]">1. Key Lookup (Phone / Patient ID)</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hashLookupKey}
                    onChange={(e) => setHashLookupKey(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-white text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Key (e.g. 9876543210 or PT-101)"
                  />
                  <button
                    onClick={handleHashLookup}
                    className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                  >
                    Lookup
                  </button>
                </div>
                {hashLookupResult && (
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8DBC0] font-mono text-[11px] space-y-0.5">
                    <div>Bucket Index: <strong className="text-[#7F011F]">[{hashLookupResult.trace.bucket_index}]</strong></div>
                    <div>Probes Needed: <strong>{hashLookupResult.trace.probes} step(s)</strong></div>
                    <div className="text-emerald-700 font-semibold">{hashLookupResult.trace.description}</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleHashInsert} className="p-4 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] space-y-2">
                <div className="font-bold text-[#2A161B]">2. Insert Custom Key-Value</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={hashInsertKey}
                    onChange={(e) => setHashInsertKey(e.target.value)}
                    className="p-1.5 rounded-xl border border-[#E8DBC0] bg-white text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Key"
                  />
                  <input
                    type="text"
                    required
                    value={hashInsertVal}
                    onChange={(e) => setHashInsertVal(e.target.value)}
                    className="p-1.5 rounded-xl border border-[#E8DBC0] bg-white text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    placeholder="Value payload"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                >
                  Insert & Resolve Collision
                </button>
              </form>
            </div>
          </div>

          {/* Bucket Array Visualization Grid */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3">
            <h3 className="font-bold text-[#7F011F] text-sm">Visual Bucket Array [0 .. M-1] with Linked Lists</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {hashData?.buckets?.map((b: any) => (
                <div
                  key={b.bucket_index}
                  className={`p-3.5 rounded-xl border transition ${
                    b.chain_length > 1
                      ? 'bg-amber-50/70 border-amber-200'
                      : b.chain_length === 1
                      ? 'bg-[#FAF0F2] border-[#7F011F]/20'
                      : 'bg-[#FAF6EC]/50 border-[#E8DBC0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#2A161B] mb-1.5">
                    <span>Bucket [{b.bucket_index}]</span>
                    <span className="text-[10px] text-[#6E5A5E] font-normal">
                      Len: {b.chain_length} {b.chain_length > 1 && '⚠️ Collision'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-[#2A161B]">
                    {b.items.length > 0 ? (
                      b.items.map((item: any, i: number) => (
                        <div key={i} className="p-1.5 bg-white rounded-lg border border-[#E8DBC0] shadow-2xs truncate">
                          <strong>{item.key}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8C7B7E] italic text-[10px]">NULL (Empty)</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB D: HOSPITAL RESOURCE GRAPH --- */}
      {/* ========================================================================= */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DBC0]/60">
              <div>
                <h3 className="font-bold text-[#7F011F] text-sm">Hospital Resource Graph Traversal Engine</h3>
                <p className="text-[#6E5A5E]">Breadth-First Search (queue-based) and Depth-First Search (stack-based) on live hospital relationships</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={graphStartNode}
                  onChange={(e) => setGraphStartNode(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] font-semibold text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                >
                  <option value="DEPT-EME">Emergency Dept</option>
                  <option value="DEPT-CAR">Cardiology Dept</option>
                  <option value="DEPT-ORT">Orthopedics Dept</option>
                  <option value="PT-PT-101">Patient Sara Khan (PT-101)</option>
                </select>

                <button
                  onClick={handleGraphBFS}
                  className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                >
                  Execute BFS
                </button>
                <button
                  onClick={handleGraphDFS}
                  className="px-4 py-1.5 rounded-xl bg-[#FAF6EC] hover:bg-[#F5EBD0] text-[#7F011F] border border-[#E8DBC0] font-bold shadow-xs"
                >
                  Execute DFS
                </button>
              </div>
            </div>

            {/* Traversal Trace Console */}
            {graphTraversal && (
              <div className="p-4 bg-[#2A161B] text-[#F5EBD0] rounded-2xl font-mono text-xs space-y-2">
                <div className="text-[#F5EBD0] font-bold flex items-center justify-between">
                  <span>{graphTraversal.algorithm}</span>
                  <span className="text-white/60 font-normal">{graphTraversal.complexity}</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 text-emerald-300">
                  Visited Order ({graphTraversal.total_visited} nodes): {graphTraversal.visited_order.join(' ➔ ')}
                </div>
                <div className="space-y-1 text-white/80 max-h-32 overflow-y-auto text-[11px]">
                  {graphTraversal.steps.map((st: any) => (
                    <div key={st.step}>Step {st.step}: {st.description}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Graph Adjacency List Inspection */}
            {graphData && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-[#7F011F]">Live Vertex Adjacency Mapping:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {Object.entries(graphData.adjacency_list || {}).map(([v, edges]: [string, any]) => (
                    <div key={v} className="p-3 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] font-mono text-[11px]">
                      <div className="font-bold text-[#2A161B] truncate">{v}</div>
                      <div className="text-[#6E5A5E] mt-0.5 space-y-0.5">
                        {edges.map((e: string, idx: number) => (
                          <div key={idx} className="truncate text-[10px]">↳ {e}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB E: QUEUE VS TIMELINE --- */}
      {/* ========================================================================= */}
      {activeTab === 'queue_vs_timeline' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-[#7F011F] text-sm">Queue vs Timeline: Pedagogical Architectural Contrast</h3>
              <p className="text-[#6E5A5E]">
                Understanding why modern clinical management requires two complementary data structures:
                a Priority Queue for urgent dispatch scheduling and a Chronological Linked Sequence for immutable forensic audit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Priority Queue Box */}
              <div className="p-5 rounded-2xl bg-[#FAF0F2] border border-[#7F011F]/20 space-y-3">
                <div className="flex items-center justify-between font-bold text-[#7F011F] text-sm">
                  <span>Priority Min-Heap Queue</span>
                  <span className="text-[10px] bg-[#7F011F] text-[#F5EBD0] px-2 py-0.5 rounded-full">Dynamic Dispatch</span>
                </div>
                <div className="text-[#2A161B] leading-relaxed text-[11px]">
                  <strong>Ordering Law:</strong> Priority (1 &gt; 2 &gt; 3) with arrival timestamp tie-breaker.
                  High-urgency cardiac or trauma patients dynamically jump ahead of earlier-arriving normal cases.
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8DBC0] space-y-1.5 font-mono text-[11px]">
                  <div className="text-[#8C7B7E] font-bold uppercase text-[9px]">Live Dispatch Ordering:</div>
                  {compareData?.concepts?.priority_queue?.current_order?.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-sans">
                      <span className="font-bold text-[#2A161B]">#{idx + 1} {p.patient_id} ({p.name})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.priority === 1 ? 'bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20' : p.priority === 2 ? 'bg-amber-100 text-amber-800' : 'bg-[#FAF6EC] text-[#6E5A5E]'}`}>
                        P{p.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Box */}
              <div className="p-5 rounded-2xl bg-[#FAF6EC] border border-[#E8DBC0] space-y-3">
                <div className="flex items-center justify-between font-bold text-[#2A161B] text-sm">
                  <span>Chronological Medical Timeline</span>
                  <span className="text-[10px] bg-[#E8DBC0] text-[#2A161B] px-2 py-0.5 rounded-full">Immutable Event Stream</span>
                </div>
                <div className="text-[#2A161B] leading-relaxed text-[11px]">
                  <strong>Ordering Law:</strong> Strict temporal order T_0 &lt; T_1 &lt; T_2.
                  Events are appended at O(1) time and never reordered regardless of clinical priority.
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8DBC0] space-y-1.5 font-mono text-[11px]">
                  <div className="text-[#8C7B7E] font-bold uppercase text-[9px]">Strict Arrival Chronology:</div>
                  {compareData?.concepts?.timeline?.current_order?.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-sans text-[#2A161B]">
                      <span>#{idx + 1} {p.patient_id} ({p.name})</span>
                      <span className="text-[#8C7B7E] text-[10px]">{p.arrival}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB F: COMPLEXITY ANALYSIS MATRIX --- */}
      {/* ========================================================================= */}
      {activeTab === 'complexity' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-[#7F011F] text-sm">Master Data Structures & Algorithms Complexity Matrix</h3>
            <p className="text-xs text-[#6E5A5E]">
              Rigorous theoretical and empirical complexity bounds for all algorithmic subsystems implemented in MedTree X
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EC] text-[#6E5A5E] uppercase font-semibold text-[10px] border-b border-[#E8DBC0]">
                <tr>
                  <th className="py-3 px-4">Data Structure / Algorithm</th>
                  <th className="py-3 px-4">Clinical Use Case</th>
                  <th className="py-3 px-4">Search (Avg)</th>
                  <th className="py-3 px-4">Search (Worst)</th>
                  <th className="py-3 px-4">Insert (Avg)</th>
                  <th className="py-3 px-4">Delete (Avg)</th>
                  <th className="py-3 px-4">Space</th>
                  <th className="py-3 px-4">Theoretical Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DBC0]/40 font-mono text-[11px] text-[#2A161B]">
                {complexityList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF6EC]/60">
                    <td className="py-2.5 px-4 font-sans font-bold text-[#7F011F]">{row.data_structure}</td>
                    <td className="py-2.5 px-4 font-sans text-[#2A161B] text-xs">{row.use_case}</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">{row.search_avg}</td>
                    <td className="py-2.5 px-4 font-bold text-[#7F011F]">{row.search_worst}</td>
                    <td className="py-2.5 px-4 text-[#2A161B]">{row.insert_avg}</td>
                    <td className="py-2.5 px-4 text-[#2A161B]">{row.delete_avg}</td>
                    <td className="py-2.5 px-4 text-[#2A161B]">{row.space}</td>
                    <td className="py-2.5 px-4 font-sans text-[11px] text-[#6E5A5E]">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
