import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import styles from './SupplierWallet.module.css'; // Reusing layout styles

const SupplierAds = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [myProducts, setMyProducts] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // Create campaign form states
    const [campaignName, setCampaignName] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [budgetType, setBudgetType] = useState('daily');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [cpcBid, setCpcBid] = useState('');
    const [cpmBid, setCpmBid] = useState('');
    const [campaignType, setCampaignType] = useState('cpc');
    const [keywords, setKeywords] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editCampaignId, setEditCampaignId] = useState<string | null>(null);

    useEffect(() => {
        fetchAdData();
    }, []);

    const fetchAdData = async () => {
        try {
            setLoading(true);
            const [campRes, prodRes, walletRes] = await Promise.all([
                api.get('/ads/campaigns'),
                api.get('/products/my/products?limit=100'),
                api.get('/auth/supplier/wallet')
            ]);
            setCampaigns(campRes.data || []);
            setMyProducts(prodRes.data?.products || []);
            setWalletBalance(walletRes.data?.balance || 0);
        } catch (err) {
            console.error('Error fetching ads data:', err);
            showToast('Failed to load ad campaign data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string, type = 'success') => {
        setToast({ show: true, message: msg, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    const handleSubmitCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        const budget = parseFloat(budgetAmount);
        const bid = campaignType === 'cpc' ? parseFloat(cpcBid) : parseFloat(cpmBid);

        if (!campaignName || !selectedProductId || isNaN(budget) || budget <= 0 || isNaN(bid) || bid <= 0) {
            return showToast('Please enter all required fields with valid amounts', 'error');
        }

        const requiredBalance = campaignType === 'cpc' ? bid : (bid / 1000);
        if (!editCampaignId && requiredBalance > walletBalance) {
            return showToast('Your wallet balance is too low to start this campaign', 'error');
        }

        setSubmitting(true);
        try {
            const keywordsArr = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
            const payload = {
                campaign_name: campaignName,
                product_id: selectedProductId,
                budget_type: budgetType,
                budget_amount: budget,
                campaign_type: campaignType,
                cpc_bid: campaignType === 'cpc' ? bid : 0,
                cpm_bid: campaignType === 'cpm' ? bid : 0,
                keywords: keywordsArr
            };

            if (editCampaignId) {
                await api.put(`/ads/campaigns/${editCampaignId}`, payload);
                showToast('Ad campaign updated successfully!');
            } else {
                await api.post('/ads/campaigns', payload);
                showToast('Ad campaign created successfully!');
            }

            // Reset form
            setCampaignName('');
            setSelectedProductId('');
            setBudgetAmount('');
            setCpcBid('');
            setCpmBid('');
            setKeywords('');
            setCampaignType('cpc');
            setEditCampaignId(null);
            setShowCreateForm(false);
            fetchAdData();
        } catch (err: any) {
            showToast(err.response?.data?.message || `Failed to ${editCampaignId ? 'update' : 'create'} campaign`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (camp: any) => {
        setEditCampaignId(camp._id);
        setCampaignName(camp.campaign_name || '');
        setSelectedProductId(camp.product_id?._id || camp.product_id || '');
        setBudgetType(camp.budget_type || 'daily');
        setBudgetAmount(camp.budget_amount ? camp.budget_amount.toString() : '');
        setCampaignType(camp.campaign_type || 'cpc');
        setCpcBid(camp.cpc_bid ? camp.cpc_bid.toString() : '');
        setCpmBid(camp.cpm_bid ? camp.cpm_bid.toString() : '');
        setKeywords(camp.keywords ? camp.keywords.join(', ') : '');
        setShowCreateForm(true);
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            await api.put(`/ads/campaigns/${id}`, { status: nextStatus });
            showToast(`Campaign status updated to ${nextStatus}`);
            fetchAdData();
        } catch (err) {
            showToast('Failed to update campaign status', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
                <p>Syncing Sponsoring Campaigns...</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'inherit' }}>
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px',
                    padding: '12px 24px', borderRadius: '10px',
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', fontWeight: 'bold', zIndex: 10000,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Wallet Balance Summary Card */}
            <div style={{
                background: 'linear-gradient(135deg, #0d2e67 0%, #1a2b4b 100%)',
                color: '#fff', borderRadius: '16px', padding: '24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 20px rgba(13,46,103,0.15)'
            }}>
                <div>
                    <span style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>PPC Wallet Balance</span>
                    <h1 style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#ffffff' }}>${walletBalance.toFixed(2)}</h1>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', opacity: 0.7, color: '#ffffff' }}>Fund campaign clicks directly from your standard store wallet balance.</p>
                </div>
                <button
                    onClick={() => {
                        if (showCreateForm) {
                            setEditCampaignId(null);
                            setCampaignName('');
                            setSelectedProductId('');
                            setBudgetAmount('');
                            setCpcBid('');
                            setCpmBid('');
                            setKeywords('');
                            setCampaignType('cpc');
                        }
                        setShowCreateForm(!showCreateForm);
                    }}
                    style={{
                        padding: '12px 20px',
                        background: '#ff6600',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(255,102,0,0.2)'
                    }}
                >
                    {showCreateForm ? 'View Campaigns' : 'Create Sponsored Ad'}
                </button>
            </div>

            {showCreateForm ? (
                /* CREATE CAMPAIGN FORM */
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontWeight: 800 }}>
                        {editCampaignId ? 'Edit Sponsored Product Campaign' : 'Start Sponsored Product Campaign'}
                    </h3>
                    <form onSubmit={handleSubmitCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Campaign Name *</label>
                            <input
                                type="text"
                                placeholder="E.g., Summer Promotion Shirts"
                                value={campaignName}
                                onChange={e => setCampaignName(e.target.value)}
                                required
                                style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Select Product *</label>
                            <select
                                value={selectedProductId}
                                onChange={e => setSelectedProductId(e.target.value)}
                                required
                                disabled={!!editCampaignId}
                                style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none', cursor: editCampaignId ? 'not-allowed' : 'pointer', backgroundColor: editCampaignId ? '#f1f5f9' : '#fff' }}
                            >
                                <option value="">-- Choose one of your active products --</option>
                                {myProducts.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} (${p.main_price})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Budget Type</label>
                                <select
                                    value={budgetType}
                                    onChange={e => setBudgetType(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                                >
                                    <option value="daily">Daily Budget</option>
                                    <option value="lifetime">Lifetime Budget</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Budget Amount ($) *</label>
                                <input
                                    type="number"
                                    placeholder="50.00"
                                    min="1"
                                    step="0.01"
                                    value={budgetAmount}
                                    onChange={e => setBudgetAmount(e.target.value)}
                                    required
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Campaign Type</label>
                                <select
                                    value={campaignType}
                                    onChange={e => setCampaignType(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                                >
                                    <option value="cpc">CPC (Cost Per Click)</option>
                                    <option value="cpm">CPM (Cost Per Mille)</option>
                                </select>
                            </div>
                            <div>
                                {campaignType === 'cpc' ? (
                                    <>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>CPC Bid ($) *</label>
                                        <input
                                            type="number"
                                            placeholder="0.50"
                                            min="0.01"
                                            step="0.01"
                                            value={cpcBid}
                                            onChange={e => setCpcBid(e.target.value)}
                                            required
                                            style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>CPM Bid ($ per 1000 views) *</label>
                                        <input
                                            type="number"
                                            placeholder="2.00"
                                            min="0.01"
                                            step="0.01"
                                            value={cpmBid}
                                            onChange={e => setCpmBid(e.target.value)}
                                            required
                                            style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '-8px', display: 'block' }}>
                            {campaignType === 'cpc'
                                ? 'Maximum amount deducted from your wallet per buyer click.'
                                : 'Amount deducted from your wallet per 1,000 views (impressions) of this product.'
                            }
                        </span>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Keywords (Comma-separated)</label>
                            <input
                                type="text"
                                placeholder="E.g., shirts, summer, cotton, organic"
                                value={keywords}
                                onChange={e => setKeywords(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                            />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Buyers searching these terms will see this product promoted at the top.</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: '12px 24px',
                                    background: 'var(--primary-color, #0d2e67)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                {submitting ? (editCampaignId ? 'Updating Campaign...' : 'Creating Campaign...') : (editCampaignId ? 'Save Changes' : 'Launch Ad')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditCampaignId(null);
                                    setCampaignName('');
                                    setSelectedProductId('');
                                    setBudgetAmount('');
                                    setCpcBid('');
                                    setCpmBid('');
                                    setKeywords('');
                                    setCampaignType('cpc');
                                    setShowCreateForm(false);
                                }}
                                style={{
                                    padding: '12px 24px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* CAMPAIGNS LISTING TABLE */
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontWeight: 800 }}>Sponsorship Ad Campaigns</h3>
                    {campaigns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                            <p style={{ fontWeight: '600' }}>No active keyword sponsorship campaigns.</p>
                            <p style={{ fontSize: '13px' }}>Click "Create Sponsored Ad" above to promote your products in search results.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                                        <th style={{ padding: '12px 8px' }}>Campaign Name</th>
                                        <th style={{ padding: '12px 8px' }}>Product</th>
                                        <th style={{ padding: '12px 8px' }}>Type</th>
                                        <th style={{ padding: '12px 8px' }}>Bid</th>
                                        <th style={{ padding: '12px 8px' }}>Spent / Budget</th>
                                        <th style={{ padding: '12px 8px' }}>Impressions</th>
                                        <th style={{ padding: '12px 8px' }}>Clicks</th>
                                        <th style={{ padding: '12px 8px' }}>Status</th>
                                        <th style={{ padding: '12px 8px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map(camp => (
                                        <tr key={camp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: '700', color: '#0f172a' }}>{camp.campaign_name}</td>
                                            <td style={{ padding: '12px 8px', color: '#64748b' }}>{camp.product_id?.name || 'Deleted Product'}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: '700', color: '#64748b' }}>{camp.campaign_type ? camp.campaign_type.toUpperCase() : 'CPC'}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                                                {camp.campaign_type === 'cpm' ? `$${camp.cpm_bid?.toFixed(2)} CPM` : `$${camp.cpc_bid?.toFixed(2)} CPC`}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div style={{ fontWeight: '700', color: '#0f172a' }}>${camp.spent_amount.toFixed(2)}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{camp.budget_type === 'daily' ? 'Daily' : 'Lifetime'} limit: ${camp.budget_amount}</div>
                                            </td>
                                            <td style={{ padding: '12px 8px', color: '#64748b' }}>{camp.impressions}</td>
                                            <td style={{ padding: '12px 8px', color: '#64748b' }}>{camp.clicks}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    background: camp.status === 'active' ? '#e8fdf0' : (camp.status === 'paused' ? '#fffbeb' : '#fee2e2'),
                                                    color: camp.status === 'active' ? '#10b981' : (camp.status === 'paused' ? '#d97706' : '#ef4444')
                                                }}>
                                                    {camp.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleToggleStatus(camp._id, camp.status)}
                                                        disabled={camp.status === 'exhausted' || camp.status === 'completed'}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: camp.status === 'active' ? '#fffbeb' : '#e8fdf0',
                                                            color: camp.status === 'active' ? '#d97706' : '#10b981',
                                                            border: '1px solid currentColor',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: '700',
                                                            fontSize: '11px',
                                                            opacity: (camp.status === 'exhausted' || camp.status === 'completed') ? 0.5 : 1
                                                        }}
                                                    >
                                                        {camp.status === 'active' ? 'Pause' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(camp)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: '#f1f5f9',
                                                            color: '#475569',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: '700',
                                                            fontSize: '11px'
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SupplierAds;
