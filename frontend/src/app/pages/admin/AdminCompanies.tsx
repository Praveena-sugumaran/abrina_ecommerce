import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import styles from './AdminLayout.module.css';

interface AdminModalProps {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    type?: string;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', type = 'info' }) => {
    if (!isOpen) return null;
    return (
        <div className={styles['admin-modal-overlay']}>
            <div className={styles['admin-modal']}>
                <div className={styles['admin-modal-header']}>
                    <h3>{title}</h3>
                    <button className={styles['admin-modal-close']} onClick={onCancel}>&times;</button>
                </div>
                <div className={styles['admin-modal-body']}>{children}</div>
                <div className={styles['admin-modal-footer']}>
                    <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} onClick={onCancel}>Cancel</button>
                    <button
                        className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                        style={{ background: type === 'danger' ? '#dc2626' : 'var(--primary-color)' }}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface Company {
    _id: string;
    company_name: string;
    verification_status: string;
    tax_id?: string;
    id_proof?: string;
    logo?: string;
    business_type?: string;
    country?: string;
    createdAt: string;
    user_id?: {
        _id: string;
        first_name: string;
        last_name: string;
        email: string;
        status: string;
        payout_methods?: Array<{
            type?: string;
            bank_name?: string;
            account_name?: string;
            account_number?: string;
            ifsc_code?: string;
            details?: any;
        }>;
    };
}

interface ModalConfig {
    title: string;
    content: React.ReactNode;
    onConfirm: () => void;
    type: string;
    confirmText: string;
}

const AdminCompanies = () => {
    const { showToast } = useToast();
    const { t } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        title: '',
        content: null,
        onConfirm: () => { },
        type: 'info',
        confirmText: 'Confirm'
    });

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewImgError, setPreviewImgError] = useState(false);

    useEffect(() => { fetchCompanies(); }, []);

    const fetchCompanies = async () => {
        try {
            const { data } = await api.get('/admin/companies');
            setCompanies(data);
            setLoading(false);
        } catch (err: any) { setLoading(false); }
    };

    const handleVerifyClick = (id: string, status: string) => {
        const isVerifying = status === 'verified';
        setModalConfig({
            title: isVerifying ? (t('approve_verification') || 'Approve Verification') : (t('reject_verification') || 'Reject Verification'),
            content: (
                <div style={{ padding: '10px 0' }}>
                    <p className="text-admin-main" style={{ fontSize: '15px', marginBottom: '8px', fontWeight: 600 }}>
                        {isVerifying ? (t('confirm_approval_company') || 'Confirm approval for this company?') : (t('confirm_rejection_company') || 'Confirm rejection for this company?')}
                    </p>
                    {!isVerifying && (
                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>{t('rejection_reason') || 'Rejection Reason (Optional)'}</label>
                            <textarea
                                id="rejection-note"
                                className={styles['admin-form-textarea']}
                                placeholder={t('rejection_placeholder') || "e.g. ID proof is blurry, bank details mismatch..."}
                                style={{ width: '100%', minHeight: '80px' }}
                            />
                        </div>
                    )}
                </div>
            ),
            confirmText: isVerifying ? (t('verify_company') || 'Verify Company') : (t('reject_application') || 'Reject Application'),
            type: isVerifying ? 'info' : 'danger',
            onConfirm: async () => {
                const note = (document.getElementById('rejection-note') as HTMLTextAreaElement)?.value || '';
                try {
                    await api.put(`/admin/companies/${id}/verify`, { status, note });
                    fetchCompanies();
                    showToast(`Company ${status} successfully!`);
                    setModalOpen(false);
                } catch (err: any) { showToast('Action failed.'); }
            }
        });
        setModalOpen(true);
    };

    const handleViewDetails = (company: Company) => {
        setModalConfig({
            title: `${t('verification_details') || 'Verification Details'}: ${company.company_name}`,
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Header Summary */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{t('business_entity') || 'Business Entity'}</div>
                            <div className="text-admin-main" style={{ fontSize: '18px', fontWeight: 900 }}>{company.company_name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{t('current_status') || 'Current Status'}</div>
                            <span className={`${"admin-badge"} ${company.verification_status === 'verified' ? "admin-badge-success" : "admin-badge-warning"}`} style={{ fontSize: '11px' }}>
                                {(t(company.verification_status) || company.verification_status || 'Pending').toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                        {/* Section 1: Business Assets */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 className="text-admin-main" style={{ fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18"></path><path d="M3 9h18"></path></svg>
                                {t('business_assets') || 'BUSINESS ASSETS'}
                            </h4>

                            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>{t('tax_id_label') || 'TAX ID / GST NUMBER'}</div>
                                <div className="text-admin-main" style={{ fontWeight: '900', fontSize: '18px', letterSpacing: '0.05em' }}>{company.tax_id || t('not_provided') || 'Not provided'}</div>
                            </div>

                        </div>

                        {/* Section 2: Financial Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 className="text-admin-main" style={{ fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                {t('bank_information') || 'BANK INFORMATION'}
                            </h4>
                            {company.user_id?.payout_methods?.[0] ? (
                                (() => {
                                    const pm = company.user_id.payout_methods[0];
                                    const isPaypal = pm.type === 'paypal';
                                    const isBank = !pm.type || pm.type === 'bank' || pm.type === 'bank_transfer';
                                    
                                    if (isPaypal) {
                                        return (
                                            <div style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#00457C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00457C"><path d="M20.067 8.478c-.492-3.269-3.212-4.144-6.495-4.144H7.135a1.29 1.29 0 0 0-1.28 1.12L3.102 21.05a.43.43 0 0 0 .425.498h4.295c.27 0 .5-.2.536-.467l.805-5.074c.036-.226.228-.396.457-.396h2.247c3.957 0 6.666-1.583 7.33-6.196.115-.81.085-1.554-.13-2.227L20.067 8.478z" /></svg>
                                                    PayPal
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ fontSize: '12px', color: '#334155' }}><b style={{ color: '#0c4a6e' }}>PAYPAL EMAIL:</b> {pm.details?.email || pm.account_name || 'N/A'}</div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (isBank) {
                                        return (
                                            <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#0369a1', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18"></path><path d="M3 10h18"></path><path d="M5 6l7-3 7 3"></path><path d="M4 10v11"></path><path d="M20 10v11"></path><path d="M8 14v3"></path><path d="M12 14v3"></path><path d="M16 14v3"></path></svg>
                                                    {pm.bank_name || pm.details?.bank_name || 'Bank Transfer'}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ fontSize: '12px', color: '#334155' }}><b style={{ color: '#0c4a6e' }}>{t('holder') || 'HOLDER'}:</b> {pm.account_name || pm.details?.account_name || 'N/A'}</div>
                                                    <div style={{ fontSize: '12px', color: '#334155' }}><b style={{ color: '#0c4a6e' }}>{t('account') || 'ACCOUNT'}:</b> {pm.account_number || pm.details?.account_number || 'N/A'}</div>
                                                    <div style={{ fontSize: '12px', color: '#334155' }}><b style={{ color: '#0c4a6e' }}>{t('ifsc') || 'IFSC'}:</b> {pm.ifsc_code || pm.details?.ifsc_code || 'N/A'}</div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#475569', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
                                                {pm.type?.replace('_', ' ') || 'N/A'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {pm.details && Object.entries(pm.details).map(([key, val]) => (
                                                    <div key={key} style={{ fontSize: '12px', color: '#334155' }}>
                                                        <b style={{ color: '#475569', textTransform: 'uppercase' }}>{key.replace('_', ' ')}:</b> {String(val)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div style={{ background: '#f8fafc', padding: '30px 20px', borderRadius: '16px', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{t('no_bank_details') || 'No bank details linked'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
            confirmText: t('acknowledge') || 'Acknowledge',
            type: 'info',
            onConfirm: () => setModalOpen(false)
        });
        setModalOpen(true);
    };

    const filteredCompanies = companies.filter(c => {
        const matchesSearch = c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.user_id?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.user_id?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || c.verification_status === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

    const stats = [
        { label: t('total_applications') || 'Total Applications', value: companies.length },
        { label: t('newly_submitted') || 'Newly Submitted', value: companies.filter(c => c.verification_status === 'pending' && c.user_id?.status === 'profile_submitted').length },
        { label: t('verified_suppliers') || 'Verified Suppliers', value: companies.filter(c => c.verification_status === 'verified').length },
        { label: t('rejected_applications') || 'Rejected Applications', value: companies.filter(c => c.verification_status === 'rejected').length },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    border: '3.5px solid #e2e8f0',
                    borderTop: '3.5px solid #ff6a00',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const handleExportCSV = () => {
        if (!companies.length) return;
        const headers = ["Company Name", "Registration Number", "Applicant Name", "Email", "Status", "Submitted Date"];
        const rows = companies.map(c => [
            `"${c.company_name}"`,
            `"${c.registration_number || ''}"`,
            `"${c.user_id?.first_name || ''} ${c.user_id?.last_name || ''}"`,
            `"${c.user_id?.email || ''}"`,
            `"${c.verification_status}"`,
            `"${new Date(c.createdAt).toLocaleDateString()}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(encodeURI ? csvContent : '');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")));
        link.setAttribute("download", `company_verifications_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>

            <AdminModal
                isOpen={modalOpen}
                title={modalConfig.title}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalOpen(false)}
                confirmText={modalConfig.confirmText}
                type={modalConfig.type}
            >
                {modalConfig.content}
            </AdminModal>

            {previewOpen && (
                <div className={styles['admin-modal-overlay']} onClick={() => { setPreviewOpen(false); setPreviewImgError(false); }} style={{ zIndex: 11000 }}>
                    <div
                        className={styles['admin-modal']}
                        style={{ maxWidth: '90vw', width: 'auto', padding: '0', position: 'relative' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button — inside the popup card, top-right corner */}
                        <button
                            className={styles['admin-modal-close']}
                            onClick={() => { setPreviewOpen(false); setPreviewImgError(false); }}
                            style={{
                                position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                                fontSize: '20px', width: '32px', height: '32px',
                                background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0',
                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)', lineHeight: 1
                            }}
                        >
                            &times;
                        </button>

                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '12px', paddingTop: '48px' }}>
                            {previewImgError ? (
                                <div style={{ textAlign: 'center', padding: '24px' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
                                    <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '12px' }}>Unable to preview this document.</p>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
                                    >
                                        Open Document in New Tab
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Identity Document"
                                    onError={() => setPreviewImgError(true)}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80vh',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                            )}
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '12px', color: '#64748b', textDecoration: 'underline' }}
                            >
                                Open in new tab ↗
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{t('company_verification') || 'Company Verification'}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Company Verification</span>
                    </div>
                </div>
                <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                </button>
            </div>

            <div className={"admin-stats-grid"}>
                {stats.map((s, i) => (
                    <div key={i} className={"admin-stat-premium"}>
                        <div className={"admin-stat-card-label"}>{s.label}</div>
                        <div className={"admin-stat-card-value"} style={{ fontSize: '1.75rem' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div className={styles['admin-card']} style={{ marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className={styles['admin-search-wrap']} style={{ flex: 1 }}>
                        <svg className={styles['admin-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            className={styles['admin-search-input-premium']}
                            placeholder={t('find_company_placeholder') || "Find company by name, owner or email..."}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className={styles['admin-form-select']}
                        style={{ width: '180px' }}
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">{t('all_statuses') || 'All Statuses'}</option>
                        <option value="Pending">{t('pending_review') || 'Pending Review'}</option>
                        <option value="Verified">{t('verified') || 'Verified'}</option>
                        <option value="Rejected">{t('rejected') || 'Rejected'}</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className={"admin-table"} style={{ minWidth: '900px' }}>
                        <thead>
                            <tr>
                                <th>{t('company_identity') || 'Company Identity'}</th>
                                <th>{t('applicant_details') || 'Applicant Details'}</th>
                                <th>{t('assets_review') || 'Assets / Review'}</th>
                                <th>{t('status') || 'Status'}</th>
                                <th style={{ textAlign: 'right' }}>{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCompanies.map(company => (
                                <tr key={company._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {company.logo ? (
                                                    <img src={getImgUrl(company.logo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--admin-text-muted)' }}>
                                                        {company.company_name?.[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-admin-main" style={{ fontWeight: 900, fontSize: '15.5px', letterSpacing: '-0.01em' }}>{company.company_name}</div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                                                    {company.business_type} • {company.country}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                                            {company.user_id?.first_name} {company.user_id?.last_name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{company.user_id?.email}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <button
                                                onClick={() => handleViewDetails(company)}
                                                className={"admin-badge" + " " + "admin-badge-neutral"}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 14px' }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>{t('review_information') || 'Review Details'}</span>
                                            </button>
                                            {company.id_proof && (
                                                <button
                                                    onClick={() => {
                                                        setPreviewImgError(false);
                                                        setPreviewUrl(getImgUrl(company.id_proof || ''));
                                                        setPreviewOpen(true);
                                                    }}
                                                    className={"admin-badge" + " " + "admin-badge-info"}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #dbeafe', cursor: 'pointer', padding: '6px 14px' }}
                                                >
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                    <span style={{ fontSize: '11px', fontWeight: 900 }}>View Document</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className={`${"admin-badge"} ${company.verification_status === 'verified' ? "admin-badge-success" :
                                                company.verification_status === 'rejected' ? "admin-badge-danger" :
                                                    "admin-badge-warning"
                                                }`}>
                                                {company.verification_status === 'pending' && company.user_id?.status === 'profile_submitted'
                                                    ? (t('profile_submitted') || 'Profile Submitted')
                                                    : (t(company.verification_status) || company.verification_status || 'Pending').toUpperCase()}
                                            </span>
                                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                                                {new Date(company.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {company.verification_status !== 'verified' ? (
                                                <>
                                                    <button onClick={() => handleVerifyClick(company._id, 'verified')} className="admin-action-btn-edit">{t('approve') || 'Approve'}</button>
                                                    {company.verification_status !== 'rejected' && (
                                                        <button onClick={() => handleVerifyClick(company._id, 'rejected')} className="admin-action-btn-delete">{t('reject') || 'Reject'}</button>
                                                    )}
                                                </>
                                            ) : (
                                                <button onClick={() => handleVerifyClick(company._id, 'rejected')} className="admin-action-btn-delete">{t('revoke_access') || 'Revoke Access'}</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCompanies.length === 0 && (
                                <tr className={""}>
                                    <td colSpan={5} style={{ padding: '80px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
                                        <p>{t('no_verification_requests') || 'No verification requests found.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className={styles['admin-pagination-footer']}>
                        <span className={styles['admin-pagination-info']}>
                            {t('showing') || 'Showing'} {indexOfFirstItem + 1} {t('to') || 'to'} {Math.min(indexOfLastItem, filteredCompanies.length)} {t('of') || 'of'} {filteredCompanies.length}
                        </span>
                        <div className={styles['admin-pagination-controls']}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['admin-pagination-btn-arrow']} title="Prev">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="text-admin-main" style={{ fontSize: '12px', fontWeight: 800 }}>{t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['admin-pagination-btn-arrow']} title="Next">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCompanies;

