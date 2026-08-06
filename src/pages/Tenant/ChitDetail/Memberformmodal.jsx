import { useState, useEffect } from 'react';
import {
    Modal, Form, Input, Button, Space, Avatar, Upload,
    InputNumber, Checkbox, Typography, message
} from 'antd';
import { CameraOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import API from '../../../api/axios';

const { Text } = Typography;

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

// Same helper used in ChitDetail — kept local here so this component
// doesn't need the parent's full helper set, just the chit + month.
const getPrizedMemberForMonth = (chit, month, excludeMemberId = null) => {
    return chit?.members?.find(
        m => Array.isArray(m.prizedMonth) && m.prizedMonth.includes(month) && m._id !== excludeMemberId
    );
};

const MemberFormModal = ({
    open,
    onClose,
    onSaved,
    chit,
    chitId,
    editMember,
    selectedMonth,
    isMobile,
}) => {
    const [form] = Form.useForm();
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [removePhotoFlag, setRemovePhotoFlag] = useState(false);
    const [saving, setSaving] = useState(false);
    const [amountWords, setAmountWords] = useState('');

    // Reset the form whenever the modal opens for a different member (or a fresh Add)
    useEffect(() => {
        if (!open) return;

        setPhotoFile(null);
        setRemovePhotoFlag(false);

        if (editMember) {
            setPhotoPreview(editMember.photo?.url || null);
            const currentPayment = editMember.payments?.find(p => p.month === selectedMonth);
            const initialAmount = chit?.chitType === 'tallu'
                ? (currentPayment?.amount ?? chit.installmentAmount)
                : undefined;
            form.setFieldsValue({
                memberName: editMember.memberName,
                phone: editMember.phone,
                amount: initialAmount,
                isPrizedMonth: editMember.prizedMonth?.includes(selectedMonth) || false,
            });
            setAmountWords(amountToWords(initialAmount));
        } else {
            setPhotoPreview(null);
            setAmountWords('');
            form.resetFields();
        }
    }, [open, editMember, selectedMonth, chit, form]);
    const handlePhotoSelect = (file) => {
        setPhotoFile(file);
        setRemovePhotoFlag(false);
        const reader = new FileReader();
        reader.onload = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
        return false;
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemovePhotoFlag(true);
    };

    const handleClose = () => {
        form.resetFields();
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemovePhotoFlag(false);
        onClose();
    };

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const { memberName, phone, amount, isPrizedMonth } = values;

            const formData = new FormData();
            formData.append('memberName', memberName);
            formData.append('phone', phone);
            if (photoFile) formData.append('photo', photoFile);

            if (editMember) {
                const wasAlreadyPrized = editMember.prizedMonth?.includes(selectedMonth) || false;
                const prizedChanged = !!isPrizedMonth !== wasAlreadyPrized;

                if (prizedChanged) {
                    formData.append('month', selectedMonth);
                    formData.append('prized', !!isPrizedMonth);
                }

                if (removePhotoFlag && !photoFile) {
                    formData.append('removePhoto', 'true');
                }

                await API.put(`/chits/${chitId}/members/${editMember._id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (chit.chitType === 'tallu' && amount !== undefined && amount !== null) {
                    await API.put(
                        `/chits/${chitId}/members/${editMember._id}/payments/month/${selectedMonth}/amount`,
                        { amount }
                    );
                }

                message.success('Member updated');
            } else {
                await API.post(`/chits/${chitId}/members`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success('Member added');
            }

            handleClose();
            onSaved();
        } catch (err) {
            message.error(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const takenBy = editMember
        ? getPrizedMemberForMonth(chit, selectedMonth, editMember._id)
        : null;

    // ===== Send WhatsApp reminder (free wa.me click-to-chat, no paid API) =====
    const handleSendWhatsApp = () => {
        if (!editMember) return;

        const payment = editMember.payments?.find(p => p.month === selectedMonth);
        const amount = payment?.amount ?? chit?.installmentAmount ?? 0;
        const dueDate = payment?.dueDate
            ? new Date(payment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'not set';

        const amountText = `₹${amount.toLocaleString('en-IN')}`;

        const text =
            `Hi ${editMember.memberName}, this is a payment reminder for your "${chit?.chitName}" chit.\n\n` +
            `Month: ${selectedMonth}\n` +
            `Amount due: ${amountText}\n` +
            `Due date: ${dueDate}\n\n` +
            `Please make the payment at the earliest. Thank you!`;

        const digitsOnly = (editMember.phone || '').replace(/\D/g, '');
        if (!digitsOnly) {
            message.error("This member doesn't have a phone number saved.");
            return;
        }
        const fullPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <Modal
            title={editMember ? 'Edit Member' : 'Add Member'}
            open={open}
            onCancel={saving ? undefined : handleClose}
            mask={{ closable: !saving }}
            keyboard={!saving}
            closable={!saving}
            footer={null}
            className="cd-modal"
            centered
            width="92%"
            style={{ maxWidth: 460 }}
        >
            <Text className="cd-modal-subtitle">
                {editMember ? 'Update this member\'s details.' : `Add a new member to ${chit?.chitName}.`}
            </Text>

            <div className="member-avatar-row">
                <div className="member-avatar-wrap">
                    <Avatar size={72} src={photoPreview || undefined} className="member-avatar">
                        {!photoPreview && <UserOutlined />}
                    </Avatar>
                    <Upload
                        showUploadList={false}
                        accept="image/*"
                        disabled={saving}

                        beforeUpload={handlePhotoSelect}
                    >
                        <button className="member-avatar-edit-btn" type="button">
                            <CameraOutlined />
                        </button>
                    </Upload>
                </div>
                {photoPreview && (
                    <Button size="small" danger type="text" onClick={handleRemovePhoto}>
                        Remove photo
                    </Button>
                )}
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="cd-modal-form"
            >
                <Form.Item name="memberName" label="Member Name"
                    rules={[{ required: true, message: 'Member name is required' }]}>
                    <Input disabled={saving}
                        placeholder="e.g. Anandraj" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                        { required: true, message: 'Phone number is required' },
                        { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit phone number' },
                    ]}
                >
                    <Input disabled={saving}
                        placeholder="e.g. 9876543210" maxLength={10}
                        inputMode="numeric" />
                </Form.Item>

                {editMember && chit?.chitType === 'tallu' && (
                    <>
                        <Form.Item
                            name="amount"
                            label={`${selectedMonth} Month Amount (₹)`}
                            extra="Applies to all members and automatically recalculates future months."
                            rules={[
                                {
                                    validator: (_, value) => {
                                        if (value === null || value === undefined || value === '') {
                                            return Promise.reject(new Error('Please enter the amount'));
                                        }
                                        if (Number(value) <= 0) {
                                            return Promise.reject(new Error('Amount must be greater than 0'));
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <InputNumber
                                disabled={saving}
                                style={{ width: "100%" }}
                                min={0}
                                precision={2}
                                step={0.01}
                                controls={false}
                                // KEY FIX: while the user is actively typing, antd passes back
                                // { userTyping, input } — we must return their raw input as-is,
                                // otherwise every keystroke gets re-formatted (forcing ".00" back
                                // in and jumping the cursor), which is what made delete/backspace
                                // feel broken. We only apply the pretty ₹/comma/".00" formatting
                                // once the user has stopped typing (e.g. on blur).
                                formatter={(value, info) => {
                                    if (info?.userTyping) return info.input;
                                    if (value === "" || value === undefined || value === null) return "";
                                    return `₹ ${Number(value).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}`;
                                }}
                                parser={(value) =>
                                    value ? value.replace(/[₹,\s]/g, "") : ""
                                }
                                onChange={(value) => setAmountWords(amountToWords(value))}
                            />
                        </Form.Item>
                        {amountWords && (
                            <Text type="secondary" className="cd-amount-words" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontStyle: 'italic' }}>
                                {amountWords}
                            </Text>
                        )}

                        {takenBy ? (
                            <Form.Item label="Prized Month">
                                <Text type="secondary">
                                    Month {selectedMonth} is already prized by <strong>{takenBy.memberName}</strong>.
                                </Text>
                            </Form.Item>
                        ) : (
                            <Form.Item
                                name="isPrizedMonth"
                                valuePropName="checked"
                                extra={`Mark this member as prized for Month ${selectedMonth}.`}
                            >
                                <Checkbox disabled={saving}
                                >Prized Month</Checkbox>
                            </Form.Item>
                        )}
                    </>
                )}

                <Space className="cd-modal-footer" style={{ justifyContent: editMember ? 'space-between' : 'flex-end' }}>
                    {editMember && (
                        <Button
                            icon={<MessageOutlined />}
                            className="whatsapp-reminder-btn"
                            onClick={handleSendWhatsApp}
                            disabled={saving}

                        >
                            WhatsApp
                        </Button>
                    )}
                    <Space>
                        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="cd-modal-submit-btn" loading={saving} >
                            {editMember ? 'Save Changes' : 'Add Member'}
                        </Button>
                    </Space>
                </Space>
            </Form>
        </Modal>
    );
};

export default MemberFormModal;