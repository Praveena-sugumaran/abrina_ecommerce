'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

interface AdminSupplierDetailProps {
    supplierId: string;
}

const InfoRow = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '14px 0', borderBottom: '1px solid var(--admin-border, #e2e8f0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-sub, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
            {label}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main, #0f172a)', marginTop: '2px' }}>{value || <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '13px' }}>Not provided</span>}</div>
    </div>
);

const StatCard = ({ label, value, sub, color, icon }: { label: string; value: string | number; sub: string; color: string; icon: React.ReactNode }) => (
    <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-sub, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--admin-text-main, #0f172a)', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-sub, #64748b)', marginTop: '2px' }}>{sub}</div>
        </div>
    </div>
);

export default function AdminSupplierDetail({ supplierId }: AdminSupplierDetailProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { t, formatCurrency } = useAuth();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'business' | 'financial' | 'products' | 'contact'>('business');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [actionModal, setActionModal] = useState<{ open: boolean; type: 'verified' | 'rejected' }>({ open: false, type: 'verified' });
    const [rejectReason, setRejectReason] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    useEffect(() => { fetchSupplierProfile(); }, [supplierId]);

    const fetchSupplierProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/suppliers/${supplierId}`);
            setData(res.data);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to load seller profile');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAction = async () => {
        if (!data?.company?._id) return;
        setSubmittingAction(true);
        try {
            await api.put(`/admin/companies/${data.company._id}/verify`, {
                status: actionModal.type,
                note: actionModal.type === 'rejected' ? rejectReason : ''
            });
            showToast(`Company verification updated to ${actionModal.type}!`);
            setActionModal({ open: false, type: 'verified' });
            setRejectReason('');
            fetchSupplierProfile();
        } catch (err: any) {
            showToast('Failed to update verification status.');
        } finally {
            setSubmittingAction(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', gap: '16px' }}>
                <div className="spinner-circle" style={{ width: '40px', height: '40px' }}></div>
                <div style={{ color: 'var(--admin-text-sub, #64748b)', fontWeight: 600, fontSize: '15px' }}>Loading Seller Profile...</div>
            </div>
        );
    }

    if (!data || (!data.user && !data.company)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '56px' }}>🔍</div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Seller Not Found</h2>
                <p style={{ color: 'var(--admin-text-sub, #64748b)', margin: 0 }}>The requested seller record could not be retrieved.</p>
                <Link href="/admin/suppliers" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>← Back to Sellers</Link>
            </div>
        );
    }

    const { user, company, products = [], stats = {} } = data;
    const companyName = company?.company_name || user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Seller';
    const status = company?.verification_status || (user?.is_verified ? 'verified' : 'pending');

    const STATUS: Record<string, { color: string; bg: string; label: string }> = {
        verified: { color: '#16a34a', bg: '#dcfce7', label: '✓ Verified' },
        rejected: { color: '#dc2626', bg: '#fee2e2', label: '✕ Rejected' },
        pending:  { color: '#d97706', bg: '#fef3c7', label: '⏳ Pending' },
    };
    const statusStyle = STATUS[status] || STATUS.pending;

    const TABS = [
        { key: 'business' as const,  label: 'Business', icon: '🏢' },
        { key: 'financial' as const, label: 'Financial', icon: '💳' },
        { key: 'products' as const,  label: `Products (${products.length})`, icon: '📦' },
        { key: 'contact' as const,   label: 'Contact', icon: '👤' },
    ];

    return (
        <div style={{ padding: '20px 28px 80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ─ Top Bar ─ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button onClick={() => router.back()}
                        style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: 'var(--admin-text-main)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        Back
                    </button>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>Seller Profile</h1>
                        <div style={{ fontSize: '12px', color: 'var(--admin-text-sub, #64748b)', marginTop: '2px' }}>Admin › Sellers › {companyName}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a href={`/supplier/${user?._id || supplierId}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-card-bg, #fff)', fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', textDecoration: 'none' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Storefront
                    </a>
                    {company?._id && status !== 'verified' && (
                        <button onClick={() => setActionModal({ open: true, type: 'verified' })}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            ✓ Approve
                        </button>
                    )}
                    {company?._id && status !== 'rejected' && (
                        <button onClick={() => setActionModal({ open: true, type: 'rejected' })}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #fca5a5', background: '#fff5f5', color: '#dc2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            ✕ Reject
                        </button>
                    )}
                </div>
            </div>

            {/* ─ Hero Card ─ */}
            <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ height: '90px', background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 55%, #7c3aed 100%)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                </div>
                <div style={{ padding: '0 28px 22px', marginTop: '-36px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
                    <div style={{ width: '78px', height: '78px', borderRadius: '16px', background: '#fff', border: '4px solid var(--admin-card-bg, #fff)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {company?.logo
                            ? <img src={getImgUrl(company.logo)} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : <div style={{ fontSize: '28px', fontWeight: 900, background: 'linear-gradient(135deg, #1e40af, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName.charAt(0).toUpperCase()}</div>
                        }
                    </div>
                    <div style={{ paddingBottom: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '19px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>{companyName}</h2>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, background: statusStyle.bg, color: statusStyle.color }}>
                                {statusStyle.label}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '5px', fontSize: '12px', color: 'var(--admin-text-sub, #64748b)', flexWrap: 'wrap' }}>
                            {user?.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{user.email}</span>}
                            {company?.country && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>{company.country}</span>}
                            {user?.createdAt && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─ Stats Row ─ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                <StatCard label="Total Products" value={stats.totalProducts || 0} sub={`${stats.activeProducts || 0} Active`} color="#16a34a"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
                <StatCard label="Completed Orders" value={stats.totalOrders || 0} sub="Total Seller Orders" color="#3b82f6"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>} />
                <StatCard label="Gross Sales" value={formatCurrency ? formatCurrency(stats.totalRevenue || 0) : `$${(stats.totalRevenue || 0).toLocaleString()}`} sub="Paid Order Volume" color="#7c3aed"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
                <StatCard label="Pending Reviews" value={stats.pendingProducts || 0} sub="Products Needing Review" color="#d97706"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
            </div>

            {/* ─ Content: Sidebar Tabs + Panel ─ */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Sidebar Navigation */}
                <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '185px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0, position: 'sticky', top: '80px' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', borderRadius: '10px', border: 'none', background: isActive ? 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)' : 'transparent', color: isActive ? '#fff' : 'var(--admin-text-sub, #64748b)', fontWeight: isActive ? 800 : 600, fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: isActive ? '0 4px 12px rgba(30,64,175,0.3)' : 'none', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Panel */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Business Tab */}
                    {activeTab === 'business' && (<>
                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Business Entity Details</h3>
                            </div>
                            <InfoRow label="Company Legal Name" value={company?.company_name} />
                            <InfoRow label="Tax ID / GST Number" value={company?.tax_id ? <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.08em' }}>{company.tax_id}</span> : null} />
                            <InfoRow label="Business Type" value={company?.business_type} />
                            <InfoRow label="Country / Region" value={company?.country} />
                            <InfoRow label="Verification Status" value={<span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>} />
                        </div>

                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Verification Documents</h3>
                            </div>
                            {company?.id_proof ? (
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-sub)', textTransform: 'uppercase', marginBottom: '10px' }}>Uploaded ID Proof / License</div>
                                    <div style={{ border: '2px dashed var(--admin-border, #e2e8f0)', borderRadius: '12px', padding: '20px', textAlign: 'center', background: 'var(--admin-bg, #f8fafc)' }}>
                                        <img src={getImgUrl(company.id_proof)} alt="ID Proof" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={() => setPreviewUrl(getImgUrl(company.id_proof))} />
                                        <div style={{ marginTop: '14px' }}>
                                            <button onClick={() => setPreviewUrl(getImgUrl(company.id_proof))}
                                                style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg, #fff)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--admin-text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                View Full Screen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--admin-bg, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--admin-border)' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                                    <div style={{ color: 'var(--admin-text-sub)', fontWeight: 600, fontSize: '14px' }}>No verification documents uploaded</div>
                                </div>
                            )}
                        </div>
                    </>)}

                    {/* Financial Tab */}
                    {activeTab === 'financial' && (<>
                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Primary Payout Method</h3>
                            </div>
                            {user?.payout_methods?.[0] || company?.user_id?.payout_methods?.[0] ? (() => {
                                const pm = user?.payout_methods?.[0] || company?.user_id?.payout_methods?.[0];
                                return (
                                    <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', padding: '20px 24px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af', marginBottom: '12px' }}>{pm.bank_name || pm.type?.replace('_', ' ') || 'Bank Payout Account'}</div>
                                        <InfoRow label="Account Holder" value={pm.account_name || pm.details?.account_name} />
                                        <InfoRow label="Account Number" value={pm.account_number ? <span style={{ fontFamily: 'monospace' }}>{pm.account_number}</span> : pm.details?.account_number} />
                                        <InfoRow label="IFSC / SWIFT" value={pm.ifsc_code || pm.details?.ifsc_code} />
                                        {pm.details?.email && <InfoRow label="PayPal Email" value={pm.details.email} />}
                                    </div>
                                );
                            })() : (
                                <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--admin-bg, #f8fafc)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>💳</div>
                                    <div style={{ color: 'var(--admin-text-sub)', fontWeight: 600, fontSize: '14px' }}>No payout method registered</div>
                                </div>
                            )}
                        </div>

                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Wallet & Earnings</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div style={{ padding: '18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: '6px' }}>Wallet Balance</div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d' }}>{formatCurrency ? formatCurrency(user?.wallet_balance || 0) : `$${(user?.wallet_balance || 0).toLocaleString()}`}</div>
                                </div>
                                <div style={{ padding: '18px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '6px' }}>Total Revenue</div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e40af' }}>{formatCurrency ? formatCurrency(stats.totalRevenue || 0) : `$${(stats.totalRevenue || 0).toLocaleString()}`}</div>
                                </div>
                            </div>
                        </div>
                    </>)}

                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--admin-bg, #f8fafc)' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Products Catalog <span style={{ fontSize: '12px', color: 'var(--admin-text-sub)', fontWeight: 600 }}>({products.length} items)</span></h3>
                            </div>
                            {products.length === 0 ? (
                                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                                    <div style={{ color: 'var(--admin-text-sub)', fontWeight: 600 }}>No products listed by this seller yet</div>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                                {['Product', 'Price', 'Stock', 'Status', ''].map(h => (
                                                    <th key={h} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--admin-bg, #f8fafc)' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((prod: any) => {
                                                const aColor = prod.approval_status === 'approved' ? { bg: '#dcfce7', color: '#16a34a' } : prod.approval_status === 'rejected' ? { bg: '#fee2e2', color: '#dc2626' } : { bg: '#fef3c7', color: '#d97706' };
                                                return (
                                                    <tr key={prod._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, border: '1px solid var(--admin-border)' }}>
                                                                    <img src={getImgUrl(prod.images?.[0] || prod.image)} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--admin-text-main)' }}>{prod.name}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-sub)' }}>SKU: {prod.sku || prod._id?.slice(-8)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>{formatCurrency ? formatCurrency(prod.price) : `$${prod.price}`}</td>
                                                        <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '13px', color: 'var(--admin-text-main)' }}>{prod.stock || 0} <span style={{ color: 'var(--admin-text-sub)', fontWeight: 400 }}>units</span></td>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, background: aColor.bg, color: aColor.color }}>{prod.approval_status || 'pending'}</span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <a href={`/product/${prod.slug || prod._id}`} target="_blank" rel="noopener noreferrer"
                                                                style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                                                                View <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contact Tab */}
                    {activeTab === 'contact' && (
                        <div style={{ background: 'var(--admin-card-bg, #fff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fdf4ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>Account Holder Information</h3>
                            </div>
                            <InfoRow label="Full Name" value={user?.first_name || user?.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null} />
                            <InfoRow label="Email Address" value={user?.email} />
                            <InfoRow label="Phone Number" value={user?.phone_number || user?.phone} />
                            <InfoRow label="Company Name" value={user?.company_name || company?.company_name} />
                            <InfoRow label="Country" value={company?.country || user?.country} />
                            <InfoRow label="Account Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                            <InfoRow label="User ID" value={<span style={{ fontFamily: 'monospace', fontSize: '11px', background: 'var(--admin-bg, #f8fafc)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--admin-border)' }}>{user?._id}</span>} />
                        </div>
                    )}
                </div>
            </div>

            {/* ─ Document Preview Modal ─ */}
            {previewUrl && (
                <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <button onClick={() => setPreviewUrl(null)} style={{ position: 'absolute', top: '20px', right: '24px', background: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <img src={previewUrl} alt="Document Preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '88vh', objectFit: 'contain', borderRadius: '14px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} />
                </div>
            )}

            {/* ─ Action Modal ─ */}
            {actionModal.open && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '460px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3>{actionModal.type === 'verified' ? '✓ Approve Verification' : '✕ Reject Verification'}</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setActionModal({ open: false, type: 'verified' })}>×</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <p style={{ fontSize: '14px', color: 'var(--admin-text-main)', fontWeight: 600, margin: 0 }}>
                                {actionModal.type === 'verified'
                                    ? `Approve verification for "${companyName}"? This grants full verified seller status.`
                                    : `Reject verification for "${companyName}"?`
                                }
                            </p>
                            {actionModal.type === 'rejected' && (
                                <div style={{ marginTop: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--admin-text-sub)' }}>Rejection Reason (Optional)</label>
                                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={styles['admin-form-textarea']} placeholder="e.g. ID proof is blurry or tax ID mismatch..." style={{ width: '100%', minHeight: '80px' }} />
                                </div>
                            )}
                        </div>
                        <div className={styles['admin-modal-footer']}>
                            <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} onClick={() => setActionModal({ open: false, type: 'verified' })} disabled={submittingAction}>Cancel</button>
                            <button className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} style={{ background: actionModal.type === 'rejected' ? '#dc2626' : '#16a34a' }} onClick={handleVerifyAction} disabled={submittingAction}>
                                {submittingAction ? 'Updating...' : actionModal.type === 'verified' ? '✓ Confirm Approval' : '✕ Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
