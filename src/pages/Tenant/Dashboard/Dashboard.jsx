import { useState, useEffect, useMemo } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Space,
  Modal, Form, Input, Select, Card, Row, Col,
  Popconfirm, message, DatePicker, InputNumber,
  Tooltip, Avatar, Breadcrumb, Divider, Upload
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  LogoutOutlined, FileTextOutlined, TeamOutlined,
  BankOutlined, CheckCircleFilled, FlagFilled,
  ThunderboltOutlined, OrderedListOutlined,
  SearchOutlined, ArrowUpOutlined, CalendarOutlined,
  CameraOutlined, UserOutlined, MailOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import { updateProfile } from '../../../api/user';
import dayjs from 'dayjs';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editChit, setEditChit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm] = Form.useForm();
  const [form] = Form.useForm();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  // Track viewport for mobile card layout
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Fetch Chits
  const fetchChits = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/chits');
      setChits(data);
    } catch (err) {
      message.error('Unable to load chits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChits(); }, []);

  // Stats
  const stats = useMemo(() => {
    const totalValue = chits.reduce((sum, c) => sum + (c.chitAmount || 0), 0);
    return {
      total: chits.length,
      active: chits.filter(c => c.status === 'active').length,
      completed: chits.filter(c => c.status === 'completed').length,
      totalValue,
    };
  }, [chits]);

  const filteredChits = useMemo(() => {
    if (!searchTerm.trim()) return chits;
    const q = searchTerm.trim().toLowerCase();
    return chits.filter(c => c.chitName?.toLowerCase().includes(q));
  }, [chits, searchTerm]);

  // Open Add Modal
  const openAddModal = () => {
    setEditChit(null);
    form.resetFields();
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (chit, e) => {
    e.stopPropagation();
    setEditChit(chit);
    form.setFieldsValue({
      ...chit,
      startDate: dayjs(chit.startDate),
      endDate: dayjs(chit.endDate),
    });
    setModalOpen(true);
  };

  // Submit (Create or Update)
  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };

      if (editChit) {
        await API.put(`/chits/${editChit._id}`, payload);
        message.success('Chit updated');
      } else {
        await API.post('/chits', payload);
        message.success('Chit created');
      }

      form.resetFields();
      setModalOpen(false);
      setEditChit(null);
      fetchChits();
    } catch (err) {
      message.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  // Delete
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/chits/${id}`);
      message.success('Chit deleted');
      fetchChits();
    } catch (err) {
      message.error('Delete failed. Please try again.');
    }
  };

  // Row Click → ChitDetail
  const handleRowClick = (record) => {
    navigate(`/chit/${record._id}`);
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Profile Modal — open
  const openProfileModal = () => {
    setAvatarPreview(user?.profilePicture?.url || null);
    setAvatarFile(null);
    profileForm.setFieldsValue({ name: user?.name, email: user?.email });
    setProfileModalOpen(true);
  };

  // Profile picture preview — local preview only, file kept for upload on Save
  const handlePreviewSelect = (file) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    return false; // prevent antd auto-upload
  };


  const handleProfileSave = async (values) => {
    try {
      setProfileSaving(true);
      const data = await updateProfile({
        name: values.name,
        email: values.email,
        imageFile: avatarFile,
      });
      console.log(data, "Data")
      updateUser(data.user);
      message.success('Profile updated');
      setProfileModalOpen(false);
    } catch (err) {
      message.error(err.response?.data?.message || 'Unable to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const currency = (amt) => `₹${(amt ?? 0).toLocaleString('en-IN')}`;

  // Columns
  const columns = [
    {
      title: 'Chit Name',
      key: 'chitName',
      fixed: 'left',
      width: 200,
      render: (_, record) => (
        <Space>
          <div className="chit-name-cell">
            <Tooltip title={record.chitName}>
              <Text strong className="chit-name-text">{record.chitName}</Text>
            </Tooltip>
          </div>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'chitType',
      align: 'center',
      render: (type) => (
        <Tag className={`chit-type-tag ${type}`} bordered={false}>
          {type === 'auction'
            ? <><ThunderboltOutlined /> Auction</>
            : <><OrderedListOutlined /> Tallu</>}
        </Tag>
      ),
      filters: [
        { text: 'Auction', value: 'auction' },
        { text: 'Tallu', value: 'tallu' },
      ],
      onFilter: (value, record) => record.chitType === value,
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      align: 'center',
      sorter: (a, b) => a.memberCount - b.memberCount,
      render: (count) => (
        <Space size={6}>
          <TeamOutlined className="cell-icon" />
          <Text strong>{count}</Text>
        </Space>
      )
    },
    {
      title: 'Months',
      dataIndex: 'totalMonths',
      align: 'center',
      sorter: (a, b) => a.totalMonths - b.totalMonths,
      render: (months) => (
        <Space size={6}>
          <CalendarOutlined className="cell-icon" />
          <Text>{months} Months</Text>
        </Space>
      )
    },
    {
      title: 'Chit Amount',
      dataIndex: 'chitAmount',
      align: 'center',
      sorter: (a, b) => a.chitAmount - b.chitAmount,
      render: (amt) => (
        <Text strong className="amount-primary">{currency(amt)}</Text>
      )
    },
    {
      title: 'Installment',
      dataIndex: 'installmentAmount',
      align: 'center',
      sorter: (a, b) => a.installmentAmount - b.installmentAmount,
      render: (amt) => (
        <Text className="amount-secondary">{currency(amt)}</Text>
      )
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      align: 'center',
      render: (date) => (
        <Text type="secondary">{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Completed', value: 'completed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag className={`chit-status-tag ${status}`} bordered={false}>
          {status === 'active'
            ? <><CheckCircleFilled /> Active</>
            : <><FlagFilled /> Completed</>}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      align: 'center',
      width: 96,
      render: (_, record) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Edit chit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="row-action-btn"
              onClick={(e) => openEditModal(record, e)}
            />
          </Tooltip>
          <Tooltip title="Delete chit">
            <Popconfirm
              title="Delete this chit?"
              description="This action cannot be undone."
              onConfirm={(e) => handleDelete(record._id, e)}
              okText="Delete" cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="row-action-btn"
                onClick={e => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Layout className="tenant-layout">

      {/* Header */}
      <Header className="tenant-header">
        <div className="tenant-header-left">
          <div className="tenant-logo">
            <BankOutlined />
          </div>
          <div className="tenant-header-titles">
            <Text className="tenant-header-subtitle">Chit Fund Management</Text>
          </div>
        </div>
        <div className="tenant-header-right">
          <div className="tenant-user-chip" onClick={openProfileModal} role="button" tabIndex={0}>
            <Avatar size="small" className="tenant-user-avatar" src={user?.profilePicture?.url || undefined}>
              {!user?.profilePicture?.url && user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Text className="tenant-user-name">{user?.name}</Text>
          </div>
          <Button
            className="tenant-logout-btn"
            icon={<LogoutOutlined />}
            size="middle"
            onClick={handleLogout}
          >
            <span className="tenant-logout-label">Log out</span>
          </Button>
        </div>
      </Header>

      <Content className="tenant-content">

        <div className="tenant-page-header">
          <div>
            <Title className="tenant-page-title">Chit Dashboard</Title>
            <Text className="tenant-page-subtitle">
              Manage your chit funds and track member activity
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="tenant-add-btn"
            onClick={openAddModal}
          >
            New Chit
          </Button>
        </div>

        <Row gutter={16} className="tenant-stats-row">
          {[
            { label: 'Total Chits', value: stats.total, icon: <FileTextOutlined />, cls: 'navy', color:'#568ee9' },
            { label: 'Active', value: stats.active, icon: <CheckCircleFilled />, cls: 'green', color: 'rgb(10 130 79)', trend: true },
            { label: 'Completed', value: stats.completed, icon: <FlagFilled />, cls: 'amber', color: 'rgb(161 102 225)' },
            { label: 'Total Value', value: currency(stats.totalValue), icon: <BankOutlined />, cls: 'gold', color: 'rgb(225 158 53)' },
          ]?.map((stat, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card
                className="tenant-stat-card"
                bordered={false}
                style={{ background: `${stat?.color}` }}   // ← card background, ~8% opacity of the theme color
              >
                <div className="tenant-stat-inner">
                  <div
                    className={`tenant-stat-icon ${stat?.cls}`}
                  >
                    {stat?.icon}
                  </div>
                  <div className="tenant-stat-info">
                    <Text className="tenant-stat-label">{stat?.label}</Text>
                    <h3 className="tenant-stat-value" >{stat?.value}</h3>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Table */}
        <Card className="tenant-table-card" bordered={false}>
          <div className="tenant-table-header">
            <Title className="tenant-table-title">All Chits</Title>
            <Input
              className="tenant-search"
              placeholder="Search by chit name"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>

          <Divider className="tenant-table-divider" />

          {isMobile ? (
            <div className="chit-mobile-list">
              {loading && (
                <div className="chit-mobile-empty">Loading chits…</div>
              )}
              {!loading && filteredChits.length === 0 && (
                <div className="chit-mobile-empty">No chits found.</div>
              )}
              {!loading && filteredChits?.map((record) => (
                <div
                  key={record._id}
                  className="chit-mobile-card"
                  onClick={() => handleRowClick(record)}
                >
                  <div className="chit-mobile-card-top">
                    <Space size={10}>
                      <div className="chit-name-cell">
                        <Text strong className="chit-name-text">{record?.chitName}</Text>
                      </div>
                    </Space>
                    <Space size={2} onClick={e => e.stopPropagation()}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className="row-action-btn"
                        onClick={(e) => openEditModal(record, e)}
                      />
                      <Popconfirm
                        title="Delete this chit?"
                        description="This action cannot be undone."
                        onConfirm={(e) => handleDelete(record?._id, e)}
                        okText="Delete" cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="row-action-btn"
                          onClick={e => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </div>

                  <div className="chit-mobile-card-tags">
                    <Tag className={`chit-type-tag ${record?.chitType}`} bordered={false}>
                      {record?.chitType === 'auction'
                        ? <><ThunderboltOutlined /> Auction</>
                        : <><OrderedListOutlined /> Tallu</>}
                    </Tag>
                    <Tag className={`chit-status-tag ${record?.status}`} bordered={false}>
                      {record.status === 'active'
                        ? <><CheckCircleFilled /> Active</>
                        : <><FlagFilled /> Completed</>}
                    </Tag>
                  </div>

                  <div className="chit-mobile-card-grid">
                    <div className="chit-mobile-stat">
                      <Text className="chit-mobile-stat-label">Chit Amount</Text>
                      <Text strong className="amount-primary">{currency(record?.chitAmount)}</Text>
                    </div>
                    <div className="chit-mobile-stat">
                      <Text className="chit-mobile-stat-label">Installment</Text>
                      <Text className="amount-secondary">{currency(record?.installmentAmount)}</Text>
                    </div>
                    <div className="chit-mobile-stat">
                      <Text className="chit-mobile-stat-label">Start Date</Text>
                      <Text type="secondary">
                        {new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table
              className="tenant-table"
              columns={columns}
              dataSource={filteredChits}
              rowKey="_id"
              loading={loading}
              scroll={{ x: 1080 }}
              pagination={{ pageSize: 10, showTotal: (t) => `Total ${t} Chits` }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                className: 'tenant-table-row'
              })}
            />
          )}
        </Card>

      </Content>

      {/* Add / Edit Chit Modal */}
      <Modal
        title={editChit ? 'Edit Chit' : 'Create New Chit'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditChit(null); }}
        footer={null}
        className="tenant-modal"
        width={640}
      >
        <Text className="tenant-modal-subtitle">
          {editChit ? 'Update the details of this chit fund.' : 'Set up a new chit fund scheme for your members.'}
        </Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="tenant-modal-form"
        >
          <Form.Item name="chitName" label="Chit Name"
            rules={[{ required: true, message: 'Chit name is required' }]}>
            <Input placeholder="e.g. Gold Savings Chit — Batch 12" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chitType" label="Chit Type"
                rules={[{ required: true, message: 'Select a chit type' }]}>
                <Select placeholder="Select type">
                  <Option value="auction"><ThunderboltOutlined /> Auction</Option>
                  <Option value="tallu"><OrderedListOutlined /> Tallu</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memberCount" label="Member Count"
                rules={[{ required: true, message: 'Member count is required' }]}>
                <InputNumber
                  placeholder="20"
                  min={1} max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chitAmount" label="Total Chit Amount (₹)"
                rules={[{ required: true, message: 'Chit amount is required' }]}>
                <InputNumber
                  placeholder="500000"
                  min={1}
                  style={{ width: '100%' }}
                  formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="installmentAmount" label="Installment (₹)"
                rules={[{ required: true, message: 'Installment amount is required' }]}>
                <InputNumber
                  placeholder="25000"
                  min={1}
                  style={{ width: '100%' }}
                  formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="commission" label="Commission (%)"
                rules={[{ required: true, message: 'Required' }]}>
                <InputNumber
                  placeholder="4"
                  min={0} max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="chitDate" label="Chit Date"
                rules={[{ required: true, message: 'Required' }]}>
                <InputNumber
                  placeholder="5"
                  min={1} max={31}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="totalMonths" label="Total Months"
                rules={[{ required: true, message: 'Required' }]}>
                <InputNumber
                  placeholder="20"
                  min={1} max={120}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="Status"
                rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Status">
                  <Option value="active"><CheckCircleFilled /> Active</Option>
                  <Option value="completed"><FlagFilled /> Completed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date"
                rules={[{ required: true, message: 'Start date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date"
                rules={[{ required: true, message: 'End date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Space className="tenant-modal-footer">
            <Button
              onClick={() => { setModalOpen(false); form.resetFields(); setEditChit(null); }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className="tenant-modal-submit-btn"
            >
              {editChit ? 'Save Changes' : 'Create Chit'}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Profile Modal */}
      <Modal
        title="My Profile"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        footer={null}
        className="tenant-modal profile-modal"
        width={420}
      >
        <div className="profile-modal-body">
          <Upload
            showUploadList={false}
            accept="image/*"
            beforeUpload={handlePreviewSelect}
          >
            <div className="profile-avatar-upload">
              <Avatar size={88} src={avatarPreview || undefined} className="profile-avatar">
                {!avatarPreview && <UserOutlined />}
              </Avatar>
              <span className="profile-avatar-overlay">
                <CameraOutlined />
              </span>
            </div>
          </Upload>
          <Text className="profile-avatar-hint">Click to change photo</Text>

          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileSave}
            className="profile-form"
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Your name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" />
            </Form.Item>

            <Space className="tenant-modal-footer">
              <Button onClick={() => setProfileModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={profileSaving}
                className="tenant-modal-submit-btn"
              >
                Save Changes
              </Button>
            </Space>
          </Form>
        </div>
      </Modal>

    </Layout>
  );
};

export default Dashboard;