import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CircleDot,
  Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import "./Home.css";

const CHART_COLORS = { green: "#2F8F5B", gold: "#C97A1E", muted: "#9A9C9C", border: "#EDE7D8" };

const currency = (n) => "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function PotRing({ collected, pot, size = 76 }) {
  const pct = pot > 0 ? Math.min(100, Math.round((collected / pot) * 100)) : 0;
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

const MiniTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #EDE7D8", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#9A9C9C", marginBottom: 3 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: "#333" }}>
          <span style={{ color: p.color }}>●</span> {p.name}: {currency(p.value)}
        </div>
      ))}
    </div>
  );
};

function RiskDot({ risk }) {
  const color = risk === "low" ? "#2F8F5B" : risk === "medium" ? "#C97A1E" : "#C2483D";
  return <CircleDot size={13} color={color} fill={color} className="risk-dot" />;
}

export default function Home() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await API.get("/dashboard/summary");
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  if (loading && !summary) {
    return (
      <div className="dash-loading">
        <Loader2 size={22} className="dash-loading-spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="dash-loading">
        <span>{error}</span>
        <button className="new-chit-btn" onClick={fetchSummary}>Retry</button>
      </div>
    );
  }

  const { totals, recentChits, monthTrend } = summary;

  const statCards = [
    { label: "Total pool value", value: currency(totals.totalPot), trend: "+4.2%", up: true },
    // { label: "Total collected amount", value: currency(totals.totalCollected), trend: "+11.6%", up: true },
    { label: "Active chits", value: totals.activeChits.toString(), trend: "same", up: null },
  ];

  return (
    <>
      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            {/* {s.up !== null && (
              <div className={`stat-trend ${s.up ? "up" : "down"}`}>
                {s.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {s.trend}
              </div>
            )} */}
          </div>
        ))}
      </div>

      <div className="content-grid">
        {/* Chit pots — last 3 chits */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Chit pools</h2>
            <button className="new-chit-btn" onClick={() => navigate("/chit")}>
              <Plus size={14} /> New chit
            </button>
          </div>

          <div className="chit-list">
            {recentChits.length === 0 ? (
              <div className="dash-empty">No chits yet. Create your first chit to get started.</div>
            ) : (
              recentChits.map((c) => (
                <div key={c.id} className="chit-row" onClick={() => navigate(`/chit/${c.id}`)} style={{ cursor: "pointer" }}>
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
              ))
            )}
          </div>
        </div>

        {/* This month — small collection trend */}
        <div className="panel">
          <h2 className="panel-title" style={{ marginBottom: 4 }}>
            This month
          </h2>
          <p style={{ fontSize: 12, color: "#9A9C9C", margin: "0 0 12px" }}>
            Collected vs pending, week by week
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="dashCollectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashPendingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
              <Tooltip content={<MiniTooltip />} />
              <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#dashCollectedFill)" />
              <Area type="monotone" dataKey="pending" name="Pending" stroke={CHART_COLORS.gold} strokeWidth={2} fill="url(#dashPendingFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}