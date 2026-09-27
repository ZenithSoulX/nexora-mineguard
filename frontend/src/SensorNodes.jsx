import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, LayoutGrid, Radio, MapPin, Bell, Clock, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from "recharts";
import "./SensorNodes.css";
import { fetchLiveData, fetchNodeHistory, fetchRiskHistory } from "./liveData";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/" },
  { key: "nodes", label: "Nodes", icon: Radio, path: "/Nodes" },
  { key: "map", label: "Live Map", icon: MapPin, path: "/LiveMap" },
  { key: "alerts", label: "Alerts", icon: Bell, path: "/Alerts" },
];

const TABS = [
  { key: "tilt", label: "Tilt" },
  { key: "vibration", label: "Vibration RMS" },
  { key: "rssi", label: "RSSI" },
  { key: "risk", label: "AI Risk" },
];

const RANGE_HOURS = { "1H": 1, "6H": 6, "24H": 24 };

function useUtcClock() {
  const format = () => {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, "0");
    const m = String(now.getUTCMinutes()).padStart(2, "0");
    const s = String(now.getUTCSeconds()).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `UTC ${h}:${m}:${s} • ${day} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  };
  const [timestamp, setTimestamp] = useState(format());
  useEffect(() => {
    const id = setInterval(() => setTimestamp(format()), 1000);
    return () => clearInterval(id);
  }, []);
  return timestamp;
}

function Sidebar({ activeItem }) {
  const navigate = useNavigate();
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="brand-mark"><Shield size={20} strokeWidth={2} /></div>
          <div className="brand-text">
            <span className="brand-name">MineGuard</span>
            <span className="brand-subtitle">Mine Safety Monitoring</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeItem;
            return (
              <button key={item.key} type="button"
                className={`nav-item${active ? " nav-item-active" : ""}`}
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}>
                <span className="nav-item-left"><Icon size={20} strokeWidth={2} /><span>{item.label}</span></span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="sidebar-footer"><span className="footer-dot" /><span>MineGuard System</span></div>
    </aside>
  );
}

function Header({ timestamp, backendOnline }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-brand">MineGuard</span>
        <div className="online-pill">
          <span className="online-dot" />
          <span>{backendOnline ? "System Online" : "Backend Offline"}</span>
        </div>
      </div>
      <div className="header-right">
        <div className="header-clock"><Clock size={16} strokeWidth={2} /><span>{timestamp}</span></div>
        <button type="button" className="avatar-btn" title="Operator Profile" aria-label="Operator Profile" />
      </div>
    </header>
  );
}

function MetricCard({ label, value, note, tone = "safe" }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-text">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value}</span>
        <span className="metric-note">{note}</span>
      </div>
      <span className={`metric-dot metric-dot-${tone}`} />
    </div>
  );
}

function formatAgo(ts) {
  if (!ts) return "No data";
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - Number(ts)));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function TrendChart({ data, tab, tone }) {
  const config = {
    tilt: { key: "tilt", label: "Tilt magnitude", unit: "°", threshold: 1.2 },
    vibration: { key: "vibration", label: "Vibration RMS", unit: "", threshold: null },
    rssi: { key: "rssi", label: "RSSI", unit: " dBm", threshold: null },
    risk: { key: "risk", label: "AI fusion risk", unit: "%", threshold: 55 },
  }[tab];

  const hasData = data.length > 0;
  return (
    <div className={`chart-panel chart-panel-${tone}`}>
      <div className="chart-live-label">
        <span className="chart-live-dot" />
        {hasData ? `${config.label} · live history` : "Waiting for history"}
      </div>
      <div className="chart-svg-wrap" style={{ minHeight: 220 }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 12, right: 14, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={35} />
              <YAxis tick={{ fontSize: 10 }} width={48} domain={["auto", "auto"]} />
              <Tooltip
                formatter={(value) => {
                  const n = Number(value);
                  return [`${n.toFixed(tab === "risk" ? 0 : 3)}${config.unit}`, config.label];
                }}
                labelFormatter={(label) => `UTC ${label}`}
              />
              {config.threshold != null && (
                <ReferenceLine y={config.threshold} strokeDasharray="5 5"
                  label={{ value: tab === "risk" ? "RED threshold" : "Tilt threshold", position: "insideTopRight", fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey={config.key} dot={false} strokeWidth={2.5}
                stroke={tone === "critical" ? "#e11d48" : tone === "warning" ? "#d97706" : "#2563eb"}
                isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <span>No readings in this time window yet.</span>
            <small>Run the simulator or wait for live hardware telemetry.</small>
          </div>
        )}
      </div>
      <div className="chart-x-axis">
        <span>{data.length ? "Oldest available" : "No history"}</span>
        <span className="chart-x-now">{data.length ? "Now" : "—"}</span>
      </div>
    </div>
  );
}

function NodeCard({ node }) {
  const [activeTab, setActiveTab] = useState("tilt");
  const [activeRange, setActiveRange] = useState("1H");
  const [history, setHistory] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingHistory(true);
      try {
        const hours = RANGE_HOURS[activeRange];
        const [sensorRows, riskRows] = await Promise.all([
          fetchNodeHistory(node.nodeId, hours, 300),
          fetchRiskHistory(node.nodeId, 300),
        ]);
        if (!cancelled) {
          setHistory(sensorRows);
          setRiskHistory([...riskRows].reverse());
        }
      } catch {
        if (!cancelled) {
          setHistory([]);
          setRiskHistory([]);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [node.nodeId, activeRange]);

  const chartData = useMemo(() => {
    if (activeTab === "risk") {
      return riskHistory.map((r) => ({
        time: new Date(Number(r.node_timestamp) * 1000).toISOString().slice(11, 16),
        risk: Number(r.score),
      }));
    }
    return history.map((r) => ({
      time: new Date(Number(r.node_timestamp) * 1000).toISOString().slice(11, 16),
      tilt: Math.sqrt(Number(r.tilt_x) ** 2 + Number(r.tilt_y) ** 2),
      vibration: Number(r.vib_rms),
      rssi: r.rssi == null ? null : Number(r.rssi),
    })).filter((r) => activeTab !== "rssi" || r.rssi != null);
  }, [history, riskHistory, activeTab]);

  const config = {
    tilt: { current: `${node.tiltMag.toFixed(3)}°`, threshold: "1.20°", rate: node.rate },
    vibration: { current: node.vibration.toFixed(3), threshold: "No live AI threshold", rate: "Tracked by AI anomaly model" },
    rssi: { current: node.rssi == null ? "N/A" : `${node.rssi.toFixed(1)} dBm`, threshold: "Self-baseline", rate: "Baseline drift tracked by AI" },
    risk: { current: `${node.riskScore}/100`, threshold: "55/100 RED threshold", rate: node.progression },
  }[activeTab];

  return (
    <article className={`node-card node-card-${node.tone}`}>
      <div className="node-card-grid">
        <div className="node-info-col">
          <div className="node-info-top">
            <div className="node-eyebrow">Active Sensor {node.nodeId}</div>
            <div>
              <h2 className="node-title">NODE {node.nodeId}</h2>
              <div className="node-location"><MapPin size={15} strokeWidth={2} /><span>Prototype Sensor {node.nodeId}</span></div>
            </div>
            <div className="node-status-row">
              <span className={`status-pill status-pill-${node.tone}`}><span className={`status-pill-dot status-pill-dot-${node.tone}`} />{node.severity}</span>
              <span className={`risk-pill risk-pill-${node.tone}`}>Risk Score: {node.riskScore}/100 · {node.riskLevel}</span>
            </div>
            <p className="node-description">{node.progression.replaceAll("_", " ")}</p>
            <div className="metric-grid">
              <MetricCard label="Tilt X / Y" value={`${node.tiltX.toFixed(3)}° | ${node.tiltY.toFixed(3)}°`} note="Live" tone={node.tone} />
              <MetricCard label="Tilt magnitude" value={`${node.tiltMag.toFixed(3)}°`} note="Live" tone={node.tiltMag > 1.2 ? "warning" : "safe"} />
              <MetricCard label="Vibration RMS" value={node.vibration.toFixed(3)} note="Live" tone={node.tone} />
              <MetricCard label="RSSI" value={node.rssi == null ? "N/A" : `${node.rssi.toFixed(1)} dBm`} note="Live / AI baseline" tone={node.tone} />
            </div>
          </div>
          <div className="node-info-footer">
            <div className="node-connection">
              <span className="connection-item">
                <span className="connection-dot" />
                Connected
              </span>
              <span className="dot-separator">•</span>
              <span className="connection-rssi">RSSI {node.rssi == null ? "N/A" : `${node.rssi.toFixed(1)} dBm`}</span>
              <span className="dot-separator">•</span>
              <span className="connection-time">{formatAgo(node.timestamp)}</span>
            </div>
            <button type="button" className={`view-details view-details-${node.tone}`} onClick={() => setActiveTab("risk")}>
              <span>View AI Risk</span><ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="node-trend-col">
          <div className="trend-controls">
            <div className="tab-group" role="tablist">
              {TABS.map((tab) => (
                <button key={tab.key} type="button" role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`tab-btn${activeTab === tab.key ? ` tab-btn-active-${node.tone}` : ""}`}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="range-group">
              {Object.keys(RANGE_HOURS).map((range) => (
                <button key={range} type="button"
                  className={`range-btn${activeRange === range ? " range-btn-active" : ""}`}
                  onClick={() => setActiveRange(range)}>
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className={`trend-summary trend-summary-${node.tone}`}>
            <div className="summary-item"><span className="summary-label">Current:</span><span className={`summary-value summary-value-${node.tone}`}>{config.current}</span></div>
            <div className="summary-divider" />
            <div className="summary-item"><span className="summary-label">Threshold:</span><span className="summary-value-plain">{config.threshold}</span></div>
            <div className="summary-divider" />
            <div className="summary-item"><span className="summary-label">Status:</span><span className={`summary-rate summary-rate-${node.tone}`}>{config.rate}</span></div>
          </div>

          {loadingHistory && <div className="chart-loading">Refreshing telemetry history…</div>}
          <TrendChart data={chartData} tab={activeTab} tone={node.tone} />
        </div>
      </div>
    </article>
  );
}

export default function SensorNodes() {
  const timestamp = useUtcClock();
  const [live, setLive] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchLiveData();
        if (!mounted) return;
        setLive(data);
        setBackendOnline(true);
      } catch {
        if (mounted) setBackendOnline(false);
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const liveNodes = live ? ["A", "B","C"].map((id) => {
    const r = live.byNode[id];
    const risk = live.risks[id];
    if (!r) return null;
    const severity = (risk?.severity || "GREEN").toUpperCase();
    const tone =
      severity === "RED"
        ? "critical"
        : severity === "AMBER"
          ? "warning"
          : "safe";
    const score = Number(risk?.score || 0).toFixed(2);
    return {
      nodeId: id,
      tone,
      severity,
      riskScore: score,
      riskLevel: severity,
      progression: risk?.signal || "INSUFFICIENT_DATA",
      tiltX: Number(r.tilt_x),
      tiltY: Number(r.tilt_y),
      tiltMag: Math.sqrt(Number(r.tilt_x) ** 2 + Number(r.tilt_y) ** 2),
      vibration: Number(r.vib_rms),
      rssi: r.rssi == null ? null : Number(r.rssi),
      timestamp: Number(r.node_timestamp),
      rate: risk?.signal || "Waiting for temporal baseline",
    };
  }).filter(Boolean) : [];

  return (
    <div className="mineguard-app">
      <Sidebar activeItem="nodes" />
      <div className="main-wrapper">
        <Header timestamp={timestamp} backendOnline={backendOnline} />
        <main className="main-content">
          <div className="content-inner">
            <div className="page-header-row">
              <div>
                <h1 className="page-title">Sensor Nodes</h1>
                <p className="page-subtitle">Live A/B/C telemetry, historical trends, and AI risk state.</p>
              </div>
              <div className="live-pill">
                <span className="ping-wrap"><span className="ping-ping" /><span className="ping-dot" /></span>
                <span>{backendOnline ? "Live · Updated every 3s" : "Backend unavailable"}</span>
              </div>
            </div>

            {!backendOnline && (
              <div className="chart-empty page-empty">
                <strong>Backend unavailable</strong>
                <span>Start FastAPI and the simulator/hardware to see live telemetry.</span>
              </div>
            )}

            <div className="node-list">
              {liveNodes.map((node) => <NodeCard key={node.nodeId} node={node} />)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
