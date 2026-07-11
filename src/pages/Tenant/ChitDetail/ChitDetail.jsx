import { useState, useEffect, useMemo } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Space,
  Modal, Form, Input, Card, Row, Col,
  Popconfirm, message, Select,
  Tooltip, Avatar, Spin, Divider, InputNumber, Breadcrumb, Checkbox, Grid
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
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
      return chit.installmentAmount || 0;
    }

    const memberCount = chit.members?.length > 0 ? chit.members.length : 1;
    const installment = chit.installmentAmount || 0;
    const commission = chit.commission || 0;
    const commissionAmt = (installment * commission) / 100;
    const totalMonthly = installment + commissionAmt;
    return totalMonthly / memberCount;
  };

  // ===== Add / Edit Member (+ Amount + Prized Month for Tallu) =====
  const handleMemberSubmit = async (values) => {
    try {
      const { memberName, phone, amount, isPrizedMonth } = values;

      if (editMember) {
        const wasAlreadyPrized = editMember.prizedMonth?.includes(selectedMonth) || false;
        const prizedChanged = !!isPrizedMonth !== wasAlreadyPrized;

        await API.put(`/chits/${id}/members/${editMember._id}`, {
          memberName,
          phone,
          ...(prizedChanged && { month: selectedMonth, prized: !!isPrizedMonth })
        });

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

    const currentPayment = member.payments?.find(p => p.month === selectedMonth);

    form.setFieldsValue({
      memberName: member.memberName,
      phone: member.phone,
      amount: chit.chitType === 'tallu'
        ? (currentPayment?.amount ?? chit.installmentAmount)
        : undefined,
      isPrizedMonth: member.prizedMonth?.includes(selectedMonth) || false
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

  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

const getPrizedMemberForMonth = (month, excludeMemberId = null) => {
  return chit?.members?.find(
    m => Array.isArray(m.prizedMonth) && m.prizedMonth.includes(month) && m._id !== excludeMemberId
  );
};

  // ===== Unified Member + Payment Table Columns =====
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
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text
            strong
            className="member-name-text"
            style={record.prizedMonth?.includes(selectedMonth) ? { color: '#05ce5e' } : {}}
          >
            {name}
          </Text>
          <Text type="secondary" className="member-phone-inline">{record.phone || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Prized Month',
      key: 'prizedMonth',
      align: 'center',
      width: 140,
      render: (_, record) => {
        if (record.prizedMonth?.includes(selectedMonth)) {
          return <Tag color="gold" bordered={false}>★ This Month</Tag>;
        }
        if (!record.prizedMonth || record.prizedMonth.length === 0) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Space size={4} wrap>
            {record.prizedMonth.slice().sort((a, b) => a - b).map(m => (
              <Tag key={m} bordered={false}>M{m}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: `Month ${selectedMonth} Amount`,
      key: 'amount',
      align: 'right',
      render: (_, record) => {
        const payment = record.payments?.find(p => p.month === selectedMonth);
        if (chit?.chitType === 'tallu') {
          const amt = payment?.amount ?? chit.installmentAmount;
          return <Text strong className="amount-secondary">{currency(amt)}</Text>;
        }
        const perMember = getPerMemberAmount(chit);
        return (
          <Space direction="vertical" size={0} align="end">
            <Text strong className="amount-secondary">{currency(payment?.amount ?? perMember)}</Text>
            <Text className="amount-footnote">incl. {chit?.commission}% commission</Text>
          </Space>
        );
      }
    },
    {
      title: 'Payment Status',
      key: 'paymentStatus',
      align: 'center',
      width: 150,
      render: (_, record) => {
        const payment = record.payments?.find(p => p.month === selectedMonth);
        if (!payment) return <Tag className="tag-no-payment" bordered={false}>No payment</Tag>;
        return (
          <Space direction="vertical" size={2} align="center">
            <Checkbox
              checked={payment.status === 'paid'}
              onChange={() => handleMarkPayment(record._id, payment._id)}
              className={payment.status === 'paid' ? 'checkbox-paid' : 'checkbox-pending'}
            >
              {payment.status === 'paid' ? 'Paid' : 'Pending'}
            </Checkbox>
            {payment.paidAt && (
              <Text className="payment-date">
                {new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </Text>
            )}
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

  // ===== Mobile Member Card Renderer =====
  const renderMobileMemberCard = (record, index) => {
    const payment = record.payments?.find(p => p.month === selectedMonth);
    const isPrizedThisMonth = record.prizedMonth?.includes(selectedMonth);
    const amt = chit?.chitType === 'tallu'
      ? (payment?.amount ?? chit.installmentAmount)
      : (payment?.amount ?? getPerMemberAmount(chit));

    return (
      <div
        key={record._id}
        className={`mobile-member-card ${isPrizedThisMonth ? 'prized' : ''}`}
      >
        <div className="mmc-top">
          <Space>
            <Avatar size="small" className="member-index-avatar">{index + 1}</Avatar>
            <div>
              <Text strong className="member-name-text" style={isPrizedThisMonth ? { color: '#05ce5e' } : {}}>
                {record.memberName}
              </Text>
              <div>
                <Text type="secondary" className="member-phone-inline">{record.phone || '—'}</Text>
              </div>
            </div>
          </Space>
          <Space size={4}>
            <Tooltip title="Edit member">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditMember(record)} />
            </Tooltip>
            <Popconfirm
              title="Remove this member?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteMember(record._id)}
              okText="Remove" cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </div>

        <Divider className="mmc-divider" />

        <div className="mmc-row">
          <Text type="secondary">Month {selectedMonth} Amount</Text>
          <Text strong>{currency(amt)}</Text>
        </div>

        {isPrizedThisMonth ? (
          <div className="mmc-row">
            <Text type="secondary">Prized Month</Text>
            <Tag color="gold" bordered={false}>★ This Month</Tag>
          </div>
        ) : record.prizedMonth?.length > 0 && (
          <div className="mmc-row">
            <Text type="secondary">Prized Month</Text>
            <Space size={4} wrap>
              {record.prizedMonth.slice().sort((a, b) => a - b).map(m => (
                <Tag key={m} bordered={false}>M{m}</Tag>
              ))}
            </Space>
          </div>
        )}

        <div className="mmc-row">
          <Text type="secondary">Payment Status</Text>
          {payment ? (
            <Checkbox
              checked={payment.status === 'paid'}
              onChange={() => handleMarkPayment(record._id, payment._id)}
            >
              {payment.status === 'paid' ? 'Paid' : 'Pending'}
            </Checkbox>
          ) : (
            <Tag className="tag-no-payment" bordered={false}>No payment</Tag>
          )}
        </div>

        {payment?.paidAt && (
          <div className="mmc-row">
            <Text type="secondary">Paid On</Text>
            <Text className="payment-date">
              {new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </div>
        )}
      </div>
    );
  };

  // ===== Loading =====
  if (loading) return (
    <div className="cd-loading-screen">
      <Spin size="large" />
    </div>
  );

  if (!chit) return null;

  // ===== Current Month Payments (for stats) =====
  const currentMonthPayments = chit.members?.map(member => {
    const payment = member.payments?.find(p => p.month === selectedMonth);
    return { member, payment };
  }) || [];

  const paidCount = currentMonthPayments.filter(p => p.payment?.status === 'paid').length;
  const pendingCount = currentMonthPayments.filter(p => p.payment?.status === 'pending').length;

  const collectedAmount = currentMonthPayments.reduce((sum, { payment }) => {
    return payment?.status === 'paid' ? sum + (payment.amount || 0) : sum;
  }, 0);

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
          </div>
        </div>
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
            <div className="cd-info-title-row">
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

        {/* Members & Payments — Unified Table */}
        <Card className="cd-members-card" bordered={false}>
          <div className={`cd-card-header ${isMobile ? 'cd-card-header-mobile' : ''}`}>
            <Title className="cd-card-title">
              <TeamOutlined className="cd-card-title-icon" />
              Members
              <span className="cd-card-title-count">{chit?.members?.length || 0} / {chit.memberCount}</span>
              <span className="cd-card-title-month">· {getOrdinal(selectedMonth)} Month</span>
            </Title>

            <Space wrap className="cd-header-actions">

              <Button type="primary"
                icon={<PlusOutlined />}
                className="cd-add-btn"
                onClick={openAddMember}
                disabled={chit.members?.length >= chit.memberCount}
              >
                Add Member
              </Button>
            </Space>
          </div>

          {/* Payment Stats */}
          <Row gutter={[12, 12]} className="cd-payment-stats">
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

          <div className="cd-month-actions-row">
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
              {isMobile ? 'Mark All' : 'Mark All Paid'}
            </Button>
          </div>

          {/* <Divider className="cd-payments-divider" /> */}

          {isMobile ? (
            <div className="mobile-member-list">
              {(chit.members || []).length === 0
                ? <Text type="secondary" className="cd-empty-text">No members yet. Add members to start collecting payments.</Text>
                : chit.members.map((record, index) => renderMobileMemberCard(record, index))
              }
            </div>
          ) : (
            <Table
              className="cd-table"
              columns={memberColumns}
              dataSource={chit.members || []}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 760 }}
              rowClassName={(record) =>
                record.prizedMonth?.includes(selectedMonth) ? 'prized-row' : ''
              }
            />
          )}
        </Card>

      </Content>

      {/* Add / Edit Member Modal */}
      <Modal
        title={editMember ? 'Edit Member' : 'Add Member'}
        open={memberModal}
        onCancel={() => { setMemberModal(false); form.resetFields(); setEditMember(null); }}
        footer={null}
        className="cd-modal"
        width={isMobile ? '92%' : 460}
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

          {editMember && chit?.chitType === 'tallu' && (
            <>
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

              {(() => {
                const takenBy = getPrizedMemberForMonth(selectedMonth, editMember._id);

                if (takenBy) {
                  return (
                    <Form.Item label="Prized Month">
                      <Text type="secondary">
                        Month {selectedMonth} is already prized by <strong>{takenBy.memberName}</strong>.
                      </Text>
                    </Form.Item>
                  );
                }

                return (
                  <Form.Item
                    name="isPrizedMonth"
                    valuePropName="checked"
                    extra={`Mark this member as prized for Month ${selectedMonth}.`}
                  >
                    <Checkbox>Prized Month</Checkbox>
                  </Form.Item>
                );
              })()}
            </>
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