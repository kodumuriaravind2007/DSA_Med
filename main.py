"""
MedTree X — Cloud Deployment Root Entry Point
Supports running 'uvicorn main:app' and 'python main.py' seamlessly on Render and other cloud platforms.
"""
import os
import uvicorn
from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
