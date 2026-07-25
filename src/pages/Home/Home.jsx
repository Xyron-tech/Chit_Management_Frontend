import React, { useState } from "react";
import {
  LayoutGrid,
  Wallet,
  BarChart3,
  LifeBuoy,
  UserCircle2,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CircleDot,
} from "lucide-react";
import "./Home.css";

const chits = [
  { id: 1, name: "Test Chennai", pot: 200000, collected: 96000, members: 10, month: "5 / 20", risk: "low" },
  { id: 2, name: "Anna Nagar Gold", pot: 500000, collected: 275000, members: 20, month: "11 / 20", risk: "low" },
];

const members = [
  { name: "Sathish R", phone: "98765 42333", chit: "Test Chennai", month: 1, amount: 9600, status: "paid" },
  { name: "Sathish", phone: "24234 32432", chit: "Test Chennai", month: 5, amount: 9600, status: "pending" },
  { name: "Sathish R", phone: "12345 67890", chit: "Test Chennai", month: 3, amount: 9600, status: "pending" },
];

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "chit", label: "Chit", icon: Wallet },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "help", label: "Help & Support", icon: LifeBuoy },
  { key: "profile", label: "Profile Info", icon: UserCircle2 },
];

const currency = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

function PotRing({ collected, pot, size = 76 }) {
  const pct = Math.min(100, Math.round((collected / pot) * 100));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="pot-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE7D8" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E3BA45" />
            <stop offset="100%" stopColor="#A87E12" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pot-ring-value">{pct}%</div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    paid: { className: "pill-paid", label: "Paid" },
    pending: { className: "pill-pending", label: "Pending" },
    overdue: { className: "pill-overdue", label: "Overdue" },
  };
  const s = map[status];
  return <span className={`pill ${s.className}`}>{s.label}</span>;
}

function RiskDot({ risk }) {
  const color = risk === "low" ? "#2F8F5B" : risk === "medium" ? "#C97A1E" : "#C2483D";
  return <CircleDot size={13} color={color} fill={color} className="risk-dot" />;
}

export default function ChitDashboard() {
  const [active, setActive] = useState("dashboard");

  const totalPot = chits.reduce((s, c) => s + c.pot, 0);
  const totalCollected = chits.reduce((s, c) => s + c.collected, 0);
  const pendingCount = members.filter((m) => m.status !== "paid").length;

  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">C</div>
          <span className="sidebar-brand-name">ChitPool</span>
        </div>

        <nav className="nav">
          {menuItems?.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`nav-item${active === key ? " active" : ""}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <strong>Chennai branch</strong>
            4 active chits · 55 members
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          <div>
            <h1 className="topbar-title">Dashboard</h1>
            <p className="topbar-subtitle">Friday, 24 July 2026 · overview of all pools</p>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} color="#9A9C9C" />
              <input placeholder="Search chits, members…" />
            </div>
            <button className="icon-btn">
              <Bell size={17} color="#4A4D5E" />
              <span className="dot" />
            </button>
            <div className="avatar-menu">
              <div className="avatar">RK</div>
              <ChevronDown size={15} color="#767A8C" />
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid">
          {[
            { label: "Total pool value", value: currency(totalPot), trend: "+4.2%", up: true },
            { label: "Collected to date", value: currency(totalCollected), trend: "+11.6%", up: true },
            { label: "Active chits", value: chits.length.toString(), trend: "same", up: null },
            { label: "Payments pending", value: pendingCount.toString(), trend: "-2", up: false },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              {s.up !== null && (
                <div className={`stat-trend ${s.up ? "up" : "down"}`}>
                  {s.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {s.trend}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="content-grid">
          {/* Chit pots */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Chit pools</h2>
              <button className="new-chit-btn">
                <Plus size={14} /> New chit
              </button>
            </div>

            <div className="chit-list">
              {chits.map((c) => (
                <div key={c.id} className="chit-row">
                  <PotRing collected={c.collected} pot={c.pot} />
                  <div className="chit-info">
                    <div className="chit-name">
                      <RiskDot risk={c.risk} />
                      {c.name}
                    </div>
                    <div className="chit-meta">
                      {c.members} members · month {c.month}
                    </div>
                  </div>
                  <div className="chit-amounts">
                    <div className="chit-collected">{currency(c.collected)}</div>
                    <div className="chit-target">of {currency(c.pot)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="panel">
            <h2 className="panel-title" style={{ marginBottom: 16 }}>
              Recent activity
            </h2>
            <div className="activity-list">
              {members.map((m, i) => (
                <div key={i} className="activity-row">
                  <div>
                    <div className="activity-name">{m.name}</div>
                    <div className="activity-meta">
                      {m.chit} · month {m.month}
                    </div>
                  </div>
                  <div className="activity-amount">
                    <div className="activity-amount-value">{currency(m.amount)}</div>
                    <StatusPill status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}