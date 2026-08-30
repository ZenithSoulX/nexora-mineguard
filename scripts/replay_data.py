import json
import time
import requests

API_URL = "http://127.0.0.1:8000/api/ingest/gateway"

with open("synthetic_data/A-only.jsonl", "r") as f:
    for line_number, line in enumerate(f, start=1):
        packet = json.loads(line)
        response = requests.post(API_URL,json=packet)
        print(f"Line {line_number}: "f"{response.status_code}")
        REPLAY_SPEED = 0.1
        time.sleep(REPLAY_SPEED)