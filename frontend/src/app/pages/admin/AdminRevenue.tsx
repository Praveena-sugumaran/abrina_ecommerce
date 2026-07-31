import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface Order {
    _id: string;
    createdAt: string;
    payment_status: string;
    status: string;
    total_amount: number;
}

const AdminRevenue = () => {
    const { t } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('last6months');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await api.get('/orders/admin/all');
                setOrders(data);
                setLoading(false);
            } catch (err) { setError(t('failed_fetch_revenue') || 'Failed to fetch revenue data'); setLoading(false); }
        };
        fetchOrders();
    }, []);

    const analyticsData = useMemo(() => {
        if (!orders.length) return { months: ['Jan','Feb','Mar','Apr','May','Jun'], revenues: [0,0,0,0,0,0], orderCounts: [0,0,0,0,0,0], totalRevenue: 0, totalOrders: 0, avgOrder: 0, growth: 0 };

        const now = new Date();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let monthsToDisplay = dateRange === 'last12months' ? 12 : dateRange === 'thisyear' ? now.getMonth() + 1 : 6;

        const displayList = [];
        for (let i = monthsToDisplay - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            displayList.push({ month: d.getMonth(), year: d.getFullYear(), label: monthNames[d.getMonth()] });
        }

        const stats = displayList.map(m => {
            const monthlyOrders = orders.filter(o => { const od = new Date(o.createdAt); return od.getMonth() === m.month && od.getFullYear() === m.year; });
            const paidOrders = monthlyOrders.filter(o => o.payment_status === 'paid');
            const totalInPeriod = monthlyOrders.filter(o => o.status !== 'pending' && o.status !== 'cancelled');
            const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            return { label: m.label, revenue, count: totalInPeriod.length };
        });

        const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
        const totalOrders = stats.reduce((sum, s) => sum + s.count, 0);
        const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
        
        const currentRev = stats[stats.length - 1]?.revenue || 0;
        const prevRev = stats[stats.length - 2]?.revenue || 0;
        const growthNum = prevRev > 0 ? (((currentRev - prevRev) / prevRev) * 100) : 0;
        const growth = growthNum.toFixed(1);

        return { months: stats.map(s => s.label), revenues: stats.map(s => s.revenue), orderCounts: stats.map(s => s.count), totalRevenue, totalOrders, avgOrder, growth, growthNum };
    }, [orders, dateRange]);

    const { months, revenues, orderCounts, totalRevenue, totalOrders, avgOrder, growth, growthNum } = analyticsData;
    const maxRev = Math.max(...revenues, 1);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
                <div style={{
                    width: '44px', height: '44px', border: '4px solid #e2e8f0',
                    borderTop: '4px solid #ff6a00', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>{t('loading_analytics') || 'Loading analytics...'}</span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const handleExportCSV = () => {
        if (!months.length) return;
        const headers = ["Month", "Revenue ($)", "Orders Count", "Avg Order Value ($)", "Growth (MoM)"];
        const rows = [...months].reverse().map((month, idx) => {
            const i = months.length - 1 - idx;
            const growthVal = i === 0 || revenues[i-1] === 0 ? '—' : `${(((revenues[i]-revenues[i-1])/revenues[i-1])*100).toFixed(1)}%`;
            return [
                `"${month}"`,
                `"${revenues[i]}"`,
                `"${orderCounts[i]}"`,
                `"${orderCounts[i] > 0 ? Math.round(revenues[i]/orderCounts[i]) : 0}"`,
                `"${growthVal}"`
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `revenue_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{t('revenue_analytics') || 'Revenue Analytics'}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Revenue Analytics</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export CSV
                    </button>
                    <select
                        style={{ padding: '9px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                    >
                        <option value="last6months">{t('last_6_months') || 'Last 6 Months'}</option>
                        <option value="last12months">{t('last_12_months') || 'Last 12 Months'}</option>
                        <option value="thisyear">{t('this_year') || 'This Year'}</option>
                    </select>
                </div>
            </div>

            {error && <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>{error}</div>}

            {/* Stats Cards Section */}
            <div className={styles['usr-stats-grid']}>
                {[
                    { 
                        label: t('total_revenue') || 'Total Revenue', 
                        value: `$${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1) + 'K' : totalRevenue.toLocaleString()}`, 
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
                        color: '#2563eb',
                        bg: '#eff6ff'
                    },
                    { 
                        label: t('total_orders') || 'Total Orders', 
                        value: totalOrders.toLocaleString(), 
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
                        color: '#ea580c',
                        bg: '#fff7ed'
                    },
                    { 
                        label: t('avg_order_value') || 'Avg Order Value', 
                        value: `$${avgOrder.toLocaleString()}`, 
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>,
                        color: '#7e22ce',
                        bg: '#f3e8ff'
                    },
                    { 
                        label: t('growth_mom') || 'Growth (MoM)', 
                        value: `${growthNum > 0 ? '+' : ''}${growth}%`, 
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
                        color: '#16a34a',
                        bg: '#f0fdf4'
                    },
                ].map((card, i) => (
                    <div key={i} className={styles['usr-stat-card']}>
                        <div className={styles['usr-stat-header']}>
                            <span className={styles['usr-stat-label']}>{card.label}</span>
                            <div className={styles['usr-stat-icon-wrap']} style={{ background: card.bg, color: card.color }}>
                                {card.icon}
                            </div>
                        </div>
                        <div className={styles['usr-stat-val']}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Bar Chart Card */}
            <div className={styles['usr-main-card']} style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{t('monthly_revenue') || 'Monthly Revenue'}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ff6a00', display: 'inline-block' }}></span> Peak</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1', display: 'inline-block' }}></span> Normal</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '240px', padding: '0 12px' }}>
                    {months.map((month, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                                ${revenues[i] >= 1000 ? (revenues[i]/1000).toFixed(1) + 'K' : revenues[i]}
                            </div>
                            <div style={{
                                width: '100%',
                                height: `${(revenues[i] / maxRev) * 180}px`,
                                background: revenues[i] === Math.max(...revenues) && revenues[i] > 0 ? '#ff6a00' : '#cbd5e1',
                                borderRadius: '8px 8px 4px 4px',
                                transition: 'all 0.5s ease',
                                cursor: 'pointer'
                            }} title={`$${revenues[i].toLocaleString()}`} />
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{month}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Breakdown Table Card */}
            <div className={styles['usr-main-card']}>
                <div className={styles['usr-filter-bar']} style={{ justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                        {t('detailed_performance') || 'Detailed Performance'}
                    </h3>
                    <button onClick={() => window.print()} className={styles['usr-btn-reset']} style={{ padding: '7px 16px', borderRadius: '10px' }}>
                        {t('export_pdf') || 'Export PDF'}
                    </button>
                </div>
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>{t('month') || 'Month'}</th>
                                <th style={{ textAlign: 'left' }}>{t('revenue') || 'Revenue'}</th>
                                <th style={{ textAlign: 'left' }}>{t('orders') || 'Orders'}</th>
                                <th style={{ textAlign: 'left' }}>{t('avg_value') || 'Avg Value'}</th>
                                <th style={{ textAlign: 'left' }}>{t('growth') || 'Growth'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...months].reverse().map((month, idx) => {
                                const i = months.length - 1 - idx;
                                const growthVal = i === 0 || revenues[i-1] === 0 ? '—' : `${(((revenues[i]-revenues[i-1])/revenues[i-1])*100).toFixed(1)}%`;
                                const isPositive = growthVal !== '—' && parseFloat(growthVal) >= 0;
                                return (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{month}</td>
                                        <td style={{ fontWeight: 800, color: '#0f172a' }}>${revenues[i].toLocaleString()}</td>
                                        <td style={{ fontWeight: 700, color: '#475569' }}>{orderCounts[i]}</td>
                                        <td style={{ fontWeight: 700, color: '#475569' }}>${orderCounts[i] > 0 ? Math.round(revenues[i]/orderCounts[i]).toLocaleString() : 0}</td>
                                        <td style={{ fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }}>{growthVal}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminRevenue;
