import { useState, useEffect } from 'react';
import {
  Typography, Button, Spin, message, Card, Avatar, Form, Input,
  Upload, Modal, Popconfirm, Empty, Row, Col,
} from 'antd';
import {
  EditOutlined, CameraOutlined, DeleteOutlined, PlusOutlined, FileImageOutlined,
} from '@ant-design/icons';
import API from '../../api/axios';
import './Profile.css';

const { Title, Text } = Typography;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [certModal, setCertModal] = useState(false);
  const [certSaving, setCertSaving] = useState(false);
  const [certName, setCertName] = useState('');
  const [certFile, setCertFile] = useState(null);
  const [form] = Form.useForm();

  // ===== Fetch profile =====
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/auth/me');
      setProfile(data);
      // NOTE: no form.setFieldsValue here — the Form only mounts once
      // `editing` is true, so we feed it via `initialValues` instead
      // (see the <Form> below). Calling setFieldsValue before the Form
      // mounts is what caused the "not connected to any Form element" warning.
    } catch (err) {
      message.error(err.response?.data?.message || 'Unable to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ===== Update profile (name/email/picture) =====
  const handleSaveProfile = async (values) => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);

      const { data } = await API.put('/auth/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(data.user);
      setEditing(false);
      message.success('Profile updated');
    } catch (err) {
      message.error(err.response?.data?.message || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ===== Change profile picture =====
  const handlePictureChange = async (file) => {
    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      formData.append('image', file);

      const { data } = await API.put('/auth/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(data?.user);
      message.success('Profile picture updated');
    } catch (err) {
      message.error(err.response?.data?.message || 'Unable to update picture.');
    }
    return false; // prevent antd Upload's default auto-upload
  };

  const handleRemovePicture = async () => {
    try {
      const { data } = await API.delete('/auth/me/profile-picture');
      setProfile((p) => ({ ...p, profilePicture: data.profilePicture }));
      message.success('Profile picture removed');
    } catch (err) {
      message.error('Unable to remove picture.');
    }
  };

  // ===== Certificates =====
  const handleAddCertificate = async () => {
    if (!certName.trim()) return message.error('Certificate name is required');
    if (!certFile) return message.error('Please choose a certificate image');

    try {
      setCertSaving(true);
      const formData = new FormData();
      formData.append('name', certName.trim());
      formData.append('image', certFile);

      const { data } = await API.post('/auth/me/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile((p) => ({ ...p, certificates: data.certificates }));
      message.success('Certificate added');
      setCertModal(false);
      setCertName('');
      setCertFile(null);
    } catch (err) {
      message.error(err.response?.data?.message || 'Unable to add certificate.');
    } finally {
      setCertSaving(false);
    }
  };

  const handleDeleteCertificate = async (certificateId) => {
    try {
      const { data } = await API.delete(`/auth/me/certificates/${certificateId}`);
      setProfile((p) => ({ ...p, certificates: data.certificates }));
      message.success('Certificate removed');
    } catch (err) {
      message.error('Unable to remove certificate.');
    }
  };

  if (loading && !profile) return (
    <div className="pf-loading-screen">
      <Spin size="large" />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="profile-page">
      <Card className="pf-card" bordered={false}>
        <div className="pf-avatar-row">
          <div className="pf-avatar-wrap">
            <Avatar
              size={84}
              src={profile?.profilePicture?.url || undefined}
              className="pf-avatar"
            >
              {getInitials(profile?.name)}
            </Avatar>
            <Upload
              showUploadList={false}
              accept="image/*"
              beforeUpload={handlePictureChange}
            >
              <button className="pf-avatar-edit-btn" type="button">
                <CameraOutlined />
              </button>
            </Upload>
          </div>

          <div className="pf-identity">
            <div className="pf-name">{profile.name}</div>
            <div className="pf-email">{profile.email}</div>
          </div>

          <div className="pf-identity-actions">
            {profile?.profilePicture?.url && (
              <Popconfirm
                title="Remove profile picture?"
                onConfirm={handleRemovePicture}
                okText="Remove"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger type="text">Remove photo</Button>
              </Popconfirm>
            )}
            {!editing && (
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <>
            <div className="pf-divider" />
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveProfile}
              className="pf-form"
              initialValues={{ name: profile.name, email: profile.email }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Name is required' }]}>
                    <Input placeholder="e.g. Anandraj" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Email is required' },
                      { type: 'email', message: 'Enter a valid email' },
                    ]}
                  >
                    <Input placeholder="e.g. name@example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <div className="pf-form-actions">
                <Button onClick={() => { setEditing(false); form.setFieldsValue({ name: profile.name, email: profile.email }); }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Save Changes
                </Button>
              </div>
            </Form>
          </>
        )}
      </Card>

      {/* ===== Certificates card ===== */}
      <Card className="pf-card" bordered={false}>
        <div className="pf-card-header">
          <Title className="pf-card-title">
            <FileImageOutlined className="pf-card-title-icon" /> Certificates
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCertModal(true)}>
            Add Certificate
          </Button>
        </div>

        {(!profile.certificates || profile.certificates.length === 0) ? (
          <Empty description="No certificates uploaded yet" />
        ) : (
          <div className="cert-grid">
            {profile?.certificates?.map((c) => (
              <div key={c._id} className="cert-card">
                <div className="cert-image-wrap">
                  <img src={c.url} alt={c.name} className="cert-image" />
                </div>
                <div className="cert-info">
                  <div className="cert-name" title={c.name}>{c.name}</div>
                  <div className="cert-date">
                    {new Date(c.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <Popconfirm
                  title="Remove this certificate?"
                  description="This action cannot be undone."
                  onConfirm={() => handleDeleteCertificate(c._id)}
                  okText="Remove"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <button className="cert-delete-btn" type="button">
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ===== Add certificate modal ===== */}
      <Modal
        title="Add Certificate"
        open={certModal}
        onCancel={() => { setCertModal(false); setCertName(''); setCertFile(null); }}
        footer={null}
      >
        <div className="pf-modal-body">
          <label className="pf-modal-label">Certificate Name</label>
          <Input
            placeholder="e.g. Chit Fund License"
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <label className="pf-modal-label">Certificate Image</label>
          <Upload.Dragger
            accept="image/*"
            maxCount={1}
            beforeUpload={(file) => { setCertFile(file); return false; }}
            onRemove={() => setCertFile(null)}
          >
            <p className="ant-upload-drag-icon"><FileImageOutlined /></p>
            <p className="ant-upload-text">Click or drag an image here</p>
          </Upload.Dragger>

          <div className="pf-form-actions" style={{ marginTop: 20 }}>
            <Button onClick={() => { setCertModal(false); setCertName(''); setCertFile(null); }}>
              Cancel
            </Button>
            <Button type="primary" loading={certSaving} onClick={handleAddCertificate}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;