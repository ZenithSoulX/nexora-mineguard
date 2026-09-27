import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Shield, LayoutGrid, Radio, MapPin, Bell, Play, Square, X, Loader2 } from "lucide-react";
import { API_BASE } from "../liveData";
import "./GlobalSidebar.css";

const ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutGrid },
  { label: "Sensor Nodes", path: "/Nodes", icon: Radio },
  { label: "Live Map", path: "/LiveMap", icon: MapPin },
  { label: "Alerts", path: "/Alerts", icon: Bell },
];

const MODES = [
  { key: "normal", label: "Normal" },
  { key: "isolated", label: "Isolated" },
  { key: "correlated", label: "Correlated" },
  { key: "accelerating", label: "Accelerating" },
  { key: "rssi", label: "RSSI" },
  { key: "noise", label: "Noise" },
];

export default function GlobalSidebar() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("normal");
  const [duration, setDuration] = useState(70);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [alertCount, setAlertCount] = useState(0);

  const progress = useMemo(() => ((duration - 50) / 50) * 100, [duration]);

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulator/status`);
      if (!res.ok) throw new Error("status unavailable");
      const data = await res.json();
      setStatus(data);
      setRunning(Boolean(data.running));
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts/`);
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        setAlertCount(rows.filter((a) => String(a.status || "").toUpperCase() === "ACTIVE").length);
      } catch {
        // The page itself already handles backend availability.
      }
    };
    loadAlerts();
    const timer = setInterval(loadAlerts, 3000);
    return () => clearInterval(timer);
  }, []);

  const startSimulation = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/simulator/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: mode, duration }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Could not start simulation");
      setStatus(data);
      setRunning(true);
    } catch (err) {
      setError(err.message || "Could not start simulation");
    }
  };

  const stopSimulation = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/simulator/stop`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Could not stop simulation");
      setStatus(data);
      setRunning(false);
    } catch (err) {
      setError(err.message || "Could not stop simulation");
    }
  };

  return (
    <aside className="mg-global-sidebar">
      <div className="mg-global-sidebar__top">
        <div className="mg-global-sidebar__brand">
          <div className="mg-global-sidebar__logo"><Shield size={20} strokeWidth={2} /></div>
          <div className="mg-global-sidebar__brand-text">
            <span className="mg-global-sidebar__brand-title">MineGuard</span>
            <span className="mg-global-sidebar__brand-subtitle">Mine Safety Monitoring</span>
          </div>
        </div>

        <nav className="mg-global-sidebar__nav">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => `mg-global-nav-link${isActive ? " is-active" : ""}`}>
                <span className="mg-global-nav-link__left"><Icon size={20} strokeWidth={2} /><span>{item.label}</span></span>
                {item.label === "Alerts" && alertCount > 0 ? <span className="mg-global-nav-badge">{alertCount}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mg-global-sidebar__bottom">
        {open && (
          <div className="mg-sim-popover">
            <div className="mg-sim-popover__header">
              <div>
                <div className="mg-sim-popover__eyebrow">Simulation Control</div>
                <div className="mg-sim-popover__title">Run live prototype data</div>
              </div>
              <button className="mg-sim-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close simulation panel"><X size={15} /></button>
            </div>

            <div className="mg-sim-section-label">Scenario</div>
            <div className="mg-sim-mode-grid">
              {MODES.map((item) => (
                <button key={item.key} type="button" className={`mg-sim-mode${mode === item.key ? " is-selected" : ""}`} onClick={() => setMode(item.key)} disabled={running}>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mg-sim-duration-head">
              <span>Duration</span>
              <strong>{duration}s</strong>
            </div>
            <div className="mg-sim-slider-wrap">
              <input aria-label="Simulation duration in seconds" className="mg-sim-slider" type="range" min="50" max="100" step="1" value={duration} style={{ "--sim-progress": `${progress}%` }} onChange={(e) => setDuration(Number(e.target.value))} disabled={running} />
              <div className="mg-sim-slider-labels"><span>50s</span><span>100s</span></div>
            </div>

            {running ? (
              <div className="mg-sim-running">
                <div className="mg-sim-running__row"><Loader2 size={15} className="mg-spin" /><span>{status?.scenario ? `${String(status.scenario).toUpperCase()} simulation running` : "Simulation running"}</span></div>
                <button type="button" className="mg-sim-stop" onClick={stopSimulation}><Square size={13} /> Stop simulation</button>
              </div>
            ) : (
              <button type="button" className="mg-sim-start" onClick={startSimulation}><Play size={15} fill="currentColor" /> Start simulation</button>
            )}
            {error ? <div className="mg-sim-error">{error}</div> : null}
            <div className="mg-sim-hint">The simulator posts synthetic A/B/C telemetry to the live backend, so the dashboard, map, nodes and alerts update together.</div>
          </div>
        )}

        <button type="button" className={`mg-sim-trigger${running ? " is-running" : ""}`} onClick={() => setOpen((value) => !value)}>
          <span className="mg-sim-trigger__icon"><Play size={15} fill="currentColor" /></span>
          <span className="mg-sim-trigger__text"><strong>{running ? "Simulation Running" : "Run Simulation"}</strong><small>{running ? "Live synthetic telemetry" : "Prototype data controls"}</small></span>
          <span className="mg-sim-trigger__dot" />
        </button>

        <p className="mg-global-disclaimer">Prototype only. Runs fast-forward simulations inspired by real-world scenarios. The final prediction model may be refined or changed as real-world data becomes available.</p>
      </div>
    </aside>
  );
}
