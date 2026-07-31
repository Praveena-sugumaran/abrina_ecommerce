import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import styles from './AdminLayout.module.css';

interface Campaign {
    _id?: string;
    title: string;
    subtitle: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt?: string;
}

const emptyForm = {
    title: '',
    subtitle: '',
    startDate: '',
    endDate: '',
    isActive: true
};

const AdminCampaigns = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/sale-campaigns');
            setCampaigns(data || []);
        } catch (err: any) {
            console.error('Failed to fetch campaigns:', err);
            showToast('Failed to load campaigns', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this campaign?')) return;
        try {
            await api.delete(`/sale-campaigns/${id}`);
            setCampaigns(campaigns.filter(c => c._id !== id));
            showToast('Campaign deleted successfully', 'success');
        } catch (err: any) {
            showToast('Failed to delete campaign', 'error');
        }
    };

    const handleEdit = (campaign: Campaign) => {
        // Format dates to YYYY-MM-DDThh:mm for datetime-local input
        const formatDateTime = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setForm({
            title: campaign.title,
            subtitle: campaign.subtitle || '',
            startDate: formatDateTime(campaign.startDate),
            endDate: formatDateTime(campaign.endDate),
            isActive: campaign.isActive
        });
        setEditingId(campaign._id || null);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (new Date(form.startDate) >= new Date(form.endDate)) {
            showToast('End date/time must be after start date/time', 'error');
            return;
        }

        try {
            if (editingId) {
                const { data } = await api.put(`/sale-campaigns/${editingId}`, form);
                setCampaigns(campaigns.map(c => c._id === editingId ? data : c));
                showToast('Campaign updated successfully', 'success');
            } else {
                const { data } = await api.post('/sale-campaigns', form);
                setCampaigns([data, ...campaigns]);
                showToast('Campaign created successfully', 'success');
            }
            setShowForm(false);
            setForm(emptyForm);
            setEditingId(null);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to save campaign', 'error');
        }
    };

    const toggleStatus = async (campaign: Campaign) => {
        try {
            const updated = { ...campaign, isActive: !campaign.isActive };
            const { data } = await api.put(`/sale-campaigns/${campaign._id}`, updated);
            setCampaigns(campaigns.map(c => c._id === campaign._id ? data : c));
            showToast(`Campaign ${data.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        } catch (err) {
            showToast('Failed to toggle campaign status', 'error');
        }
    };

    if (loading) return <div className="admin-loading-text">Loading campaigns configurations...</div>;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Sale Campaigns</h1>
                    <p className="admin-page-subtitle">Manage promotional sale events, countdown timings, and seasonal layout integrations</p>
                </div>
                {!showForm && (
                    <button 
                        onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); }} 
                        className="admin-btn admin-btn-primary"
                    >
                        + Create Campaign
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="admin-card" style={{ maxWidth: '800px' }}>
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">{editingId ? 'Edit Sale Campaign' : 'Create New Sale Campaign'}</h2>
                    </div>
                    <div className="admin-card-body">
                        <form onSubmit={handleSubmit}>
                            <div className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles['admin-form-label']}>Campaign Name / Title *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        value={form.title} 
                                        onChange={e => setForm({...form, title: e.target.value})} 
                                        placeholder="e.g. Summer Super Sale, Black Friday Deals" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles['admin-form-label']}>Subtitle / Description</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        value={form.subtitle} 
                                        onChange={e => setForm({...form, subtitle: e.target.value})} 
                                        placeholder="e.g. Up to 80% Off • Limited Time Only" 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Start Date & Time *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        type="datetime-local" 
                                        value={form.startDate} 
                                        onChange={e => setForm({...form, startDate: e.target.value})} 
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>End Date & Time *</label>
                                    <input 
                                        className={styles['admin-form-input']} 
                                        required 
                                        type="datetime-local" 
                                        value={form.endDate} 
                                        onChange={e => setForm({...form, endDate: e.target.value})} 
                                    />
                                </div>
                                <div className={styles['admin-form-group']} style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="isActiveCheckbox"
                                        checked={form.isActive} 
                                        onChange={e => setForm({...form, isActive: e.target.checked})}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="isActiveCheckbox" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', cursor: 'pointer' }}>
                                        Set Campaign as Active
                                    </label>
                                </div>
                            </div>
                            <div className={styles['admin-form-actions']} style={{ marginTop: '24px' }}>
                                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="admin-btn admin-btn-secondary">Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary">{editingId ? 'Save Changes' : 'Create Campaign'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="admin-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {['Title', 'Subtitle', 'Start Time', 'End Time', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(item => {
                                    const now = new Date();
                                    const isExpired = new Date(item.endDate) < now;
                                    const isUpcoming = new Date(item.startDate) > now;
                                    
                                    const status = isExpired 
                                        ? 'Expired' 
                                        : isUpcoming
                                            ? 'Upcoming'
                                            : item.isActive 
                                                ? 'Active' 
                                                : 'Paused';
                                    
                                    const badgeClass = status === 'Active' 
                                        ? 'admin-badge-success' 
                                        : status === 'Upcoming'
                                            ? 'admin-badge-warning'
                                            : 'admin-badge-danger';

                                    return (
                                        <tr key={item._id}>
                                            <td><strong style={{ color: 'var(--admin-text-main)' }}>{item.title}</strong></td>
                                            <td><span style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>{item.subtitle || '-'}</span></td>
                                            <td>{new Date(item.startDate).toLocaleString()}</td>
                                            <td>{new Date(item.endDate).toLocaleString()}</td>
                                            <td>
                                                <span 
                                                    className={`admin-badge ${badgeClass}`} 
                                                    onClick={() => !isExpired && toggleStatus(item)}
                                                    style={{ cursor: isExpired ? 'default' : 'pointer' }}
                                                >
                                                    {status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <button 
                                                        onClick={() => handleEdit(item)} 
                                                        className="admin-action-btn-edit" 
                                                        title="Edit Campaign"
                                                        style={{ padding: '6px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item._id)} 
                                                        className="admin-action-btn-delete"
                                                        title="Delete Campaign"
                                                        style={{ padding: '6px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            <line x1="10" y1="11" x2="10" y2="17" />
                                                            <line x1="14" y1="11" x2="14" y2="17" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {campaigns.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>No campaigns created yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCampaigns;
