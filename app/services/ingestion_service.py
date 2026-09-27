from types import SimpleNamespace
import time

from sqlalchemy.orm import Session

from app.models.sensor_reading import SensorReading
from app.repositories.sensor_repo import create_sensor_readings
from app.models.risk_score import RiskScore
from app.services.alert_service import generate_alert_for_node
from app.ai.pipeline import pipeline


def ingest_gateway_packet(packet, db: Session):
    readings = []

    for node in packet.payload.nodes:
        reading = SensorReading(
            gateway_id=packet.gateway_id,
            bridge_id=packet.payload.bridge_id,
            node_id=node.node_id,
            node_timestamp=node.ts,
            gateway_received_timestamp=int(time.time()),
            buffered=packet.buffered,
            tilt_x=node.tilt_x,
            tilt_y=node.tilt_y,
            vib_rms=node.vib_rms,
            flex_raw=node.flex_raw,
            crack_ok=node.crack_ok,
            rssi=node.rssi,
        )

        readings.append(reading)

    # Save raw telemetry first.
    create_sensor_readings(db, readings)

    # ---------------------------------------------------------
    # LIVE AI PIPELINE
    # A, B and C are all processed here.
    # ---------------------------------------------------------

    ai_readings = [
        SimpleNamespace(
            node_id=reading.node_id,
            ts=reading.node_timestamp,
            tilt_x=reading.tilt_x,
            tilt_y=reading.tilt_y,
            vib_rms=reading.vib_rms,
            flex_raw=reading.flex_raw,
            crack_ok=reading.crack_ok,
            rssi=reading.rssi,
        )
        for reading in readings
    ]

    ai_results = pipeline.process_packet(ai_readings)

    # ---------------------------------------------------------
    # Store AI prediction for every node.
    # ---------------------------------------------------------

    for result in ai_results:
        risk_entry = RiskScore(
            node_id=result["node_id"],

            # AI fusion score is 0.0 - 1.0.
            # Database/frontend use 0 - 100.
            score=round(result["fusion_score"] * 100, 2),

            # Store the AI progression/signal.
            signal=result["progression"],

            # AI severity: GREEN / AMBER / RED.
            severity=result["severity"],

            node_timestamp=next(
                reading.node_timestamp
                for reading in readings
                if reading.node_id == result["node_id"]
            ),
        )

        db.add(risk_entry)

    db.commit()

    # ---------------------------------------------------------
    # Generate alerts after AI predictions are stored.
    # ---------------------------------------------------------

    for reading in readings:
        generate_alert_for_node(reading.node_id, db)

    return {
        "status": "success",
        "row_inserted": len(readings),
        "ai_processed": len(ai_results),
        "nodes_processed": [result["node_id"] for result in ai_results],
        "ai": [
            {
                "node_id": result["node_id"],
                "fusion_score": round(result["fusion_score"], 4),
                "severity": result["severity"],
                "progression": result["progression"],
                "corroborated": result["corroborated"],
            }
            for result in ai_results
        ],
    }