from fastapi import APIRouter
from pydantic import BaseModel
import subprocess

router = APIRouter(prefix="/api/simulator")

process = None

class SimRequest(BaseModel):
    scenario: str
    duration: int

@router.post("/start")
def start_simulation(req: SimRequest):
    global process

    if process and process.poll() is None:
        return {
            "running": True,
            "message": "Already running"
        }

    process = subprocess.Popen([
        "python",
        "simulate_live.py",
        req.scenario,
    ])

    return {
        "running": True,
        "scenario": req.scenario
    }

@router.post("/stop")
def stop_simulation():
    global process

    if process:
        process.terminate()

    return {"running": False}

@router.get("/status")
def status():
    global process

    return {
        "running": process is not None and process.poll() is None
    }