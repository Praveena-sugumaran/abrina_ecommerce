'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface Order {
    _id: string;
    status: string;
    payment_status: string;
    total_amount: number;
    buyer_id: {
        first_name: string;
        last_name: string;
        email: string;
    };
    supplier_id: {
        company_name?: string;
        first_name: string;
        last_name: string;
    };
    createdAt: string;
}

const AdminOrders = () => {
    const { showToast } = useToast();
    const { siteSettings, t, convertPrice } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(siteSettings?.pagination_limit || 10);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (siteSettings?.pagination_limit) {
            setItemsPerPage(siteSettings.pagination_limit);
        }
    }, [siteSettings?.pagination_limit]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data } = await api.get('/orders/admin/all');
            setOrders(data);
            setLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch orders');
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;
        try {
            await api.delete(`/orders/admin/${id}`);
            setOrders(orders.filter(order => order._id !== id));
            showToast('Order deleted successfully', 'success');
        } catch (err: any) {
            showToast('Error occurred', 'error');
        }
    };

    const handleClearPending = async () => {
        if (!window.confirm('Are you sure you want to delete ALL pending orders? This cannot be undone.')) return;
        try {
            const { data } = await api.delete('/orders/admin/clear-pending');
            showToast('Pending orders cleared', 'success');
            fetchOrders();
        } catch (err: any) {
            showToast('Error occurred', 'error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return "admin-badge-success";
            case 'pending': return "admin-badge-warning";
            case 'shipped': return "admin-badge-info";
            case 'cancelled': return "admin-badge-neutral";
            case 'delivered': return "admin-badge-neutral";
            default: return "admin-badge-neutral";
        }
    };

    // Calculate stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
    const ongoingOrders = orders.filter(o => {
        const s = o.status?.toLowerCase();
        return s && s !== 'delivered' && s !== 'cancelled' && s !== 'pending';
    }).length;
    const completedOrders = orders.filter(o => o.status?.toLowerCase() === 'delivered').length;
    const orderRevenue = orders.reduce((sum, o) => {
        if (o.payment_status === 'paid' && o.status !== 'cancelled') {
            return sum + (o.total_amount || 0);
        }
        return sum;
    }, 0);

    // Filter Logic
    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        return (
            order._id.toLowerCase().includes(query) ||
            `${order.buyer_id?.first_name} ${order.buyer_id?.last_name}`.toLowerCase().includes(query) ||
            order.buyer_id?.email?.toLowerCase().includes(query) ||
            order.supplier_id?.company_name?.toLowerCase().includes(query)
        );
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

    // Export CSV handler
    const handleExportCSV = () => {
        if (!orders.length) return;
        const headers = ["Order ID", "Buyer Name", "Buyer Email", "Seller", "Amount", "Status", "Payment Status", "Created Date"];
        const rows = orders.map(o => [
            `"${o._id}"`,
            `"${o.buyer_id?.first_name || ''} ${o.buyer_id?.last_name || ''}"`,
            `"${o.buyer_id?.email || ''}"`,
            `"${o.supplier_id?.company_name || `${o.supplier_id?.first_name || ''} ${o.supplier_id?.last_name || ''}`}"`,
            `"${o.total_amount || 0}"`,
            `"${o.status || ''}"`,
            `"${o.payment_status || ''}"`,
            `"${new Date(o.createdAt).toLocaleDateString()}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
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
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text-secondary, #64748b)' }}>
                    {t('loading_orders') || 'Loading orders...'}
                </span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Orders</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Orders</span>
                    </div>
                </div>
                <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                </button>
            </div>

            {error && (
                <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>
                    {error}
                </div>
            )}

            {/* Stat Cards Section */}
            <div className={styles['usr-stats-grid']} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-card-top']}>
                        <div className={styles['usr-stat-info']}>
                            <span className={styles['usr-stat-label']}>{t('total_orders') || 'Total Orders'}</span>
                            <span className={styles['usr-stat-value']}>{totalOrders}</span>
                        </div>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#fff5ee', color: '#ff6a00' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        </div>
                    </div>
                </div>

                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-card-top']}>
                        <div className={styles['usr-stat-info']}>
                            <span className={styles['usr-stat-label']}>{t('pending_orders') || 'Pending Orders'}</span>
                            <span className={styles['usr-stat-value']} style={{ color: '#d97706' }}>{pendingOrders}</span>
                        </div>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#fef3c7', color: '#d97706' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                    </div>
                </div>

                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-card-top']}>
                        <div className={styles['usr-stat-info']}>
                            <span className={styles['usr-stat-label']}>{t('ongoing_orders') || 'Ongoing Orders'}</span>
                            <span className={styles['usr-stat-value']} style={{ color: '#2563eb' }}>{ongoingOrders}</span>
                        </div>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#eff6ff', color: '#2563eb' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        </div>
                    </div>
                </div>

                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-card-top']}>
                        <div className={styles['usr-stat-info']}>
                            <span className={styles['usr-stat-label']}>{t('completed_orders') || 'Completed Orders'}</span>
                            <span className={styles['usr-stat-value']} style={{ color: '#16a34a' }}>{completedOrders}</span>
                        </div>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                    </div>
                </div>

                <div className={styles['usr-stat-card']}>
                    <div className={styles['usr-stat-card-top']}>
                        <div className={styles['usr-stat-info']}>
                            <span className={styles['usr-stat-label']}>{t('paid_revenue') || 'Paid Revenue'}</span>
                            <span className={styles['usr-stat-value']} style={{ color: '#9333ea', fontSize: '1.45rem' }}>{convertPrice(orderRevenue).formatted}</span>
                        </div>
                        <div className={styles['usr-stat-icon-wrap']} style={{ background: '#f3e8ff', color: '#9333ea' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className={styles['usr-main-card']}>
                {/* Search & Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search orders by ID, buyer name, email or seller..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']} style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Seller</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                currentOrders.map(order => (
                                    <tr key={order._id}>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '0.84rem' }}>
                                                #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles['usr-cell']} style={{ gap: '10px' }}>
                                                <div className={styles['usr-avatar']} style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                                                    {order.buyer_id?.first_name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']} style={{ fontSize: '0.84rem' }}>
                                                        {order.buyer_id?.first_name} {order.buyer_id?.last_name}
                                                    </div>
                                                    <div className={styles['usr-id']} style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.buyer_id?.email}>
                                                        {order.buyer_id?.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.84rem', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.supplier_id?.company_name || `${order.supplier_id?.first_name || ''} ${order.supplier_id?.last_name || ''}`}>
                                                {order.supplier_id?.company_name || `${order.supplier_id?.first_name || ''} ${order.supplier_id?.last_name || ''}` || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
                                            {convertPrice(order.total_amount || 0).formatted}
                                        </td>
                                        <td>
                                            <div className={styles['usr-status-active']} style={{
                                                padding: '4px 10px', fontSize: '0.74rem',
                                                background: order.status?.toLowerCase() === 'delivered' ? '#f0fdf4' : order.status?.toLowerCase() === 'pending' ? '#fff7ed' : '#eff6ff',
                                                color: order.status?.toLowerCase() === 'delivered' ? '#16a34a' : order.status?.toLowerCase() === 'pending' ? '#ea580c' : '#2563eb'
                                            }}>
                                                <span className={styles['dot']} style={{
                                                    background: order.status?.toLowerCase() === 'delivered' ? '#16a34a' : order.status?.toLowerCase() === 'pending' ? '#ea580c' : '#2563eb'
                                                }}></span>
                                                {order.status || 'Pending'}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '20px',
                                                background: order.payment_status === 'paid' ? '#f0fdf4' : '#f1f5f9',
                                                color: order.payment_status === 'paid' ? '#16a34a' : '#64748b'
                                            }}>
                                                {order.payment_status || 'unpaid'}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600, fontSize: '0.8rem' }}>
                                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles['usr-actions-cell']} style={{ justifyContent: 'flex-end' }}>
                                                <Link
                                                    href={`/admin/orders/${order._id}`}
                                                    className={styles['usr-icon-btn']}
                                                    title="View order details"
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteOrder(order._id)}
                                                    className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`}
                                                    title="Delete order"
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
                            Showing Page {currentPage} of {totalPages} ({filteredOrders.length} total orders)
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

export default AdminOrders;
