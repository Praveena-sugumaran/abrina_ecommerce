'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ReactDOM from 'react-dom';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import 'react-quill/dist/quill.snow.css';
import styles from './AdminLayout.module.css';

const ReactQuill = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <div style={{ height: '350px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>Loading editor...</div>
});

// Fix for ReactQuill in React 18 (findDOMNode deprecation)
if (typeof window !== 'undefined' && typeof (ReactDOM as any).findDOMNode !== 'function') {
    (ReactDOM as any).findDOMNode = (node: any) => node;
}

interface EmailCampaign {
    _id?: string;
    subject: string;
    body: string;
    recipientsCount: number;
    status: string;
    sentAt: string;
}

interface SubscriberItem {
    _id: string;
    email: string;
    createdAt: string;
}

const PRESET_TEMPLATES = [
    {
        name: 'Flash Clearance Sale',
        subject: 'Limited Time Clearance! Up to 70% Off Sourcing Special',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ff6a00;">
    <h1 style="color: #ff6a00; margin: 0; font-size: 24px;">Global Wholesale Clearance</h1>
    <p style="color: #64748b; margin: 5px 0 0;">Exclusive Supplier Discounts for Verified Buyers</p>
  </div>
  <div style="padding: 24px 0;">
    <p style="font-size: 16px; color: #1e293b;">Hello Sourcing Partner,</p>
    <p style="color: #475569; line-height: 1.6;">Our top-tier verified suppliers have just posted limited-quantity factory pricing discounts on high-demand inventory. Enjoy extra savings on wholesale bookings this week.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #ff6a00; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Browse Clearance Deals</a>
    </div>
  </div>
  <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p>© 2026 B2B Marketplace. All rights reserved.</p>
  </div>
</div>`
    },
    {
        name: 'Weekly Sourcing Digest',
        subject: 'Weekly Top Ranked Suppliers & Hot Trends',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; padding: 24px; border-radius: 8px; text-align: center;">
    <h2 style="margin: 0; font-size: 22px;">Weekly Sourcing Digest</h2>
    <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">Curated B2B Sourcing Opportunities</p>
  </div>
  <div style="padding: 24px 0;">
    <h3 style="color: #0f172a; margin-top: 0;">Featured Verified Suppliers</h3>
    <p style="color: #475569; line-height: 1.6;">Discover audited factories with instant RFQ response times and OEM customization readiness.</p>
    <ul style="color: #334155; line-height: 1.8;">
      <li><strong>Electronics & Gadgets:</strong> Direct OEM prices under $5</li>
      <li><strong>Apparel & Textiles:</strong> Low MOQ customizable stock</li>
      <li><strong>Home & Garden:</strong> Express local shipping available</li>
    </ul>
  </div>
</div>`
    },
    {
        name: 'Welcome Discount Voucher',
        subject: 'Claim Your First-Order $20 Sourcing Voucher',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="text-align: center; padding: 20px; background: #fff7ed; border-radius: 10px; border: 1px dashed #ff6a00;">
    <h2 style="color: #ff6a00; margin: 0;">Special $20 Welcome Discount</h2>
    <p style="color: #7c2d12; margin: 5px 0 0; font-size: 14px;">Use Code: <strong>WELCOME20</strong> at Checkout</p>
  </div>
  <div style="padding: 20px 0;">
    <p style="color: #334155;">Apply your exclusive $20 promo code on any wholesale order over $100 today.</p>
  </div>
</div>`
    }
];

const AdminNewsletter = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('visual');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);

    // Subscribers Modal State
    const [showSubscribersModal, setShowSubscribersModal] = useState(false);
    const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
    const [loadingSubscribers, setLoadingSubscribers] = useState(false);
    const [subscriberSearch, setSubscriberSearch] = useState('');

    // Form fields
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image', 'video', 'blockquote', 'code-block'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'align',
        'link', 'image', 'video', 'blockquote', 'code-block'
    ];

    useEffect(() => {
        fetchCampaigns();
        fetchSubscribers();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/newsletter/campaigns');
            setCampaigns(data || []);
        } catch (err: any) {
            console.error('Failed to fetch newsletter campaigns:', err);
            showToast('Failed to load campaigns list', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscribers = async () => {
        setLoadingSubscribers(true);
        try {
            const { data } = await api.get('/newsletter/subscribers');
            setSubscribers(data || []);
        } catch (err: any) {
            console.error('Failed to fetch subscribers:', err);
        } finally {
            setLoadingSubscribers(false);
        }
    };

    const handleDeleteSubscriber = async (id: string, email: string) => {
        if (!window.confirm(`Are you sure you want to unsubscribe ${email}?`)) return;
        try {
            await api.delete(`/newsletter/subscribers/${id}`);
            showToast(`Unsubscribed ${email} successfully`, 'success');
            fetchSubscribers();
        } catch (err: any) {
            showToast('Failed to unsubscribe user', 'error');
        }
    };

    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            showToast('Subject and email body are required.', 'error');
            return;
        }
        setShowConfirmModal(true);
    };

    const executeSendCampaign = async () => {
        setShowConfirmModal(false);
        setSending(true);
        try {
            const { data } = await api.post('/newsletter/campaigns/send', { subject, body });
            if (data.success) {
                showToast(`Campaign broadcasted to ${data.campaign.recipientsCount} recipients successfully!`, 'success');
                setSubject('');
                setBody('');
                fetchCampaigns();
            }
        } catch (err: any) {
            console.error('Send campaign error:', err);
            showToast(err.response?.data?.message || 'Failed to dispatch email campaign.', 'error');
        } finally {
            setSending(false);
        }
    };

    const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
        setSubject(preset.subject);
        setBody(preset.body);
        showToast(`Loaded preset template: ${preset.name}`, 'info');
    };

    const totalRecipients = campaigns.reduce((acc, c) => acc + (c.recipientsCount || 0), 0);

    const filteredSubscribers = subscribers.filter(s => 
        s.email.toLowerCase().includes(subscriberSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <h1 className="admin-page-title">Email Campaigns & Newsletter</h1>
                        <p className="admin-page-subtitle">Compose, preview, and broadcast targeted email campaigns to buyers & newsletter subscribers</p>
                    </div>
                </div>
                <div className="admin-loading-text" style={{ padding: '100px 0', textAlign: 'center' }}>
                    Loading newsletter campaigns...
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            {/* ── Page Header ── */}
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="admin-page-title">Email Campaigns & Newsletter</h1>
                    <p className="admin-page-subtitle">Compose, preview, and broadcast targeted email campaigns to buyers & newsletter subscribers</p>
                </div>
                <button
                    type="button"
                    onClick={() => { fetchSubscribers(); setShowSubscribersModal(true); }}
                    className="admin-btn admin-btn-secondary"
                    style={{ gap: '8px', padding: '10px 16px', fontSize: '13px' }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Subscribers Mail List ({subscribers.length})
                </button>
            </div>

            {/* ── Top Summary Stats Bar ── */}
            <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-premium">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Broadcasts</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '8px' }}>{campaigns.length}</div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Campaigns Dispatched</div>
                </div>

                <div className="admin-stat-premium">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipients Reached</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '8px' }}>{totalRecipients.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Total Email Messages Sent</div>
                </div>

                <div className="admin-stat-premium">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMTP Gateway</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                        Active & Connected
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Ready for Instant Delivery</div>
                </div>
            </div>

            {/* ── Main Two-Column Layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
                
                {/* ── Compose Form Card ── */}
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 className="admin-card-title">Compose Email Campaign</h2>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>Create visual rich-text or custom HTML announcements</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            <button
                                type="button"
                                onClick={() => setEditorMode('visual')}
                                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', background: editorMode === 'visual' ? 'var(--primary-color)' : 'transparent', color: editorMode === 'visual' ? '#fff' : 'var(--admin-text-muted)', transition: 'all 0.15s' }}
                            >
                                Text Editor
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('code')}
                                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', background: editorMode === 'code' ? 'var(--primary-color)' : 'transparent', color: editorMode === 'code' ? '#fff' : 'var(--admin-text-muted)', transition: 'all 0.15s' }}
                            >
                                HTML Code
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('preview')}
                                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', background: editorMode === 'preview' ? 'var(--primary-color)' : 'transparent', color: editorMode === 'preview' ? '#fff' : 'var(--admin-text-muted)', transition: 'all 0.15s' }}
                            >
                                Live Preview
                            </button>
                        </div>
                    </div>

                    <div className="admin-card-body">
                        {/* Preset Quick-Insert Template Chips */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                Quick Templates:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {PRESET_TEMPLATES.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="admin-btn admin-btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', background: 'var(--admin-bg)' }}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleOpenConfirm}>
                            <div className={styles['admin-form-group']} style={{ marginBottom: '20px' }}>
                                <label className={styles['admin-form-label']}>Email Subject *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. July Clearance Sale - Up to 50% Off Wholesale Booking"
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className={styles['admin-form-input']}
                                />
                            </div>

                            {editorMode === 'visual' && (
                                <div className={styles['admin-form-group']} style={{ marginBottom: '24px' }}>
                                    <label className={styles['admin-form-label']}>Email Content (Visual Text Editor) *</label>
                                    <ReactQuill
                                        theme="snow"
                                        value={body}
                                        onChange={content => setBody(content)}
                                        modules={modules}
                                        formats={formats}
                                        style={{ height: '350px', marginBottom: '50px' }}
                                    />
                                </div>
                            )}

                            {editorMode === 'code' && (
                                <div className={styles['admin-form-group']} style={{ marginBottom: '24px' }}>
                                    <label className={styles['admin-form-label']}>HTML Source Code *</label>
                                    <textarea
                                        required
                                        rows={14}
                                        placeholder="<h1>Weekly Special</h1><p>Check out our latest supplier offers...</p>"
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        className={styles['admin-form-input']}
                                        style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px', lineHeight: '1.5', resize: 'vertical' }}
                                    />
                                </div>
                            )}

                            {editorMode === 'preview' && (
                                <div style={{ marginBottom: '24px', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '20px', background: '#f8fafc', minHeight: '320px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Subject Line Preview:</div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                                        {subject || '(No Subject Entered)'}
                                    </div>
                                    {body ? (
                                        <div dangerouslySetInnerHTML={{ __html: body }} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    ) : (
                                        <div style={{ color: 'var(--admin-text-muted)', fontSize: '13px', textAlign: 'center', padding: '60px 0' }}>
                                            No email content written yet. Switch to <strong>Text Editor</strong> to write your email visually.
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={sending}
                                className="admin-btn admin-btn-primary"
                                style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '14px', borderRadius: '10px', gap: '8px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                {sending ? 'Broadcasting Email Campaign...' : 'Broadcast Email Campaign'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Dispatch History Log Card ── */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">Dispatch Log History</h2>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>Chronological history of broadcasted newsletters</span>
                    </div>

                    <div className="admin-card-body">
                        {campaigns.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>No Campaigns Sent Yet</div>
                                <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', margin: 0 }}>
                                    Broadcasted newsletters and promotional updates will automatically log here.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                                {campaigns.map((c) => (
                                    <div key={c._id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', transition: 'all 0.15s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '10px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--admin-text-main)', flex: 1, lineHeight: '1.4' }}>{c.subject}</h4>
                                            <span className="admin-badge admin-badge-success" style={{ flexShrink: 0 }}>
                                                Sent
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 600, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--admin-border)' }}>
                                            <span>{c.recipientsCount || 0} Recipients</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCampaign(c)}
                                                    className="admin-btn admin-btn-secondary"
                                                    style={{ padding: '3px 10px', fontSize: '11px', borderRadius: '6px', gap: '4px' }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                    View
                                                </button>
                                                <span>Sent: {c.sentAt ? new Date(c.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ── View Campaign Details Modal ── */}
            {selectedCampaign && (
                <div 
                    className="modal fade show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '680px' }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            <div className="modal-header border-0 pb-2 pt-4 px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h5 className="modal-title font-weight-bold" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        Campaign Details
                                    </h5>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        Dispatched on {selectedCampaign.sentAt ? new Date(selectedCampaign.sentAt).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setSelectedCampaign(null)}
                                    aria-label="Close"
                                />
                            </div>

                            <div className="modal-body p-4">
                                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Subject Line:</div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>{selectedCampaign.subject}</div>
                                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, marginTop: '6px' }}>
                                        👥 {selectedCampaign.recipientsCount || 0} Recipients Reached
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Email Body Content:
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#ffffff', maxHeight: '380px', overflowY: 'auto' }}>
                                    <div dangerouslySetInnerHTML={{ __html: selectedCampaign.body }} />
                                </div>
                            </div>

                            <div className="modal-footer border-0 pt-0 pb-4 px-4" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-light fw-bold" 
                                    onClick={() => setSelectedCampaign(null)}
                                    style={{ padding: '8px 20px', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Subscribers Mail List Modal ── */}
            {showSubscribersModal && (
                <div 
                    className="modal fade show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '720px' }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            <div className="modal-header border-0 pb-2 pt-4 px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h5 className="modal-title font-weight-bold" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        Newsletter Subscribers List
                                    </h5>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        Total registered newsletter subscribers: {subscribers.length}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowSubscribersModal(false)}
                                    aria-label="Close"
                                />
                            </div>

                            <div className="modal-body p-4">
                                <div style={{ marginBottom: '16px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search subscriber email..."
                                        value={subscriberSearch}
                                        onChange={e => setSubscriberSearch(e.target.value)}
                                        className={styles['admin-form-input']}
                                        style={{ padding: '8px 14px', fontSize: '13px' }}
                                    />
                                </div>

                                {loadingSubscribers ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                        Loading subscribers registry...
                                    </div>
                                ) : filteredSubscribers.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        No subscribers found matching query.
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <table className={styles['usr-table']} style={{ width: '100%', margin: 0 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '10px 16px' }}>#</th>
                                                    <th style={{ padding: '10px 16px' }}>Subscriber Email</th>
                                                    <th style={{ padding: '10px 16px' }}>Date Subscribed</th>
                                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredSubscribers.map((sub, idx) => (
                                                    <tr key={sub._id}>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{idx + 1}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{sub.email}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                                                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSubscriber(sub._id, sub.email)}
                                                                className="admin-action-btn-delete"
                                                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                                                            >
                                                                Unsubscribe
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0 pt-0 pb-4 px-4" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-light fw-bold" 
                                    onClick={() => setShowSubscribersModal(false)}
                                    style={{ padding: '8px 20px', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bootstrap Confirmation Modal ── */}
            {showConfirmModal && (
                <div 
                    className="modal fade show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            <div className="modal-header border-0 pb-0 pt-4 px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h5 className="modal-title font-weight-bold" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    Confirm Campaign Broadcast
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowConfirmModal(false)}
                                    aria-label="Close"
                                />
                            </div>
                            <div className="modal-body p-4">
                                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                                    Are you sure you want to broadcast this email campaign to all registered buyers and newsletter subscribers?
                                </p>
                                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Subject:</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px', wordBreak: 'break-word' }}>{subject}</div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0 pb-4 px-4" style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-light fw-bold" 
                                    onClick={() => setShowConfirmModal(false)}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px', color: '#64748b', fontSize: '13px' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn fw-bold" 
                                    onClick={executeSendCampaign}
                                    disabled={sending}
                                    style={{ flex: 1.2, padding: '10px', borderRadius: '10px', background: 'var(--primary-color, #ff6a00)', color: '#fff', fontSize: '13px', border: 'none' }}
                                >
                                    {sending ? 'Broadcasting...' : 'Yes, Send Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNewsletter;

