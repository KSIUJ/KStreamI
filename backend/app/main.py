import signaling
from fastapi import FastAPI, APIRouter

app = FastAPI()
app.include_router(signaling.router)