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

export default function AdminSupplierDetail({ supplierId }: AdminSupplierDetailProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { t, formatCurrency } = useAuth();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'business' | 'financial' | 'products' | 'contact'>('business');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Modal state for verify/reject
    const [actionModal, setActionModal] = useState<{ open: boolean; type: 'verified' | 'rejected' }>({
        open: false,
        type: 'verified'
    });
    const [rejectReason, setRejectReason] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    useEffect(() => {
        fetchSupplierProfile();
    }, [supplierId]);

    const fetchSupplierProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/suppliers/${supplierId}`);
            setData(res.data);
        } catch (err: any) {
            console.error('Error fetching supplier profile:', err);
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
        const loadingText = t('loading_seller_profile') && t('loading_seller_profile') !== 'loading_seller_profile'
            ? t('loading_seller_profile')
            : 'Loading Seller Profile...';

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '65vh',
                padding: '60px 24px',
                textAlign: 'center'
            }}>
                <div className="spinner-circle" style={{ margin: '0 auto 16px', width: '36px', height: '36px' }}></div>
                <div style={{ color: 'var(--admin-text-sub, #64748b)', fontWeight: 600, fontSize: '15px' }}>
                    {loadingText}
                </div>
            </div>
        );
    }

    if (!data || (!data.user && !data.company)) {
        return (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-main)' }}>Seller Profile Not Found</h2>
                <p style={{ color: 'var(--admin-text-sub, #64748b)', margin: '12px 0 24px' }}>The requested seller record could not be retrieved.</p>
                <Link href="/admin/suppliers" className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}>
                    Back to Sellers List
                </Link>
            </div>
        );
    }

    const { user, company, products = [], stats = {} } = data;
    const companyName = company?.company_name || user?.company_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Seller Profile';
    const status = company?.verification_status || (user?.is_verified ? 'verified' : 'pending');

    return (
        <div style={{ padding: '24px 32px 100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Navigation Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'var(--admin-card-bg, #ffffff)',
                            border: '1px solid var(--admin-border, #e2e8f0)',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--admin-text-main, #0f172a)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--admin-text-main, #0f172a)', margin: 0 }}>
                            Seller Profile Overview
                        </h1>
                        <span style={{ fontSize: '13px', color: 'var(--admin-text-sub, #64748b)' }}>
                            Comprehensive business details, contact info, payouts, and product inventory
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {company?._id && status !== 'verified' && (
                        <button
                            onClick={() => setActionModal({ open: true, type: 'verified' })}
                            className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                            style={{ background: '#16a34a' }}
                        >
                            Approve Verification
                        </button>
                    )}
                    {company?._id && status !== 'rejected' && (
                        <button
                            onClick={() => setActionModal({ open: true, type: 'rejected' })}
                            className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                            Reject Application
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Hero Header Card */}
            <div style={{
                background: 'var(--admin-card-bg, #ffffff)',
                border: '1px solid var(--admin-border, #e2e8f0)',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
                {/* Banner Gradient */}
                <div style={{
                    height: '100px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
                    position: 'relative'
                }}></div>

                <div style={{ padding: '0 28px 24px', marginTop: '-40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                        {/* Company Logo / Avatar */}
                        <div style={{
                            width: '90px',
                            height: '90px',
                            borderRadius: '20px',
                            background: '#fff',
                            border: '4px solid var(--admin-card-bg, #ffffff)',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            {company?.logo ? (
                                <img src={getImgUrl(company.logo)} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ fontSize: '32px', fontWeight: 900, color: '#3b82f6' }}>
                                    {companyName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--admin-text-main)', margin: 0 }}>
                                    {companyName}
                                </h2>
                                <span className={`admin-badge ${status === 'verified' ? 'admin-badge-success' : status === 'rejected' ? 'admin-badge-danger' : 'admin-badge-warning'}`} style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>
                                    {status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--admin-text-sub, #64748b)', flexWrap: 'wrap' }}>
                                {user?.email && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                        {user.email}
                                    </span>
                                )}
                                {company?.country && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                        {company.country}
                                    </span>
                                )}
                                {user?._id && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        ID: {user._id}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Storefront Link Button */}
                    <a
                        href={`/supplier/${user?._id || supplierId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        View Public Storefront
                    </a>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Total Products</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--admin-text-main)', marginTop: '4px' }}>{stats.totalProducts || 0}</div>
                    <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>{stats.activeProducts || 0} Active / Approved</div>
                </div>

                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Completed Orders</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--admin-text-main)', marginTop: '4px' }}>{stats.totalOrders || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-sub)', marginTop: '4px' }}>Total Seller Orders</div>
                </div>

                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Gross Sales Volume</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>
                        {formatCurrency ? formatCurrency(stats.totalRevenue || 0) : `$${(stats.totalRevenue || 0).toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-sub)', marginTop: '4px' }}>Paid Order Volume</div>
                </div>

                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Pending Approvals</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#eab308', marginTop: '4px' }}>{stats.pendingProducts || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-sub)', marginTop: '4px' }}>Products Needing Review</div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div style={{ borderBottom: '1px solid var(--admin-border)', display: 'flex', gap: '24px' }}>
                <button
                    onClick={() => setActiveTab('business')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeTab === 'business' ? '#3b82f6' : 'var(--admin-text-sub)',
                        borderBottom: activeTab === 'business' ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    🏢 Business & Verification
                </button>
                <button
                    onClick={() => setActiveTab('financial')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeTab === 'financial' ? '#3b82f6' : 'var(--admin-text-sub)',
                        borderBottom: activeTab === 'financial' ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    💳 Financial & Payouts
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeTab === 'products' ? '#3b82f6' : 'var(--admin-text-sub)',
                        borderBottom: activeTab === 'products' ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    📦 Product Inventory ({products.length})
                </button>
                <button
                    onClick={() => setActiveTab('contact')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '12px 4px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeTab === 'contact' ? '#3b82f6' : 'var(--admin-text-sub)',
                        borderBottom: activeTab === 'contact' ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    👤 Contact & Account
                </button>
            </div>

            {/* TAB 1: Business & Verification Details */}
            {activeTab === 'business' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: 0, marginBottom: '20px' }}>
                            Business Entity Details
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Company Legal Name</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '2px' }}>{company?.company_name || 'N/A'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Tax ID / GST Number</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '2px', letterSpacing: '0.05em' }}>
                                    {company?.tax_id || 'Not Provided'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Business Type</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginTop: '2px' }}>{company?.business_type || 'Manufacturer / Wholesaler'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Country / Region</div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginTop: '2px' }}>{company?.country || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Documents & Proofs */}
                    <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: 0, marginBottom: '20px' }}>
                            Verification Documents & Proof
                        </h3>

                        {company?.id_proof ? (
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)', marginBottom: '8px', textTransform: 'uppercase' }}>Uploaded ID Proof / License</div>
                                <div style={{
                                    border: '1px dashed var(--admin-border)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    textAlign: 'center',
                                    background: 'var(--admin-bg, #f8fafc)'
                                }}>
                                    <img
                                        src={getImgUrl(company.id_proof)}
                                        alt="ID Proof"
                                        style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                        onClick={() => setPreviewUrl(getImgUrl(company.id_proof))}
                                    />
                                    <div style={{ marginTop: '12px' }}>
                                        <button
                                            onClick={() => setPreviewUrl(getImgUrl(company.id_proof))}
                                            className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                            style={{ fontSize: '12px' }}
                                        >
                                            View Full Screen Document
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--admin-text-sub)', background: 'var(--admin-bg)', borderRadius: '12px' }}>
                                No ID proof or license document uploaded yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: Financial & Payout Details */}
            {activeTab === 'financial' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: 0, marginBottom: '20px' }}>
                            Primary Payout Method
                        </h3>

                        {user?.payout_methods?.[0] || company?.user_id?.payout_methods?.[0] ? (
                            (() => {
                                const pm = user?.payout_methods?.[0] || company?.user_id?.payout_methods?.[0];
                                return (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        border: '1px solid #bae6fd'
                                    }}>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0369a1', marginBottom: '16px', textTransform: 'capitalize' }}>
                                            {pm.bank_name || pm.type?.replace('_', ' ') || 'Bank Payout Account'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#1e293b' }}>
                                            <div><b style={{ color: '#0369a1' }}>Account Holder:</b> {pm.account_name || pm.details?.account_name || 'N/A'}</div>
                                            <div><b style={{ color: '#0369a1' }}>Account Number:</b> {pm.account_number || pm.details?.account_number || 'N/A'}</div>
                                            <div><b style={{ color: '#0369a1' }}>IFSC / SWIFT Code:</b> {pm.ifsc_code || pm.details?.ifsc_code || 'N/A'}</div>
                                            {pm.details?.email && <div><b style={{ color: '#0369a1' }}>PayPal Email:</b> {pm.details.email}</div>}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-sub)', background: 'var(--admin-bg)', borderRadius: '12px' }}>
                                No payout method registered for this seller.
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: 0, marginBottom: '20px' }}>
                            Wallet & Earnings Overview
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'var(--admin-bg)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Available Wallet Balance</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                                    {formatCurrency ? formatCurrency(user?.wallet_balance || 0) : `$${(user?.wallet_balance || 0).toLocaleString()}`}
                                </div>
                            </div>
                            <div style={{ padding: '16px', background: 'var(--admin-bg)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Total Settled Lifetime Revenue</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#3b82f6', marginTop: '2px' }}>
                                    {formatCurrency ? formatCurrency(stats.totalRevenue || 0) : `$${(stats.totalRevenue || 0).toLocaleString()}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Products Inventory */}
            {activeTab === 'products' && (
                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', margin: 0 }}>
                            Seller Products Catalog ({products.length})
                        </h3>
                    </div>

                    {products.length === 0 ? (
                        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--admin-text-sub)' }}>
                            No products have been listed by this seller yet.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)' }}>PRODUCT</th>
                                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)' }}>PRICE</th>
                                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)' }}>STOCK</th>
                                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)' }}>APPROVAL STATUS</th>
                                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-text-sub)' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((prod: any) => (
                                        <tr key={prod._id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <img
                                                        src={getImgUrl(prod.images?.[0] || prod.image)}
                                                        alt={prod.name}
                                                        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', background: '#f1f5f9' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--admin-text-main)' }}>{prod.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-sub)' }}>SKU: {prod.sku || prod._id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--admin-text-main)' }}>
                                                {formatCurrency ? formatCurrency(prod.price) : `$${prod.price}`}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                                                {prod.stock || 0} units
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span className={`admin-badge ${prod.approval_status === 'approved' ? 'admin-badge-success' : prod.approval_status === 'rejected' ? 'admin-badge-danger' : 'admin-badge-warning'}`}>
                                                    {prod.approval_status || 'pending'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <a
                                                    href={`/product/${prod.slug || prod._id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}
                                                >
                                                    View Page &rarr;
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: Contact & Account Information */}
            {activeTab === 'contact' && (
                <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: 0, marginBottom: '20px' }}>
                        Account Holder Contact & Credentials
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Full Name</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '2px' }}>
                                {user?.first_name || user?.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'N/A'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Primary Email</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '2px' }}>{user?.email || 'N/A'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Phone Number</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '2px' }}>{user?.phone || 'Not Provided'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-sub)', textTransform: 'uppercase' }}>Registration Date</div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginTop: '2px' }}>
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Full-Screen Preview Modal */}
            {previewUrl && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    padding: '20px'
                }}>
                    <button
                        onClick={() => setPreviewUrl(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '24px',
                            background: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            fontWeight: 900
                        }}
                    >
                        &times;
                    </button>
                    <img src={previewUrl} alt="Document Preview" style={{ maxWidth: '90%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }} />
                </div>
            )}

            {/* Verification Status Action Modal */}
            {actionModal.open && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '500px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3>{actionModal.type === 'verified' ? 'Approve Seller Verification' : 'Reject Seller Verification'}</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setActionModal({ open: false, type: 'verified' })}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <p style={{ fontSize: '14px', color: 'var(--admin-text-main)', fontWeight: 600 }}>
                                {actionModal.type === 'verified'
                                    ? `Are you sure you want to approve verification for "${companyName}"? This will grant the seller full verified status.`
                                    : `Are you sure you want to reject verification for "${companyName}"?`}
                            </p>

                            {actionModal.type === 'rejected' && (
                                <div style={{ marginTop: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Rejection Reason (Optional)</label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className={styles['admin-form-textarea']}
                                        placeholder="e.g. ID proof documents are blurry or tax ID mismatch..."
                                        style={{ width: '100%', minHeight: '80px' }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className={styles['admin-modal-footer']}>
                            <button
                                className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                onClick={() => setActionModal({ open: false, type: 'verified' })}
                                disabled={submittingAction}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                style={{ background: actionModal.type === 'rejected' ? '#dc2626' : '#16a34a' }}
                                onClick={handleVerifyAction}
                                disabled={submittingAction}
                            >
                                {submittingAction ? 'Updating...' : actionModal.type === 'verified' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
