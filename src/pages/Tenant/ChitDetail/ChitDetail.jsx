import { useState, useEffect } from 'react';
import {
    Layout, Typography, Button, Table, Space,
    Modal, Form, Input, Card, Row, Col,
    Popconfirm, message, Select, Switch,
    Tooltip, Avatar, Spin, Divider, Badge, Tag
} from 'antd';
import {
    ArrowLeftOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, LogoutOutlined, TeamOutlined,
    DollarOutlined, CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './ChitDetail.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const ChitDetail = () => {
    const [chit, setChit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [memberModal, setMemberModal] = useState(false);
    const [editMember, setEditMember] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(1);
    const [form] = Form.useForm();
    const { id } = useParams();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const fetchChit = async () => {
        try {
            setLoading(true);
            const { data } = await API.get(`/chits/${id}`);
            setChit(data);
        } catch {
            message.error('Failed to load chit details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChit(); }, [id]);

    const getPerMemberAmount = (chit) => {
        const memberCount = chit?.members?.length > 0 ? chit.members.length : 1;
        const installment = chit?.installmentAmount || 0;
        const commission = chit?.commission || 0;
        const commissionAmt = (installment * commission) / 100;
        const totalMonthly = installment + commissionAmt;
        return totalMonthly / memberCount;
    };

    const handleMemberSubmit = async (values) => {
        try {
            if (editMember) {
                await API.put(`/chits/${id}/members/${editMember._id}`, values);
                message.success('Member updated successfully');
            } else {
                await API.post(`/chits/${id}/members`, values);
                message.success('Member added successfully');
            }
            form.resetFields();
            setMemberModal(false);
            setEditMember(null);
            fetchChit();
        } catch (err) {
            message.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDeleteMember = async (memberId) => {
        try {
            await API.delete(`/chits/${id}/members/${memberId}`);
            message.success('Member removed successfully');
            fetchChit();
        } catch {
            message.error('Failed to remove member');
        }
    };

    const handleMarkPayment = async (memberId, paymentId) => {
        try {
            await API.put(`/chits/${id}/members/${memberId}/payments/${paymentId}`);
            fetchChit();
        } catch {
            message.error('Failed to update payment status');
        }
    };

    const handleMarkAllPaid = async () => {
        try {
            const members = chit?.members || [];
            for (const member of members) {
                const payment = member.payments?.find(p => p.month === selectedMonth);
                if (payment && payment.status === 'pending') {
                    await API.put(`/chits/${id}/members/${member._id}/payments/${payment._id}`);
                }
            }
            message.success(`All payments marked as paid for Month ${selectedMonth}`);
            fetchChit();
        } catch {
            message.error('Failed to mark all payments');
        }
    };

    const openEditMember = (member) => {
        setEditMember(member);
        form.setFieldsValue({ memberName: member.memberName, phone: member.phone });
        setMemberModal(true);
    };

    const openAddMember = () => {
        setEditMember(null);
        form.resetFields();
        setMemberModal(true);
    };

    const monthOptions = () => {
        if (!chit) return [];
        const start = new Date(chit.startDate);
        const end = new Date(chit.endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12
            + (end.getMonth() - start.getMonth());
        return Array.from({ length: months }, (_, i) => ({
            label: `Month ${i + 1} — ${new Date(
                start.getFullYear(),
                start.getMonth() + i,
                chit.chitDate
            ).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            value: i + 1
        }));
    };

    const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const memberColumns = [
        {
            title: '#',
            width: 56,
            render: (_, __, index) => (
                <Avatar
                    size={32}
                    style={{ background: '#1a1a2e', fontSize: 12, fontWeight: 700 }}
                >
                    {index + 1}
                </Avatar>
            )
        },
        {
            title: 'Member',
            dataIndex: 'memberName',
            render: (name) => <Text strong style={{ fontSize: 14 }}>{name}</Text>
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            responsive: ['sm'],
            render: (phone) => <Text type="secondary">{phone || '—'}</Text>
        },
        {
            title: 'Monthly Amount',
            key: 'amount',
            render: () => {
                const perMember = getPerMemberAmount(chit);
                return (
                    <Space orientation="vertical" size={0}>
                        <Text strong style={{ fontSize: 14 }}>
                            ₹{perMember.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            incl. {chit?.commission}% commission
                        </Text>
                    </Space>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space size={6}>
                    <Tooltip title="Edit member">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditMember(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Remove member">
                        <Popconfirm
                            title="Remove this member?"
                            description="This action cannot be undone."
                            onConfirm={() => handleDeleteMember(record._id)}
                            okText="Remove"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        }
    ];

    if (loading) return (
        <div className="cd-loading">
            <Spin size="large" />
        </div>
    );

    if (!chit) return null;

    const currentMonthPayments = chit.members?.map(member => {
        const payment = member.payments?.find(p => p.month === selectedMonth);
        return { member, payment };
    }) || [];

    const paidCount = currentMonthPayments?.filter(p => p.payment?.status === 'paid')?.length;
    const pendingCount = currentMonthPayments?.filter(p => p.payment?.status === 'pending')?.length;
    const perMemberAmount = getPerMemberAmount(chit);
    const collectedAmount = paidCount * perMemberAmount;

    const chitInfoItems = [
        { label: 'Type', value: chit.chitType === 'auction' ? 'Auction' : 'Tallu' },
        { label: 'Total Amount', value: `₹${chit.chitAmount?.toLocaleString('en-IN')}` },
        { label: 'Installment', value: `₹${chit.installmentAmount?.toLocaleString('en-IN')}` },
        { label: 'Commission', value: `${chit.commission}%` },
        { label: 'Duration', value: `${chit.totalMonths} months` },
        { label: 'Collection Date', value: `${getOrdinal(chit.chitDate)} of each month` },
        { label: 'Members', value: `${chit.members?.length || 0} / ${chit.memberCount}` },
        { label: 'Start Date', value: new Date(chit.startDate).toLocaleDateString('en-IN') },
        { label: 'End Date', value: new Date(chit.endDate).toLocaleDateString('en-IN') },
    ];

    return (
        <Layout className="cd-layout">

            <Header className="cd-header">
                <div className="cd-header-brand">
                    <span className="cd-brand-mark">CS</span>
                    <span className="cd-brand-name">ChitSaaS</span>
                </div>
                <div className="cd-header-actions">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/dashboard')}
                        className="cd-btn-ghost"
                    >
                        <span className="cd-btn-label">Dashboard</span>
                    </Button>
                    <Button
                        icon={<LogoutOutlined />}
                        onClick={() => { logout(); navigate('/login'); }}
                        className="cd-btn-ghost cd-btn-danger"
                    >
                        <span className="cd-btn-label">Logout</span>
                    </Button>
                </div>
            </Header>

            <Content className="cd-content">

                {/* Chit Overview */}
                <div className="cd-page-header">
                    <div>
                        <Title level={3} className="cd-page-title">{chit.chitName}</Title>
                        <Text type="secondary" className="cd-page-subtitle">
                            Chit details and payment management
                        </Text>
                    </div>
                    <Badge
                        status="processing"
                        text={chit.chitType === 'auction' ? 'Auction' : 'Tallu'}
                        className="cd-status-badge"
                    />
                </div>

                {/* Info Grid */}
                <Card className="cd-card" bordered={false}>
                    <div className="cd-section-label">Overview</div>
                    <div className="cd-info-grid">
                        {chitInfoItems.map((item, i) => (
                            <div className="cd-info-item" key={i}>
                                <Text className="cd-info-label">{item.label}</Text>
                                <Text className="cd-info-value">{item.value}</Text>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Members */}
                <Card className="cd-card" bordered={false}>
                    <div className="cd-card-header">
                        <div className="cd-section-label">
                            <TeamOutlined className="cd-section-icon" />
                            Members &nbsp;
                            <span className="cd-count-pill">
                                {chit.members?.length || 0} / {chit.memberCount}
                            </span>
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openAddMember}
                            disabled={chit.members?.length >= chit.memberCount}
                            className="cd-btn-primary"
                        >
                            Add Member
                        </Button>
                    </div>

                    <Table
                        className="cd-table"
                        columns={memberColumns}
                        dataSource={chit.members || []}
                        rowKey="_id"
                        pagination={{ pageSize: 10, size: 'small' }}
                        scroll={{ x: 400 }}
                        size="middle"
                        locale={{ emptyText: 'No members added yet.' }}
                    />
                </Card>

                {/* Payments */}
                <Card className="cd-card" bordered={false}>
                    <div className="cd-card-header cd-card-header--wrap">
                        <div className="cd-section-label">
                            <DollarOutlined className="cd-section-icon" />
                            Payments
                        </div>
                        <div className="cd-payment-controls">
                            <Select
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                style={{ minWidth: 200 }}
                                size="middle"
                            >
                                {monthOptions().map(opt => (
                                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                                ))}
                            </Select>
                            <Button
                                icon={<CheckCircleOutlined />}
                                onClick={handleMarkAllPaid}
                                className="cd-btn-success"
                            >
                                Mark All Paid
                            </Button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <Row gutter={[12, 12]} className="cd-stats-row">
                        <Col xs={8}>
                            <div className="cd-stat cd-stat--green">
                                <span className="cd-stat-value">{paidCount}</span>
                                <span className="cd-stat-label">Paid</span>
                            </div>
                        </Col>
                        <Col xs={8}>
                            <div className="cd-stat cd-stat--amber">
                                <span className="cd-stat-value">{pendingCount}</span>
                                <span className="cd-stat-label">Pending</span>
                            </div>
                        </Col>
                        <Col xs={8}>
                            <div className="cd-stat cd-stat--blue">
                                <span className="cd-stat-value">
                                    ₹{collectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                                <span className="cd-stat-label">Collected</span>
                            </div>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* Payment List */}
                    {currentMonthPayments.length === 0
                        ? (
                            <div className="cd-empty">
                                <TeamOutlined className="cd-empty-icon" />
                                <Text type="secondary">No members added yet. Add members to track payments.</Text>
                            </div>
                        )
                        : currentMonthPayments.map(({ member, payment }, idx) => (
                            <div
                                key={member._id}
                                className={`cd-payment-row ${payment?.status === 'paid' ? 'cd-payment-row--paid' : 'cd-payment-row--pending'}`}
                            >
                                <div className="cd-payment-left">
                                    <Avatar
                                        size={32}
                                        style={{ background: '#1a1a2e', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                                    >
                                        {idx + 1}
                                    </Avatar>
                                    <div className="cd-payment-info">
                                        <Text strong style={{ fontSize: 14 }}>{member.memberName}</Text>
                                        {payment?.paidAt && (
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                                Paid on {new Date(payment.paidAt).toLocaleDateString('en-IN')}
                                            </Text>
                                        )}
                                    </div>
                                </div>

                                <div className="cd-payment-right">
                                    <Text strong style={{ fontSize: 14 }}>
                                        ₹{perMemberAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </Text>
                                    {payment
                                        ? (
                                            <Switch
                                                checked={payment.status === 'paid'}
                                                onChange={() => handleMarkPayment(member._id, payment._id)}
                                                checkedChildren="Paid"
                                                unCheckedChildren="Pending"
                                                className={payment.status === 'paid' ? 'cd-switch--paid' : 'cd-switch--pending'}
                                            />
                                        )
                                        : <Tag>No Record</Tag>
                                    }
                                </div>
                            </div>
                        ))
                    }
                </Card>

            </Content>

            {/* Add / Edit Modal */}
            <Modal
                title={editMember ? 'Edit Member' : 'Add Member'}
                open={memberModal}
                onCancel={() => { setMemberModal(false); form.resetFields(); setEditMember(null); }}
                footer={null}
                width={420}
                className="cd-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleMemberSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="memberName"
                        label="Full Name"
                        rules={[{ required: true, message: 'Member name is required' }]}
                    >
                        <Input placeholder="e.g. Anandraj" size="large" />
                    </Form.Item>

                    <Form.Item name="phone" label="Phone Number">
                        <Input placeholder="e.g. 9876543210" size="large" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            className="cd-btn-primary"
                        >
                            {editMember ? 'Save Changes' : 'Add Member'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

        </Layout>
    );
};

export default ChitDetail;