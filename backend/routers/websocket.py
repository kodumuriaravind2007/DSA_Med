"""
WebSocket Real-Time Synchronization Hub for MedTree X.
Broadcasts real-time events across Receptionist, Doctor, Nurse, Admin, and Patient interfaces.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
from datetime import datetime
import asyncio
import json

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Any):
        """Asynchronously broadcasts an event payload to all connected clients."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }
        text_data = json.dumps(payload, default=str)
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_data)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

    def broadcast_sync(self, event_type: str, data: Any):
        """Thread-safe and synchronous trigger to broadcast an event from synchronous endpoints."""
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(event_type, data), loop)
        except RuntimeError:
            pass  # No running event loop (e.g., during some unit tests)


manager = ConnectionManager()


@router.websocket("/ws")
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "anon"):
    await manager.connect(websocket)
    try:
        # Send initial welcome and ping
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "data": {
                "client_id": client_id,
                "message": "Connected to MedTree X Live Flow Event Hub",
            },
            "timestamp": datetime.now().isoformat(),
        }))
        while True:
            # Keep connection open; receive ping or client heartbeats
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "data": {"timestamp": datetime.now().isoformat()}
                    }))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get("/api/ws/status")
def get_websocket_status():
    return {
        "status": "online",
        "active_connections": len(manager.active_connections),
        "channel": "hospital_realtime_stream",
        "timestamp": datetime.now().isoformat(),
    }
