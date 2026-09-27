from pydantic import BaseModel


class SensorReadingCreate(BaseModel):
    node_id : str
    timestamp : int
    tilt_x : float
    tilt_y : float
    vibration : float
    flex_raw : float 
    crack_ok : bool