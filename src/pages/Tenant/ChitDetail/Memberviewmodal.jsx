import { Modal, Avatar, Typography, Table, Tag, Divider } from 'antd';
import { UserOutlined, PhoneOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const currency = (amt) => `₹${(amt ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const MemberViewModal = ({ open, onClose, member, chit, isMobile }) => {
  if (!member) return null;

  const payments = (member.payments || []).slice().sort((a, b) => a.month - b.month);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const columns = [
    { title: 'Month', dataIndex: 'month', width: 64, render: (m) => `M${m}` },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      width: 110,
      render: (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 100, render: (a) => currency(a) },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      width: 90,
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : 'gold'} bordered={false}>
          {status === 'paid' ? 'Paid' : 'Pending'}
        </Tag>
      ),
    },
    {
      title: 'Paid On',
      dataIndex: 'paidAt',
      width: 90,
      render: (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
    },
  ];

  return (
    <Modal
      title="Member Chit Details"
      open={open}
      onCancel={onClose}
      footer={null}
      className="cd-modal"
      width={isMobile ? '94%' : 600}
    >
      <div className="mv-header">
        <Avatar
          size={64}
          src={member.photo?.url || undefined}
          className="mv-avatar"
        >
          {!member.photo?.url && <UserOutlined />}
        </Avatar>
        <div className="mv-header-info">
          <Title level={4} className="mv-name">{member.memberName}</Title>
          <Text type="secondary" className="mv-phone">
            <PhoneOutlined style={{ marginRight: 6 }} />
            {member.phone || 'No phone number'}
          </Text>
          {member.prizedMonth?.length > 0 && (
            <div className="mv-prized-tags">
              {member.prizedMonth.slice().sort((a, b) => a - b).map((m) => (
                <Tag key={m} color="gold" bordered={false}>★ Month {m}</Tag>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mv-summary">
        <div className="mv-summary-item">
          <Text className="mv-summary-label">Total Months</Text>
          <Text className="mv-summary-value">{chit?.totalMonths || payments.length}</Text>
        </div>
        <div className="mv-summary-item">
          <Text className="mv-summary-label">Paid</Text>
          <Text className="mv-summary-value mv-summary-paid">{currency(totalPaid)}</Text>
        </div>
        <div className="mv-summary-item">
          <Text className="mv-summary-label">Pending</Text>
          <Text className="mv-summary-value mv-summary-pending">{currency(totalPending)}</Text>
        </div>
      </div>

      <Divider style={{ margin: '4px 0 16px' }} />

      <Table
        size="small"
        pagination={false}
        rowKey="_id"
        dataSource={payments}
        columns={columns}
        scroll={{ x: 460, y: 320 }}
        rowClassName={(record) => record.status === 'paid' ? 'mv-row-paid' : ''}
      />
    </Modal>
  );
};

export default MemberViewModal;