import { useState, useEffect } from 'react';
import {
  Layout, Typography, Button, Table, Space,
  Modal, Form, Input, Select, Card, Row, Col,
  Popconfirm, message, Tooltip, Avatar, Drawer
} from 'antd';
import {
  PlusOutlined, DeleteOutlined,
  PoweroffOutlined, LogoutOutlined, TeamOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, CrownOutlined,
  BankOutlined, CalendarOutlined, TrophyOutlined,
  HourglassOutlined, MenuOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title, Text }     = Typography;
const { Option }          = Select;

/* ─────────────────────────────────────────────
   Plan Badge
───────────────────────────────────────────── */
const PlanBadge = ({ plan }) => {
  const config = {
    trial:   { cls: 'badge-trial',   icon: <HourglassOutlined />, label: 'Trial'   },
    monthly: { cls: 'badge-monthly', icon: <CalendarOutlined />,  label: 'Monthly' },
    yearly:  { cls: 'badge-yearly',  icon: <TrophyOutlined />,    label: 'Yearly'  },
  };
  const { cls, icon, label } = config[plan] || config.trial;
  return <span className={`plan-badge ${cls}`}>{icon} {label}</span>;
};

/* ─────────────────────────────────────────────
   Status Pill
───────────────────────────────────────────── */
const StatusPill = ({ isActive }) => (
  <span className={`status-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
    {isActive ? <><CheckCircleOutlined /> Active</> : <><CloseCircleOutlined /> Inactive</>}
  </span>
);

/* ─────────────────────────────────────────────
   Expiry Cell
───────────────────────────────────────────── */
const ExpiryCell = ({ tenant }) => {
  const date = tenant.isTrial ? tenant.trialEndsAt : tenant.planExpiry;
  if (!date) return <Text type="secondary">—</Text>;
  const isExpired = new Date() > new Date(date);
  const formatted = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return (
    <span className={isExpired ? 'expiry-expired' : 'expiry-valid'}>
      {isExpired ? <ClockCircleOutlined /> : <CheckCircleOutlined />} {formatted}
    </span>
  );
};

/* ─────────────────────────────────────────────
   Mobile Tenant Card
───────────────────────────────────────────── */
const MobileTenantCard = ({ record, onUpgrade, onToggle, onDelete }) => (
  <div className="mobile-tenant-card">
    <div className="mtc-header">
      <Space size={10}>
        <Avatar className="tenant-avatar">{record.name.charAt(0).toUpperCase()}</Avatar>
        <div>
          <div className="tenant-name">{record.name}</div>
          <div className="tenant-sub">@{record.subdomain}</div>
        </div>
      </Space>
      <StatusPill isActive={record.isActive} />
    </div>

    <div className="mtc-meta">
      <div className="mtc-row">
        <span className="mtc-label">Plan</span>
        <PlanBadge plan={record.plan} />
      </div>
      <div className="mtc-row">
        <span className="mtc-label">Expiry</span>
        <ExpiryCell tenant={record} />
      </div>
      <div className="mtc-row">
        <span className="mtc-label">Created</span>
        <span className="date-cell">
          {new Date(record.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      </div>
    </div>

    <div className="mtc-actions">
      <Button
        icon={<CrownOutlined />}
        className="action-btn action-upgrade"
        onClick={() => onUpgrade(record)}
      >
        Upgrade
      </Button>
      <Button
        icon={<PoweroffOutlined />}
        className={`action-btn ${record.isActive ? 'action-deactivate' : 'action-activate'}`}
        onClick={() => onToggle(record._id)}
      >
        {record.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Popconfirm
        title="Delete this tenant?"
        description="This action is permanent and cannot be undone."
        onConfirm={() => onDelete(record._id)}
        okText="Yes, Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Button icon={<DeleteOutlined />} className="action-btn action-delete" danger>
          Delete
        </Button>
      </Popconfirm>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Super Admin Dashboard
───────────────────────────────────────────── */
const SuperAdminDashboard = () => {
  const [tenants, setTenants]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [addModal, setAddModal]             = useState(false);
  const [upgradeModal, setUpgradeModal]     = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile]             = useState(window.innerWidth < 768);
  const [addForm]     = Form.useForm();
  const [upgradeForm] = Form.useForm();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /* ── Resize listener ── */
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  /* ── Fetch ── */
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/tenants');
      setTenants(data);
    } catch {
      message.error('Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTenants(); }, []);

  /* ── Stats ── */
  const stats = {
    total:    tenants.length,
    active:   tenants.filter(t => t.isActive).length,
    trial:    tenants.filter(t => t.isTrial).length,
    inactive: tenants.filter(t => !t.isActive).length,
  };

  /* ── Handlers ── */
  const handleCreate = async (values) => {
    try {
      await API.post('/tenants', values);
      message.success('Tenant created. 7-day trial started.');
      addForm.resetFields();
      setAddModal(false);
      fetchTenants();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to create tenant.');
    }
  };

  const handleUpgrade = async (values) => {
    try {
      await API.put(`/tenants/${selectedTenant._id}/upgrade`, values);
      message.success('Plan upgraded successfully.');
      upgradeForm.resetFields();
      setUpgradeModal(false);
      fetchTenants();
    } catch {
      message.error('Failed to upgrade plan.');
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await API.put(`/tenants/${id}/toggle`);
      message.success(data.message);
      fetchTenants();
    } catch {
      message.error('Failed to update tenant status.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/tenants/${id}`);
      message.success('Tenant deleted permanently.');
      fetchTenants();
    } catch {
      message.error('Failed to delete tenant.');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const openUpgrade = (record) => {
    setSelectedTenant(record);
    setUpgradeModal(true);
  };

  /* ── Desktop Table Columns ── */
  const columns = [
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_, record) => (
        <Space size={12}>
          <Avatar className="tenant-avatar">{record.name.charAt(0).toUpperCase()}</Avatar>
          <div>
            <Text strong className="tenant-name">{record.name}</Text>
            <Text type="secondary" className="tenant-sub">@{record.subdomain}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) => <PlanBadge plan={plan} />,
    },
    {
      title: 'Expiry Date',
      key: 'expiry',
      render: (_, record) => <ExpiryCell tenant={record} />,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <StatusPill isActive={record.isActive} />,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" className="date-cell">
          {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Upgrade Plan">
            <Button size="small" icon={<CrownOutlined />} className="action-btn action-upgrade"
              onClick={() => openUpgrade(record)} />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Button size="small" icon={<PoweroffOutlined />}
              className={`action-btn ${record.isActive ? 'action-deactivate' : 'action-activate'}`}
              onClick={() => handleToggle(record._id)} />
          </Tooltip>
          <Tooltip title="Delete Tenant">
            <Popconfirm
              title="Delete this tenant?"
              description="This action is permanent and cannot be undone."
              onConfirm={() => handleDelete(record._id)}
              okText="Yes, Delete" cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<DeleteOutlined />} className="action-btn action-delete" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  /* ── Render ── */
  return (
    <Layout className="sa-layout">

      {/* ── Header ── */}
      <Header className="sa-header">
        <div className="sa-header-left">
          <div className="sa-logo-mark"><BankOutlined /></div>
          <span className="sa-brand">Chit Manage</span>
        </div>

        {/* Desktop right */}
        <div className="sa-header-right sa-header-desktop">
          <Text className="sa-username">{user?.name}</Text>
          <Button icon={<LogoutOutlined />} className="sa-logout-btn" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Button
          className="sa-menu-btn sa-header-mobile"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(true)}
        />
      </Header>

      {/* ── Mobile Drawer Menu ── */}
      <Drawer
        title="Menu"
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={260}
        className="sa-mobile-drawer"
      >
        <div className="drawer-user">
          <div className="drawer-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <div className="drawer-name">{user?.name}</div>
            <span className="sa-admin-badge" style={{ marginTop: 4 }}><CrownOutlined /> Super Admin</span>
          </div>
        </div>
        <Button
          block
          icon={<LogoutOutlined />}
          className="drawer-logout-btn"
          onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
        >
          Logout
        </Button>
      </Drawer>

      {/* ── Content ── */}
      <Content className="sa-content">

        {/* Page Header */}
        <div className="sa-page-header">
          <div className="sa-page-header-row">
            <div>
              <Title level={4} className="sa-page-title">Tenant Management</Title>
              <Text className="sa-page-sub">Manage all tenants, plans, and subscriptions</Text>
            </div>
            {/* Add button visible on mobile page header too */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="sa-add-btn sa-add-btn-mobile"
              onClick={() => setAddModal(true)}
            >
              <span className="btn-label-full">Add Tenant</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <Row gutter={[14, 14]} className="sa-stats-row">
          {[
            { label: 'Total Tenants',  value: stats.total,    icon: <BankOutlined />,        cls: 'stat-purple' },
            { label: 'Active',         value: stats.active,   icon: <CheckCircleOutlined />, cls: 'stat-green'  },
            { label: 'On Trial',       value: stats.trial,    icon: <HourglassOutlined />,   cls: 'stat-amber'  },
            { label: 'Inactive',       value: stats.inactive, icon: <CloseCircleOutlined />, cls: 'stat-red'    },
          ].map((s, i) => (
            <Col xs={12} sm={12} md={12} lg={6} key={i}>
              <Card className="sa-stat-card">
                <div className="sa-stat-inner">
                  <div>
                    <div className="sa-stat-value">{s.value}</div>
                    <div className="sa-stat-label">{s.label}</div>
                  </div>
                  <div className={`sa-stat-icon ${s.cls}`}>{s.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Table Card */}
        <Card className="sa-table-card">
          <div className="sa-table-header">
            <span className="sa-table-title">
              <TeamOutlined /> All Tenants
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="sa-add-btn sa-add-btn-desktop"
              onClick={() => setAddModal(true)}
            >
              Add Tenant
            </Button>
          </div>

          {/* Mobile: card list | Desktop: table */}
          {isMobile ? (
            <div className="sa-mobile-list">
              {loading
                ? <div className="sa-loading-text">Loading tenants…</div>
                : tenants.length === 0
                  ? <div className="sa-empty-text">No tenants yet. Add one to get started.</div>
                  : tenants.map(t => (
                    <MobileTenantCard
                      key={t._id}
                      record={t}
                      onUpgrade={openUpgrade}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
            </div>
          ) : (
            <Table
              className="sa-table"
              columns={columns}
              dataSource={tenants}
              rowKey="_id"
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          )}
        </Card>

      </Content>

      {/* ── Add Tenant Modal ── */}
      <Modal
        title="Add New Tenant"
        open={addModal}
        onCancel={() => { setAddModal(false); addForm.resetFields(); }}
        footer={null}
        width="min(500px, 96vw)"
        className="sa-modal"
        centered
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreate} className="sa-form">
          <Row gutter={[14, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Company Name"
                rules={[{ required: true, message: 'Company name is required.' }]}>
                <Input placeholder="e.g. Vimal Chit Fund" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="subdomain" label="Subdomain"
                rules={[{ required: true, message: 'Subdomain is required.' }]}>
                <Input placeholder="e.g. vimal_dev" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="adminName" label="Admin Name"
                rules={[{ required: true, message: 'Admin name is required.' }]}>
                <Input placeholder="e.g. Vimal" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Admin Email"
                rules={[{ required: true, type: 'email', message: 'Enter a valid email.' }]}>
                <Input placeholder="e.g. vimal@email.com" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="password" label="Password"
                rules={[{ required: true, message: 'Password is required.' }]}>
                <Input.Password placeholder="Set a strong password" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
            <Button type="primary" htmlType="submit" block className="sa-submit-btn">
              Create Tenant — Includes 7-Day Free Trial
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Upgrade Plan Modal ── */}
      <Modal
        title={`Upgrade Plan — ${selectedTenant?.name}`}
        open={upgradeModal}
        onCancel={() => { setUpgradeModal(false); upgradeForm.resetFields(); }}
        footer={null}
        width="min(400px, 96vw)"
        className="sa-modal"
        centered
      >
        <Form form={upgradeForm} layout="vertical" onFinish={handleUpgrade} className="sa-form">
          <Form.Item name="plan" label="Select New Plan"
            rules={[{ required: true, message: 'Please select a plan.' }]}>
            <Select placeholder="Choose a plan…" size="large">
              <Option value="monthly">Monthly Plan — Billed every month</Option>
              <Option value="yearly">Yearly Plan — Best value</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block className="sa-submit-btn">
              Confirm Upgrade
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </Layout>
  );
};

export default SuperAdminDashboard;