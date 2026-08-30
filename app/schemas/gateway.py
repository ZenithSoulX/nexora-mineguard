from pydantic import BaseModel
from typing import List, Optional

class NodeReading(BaseModel):
    node_id: str
    ts: int
    tilt_x: float
    tilt_y: float
    vib_rms: float
    flex_raw: int
    crack_ok: bool
    rssi: Optional[float] = None


class BridgePayload(BaseModel):
    bridge_id: str
    ts: int
    nodes: List[NodeReading]

class GatewayPacket(BaseModel):
    gateway_id: str
    buffered: bool
    received_ts: int
    payload: BridgePayload
