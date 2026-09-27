import React, { useEffect, useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import {
  Shield,
  LayoutGrid,
  Radio,
  MapPin,
  Bell,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Cpu,
  Wifi,
  Share2,
  Podcast,
  Router,
  Server,
  Activity,
  Network,
  ShieldAlert,
  Layers,
  BellRing,
} from "lucide-react";
import "./Dashboard.css";
import { fetchLiveData } from "./liveData";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const navItems = [
  {
    label: "Dashboard",
    icon: LayoutGrid,
    path: "/",
  },
  {
    label: "Nodes",
    icon: Radio,
    path: "/Nodes",
  },
  {
    label: "Live Map",
    icon: MapPin,
    path: "/LiveMap",
  },
  {
    label: "Alerts",
    icon: Bell,
    path: "/Alerts",
  },
];

const pipelineStages = [
  {
    key: "sensors",
    icon: Radio,
    title: "Sensors",
    subtitle: "Generate readings",
    variant: "default",
  },
  {
    key: "esp32",
    icon: Cpu,
    title: "ESP32 Node",
    subtitle: "Collects sensor data",
    variant: "default",
    iconTone: "accent",
  },
  {
    key: "espnow",
    icon: Wifi,
    title: "ESP-NOW",
    subtitle: "Node → Bridge",
    variant: "accent",
  },
  {
    key: "bridge",
    icon: Share2,
    title: "Bridge",
    subtitle: "Receives node data",
    variant: "default",
  },
  {
    key: "lora",
    icon: Podcast,
    title: "LoRa",
    subtitle: "Bridge → Gateway",
    variant: "accent",
  },
  {
    key: "gateway",
    icon: Router,
    title: "Gateway",
    subtitle: "Forwards telemetry",
    variant: "default",
  },
  {
    key: "backend",
    icon: Server,
    title: "Backend",
    subtitle: "Processes telemetry",
    variant: "default",
  },
  {
    key: "dashboard",
    icon: Activity,
    title: "Dashboard",
    subtitle: "Displays risk & alerts",
    variant: "solid",
  },
];

// connector color alternates blue / emerald, matching the source markup
const connectorColors = ["blue", "emerald", "blue", "emerald", "blue", "emerald", "blue"];

const connectionHealth = [
  { label: "ESP32 → Bridge", status: "Prototype link · Live" },
  { label: "Bridge → Gateway", status: "Gateway link · Live" },
  { label: "Gateway → Backend", status: "Connected · Live" },
  { label: "Backend → Dashboard", status: "API polling · Live" },
];

// ---------------------------------------------------------------------------
 // Shared severity -> UI color mapping
 // ---------------------------------------------------------------------------
 function severityToClass(severity) {
   const value = String(severity || "GREEN").toUpperCase();

   if (value === "RED" || value === "HIGH" || value === "CRITICAL") {
     return "critical";
   }

   if (value === "AMBER" || value === "MEDIUM" || value === "WARNING") {
     return "warning";
   }

   return "safe";
 }

 function severityToLabel(severity) {
   const value = String(severity || "GREEN").toUpperCase();

   if (value === "RED" || value === "HIGH" || value === "CRITICAL") {
     return "HIGH";
   }

   if (value === "AMBER" || value === "MEDIUM" || value === "WARNING") {
     return "MEDIUM";
   }

   return "LOW";
 }

 const severityColors = {
   safe: {
     main: "#16a34a",
     soft: "rgba(22, 163, 74, 0.10)",
     border: "rgba(22, 163, 74, 0.35)",
   },
   warning: {
     main: "#f59e0b",
     soft: "rgba(245, 158, 11, 0.10)",
     border: "rgba(245, 158, 11, 0.40)",
   },
   critical: {
     main: "#dc2626",
     soft: "rgba(220, 38, 38, 0.10)",
     border: "rgba(220, 38, 38, 0.40)",
   },
 };

 function NavLink({ item, badge }) {
  const Icon = item.icon;

  return (
    <RouterNavLink
      to={item.path}
      end={item.path === "/"}
      className={({ isActive }) =>
        `nav-link${isActive ? " nav-link--active" : ""}`
      }
    >
      <span className="nav-link__left">
        <Icon size={20} strokeWidth={2} />
        <span>{item.label}</span>
      </span>

      {badge != null && badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </RouterNavLink>
  );
}

function PipelineStage({ stage, severity }) {
  const Icon = stage.icon;
  const severityClass = severityToClass(severity);
  const colors = severityColors[severityClass];

  return (
    <div
      className={`pipeline-stage pipeline-stage--${stage.variant} pipeline-stage--${severityClass}`}
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 0 1px ${colors.border}`,
      }}
    >
      <div
        className={`pipeline-stage__icon${
          stage.variant === "solid" ? " pipeline-stage__icon--solid" : ""
        }${stage.iconTone === "accent" ? " pipeline-stage__icon--accent" : ""}`}
        style={{
          color: colors.main,
          backgroundColor: colors.soft,
          borderColor: colors.border,
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </div>
      <span
        className="pipeline-stage__title"
        style={{ color: colors.main }}
      >
        {stage.title}
      </span>
      <span className="pipeline-stage__subtitle">{stage.subtitle}</span>
    </div>
  );
}

function PipelineConnector({ color, severity }) {
  const severityClass = severityToClass(severity);
  const colors = severityColors[severityClass];

  return (
    <div className={`pipeline-connector pipeline-connector--${severityClass}`}>
      <div
        className="pipeline-connector__track"
        style={{ backgroundColor: colors.border }}
      >
        <div
          className={`pipeline-connector__packet pipeline-connector__packet--${color}`}
          style={{ backgroundColor: colors.main }}
        />
      </div>
      <ArrowRight
        size={13}
        className={`pipeline-connector__arrow pipeline-connector__arrow--${color}`}
        style={{ color: colors.main }}
      />
    </div>
  );
}

function HealthPill({ label, status, severity }) {
  const severityClass = severityToClass(severity);
  const colors = severityColors[severityClass];

  return (
    <div className="health-pill">
      <span className="health-pill__label">{label}</span>
      <span className="health-pill__status">
        <span
          className={`dot dot--${severityClass}`}
          style={{
            backgroundColor: colors.main,
            boxShadow: `0 0 0 3px ${colors.soft}`,
          }}
        />
        <span>{status}</span>
      </span>
    </div>
  );
}

function ReadingChip({ reading }) {
  return (
    <div className={`reading-chip reading-chip--${reading.tone}`}>
      <span className="reading-chip__label">{reading.label}</span>
      <span className={`reading-chip__value reading-chip__value--${reading.tone}${reading.strong ? " reading-chip__value--strong" : ""}`}>
        {reading.value}
      </span>
    </div>
  );
}

function NodeCard({ node }) {
  return (
    <div className={`node-card node-card--${node.statusClass}`}>
      <div className="node-card__body">
        <div className="node-card__header">
          <div>
            <span className="node-card__id">{node.id}</span>
            <span className="node-card__location">{node.location}</span>
          </div>
          <span className={`status-pill status-pill--${node.statusClass}`}>
            <span className="status-pill__dot" />
            {node.status}
          </span>
        </div>

        <div className="node-card__risk">
          <div className="node-card__risk-row">
            <span>
              Risk Score: <strong>{node.riskScore}/100</strong> · {node.riskLabel}
            </span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill progress-fill--${node.statusClass}`}
              style={{ width: `${node.riskScore}%` }}
            />
          </div>
        </div>

        <div className="node-card__concern">
          <span className="eyebrow">PRIMARY CONCERN</span>
          <p className={`node-card__concern-text node-card__concern-text--${node.concernClass}`}>
            {node.concern}
          </p>
        </div>

        <div className="node-card__readings">
          <span className="eyebrow eyebrow--small">KEY READINGS</span>
          <div className="reading-grid">
            {node.readings.map((r) => (
              <ReadingChip key={r.label} reading={r} />
            ))}
          </div>
        </div>
      </div>

      <div className="node-card__footer">
        <span className="node-card__live">
          <span className={`dot dot--${node.dotClass}`} />
          Live · {node.lastUpdate}
        </span>
        <RouterNavLink to="/Nodes" className="link-arrow">
  View Node <ArrowRight size={16} />
</RouterNavLink>
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  return (
    <div className="alert-row">
      <div className="alert-row__body">
        <div className="alert-row__level">
          <span className={`dot dot--${alert.tone}`} />
          <span className={`alert-row__level-text alert-row__level-text--${alert.tone}`}>
            {alert.level} · {alert.node}
          </span>
        </div>
        <p className="alert-row__message">{alert.message}</p>
        <span className="alert-row__time">{alert.time}</span>
      </div>
      <a href="#" className={`alert-row__view alert-row__view--${alert.tone}`}>
        View <ChevronRight size={14} />
      </a>
    </div>
  );
}

function MapMarker({ marker }) {
  return (
    <div
      className={`map-marker map-marker--${marker.tone}`}
      style={{ top: marker.top, left: marker.left }}
    >
      <div className="map-marker__ring">
        {marker.callout && <span className="map-marker__ping" />}
        <div className="map-marker__dot-wrap">
          <span className="map-marker__dot" />
        </div>
      </div>
      <div className="map-marker__label">{marker.id}</div>

      {marker.callout && (
        <div className="map-callout">
          <div className="map-callout__header">{marker.id}</div>
          <div className="map-callout__risk">
            <span
              className={`dot dot--${marker.tone}`}
              style={{
                backgroundColor: severityColors[marker.tone]?.main,
              }}
            />
            {marker.severity} · Risk Score: {marker.riskScore}/100
          </div>
          <p className="map-callout__desc">{marker.concern}</p>
          <a href="#" className="map-callout__link">
            View Node <ArrowRight size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MineGuardDashboard() {
  const [live, setLive] = useState(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchLiveData();
        if (mounted) { setLive(data); setOnline(true); }
      } catch {
        if (mounted) setOnline(false);
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const liveNodes = live
    ? ["A", "B","C"].map((id) => {
        const r = live.byNode[id];
        const risk = live.risks[id];
        if (!r) return null;
        const severity = risk?.severity || "GREEN";
        const cls = severityToClass(severity);
        const score = Number(risk?.score || 0).toFixed(2);
        const progression = risk?.signal || "INSUFFICIENT_DATA";
        return {
          id: `NODE ${id}`, location: `Active Sensor ${id}`, status: severity,
          statusClass: cls, riskScore: score, riskLabel: severityToLabel(severity),
          concern: progression.replaceAll("_", " "), concernClass: cls,
          readings: [
            { label: "Vibration", value: `${Number(r.vib_rms).toFixed(3)} RMS`, tone: cls },
            { label: "Tilt", value: `${Number(r.tilt_x).toFixed(3)}° / ${Number(r.tilt_y).toFixed(3)}°`, tone: cls },
            { label: "RSSI", value: r.rssi == null ? "N/A" : `${Number(r.rssi).toFixed(1)} dBm`, tone: "safe" },
          ],
          lastUpdate: "just now", dotClass: cls,
        };
      }).filter(Boolean)
    : [];

  const nodes = liveNodes;
  const activeAlerts = live
    ? (live.alerts || []).filter((a) => a.status === "ACTIVE").map((a) => ({
        level: a.severity, node: `Node ${a.node_id}`, message: a.message,
        time: "live", tone: severityToClass(a.severity),
      }))
    : [];
  const markerPositions = [
    { top: "35%", left: "35%" }, // Node A
    { top: "60%", left: "62%" }, // Node B
    { top: "42%", left: "72%" }, // Node C
  ];

  const mapMarkers = nodes.map((node, index) => ({
    id: node.id.replace("NODE ", "Node "),
    top: markerPositions[index]?.top || "50%",
    left: markerPositions[index]?.left || "50%",
    tone: node.statusClass,
    severity: node.status,
    riskScore: node.riskScore,
    concern: node.concern,
    callout: node.statusClass === "critical" || node.statusClass === "warning",
  }));
  const attentionNodes = nodes.filter((n) => n.status !== "GREEN" && n.status !== "SAFE");
  const overall =
    !online
      ? "NO DATA"
      : nodes.some((n) => n.status === "RED")
        ? "RED"
        : nodes.some((n) => n.status === "AMBER")
          ? "AMBER"
          : "GREEN";
  const overallClass = overall === "NO DATA" ? "warning" : severityToClass(overall);
  const primary = attentionNodes[0];

  return (
    <div className="mg-app">
      {/* Sidebar */}
      <aside className="mg-sidebar">
        <div>
          <div className="mg-sidebar__brand">
            <div className="mg-sidebar__logo">
              <Shield size={20} strokeWidth={2} />
            </div>
            <div className="mg-sidebar__brand-text">
              <span className="mg-sidebar__brand-title">MineGuard</span>
              <span className="mg-sidebar__brand-subtitle">Mine Safety Monitoring</span>
            </div>
          </div>
          <nav className="mg-sidebar__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                badge={item.label === "Alerts" ? activeAlerts.length : null}
              />
            ))}
          </nav>
        </div>
      </aside>

      <div className="mg-content-wrapper">
        {/* Header */}
        <header className="mg-header">
          <div className="mg-header__left">
            <span className="mg-header__title">MineGuard</span>
            <div className="pill pill--online">
              <span className="dot dot--online" />
              <span>{online ? "System Online" : "Backend Offline"}</span>
            </div>
          </div>
          <div className="mg-header__right">
            <div className="pill pill--live">
              <span className="dot dot--live" />
              <span>{online ? "Live · Updated just now" : "Waiting for backend"}</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mg-main">
          {!online && (
            <section className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
              <strong>Backend unavailable</strong>
              <div style={{ marginTop: "0.25rem", opacity: 0.75 }}>
                Start FastAPI to display live A/B telemetry. Demo data is not shown as live data.
              </div>
            </section>
          )}
          {/* Mine status banner */}
          <section className="card status-banner">
            <div className="status-banner__left">
              <div className="status-banner__icon">
                <AlertTriangle size={24} strokeWidth={2} />
              </div>
              <div className="status-banner__text">
                <span className="eyebrow">MINE STATUS</span>
                <div className="status-banner__row">
                  <span className={`status-pill status-pill--${overallClass} status-pill--lg`}>
                    <span className="status-pill__dot" />
                    {overall}
                  </span>
                  <span className="status-banner__summary">— {attentionNodes.length} of {nodes.length} nodes require attention</span>
                </div>
                <p className="status-banner__detail">
                  Primary concern:{" "}
                  <span className="status-banner__detail-strong">
                    {primary ? `${primary.id} · ${primary.concern}` : "No active concern"}
                  </span>
                </p>
              </div>
            </div>
            <a href="#" className="btn btn--danger-outline">
              View Alert <ArrowRight size={16} />
            </a>
          </section>

          {/* Live system data flow */}
          <section className="card data-flow">
            <div className="data-flow__header">
              <div className="data-flow__title-group">
                <div className="data-flow__icon">
                  <RefreshCw size={19} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="card-title">Live System Data Flow</h2>
                  <span className="card-subtitle">End-to-end edge to cloud pipeline</span>
                </div>
              </div>
              <span className="pill pill--active">
                <span className="dot dot--online" />
                Telemetry Pipeline · Active Transmission
              </span>
            </div>

            <div className="pipeline-scroll">
              <div className="pipeline-track">
                {pipelineStages.map((stage, i) => (
                  <React.Fragment key={stage.key}>
                    <PipelineStage stage={stage} severity={overall} />
                    {i < pipelineStages.length - 1 && (
                      <PipelineConnector
                        color={connectorColors[i]}
                        severity={overall}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="connection-health">
              <div className="connection-health__label">
                <Network size={16} />
                <span>CONNECTION HEALTH</span>
              </div>
              <div className="connection-health__grid">
                {connectionHealth.map((h) => (
                  <HealthPill
                    key={h.label}
                    label={h.label}
                    status={h.status}
                    severity={overall}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Compact node summary */}
          <section className="node-summary">
            <div className="node-summary__title">
              <Radio size={18} />
              <span>{nodes.length} Active Sensor Nodes</span>
            </div>
            <div className="node-summary__legend">
              <span className="legend-item"><span className="dot dot--safe" /> {nodes.filter(n => n.status === "GREEN" || n.status === "SAFE").length} Safe</span>
              <span className="legend-sep">·</span>
              <span className="legend-item"><span className="dot dot--warning" /> {nodes.filter(n => n.status === "AMBER" || n.status === "WARNING").length} Warning</span>
              <span className="legend-sep">·</span>
              <span className="legend-item"><span className="dot dot--critical" /> {nodes.filter(n => n.status === "RED" || n.status === "CRITICAL").length} Critical</span>
            </div>
          </section>

          {/* Early warning banner */}
          <div className="card early-warning">
            <div className="early-warning__left">
              <div className="early-warning__icon">
                <ShieldAlert size={18} />
              </div>
              <div className="early-warning__text">
                <span className="early-warning__badge">
                  <span className="dot dot--warning-pulse" />
                  {primary ? "AI STATUS" : "MONITORING"}
                </span>
                <span className="early-warning__message">
                  {primary ? `${primary.id} risk status · ${primary.concern}` : "All monitored nodes are within GREEN status"}
                </span>
              </div>
            </div>
            <div className="early-warning__right">
              <span>{primary ? primary.concern : "No elevated movement trend"}</span>
            </div>
          </div>

          {/* Node cards grid */}
          <section className="node-grid">
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </section>

          {/* Node stats */}

          {/* Bottom split: map + alerts */}
          <section className="bottom-split">
            {/* Map */}
            <div className="card map-card">
              <div className="map-card__top">
                <div className="map-card__title-group">
                  <Layers size={20} />
                  <h2 className="card-title">Live Mine Risk Map</h2>
                </div>
                <span className="map-card__count">3 Active Sensor Nodes</span>
              </div>

              <div className="map-canvas">
                <svg
                  className="map-canvas__contours"
                  viewBox="0 0 540 250"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <ellipse cx="270" cy="125" rx="240" ry="105" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
                  <ellipse cx="270" cy="125" rx="190" ry="80" stroke="currentColor" strokeWidth="1.2" />
                  <ellipse cx="270" cy="125" rx="140" ry="58" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
                  <ellipse cx="270" cy="125" rx="80" ry="34" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M40,220 C140,195 200,135 270,125 C340,115 410,65 500,30"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>

                {mapMarkers.map((m) => (
                  <MapMarker key={m.id} marker={m} />
                ))}
              </div>

              <div className="map-card__footer">
                <div className="map-legend">
                  <span className="legend-item">
                    <span className="legend-dot legend-dot--safe" /> Safe
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot legend-dot--warning" /> Warning
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot legend-dot--critical" /> Critical
                  </span>
                </div>
                <a href="#" className="link-arrow link-arrow--sm">
                  View Full Map <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Active alerts */}
            <div className="card alerts-card">
              <div>
                <div className="alerts-card__top">
                  <div className="alerts-card__title-group">
                    <BellRing size={20} className="alerts-card__icon" />
                    <h2 className="card-title">Active Alerts</h2>
                  </div>
                  <span className="alerts-card__count">2 Active</span>
                </div>

                <div className="alerts-card__list">
                  {activeAlerts.map((alert) => (
                    <AlertRow key={`${alert.node}-${alert.message}`} alert={alert} />
                  ))}
                </div>
              </div>

              <div className="alerts-card__footer">
                <a href="#" className="link-arrow link-arrow--sm">
                  View All Alerts <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}