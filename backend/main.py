"""
MedTree X — Intelligent Hospital Record & Patient Flow Management System
FastAPI Application Entry Point.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from .database import engine, Base, get_db, SessionLocal
from .seed_data import seed_database
from .routers import (
    patients, queue, resources, labs, cds,
    audit, duplicates, analytics, export,
    auth, appointments, mar, inpatient, nutrition,
    inventory, surge, qr, websocket,
    critical_results, change_alerts, handover, corrections
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Seed initial data
with SessionLocal() as db_session:
    seed_database(db_session, force_reset=False)

app = FastAPI(
    title="MedTree X API",
    description="Intelligent Hospital Record & Patient Flow Management System Powered by Data Structures and Algorithms",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(websocket.router)
app.include_router(auth.router)
app.include_router(appointments.router)
app.include_router(mar.router)
app.include_router(inpatient.router)
app.include_router(nutrition.router)
app.include_router(inventory.router)
app.include_router(surge.router)
app.include_router(qr.router)
app.include_router(analytics.router)
app.include_router(patients.router)
app.include_router(queue.router)
app.include_router(resources.router)
app.include_router(labs.router)
app.include_router(cds.router)
app.include_router(audit.router)
app.include_router(duplicates.router)
app.include_router(export.router)
app.include_router(critical_results.router)
app.include_router(change_alerts.router)
app.include_router(handover.router)
app.include_router(corrections.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MedTree X Hospital Flow Engine",
        "version": "1.0.0",
        "dsa_features_active": [
            "PriorityMinHeap (Patient Flow Engine)",
            "BinarySearchTree & AVLTree (Patient ID Indexing)",
            "CustomHashTable (O(1) Contact & ID Resolution)",
            "HospitalResourceGraph (BFS/DFS Entity Pathfinding)",
            "CryptographicHashChain (Tamper-Evident SHA-256 Audit Trail)",
            "LevenshteinSimilarity (Duplicate Record Detection)",
            "ExplainableRuleEngine (Clinical Decision Support)",
            "CapacityQueueEstimator (Waiting Time & Load Forecast)",
            "FHIRInteroperability (Structured JSON Export)",
        ]
    }


@app.post("/api/system/reset-demo")
def reset_demo_data(db: Session = Depends(get_db)):
    """Resets database to pristine synthetic clinical demonstration records."""
    seed_database(db, force_reset=True)
    return {
        "status": "success",
        "message": "Hospital database and cryptographic audit trail reset to clean demonstration state."
    }


# Mount frontend SPA build if available
frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_dir):
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json") or full_path.startswith("ws"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = os.path.join(frontend_dist_dir, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
