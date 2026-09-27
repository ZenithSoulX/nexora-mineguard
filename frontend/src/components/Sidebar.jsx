import React from "react";
import { NavLink as RouterNavLink } from "react-router-dom";

import {
  Shield,
  LayoutGrid,
  Radio,
  MapPin,
  Bell,
} from "lucide-react";

// Dashboard ka existing CSS use hoga
import "../Dashboard.css";

const navItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutGrid,
  },
  {
    label: "Sensor Nodes",
    path: "/Nodes",
    icon: Radio,
  },
  {
    label: "Live Map",
    path: "/LiveMap",
    icon: MapPin,
  },
  {
    label: "Alerts",
    path: "/Alerts",
    icon: Bell,
    badge: 2,
  },
];

function NavLink({ item }) {
  const Icon = item.icon;

  return (
    <RouterNavLink
      to={item.path}
      end={item.path === "/"}
      className={({ isActive }) =>
        `nav-link ${isActive ? "nav-link--active" : ""}`
      }
    >
      <span className="nav-link__left">
        <Icon size={20} strokeWidth={2} />
        <span>{item.label}</span>
      </span>

      {item.badge && (
        <span className="nav-badge">
          {item.badge}
        </span>
      )}
    </RouterNavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="mg-sidebar">
      <div>
        <div className="mg-sidebar__brand">
          <div className="mg-sidebar__logo">
            <Shield size={20} strokeWidth={2} />
          </div>

          <div className="mg-sidebar__brand-text">
            <span className="mg-sidebar__brand-title">
              MineGuard
            </span>

            <span className="mg-sidebar__brand-subtitle">
              Mine Safety Monitoring
            </span>
          </div>
        </div>

        <nav className="mg-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              item={item}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}