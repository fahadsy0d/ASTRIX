from fastapi import WebSocket

class Hub:
    def __init__(self):
        self.clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)

    async def broadcast(self, event: str, data: dict):
        dead = []
        for c in list(self.clients):
            try:
                await c.send_json({"event": event, "data": data})
            except Exception:
                dead.append(c)
        for c in dead:
            self.disconnect(c)

hub = Hub()
