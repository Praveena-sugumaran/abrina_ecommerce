import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
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

const AdminModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', type = 'info' }: AdminModalProps) => {
    const { t } = useAuth();
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
                    <button className={"admin-btn" + " " + "admin-btn-secondary"} onClick={onCancel}>{t('cancel') || 'Cancel'}</button>
                    <button
                        className={"admin-btn" + " " + "admin-btn-primary"}
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

interface Product {
    _id: string;
    name: string;
    approval_status: string;
    supplier?: {
        company_name?: string;
        first_name?: string;
        last_name?: string;
    };
    createdAt: string;
}

interface ModalConfig {
    title: string;
    content: React.ReactNode;
    onConfirm: () => void;
    type?: string;
    confirmText?: string;
}

const AdminApprovals = () => {
    const { showToast } = useToast();
    const { t } = useAuth();
    const [data, setData] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ title: '', content: null, onConfirm: () => { }, type: 'info' });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/admin/site-settings');
                if (data?.pagination_limit) setItemsPerPage(Number(data.pagination_limit) || 10);
            } catch (err) { }
        };
        fetchSettings();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/admin/products');
            setData(res.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products', error);
            setLoading(false);
        }
    };



    const handleApprove = (id: string) => {
        setModalConfig({
            title: t('confirm_approve_product') || 'Approve Product',
            content: <p style={{ fontSize: '14px', color: '#4b5563' }}>{t('approve_product_desc') || 'Are you sure you want to approve this product listing for the marketplace?'}</p>,
            type: 'info',
            confirmText: t('approve') || 'Approve',
            onConfirm: async () => {
                try {
                    await api.put(`/admin/products/${id}/approve`);
                    setData(data.map(p => p._id === id ? { ...p, approval_status: 'approved' } : p));
                    showToast(t('product_approved_success') || 'Product approved successfully!');
                    setModalOpen(false);
                } catch (err) { showToast(t('failed_approve_product') || 'Failed to approve product.'); }
            }
        });
        setModalOpen(true);
    };

    const handleRejectClick = (id: string) => {
        setModalConfig({
            title: t('reject_product') || 'Reject Product',
            content: (
                <div>
                    <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>{t('provide_rejection_reason') || 'Please provide a reason for rejecting this product:'}</p>
                    <textarea
                        className={styles['admin-form-textarea']}
                        placeholder={t('rejection_placeholder') || "e.g. Low quality images, missing specifications..."}
                        id="reject-note-input"
                        autoFocus
                    />
                </div>
            ),
            type: 'danger',
            confirmText: t('reject') || 'Reject',
            onConfirm: async () => {
                const noteValue = (document.getElementById('reject-note-input') as HTMLTextAreaElement)?.value || '';
                if (!noteValue.trim()) { showToast(t('please_enter_rejection_reason') || 'Please enter a rejection reason.', 'error'); return; }
                try {
                    await api.put(`/admin/products/${id}/reject`, { note: noteValue });
                    setData(data.map(p => p._id === id ? { ...p, approval_status: 'rejected' } : p));
                    showToast(t('product_rejected_success') || 'Product rejected.', 'success');
                    setModalOpen(false);
                } catch (err) { showToast(t('failed_reject_product') || 'Failed to reject product.', 'error'); }
            }
        });
        setModalOpen(true);
    };

    const pendingProducts = data.filter(item => item.approval_status === 'pending');

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = pendingProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(pendingProducts.length / itemsPerPage);

    // Export CSV handler
    const handleExportCSV = () => {
        if (!pendingProducts.length) return;
        const headers = ["Product Name", "SKU ID", "Seller", "Submitted Date", "Status"];
        const rows = pendingProducts.map(p => [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p._id}"`,
            `"${p.supplier?.company_name || `${p.supplier?.first_name || ''} ${p.supplier?.last_name || ''}`}"`,
            `"${new Date(p.createdAt).toLocaleDateString()}"`,
            `"${p.approval_status}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `pending_approvals_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
                <div style={{
                    width: '42px', height: '42px', border: '3.5px solid #e2e8f0',
                    borderTop: '3.5px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

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

            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{t('product_approvals') || 'Product Approvals'}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Product Approvals</span>
                    </div>
                </div>
                <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                </button>
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {pendingProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, pendingProducts.length)} of {pendingProducts.length} pending product approvals
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']} style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Seller</th>
                                <th>Submitted Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                        {t('no_pending_products') || 'No pending products to review.'}
                                    </td>
                                </tr>
                            ) : (
                                currentProducts.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']} style={{ background: '#fff7ed', color: '#ea580c' }}>
                                                    📦
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{item.name}</div>
                                                    <div className={styles['usr-id']}>SKU: #{item._id.slice(-6).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#334155', fontSize: '0.84rem' }}>
                                            {item.supplier?.company_name || `${item.supplier?.first_name || ''} ${item.supplier?.last_name || ''}` || 'N/A'}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <div className={styles['usr-status-active']} style={{ background: '#fff7ed', color: '#ea580c' }}>
                                                <span className={styles['dot']} style={{ background: '#ea580c' }}></span>
                                                Pending Approval
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleApprove(item._id)}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a',
                                                        border: '1px solid #bbf7d0', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClick(item._id)}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626',
                                                        border: '1px solid #fecaca', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles['usr-pagination-bar']}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Showing Page {currentPage} of {totalPages} ({pendingProducts.length} total approvals)
                        </span>
                        <div className={styles['usr-pagination-pages']}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['usr-page-arrow']}>
                                ‹
                            </button>
                            {Array.from({ length: totalPages }).map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles['usr-page-num']} ${currentPage === idx + 1 ? styles['usr-active'] : ''}`}
                                    onClick={() => setCurrentPage(idx + 1)}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['usr-page-arrow']}>
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminApprovals;
