import { useEffect, useState } from 'react';
import {
    Modal, Form, Input, Select, Row, Col,
    InputNumber, DatePicker, Button, Space, Typography,
    Upload, Avatar, message
} from 'antd';
import {
    ThunderboltOutlined, OrderedListOutlined,
    CheckCircleFilled, FlagFilled,
    CameraOutlined, PictureOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

/**
 * Add / Edit Chit modal.
 *
 * When editing an existing chit, only "Chit Name" and "Status" stay
 * editable — every other field is shown for reference but disabled.
 * The chit photo can always be added/changed, in both create and edit mode.
 *
 * Props:
 * - open: boolean — whether the modal is visible
 * - editChit: object|null — the chit being edited, or null when creating
 * - onCancel: () => void — called when the modal is closed/cancelled
 * - onSubmit: (values, imageFile) => void — called with the form values
 *   and the selected image file (or null) on submit
 */
const ChitFormModal = ({ open, editChit, onCancel, onSubmit, loading }) => {
    const [form] = Form.useForm();
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Populate or reset the form whenever the modal opens
    useEffect(() => {
        if (!open) return;
        if (editChit) {
            form.setFieldsValue({
                ...editChit,
                startDate: dayjs(editChit.startDate),
                endDate: dayjs(editChit.endDate),
            });
            setImagePreview(editChit?.image?.url || editChit?.imageUrl || null);
        } else {
            form.resetFields();
            setImagePreview(null);
        }
        setImageFile(null);
    }, [open, editChit, form]);

    const handleCancel = () => {
        form.resetFields();
        setImageFile(null);
        setImagePreview(null);
        onCancel();
    };

    // Local preview only — the actual file is sent to the API on submit
    const handleImageSelect = (file) => {
        const isImage = file.type?.startsWith('image/');
        if (!isImage) {
            message.error('Please select an image file');
            return Upload.LIST_IGNORE;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
        return false; // prevent antd auto-upload
    };

    const handleFinish = (values) => {
        onSubmit(values, imageFile);
    };

    const isEditing = !!editChit;

    return (
        <Modal
            title={isEditing ? 'Edit Chit' : 'Create New Chit'}
            open={open}
            onCancel={handleCancel}
            footer={null}
            className="tenant-modal"
            width={640}
        >
            <Text className="tenant-modal-subtitle">
                {isEditing ? 'Update the details of this chit fund.' : 'Set up a new chit fund scheme for your members.'}
            </Text>

            <div className="chit-image-upload-wrap">
                <Upload
                    showUploadList={false}
                    accept="image/*"
                    beforeUpload={handleImageSelect}
                >
                    <div className="chit-image-upload">
                        <Avatar
                            shape="square"
                            size={88}
                            src={imagePreview || undefined}
                            className="chit-image-avatar"
                            icon={!imagePreview ? <PictureOutlined /> : undefined}
                        />
                        <span className="chit-image-overlay">
                            <CameraOutlined />
                        </span>
                    </div>
                </Upload>
                <Text className="chit-image-hint">
                    {imagePreview ? 'Click to change photo' : 'Click to upload a chit photo'}
                </Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                className="tenant-modal-form"
            >
                <Form.Item name="chitName" label="Chit Name"
                    rules={[{ required: true, message: 'Chit name is required' }]}>
                    <Input placeholder="e.g. Gold Savings Chit — Batch 12" />
                </Form.Item>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="chitType" label="Chit Type"
                            rules={[{ required: true, message: 'Select a chit type' }]}>
                            <Select placeholder="Select type" disabled={isEditing}>
                                <Option value="auction"><ThunderboltOutlined /> Auction</Option>
                                <Option value="tallu"><OrderedListOutlined /> Tallu</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="memberCount" label="Member Count"
                            rules={[{ required: true, message: 'Member count is required' }]}>
                            <InputNumber
                                placeholder="20"
                                min={1} max={100}
                                style={{ width: '100%' }}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="chitAmount" label="Total Chit Amount (₹)"
                            rules={[{ required: true, message: 'Chit amount is required' }]}>
                            <InputNumber
                                placeholder="500000"
                                min={1}
                                style={{ width: '100%' }}
                                formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={v => v.replace(/₹\s?|(,*)/g, '')}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="installmentAmount" label="Installment (₹)"
                            rules={[{ required: true, message: 'Installment amount is required' }]}>
                            <InputNumber
                                placeholder="25000"
                                min={1}
                                style={{ width: '100%' }}
                                formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={v => v.replace(/₹\s?|(,*)/g, '')}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={12} sm={6}>
                        <Form.Item name="commission" label="Commission (%)"
                            rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber
                                placeholder="4"
                                min={0} max={100}
                                style={{ width: '100%' }}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Form.Item name="chitDate" label="Chit Date"
                            rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber
                                placeholder="5"
                                min={1} max={31}
                                style={{ width: '100%' }}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Form.Item name="totalMonths" label="Total Months"
                            rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber
                                placeholder="20"
                                min={1} max={120}
                                style={{ width: '100%' }}
                                disabled={isEditing}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
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
                    <Col xs={24} sm={12}>
                        <Form.Item name="startDate" label="Start Date"
                            rules={[{ required: true, message: 'Start date is required' }]}>
                            <DatePicker style={{ width: '100%' }} disabled={isEditing} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="endDate" label="End Date"
                            rules={[{ required: true, message: 'End date is required' }]}>
                            <DatePicker style={{ width: '100%' }} disabled={isEditing} />
                        </Form.Item>
                    </Col>
                </Row>

                <Space className="tenant-modal-footer">
                    <Button onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        className="tenant-modal-submit-btn"
                        loading={loading}

                    >
                        {isEditing ? 'Save Changes' : 'Create Chit'}
                    </Button>
                </Space>
            </Form>
        </Modal>
    );
};

export default ChitFormModal;