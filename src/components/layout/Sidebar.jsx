import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Wallet,
  BarChart3,
  LifeBuoy,
  UserCircle2,
} from "lucide-react";
import "./Sidebar.css";

// Top menu items — Add/remove here and the sidebar updates automatically.
// NOTE: paths below are matched to your current App.jsx routes.
// "Chit" -> /chit/:id needs an id, so for now it points at /dashboard
// (change this once you have a chit-list page). "Help" route doesn't
// exist yet — add it in App.jsx or remove this entry.
const menuItems = [
  { label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { label: "Chit", icon: Wallet, path: "/chit" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Profile Info", icon: UserCircle2, path: "/profile" },
];

// Kept separate so it always renders at the bottom, above the branch card.
const profileItem = { label: "Profile Info", icon: UserCircle2, path: "/profile" };

export default function Sidebar({ branchName = "Chennai branch", activeChits = 0 }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">C</div>
        <span className="sidebar-brand-name">ChitPool</span>
      </div>

      <nav className="nav">
        {menuItems?.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to={profileItem.path}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <profileItem.icon size={18} />
          {profileItem.label}
        </NavLink>

            {/* <div className="sidebar-footer-card">
            <strong>{branchName}</strong>
            {activeChits} active chits
            </div> */}
      </div>
    </aside>
  );
}