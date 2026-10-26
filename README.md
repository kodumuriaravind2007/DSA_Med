# MedTree X — Intelligent Hospital Record & Patient Flow Management System

**Academic Context:** B.Tech 2nd-Year Data Structures and Algorithms (DSA) Project  
**Architecture:** Modern Full-Stack Healthcare Operations Platform (FastAPI + React TypeScript + SQLite + Tailwind CSS)

---

## 1. Project Overview

**MedTree X** is a modern, production-grade hospital management web application designed to demonstrate real-world implementations of Data Structures and Algorithms (DSA) combined with professional healthcare workflows, persistent database storage, live analytics, and an elegant clinical dashboard.

Rather than presenting mock designs or isolated algorithmic scripts, **MedTree X** bridges theoretical computer science concepts directly to mission-critical hospital operations:
- Managing emergency triage and treatment dispatch using **Priority Min-Heaps**.
- Indexing and searching electronic health records using **Binary Search Trees (BST)** and **AVL Trees**.
- Resolving patient identifiers and contacts with $O(1)$ **Hash Tables** using separate chaining.
- Mapping interrelated hospital resources (patients, physicians, ward beds, diagnostic units) using a **Hospital Resource Graph** with **Breadth-First Search (BFS)** and **Depth-First Search (DFS)**.
- Guaranteeing tamper-evident operational compliance using **Cryptographic SHA-256 Hash Chaining** (Blockchain-inspired audit trail).
- Preventing duplicate records with **Dynamic Programming Levenshtein Distance** and normalized hash indexes.
- Transparent, explainable clinical decision support with missing-data detection and mandatory clinician overrides.
- Interoperable healthcare record export modeled on **HL7 FHIR R4 JSON Bundles**.

---

## 2. Technology Stack

- **Frontend:** React 19 with TypeScript, Vite
- **Styling:** Tailwind CSS with a clinical design system
  - Primary Navy: `#142B4A`
  - Secondary Blue: `#2563EB`
  - Teal Accent: `#0F9D92`
  - Neutral Background: `#F4F7FB`
  - Critical Alert: `#DC2626`
  - Warning: `#D97706`
  - Success: `#15803D`
- **Icons:** Lucide React
- **Data Visualization & Charts:** Recharts (Arrivals vs completions, priority breakdown, workload distribution)
- **Backend:** Python 3.13 with FastAPI and Pydantic v2
- **Persistent Storage:** SQLite (structured with SQLAlchemy ORM, architected for zero-downtime PostgreSQL migration)
- **Algorithm Implementations:** Pure, documented Python modules with step-by-step trace generation for educational visualizers

---

## 3. The Eight Advanced Clinical DSA Features

### Feature 1: Smart Patient Flow Engine (Priority Min-Heap)
- **Data Structure:** `PriorityMinHeap`
- **Priority Levels:**
  - **Priority 1 — Critical** (e.g., Acute Coronary Syndrome, Respiratory Failure)
  - **Priority 2 — Urgent** (e.g., Compound Fractures, Pediatric Hyperpyrexia)
  - **Priority 3 — Normal** (e.g., Routine viral complaints, Diabetic checkups)
- **Invariants:** Root node represents the highest clinical urgency. When priorities are equal, arrival timestamps break ties ($O(1)$ FIFO tie-breaking).
- **Operations:**
  - `insert()`: $O(\log N)$ bubble-up (sift-up).
  - `extract_min()`: $O(\log N)$ root replacement and sift-down.
  - `peek()`: $O(1)$ inspect root patient.
  - `rebuild()`: $O(N)$ Floyd's build-heap algorithm.
- **Explainability:** The dashboard explains *why* the next patient is selected ("Root patient P-101 has Priority 1 and arrived before subsequent Priority 1 cases").

### Feature 2: Unified Patient Health Timeline & 360° EHR
- **Data Structures:** Binary Search Tree / Indexed Hash Table + Chronological Event Stream (Linked List)
- **Contents:** Demographics, vitals (BP, SpO2, HR, Temp, RR), reported complaints, known allergies with severity tags, active medications, previous visits, diagnostic laboratory orders and parameter-level results, assigned doctors and ward beds.
- **Timeline:** Strictly ordered $T_0 < T_1 < T_2$ sequential event stream preserving historical medical events without urgency reordering.

### Feature 3: Intelligent Bed and Doctor Allocation (Hospital Resource Graph)
- **Data Structure:** `HospitalResourceGraph` (Adjacency List with $V$ vertices and $E$ edges)
- **Entities:** Patients, Departments, Doctors, Ward Beds, Diagnostic Laboratories.
- **Conflict Prevention:** Strict server-side validation prevents assigning an occupied/cleaning bed or an off-duty physician.
- **Algorithms:**
  - **Breadth-First Search (BFS):** Explores resource neighborhoods level-by-level with queue-state trace ($O(V + E)$).
  - **Depth-First Search (DFS):** Traverses deep entity dependency paths with call-stack trace ($O(V + E)$).
  - **Resource Matching:** Pathfinding from `Patient -> Department -> Available Physician & Available Ward Bed`.

### Feature 4: Duplicate Record Detection Engine
- **Algorithms:**
  - $O(1)$ exact hash lookup on normalized phone numbers (E.164 stripped) and email addresses.
  - Dynamic Programming **Levenshtein Distance** ($O(M \times N)$ minimum edit distance) combined with token-sort ratio for permutation-invariant name matching.
- **Ranked Candidates:** Generates match confidence percentages and field-level evidence (e.g. "Exact Phone Match + 88% Name Similarity").
- **Human-in-the-Loop Governance:** Strictly prohibits automated merging to safeguard patient clinical safety.

### Feature 5: Explainable Clinical Decision Support (CDS)
- **Rule Engine:** Transparent, deterministic triage suggestion rules:
  - `CRIT-RESP-01`: SpO2 $< 90\%$ triggers Priority 1 Critical.
  - `CRIT-CARD-01`: Acute chest pain triggers Priority 1 Cardiology alert.
  - `CRIT-HEMO-01`: Extreme blood pressure triggers hemodynamic alert.
  - `URG-TEMP-01`: Temperature $\ge 103^\circ\text{F}$ triggers urgent pediatric/medical escalation.
- **Transparency:** Displays triggered rules, explains reasoning, detects missing vital readings, and allows authorized clinicians to record override justifications.
- **Educational Disclaimer:** Prominently labels the rule engine as an educational triage prototype, not a certified diagnostic device.

### Feature 6: Tamper-Evident Cryptographic Audit Trail
- **Algorithm:** SHA-256 Hash Chaining from Genesis Block:
  $$\text{Block}[i] = \text{SHA256}(\text{Block}[i-1].\text{hash} \parallel \text{Timestamp} \parallel \text{Actor} \parallel \text{Action} \parallel \text{RecordID} \parallel \text{Payload})$$
- **Integrity Verification:** Full $O(N)$ linear recalculation confirms every block hash and parent pointer.
- **Tamper Simulation Demo:** Educational endpoint in the dashboard proves that altering even 1 character in historical audit details immediately breaks all downstream hashes and identifies the exact compromised block.

### Feature 7: Estimated Waiting Time and Hospital Load Forecast
- **Queuing Formula:** Transparent baseline calculation:
  $$\text{Est. Wait (minutes)} = \frac{\sum_{i \in \text{ahead}} \text{Duration}(P_i)}{\max(1, \text{Active Doctors})}$$
  where Priority 1 is weighted at 30 min, Priority 2 at 20 min, and Priority 3 at 12 min.
- **Hospital Load Index:** Dynamic stress barometer calculating composite load from bed occupancy percentage and patient-to-doctor ratios.

### Feature 8: Interoperable Medical Records (HL7 FHIR-Inspired)
- **Format:** Structured JSON Export following HL7 FHIR R4 Bundle specifications:
  - `Bundle` resource containing:
    - `Patient` resource (demographics, identifiers, telecom, extensions)
    - `Encounter` resource (department, encounter class, reason)
    - `Observation` resources for vital sign panels and parameter-level lab results with LOINC codes
- **Export Options:** Downloadable FHIR JSON bundle and tabular CSV patient registry.

---

## 4. The Five Dashboard Screens + Dedicated Professional DSA Board

1. **Hospital Command Center:**
   - 6 KPI Cards: Total Patients, Waiting Patients, Critical Cases, Available Beds, Doctors On Duty, Estimated Wait Time.
   - Hospital Load Barometer (Green/Amber/Red surge indicator).
   - Recharts arrivals vs completions hourly chart.
   - Priority distribution pie chart.
   - Ward workload and capacity progress bars.
   - Recent live clinical alerts.

2. **Live Patient Flow:**
   - Min-Heap "Next Patient" Priority dispatch card with explainable justification.
   - Dense patient flow table with search, priority, department, and status filters.
   - Interactive workflow status transitions (`Waiting` $\to$ `In Treatment` $\to$ `Lab Requested` $\to$ `Observation` $\to$ `Completed`).
   - Priority escalation modal with reheapification trace.

3. **Patient 360° Record:**
   - Patient demographics header with status badges.
   - 7 Clinical Tabs: Overview, Medical Timeline, Lab Reports (with Order & Result modals), Medications & Allergies, Visit History, Record Access Activity, and Structured FHIR Export.

4. **Resource Management:**
   - Ward-wise Bed Availability Board (ICU, Emergency, Surgery, General Male, General Female, Pediatrics).
   - Bed status badges (Available, Occupied, Cleaning, Reserved) with conflict-checked allocation/release.
   - Doctor directory with on-duty toggles and patient assignment modal.
   - Live Hospital Resource Graph interactive tab with live BFS/DFS execution.

5. **Security & Analytics:**
   - 6 Tabs: Audit Trail, 1-Click Cryptographic Verification, Duplicate Record Detection with human review, Hospital Analytics (wait time accuracy), Data Quality completeness scores, and Data Downloads.

6. **Professional DSA Board (Dedicated Workspace):**
   - **Tab A — BST & AVL Tree:** SVG tree rendering, interactive key search with comparisons trace, node deletion with in-order successor, and sequential insert degradation demo.
   - **Tab B — Priority Min-Heap:** Dual view of SVG tree and flat 0-indexed contiguous array table with sift-up/sift-down traces and explanation of why Heap $\neq$ BST.
   - **Tab C — Hash Table:** Bucket array `[0..M-1]` with separate chaining linked lists, DJB2 hash calculation trace, and dynamic load factor monitoring.
   - **Tab D — Hospital Resource Graph:** Live entity graph with interactive BFS and DFS traversals displaying queue and call stack snapshots.
   - **Tab E — Queue vs Timeline:** Conceptual comparison of dynamic scheduling queues vs immutable chronological logs.
   - **Tab F — Master Complexity Table:** Comprehensive reference matrix with theoretical and empirical complexities.

---

## 5. Master DSA Complexity Matrix

| Data Structure / Algorithm | Clinical Workflow | Search (Avg) | Search (Worst) | Insert (Avg) | Delete (Avg) | Space | Complexity Notes |
|---|---|---|---|---|---|---|---|
| **Binary Search Tree (BST)** | Patient ID indexing | $O(\log N)$ | $O(N)$ | $O(\log N)$ | $O(\log N)$ | $O(N)$ | Unbalanced BST degrades to $O(N)$ under sorted sequential inserts. |
| **AVL Tree (Balanced BST)** | Guaranteed lookup | $O(\log N)$ | $O(\log N)$ | $O(\log N)$ | $O(\log N)$ | $O(N)$ | Strict balance factor $|h_L - h_R| \le 1$ maintained via LL, RR, LR, RL rotations. |
| **Priority Min-Heap** | Triage flow & dispatch | $O(1)$ (peek root) | $O(N)$ (arbitrary) | $O(\log N)$ | $O(\log N)$ (extract) | $O(N)$ | Stored in flat array: parent at `(i-1)/2`, children at `2i+1, 2i+2`. Floyd's rebuild is $O(N)$. |
| **Hash Table (Chaining)** | Phone & ID resolution | $O(1)$ | $O(N)$ | $O(1)$ | $O(1)$ | $O(N + M)$ | DJB2 hash algorithm with separate chaining. Dynamically rehashes when $\alpha > 0.75$. |
| **Hospital Resource Graph** | Resource allocation | $O(1)$ (vertex) | $O(V + E)$ (BFS/DFS) | $O(1)$ (edge) | $O(V + E)$ | $O(V + E)$ | Adjacency list representation enables shortest-path matching and department traversal. |
| **Cryptographic Hash Chain** | Tamper-evident audit | $O(1)$ (append) | $O(N)$ (verify) | $O(1)$ | N/A (Append-only) | $O(N)$ | SHA-256 block hashing: altering 1 payload breaks all downstream block hashes. |
| **Levenshtein Distance** | Duplicate detection | $O(M \times N)$ | $O(M \times N)$ | N/A | N/A | $O(M \times N)$ | Dynamic programming minimum edit distance calculation for patient name similarity. |

---

## 6. Project Directory Structure

```
dsa medtree/
├── backend/
│   ├── database.py              # SQLite engine, sessionmaker, Base
│   ├── models.py                # SQLAlchemy ORM models (Patients, Vitals, Beds, Doctors, Labs, Audit)
│   ├── schemas.py               # Pydantic v2 schemas for request validation
│   ├── seed_data.py             # Realistic clinical synthetic seed data (12 patients, duplicate pair, beds, docs)
│   ├── main.py                  # FastAPI application entrypoint with CORS & routes
│   ├── dsa/
│   │   ├── min_heap.py          # PriorityMinHeap & PatientQueueNode with step traces
│   │   ├── bst.py               # BinarySearchTree & self-balancing AVLTree with SVG serialization
│   │   ├── hash_table.py        # CustomHashTable with DJB2 & separate chaining buckets
│   │   ├── graph.py             # HospitalResourceGraph with BFS, DFS, and resource matching
│   │   ├── duplicate_detector.py# Levenshtein distance, token sort ratio, and phone hashing
│   │   ├── audit_chain.py       # SHA-256 hash chaining, block verification, and tamper detector
│   │   └── waiting_time_estimator.py # Queuing theory waiting time formula & hospital load index
│   ├── routers/
│   │   ├── analytics.py         # Command center KPIs, workload metrics, hourly flow
│   │   ├── patients.py          # Patient registration, 360 EHR retrieval, status workflows
│   │   ├── queue.py             # Live queue endpoints & Min-Heap dispatch
│   │   ├── resources.py         # Beds board, doctor directory, and entity graph
│   │   ├── labs.py              # Clinical concerns catalog, lab orders, parameter results
│   │   ├── cds.py               # Explainable rule-based clinical decision support
│   │   ├── audit.py             # Audit trail inspection & cryptographic verification
│   │   ├── duplicates.py        # Duplicate candidate scanning & human review
│   │   ├── export.py            # FHIR-inspired JSON Bundle & CSV registry export
│   │   └── dsa_api.py           # Dedicated interactive endpoints for the DSA Board
│   └── tests/
│       ├── test_dsa.py          # Unit tests for all DSA algorithms (100% pass)
│       └── test_api.py          # Integration tests for all backend routes (100% pass)
├── frontend/
│   ├── src/
│   │   ├── types.ts             # TypeScript domain interfaces
│   │   ├── services/api.ts      # Typed API client
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Dark navy sidebar with role switcher & demo reset
│   │   │   ├── TopBar.tsx       # Global search, alert bell popover, role indicator
│   │   │   ├── StatusBadge.tsx  # Priority, workflow, and bed status badges
│   │   │   └── RegisterPatientModal.tsx # Patient registration with live CDS suggestion
│   │   ├── views/
│   │   │   ├── CommandCenterView.tsx      # Screen 1: Hospital Command Center
│   │   │   ├── LivePatientFlowView.tsx    # Screen 2: Live Patient Flow (Min-Heap root)
│   │   │   ├── Patient360View.tsx         # Screen 3: Patient 360 Record (7 tabs + FHIR)
│   │   │   ├── ResourceManagementView.tsx # Screen 4: Resource Management (Beds, Doctors, Graph)
│   │   │   ├── SecurityAnalyticsView.tsx  # Screen 5: Security & Analytics (Audit & Duplicates)
│   │   │   └── DsaBoardView.tsx           # Screen 6: Professional DSA Board
│   │   ├── App.tsx              # Main React orchestrator
│   │   └── main.tsx             # React DOM entrypoint
│   ├── index.html
│   ├── tailwind.config.js       # MedTree X clinical design tokens
│   ├── tsconfig.app.json
│   └── vite.config.ts           # Vite with proxy to FastAPI backend
├── requirements.txt             # Python backend dependencies
├── start_medtree.bat            # One-click Windows launcher
├── start_medtree.ps1            # One-click PowerShell launcher
└── README.md
```

---

## 7. How to Run the Application

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ and npm (Tested on Node v24)

### Quick One-Click Launch (Windows)
Double-click `start_medtree.bat` or run in PowerShell:
```powershell
.\start_medtree.ps1
```

### Manual Setup Instructions

#### 1. Backend Setup
```bash
# Navigate to project root
cd "e:\VS CODE\dsa medtree"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at:
- **API Root / Health Check:** `http://127.0.0.1:8000/api/health`
- **Interactive OpenAPI Documentation:** `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd "e:\VS CODE\dsa medtree\frontend"

# Install frontend dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```
The application will launch at:
- **MedTree X Web App:** `http://localhost:5173`

---

## 8. Running Automated Tests

All algorithms and endpoints are thoroughly tested. To run the automated test suite:

```bash
# Run all tests
.\venv\Scripts\python -m pytest backend/tests -v
```

**Test Results:**
- `test_priority_min_heap_ordering`: PASSED (Verifies Critical 1 preemption and arrival timestamp tie-breaking)
- `test_bst_and_avl`: PASSED (Verifies BST search, in-order sorted traversal, node deletion, and AVL balance)
- `test_custom_hash_table`: PASSED (Verifies DJB2 hashing, chaining, and $O(1)$ lookups)
- `test_hospital_resource_graph_bfs_dfs`: PASSED (Verifies BFS/DFS traversal and resource path matching)
- `test_audit_chain_verification_and_tampering`: PASSED (Verifies SHA-256 chain integrity and tamper detection)
- `test_duplicate_detection_and_levenshtein`: PASSED (Verifies exact phone hashing and fuzzy Levenshtein similarity)
- `test_clinical_decision_support_rules`: PASSED (Verifies hypoxemia and pediatric fever rules)
- `test_waiting_time_estimator`: PASSED (Verifies priority-weighted queue formulas)
- `test_auth_crypto_primitives`: PASSED (PBKDF2-HMAC-SHA256 password hashing & RFC 7519 JWT verification)
- `test_auth_endpoints_and_isolation`: PASSED (Strict server-side patient record isolation)
- `test_patient_portal_self_registration`: PASSED (Unique PT-XXX generation and user registration)
- `test_appointment_lifecycle_and_check_in`: PASSED (Check-in enqueues into triage Min-Heap)
- `test_mar_administration_and_hold`: PASSED (MAR administration and mandatory hold rationale documentation)
- `test_post_op_care_and_inpatient_vitals`: PASSED (Post-op tasks and 0-10 pain score logging)
- `test_nutrition_allergen_conflict_detection`: PASSED (Bedside allergen safety interceptor)
- `test_inventory_management_and_alerts`: PASSED (Pharmacy stock movements and low-stock detection)
- `test_surge_forecasting_simulation`: PASSED (Parametric crisis stress testing and bottleneck forecasting)
- `test_qr_patient_identification`: PASSED (Tamper-evident HMAC QR wristband validation)
- `test_websocket_status`: PASSED (Real-time synchronization hub online)
- **Result:** ALL 28/28 tests passing (100% test pass rate).

---

## 9. Pre-Configured Demonstration Logins

The application includes two secure entry points with 1-click login profiles:

| Portal | Role | Username | Password | Linked Profile / Description |
|---|---|---|---|---|
| **Patient Portal** | Patient | `patient101` | `password123` | Sara Khan (`PT-101`) — Admitted Cardiac ICU patient, active MAR |
| **Patient Portal** | Patient | `patient102` | `password123` | David Miller (`PT-102`) — Waiting queue patient (Priority 2 Urgent) |
| **Staff Portal** | Receptionist | `receptionist` | `reception123` | Elena Rostova — Intake, check-in, duplicate suspect review |
| **Staff Portal** | Doctor | `dr_smith` | `doctor123` | Dr. Ayesha Mukherjee (`DOC-101`) — Emergency Medicine Physician |
| **Staff Portal** | Doctor | `dr_sharma` | `doctor123` | Dr. Vikram Sethi (`DOC-102`) — Interventional Cardiologist |
| **Staff Portal** | Nurse | `nurse_sarah` | `nurse123` | Nurse Sarah Jenkins, RN — Inpatient Ward & MAR Medication Specialist |
| **Staff Portal** | Admin | `admin` | `admin123` | Chief Operations Officer — Surge Simulation & Command Center |

---

## 10. Academic Project Submission Highlights

- **Real Data Structures in Action:** Not merely theoretical textbook examples; algorithms drive real clinical hospital workflows.
- **Two Secure Login Entry Points:** Patient Portal and Staff Portal with strict server-side RBAC and data isolation.
- **Single Source of Truth:** Patient and Staff dashboards query and modify the same unified SQLite database with real-time WebSocket synchronization.
- **Medication Administration Records (MAR):** Scheduled doses, nurse action recording, and mandatory hold rationales.
- **Bedside Allergen Interception:** Automated conflict detection preventing meal delivery to patients with documented allergies or NPO orders.
- **Hospital Crisis Surge Simulation:** Algorithmic forecasting of queue delays, physician capacity limits, and bed exhaustion horizons.
- **Tamper-Evident SHA-256 Audit Trail:** Blockchain-inspired cryptographic chaining from Genesis Block for compliance.
- **Interoperability:** Structured JSON exports modeled on HL7 FHIR R4 specifications.
#   D S A _ M e d  
 