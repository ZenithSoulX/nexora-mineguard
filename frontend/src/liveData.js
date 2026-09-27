const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function getJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function fetchLiveData() {
  const [readings, overview, alerts] = await Promise.all([
    getJson("/api/sensors/latest"),
    getJson("/api/dashboard/overview"),
    getJson("/api/alerts/")
  ]);

  const byNode = {};
  for (const reading of readings) {
    const id = String(reading.node_id);
    if (!byNode[id] || Number(reading.node_timestamp) > Number(byNode[id].node_timestamp)) {
      byNode[id] = reading;
    }
  }

  const risks = {};
  for (const risk of overview.latest_risks || []) {
    const id = String(risk.node_id);
    if (!risks[id]) risks[id] = risk;
  }

  return { readings, byNode, risks, alerts, overview, fetchedAt: Date.now() };
}

export async function acknowledgeAlert(id) {
  return getJson(`/api/alerts/${id}/ack`, { method: "PATCH" });
}

export async function resolveAlert(id) {
  return getJson(`/api/alerts/${id}/resolve`, { method: "PATCH" });
}

export { API_BASE };

export async function fetchNodeHistory(nodeId, hours = 1, limit = 300) {
  return getJson(`/api/sensors/node/${encodeURIComponent(nodeId)}/history?hours=${hours}&limit=${limit}`);
}

export async function fetchRiskHistory(nodeId, limit = 300) {
  return getJson(`/api/risk/${encodeURIComponent(nodeId)}?limit=${limit}`);
}
