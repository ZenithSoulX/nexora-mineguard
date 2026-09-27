import argparse
import json
import random
import time
import urllib.error
import urllib.request


DEFAULT_URL = "http://127.0.0.1:8000/api/ingest/gateway"
DEFAULT_INTERVAL = 1.0
DEFAULT_SAMPLES = 70


# Baseline values for all 3 physical nodes.
# Node C is the bridge and therefore has no RSSI sensor.
BASELINES = {
    "A": {
        "tilt_x": 0.12,
        "tilt_y": -0.04,
        "vib_rms": 0.08,
        "rssi": -67.0,
    },
    "B": {
        "tilt_x": 0.08,
        "tilt_y": 0.03,
        "vib_rms": 0.07,
        "rssi": -71.0,
    },
    "C": {
        "tilt_x": 0.10,
        "tilt_y": 0.02,
        "vib_rms": 0.075,
        "rssi": None,
    },
}


def clamp(value, low, high):
    return max(low, min(high, value))


def noise(scale):
    return random.gauss(0.0, scale)


def make_node(node_id, t, scenario):
    base = BASELINES[node_id]

    # Normal sensor noise.
    tx = base["tilt_x"] + noise(0.008)
    ty = base["tilt_y"] + noise(0.008)
    vib = max(0.0, base["vib_rms"] + noise(0.006))

    # Node C is the bridge and does not have an RSSI reading.
    if node_id == "C":
        rssi = None
    else:
        rssi = base["rssi"] + noise(0.7)

    # Keep the first 20 samples calm so the backend
    # can establish its self-baseline.
    if t >= 20:
        phase = t - 20

        if scenario == "isolated":
            # Only Node A moves.
            if node_id == "A":
                ramp = min(1.0, phase / 35.0)

                tx += 0.95 * ramp
                ty -= 0.28 * ramp
                vib += 0.30 * ramp

        elif scenario == "correlated":
            # A, B and C observe the same physical movement.
            ramp = min(1.0, phase / 35.0)

            tx += 0.75 * ramp
            ty -= 0.22 * ramp
            vib += 0.25 * ramp

        elif scenario == "accelerating":
            # Movement grows quadratically after calibration.
            x = min(1.0, phase / 35.0)
            ramp = x * x

            tx += 1.05 * ramp
            ty -= 0.32 * ramp
            vib += 0.35 * ramp

        elif scenario == "rssi":
            # RSSI degradation only applies to A and B.
            # Node C has no RSSI sensor.
            if node_id != "C":
                degradation = min(12.0, phase * 12.0 / 35.0)
                rssi -= degradation

        elif scenario == "noise":
            # Short vibration/tilt spikes.
            if phase % 8 in (0, 1):
                tx += random.uniform(-0.45, 0.45)
                ty += random.uniform(-0.20, 0.20)
                vib += random.uniform(0.25, 0.60)

    return {
        "node_id": node_id,
        "ts": int(time.time()),
        "tilt_x": round(tx, 4),
        "tilt_y": round(ty, 4),
        "vib_rms": round(vib, 4),
        "flex_raw": 2100,
        "crack_ok": True,
        "rssi": None if rssi is None else round(rssi, 2),
    }


def build_payload(sample_number, scenario):
    now = int(time.time())

    return {
        "gateway_id": "GATEWAY_01",
        "buffered": False,
        "received_ts": now,
        "payload": {
            "bridge_id": "C",
            "ts": now,
            "nodes": [
                make_node("A", sample_number, scenario),
                make_node("B", sample_number, scenario),
                make_node("C", sample_number, scenario),
            ],
        },
    }


def post_payload(payload, url):
    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def print_result(sample, payload, result):
    ai_results = result.get("ai", [])

    parts = []

    for item in ai_results:
        node = item.get("node_id", "?")
        severity = item.get("severity", "?")
        score = item.get("fusion_score", 0)
        progression = item.get("progression", "?")
        corr = item.get("corroborated", False)

        parts.append(
            f"{node} {severity} {score:.3f} "
            f"{progression} corr={corr}"
        )

    print(f"[{sample:03d}] " + " | ".join(parts))

    # Helpful telemetry snapshot.
    # Node C has rssi=None, so display N/A instead of
    # trying to format None as a floating-point number.
    nodes = payload["payload"]["nodes"]

    telemetry_parts = []

    for n in nodes:
        node_id = n["node_id"]
        tilt = n["tilt_x"]
        rssi = n.get("rssi")

        if rssi is None:
            rssi_text = "N/A"
        else:
            rssi_text = f"{rssi:.1f}"

        telemetry_parts.append(
            f"{node_id}:tilt={tilt:.2f},rssi={rssi_text}"
        )

    telemetry = " ".join(telemetry_parts)

    print(f"      {telemetry}")


def main():
    parser = argparse.ArgumentParser(
        description="Send live synthetic MineGuard telemetry to FastAPI."
    )

    parser.add_argument(
        "scenario",
        choices=[
            "normal",
            "isolated",
            "correlated",
            "accelerating",
            "rssi",
            "noise",
        ],
        help="Synthetic scenario to replay.",
    )

    parser.add_argument(
        "--samples",
        type=int,
        default=DEFAULT_SAMPLES,
        help=f"Number of readings to send (default: {DEFAULT_SAMPLES}).",
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL,
        help=f"Seconds between readings (default: {DEFAULT_INTERVAL}).",
    )

    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"Backend endpoint (default: {DEFAULT_URL}).",
    )

    args = parser.parse_args()

    print("=" * 68)
    print("MineGuard LIVE SYNTHETIC SIMULATOR")
    print("=" * 68)
    print(f"Scenario : {args.scenario.upper()}")
    print(f"Samples  : {args.samples}")
    print(f"Interval : {args.interval}s")
    print(f"Endpoint : {args.url}")
    print()

    print("Nodes    : A, B, C")
    print("Bridge   : C")
    print("First 20 samples are kept calm for self-baseline calibration.")
    print("Open http://localhost:5173 in your browser to watch the dashboard.")
    print("Press Ctrl+C to stop.")
    print()

    # Quick connectivity check before starting the replay.
    try:
        payload = build_payload(0, args.scenario)
        result = post_payload(payload, args.url)
        print_result(0, payload, result)

    except urllib.error.URLError as exc:
        print("\nERROR: Cannot reach FastAPI.")
        print("Start the backend first:")
        print("  python -m uvicorn app.main:app --reload")
        print(f"\nDetails: {exc}")
        return 1

    except Exception as exc:
        print(f"\nERROR: {type(exc).__name__}: {exc}")
        return 1

    try:
        for sample in range(1, args.samples):
            time.sleep(args.interval)

            payload = build_payload(sample, args.scenario)

            try:
                result = post_payload(payload, args.url)
                print_result(sample, payload, result)

            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                print(f"[{sample:03d}] HTTP {exc.code}: {detail}")

            except urllib.error.URLError as exc:
                print(f"[{sample:03d}] Connection error: {exc}")

            except Exception as exc:
                print(
                    f"[{sample:03d}] ERROR "
                    f"{type(exc).__name__}: {exc}"
                )

    except KeyboardInterrupt:
        print("\nSimulation stopped.")

    print("\nSimulation finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
