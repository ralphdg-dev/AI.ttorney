# websocket_manager.py
from fastapi import WebSocket
import json
import time
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

# Global instance
manager = ConnectionManager()

async def notify_lawyers_update():
    """Notify all connected clients that lawyers data has been updated"""
    message = json.dumps({
        "type": "DATA_UPDATED",
        "message": "Lawyers data has been updated",
        "timestamp": time.time()
    })
    await manager.broadcast(message)