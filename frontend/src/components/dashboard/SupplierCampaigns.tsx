import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

interface Product {
    _id: string;
    name: string;
    slug: string;
}

interface Coupon {
    _id: string;
    code: string;
}

interface Buyer {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    company_name?: string;
}

interface CrmLead {
    _id: string;
    buyer_id: Buyer;
    status: string;
}

interface Campaign {
    _id: string;
    name: string;
    type: 'email' | 'affiliate' | 'sms';
    target_type: 'product' | 'shop';
    target_product_id: Product | null;
    coupon_code: string;
    email_subject?: string;
    email_body?: string;
    target_emails?: string[];
    sms_body?: string;
    target_phones?: string[];
    referral_code?: string;
    clicks: number;
    referred_orders_count: number;
    referred_sales_amount: number;
    status: 'active' | 'completed' | 'cancelled';
    sent_at?: string;
    createdAt: string;
}

const emptyCampaignForm = {
    name: '',
    type: 'email' as 'email' | 'affiliate' | 'sms',
    target_type: 'shop' as 'product' | 'shop',
    target_product_id: '',
    coupon_code: '',
    email_subject: '',
    email_body: '',
    target_emails: '',
    sms_body: '',
    target_phones: ''
};

const SupplierCampaigns = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyCampaignForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // CRM Leads and dropdown selection states
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
    const [isManualInput, setIsManualInput] = useState(false);
    const [dropdownSearch, setDropdownSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        fetchCampaigns();
        fetchResources();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/campaigns');
            setCampaigns(data || []);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to load campaigns', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchResources = async () => {
        try {
            const [prodRes, coupRes, leadRes] = await Promise.allSettled([
                api.get('/products/my/products?limit=1000'),
                api.get('/coupons'),
                api.get('/crm/leads')
            ]);

            if (prodRes.status === 'fulfilled') {
                setProducts(prodRes.value.data?.products || prodRes.value.data || []);
            }
            if (coupRes.status === 'fulfilled') {
                setCoupons(coupRes.value.data || []);
            }
            if (leadRes.status === 'fulfilled') {
                setLeads(leadRes.value.data || []);
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
        }
    };

    const togglePhoneSelection = (phone: string) => {
        if (selectedPhones.includes(phone)) {
            setSelectedPhones(selectedPhones.filter(p => p !== phone));
        } else {
            setSelectedPhones([...selectedPhones, phone]);
        }
    };

    const openCreateModal = () => {
        setForm(emptyCampaignForm);
        setSelectedEmails([]);
        setSelectedPhones([]);
        setIsManualInput(false);
        setDropdownSearch('');
        setIsDropdownOpen(false);
        setShowModal(true);
    };

    const filteredBuyers = leads
        .map(lead => lead.buyer_id)
        .filter((buyer): buyer is Buyer => {
            if (!buyer) return false;
            if (form.type === 'sms') return !!buyer.phone_number;
            return !!buyer.email;
        })
        .filter(buyer => {
            const query = dropdownSearch.toLowerCase();
            const contactMatch = form.type === 'sms' 
                ? (buyer.phone_number || '').toLowerCase().includes(query)
                : buyer.email.toLowerCase().includes(query);
            return (
                buyer.first_name.toLowerCase().includes(query) ||
                buyer.last_name.toLowerCase().includes(query) ||
                contactMatch ||
                (buyer.company_name || '').toLowerCase().includes(query)
            );
        });

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this campaign? This action is permanent.')) return;
        try {
            await api.delete(`/campaigns/${id}`);
            setCampaigns(campaigns.filter(c => c._id !== id));
            showToast('Campaign deleted successfully', 'success');
        } catch (err: any) {
            showToast('Failed to delete campaign', 'error');
        }
    };

    const toggleEmailSelection = (email: string) => {
        if (selectedEmails.includes(email)) {
            setSelectedEmails(selectedEmails.filter(e => e !== email));
        } else {
            setSelectedEmails([...selectedEmails, email]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let targetEmailsArr: string[] = [];
            let targetPhonesArr: string[] = [];

            if (form.type === 'email') {
                if (isManualInput) {
                    targetEmailsArr = form.target_emails
                        .split(',')
                        .map(email => email.trim())
                        .filter(email => email.length > 0);
                } else {
                    targetEmailsArr = selectedEmails;
                }

                if (targetEmailsArr.length === 0) {
                    showToast('Please select or provide at least one valid recipient email', 'error');
                    setSubmitting(false);
                    return;
                }
            } else if (form.type === 'sms') {
                if (isManualInput) {
                    targetPhonesArr = form.target_phones
                        .split(',')
                        .map(phone => phone.trim())
                        .filter(phone => phone.length > 0);
                } else {
                    targetPhonesArr = selectedPhones;
                }

                if (targetPhonesArr.length === 0) {
                    showToast('Please select or provide at least one valid recipient phone number', 'error');
                    setSubmitting(false);
                    return;
                }

                if (!form.sms_body || form.sms_body.trim() === '') {
                    showToast('Please write an SMS message body', 'error');
                    setSubmitting(false);
                    return;
                }
            }

            const payload = {
                name: form.name,
                type: form.type,
                target_type: form.target_type,
                target_product_id: form.target_type === 'product' ? form.target_product_id : undefined,
                coupon_code: form.coupon_code || undefined,
                email_subject: form.type === 'email' ? form.email_subject : undefined,
                email_body: form.type === 'email' ? form.email_body : undefined,
                target_emails: form.type === 'email' ? targetEmailsArr : undefined,
                sms_body: form.type === 'sms' ? form.sms_body : undefined,
                target_phones: form.type === 'sms' ? targetPhonesArr : undefined
            };

            const { data } = await api.post('/campaigns', payload);
            setCampaigns([data, ...campaigns]);
            showToast(
                form.type === 'email' 
                    ? 'Promotional email campaign dispatched successfully!' 
                    : form.type === 'sms'
                        ? 'Promotional SMS campaign dispatched successfully!'
                        : 'Affiliate campaign generated successfully!',
                'success'
            );
            setShowModal(false);
            setForm(emptyCampaignForm);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to create campaign', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getReferralUrl = (campaign: Campaign) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        if (campaign.target_type === 'product' && campaign.target_product_id) {
            return `${origin}/product/${campaign.target_product_id.slug}?ref=${campaign.referral_code}`;
        }
        return `${origin}?ref=${campaign.referral_code}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Referral link copied to clipboard!', 'success');
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid #ff6600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
                <div>Loading marketing campaigns...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-card-container" style={{ minHeight: '500px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                        Email & Affiliate Campaigns
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        Create external promotional campaigns and track clicks, referred orders, and direct sales revenue.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)' }}
                >
                    + Create Campaign
                </button>
            </div>

            {/* Campaign Metrics Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {[
                    {
                        label: 'Total Campaigns',
                        value: campaigns.length,
                        color: '#f8fafc',
                        border: '#e2e8f0'
                    },
                    {
                        label: 'Total Affiliate Clicks',
                        value: campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0),
                        color: '#eff6ff',
                        border: '#bfdbfe'
                    },
                    {
                        label: 'Referred Orders',
                        value: campaigns.reduce((acc, c) => acc + (c.referred_orders_count || 0), 0),
                        color: '#f0fdf4',
                        border: '#bbf7d0'
                    },
                    {
                        label: 'Attributed Sales',
                        value: `$${campaigns.reduce((acc, c) => acc + (c.referred_sales_amount || 0), 0).toFixed(2)}`,
                        color: '#fffbeb',
                        border: '#fde68a'
                    }
                ].map((card, i) => (
                    <div key={i} style={{ background: card.color, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
                        <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{card.value}</span>
                    </div>
                ))}
            </div>

            {/* Campaigns Table */}
            {campaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No Active Campaigns</h4>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Launch affiliate links or design professional promotional email blasts to market your products.
                    </p>
                    <button 
                        onClick={openCreateModal} 
                        style={{ background: 'var(--primary-color, #ff6600)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        Create First Campaign
                    </button>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['Campaign Info', 'Type', 'Target Details', 'Incentive', 'Performance / Status', 'Created', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '14px 20px', fontWeight: 700, color: '#475569' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map(camp => {
                                const isEmail = camp.type === 'email';
                                return (
                                    <tr key={camp._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{camp.name}</div>
                                            {camp.referral_code && (
                                                <div style={{ fontSize: '0.75rem', color: '#ff6600', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
                                                    {camp.referral_code}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '99px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: camp.type === 'email' ? '#e0f2fe' : camp.type === 'sms' ? '#dcfce7' : '#fbe5d6',
                                                color: camp.type === 'email' ? '#0369a1' : camp.type === 'sms' ? '#15803d' : '#c2410c',
                                                textTransform: 'capitalize'
                                            }}>
                                                {camp.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                                                Target: {camp.target_type}
                                            </div>
                                            {camp.target_type === 'product' && camp.target_product_id ? (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                    {camp.target_product_id.name}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                                            {camp.coupon_code ? (
                                                <span style={{ border: '1px dashed #fdba74', background: '#fff7ed', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {camp.coupon_code}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#cbd5e1' }}>None</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {camp.type === 'email' ? (
                                                <div style={{ color: '#64748b' }}>
                                                    Sent to <strong>{camp.target_emails?.length || 0}</strong> buyers
                                                </div>
                                            ) : camp.type === 'sms' ? (
                                                <div style={{ color: '#64748b' }}>
                                                    Sent to <strong>{camp.target_phones?.length || 0}</strong> numbers
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div><strong>{camp.clicks}</strong> Clicks</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                                                        <strong>{camp.referred_orders_count}</strong> orders (${camp.referred_sales_amount.toFixed(2)})
                                                    </div>
                                                </div>
                                            )}
                                            <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', color: camp.status === 'active' ? '#16a34a' : '#64748b' }}>
                                                ● {camp.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.8rem' }}>
                                            {new Date(camp.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {!isEmail && camp.referral_code && (
                                                    <button
                                                        onClick={() => copyToClipboard(getReferralUrl(camp))}
                                                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', color: '#1e293b' }}
                                                    >
                                                        Copy Link
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(camp._id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Campaign Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                                Launch New Campaign
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Campaign Name *</label>
                                    <input
                                        required
                                        type="text"
                                        style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                        value={form.name}
                                        onChange={e => setForm({...form, name: e.target.value})}
                                        placeholder="e.g. Summer Sourcing Promo"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Campaign Type *</label>
                                        <select
                                            style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                            value={form.type}
                                            onChange={e => setForm({...form, type: e.target.value as any})}
                                        >
                                            <option value="email">Email Blast</option>
                                            <option value="sms">SMS Blast</option>
                                            <option value="affiliate">Affiliate / Referral Link</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Target Offer *</label>
                                        <select
                                            style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                            value={form.target_type}
                                            onChange={e => setForm({...form, target_type: e.target.value as 'product' | 'shop'})}
                                        >
                                            <option value="shop">Entire Shop</option>
                                            <option value="product">Specific Product</option>
                                        </select>
                                    </div>
                                </div>

                                {form.target_type === 'product' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Select Product *</label>
                                        <select
                                            required
                                            style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                            value={form.target_product_id}
                                            onChange={e => setForm({...form, target_product_id: e.target.value})}
                                        >
                                            <option value="">-- Choose one of your products --</option>
                                            {products.map(p => (
                                                <option key={p._id} value={p._id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Attach Incentive Coupon (Optional)</label>
                                    <select
                                        style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                        value={form.coupon_code}
                                        onChange={e => setForm({...form, coupon_code: e.target.value})}
                                    >
                                        <option value="">-- No Coupon Attached --</option>
                                        {coupons.map(c => (
                                            <option key={c._id} value={c.code}>{c.code}</option>
                                        ))}
                                    </select>
                                </div>

                                {form.type === 'email' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Recipient Emails *</span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                                    {isManualInput ? 'Manual Entry Mode' : 'CRM Selection Mode'}
                                                </span>
                                            </label>

                                            {/* Mode Toggle Button Segment */}
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsManualInput(false)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: !isManualInput ? '#fbe5d6' : '#fff',
                                                        color: !isManualInput ? '#c2410c' : '#475569',
                                                        borderColor: !isManualInput ? '#fdba74' : '#cbd5e1',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    Select CRM Buyers ({leads.length})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsManualInput(true)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: isManualInput ? '#fbe5d6' : '#fff',
                                                        color: isManualInput ? '#c2410c' : '#475569',
                                                        borderColor: isManualInput ? '#fdba74' : '#cbd5e1',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    Enter Manually
                                                </button>
                                            </div>

                                            {isManualInput ? (
                                                <textarea
                                                    required
                                                    rows={2}
                                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                                    value={form.target_emails}
                                                    onChange={e => setForm({...form, target_emails: e.target.value})}
                                                    placeholder="Enter recipient email addresses, comma-separated (e.g. buyer1@co.com, buyer2@global.com)"
                                                />
                                            ) : (
                                                <div style={{ position: 'relative' }}>
                                                    {/* Dropdown Click Trigger */}
                                                    <div
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            fontSize: '0.875rem',
                                                            background: '#fff',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            minHeight: '42px',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <span style={{ color: selectedEmails.length > 0 ? '#0f172a' : '#64748b', fontWeight: selectedEmails.length > 0 ? 600 : 400 }}>
                                                            {selectedEmails.length > 0
                                                                ? `${selectedEmails.length} buyer(s) selected`
                                                                : 'Select buyer emails...'}
                                                        </span>
                                                        <span style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', color: '#64748b', fontSize: '10px' }}>
                                                            ▼
                                                        </span>
                                                    </div>

                                                    {/* Outside Click Invisible Overlay */}
                                                    {isDropdownOpen && (
                                                        <div 
                                                            onClick={() => setIsDropdownOpen(false)}
                                                            style={{
                                                                position: 'fixed',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                zIndex: 9,
                                                                background: 'transparent'
                                                            }}
                                                        />
                                                    )}

                                                    {/* Dropdown Content */}
                                                    {isDropdownOpen && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 4px)',
                                                            left: 0,
                                                            right: 0,
                                                            background: '#ffffff',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                            zIndex: 10,
                                                            maxHeight: '260px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {/* Search Bar */}
                                                            <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                                                <input
                                                                    type="text"
                                                                    value={dropdownSearch}
                                                                    onChange={e => setDropdownSearch(e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    placeholder="Search by name, email, or company..."
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.8rem',
                                                                        outline: 'none',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Quick Selection Buttons */}
                                                            <div style={{ display: 'flex', gap: '8px', padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const matching = filteredBuyers.map(b => b.email);
                                                                        setSelectedEmails(Array.from(new Set([...selectedEmails, ...matching])));
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color, #ff6600)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Select All Visible
                                                                </button>
                                                                <span style={{ color: '#cbd5e1' }}>|</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const matching = filteredBuyers.map(b => b.email);
                                                                        setSelectedEmails(selectedEmails.filter(email => !matching.includes(email)));
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Deselect All Visible
                                                                </button>
                                                            </div>

                                                            {/* Options List */}
                                                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                                                {filteredBuyers.length === 0 ? (
                                                                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                                                                        {leads.length === 0 ? 'No buyers in CRM leads database' : 'No matching buyers found'}
                                                                    </div>
                                                                ) : (
                                                                    filteredBuyers.map(buyer => {
                                                                        const isSelected = selectedEmails.includes(buyer.email);
                                                                        return (
                                                                            <div
                                                                                key={buyer._id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleEmailSelection(buyer.email);
                                                                                }}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '10px',
                                                                                    padding: '8px 12px',
                                                                                    cursor: 'pointer',
                                                                                    background: isSelected ? '#fffaf0' : '#fff',
                                                                                    borderBottom: '1px solid #f8fafc',
                                                                                    transition: 'background 0.15s'
                                                                                }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#fffaf0' : '#fff'}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {}}
                                                                                    style={{ cursor: 'pointer', accentColor: '#ff6600' }}
                                                                                />
                                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                        {buyer.first_name} {buyer.last_name}
                                                                                        {buyer.company_name ? ` (${buyer.company_name})` : ''}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                                        {buyer.email}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Selected Pills */}
                                            {!isManualInput && selectedEmails.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    marginTop: '8px',
                                                    maxHeight: '120px',
                                                    overflowY: 'auto',
                                                    padding: '6px',
                                                    background: '#f8fafc',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1'
                                                }}>
                                                    {selectedEmails.map(email => {
                                                        const lead = leads.find(l => l.buyer_id?.email === email);
                                                        const name = lead?.buyer_id ? `${lead.buyer_id.first_name} ${lead.buyer_id.last_name}` : email;
                                                        return (
                                                            <div
                                                                key={email}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    background: '#eff6ff',
                                                                    color: '#1d4ed8',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    border: '1px solid #bfdbfe'
                                                                }}
                                                            >
                                                                <span>{name} ({email})</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleEmailSelection(email)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#1d4ed8',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        padding: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Subject *</label>
                                            <input
                                                required
                                                type="text"
                                                style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                                value={form.email_subject}
                                                onChange={e => setForm({...form, email_subject: e.target.value})}
                                                placeholder="e.g. Exclusive Wholesale Prices & Coupons Just for You"
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Body Content (Markdown supported) *</label>
                                            <textarea
                                                required
                                                rows={5}
                                                style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                                value={form.email_body}
                                                onChange={e => setForm({...form, email_body: e.target.value})}
                                                placeholder="Write your email body. We will automatically inject a beautiful product card and/or dashed coupon ticket if you linked them above."
                                            />
                                        </div>
                                    </>
                                )}

                                {form.type === 'sms' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Recipient Phone Numbers *</span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                                    {isManualInput ? 'Manual Entry Mode' : 'CRM Selection Mode'}
                                                </span>
                                            </label>

                                            {/* Mode Toggle Button Segment */}
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsManualInput(false); setDropdownSearch(''); }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: !isManualInput ? '#fbe5d6' : '#fff',
                                                        color: !isManualInput ? '#c2410c' : '#475569',
                                                        borderColor: !isManualInput ? '#fdba74' : '#cbd5e1',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    Select CRM Buyers ({leads.filter(l => l.buyer_id?.phone_number).length})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsManualInput(true); setDropdownSearch(''); }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: isManualInput ? '#fbe5d6' : '#fff',
                                                        color: isManualInput ? '#c2410c' : '#475569',
                                                        borderColor: isManualInput ? '#fdba74' : '#cbd5e1',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    Enter Manually
                                                </button>
                                            </div>

                                            {isManualInput ? (
                                                <textarea
                                                    required
                                                    rows={2}
                                                    style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                                    value={form.target_phones}
                                                    onChange={e => setForm({...form, target_phones: e.target.value})}
                                                    placeholder="Enter recipient phone numbers, comma-separated (e.g. +16592206729, +918248710795)"
                                                />
                                            ) : (
                                                <div style={{ position: 'relative' }}>
                                                    {/* Dropdown Click Trigger */}
                                                    <div
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            fontSize: '0.875rem',
                                                            background: '#fff',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            minHeight: '42px',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <span style={{ color: selectedPhones.length > 0 ? '#0f172a' : '#64748b', fontWeight: selectedPhones.length > 0 ? 600 : 400 }}>
                                                            {selectedPhones.length > 0
                                                                ? `${selectedPhones.length} buyer(s) selected`
                                                                : 'Select buyer phones...'}
                                                        </span>
                                                        <span style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', color: '#64748b', fontSize: '10px' }}>
                                                            ▼
                                                        </span>
                                                    </div>

                                                    {/* Outside Click Invisible Overlay */}
                                                    {isDropdownOpen && (
                                                        <div 
                                                            onClick={() => setIsDropdownOpen(false)}
                                                            style={{
                                                                position: 'fixed',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                zIndex: 9,
                                                                background: 'transparent'
                                                            }}
                                                        />
                                                    )}

                                                    {/* Dropdown Content */}
                                                    {isDropdownOpen && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 4px)',
                                                            left: 0,
                                                            right: 0,
                                                            background: '#ffffff',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                            zIndex: 10,
                                                            maxHeight: '260px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {/* Search Bar */}
                                                            <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                                                <input
                                                                    type="text"
                                                                    value={dropdownSearch}
                                                                    onChange={e => setDropdownSearch(e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    placeholder="Search by name, phone, or company..."
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.8rem',
                                                                        outline: 'none',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Quick Selection Buttons */}
                                                            <div style={{ display: 'flex', gap: '8px', padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const matching = filteredBuyers.map(b => b.phone_number || '').filter(Boolean);
                                                                        setSelectedPhones(Array.from(new Set([...selectedPhones, ...matching])));
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color, #ff6600)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Select All Visible
                                                                </button>
                                                                <span style={{ color: '#cbd5e1' }}>|</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const matching = filteredBuyers.map(b => b.phone_number || '').filter(Boolean);
                                                                        setSelectedPhones(selectedPhones.filter(phone => !matching.includes(phone)));
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Deselect All Visible
                                                                </button>
                                                            </div>

                                                            {/* Options List */}
                                                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                                                {filteredBuyers.length === 0 ? (
                                                                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                                                                        {leads.length === 0 ? 'No buyers in CRM leads database' : 'No matching buyers found'}
                                                                    </div>
                                                                ) : (
                                                                    filteredBuyers.map(buyer => {
                                                                        const isSelected = selectedPhones.includes(buyer.phone_number || '');
                                                                        return (
                                                                            <div
                                                                                key={buyer._id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    togglePhoneSelection(buyer.phone_number || '');
                                                                                }}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '10px',
                                                                                    padding: '8px 12px',
                                                                                    cursor: 'pointer',
                                                                                    background: isSelected ? '#fffaf0' : '#fff',
                                                                                    borderBottom: '1px solid #f8fafc',
                                                                                    transition: 'background 0.15s'
                                                                                }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#fffaf0' : '#fff'}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {}}
                                                                                    style={{ cursor: 'pointer', accentColor: '#ff6600' }}
                                                                                />
                                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                        {buyer.first_name} {buyer.last_name}
                                                                                        {buyer.company_name ? ` (${buyer.company_name})` : ''}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                                        {buyer.phone_number}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Selected Pills */}
                                            {!isManualInput && selectedPhones.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    marginTop: '8px',
                                                    maxHeight: '120px',
                                                    overflowY: 'auto',
                                                    padding: '6px',
                                                    background: '#f8fafc',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1'
                                                }}>
                                                    {selectedPhones.map(phone => {
                                                        const lead = leads.find(l => l.buyer_id?.phone_number === phone);
                                                        const name = lead?.buyer_id ? `${lead.buyer_id.first_name} ${lead.buyer_id.last_name}` : phone;
                                                        return (
                                                            <div
                                                                key={phone}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    background: '#eff6ff',
                                                                    color: '#1d4ed8',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    border: '1px solid #bfdbfe'
                                                                }}
                                                            >
                                                                <span>{name} ({phone})</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePhoneSelection(phone)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#1d4ed8',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        padding: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>SMS Message Body *</label>
                                            <textarea
                                                required
                                                rows={4}
                                                style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                                value={form.sms_body}
                                                onChange={e => setForm({...form, sms_body: e.target.value})}
                                                placeholder="Enter SMS message content. Keep it short and punchy for mobile alerts!"
                                            />
                                        </div>
                                    </>
                                )}

                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ background: submitting ? '#cbd5e1' : 'var(--primary-color, #ff6600)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    {submitting ? 'Processing...' : form.type === 'email' ? 'Dispatch Emails' : 'Generate Link'}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierCampaigns;
