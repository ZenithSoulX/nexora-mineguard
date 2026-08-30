import json
import time
import requests
from pathlib import Path                                         

API_URL = "http://127.0.0.1:8000/api/ingest/gateway"
DATA_PATH = Path(__file__).parent.parent / "synthetic_data" / "A-only.jsonl"   
REPLAY_SPEED = 0.1                                                

with open(DATA_PATH, "r") as f:                                   
    for line_number, line in enumerate(f, start=1):
        packet = json.loads(line)
        try:                                                       
            response = requests.post(API_URL, json=packet, timeout=5)
            print(f"Line {line_number}: {response.status_code}")
        except requests.exceptions.RequestException as e:          
            print(f"Line {line_number}: FAILED - {e}")
        time.sleep(REPLAY_SPEED)
