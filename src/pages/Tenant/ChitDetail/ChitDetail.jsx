import { useState, useEffect } from 'react';
import {
  Typography, Button, Table, Tag, Space, Card, Row, Col,
  Popconfirm, message, Select, Tooltip, Avatar, Spin, Divider, Checkbox, Grid
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, TeamOutlined,
  WalletOutlined, ThunderboltOutlined,
  OrderedListOutlined, CheckCircleFilled, ClockCircleOutlined,
  CheckCircleOutlined, StarFilled, UserOutlined, EyeOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../../api/axios';
import MemberFormModal from './Memberformmodal';
import MemberViewModal from './Memberviewmodal';
import './ChitDetail.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const ChitDetail = () => {
  const [chit, setChit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberModal, setMemberModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  const getPerMemberAmount = (chit) => {
    if (!chit) return 0;
    if (chit.chitType === 'tallu') return chit.installmentAmount || 0;
    const memberCount = chit.members?.length > 0 ? chit.members.length : 1;
    const installment = chit.installmentAmount || 0;
    const commission = chit.commission || 0;
    const commissionAmt = (installment * commission) / 100;
    const totalMonthly = installment + commissionAmt;
    return totalMonthly / memberCount;
  };

  const handleDeleteMember = async (memberId) => {
    try {
      await API.delete(`/chits/${id}/members/${memberId}`);
      message.success('Member removed');
      fetchChit();
    } catch (err) {
      message.error('Delete failed. Please try again.');
    }
  };

  const handleMarkPayment = async (memberId, paymentId) => {
    try {
      await API.put(`/chits/${id}/members/${memberId}/payments/${paymentId}`);
      fetchChit();
    } catch (err) {
      message.error('Unable to update payment. Please try again.');
    }
  };

  const handleMarkAllPaid = async () => {
    try {
      await API.put(`/chits/${id}/payments/month/${selectedMonth}/mark-all-paid`);
      message.success(`Month ${selectedMonth} — all members marked paid`);
      fetchChit();
    } catch (err) {
      message.error('Unable to update payments. Please try again.');
    }
  };

  const openEditMember = (member) => {
    setEditMember(member);
    setMemberModal(true);
  };

  const openAddMember = () => {
    setEditMember(null);
    setMemberModal(true);
  };

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

  const getPrizedAmount = (month) => {
    if (!chit?.members) return 0;
    return chit.members.reduce((sum, m) => {
      const payment = m.payments?.find(p => p.month === month);
      return sum + (payment?.amount || 0);
    }, 0);
  };

  const memberColumns = [
    {
      title: '#',
      width: 52,
      render: (_, record, index) => (
        <Avatar size={60} src={record.photo?.url || undefined} className="member-index-avatar">
          {!record.photo?.url && (index + 1)}
        </Avatar>
      )
    },
    {
      title: 'Member Name',
      dataIndex: 'memberName',
      render: (name, record) => {
        const isPrized = record.prizedMonth?.includes(selectedMonth);
        return (
          <Space orientation="vertical" size={0}>
            <Text
              strong
              className="member-name-text"
              style={isPrized ? { color: '#ffffff' } : {}}
            >
              {name}
            </Text>
            <Text
              type="secondary"
              className="member-phone-inline"
              style={isPrized ? { color: 'rgba(255,255,255,0.75)' } : {}}
            >
              {record.phone || '—'}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Prized Month',
      key: 'prizedMonth',
      align: 'center',
      width: 140,
      render: (_, record) => {
        if (record.prizedMonth?.includes(selectedMonth)) {
          return <Tag color="gold" variant="filled">★ This Month</Tag>;
        }
        if (!record.prizedMonth || record.prizedMonth.length === 0) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Space size={4} wrap>
            {record.prizedMonth.slice().sort((a, b) => a - b).map(m => (
              <Tag key={m} variant="filled">M{m}</Tag>
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
        const isPrized = record.prizedMonth?.includes(selectedMonth);
        if (chit?.chitType === 'tallu') {
          const amt = payment?.amount ?? chit.installmentAmount;
          return <Text strong className="amount-secondary" style={isPrized ? { color: '#ffffff' } : {}}>{currency(amt)}</Text>;
        }
        const perMember = getPerMemberAmount(chit);
        return (
          <Space orientation="vertical" size={0} align="end">
            <Text strong className="amount-secondary" style={isPrized ? { color: '#ffffff' } : {}}>{currency(payment?.amount ?? perMember)}</Text>
            <Text className="amount-footnote" style={isPrized ? { color: 'rgba(255,255,255,0.7)' } : {}}>incl. {chit?.commission}% commission</Text>
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
        if (!payment) return <Tag className="tag-no-payment" variant="filled">No payment</Tag>;
        return (
          <Space orientation="vertical" size={2} align="center">
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
      width: 130,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View member details">
            <Button size="small" type="text"
              icon={<EyeOutlined />}
              className="row-action-btn"
              onClick={() => setViewMember(record)}
            />
          </Tooltip>
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
         <Space className="member-left">
  <Avatar
    size={60}
    src={record.photo?.url || undefined}
    className="member-index-avatar"
  >
    {!record.photo?.url && (index + 1)}
  </Avatar>

  <div className="member-info">
    <Text
      strong
      className="member-name-text"
      style={{ color: isPrizedThisMonth ? '#ffffff' : undefined }}
    >
      {record.memberName}
    </Text>

    <Text
      type="secondary"
      className="member-phone-inline"
      style={{ color: isPrizedThisMonth ? 'rgba(255,255,255,0.75)' : undefined }}
    >
      {record.phone || '—'}
    </Text>
  </div>
</Space>
          <Space size={4}>
            <Tooltip title="View member details">
              <Button size="small" shape="circle" icon={<EyeOutlined />} onClick={() => setViewMember(record)} />
            </Tooltip>
            <Tooltip title="Edit member">
              <Button size="small" shape="circle" icon={<EditOutlined />} onClick={() => openEditMember(record)} />
            </Tooltip>
            <Popconfirm
              title="Remove this member?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteMember(record._id)}
              okText="Remove" cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger shape="circle" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </div>

        <div className="mmc-row">
          <Text type="secondary" style={{ color: isPrizedThisMonth ? 'rgba(255,255,255,0.75)' : undefined }}>Month {selectedMonth} Amount</Text>
          <Text strong style={{ color: isPrizedThisMonth ? '#ffffff' : undefined }}>{currency(amt)}</Text>
        </div>

        {isPrizedThisMonth ? (
          <div className="mmc-row">
            <Text type="secondary" style={{ color: 'rgba(255,255,255,0.75)' }}>Prized Month</Text>
            <Tag color="gold" variant="filled">★ This Month</Tag>
          </div>
        ) : record.prizedMonth?.length > 0 && (
          <div className="mmc-row">
            <Text type="secondary">Prized Month</Text>
            <Space size={4} wrap>
              {record.prizedMonth.slice().sort((a, b) => a - b).map(m => (
                <Tag key={m} variant="filled">M{m}</Tag>
              ))}
            </Space>
          </div>
        )}

        <div className="mmc-row">
          <Text type="secondary" style={{ color: isPrizedThisMonth ? 'rgba(255,255,255,0.75)' : undefined }}>Payment Status</Text>
          {payment ? (
            <Checkbox
              checked={payment.status === 'paid'}
              onChange={() => handleMarkPayment(record._id, payment._id)}
            >
              <span style={{ color: isPrizedThisMonth ? '#ffffff' : undefined }}>
                {payment.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </Checkbox>
          ) : (
            <Tag className="tag-no-payment" variant="filled">No payment</Tag>
          )}
        </div>

        {payment?.paidAt && (
          <div className="mmc-row">
            <Text type="secondary" style={{ color: isPrizedThisMonth ? 'rgba(255,255,255,0.75)' : undefined }}>Paid On</Text>
            <Text className="payment-date" style={{ color: isPrizedThisMonth ? '#ffffff' : undefined }}>
              {new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="cd-loading-screen">
      <Spin size="large" />
    </div>
  );

  if (!chit) return null;

  const currentMonthPayments = chit.members?.map(member => {
    const payment = member.payments?.find(p => p.month === selectedMonth);
    return { member, payment };
  }) || [];

  const paidCount = currentMonthPayments.filter(p => p.payment?.status === 'paid').length;
  const pendingCount = currentMonthPayments.filter(p => p.payment?.status === 'pending').length;

  const collectedAmount = currentMonthPayments.reduce((sum, { payment }) => {
    return payment?.status === 'paid' ? sum + (payment.amount || 0) : sum;
  }, 0);

  const prizedMember = getPrizedMemberForMonth(selectedMonth);

  return (
    <div className="cd-content">

      <Button
        className="cd-back-btn"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/chit')}
        style={{ marginBottom: 16 }}
      >
        Back
      </Button>

      <Card className="cd-info-card" variant="filled">
        <div className="cd-info-header">
          <div className="cd-info-title-row">
            <Title className="cd-info-title">{chit?.chitName}</Title>
            <Tag className={`chit-type-tag ${chit?.chitType}`} variant="filled">
              {chit?.chitType === 'auction'
                ? <><ThunderboltOutlined /> Auction</>
                : <><OrderedListOutlined /> Tallu</>}
            </Tag>
          </div>
        </div>
        <Divider className="cd-info-divider" />
        <div className="cd-info-grid">
          {[
            { label: 'Total Amount', value: currency(chit?.chitAmount) },
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

      {prizedMember && (
        <div className="prized-spotlight">
          <Avatar
            size={60}
            src={prizedMember.photo?.url || undefined}
            className="prized-spotlight-avatar"
          >
            {!prizedMember.photo?.url && <UserOutlined />}
          </Avatar>
          <div className="prized-spotlight-info">
            <div className="prized-spotlight-tag">
              <StarFilled /> Prized this month
            </div>
            <div className="prized-spotlight-name">{prizedMember.memberName}</div>
            <div className="prized-spotlight-meta">
              {getOrdinal(selectedMonth)} Month{prizedMember.phone ? ` · ${prizedMember.phone}` : ''}
            </div>
          </div>
          <div className="prized-spotlight-amount">
            <div className="prized-spotlight-amount-label">Received</div>
            <div className="prized-spotlight-amount-value">{currency(getPrizedAmount(selectedMonth))}</div>
          </div>
        </div>
      )}

      <Card className="cd-members-card" variant="filled">
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

        <Row gutter={[12, 12]} className="cd-payment-stats">
          <Col xs={24} sm={8} style={{ paddingInline: '0px' }}>
            <div className="cd-stat-box paid">
              <Text className="cd-stat-box-value">{paidCount}</Text>
              <Text className="cd-stat-box-label"><CheckCircleFilled /> Paid</Text>
            </div>
          </Col>
          <Col xs={24} sm={8} style={{ paddingInline: '0px' }}>
            <div className="cd-stat-box pending">
              <Text className="cd-stat-box-value">{pendingCount}</Text>
              <Text className="cd-stat-box-label"><ClockCircleOutlined /> Pending</Text>
            </div>
          </Col>
          <Col xs={24} sm={8} style={{ paddingInline: '0px' }}>
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

      <MemberFormModal
        open={memberModal}
        onClose={() => setMemberModal(false)}
        onSaved={fetchChit}
        chit={chit}
        chitId={id}
        editMember={editMember}
        selectedMonth={selectedMonth}
        isMobile={isMobile}
      />

      <MemberViewModal
        open={!!viewMember}
        onClose={() => setViewMember(null)}
        member={viewMember}
        chit={chit}
        isMobile={isMobile}
      />

    </div>
  );
};

export default ChitDetail;