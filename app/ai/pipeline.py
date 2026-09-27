from collections import defaultdict, deque
from types import SimpleNamespace

from .baseline import NodeBaseline
from .features import calculate_features
from .anomaly import detect_anomaly
from .scoring import track_a, track_b, fusion, severity
from .progression import classify_progression
from .config import RED_PERSISTENCE, GREEN_RECOVERY, ISOLATION_DAMPING


class LiveAIPipeline:
    """
    Stateful live pipeline for the 3-node physical prototype.
    A, B and C are active sensor nodes.
    C also acts as the bridge.
    """

    def __init__(self):
        self.baselines = {}
        self.states = defaultdict(lambda: {
            "severity": "GREEN",
            "red_count": 0,
            "green_count": 0,
            "history": deque(maxlen=20),
        })

    def _baseline(self, node_id):
        if node_id not in self.baselines:
            self.baselines[node_id] = NodeBaseline()
        return self.baselines[node_id]

    def process_node(self, reading):
        features = calculate_features(reading, self._baseline(reading.node_id))
        a = track_a(features)
        b = track_b(features, a)
        anomaly, raw_anomaly = detect_anomaly(features)

        # Physical alert: the node's own on-board sensors (ball tilt, flex,
        # vibration threshold) have triggered its buzzer.  The base station
        # maps this to crack_ok = False.
        physical_alert = (
            hasattr(reading, "crack_ok")
            and reading.crack_ok is not None
            and reading.crack_ok is False
        )

        state = self.states[reading.node_id]
        state["history"].append(features["tilt_mag"])

        # Initial per-node fusion. Corroboration is applied by process_packet().
        score = fusion(a, b, anomaly, corroborated=False,
                       physical_alert=physical_alert)

        progression = classify_progression(list(state["history"]))
        return {
            "node_id": reading.node_id,
            "track_a": a,
            "track_b": b,
            "anomaly_score": anomaly,
            "anomaly_raw": raw_anomaly,
            "fusion_score": score,
            "progression": progression,
            "features": features,
            "physical_alert": physical_alert,
        }

    def apply_corroboration(self, results):
        elevated = {
            r["node_id"] for r in results if r["fusion_score"] >= 0.35
        }

        for r in results:
            peers = elevated - {r["node_id"]}
            corroborated = bool(peers)
            score = fusion(
                r["track_a"], r["track_b"], r["anomaly_score"],
                corroborated=corroborated,
                physical_alert=r["physical_alert"],
            )

            # If only this node is elevated, damp it to reduce isolated false alarms.
            if r["fusion_score"] >= 0.35 and not corroborated:
                score *= ISOLATION_DAMPING

            r["corroborated"] = corroborated
            r["fusion_score"] = max(0.0, min(1.0, score))
            r["severity"] = self._persist(r["node_id"], r["fusion_score"])
        return results

    def _persist(self, node_id, score):
        state = self.states[node_id]
        if score >= 0.55:
            state["red_count"] += 1
            state["green_count"] = 0
            if state["red_count"] >= RED_PERSISTENCE:
                state["severity"] = "RED"
        elif score < 0.35:
            state["red_count"] = 0
            state["green_count"] += 1
            if state["green_count"] >= GREEN_RECOVERY:
                state["severity"] = "GREEN"
        else:
            state["red_count"] = 0
            state["green_count"] = 0
            if state["severity"] != "RED":
                state["severity"] = "AMBER"
        return state["severity"]

    def process_packet(self, node_readings):
        results = [self.process_node(r) for r in node_readings]
        return self.apply_corroboration(results)


pipeline = LiveAIPipeline()
