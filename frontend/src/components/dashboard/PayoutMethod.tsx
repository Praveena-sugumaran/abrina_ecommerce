import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

const PayoutMethod = () => {
    const [availableMethods, setAvailableMethods] = useState<any[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState('');
    const { user, login } = useAuth();

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Fetch available methods from admin settings
                const { data: methods } = await api.get('/common/payout-methods');
                setAvailableMethods(methods);

                // 2. Fetch user's saved payout methods
                const { data: saved } = await api.get('/auth/supplier/payout-methods');
                
                if (saved && saved.length > 0) {
                    const active = saved[0];
                    setSelectedMethodId(active.type || 'bank_transfer');
                    // Populate form data from details or root fields (for backward compatibility)
                    const initialData = { ...active.details };
                    // Map legacy fields if they exist at root
                    ['bank_name', 'account_name', 'account_number', 'swift_code', 'ifsc_code', 'routing_number'].forEach((f: any) => {
                        if (active[f]) initialData[f] = active[f];
                    });
                    setFormData(initialData);
                } else if (methods.length > 0) {
                    setSelectedMethodId(methods[0].id);
                }
            } catch (err) {
                console.error('Error initializing payout methods:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleInputChange = (fieldName: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // We save the type and the fields in details
            // For 'bank' type specifically, we also mirror fields to root for legacy support if needed
            const payload: any = {
                type: selectedMethodId,
                details: formData
            };

            // Legacy mapping for 'bank' type
            if (selectedMethodId === 'bank_transfer' || selectedMethodId === 'bank') {
                payload.bank_name = formData.bank_name;
                payload.account_name = formData.account_name;
                payload.account_number = formData.account_number;
                payload.ifsc_code = formData.ifsc_code;
                payload.swift_code = formData.swift_code;
            }

            const { data } = await api.post('/auth/supplier/payout-methods', payload);
            
            if (user) {
                const updatedUser = { ...user, payout_methods: data };
                login(updatedUser);
            }
            showToast('Payout details updated successfully!');
        } catch (err) {
            showToast('Failed to update details');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--primary-color)', fontWeight: 600 }}>
            <div className="animate-pulse">Loading Payout Configuration...</div>
        </div>
    );

    const activeMethod: any = availableMethods.find((m: any) => m.id === selectedMethodId);

    const inputGroupStyle: React.CSSProperties = { marginBottom: '20px' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', background: '#f8fafc' };

    return (
        <div className="payout-method-wrapper" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: '16px' }}>
            <style jsx>{`
                @media (max-width: 768px) {
                    .payout-card {
                        padding: 24px 16px !important;
                        border-radius: 20px !important;
                    }
                    .payout-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    .payout-input-group {
                        grid-column: span 1 !important;
                    }
                }
            `}</style>
            {toast && (
                <div style={{ 
                    position: 'fixed', 
                    top: 24, 
                    right: 24, 
                    background: toast.includes('Failed') ? '#ef4444' : '#10b981', 
                    color: '#fff', 
                    padding: '14px 28px', 
                    borderRadius: '12px', 
                    zIndex: 9999, 
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                    fontWeight: 700,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast}
                </div>
            )}
            
            <div className="payout-card" style={{ background: '#fff', borderRadius: '32px', padding: '48px', border: '1px solid #f1f5f9', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5"><path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z"></path></svg>
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Payout Settings</h2>
                    <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '15px', fontWeight: '500', lineHeight: 1.5 }}>
                        Choose your preferred method to receive funds from completed sales.
                    </p>
                </div>

                {/* Method Selection */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={labelStyle}>Select Payout Method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                        {availableMethods.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMethodId(m.id)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: selectedMethodId === m.id ? '2px solid var(--primary-color)' : '1.5px solid #e2e8f0',
                                    background: selectedMethodId === m.id ? '#f0f7ff' : '#fff',
                                    color: selectedMethodId === m.id ? 'var(--primary-color)' : '#64748b',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    fontSize: '13px'
                                }}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>

                {activeMethod && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '32px', boxSizing: 'border-box', width: '100%' }}>
                            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                                {activeMethod.description}
                            </p>
                            
                            <div className="payout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {activeMethod.fields.map((field: any) => (
                                    <div key={field.name} className="payout-input-group" style={{ ...inputGroupStyle, gridColumn: activeMethod.fields.length === 1 ? 'span 2' : 'auto' }}>
                                        <label style={labelStyle}>{field.label}</label>
                                        <input 
                                            type={field.type || 'text'}
                                            style={inputStyle} 
                                            placeholder={field.placeholder}
                                            value={formData[field.name] || ''}
                                            onChange={e => handleInputChange(field.name, e.target.value)}
                                            required={field.required}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="checkbox" 
                                    id="is_default" 
                                    checked={formData.is_default !== false} 
                                    onChange={(e) => handleInputChange('is_default', e.target.checked)} 
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }} 
                                />
                                <label htmlFor="is_default" style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                                    Set as default payout method
                                </label>
                            </div>

                            {activeMethod.instructions && (
                                <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fff', borderLeft: '4px solid #3b82f6', borderRadius: '8px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                                    <strong>Instructions:</strong> {activeMethod.instructions}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            style={{ 
                                width: 'fit-content',
                                minWidth: '160px',
                                margin: '0 auto',
                                display: 'block',
                                padding: '12px 24px', 
                                background: 'var(--primary-color)', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontWeight: '700', 
                                fontSize: '14px', 
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                boxShadow: '0 6px 15px rgba(255, 102, 0, 0.15)',
                                transition: 'all 0.3s'
                            }}
                        >
                            {submitting ? 'Processing...' : 'Save'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PayoutMethod;
