from collections import deque
from statistics import median

from .config import BASELINE_SKIP_SAMPLES, BASELINE_CALIBRATION_SAMPLES


class NodeBaseline:
    """Self-baseline for a physical A/B/C node.

    The MPU6050 complementary filter drifts for ~15 readings after its own
    on-chip calibration.  We skip those readings so the AI baseline captures
    the sensor's true resting position, not the transient drift.
    """

    def __init__(
        self,
        skip_samples=BASELINE_SKIP_SAMPLES,
        calibration_samples=BASELINE_CALIBRATION_SAMPLES,
    ):
        self.skip_samples = skip_samples
        self.calibration_samples = calibration_samples
        self.skip_count = 0
        self.samples = []
        self.ready = False
        self.tilt_x = 0.0
        self.tilt_y = 0.0
        self.rssi = None

    def update(self, tilt_x, tilt_y, rssi):
        if self.ready:
            return

        # Phase 1: skip the post-calibration drift readings.
        if self.skip_count < self.skip_samples:
            self.skip_count += 1
            return

        # Phase 2: collect calibration samples from the settled sensor.
        self.samples.append((tilt_x, tilt_y, rssi))
        if len(self.samples) >= self.calibration_samples:
            self.tilt_x = median(x[0] for x in self.samples)
            self.tilt_y = median(x[1] for x in self.samples)
            rssi_values = [x[2] for x in self.samples if x[2] is not None]
            self.rssi = median(rssi_values) if rssi_values else None
            self.ready = True

    def deviations(self, tilt_x, tilt_y, rssi):
        # Phase 1: Still skipping drift, output 0 to avoid false alarms
        if not self.ready and not self.samples:
            return 0.0, 0.0, 0.0

        # Phase 2: Collecting calibration samples. Use partial median so it feels responsive!
        if not self.ready and self.samples:
            bx = median(x[0] for x in self.samples)
            by = median(x[1] for x in self.samples)
            rssi_values = [x[2] for x in self.samples if x[2] is not None]
            br = median(rssi_values) if rssi_values else 0.0
        else:
            # Phase 3: Fully calibrated
            bx = self.tilt_x
            by = self.tilt_y
            br = self.rssi if self.rssi is not None else 0.0

        rssi_drift = (rssi - br) if (rssi is not None) else 0.0
        return tilt_x - bx, tilt_y - by, rssi_drift
