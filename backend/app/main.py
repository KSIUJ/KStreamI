from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.signaling import router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello KStreamI"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

app_state = {
    "maintenance_mode": False
}

@app.get("/api/admin/status")
def get_admin_status():
    """Zwraca obecny stan serwera"""
    return {"maintenance_mode": app_state["maintenance_mode"]}

@app.post("/api/admin/toggle-maintenance")
def toggle_maintenance_api():
    """Przełącza tryb konserwacji (włącza/wyłącza)"""
    app_state["maintenance_mode"] = not app_state["maintenance_mode"]
    status_text = "WŁĄCZONY" if app_state["maintenance_mode"] else "WYŁĄCZONY"
    return {"message": f"Tryb konserwacji został {status_text}", "current_state": app_state["maintenance_mode"]}

app.include_router(router)
