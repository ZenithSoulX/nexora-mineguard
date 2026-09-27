/*
  LoRa Receiver - Base Station
  Receives combined 3-node mesh data (Node 0=Gateway, Node 1, Node 2) over LoRa
  from the gateway ESP32, and prints it over USB Serial to the laptop in the
  exact JSON format the backend's POST /api/ingest/gateway endpoint expects.

  A laptop-side script (bridge.py) reads this Serial output line-by-line
  and POSTs each JSON object to the backend. This sketch only formats and prints -
  it does not do the HTTP POST itself (ESP32 here has no WiFi/backend connection).

  CHANGES from original:
    - Node C now uses LoRa packet RSSI (gateway <-> base station link quality)
      instead of ESP-NOW RSSI (which was always 0 for the gateway itself).
    - bridge.py handles timestamp injection (replaces millis/1000 with real Unix epoch).

  Wiring: VCC->3.3V, GND->GND, NSS->5, SCK->18, MOSI->23, MISO->19, RST->14, DIO0->2
  Library: "LoRa" (Sandeep Mistry)
*/

#include <SPI.h>
#include <LoRa.h>

#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2
#define LORA_FREQ 433E6

// ---- Backend identity fields ----
// gateway_id = this physical LoRa base station / receiver unit
// bridge_id  = which panel/site this mesh is monitoring (set per deployment)
#define GATEWAY_ID "GW001"
#define BRIDGE_ID  "PANEL_01"

unsigned long lastPacketNum = 0;
unsigned long receivedCount = 0;
unsigned long lostCount = 0;
bool firstPacket = true;

void setup() {
  Serial.begin(115200);

  SPI.begin(18, 19, 23, 5);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init failed. Check wiring/antenna!");
    while (1) delay(10);
  }
  Serial.println("LoRa Receiver Ready.");
}

float extractFloat(String data, String key) {
  int idx = data.indexOf(key);
  if (idx < 0) return 0.0;
  int start = idx + key.length();
  int end = data.indexOf(",", start);
  if (end < 0) end = data.indexOf("}", start);
  return data.substring(start, end).toFloat();
}

int extractInt(String data, String key) {
  return (int) extractFloat(data, key);
}

// Builds one node's reading object in the exact backend field order/format.
// crack_ok is derived as "no alert condition currently active" on that node -
// when the node's buzzer/alert fires (from ball tilt, flex, tilt threshold,
// or vibration threshold), crack_ok becomes false.
String buildNodeJson(String nodeId, unsigned long ts, float tiltX, float tiltY,
                      float vibRms, int flexRaw, bool alertActive, int rssi,
                      bool hasRssi) {
  String json = "{";
  json += "\"node_id\":\"" + nodeId + "\",";
  json += "\"ts\":" + String(ts) + ",";
  json += "\"tilt_x\":" + String(tiltX, 2) + ",";
  json += "\"tilt_y\":" + String(tiltY, 2) + ",";
  json += "\"vib_rms\":" + String(vibRms, 2) + ",";
  json += "\"flex_raw\":" + String(flexRaw) + ",";
  json += "\"crack_ok\":" + String(alertActive ? "false" : "true") + ",";
  // Nodes with a valid RSSI get the integer value; nodes without get null.
  if (hasRssi) {
    json += "\"rssi\":" + String(rssi);
  } else {
    json += "\"rssi\":null";
  }
  json += "}";
  return json;
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    int loraRssi = LoRa.packetRssi();
    // loraRssi = signal strength of the LoRa link (gateway <-> base station).
    // This is used as Node C's RSSI since Node C (the gateway) communicates
    // to the base station via LoRa, not ESP-NOW.

    int pktIdx = received.indexOf("\"pkt\":");
    unsigned long pktNum = 0;
    if (pktIdx >= 0) {
      pktNum = received.substring(pktIdx + 6, received.indexOf("}", pktIdx)).toInt();
    }

    if (!firstPacket && pktNum > lastPacketNum + 1) {
      lostCount += (pktNum - lastPacketNum - 1);
    }
    lastPacketNum = pktNum;
    firstPacket = false;
    receivedCount++;

    // Parse all 3 nodes: n0 = gateway/Node C, n1 = Node A, n2 = Node B
    float n0x = extractFloat(received, "\"n0x\":");
    float n0y = extractFloat(received, "\"n0y\":");
    float n0v = extractFloat(received, "\"n0v\":");
    int   n0f = extractInt(received, "\"n0f\":");
    int   n0a = extractInt(received, "\"n0a\":");

    float n1x = extractFloat(received, "\"n1x\":");
    float n1y = extractFloat(received, "\"n1y\":");
    float n1v = extractFloat(received, "\"n1v\":");
    int   n1f = extractInt(received, "\"n1f\":");
    int   n1a = extractInt(received, "\"n1a\":");
    int   n1er = extractInt(received, "\"n1er\":"); // ESP-NOW RSSI of Node A's link to gateway

    float n2x = extractFloat(received, "\"n2x\":");
    float n2y = extractFloat(received, "\"n2y\":");
    float n2v = extractFloat(received, "\"n2v\":");
    int   n2f = extractInt(received, "\"n2f\":");
    int   n2a = extractInt(received, "\"n2a\":");
    int   n2er = extractInt(received, "\"n2er\":"); // ESP-NOW RSSI of Node B's link to gateway

    // Timestamp placeholder - bridge.py replaces this with real Unix epoch.
    unsigned long nowTs = millis() / 1000;

    // ---- Build the exact backend payload ----
    String out = "{";
    out += "\"gateway_id\":\"" + String(GATEWAY_ID) + "\",";
    out += "\"buffered\":false,";
    out += "\"received_ts\":" + String(nowTs) + ",";
    out += "\"payload\":{";
    out += "\"bridge_id\":\"" + String(BRIDGE_ID) + "\",";
    out += "\"ts\":" + String(nowTs) + ",";
    out += "\"nodes\":[";
    // Node C (gateway): uses LoRa RSSI for its communication link quality
    out += buildNodeJson("C", nowTs, n0x, n0y, n0v, n0f, n0a != 0, loraRssi, true) + ",";
    // Node A: uses ESP-NOW RSSI measured at the gateway
    out += buildNodeJson("A", nowTs, n1x, n1y, n1v, n1f, n1a != 0, n1er, true) + ",";
    // Node B: uses ESP-NOW RSSI measured at the gateway
    out += buildNodeJson("B", nowTs, n2x, n2y, n2v, n2f, n2a != 0, n2er, true);
    out += "]";
    out += "}";
    out += "}";

    Serial.print("LoRa link RSSI: ");
    Serial.print(loraRssi);
    Serial.print(" dBm | ");
    Serial.println(out);
  }
}
