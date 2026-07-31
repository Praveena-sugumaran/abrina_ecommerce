import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';

interface Subscriber {
    _id: string;
    email: string;
    subscribedAt: string;
}

interface Campaign {
    _id: string;
    subject: string;
    body: string;
    recipientsCount: number;
    sentAt: string;
}

const SupplierNewsletter = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('subscribers');
    
    // Subscribers state
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loadingSubscribers, setLoadingSubscribers] = useState(false);
    const [addingSubscriber, setAddingSubscriber] = useState(false);

    // Campaigns state
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [campaignSubject, setCampaignSubject] = useState('');
    const [campaignBody, setCampaignBody] = useState('');
    const [sendingCampaign, setSendingCampaign] = useState(false);

    useEffect(() => {
        if (activeTab === 'subscribers') {
            fetchSubscribers();
        } else {
            fetchCampaigns();
        }
    }, [activeTab]);

    const fetchSubscribers = async () => {
        setLoadingSubscribers(true);
        try {
            const { data } = await api.get('/newsletter/subscribers');
            setSubscribers(data || []);
        } catch (err: any) {
            console.error('Error fetching subscribers:', err);
            showToast('Failed to load newsletter subscribers', 'error');
        } finally {
            setLoadingSubscribers(false);
        }
    };

    const fetchCampaigns = async () => {
        setLoadingCampaigns(true);
        try {
            const { data } = await api.get('/newsletter/campaigns');
            setCampaigns(data || []);
        } catch (err: any) {
            console.error('Error fetching campaigns:', err);
            showToast('Failed to load campaign history', 'error');
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const handleAddSubscriber = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setAddingSubscriber(true);
        try {
            await api.post('/newsletter/subscribe', { email: newEmail.trim() });
            showToast('Subscriber added successfully', 'success');
            setNewEmail('');
            fetchSubscribers();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to add subscriber', 'error');
        } finally {
            setAddingSubscriber(false);
        }
    };

    const handleRemoveSubscriber = async (id: string) => {
        if (!window.confirm('Are you sure you want to unsubscribe this email address?')) return;
        try {
            await api.delete(`/newsletter/subscribers/${id}`);
            showToast('Subscriber unsubscribed successfully', 'success');
            setSubscribers(subscribers.filter(sub => sub._id !== id));
        } catch (err: any) {
            showToast('Failed to unsubscribe', 'error');
        }
    };

    const handleSendCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignSubject.trim() || !campaignBody.trim()) {
            showToast('Please enter both subject and body', 'error');
            return;
        }
        setSendingCampaign(true);
        try {
            const { data } = await api.post('/newsletter/campaign/send', {
                subject: campaignSubject.trim(),
                body: campaignBody.trim()
            });
            showToast(data.message || 'Newsletter campaign sent successfully!', 'success');
            setShowComposeModal(false);
            setCampaignSubject('');
            setCampaignBody('');
            fetchCampaigns();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to dispatch campaign', 'error');
        } finally {
            setSendingCampaign(false);
        }
    };

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            fontFamily: "'Segoe UI', Roboto, sans-serif"
        }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Newsletter & Campaigns
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                        Manage newsletter subscriptions and compose marketing mail campaigns to active subscribers.
                    </p>
                </div>
                {activeTab === 'campaigns' && (
                    <button
                        onClick={() => setShowComposeModal(true)}
                        style={{
                            background: 'var(--primary-color, #ff6600)',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        Compose Campaign
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('subscribers')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'subscribers' ? '#fff7ed' : 'transparent',
                        color: activeTab === 'subscribers' ? '#ea580c' : '#64748b',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Subscribers ({subscribers.length})
                </button>
                <button
                    onClick={() => setActiveTab('campaigns')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'campaigns' ? '#fff7ed' : 'transparent',
                        color: activeTab === 'campaigns' ? '#ea580c' : '#64748b',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Campaign History ({campaigns.length})
                </button>
            </div>

            {/* Tab contents */}
            {activeTab === 'subscribers' ? (
                <div>
                    {/* Add Subscriber Form */}
                    <form onSubmit={handleAddSubscriber} style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="email"
                                required
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="Enter subscriber email address..."
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    background: '#fff'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={addingSubscriber}
                            style={{
                                background: '#1e293b',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            {addingSubscriber ? 'Adding...' : 'Add Subscriber'}
                        </button>
                    </form>

                    {/* Subscriber Table */}
                    {loadingSubscribers ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                            Loading subscriber list...
                        </div>
                    ) : subscribers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                            No subscribers registered in the registry.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                        <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Email Address</th>
                                        <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Subscribed At</th>
                                        <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscribers.map(sub => (
                                        <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontSize: '0.875rem', color: '#0f172a', fontWeight: 600 }}>{sub.email}</td>
                                            <td style={{ padding: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                                                {new Date(sub.subscribedAt).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleRemoveSubscriber(sub._id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontWeight: 700,
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer'
                                                    }}
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
            ) : (
                <div>
                    {/* Campaign list */}
                    {loadingCampaigns ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                            Loading campaign history...
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                            No mail campaigns sent yet. Click "Compose Campaign" to dispatch one!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {campaigns.map(camp => (
                                <div
                                    key={camp._id}
                                    style={{
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                                {camp.subject}
                                            </h3>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                                                Sent: {new Date(camp.sentAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div style={{
                                            background: '#eff6ff',
                                            color: '#1d4ed8',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            border: '1px solid #bfdbfe'
                                        }}>
                                            Recipients: {camp.recipientsCount}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#334155',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        background: '#fff',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {camp.body}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Compose Campaign Modal */}
            {showComposeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '600px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                Compose Newsletter Campaign
                            </h3>
                            <button
                                onClick={() => setShowComposeModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSendCampaign} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Subject *</label>
                                <input
                                    type="text"
                                    required
                                    value={campaignSubject}
                                    onChange={e => setCampaignSubject(e.target.value)}
                                    placeholder="e.g. Weekly Hot Sale Alerts - Up to 50% Off!"
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        background: '#fff'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Message Body *</label>
                                <textarea
                                    required
                                    rows={8}
                                    value={campaignBody}
                                    onChange={e => setCampaignBody(e.target.value)}
                                    placeholder="Write your email contents here. HTML styling will be automatically applied to match our premium template!"
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowComposeModal(false)}
                                    style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingCampaign}
                                    style={{
                                        background: sendingCampaign ? '#cbd5e1' : 'var(--primary-color, #ff6600)',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {sendingCampaign ? 'Sending...' : 'Send Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierNewsletter;
