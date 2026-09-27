from collections import defaultdict, deque
import math
import numpy as np

from .config import NOISE_WINDOW, TILT_DEAD_ZONE, RATE_DEAD_ZONE


_HISTORY = defaultdict(lambda: deque(maxlen=NOISE_WINDOW))


def calculate_features(reading, baseline):
    """Calculate live features using only physical-prototype signals."""
    baseline.update(reading.tilt_x, reading.tilt_y, reading.rssi)
    dev_x, dev_y, rssi_drift = baseline.deviations(
        reading.tilt_x, reading.tilt_y, reading.rssi
    )

    tilt_mag = math.sqrt(dev_x ** 2 + dev_y ** 2)

    # ---- Dead zone: suppress normal MPU6050 idle noise ----
    # Real MPU6050 jitters ±1° at rest.  Without a dead zone, this noise
    # produces non-zero tilt_mag every reading and keeps Track A elevated.
    if tilt_mag < TILT_DEAD_ZONE:
        tilt_mag = 0.0

    history = _HISTORY[reading.node_id]
    previous = history[-1] if history else None
    previous_rate = previous["tilt_rate"] if previous else 0.0

    tilt_rate = tilt_mag - (previous["tilt_mag"] if previous else tilt_mag)

    # Dead zone for rate as well.
    if abs(tilt_rate) < RATE_DEAD_ZONE:
        tilt_rate = 0.0

    tilt_accel = tilt_rate - previous_rate

    history.append({
        "tilt_mag": tilt_mag,
        "tilt_rate": tilt_rate,
        "rssi_drift": rssi_drift,
        "vib_rms": reading.vib_rms,
    })

    tilt_roll = float(np.median([x["tilt_mag"] for x in history]))
    vib_roll = float(np.median([x["vib_rms"] for x in history]))

    return {
        "dev_x": dev_x,
        "dev_y": dev_y,
        "tilt_mag": tilt_mag,
        "tilt_rate": tilt_rate,
        "tilt_accel": tilt_accel,
        "vib_rms": reading.vib_rms,
        "rssi_drift": rssi_drift,
        "rssi_trend": rssi_drift - (previous["rssi_drift"] if previous else rssi_drift),
        "tilt_mag_roll": tilt_roll,
        "vib_roll": vib_roll,
    }
