from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.node import Node
from app.models.sensor_reading import SensorReading
import time
from datetime import datetime

router = APIRouter(prefix="/api/nodes",tags=["Nodes"])

@router.get("/")
def get_nodes(db : Session = Depends(get_db)):
    return db.query(Node).all()

@router.get("/status")
def get_node_status(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    current_time = int(time.time())
    response = []
    for node in nodes :
        latest_reading = (db.query(SensorReading).filter(SensorReading.node_id == node.node_id).order_by(SensorReading.node_timestamp.desc()).first())
        if not latest_reading :
            response.append({
                "node_id": node.node_id,
                "status": "NO DATA",
                "last_seen" : None,
                "age_seconds": None,
                "signal_health": None,
                "battery_level": -1.0
            })
            continue
        age = current_time - latest_reading.node_timestamp
        if age < 300 :
                status = "ONLINE"
        elif age < 1800 :
                status = "DELAYED"
        else :
                status = "OFFLINE"
        signal_strength = "UNKNOWN"
        if latest_reading.rssi is not None:
            if latest_reading.rssi < -110:
                signal_strength = "POOR SIGNAL"
            elif latest_reading.rssi < -90:
                signal_strength = "WEAK SIGNAL"
            else :
                signal_strength = "GOOD SIGNAL"
            

        response.append({
            "node_id": node.node_id,
            "status": status,
            "last_seen": datetime.fromtimestamp(latest_reading.node_timestamp).isoformat(),
            "age_seconds": age,
            "signal_health": signal_strength,
            "battery_level": -1.0 #Placeholder for battery level, as it's not available in the current data model
        })
    return response