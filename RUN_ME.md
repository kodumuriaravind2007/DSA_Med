# 🏥 MedTree X — Quick Run Guide

> **Intelligent Hospital Record & Patient Flow Management System**  
> Powered by Real-Time Data Structures and Algorithms (DSA)

---

## ⚡ 1. Quick Start (One-Click)

The easiest way to start both the **FastAPI Backend** and the **Vite React Frontend** is using the one-click runner:

### Option A: Windows Batch (Recommended)
Simply **double-click** the file:
```cmd
run_me.bat
```
*(Or in Command Prompt / Terminal, you can type `runme.bat`, `run_me.bat`, or `run.bat`)*

### Option B: PowerShell
Open PowerShell in the project directory and run:
```powershell
.\run_me.ps1
```
*(Or type `.\runme.ps1`. If PowerShell asks about execution policy, run: `powershell -ExecutionPolicy Bypass -File .\run_me.ps1`)*

---

## 🌐 2. Accessing the Application

Once launched, the launcher opens your default browser automatically. You can also manually access:

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Main Hospital System UI |
| **Interactive API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | FastAPI Swagger UI |
| **API Health Check** | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) | Backend Status Verification |
| **WebSocket Stream** | `ws://127.0.0.1:8000/ws` | Real-time clinical updates & sync |

---

## 🔑 3. Default Demo Accounts

The database comes pre-seeded with clinical test personas for each hospital role:

| Role | Username | Password | Persona & Department |
|---|---|---|---|
| **Doctor** | `dr_smith` | `doctor123` | Dr. Ayesha Mukherjee — Emergency Medicine |
| **Doctor** | `dr_sharma` | `doctor123` | Dr. Vikram Sethi — Interventional Cardiology |
| **Nurse** | `nurse_sarah` | `nurse123` | Nurse Sarah Jenkins, RN — Inpatient Care |
| **Patient** | `patient101` | `password123` | Sara Khan (Priority 1 — Critical Cardiac Case) |
| **Patient** | `patient102` | `password123` | David Miller (Priority 2 — Urgent) |
| **Receptionist** | `receptionist` | `reception123` | Elena Rostova — Patient Flow & Admissions |
| **Administrator** | `admin` | `admin123` | Chief Operations Officer — Analytics & Audit |

> **Tip:** You can also click the quick role selector tabs directly on the login screen to auto-fill these credentials.

---

## 🛠️ 4. Manual Start (Optional)

If you prefer to start each service in separate terminal windows manually:

### Terminal 1: Backend (FastAPI)
```bash
# In the project root:
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend (Vite + React)
```bash
# In the frontend directory:
cd frontend
npm run dev
```

---

## 🛑 5. How to Stop the Application

To shut down the servers:
1. Close the two terminal windows titled:
   - `MedTree X - FastAPI Backend (Port 8000)`
   - `MedTree X - Vite Frontend (Port 5173)`
2. Alternatively, click into each window and press `Ctrl + C`.

---

## 🔍 6. Troubleshooting

- **Port 8000 or 5173 is already in use:**
  If you previously had MedTree running, check Task Manager for existing `python.exe` or `node.exe` processes, or run:
  ```powershell
  Stop-Process -Name python, node -Force -ErrorAction SilentlyContinue
  ```
- **PowerShell Execution Policy Error:**
  Run the script by explicitly bypassing execution restrictions:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\run_me.ps1
  ```
- **Dependencies Missing:**
  - Python requirements: `.\venv\Scripts\pip install -r requirements.txt`
  - Frontend packages: `cd frontend && npm install`
