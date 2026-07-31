import React, { useState, useEffect, memo } from 'react';
import api from '@/services/axiosConfig';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import styles from './AdminDashboardNew.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

/* ── Interfaces ─────────────────────────────────────────── */
interface DashboardStats {
    buyerCount: number; supplierCount: number; adminCount: number;
    products: number; categories: number; pendingCompanies: number;
    totalEarnings: number; adminEarnings: number; monthlyEarnings: number;
    userDistribution: number[];
    monthlyRevenue: { labels: string[]; data: number[] };
    todayUserCount: number; todayBuyerCount: number; todaySupplierCount: number;
    todayProductCount: number; todayOrderCount: number; todayEarnings: number;
    totalOrders: number; totalUsers: number;
}
interface RecentCompany {
    _id: string; company_name: string; verification_status: string;
    country?: string; createdAt: string; user_id?: { email: string };
}

/* ── KPI Card Component ─────────────────────────────────── */
const KPICard = memo(({ label, value, sublabel, icon, colorClass, trend }: {
    label: string; value: string; sublabel?: string;
    icon: React.ReactNode; colorClass: string; trend?: number;
}) => (
    <div className={`${styles['kpi-card']} ${styles[colorClass]}`}>
        <div className={styles['kpi-top-row']}>
            <div className={styles['kpi-icon']}>{icon}</div>
            {trend !== undefined && (
                <div className={styles['kpi-badge']}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className={styles['kpi-bottom-row']}>
            <div className={styles['kpi-value']}>{value}</div>
            <div className={styles['kpi-label']}>{label}</div>
            {sublabel && <div className={styles['kpi-sublabel']}>{sublabel}</div>}
        </div>
    </div>
));
KPICard.displayName = 'KPICard';

/* ── Status Badge ───────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        verified: 'status-verified', pending: 'status-pending',
        rejected: 'status-rejected', submitted: 'status-pending',
    };
    return (
        <span className={`${styles['status-badge']} ${styles[map[status?.toLowerCase()] || 'status-pending']}`}>
            <span className={styles['dot']} />
            {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
        </span>
    );
};

/* ── Avatar Gradients ───────────────────────────────────── */
const AV_GRADIENTS = [
    'linear-gradient(135deg, #ff6a00 0%, #ff8c42 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
    'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
    'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
];
const avatarColor = (name: string) => AV_GRADIENTS[(name?.charCodeAt(0) || 0) % AV_GRADIENTS.length];

/* ── SVG Icons ──────────────────────────────────────────── */
const Icon = {
    users:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    buyers:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    suppliers:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    products: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    orders:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    earnings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    revenue:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    gmv:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    bolt:     <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    grid:     <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    clock:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const AdminDashboard = ({ tab, subtab }: { tab?: string; subtab?: string }) => {
    const { convertPrice, t, user } = useAuth();
    const router = useRouter();

    const userRoles = user?.roles || (user?.role ? [user?.role] : []);
    const isSuperAdmin = userRoles.includes('admin') && !user?.role_id;
    const canViewUsers      = isSuperAdmin || !!user?.permissions?.includes('users.view');
    const canViewProducts   = isSuperAdmin || !!user?.permissions?.includes('products.view');
    const canViewOrders     = isSuperAdmin || !!user?.permissions?.includes('orders.view');
    const canViewFinancials = isSuperAdmin || !!user?.permissions?.includes('reports.view');

    const [stats, setStats] = useState<DashboardStats>({
        buyerCount:0, supplierCount:0, adminCount:0, products:0, categories:0,
        pendingCompanies:0, totalEarnings:0, adminEarnings:0, monthlyEarnings:0,
        userDistribution:[0,0,0], monthlyRevenue:{labels:[],data:[]},
        todayUserCount:0, todayBuyerCount:0, todaySupplierCount:0,
        todayProductCount:0, todayOrderCount:0, todayEarnings:0,
        totalOrders:0, totalUsers:0,
    });
    const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [sr, cr] = await Promise.all([api.get('/admin/stats'), api.get('/admin/companies')]);
                setStats(sr.data);
                setRecentCompanies(cr.data.slice(0, 6));
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
        const t = setInterval(() => api.get('/admin/stats').then(r => setStats(r.data)).catch(()=>{}), 30000);
        return () => clearInterval(t);
    }, []);

    /* ── Chart Data ──────────────────────────────────────── */
    const revLabels  = stats.monthlyRevenue?.labels?.length  ? stats.monthlyRevenue.labels  : ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
    const revValues  = stats.monthlyRevenue?.data?.length    ? stats.monthlyRevenue.data    : [0,0,0,0,0,0,0];

    const lineData = {
        labels: revLabels,
        datasets: [{
            label: 'Revenue',
            data: revValues,
            borderColor: '#ff6a00',
            borderWidth: 2.5,
            backgroundColor: (ctx: any) => {
                const { ctx: c, chartArea } = ctx.chart;
                if (!chartArea) return 'transparent';
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, 'rgba(255,106,0,0.22)');
                g.addColorStop(1, 'rgba(255,106,0,0.0)');
                return g;
            },
            tension: 0.42, fill: true,
            pointBackgroundColor: '#ff6a00',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 7,
        }]
    };

    const lineOpts: any = {
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#94a3b8',
                bodyColor: '#ffffff',
                padding: 12, cornerRadius: 10, displayColors: false,
                titleFont: { size: 11 }, bodyFont: { size: 14, weight: 'bold' },
            }
        },
        scales: {
            x: { grid:{ display:false }, border:{ display:false }, ticks:{ color:'#64748b', font:{ size:11, weight:'600' } } },
            y: { grid:{ color:'#f1f5f9' }, border:{ display:false }, ticks:{ color:'#64748b', font:{ size:11 } } }
        }
    };

    const totalDist = (stats.userDistribution?.[0]||0) + (stats.userDistribution?.[1]||0) + (stats.userDistribution?.[2]||0);
    const donutData = {
        labels: ['Buyers','Suppliers','Admins'],
        datasets: [{
            data: stats.userDistribution?.length ? stats.userDistribution : [1,0,0],
            backgroundColor: ['#ff6a00','#3b82f6','#8b5cf6'],
            hoverBackgroundColor: ['#e55a00','#2563eb','#7c3aed'],
            borderWidth: 0, hoverOffset: 6,
        }]
    };

    const donutOpts: any = {
        maintainAspectRatio: false,
        cutout: '78%',
        plugins: { legend:{ display:false }, tooltip:{
            backgroundColor:'#0d1117', titleColor:'#8892a4', bodyColor:'#fff',
            borderColor:'rgba(255,255,255,0.08)', borderWidth:1,
            padding:10, cornerRadius:8, displayColors:false,
        }}
    };

    if (loading) return (
        <div className={styles['adm-loading']}>
            <div className={styles['adm-spinner']} />
            <span>Loading dashboard...</span>
        </div>
    );

    return (
        <div className={styles['adm-dashboard']}>

            {/* ══ ROW 1: User KPI Cards ══════════════════════════ */}
            {canViewUsers && (
                <div className={styles['kpi-grid']}>
                    <KPICard colorClass="kpi-orange" label="Total Users"
                        value={(stats.totalUsers||0).toLocaleString()}
                        sublabel={stats.todayUserCount > 0 ? `+${stats.todayUserCount} new today` : 'All registered'}
                        icon={Icon.users} trend={12}
                    />
                    <KPICard colorClass="kpi-blue" label="Total Buyers"
                        value={(stats.buyerCount||0).toLocaleString()}
                        sublabel={stats.todayBuyerCount > 0 ? `+${stats.todayBuyerCount} today` : 'Active shoppers'}
                        icon={Icon.buyers} trend={8}
                    />
                    <KPICard colorClass="kpi-purple" label="Total Suppliers"
                        value={(stats.supplierCount||0).toLocaleString()}
                        sublabel={stats.todaySupplierCount > 0 ? `+${stats.todaySupplierCount} today` : 'Verified sellers'}
                        icon={Icon.suppliers} trend={15}
                    />
                    <KPICard colorClass="kpi-green" label="Total Products"
                        value={(stats.products||0).toLocaleString()}
                        sublabel={stats.todayProductCount > 0 ? `+${stats.todayProductCount} listed today` : 'Active inventory'}
                        icon={Icon.products} trend={5}
                    />
                </div>
            )}

            {/* ══ ROW 2: Financial KPI Cards ══════════════════════ */}
            {canViewFinancials && (
                <div className={styles['kpi-grid']}>
                    <KPICard colorClass="kpi-red" label="Total Orders"
                        value={(stats.totalOrders||0).toLocaleString()}
                        sublabel={stats.todayOrderCount > 0 ? `+${stats.todayOrderCount} today` : 'Lifetime orders'}
                        icon={Icon.orders} trend={22}
                    />
                    <KPICard colorClass="kpi-cyan" label="Admin Earnings"
                        value={convertPrice(stats.adminEarnings||0).formatted}
                        sublabel="Commissions + fees"
                        icon={Icon.earnings} trend={18}
                    />
                    <KPICard colorClass="kpi-indigo" label="Monthly Revenue"
                        value={convertPrice(stats.monthlyEarnings||0).formatted}
                        sublabel="Current month GMV"
                        icon={Icon.revenue} trend={-2}
                    />
                    <KPICard colorClass="kpi-teal" label="Total GMV"
                        value={convertPrice(stats.totalEarnings||0).formatted}
                        sublabel="Lifetime gross volume"
                        icon={Icon.gmv} trend={40}
                    />
                </div>
            )}

            {/* ══ ROW 3: Charts ═══════════════════════════════════ */}
            {(canViewFinancials || canViewUsers) && (
                <div className={styles['charts-row']}>
                    {/* Revenue Line Chart */}
                    {canViewFinancials && (
                        <div className={styles['dark-card']}>
                            <div className={styles['dark-card-header']}>
                                <div>
                                    <p className={styles['dark-card-title']}>Revenue Analytics</p>
                                    <p className={styles['dark-card-sub']}>Monthly platform GMV trend</p>
                                </div>
                                <span className={styles['live-badge']}>
                                    <span className={styles['live-dot']} /> Live
                                </span>
                            </div>
                            <div className={styles['dark-card-body']}>
                                <div className={styles['chart-area']}>
                                    <Line data={lineData} options={lineOpts} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Donut Chart */}
                    {canViewUsers && (
                        <div className={styles['dark-card']}>
                            <div className={styles['dark-card-header']}>
                                <div>
                                    <p className={styles['dark-card-title']}>User Distribution</p>
                                    <p className={styles['dark-card-sub']}>Breakdown by role</p>
                                </div>
                            </div>
                            <div className={styles['donut-body']}>
                                <div className={styles['donut-container']}>
                                    <Doughnut data={donutData} options={donutOpts} />
                                    <div className={styles['donut-center']}>
                                        <strong className={styles['donut-center-num']}>{totalDist.toLocaleString()}</strong>
                                        <span className={styles['donut-center-lbl']}>Total</span>
                                    </div>
                                </div>
                                <div className={styles['donut-legend']}>
                                    {['Buyers','Suppliers','Admins'].map((lbl,i) => (
                                        <div key={lbl} className={styles['donut-legend-row']}>
                                            <div className={styles['donut-legend-left']}>
                                                <span className={styles['donut-dot']} style={{ background: donutData.datasets[0].backgroundColor[i] }} />
                                                {lbl}
                                            </div>
                                            <span className={styles['donut-legend-val']}>{(stats.userDistribution?.[i]||0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══ ROW 4: Table (Left) + Right Stack (Quick Actions & Recent Activity) ══ */}
            <div className={styles['bottom-row']}>

                {/* Left: Recent Applications Table */}
                {canViewUsers && (
                    <div className={styles['dark-card']}>
                        <div className={styles['dark-card-header']}>
                            <div>
                                <p className={styles['dark-card-title']}>Recent Applications</p>
                                <p className={styles['dark-card-sub']}>Review and verify new suppliers</p>
                            </div>
                            <button className={styles['view-all-btn']} onClick={() => router.push('/admin/verifications')}>
                                View all →
                            </button>
                        </div>
                        <div className={styles['data-table-wrap']}>
                            <table className={styles['data-table']}>
                                <thead>
                                    <tr>
                                        <th>Applicant</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCompanies.length > 0 ? recentCompanies.map(c => (
                                        <tr key={c._id}>
                                            <td>
                                                <div className={styles['company-cell']}>
                                                    <div className={styles['company-avatar']} style={{ background: avatarColor(c.company_name) }}>
                                                        {c.company_name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className={styles['company-name']}>{c.company_name}</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>{c.user_id?.email || '@applicant.com'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles['td-muted']}>
                                                {new Date(c.createdAt).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}
                                            </td>
                                            <td><StatusBadge status={c.verification_status} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className={styles['empty-row']}>No company applications yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Right Stack: Quick Actions & Recent Activity */}
                <div className={styles['right-stack']}>
                    {/* Quick Actions Card */}
                    <div className={styles['dark-card']}>
                        <div className={styles['dark-card-header']}>
                            <p className={styles['panel-title']}>
                                <span className={styles['panel-title-icon']}>{Icon.bolt}</span>
                                Quick Actions
                            </p>
                        </div>
                        <div className={styles['dark-card-body']}>
                            <div className={styles['qa-grid']}>
                                {[
                                    { label:'Add User',       path:'/admin/users',         icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
                                    { label:'Add Category',   path:'/admin/categories',    icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg> },
                                    { label:'Verify Company', path:'/admin/verifications', icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
                                    { label:'Orders',         path:'/admin/orders',        icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> },
                                    { label:'Products',       path:'/admin/products',      icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
                                    { label:'Settings',       path:'/admin/settings',      icon:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
                                ].map(a => (
                                    <button key={a.path} className={styles['qa-btn']} onClick={() => router.push(a.path)}>
                                        <div className={styles['qa-icon']}>{a.icon}</div>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Card */}
                    {recentCompanies.length > 0 && (
                        <div className={styles['dark-card']}>
                            <div className={styles['dark-card-header']}>
                                <p className={styles['panel-title']}>
                                    <span className={styles['panel-title-icon']}>{Icon.clock}</span>
                                    Recent Activity
                                </p>
                            </div>
                            {recentCompanies.slice(0,4).map((c,i) => {
                                const ok = c.verification_status === 'verified';
                                return (
                                    <div key={i} className={styles['activity-item']}>
                                        <div className={styles['activity-icon']} style={{ background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: ok ? '#4ade80' : '#fbbf24' }}>
                                            {ok
                                                ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                                : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            }
                                        </div>
                                        <div className={styles['activity-content']}>
                                            <div className={styles['activity-title']}>{ok ? 'Company Verified' : 'New Application'}</div>
                                            <div className={styles['activity-desc']}>{c.company_name}</div>
                                        </div>
                                        <div className={styles['activity-time']}>
                                            {new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
