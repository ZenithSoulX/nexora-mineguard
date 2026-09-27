"""
MineGuard Serial-to-HTTP Bridge
================================
Reads JSON telemetry from the LoRa base station over USB Serial and
forwards it to the FastAPI backend via POST /api/ingest/gateway.

The base station prints lines like:
    LoRa link RSSI: -67 dBm | {"gateway_id":"GW001", ...}

This bridge:
  1. Extracts the JSON portion from each serial line.
  2. Replaces millis()-based timestamps with proper Unix epoch so the
     backend's node-status and age calculations work correctly.
  3. POSTs the corrected payload to the backend.
"""

import json
import time
import serial
import requests

# ---- Configuration ----
# Windows: use "COM3", "COM4", etc.  Check Device Manager for the right port.
# Linux:   "/dev/ttyUSB0" or "/dev/ttyACM0"
# macOS:   "/dev/cu.usbserial-XXXX"
SERIAL_PORT = "COM3"
BAUD_RATE = 115200

BACKEND_URL = "http://localhost:8000/api/ingest/gateway"

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)

print(f"Listening for ESP32 data on {SERIAL_PORT}...")

while True:
    try:
        line = ser.readline().decode("utf-8").strip()
        if not line:
            continue

        # ---- DRAIN THE BUFFER (FIX FOR 30-SECOND LAG) ----
        # If the backend takes slightly too long to process a request, Windows 
        # buffers the incoming Serial data. This causes bridge.py to fall behind,
        # reading 30-second-old data. This loop throws away the old backed-up 
        # lines and always grabs the absolute newest one.
        while ser.in_waiting > 0:
            next_line = ser.readline().decode("utf-8").strip()
            if next_line:
                line = next_line

        # The base station prefixes each line with debug info:
        #   "LoRa link RSSI: -67 dBm | {json...}"
        # Extract the JSON part after the '|' separator, or try
        # the first '{' if there's no '|'.
        json_str = line
        if "|" in line:
            json_str = line.split("|", 1)[1].strip()
        else:
            brace = line.find("{")
            if brace < 0:
                # Not a JSON line (e.g. "LoRa Receiver Ready.")
                if line:
                    print(f"[debug] {line}")
                continue
            json_str = line[brace:]

        payload = json.loads(json_str)

        # ---- Inject proper Unix timestamps ----
        # The base station uses millis()/1000 because it has no RTC/NTP.
        # Replace with the real time so the backend's online/offline
        # detection, alert timing, and age calculations all work.
        now = int(time.time())
        payload["received_ts"] = now
        if "payload" in payload:
            payload["payload"]["ts"] = now
            for node in payload["payload"].get("nodes", []):
                node["ts"] = now

        print(f"Forwarding: {json.dumps(payload)[:120]}...")

        response = requests.post(
            BACKEND_URL,
            json=payload,
            timeout=5,
        )

        print(f"Backend: {response.status_code}")

    except json.JSONDecodeError:
        print(f"Invalid JSON: {line[:100]}")

    except serial.SerialException as e:
        print(f"Serial error: {e}")
        print("Attempting to reconnect in 3 seconds...")
        time.sleep(3)
        try:
            ser.close()
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            print("Reconnected.")
        except Exception:
            pass

    except requests.exceptions.RequestException as e:
        print(f"Backend connection error: {e}")

    except Exception as e:
        print(f"Error: {e}")