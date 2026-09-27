# MineGuard live-prototype AI configuration.
# Physical prototype: A, B and C are active sensor nodes.
# Node C also acts as the bridge.
#
# Thresholds calibrated for real MPU6050 hardware:
#   - Idle noise after settling: ±1° jitter
#   - Post-calibration drift: 0° → ±5° over ~15 readings
#   - Actual tilt during movement: 5°–25°+

NOISE_WINDOW = 20

# --- Tilt / movement scaling ---
# Real MPU6050 produces ±1° noise at rest and 5°–25° on real tilt.
# These are the ceilings at which the normalised score saturates to 1.0.
RATE_MAX = 1.5            # deg per reading interval
TILT_MAX = 15.0           # deg deviation from baseline
RSSI_DRIFT_MAX = 10.0     # dB

# --- Dead zones (suppress normal MPU6050 sensor noise) ---
TILT_DEAD_ZONE = 3.0      # deg — tilt_mag below this is clamped to 0
RATE_DEAD_ZONE = 0.5      # deg — tilt_rate below this is clamped to 0

# --- Live prototype fusion weights ---
# Anomaly weight is low because the Isolation Forest model was trained on
# simulator-scale data and produces unreliable scores with real hardware.
TILT_WEIGHT = 0.65
RSSI_WEIGHT = 0.20
ANOMALY_WEIGHT = 0.15

# --- Physical alert (ball tilt / on-node buzzer) ---
# When crack_ok is False (node's own alert is firing), the fusion score is
# floored and boosted to ensure the operator sees it.
PHYSICAL_ALERT_FLOOR = 0.45   # minimum fusion score when alert active
PHYSICAL_ALERT_BOOST = 1.25   # multiplier applied on top

# --- Severity thresholds (0–1 scale) ---
AMBER_THRESHOLD = 0.30
RED_THRESHOLD = 0.52
RED_PERSISTENCE = 1    # Turns RED instantly (1 reading) instead of waiting for 5
GREEN_RECOVERY = 2     # Returns to GREEN quickly (2 readings) instead of 6

# --- Cross-node logic ---
ISOLATION_DAMPING = 0.65
CORROBORATION_BONUS = 1.15

# --- Baseline calibration ---
# Skip the first N readings so the MPU6050 complementary filter can settle
# after its own on-chip calibration. Then collect samples for the AI baseline.
BASELINE_SKIP_SAMPLES = 1
BASELINE_CALIBRATION_SAMPLES = 5

# --- Anomaly model ---
MODEL_PATH = "ml/models/isolation_forest.joblib"
ANOMALY_SCORE_CAP = 0.5   # cap to prevent untrained model from saturating
