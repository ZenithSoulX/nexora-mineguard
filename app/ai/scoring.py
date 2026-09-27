import math

from .config import (
    RATE_MAX, TILT_MAX, RSSI_DRIFT_MAX,
    TILT_WEIGHT, RSSI_WEIGHT, ANOMALY_WEIGHT,
    AMBER_THRESHOLD, RED_THRESHOLD,
    ISOLATION_DAMPING, CORROBORATION_BONUS,
    PHYSICAL_ALERT_FLOOR, PHYSICAL_ALERT_BOOST,
)


def track_a(features):
    rate_component = min(abs(features["tilt_rate"]) / RATE_MAX, 1.0)
    deviation_component = min(features["tilt_mag"] / TILT_MAX, 1.0)
    
    # Subsidence monitoring relies on absolute deformation (tilt), not speed.
    # We heavily weight the angle (85%) over the speed of movement (15%).
    return 0.15 * rate_component + 0.85 * deviation_component


def track_b(features, track_a_score):
    rssi_component = min(abs(features["rssi_drift"]) / RSSI_DRIFT_MAX, 1.0)
    return math.sqrt(max(0.0, rssi_component * track_a_score))


def fusion(track_a_score, track_b_score, anomaly_score,
           corroborated=False, physical_alert=False):
    score = (
        TILT_WEIGHT * track_a_score
        + RSSI_WEIGHT * track_b_score
        + ANOMALY_WEIGHT * anomaly_score
    )

    # Ball tilt sensor / on-node buzzer alert.
    # This is a high-confidence binary signal — when the ball-switch trips,
    # physical movement has genuinely occurred.  Floor the score at AMBER
    # level and apply a boost so the operator always sees it.
    if physical_alert:
        score = max(score, PHYSICAL_ALERT_FLOOR)
        score *= PHYSICAL_ALERT_BOOST

    if corroborated:
        score *= CORROBORATION_BONUS

    return max(0.0, min(1.0, score))


def severity(score):
    if score >= RED_THRESHOLD:
        return "RED"
    if score >= AMBER_THRESHOLD:
        return "AMBER"
    return "GREEN"
