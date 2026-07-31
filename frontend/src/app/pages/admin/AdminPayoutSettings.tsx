import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface PayoutField {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
}

interface PayoutMethod {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    fields: PayoutField[];
    instructions: string;
}

const AdminPayoutSettings = () => {
    const { t } = useAuth();
    const { showToast } = useToast();
    const [methods, setMethods] = useState<PayoutMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/payout-settings');
            if (data.length === 0) {
                // If no methods, seed them
                await api.post('/admin/payout-settings/seed');
                const retry = await api.get('/admin/payout-settings');
                setMethods(retry.data);
            } else {
                setMethods(data);
            }
        } catch (err) {
            showToast('Failed to load payout methods', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (method: PayoutMethod) => {
        try {
            const updated = { ...method, enabled: !method.enabled };
            await api.put(`/admin/payout-settings/${method.id}`, updated);
            setMethods(methods.map(m => m.id === method.id ? updated : m));
            showToast(`${method.name} ${updated.enabled ? 'enabled' : 'disabled'}`);
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMethod) return;
        setSaving(true);
        try {
            await api.put(`/admin/payout-settings/${editingMethod.id}`, editingMethod);
            setMethods(methods.map(m => m.id === editingMethod.id ? editingMethod : m));
            setEditingMethod(null);
            showToast('Payout method updated successfully');
        } catch (err) {
            showToast('Failed to save changes', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Payout Settings</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Payout Settings</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '14px' }}>
                    <div style={{
                        width: '44px', height: '44px', border: '4px solid #e2e8f0',
                        borderTop: '4px solid #ff6a00', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Loading payout options...</span>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1000px' }}>
                    {methods.map(method => (
                        <div key={method.id} className="admin-card" style={{ padding: '32px', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>{method.name}</h3>
                                        <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', margin: 0 }}>{t(method.id)}</p>
                                    </div>
                                </div>
                                <div 
                                    className={`${styles['admin-toggle']} ${method.enabled ? styles['on'] : ''}`}
                                    onClick={() => handleToggle(method)}
                                />
                            </div>

                            <p style={{ fontSize: '14px', color: 'var(--admin-text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
                                {method.description}
                            </p>

                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: 'auto' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Required Fields:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                    {method.fields.map((f, i) => (
                                        <span key={i} style={{ fontSize: '10px', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                        </span>
                                    ))}
                                </div>
                                <button 
                                    className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                    style={{ width: '100%', padding: '12px', fontSize: '13px' }}
                                    onClick={() => setEditingMethod(method)}
                                >
                                    Edit Configuration
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingMethod && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '600px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3>Edit Payout Method: {editingMethod.name}</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setEditingMethod(null)}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <form onSubmit={handleSave} className="admin-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Method Name</label>
                                    <input 
                                        className={styles['admin-form-input']}
                                        value={editingMethod.name}
                                        onChange={e => setEditingMethod({...editingMethod, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Description</label>
                                    <textarea 
                                        className={styles['admin-form-textarea']}
                                        value={editingMethod.description}
                                        onChange={e => setEditingMethod({...editingMethod, description: e.target.value})}
                                        rows={3}
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>Instructions for Suppliers</label>
                                    <textarea 
                                        className={styles['admin-form-textarea']}
                                        value={editingMethod.instructions}
                                        onChange={e => setEditingMethod({...editingMethod, instructions: e.target.value})}
                                        placeholder="e.g. Please enter your account details exactly as they appear on your bank statement."
                                        rows={2}
                                    />
                                </div>
                                
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '12px' }}>Configure Fields</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {editingMethod.fields.map((field, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '4px', display: 'block' }}>FIELD LABEL</label>
                                                    <input 
                                                        className={styles['admin-form-input']}
                                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                                        value={field.label}
                                                        onChange={e => {
                                                            const newFields = [...editingMethod.fields];
                                                            newFields[idx].label = e.target.value;
                                                            setEditingMethod({...editingMethod, fields: newFields});
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={e => {
                                                            const newFields = [...editingMethod.fields];
                                                            newFields[idx].required = e.target.checked;
                                                            setEditingMethod({...editingMethod, fields: newFields});
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '11px', fontWeight: 700 }}>Required</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles['admin-form-actions']} style={{ marginTop: '12px' }}>
                                    <button type="button" className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} onClick={() => setEditingMethod(null)}>Cancel</button>
                                    <button type="submit" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPayoutSettings;
