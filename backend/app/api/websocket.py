import json
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

ws_manager = ConnectionManager()

@ws_router.websocket("/ws/updates")
async def websocket_updates_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome and ping loop
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to NEPSE Live Intelligence Stream"
        })
        while True:
            # Keep connection alive; accept client messages if any
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
