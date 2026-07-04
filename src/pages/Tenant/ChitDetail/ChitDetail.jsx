import { useState, useEffect, useMemo } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Space,
  Modal, Form, Input, Card, Row, Col,
  Popconfirm, message, Select, Switch,
  Tooltip, Avatar, Spin, Divider, InputNumber, Breadcrumb
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, LogoutOutlined, TeamOutlined,
  WalletOutlined, BankOutlined, ThunderboltOutlined,
  OrderedListOutlined, CheckCircleFilled, ClockCircleOutlined,
  CheckCircleOutlined
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

  // ===== Fetch Chit =====
  const fetchChit = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/chits/${id}`);
      setChit(data);
    } catch (err) {
      message.error('Unable to load chit details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChit(); }, [id]);

  // ===== Per Member Amount Calculation (Auction chits) =====
  const getPerMemberAmount = (chit) => {
    if (!chit) return 0;

    if (chit.chitType === 'tallu') {
      // Tallu — no fixed formula, default = installmentAmount
      return chit.installmentAmount || 0;
    }

    // Auction — (installment + commission) ÷ members
    const memberCount = chit.members?.length > 0 ? chit.members.length : 1;
    const installment = chit.installmentAmount || 0;
    const commission = chit.commission || 0;
    const commissionAmt = (installment * commission) / 100;
    const totalMonthly = installment + commissionAmt;
    return totalMonthly / memberCount;
  };

  // ===== Add / Edit Member (+ Amount for Tallu) =====
  const handleMemberSubmit = async (values) => {
    try {
      const { memberName, phone, amount } = values;

      if (editMember) {
        // 1. Update name/phone
        await API.put(`/chits/${id}/members/${editMember._id}`, { memberName, phone });

        // 2. If Tallu chit, also update this month's amount
        //    (applies to ALL members + auto-recalculates future months)
        if (chit.chitType === 'tallu' && amount !== undefined && amount !== null) {
          await API.put(
            `/chits/${id}/members/${editMember._id}/payments/month/${selectedMonth}/amount`,
            { amount }
          );
        }

        message.success('Member updated');
      } else {
        await API.post(`/chits/${id}/members`, { memberName, phone });
        message.success('Member added');
      }

      form.resetFields();
      setMemberModal(false);
      setEditMember(null);
      fetchChit();
    } catch (err) {
      message.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  // ===== Delete Member =====
  const handleDeleteMember = async (memberId) => {
    try {
      await API.delete(`/chits/${id}/members/${memberId}`);
      message.success('Member removed');
      fetchChit();
    } catch (err) {
      message.error('Delete failed. Please try again.');
    }
  };

  // ===== Mark Payment =====
  const handleMarkPayment = async (memberId, paymentId) => {
    try {
      await API.put(`/chits/${id}/members/${memberId}/payments/${paymentId}`);
      fetchChit();
    } catch (err) {
      message.error('Unable to update payment. Please try again.');
    }
  };

  // ===== Mark All Paid =====
  const handleMarkAllPaid = async () => {
    try {
      await API.put(`/chits/${id}/payments/month/${selectedMonth}/mark-all-paid`);
      message.success(`Month ${selectedMonth} — all members marked paid`);
      fetchChit();
    } catch (err) {
      message.error('Unable to update payments. Please try again.');
    }
  };

  // ===== Open Edit Member Modal =====
  const openEditMember = (member) => {
    setEditMember(member);

    // Tallu chit — prefill current selected month's amount
    const currentPayment = member.payments?.find(p => p.month === selectedMonth);

    form.setFieldsValue({
      memberName: member.memberName,
      phone: member.phone,
      amount: chit.chitType === 'tallu'
        ? (currentPayment?.amount ?? chit.installmentAmount)
        : undefined
    });
    setMemberModal(true);
  };

  // ===== Open Add Member Modal =====
  const openAddMember = () => {
    setEditMember(null);
    form.resetFields();
    setMemberModal(true);
  };

  // ===== Month Options =====
  const monthOptions = () => {
    if (!chit) return [];
    const start = new Date(chit.startDate);
    const totalMonths = chit.totalMonths || 0;
    return Array.from({ length: totalMonths }, (_, i) => ({
      label: `Month ${i + 1} · ${new Date(
        start.getFullYear(),
        start.getMonth() + i,
        chit.chitDate
      ).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      value: i + 1
    }));
  };

  const currency = (amt) => `₹${(amt ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // ===== Members Table Columns =====
  const memberColumns = [
    {
      title: '#',
      width: 52,
      render: (_, __, index) => (
        <Avatar size="small" className="member-index-avatar">
          {index + 1}
        </Avatar>
      )
    },
    {
      title: 'Member Name',
      dataIndex: 'memberName',
      render: (name) => <Text strong className="member-name-text">{name}</Text>
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (phone) => <Text type="secondary">{phone || '—'}</Text>
    },
    {
      title: 'Monthly Amount',
      key: 'amount',
      align: 'right',
      render: (_, record) => {
        if (chit?.chitType === 'tallu') {
          // Tallu — show this member's actual amount for the selected month
          const payment = record.payments?.find(p => p.month === selectedMonth);
          const amt = payment?.amount ?? chit.installmentAmount;
          return <Text strong className="amount-secondary">{currency(amt)}</Text>;
        }

        // Auction — generic formula
        const perMember = getPerMemberAmount(chit);
        return (
          <Space direction="vertical" size={0} align="end">
            <Text strong className="amount-secondary">{currency(perMember)}</Text>
            <Text className="amount-footnote">incl. {chit?.commission}% commission</Text>
          </Space>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit member">
            <Button size="small" type="text"
              icon={<EditOutlined />}
              className="row-action-btn"
              onClick={() => openEditMember(record)}
            />
          </Tooltip>
          <Tooltip title="Remove member">
            <Popconfirm
              title="Remove this member?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteMember(record._id)}
              okText="Remove" cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="text"
                icon={<DeleteOutlined />}
                className="row-action-btn"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // ===== Loading =====
  if (loading) return (
    <div className="cd-loading-screen">
      <Spin size="large" />
    </div>
  );

  if (!chit) return null;

  // ===== Current Month Payments =====
  const currentMonthPayments = chit.members?.map(member => {
    const payment = member.payments?.find(p => p.month === selectedMonth);
    return { member, payment };
  }) || [];

  const paidCount = currentMonthPayments.filter(p => p.payment?.status === 'paid').length;
  const pendingCount = currentMonthPayments.filter(p => p.payment?.status === 'pending').length;

  // Collected amount — sums each member's actual payment amount (works for both types)
  const collectedAmount = currentMonthPayments.reduce((sum, { payment }) => {
    return payment?.status === 'paid' ? sum + (payment.amount || 0) : sum;
  }, 0);

  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <Layout className="cd-layout">

      {/* Header */}
      <Header className="cd-header">
        <div className="cd-header-left">
          <div className="cd-logo">
            <BankOutlined />
          </div>
          <div className="tenant-header-titles">
            <Text className="tenant-header-subtitle">Chit Fund Management</Text>
          </div>        </div>
        <div className="cd-header-right">
          <Button className="cd-back-btn"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            <span className="cd-btn-label">Back to Dashboard</span>
          </Button>
          <Button className="cd-logout-btn"
            icon={<LogoutOutlined />}
            size="middle"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <span className="cd-btn-label">Log out</span>
          </Button>
        </div>
      </Header>

      <Content className="cd-content">

        {/* Chit Info Card */}
        <Card className="cd-info-card" bordered={false}>
          <div className="cd-info-header">
            <div>
              <Title className="cd-info-title">{chit.chitName}</Title>
              <Tag className={`chit-type-tag ${chit.chitType}`} bordered={false}>
                {chit.chitType === 'auction'
                  ? <><ThunderboltOutlined /> Auction</>
                  : <><OrderedListOutlined /> Tallu</>}
              </Tag>
            </div>
          </div>
          <Divider className="cd-info-divider" />
          <div className="cd-info-grid">
            {[
              { label: 'Total Amount', value: currency(chit.chitAmount) },
              { label: 'Installment', value: currency(chit.installmentAmount) },
              { label: 'Commission', value: `${chit.commission}%` },
              { label: 'Total Months', value: `${chit.totalMonths} months` },
              { label: 'Chit Date', value: `${getOrdinal(chit.chitDate)} of every month` },
              { label: 'Members', value: `${chit.members?.length || 0} / ${chit.memberCount}` },
              { label: 'Start Date', value: new Date(chit.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
              { label: 'End Date', value: new Date(chit.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map((item, i) => (
              <div className="cd-info-item" key={i}>
                <Text className="cd-info-label">{item.label}</Text>
                <Text className="cd-info-value">{item.value}</Text>
              </div>
            ))}
          </div>
        </Card>

        {/* Members Table */}
        <Card className="cd-members-card" bordered={false}>
          <div className="cd-card-header">
            <Title className="cd-card-title">
              <TeamOutlined className="cd-card-title-icon" />
              Members
              <span className="cd-card-title-count">{chit.members?.length || 0} / {chit.memberCount}</span>
            </Title>
            <Button type="primary"
              icon={<PlusOutlined />}
              className="cd-add-btn"
              onClick={openAddMember}
              disabled={chit.members?.length >= chit.memberCount}
            >
              Add Member
            </Button>
          </div>

          <Table
            className="cd-table"
            columns={memberColumns}
            dataSource={chit.members || []}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 640 }}
          />
        </Card>

        {/* Payments Section */}
        <Card className="cd-payments-card" bordered={false}>
          <div className="cd-card-header">
            <Title className="cd-card-title">
              <WalletOutlined className="cd-card-title-icon" />
              Payments
            </Title>
            <Space wrap>
              <Select
                className="cd-month-select"
                value={selectedMonth}
                onChange={setSelectedMonth}
              >
                {monthOptions().map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
              <Button
                className="mark-all-btn"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleMarkAllPaid}
              >
                Mark All Paid
              </Button>
            </Space>
          </div>

          {/* Payment Stats */}
          <Row gutter={16} className="cd-payment-stats">
            <Col xs={24} sm={8}>
              <div className="cd-stat-box paid">
                <Text className="cd-stat-box-value">{paidCount}</Text>
                <Text className="cd-stat-box-label"><CheckCircleFilled /> Paid</Text>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="cd-stat-box pending">
                <Text className="cd-stat-box-value">{pendingCount}</Text>
                <Text className="cd-stat-box-label"><ClockCircleOutlined /> Pending</Text>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="cd-stat-box collected">
                <Text className="cd-stat-box-value">{currency(collectedAmount)}</Text>
                <Text className="cd-stat-box-label"><WalletOutlined /> Collected</Text>
              </div>
            </Col>
          </Row>

          <Divider className="cd-payments-divider" />

          {/* Payment Rows */}
          {currentMonthPayments.length === 0
            ? <Text type="secondary" className="cd-empty-text">No members yet. Add members to start collecting payments.</Text>
            : currentMonthPayments.map(({ member, payment }, idx) => (
              <div
                key={member._id}
                className={`payment-row ${payment?.status || 'pending'}`}
              >
                <Space>
                  <Avatar size="small" className="member-index-avatar">
                    {idx + 1}
                  </Avatar>
                  <div>
                    <Text className="payment-member-name">{member.memberName}</Text>
                    {payment?.paidAt && (
                      <Text className="payment-date">
                        Paid on {new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                  </div>
                </Space>

                <Space size={12}>
                  <Text className="payment-amount">
                    {currency(payment?.amount ?? getPerMemberAmount(chit))}
                  </Text>
                  {payment
                    ? <Switch
                      checked={payment.status === 'paid'}
                      onChange={() => handleMarkPayment(member._id, payment._id)}
                      checkedChildren="Paid"
                      unCheckedChildren="Pending"
                      className={payment.status === 'paid' ? 'switch-paid' : 'switch-pending'}
                    />
                    : <Tag className="tag-no-payment" bordered={false}>No payment</Tag>
                  }
                </Space>
              </div>
            ))
          }
        </Card>

      </Content>

      {/* Add / Edit Member Modal */}
      <Modal
        title={editMember ? 'Edit Member' : 'Add Member'}
        open={memberModal}
        onCancel={() => { setMemberModal(false); form.resetFields(); setEditMember(null); }}
        footer={null}
        className="cd-modal"
        width={460}
      >
        <Text className="cd-modal-subtitle">
          {editMember ? 'Update this member\'s details.' : `Add a new member to ${chit.chitName}.`}
        </Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleMemberSubmit}
          className="cd-modal-form"
        >
          <Form.Item name="memberName" label="Member Name"
            rules={[{ required: true, message: 'Member name is required' }]}>
            <Input placeholder="e.g. Anandraj" />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="e.g. 9876543210" />
          </Form.Item>

          {/* Amount field — only when editing a Tallu chit member */}
          {editMember && chit?.chitType === 'tallu' && (
            <Form.Item
              name="amount"
              label={`Month ${selectedMonth} Amount (₹)`}
              extra="Applies to all members and automatically recalculates future months."
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v.replace(/₹\s?|(,*)/g, '')}
              />
            </Form.Item>
          )}

          <Space className="cd-modal-footer">
            <Button
              onClick={() => { setMemberModal(false); form.resetFields(); setEditMember(null); }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" className="cd-modal-submit-btn">
              {editMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </Space>
        </Form>
      </Modal>

    </Layout>
  );
};

export default ChitDetail;