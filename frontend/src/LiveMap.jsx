import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Shield,
  LayoutGrid,
  Radio,
  MapPin,
  Bell,
  Clock,
  User,
  Plus,
  Minus,
  LocateFixed,
  X,
  ArrowRight,
} from "lucide-react";
import "./LiveMap.css";
import { fetchLiveData } from "./liveData";


function useUtcClock() {
  const format = () => {
    const now = new Date();
    return `UTC ${String(now.getUTCHours()).padStart(2,"0")}:${String(now.getUTCMinutes()).padStart(2,"0")}:${String(now.getUTCSeconds()).padStart(2,"0")} • ${String(now.getUTCDate()).padStart(2,"0")} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  };
  const [clock, setClock] = useState(format());
  useEffect(() => {
    const id = setInterval(() => setClock(format()), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

// ---------------------------------------------------------------------------
// Static / mock telemetry data — mirrors the real backend schema
// ---------------------------------------------------------------------------
const NODE_TELEMETRY = {
  1: { node_id: "A", name: "Node A", zone: "Active Sensor A", sector: "Prototype", lat: 23.6550, lng: 86.4520, telemetry: { tilt_x: 0, tilt_y: 0, vib_rms: 0, flex_raw: 0, crack_ok: true, rssi: null, buffered: false }, alert: { severity: "GREEN", signal: "INSUFFICIENT_DATA", score: 0, message: "Waiting for live telemetry.", ts: "" } },
  2: { node_id: "B", name: "Node B", zone: "Active Sensor B", sector: "Prototype", lat: 23.6570, lng: 86.4540, telemetry: { tilt_x: 0, tilt_y: 0, vib_rms: 0, flex_raw: 0, crack_ok: true, rssi: null, buffered: false }, alert: { severity: "GREEN", signal: "INSUFFICIENT_DATA", score: 0, message: "Waiting for live telemetry.", ts: "" } },
  3: { node_id: "C", name: "Node C", zone: "Active Sensor C", sector: "Prototype", lat: 23.6590, lng: 86.4560, telemetry: { tilt_x: 0, tilt_y: 0, vib_rms: 0, flex_raw: 0, crack_ok: true, rssi: null, buffered: false }, alert: { severity: "GREEN", signal: "INSUFFICIENT_DATA", score: 0, message: "Waiting for live telemetry.", ts: "" } },
};

const SEVERITY_CLASS = {
  RED: "critical",
  AMBER: "warning",
  GREEN: "safe",
  CRITICAL: "critical",
  WARNING: "warning",
  SAFE: "safe",
};

function mapSignalName(signal) {
  switch (signal) {
    case "tilt_rate":
      return "Tilt Rate";
    case "vib_spike":
      return "Vibration Spike";
    case "crack":
      return "Crack Detection";
    case "rssi_drift":
      return "RSSI Drift";
    default:
      return "Nominal Telemetry";
  }
}

function getRssiDescriptor(rssi) {
  if (rssi < -80) return "Weak";
  if (rssi > -65) return "Strong";
  return "Fair";
}

// ---------------------------------------------------------------------------
// Sidebar navigation
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/" },
  { key: "nodes", label: "Nodes", icon: Radio, path: "/Nodes" },
  { key: "live-map", label: "Live Map", icon: MapPin, path: "/LiveMap" },
  { key: "alerts", label: "Alerts", icon: Bell, path: "/Alerts", badge: 2 },
];

function Sidebar({ activePath, onNavigate, activeAlertCount }) {
  const navigate = useNavigate();
  return (
    <aside className="mg-sidebar">
      <div className="mg-sidebar-top">
        <div className="mg-sidebar-brand">
          <div className="mg-brand-icon">
            <Shield size={20} />
          </div>
          <div className="mg-brand-text">
            <span className="mg-brand-title mg-text-headline-sm">MineGuard</span>
            <span className="mg-brand-subtitle mg-text-label-sm">
              Mine Safety Monitoring
            </span>
          </div>
        </div>
        <div className="mg-nav-wrap">
          <nav className="mg-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activePath;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`mg-nav-item mg-text-label-lg${isActive ? " active" : ""}`}
                  onClick={() => {
                            onNavigate(item.key);
                            navigate(item.path);
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="mg-nav-item-content">
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </span>
                  {item.key === "alerts" && activeAlertCount > 0 ? (
                    <span className="mg-nav-badge">{activeAlertCount}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="mg-sidebar-footer">
        <div className="mg-footer-row">
          <span className="mg-dot" />
          <span className="mg-text-label-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Telemetry Engine v2.4
          </span>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function Header({ timestamp }) {
  return (
    <header className="mg-header">
      <div className="mg-header-left">
        <span className="mg-text-headline-sm" style={{ fontSize: 16 }}>
          MineGuard
        </span>
        <div className="mg-status-chip">
          <span className="mg-status-dot" />
          <span className="mg-text-label-sm">System Online</span>
        </div>
      </div>
      <div className="mg-header-right">
        <div className="mg-time mg-text-label-md">
          <Clock size={18} />
          <span>{timestamp}</span>
        </div>
        <div className="mg-avatar">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Node detail popover
// ---------------------------------------------------------------------------
function NodePopover({ node, onClose, onViewDetails }) {
  if (!node) return null;
  const { telemetry, alert, name, zone, sector } = node;
  const sevClass = SEVERITY_CLASS[alert.severity] || "safe";
  const rssiQuality = getRssiDescriptor(telemetry.rssi);

  return (
    <div className="mg-popover">
      <div className="mg-popover-header">
        <div className="mg-popover-title-block">
          <div className="mg-popover-title-row">
            <span className="mg-popover-title">
              {name} · {zone}
            </span>
            <span className={`mg-popover-badge ${sevClass}`}>{alert.severity}</span>
          </div>
          <div className="mg-popover-meta">
            <span className={`mg-popover-score ${sevClass}`}>
              Anomaly Score: {alert.score / 100}σ
            </span>
            <span style={{ color: "var(--color-outline)" }}>•</span>
            <span>{sector}</span>
          </div>
        </div>
        <button className="mg-popover-close" onClick={onClose} title="Close" type="button">
          <X size={18} />
        </button>
      </div>

      <div className="mg-popover-metrics">
        <div className="mg-metric-card">
          <p className="mg-metric-label">Flex</p>
          <p className="mg-metric-value">{telemetry.flex_raw} raw</p>
          <span className="mg-metric-sub">flex_raw telemetry</span>
        </div>
        <div className="mg-metric-card">
          <p className="mg-metric-label">Vibration</p>
          <p className={`mg-metric-value ${sevClass}`}>
            {telemetry.vib_rms.toFixed(2)} mm/s
          </p>
          <span className="mg-metric-sub">vib_rms magnitude</span>
        </div>
        <div className="mg-metric-card">
          <p className="mg-metric-label">Tilt X / Y</p>
          <p className="mg-metric-value">
            {telemetry.tilt_x}° / {telemetry.tilt_y}°
          </p>
          <span className="mg-metric-sub">tilt_x / tilt_y</span>
        </div>
        <div className="mg-metric-card">
          <p className="mg-metric-label">Crack Status</p>
          <p className={`mg-metric-value ${telemetry.crack_ok ? "safe" : "critical"}`}>
            {telemetry.crack_ok ? "Normal" : "Detected"}
          </p>
          <span className={`mg-metric-sub ${telemetry.crack_ok ? "" : "critical"}`}>
            crack_ok: {String(telemetry.crack_ok)}
          </span>
        </div>
        <div className="mg-metric-card span-2">
          <div>
            <span className="mg-metric-label">RSSI Link:</span>
            <span className="mg-metric-value" style={{ marginLeft: 4, display: "inline" }}>
              {telemetry.rssi} dBm ({rssiQuality})
            </span>
          </div>
          <span className="mg-mesh-tag">Mesh Link</span>
        </div>
      </div>

      <div className="mg-popover-alert-meta">
        <div className="mg-alert-trigger-row">
          <span className="mg-alert-trigger-label">Alert Trigger:</span>
          <span className={`mg-alert-trigger-value ${sevClass}`}>
            {mapSignalName(alert.signal)}
          </span>
        </div>
        <div className={`mg-alert-message ${sevClass}`}>{alert.message}</div>
        <div className="mg-alert-footer-row">
          <div>
            Data Status:{" "}
            <span className={`mg-data-status ${telemetry.buffered ? "buffered" : "live"}`}>
              {telemetry.buffered ? "Buffered" : "Live"}
            </span>
          </div>
          <div>
            Alert Time: <span className="mg-alert-time">{alert.ts}</span>
          </div>
        </div>
      </div>

      <div className="mg-popover-footer">
        <button className="mg-popover-link" type="button" onClick={onViewDetails}>
          <span>View Node Details</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Live Map page
// ---------------------------------------------------------------------------
export default function LiveMap() {
  const clock = useUtcClock();
  const [activePath, setActivePath] = useState("live-map");
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const [nodeTelemetry, setNodeTelemetry] = useState(NODE_TELEMETRY);
  const [popoverOpen, setPopoverOpen] = useState(true);
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const selectedNode = selectedNodeId ? nodeTelemetry[selectedNodeId] : null;

  const handleSelectNode = useCallback((id) => {
    setSelectedNodeId(id);
    setPopoverOpen(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const live = await fetchLiveData();
        if (!mounted) return;
        const next = { ...NODE_TELEMETRY };
        ["A", "B","C"].forEach((id, index) => {
          const r = live.byNode[id];
          const risk = live.risks[id];
          if (!r) return;
          const key = index + 1;
          next[key] = { ...next[key], telemetry: { ...next[key].telemetry, tilt_x: r.tilt_x, tilt_y: r.tilt_y, vib_rms: r.vib_rms, flex_raw: r.flex_raw, crack_ok: r.crack_ok, rssi: r.rssi, buffered: r.buffered }, alert: { severity: risk?.severity || "GREEN", signal: risk?.signal || "INSUFFICIENT_DATA", score: Number(risk?.score || 0) * 100, message: risk?.signal ? risk.signal.replaceAll("_", " ") : "Awaiting temporal baseline.", ts: new Date().toUTCString() } };
        });
        setNodeTelemetry(next);
        setActiveAlertCount((live.alerts || []).filter((a) => a.status === "ACTIVE").length);
      } catch { /* keep previous live state */ }
    };
    load();
    const id = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([23.655, 86.452], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const buildIcon = (id, node) => {
      const sevClass = SEVERITY_CLASS[node.alert.severity] || "safe";
      const isCritical = sevClass === "critical";
      const isWarning = sevClass === "warning";

      const html = isCritical
        ? `
          <div class="mg-marker">
            <div class="mg-marker-dot-wrap">
              <span class="mg-marker-halo mg-pulse-ring" style="width:3.5rem;height:3.5rem;background:rgba(239,68,68,0.3);"></span>
              <span class="mg-marker-halo mg-pulse-ring-delayed" style="width:3.5rem;height:3.5rem;background:rgba(239,68,68,0.25);"></span>
              <span class="mg-marker-halo" style="width:2.25rem;height:2.25rem;background:rgba(239,68,68,0.35);"></span>
              <div class="mg-marker-core critical" style="background:#ef4444;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
              </div>
            </div>
            <div class="mg-marker-label critical">
              <span class="mg-marker-label-text critical">${node.name} · CRITICAL</span>
            </div>
          </div>
        `
        : `
          <div class="mg-marker">
            <div class="mg-marker-dot-wrap">
              <span class="mg-marker-halo" style="width:2rem;height:2rem;background:${
                isWarning ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.2)"
              };"></span>
              <div class="mg-marker-core ${sevClass}" style="background:${
                isWarning ? "#f59e0b" : "#10b981"
              };">
                <span class="mg-marker-core-dot"></span>
              </div>
            </div>
            <div class="mg-marker-label">
              <span class="mg-marker-label-text">${node.name} · ${node.alert.severity}</span>
            </div>
          </div>
        `;

      return L.divIcon({
        className: "",
        iconSize: isCritical ? [140, 70] : [130, 60],
        iconAnchor: isCritical ? [70, 24] : [65, 20],
        html,
      });
    };

    Object.entries(nodeTelemetry).forEach(([id, node]) => {
      const marker = L.marker([node.lat, node.lng], {
        icon: buildIcon(id, node),
      }).addTo(map);
      marker.on("click", () => handleSelectNode(Number(id)));
      markersRef.current[id] = marker;
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Refresh marker labels/colors without recreating the Leaflet map.
    if (!mapInstanceRef.current) return;
    Object.entries(nodeTelemetry).forEach(([id, node]) => {
      const marker = markersRef.current[id];
      if (!marker) return;
      const sevClass = SEVERITY_CLASS[node.alert.severity] || "safe";
      const bg = sevClass === "critical" ? "#ef4444" : sevClass === "warning" ? "#f59e0b" : "#10b981";
      marker.setIcon(L.divIcon({ className: "", iconSize: [130, 60], iconAnchor: [65, 20], html: `<div class="mg-marker"><div class="mg-marker-dot-wrap"><span class="mg-marker-halo" style="width:2rem;height:2rem;background:${bg}33;"></span><div class="mg-marker-core ${sevClass}" style="background:${bg};"><span class="mg-marker-core-dot"></span></div></div><div class="mg-marker-label"><span class="mg-marker-label-text">${node.name} · ${node.alert.severity}</span></div></div>` }));
    });
  }, [nodeTelemetry]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(
      Object.values(nodeTelemetry).map((n) => [n.lat, n.lng])
    );
    map.flyToBounds(bounds, { padding: [60, 60], duration: 1 });
    handleSelectNode(1);
  };

  return (
    <div className="mg-root">
      <Sidebar activePath={activePath} onNavigate={setActivePath} activeAlertCount={activeAlertCount} />
      <div className="mg-body">
        <Header timestamp={clock} />
        <main className="mg-main">
          <div className="mg-page-stack">
            {/* Toolbar */}
            <div className="mg-toolbar">
              <div>
                <div className="mg-toolbar-title-row">
                  <span className="mg-text-headline-md">Live Map</span>
                  <span className="mg-toolbar-tag mg-text-label-sm">Sector 4-B Pit</span>
                </div>
                <p className="mg-toolbar-sub mg-text-body-sm">
                  Spatial overview of the 3 active sensor nodes across the prototype
                </p>
              </div>
              <div className="mg-legend">
                <div className="mg-legend-item">
                  <span className="mg-legend-dot safe" />
                  <span className="mg-legend-label mg-text-label-sm">Safe</span>
                </div>
                <div className="mg-legend-item">
                  <span className="mg-legend-dot warning" />
                  <span className="mg-legend-label mg-text-label-sm">Warning</span>
                </div>
                <div className="mg-legend-item">
                  <span className="mg-legend-dot critical" />
                  <span className="mg-legend-label mg-text-label-sm">Critical</span>
                </div>
                <div className="mg-legend-divider" />
                <div className="mg-legend-item">
                  <span className="mg-legend-glow-icon">
                    <span className="mg-legend-glow-dot" />
                  </span>
                  <span className="mg-legend-muted mg-text-label-sm">
                    Radial Glow · Risk Intensity
                  </span>
                </div>
              </div>
            </div>

            {/* Map viewport */}
            <div className="mg-map-viewport">
              <div className="mg-leaflet-map" ref={mapContainerRef} />

              <div className="mg-compass">
                <div className="mg-compass-chip mg-text-label-sm">
                  <span className="mg-compass-n">N</span>
                  <span className="mg-compass-arrow">↑</span>
                  <span className="mg-compass-label">North</span>
                </div>
              </div>

              <div className="mg-map-controls">
                <div className="mg-zoom-group">
                  <button className="mg-icon-btn" onClick={handleZoomIn} title="Zoom In" type="button">
                    <Plus size={20} />
                  </button>
                  <div className="mg-zoom-divider" />
                  <button className="mg-icon-btn" onClick={handleZoomOut} title="Zoom Out" type="button">
                    <Minus size={20} />
                  </button>
                </div>
                <button
                  className="mg-recenter-btn"
                  onClick={handleRecenter}
                  title="Recenter to Sensor Nodes"
                  type="button"
                >
                  <LocateFixed size={20} />
                </button>
              </div>

              <div className="mg-scale-footer">
                <div className="mg-scale-item">
                  <span className="mg-scale-label">SCALE:</span>
                  <div className="mg-scale-bar">
                    <span className="mg-scale-tick" />
                    <span className="mg-scale-tick" />
                  </div>
                  <span className="mg-scale-label">200m</span>
                </div>
                <div className="mg-scale-divider" />
                <span className="mg-scale-area">
                  Active Area: <strong>3.4 km²</strong>
                </span>
              </div>

              {popoverOpen && selectedNode ? (
                <NodePopover
                  node={selectedNode}
                  onClose={() => setPopoverOpen(false)}
                  onViewDetails={() => setActivePath("/Nodes")}
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
