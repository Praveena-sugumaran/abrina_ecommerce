import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

interface Buyer {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    country_code?: string;
    company_name?: string;
    profile_image?: string;
}

interface CrmLead {
    _id: string;
    buyer_id: Buyer;
    status: 'New' | 'Contacted' | 'Negotiating' | 'Won' | 'Lost';
    notes: string;
    last_contact_date: string;
    createdAt: string;
}

const SupplierCrm = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [loading, setLoading] = useState(true);

    // Auto reply settings
    const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
    const [autoReplyText, setAutoReplyText] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    // Edit lead modal
    const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
    const [editStatus, setEditStatus] = useState<'New' | 'Contacted' | 'Negotiating' | 'Won' | 'Lost'>('New');
    const [editNotes, setEditNotes] = useState('');
    const [savingLead, setSavingLead] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchLeads();
        fetchAutoReplySettings();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/crm/leads');
            setLeads(data || []);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to load CRM leads', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAutoReplySettings = async () => {
        try {
            const { data } = await api.get('/crm/auto-reply');
            setAutoReplyEnabled(data.auto_reply_enabled || false);
            setAutoReplyText(data.auto_reply_text || '');
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleSaveAutoReply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const { data } = await api.put('/crm/auto-reply', {
                auto_reply_enabled: autoReplyEnabled,
                auto_reply_text: autoReplyText
            });
            setAutoReplyEnabled(data.auto_reply_enabled);
            setAutoReplyText(data.auto_reply_text);
            showToast('Auto-reply settings updated successfully!', 'success');
        } catch (err: any) {
            showToast('Failed to update auto-reply settings', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleEditClick = (lead: CrmLead) => {
        setEditingLead(lead);
        setEditStatus(lead.status);
        setEditNotes(lead.notes);
    };

    const handleSaveLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead) return;
        setSavingLead(true);
        try {
            const { data } = await api.put(`/crm/leads/${editingLead._id}`, {
                status: editStatus,
                notes: editNotes
            });
            setLeads(leads.map(l => l._id === editingLead._id ? { ...l, status: data.status, notes: data.notes } : l));
            showToast('CRM lead details updated', 'success');
            setEditingLead(null);
        } catch (err: any) {
            showToast('Failed to update CRM lead', 'error');
        } finally {
            setSavingLead(false);
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this lead? This cannot be undone.')) return;
        try {
            await api.delete(`/crm/leads/${id}`);
            setLeads(leads.filter(l => l._id !== id));
            showToast('Lead deleted from CRM database', 'success');
        } catch (err: any) {
            showToast('Failed to delete CRM lead', 'error');
        }
    };

    const exportToCsv = () => {
        if (leads.length === 0) {
            showToast('No leads available to export', 'error');
            return;
        }

        const headers = ['First Name', 'Last Name', 'Email', 'Phone Number', 'Company Name', 'Country Code', 'Lead Status', 'Custom Notes', 'Last Contact Date'];
        const rows = leads.map(lead => [
            lead.buyer_id?.first_name || '',
            lead.buyer_id?.last_name || '',
            lead.buyer_id?.email || '',
            lead.buyer_id?.phone_number || '',
            lead.buyer_id?.company_name || '',
            lead.buyer_id?.country_code || '',
            lead.status,
            lead.notes.replace(/"/g, '""'), // escape quotes
            new Date(lead.last_contact_date).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `crm_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CRM CSV database downloaded!', 'success');
    };

    // Filtering logic
    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase();
        const buyer = lead.buyer_id || {};
        const matchesQuery = 
            (buyer.first_name || '').toLowerCase().includes(query) ||
            (buyer.last_name || '').toLowerCase().includes(query) ||
            (buyer.email || '').toLowerCase().includes(query) ||
            (buyer.company_name || '').toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;

        return matchesQuery && matchesStatus;
    });

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid #ff6600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
                <div>Loading customer relationship database...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Auto-Reply CRM Setting Panel */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        Auto-Reply & Instant Response Settings
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        Configure an automated reply that is dispatched instantly to buyers who send enquiries or start chats.
                    </p>
                </div>
                <form onSubmit={handleSaveAutoReply}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="checkbox"
                                id="enable-auto-reply"
                                checked={autoReplyEnabled}
                                onChange={e => setAutoReplyEnabled(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ff6600' }}
                            />
                            <label htmlFor="enable-auto-reply" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                                Enable Auto-Reply Response
                            </label>
                        </div>

                        {autoReplyEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Response Message Template *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={autoReplyText}
                                    onChange={e => setAutoReplyText(e.target.value)}
                                    placeholder="Thank you for contacting us! A representative from our team will evaluate your sourcing specifications and follow up within 24 hours."
                                    style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Note: Auto-reply matches direct messages and inquiries. Direct chats use a 30-minute anti-spam threshold to avoid repetition.
                                </span>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={savingSettings}
                                style={{ background: savingSettings ? '#cbd5e1' : 'var(--primary-color, #ff6600)', border: 'none', color: '#fff', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                {savingSettings ? 'Saving Settings...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* CRM Leads Database Panel */}
            <div className="dashboard-card-container">
                
                {/* Panel Title & Exporter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Customer & Lead Database
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                            Track buyer contacts collected from enquiries, chats, and completed orders.
                        </p>
                    </div>
                    <button
                        onClick={exportToCsv}
                        style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Export Database (CSV)
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search leads by name, email, or company..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', minWidth: '260px', flex: 1 }}
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff', minWidth: '150px' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                    </select>
                </div>

                {/* Leads Table */}
                {filteredLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#334155' }}>No Leads Found</h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                            {searchQuery || statusFilter !== 'All' 
                                ? 'No customer contacts match your filter criteria.' 
                                : 'Leads will automatically appear here once buyers start contacting you.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {['Buyer Profile', 'Company Info', 'Custom Notes', 'Last Contact', 'Lead Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '14px 20px', fontWeight: 700, color: '#475569' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map(lead => {
                                    const buyer = lead.buyer_id || {};
                                    const statusColors = {
                                        New: { bg: '#eff6ff', text: '#1d4ed8' },
                                        Contacted: { bg: '#f3e8ff', text: '#6b21a8' },
                                        Negotiating: { bg: '#fffbeb', text: '#b45309' },
                                        Won: { bg: '#f0fdf4', text: '#166534' },
                                        Lost: { bg: '#fee2e2', text: '#991b1b' }
                                    };
                                    const color = statusColors[lead.status] || { bg: '#f1f5f9', text: '#475569' };

                                    return (
                                        <tr key={lead._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            
                                            {/* Profile Card */}
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#ff6600', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                                                        {buyer.profile_image ? (
                                                            <img src={getImgUrl(buyer.profile_image)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <>{buyer.first_name ? buyer.first_name[0].toUpperCase() : 'B'}</>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{`${buyer.first_name || ''} ${buyer.last_name || ''}`}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{buyer.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Company & Country Details */}
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    {buyer.company_name || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No Company</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                                    {buyer.country_code && (
                                                        <span style={{ fontWeight: 800, background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                            {buyer.country_code.toUpperCase()}
                                                        </span>
                                                    )}
                                                    <span>{buyer.phone_number}</span>
                                                </div>
                                            </td>

                                            {/* Notes snippet */}
                                            <td style={{ padding: '14px 20px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {lead.notes ? (
                                                    <span style={{ color: '#334155' }}>{lead.notes}</span>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No notes taken</span>
                                                )}
                                            </td>

                                            {/* Dates */}
                                            <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.8rem' }}>
                                                {new Date(lead.last_contact_date).toLocaleDateString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: color.bg, color: color.text }}>
                                                    {lead.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => handleEditClick(lead)}
                                                        style={{ background: 'none', border: 'none', color: '#ff6600', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLead(lead._id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                    >
                                                        Remove
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

            </div>

            {/* Edit Lead Modal */}
            {editingLead && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                Update CRM Lead Status & Notes
                            </h3>
                            <button
                                onClick={() => setEditingLead(null)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveLead} style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
                                
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                    Managing relation for buyer: <strong>{`${editingLead.buyer_id?.first_name || ''} ${editingLead.buyer_id?.last_name || ''}`}</strong>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Status *</label>
                                    <select
                                        style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value as any)}
                                    >
                                        <option value="New">New</option>
                                        <option value="Contacted">Contacted</option>
                                        <option value="Negotiating">Negotiating</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Sourcing & Negotiation Notes</label>
                                    <textarea
                                        rows={4}
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        placeholder="Add private B2B negotiation logs, pricing discussions, custom freight agreements, etc..."
                                        style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingLead(null)}
                                    style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingLead}
                                    style={{ background: savingLead ? '#cbd5e1' : 'var(--primary-color, #ff6600)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {savingLead ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierCrm;
