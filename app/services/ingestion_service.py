from sqlalchemy.orm import Session
from app.models.sensor_reading import SensorReading
from app.repositories.sensor_repo import (create_sensor_readings, create_sensor_readings)

def ingest_gateway_packet(packet,db: Session):
    readings = []
    for node in packet.payload.nodes:
        reading = SensorReading(
            gateway_id=packet.gateway_id,
            bridge_id=packet.payload.bridge_id,
            node_id=node.node_id,
            node_timestamp=node.ts,
            gateway_received_timestamp=
            packet.received_ts,
            buffered=packet.buffered, 
            tilt_x=node.tilt_x,
            tilt_y=node.tilt_y,
            vib_rms=node.vib_rms,
            flex_raw=node.flex_raw,
            crack_ok=node.crack_ok,
            rssi=node.rssi
        )
        readings.append(reading)

    create_sensor_readings(db,readings)

    return {
        "status": "success",
        "row_inserted": len(readings)
    }
