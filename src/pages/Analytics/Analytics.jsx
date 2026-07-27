import { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Button, Spin, message, Select } from 'antd';
import { ArrowLeftOutlined, LogoutOutlined, BankOutlined } from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { IndianRupee, Wallet, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import './Analytics.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Adjust range as needed — covers a few years back/forward from now
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i);

// Recharts needs real color values (not CSS vars) for fills/strokes,
// so keep these in sync with the CSS variables in AnalyticsPage.css
const CHART_COLORS = {
  green: '#3D7A5C',
  gold: '#B8873B',
  ink: '#14213D',
  muted: '#6B7787',
  border: '#E3E1DA',
};

const formatINR = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span style={{ color: p.color }}>●</span> {p.name}: {formatINR(p.value)}
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="kpi-card">
    <div className="kpi-icon-row">
      <div className={`kpi-icon ${accent}`}>
        <Icon size={15} color={accent === 'gold' ? CHART_COLORS.gold : CHART_COLORS.green} />
      </div>
      <span className="kpi-label">{label}</span>
    </div>
    <div className="kpi-value">{value}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ===== Fetch Analytics =====
  const fetchAnalytics = async (month, year) => {
    try {
      setLoading(true);
      const { data } = await API.get('/analytics', { params: { month, year } });
      setData(data);
    } catch (err) {
      message.error(err.response?.data?.message || 'Unable to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(selectedMonth, selectedYear); }, [selectedMonth, selectedYear]);

  const statusSplitWithColor = useMemo(() => {
    if (!data) return [];
    return data.statusSplit.map((s) => ({
      ...s,
      color: s.name === 'Collected' ? CHART_COLORS.green : CHART_COLORS.gold,
    }));
  }, [data]);

  // ===== Loading =====
  if (loading && !data) return (
    <div className="an-loading-screen">
      <Spin size="large" />
    </div>
  );

  if (!data) return null;

  return (
    <Layout className="an-layout">

      <Content className="an-content">
        <div className="analytics-page">
          {/* Title + filters */}
          <div className="analytics-header">
            <div>
              <div className="analytics-eyebrow">Ledger overview</div>
              <Title className="analytics-title">Chit Analytics</Title>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                className="year-select"
                value={selectedYear}
                onChange={setSelectedYear}
                disabled={loading}
                style={{ minWidth: 110 }}
              >
                {YEARS.map((y) => (
                  <Option key={y} value={y}>{y}</Option>
                ))}
              </Select>
              <Select
                className="month-select"
                value={selectedMonth}
                onChange={setSelectedMonth}
                disabled={loading}
                style={{ minWidth: 160 }}
              >
                {MONTHS.map((m, i) => (
                  <Option key={i + 1} value={i + 1}>{m}</Option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tally-mark divider — one tick per bucket, nods to the physical chit ledger
          <div className="tally-divider">
            {data?.trend?.map((_, i) => <div key={i} className="tally-mark" />)}
          </div> */}

          {/* KPI row */}
          <div className="kpi-row">
            <KpiCard icon={IndianRupee} label="Collected" value={formatINR(data?.kpis?.totalCollected)} sub={`${MONTHS[selectedMonth - 1]} ${selectedYear}`} accent="green" />
            <KpiCard icon={Clock} label="Pending" value={formatINR(data.kpis.totalPending)} sub={`${MONTHS[selectedMonth - 1]} ${selectedYear}`} accent="gold" />
            <KpiCard icon={TrendingUp} label="Collection Rate" value={`${data.kpis.collectionRate}%`} sub="of due amount" accent="green" />
            <KpiCard icon={Wallet} label="Total Amount" value={formatINR(data.kpis.totalAmount)} sub={`${MONTHS[selectedMonth - 1]} ${selectedYear}`} accent="gold" />
          </div>

          {/* Trend chart */}
          <div className="panel panel-trend">
            <div className="panel-title">Collection Trend</div>
            <div className="panel-subtitle">Collected vs pending — {MONTHS[selectedMonth - 1]?.toLowerCase()} {selectedYear}</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: CHART_COLORS.muted, fontFamily: 'Inter' }} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted, fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={formatINR} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.green} strokeWidth={2.2} fill="url(#collectedFill)" />
                <Area type="monotone" dataKey="pending" name="Pending" stroke={CHART_COLORS.gold} strokeWidth={2.2} fill="url(#pendingFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom row */}
          <div className="bottom-row">
            <div className="panel panel-status">
              <div className="panel-title">Payment Status</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusSplitWithColor} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>
                    {statusSplitWithColor.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="status-legend">
                {statusSplitWithColor.map((s) => (
                  <div key={s.name} className="status-legend-item">
                    <div className="status-legend-dot" style={{ background: s.color }} />
                    {s.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel-topchits">
              <div className="panel-title">Top Chits by Collection</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.topChits} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid stroke={CHART_COLORS.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.muted, fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={formatINR} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_COLORS.ink, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="collected" name="Collected" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AnalyticsPage;