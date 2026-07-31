import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

interface PermissionItem {
    _id: string;
    module_name: string;
    permission_name: string;
    slug: string;
}

const AdminPermissions: React.FC = () => {
    const { t } = useAuth();
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await api.get('/admin/permissions');
                setPermissions(res.data || []);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch permissions');
            } finally {
                setLoading(false);
            }
        };
        fetchPermissions();
    }, []);

    // Filter permissions by search
    const filteredPermissions = permissions.filter(p =>
        p.permission_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.slug?.toLowerCase().includes(search.toLowerCase()) ||
        p.module_name?.toLowerCase().includes(search.toLowerCase())
    );

    // Group permissions by module_name
    const groupedPermissions = filteredPermissions.reduce((acc, curr) => {
        if (!acc[curr.module_name]) {
            acc[curr.module_name] = [];
        }
        acc[curr.module_name].push(curr);
        return acc;
    }, {} as Record<string, PermissionItem[]>);

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
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>Permission List</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>Permission List</span>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '14px 20px', borderRadius: '14px', background: '#fff1f2', color: '#e11d48', fontWeight: '700', fontSize: '0.86rem' }}>
                    {error}
                </div>
            )}

            {/* Main Card Wrapper */}
            <div className={styles['usr-main-card']}>
                {/* Search Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search permission by name, module, or slug (e.g. orders.create)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {Object.keys(groupedPermissions).length} system modules ({filteredPermissions.length} total permissions)
                </div>

                {/* Cards Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                    gap: '20px',
                    padding: '24px'
                }}>
                    {Object.keys(groupedPermissions).length > 0 ? (
                        Object.keys(groupedPermissions).map((moduleName) => (
                            <div
                                key={moduleName}
                                style={{
                                    background: '#ffffff',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '18px',
                                    padding: '20px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: '#fff7ed', border: '1px solid #ffedd5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px'
                                        }}>
                                            🔒
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                                            {moduleName}
                                        </h3>
                                    </div>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 800, color: '#ff6a00',
                                        background: '#fff7ed', padding: '4px 10px', borderRadius: '20px',
                                        border: '1px solid #ffedd5'
                                    }}>
                                        {groupedPermissions[moduleName].length} Perms
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {groupedPermissions[moduleName].map((perm) => (
                                        <div
                                            key={perm._id}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: '10px 14px',
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                border: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                                                {perm.permission_name}
                                            </span>
                                            <code style={{ fontSize: '11px', color: '#ea580c', fontWeight: '700', fontFamily: 'monospace' }}>
                                                {perm.slug}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                            No permissions match your search query.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPermissions;
