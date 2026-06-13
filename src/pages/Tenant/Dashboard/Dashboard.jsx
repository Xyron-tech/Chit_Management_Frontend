import { useState, useEffect } from 'react';
import {
    Layout, Typography, Button, Table, Space,
    Modal, Form, Input, Select, Card, Row, Col,
    Popconfirm, message, DatePicker, InputNumber,
    Tooltip, Avatar, Drawer
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined,
    LogoutOutlined, FileTextOutlined, TeamOutlined,
    CheckCircleOutlined, ClockCircleOutlined,
    MenuOutlined, DollarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import dayjs from 'dayjs';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title, Text }     = Typography;
const { Option }          = Select;

/* ── Chit Type Badge ── */
const ChitTypeBadge = ({ type }) => (
    <span className={`db-type-badge db-type-${type}`}>
        {type === 'auction' ? 'Auction' : 'Tallu'}
    </span>
);

/* ── Status Pill ── */
const ChitStatus = ({ status }) => (
    <span className={`db-status-pill db-status-${status}`}>
        {status === 'active'
            ? <><CheckCircleOutlined /> Active</>
            : <><ClockCircleOutlined /> Completed</>}
    </span>
);

/* ── Amount formatter ── */
const fmtAmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

/* ── Mobile Chit Card ── */
const MobileChitCard = ({ record, onEdit, onDelete, onClick }) => (
    <div className="db-mobile-card" onClick={() => onClick(record)}>
        <div className="db-mc-header">
            <div className="db-mc-identity">
                <Avatar className="db-chit-avatar">
                    {record.chitName.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                    <div className="db-chit-name">{record.chitName}</div>
                    <ChitTypeBadge type={record.chitType} />
                </div>
            </div>
            <ChitStatus status={record.status} />
        </div>

        <div className="db-mc-meta">
            {[
                { label: 'Chit Amount',  value: fmtAmt(record.chitAmount),        strong: true },
                { label: 'Installment',  value: fmtAmt(record.installmentAmount), accent: true },
                { label: 'Members',      value: record.memberCount },
                { label: 'Start Date',   value: new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map((row, i) => (
                <div className="db-mc-row" key={i}>
                    <span className="db-mc-label">{row.label}</span>
                    <span className={`db-mc-value ${row.strong ? 'db-mc-value--strong' : ''} ${row.accent ? 'db-mc-value--accent' : ''}`}>
                        {row.value}
                    </span>
                </div>
            ))}
        </div>

        <div className="db-mc-actions" onClick={e => e.stopPropagation()}>
            <Button
                icon={<EditOutlined />}
                className="db-action-btn db-action-edit"
                onClick={(e) => onEdit(record, e)}
            >
                Edit
            </Button>
            <Popconfirm
                title="Delete this chit?"
                description="This action cannot be undone."
                onConfirm={(e) => onDelete(record._id, e)}
                okText="Delete" cancelText="Cancel"
                okButtonProps={{ danger: true }}
            >
                <Button
                    icon={<DeleteOutlined />}
                    className="db-action-btn db-action-delete"
                    danger
                    onClick={e => e.stopPropagation()}
                >
                    Delete
                </Button>
            </Popconfirm>
        </div>
    </div>
);

/* ═══════════════════════════════════════════
   Dashboard
═══════════════════════════════════════════ */
const Dashboard = () => {
    const [chits, setChits]                   = useState([]);
    const [loading, setLoading]               = useState(false);
    const [modalOpen, setModalOpen]           = useState(false);
    const [editChit, setEditChit]             = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile]             = useState(window.innerWidth < 768);
    const [form] = Form.useForm();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handle = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
    }, []);

    const fetchChits = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/chits');
            setChits(data);
        } catch {
            message.error('Failed to load chits.');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchChits(); }, []);

    const stats = {
        total:     chits.length,
        active:    chits.filter(c => c.status === 'active').length,
        completed: chits.filter(c => c.status === 'completed').length,
        members:   chits.reduce((acc, c) => acc + (c.memberCount || 0), 0),
    };

    const openAddModal = () => {
        setEditChit(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (chit, e) => {
        e?.stopPropagation();
        setEditChit(chit);
        form.setFieldsValue({
            ...chit,
            startDate: dayjs(chit.startDate),
            endDate:   dayjs(chit.endDate),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                startDate: values.startDate.toISOString(),
                endDate:   values.endDate.toISOString(),
            };
            if (editChit) {
                await API.put(`/chits/${editChit._id}`, payload);
                message.success('Chit updated successfully.');
            } else {
                await API.post('/chits', payload);
                message.success('Chit created successfully.');
            }
            form.resetFields();
            setModalOpen(false);
            setEditChit(null);
            fetchChits();
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to save chit.');
        }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        try {
            await API.delete(`/chits/${id}`);
            message.success('Chit deleted.');
            fetchChits();
        } catch {
            message.error('Failed to delete chit.');
        }
    };

    const handleRowClick = (record) => navigate(`/chit/${record._id}`);
    const handleLogout   = () => { logout(); navigate('/login'); };
    const closeModal     = () => { setModalOpen(false); form.resetFields(); setEditChit(null); };

    const columns = [
        {
            title: 'Chit Name',
            key: 'chitName',
            render: (_, record) => (
                <Space size={10}>
                    <Avatar className="db-chit-avatar">
                        {record.chitName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text strong className="db-chit-name">{record.chitName}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'chitType',
            render: (type) => <ChitTypeBadge type={type} />,
        },
        {
            title: 'Members',
            dataIndex: 'memberCount',
            render: (count) => (
                <Space size={5}>
                    <TeamOutlined style={{ color: '#4f6ef7', fontSize: 14 }} />
                    <Text strong style={{ fontSize: 13 }}>{count}</Text>
                </Space>
            ),
        },
        {
            title: 'Chit Amount',
            dataIndex: 'chitAmount',
            render: (amt) => <span className="db-amt-strong">{fmtAmt(amt)}</span>,
        },
        {
            title: 'Installment',
            dataIndex: 'installmentAmount',
            render: (amt) => <span className="db-amt-accent">{fmtAmt(amt)}</span>,
        },
        {
            title: 'Start Date',
            dataIndex: 'startDate',
            render: (date) => (
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (status) => <ChitStatus status={status} />,
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 90,
            render: (_, record) => (
                <Space size={6} onClick={e => e.stopPropagation()}>
                    <Tooltip title="Edit">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            className="db-action-btn db-action-edit"
                            onClick={(e) => openEditModal(record, e)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete this chit?"
                            description="This action cannot be undone."
                            onConfirm={(e) => handleDelete(record._id, e)}
                            okText="Delete" cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                size="small"
                                icon={<DeleteOutlined />}
                                className="db-action-btn db-action-delete"
                                onClick={e => e.stopPropagation()}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <Layout className="db-layout">

            {/* Header */}
            <Header className="db-header">
                <div className="db-header-brand">
                    <span className="db-brand-mark">CS</span>
                    <span className="db-brand-name">ChitSaaS</span>
                </div>

                <div className="db-header-right db-desktop-only">
                    <span className="db-user-chip">
                        <TeamOutlined />
                        {user?.name}
                    </span>
                    <Button
                        icon={<LogoutOutlined />}
                        className="db-btn-ghost db-btn-danger"
                        size="small"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </div>

                <Button
                    className="db-menu-btn db-mobile-only"
                    icon={<MenuOutlined />}
                    onClick={() => setMobileMenuOpen(true)}
                />
            </Header>

            {/* Mobile Drawer */}
            <Drawer
                title={null}
                placement="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                width={260}
                className="db-drawer"
            >
                <div className="db-drawer-user">
                    <Avatar size={48} className="db-drawer-avatar">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <div>
                        <div className="db-drawer-name">{user?.name}</div>
                        <span className="db-drawer-role">Tenant Admin</span>
                    </div>
                </div>
                <Button
                    block
                    icon={<LogoutOutlined />}
                    danger
                    style={{ marginTop: 16, borderRadius: 8 }}
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                >
                    Logout
                </Button>
            </Drawer>

            <Content className="db-content">

                {/* Page Header */}
                <div className="db-page-header">
                    <div>
                        <Title level={4} className="db-page-title">Chit Dashboard</Title>
                        <Text className="db-page-sub">Manage your chit funds and members</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="db-btn-primary"
                        onClick={openAddModal}
                    >
                        Add Chit
                    </Button>
                </div>

                {/* Stats */}
                <Row gutter={[12, 12]} className="db-stats-row">
                    {[
                        { label: 'Total Chits',   value: stats.total,     icon: <FileTextOutlined />,    cls: 'db-stat--purple' },
                        { label: 'Active',         value: stats.active,    icon: <CheckCircleOutlined />, cls: 'db-stat--green'  },
                        { label: 'Completed',      value: stats.completed, icon: <ClockCircleOutlined />, cls: 'db-stat--amber'  },
                        { label: 'Total Members',  value: stats.members,   icon: <TeamOutlined />,        cls: 'db-stat--blue'   },
                    ].map((s, i) => (
                        <Col xs={12} sm={12} md={6} key={i}>
                            <Card className="db-stat-card" bordered={false}>
                                <div className="db-stat-inner">
                                    <div>
                                        <div className="db-stat-value">{s.value}</div>
                                        <div className="db-stat-label">{s.label}</div>
                                    </div>
                                    <div className={`db-stat-icon ${s.cls}`}>{s.icon}</div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Table / Cards */}
                <Card className="db-table-card" bordered={false}>
                    <div className="db-table-header">
                        <span className="db-section-label">
                            <FileTextOutlined className="db-section-icon" />
                            All Chits
                            <span className="db-count-pill">{chits.length}</span>
                        </span>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="db-btn-primary db-desktop-only"
                            onClick={openAddModal}
                        >
                            Add Chit
                        </Button>
                    </div>

                    {isMobile ? (
                        <div className="db-mobile-list">
                            {loading
                                ? <div className="db-list-placeholder">Loading chits…</div>
                                : chits.length === 0
                                    ? <div className="db-list-placeholder">No chits yet. Add one to get started.</div>
                                    : chits.map(c => (
                                        <MobileChitCard
                                            key={c._id}
                                            record={c}
                                            onEdit={openEditModal}
                                            onDelete={handleDelete}
                                            onClick={handleRowClick}
                                        />
                                    ))
                            }
                        </div>
                    ) : (
                        <Table
                            className="db-table"
                            columns={columns}
                            dataSource={chits}
                            rowKey="_id"
                            loading={loading}
                            scroll={{ x: 900 }}
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            onRow={(record) => ({
                                onClick: () => handleRowClick(record),
                                style: { cursor: 'pointer' },
                            })}
                        />
                    )}
                </Card>

            </Content>

            {/* Add / Edit Modal */}
            <Modal
                title={editChit ? 'Edit Chit' : 'Add New Chit'}
                open={modalOpen}
                onCancel={closeModal}
                footer={null}
                width="min(620px, 96vw)"
                className="db-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item name="chitName" label="Chit Name"
                        rules={[{ required: true, message: 'Chit name is required.' }]}>
                        <Input placeholder="e.g. Gold Chit 2025" size="large" />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="chitType" label="Chit Type"
                                rules={[{ required: true, message: 'Select a chit type.' }]}>
                                <Select placeholder="Select type" size="large">
                                    <Option value="auction">Auction</Option>
                                    <Option value="tallu">Tallu</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="memberCount" label="Member Count"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber placeholder="20" min={1} max={100} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="chitAmount" label="Total Chit Amount (₹)"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber
                                    placeholder="500000" min={1}
                                    style={{ width: '100%' }} size="large"
                                    formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/₹\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="installmentAmount" label="Installment Amount (₹)"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber
                                    placeholder="25000" min={1}
                                    style={{ width: '100%' }} size="large"
                                    formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/₹\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                        <Col xs={12} sm={6}>
                            <Form.Item name="commission" label="Commission (%)"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber placeholder="4" min={0} max={100} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Form.Item name="chitDate" label="Chit Date"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber placeholder="5" min={1} max={31} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Form.Item name="totalMonths" label="Total Months"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <InputNumber placeholder="20" min={1} max={120} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Form.Item name="status" label="Status"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <Select placeholder="Status" size="large">
                                    <Option value="active">Active</Option>
                                    <Option value="completed">Completed</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="startDate" label="Start Date"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <DatePicker style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="endDate" label="End Date"
                                rules={[{ required: true, message: 'Required.' }]}>
                                <DatePicker style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <Button type="primary" htmlType="submit" block size="large" className="db-btn-primary">
                            {editChit ? 'Save Changes' : 'Create Chit'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

        </Layout>
    );
};

export default Dashboard;