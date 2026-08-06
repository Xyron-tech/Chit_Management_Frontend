import { useEffect, useState } from 'react';
import {
    Modal, Form, Input, Select, Row, Col,
    InputNumber, DatePicker, Button, Space, Typography,
    Upload, Avatar, message
} from 'antd';
import {
    ThunderboltOutlined, OrderedListOutlined,
    CheckCircleFilled, FlagFilled,
    CameraOutlined, PictureOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

// ===== Number to words (Indian numbering system: Lakh, Crore) =====
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (num) => {
    if (num < 20) return ONES[num];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${TENS[tens]}${ones ? ' ' + ONES[ones] : ''}`;
};

const threeDigitsToWords = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let str = hundred ? `${ONES[hundred]} Hundred` : '';
    if (rest) str += `${str ? ' ' : ''}${twoDigitsToWords(rest)}`;
    return str;
};

// Converts a number into Indian-style words, e.g.
// 524999 -> "Five Lakh Twenty Four Thousand Nine Hundred Ninety Nine"
// 24950000000 -> "Two Thousand Four Hundred Ninety Five Crore"
const numberToIndianWords = (num) => {
    if (num === null || num === undefined || num === '' || isNaN(num)) return '';
    let n = Math.floor(Math.abs(Number(num)));
    if (n === 0) return 'Zero';

    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh = Math.floor(n / 100000); n %= 100000;
    const thousand = Math.floor(n / 1000); n %= 1000;
    const hundred = n;

    const parts = [];
    if (crore) parts.push(`${crore > 99 ? numberToIndianWords(crore) : threeDigitsToWords(crore)} Crore`);
    if (lakh) parts.push(`${twoDigitsToWords(lakh) || threeDigitsToWords(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigitsToWords(thousand) || threeDigitsToWords(thousand)} Thousand`);
    if (hundred) parts.push(threeDigitsToWords(hundred));

    return parts.join(' ');
};

const amountToWords = (value) => {
    const words = numberToIndianWords(value);
    return words ? `${words} Rupees only` : '';
};

// Shared formatter/parser for all ₹ amount InputNumbers in this form.
// KEY FIX: while the user is actively typing, antd passes back
// { userTyping, input } — we must return their raw input as-is,
// otherwise every keystroke gets re-formatted (forcing symbols/commas
// back in and jumping the cursor), which breaks typing/backspacing.
// We only apply the pretty ₹/comma formatting once typing has settled.
const rupeeFormatter = (value, info) => {
    if (info?.userTyping) return info.input;
    if (value === "" || value === undefined || value === null) return "";
    return `₹ ${Number(value).toLocaleString("en-IN")}`;
};
const rupeeParser = (value) => (value ? value.replace(/[₹,\s]/g, "") : "");

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
    const [removeImageFlag, setRemoveImageFlag] = useState(false);
    const [chitAmountWords, setChitAmountWords] = useState('');
    const [installmentAmountWords, setInstallmentAmountWords] = useState('');

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
            setChitAmountWords(amountToWords(editChit?.chitAmount));
            setInstallmentAmountWords(amountToWords(editChit?.installmentAmount));
        } else {
            form.resetFields();
            setImagePreview(null);
            setChitAmountWords('');
            setInstallmentAmountWords('');
        }
        setImageFile(null);
        setRemoveImageFlag(false);
    }, [open, editChit, form]);

    const handleCancel = () => {
        form.resetFields();
        setImageFile(null);
        setImagePreview(null);
        setRemoveImageFlag(false);
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
        setRemoveImageFlag(false);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
        return false; // prevent antd auto-upload
    };

    // Clears the preview and marks the existing image for removal on save.
    // Stops the click from bubbling up into the Upload's file picker.
    const handleRemoveImage = (e) => {
        e.stopPropagation();
        setImageFile(null);
        setImagePreview(null);
        setRemoveImageFlag(true);
    };

    const handleFinish = (values) => {
        onSubmit(values, imageFile, removeImageFlag);
    };

    // Auto-calculate End Date whenever Start Date or Total Months changes.
    // e.g. Start Date 04-08-2026 + Total Months 20 -> End Date 04-04-2028
    const handleValuesChange = (changedValues) => {
        if ('startDate' in changedValues || 'totalMonths' in changedValues) {
            const { startDate, totalMonths } = form.getFieldsValue(['startDate', 'totalMonths']);
            if (startDate && totalMonths) {
                form.setFieldsValue({ endDate: dayjs(startDate).add(totalMonths, 'month') });
            }
        }
    };

    const isEditing = !!editChit;

    return (
        <Modal
            title={isEditing ? 'Edit Chit' : 'Create New Chit'}
            open={open}
            onCancel={handleCancel}
            footer={null}
            className="tenant-modal"
            centered
            width="92%"
            style={{ maxWidth: 460 }}
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
                            style={{width:'60px',height:'60px'}}
                            src={imagePreview || undefined}
                            className="chit-image-avatar"
                            icon={!imagePreview ? <PictureOutlined /> : undefined}
                        />
                        <span className="chit-image-overlay">
                            <CameraOutlined />
                        </span>
                        {imagePreview && (
                            <button
                                type="button"
                                className="chit-image-remove-btn"
                                onClick={handleRemoveImage}
                                aria-label="Remove photo"
                            >
                                <CloseOutlined />
                            </button>
                        )}
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
                onValuesChange={handleValuesChange}
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
                                controls={false}
                                formatter={rupeeFormatter}
                                parser={rupeeParser}
                                disabled={isEditing}
                                onChange={(value) => setChitAmountWords(amountToWords(value))}
                            />
                        </Form.Item>
                        {chitAmountWords && (
                            <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontStyle: 'italic' }}>
                                {chitAmountWords}
                            </Text>
                        )}
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="installmentAmount" label="Installment (₹)"
                            rules={[{ required: true, message: 'Installment amount is required' }]}>
                            <InputNumber
                                placeholder="25000"
                                min={1}
                                style={{ width: '100%' }}
                                controls={false}
                                formatter={rupeeFormatter}
                                parser={rupeeParser}
                                disabled={isEditing}
                                onChange={(value) => setInstallmentAmountWords(amountToWords(value))}
                            />
                        </Form.Item>
                        {installmentAmountWords && (
                            <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontStyle: 'italic' }}>
                                {installmentAmountWords}
                            </Text>
                        )}
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