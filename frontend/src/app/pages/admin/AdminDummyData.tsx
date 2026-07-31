import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface DummyDataLog {
    _id: string;
    action: 'IMPORT' | 'CLEANUP' | 'RESET';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    initiatedBy?: { email?: string; first_name?: string; last_name?: string } | null;
    triggerType: 'manual' | 'cron' | 'cli';
    importVersion?: string;
    serverHostname?: string;
    memoryUsage?: { heapUsedMB: number; heapTotalMB: number } | null;
    stats: {
        users: number;
        products: number;
        categories: number;
        orders: number;
        transactions: number;
        companies: number;
        reviews: number;
        disputes: number;
    };
    logs: string[];
    error?: string | null;
    durationMs: number;
    createdAt: string;
}

interface SystemStatus {
    totalUsers: number;
    totalProducts: number;
    lastImportTime: string | null;
    isCurrentlyRunning: boolean;
    activeAction: 'processing' | 'idle';
    activeWorker?: string | null;
    serverHostname?: string;
    importVersion?: string;
}

const AdminDummyData = () => {
    const { t } = useAuth();
    const [status, setStatus] = useState<SystemStatus>({
        totalUsers: 0,
        totalProducts: 0,
        lastImportTime: null,
        isCurrentlyRunning: false,
        activeAction: 'idle',
        activeWorker: null,
        serverHostname: '',
        importVersion: 'v1.0.0'
    });
    const [historyLogs, setHistoryLogs] = useState<DummyDataLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<DummyDataLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Modal states
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);

    const fetchStatusAndLogs = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const statusRes = await api.get('/admin/dummy-data/status');
            if (statusRes.data && statusRes.data.success) {
                setStatus(statusRes.data.data);
            }
            
            const logsRes = await api.get('/admin/dummy-data/logs');
            if (logsRes.data && logsRes.data.success) {
                const logsList = logsRes.data.data;
                setHistoryLogs(logsList);
                if (logsList.length > 0 && !selectedLog) {
                    setSelectedLog(logsList[0]);
                } else if (logsList.length > 0) {
                    // Update active selected log details if matching
                    const updatedSelected = logsList.find((l: DummyDataLog) => l._id === selectedLog?._id);
                    if (updatedSelected) setSelectedLog(updatedSelected);
                }
            }
        } catch (err: any) {
            console.error('Failed to sync management panel', err);
            toast.error(err.response?.data?.message || 'Failed to communicate with Mongo database server.');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatusAndLogs(true);

        // Auto poll status every 10 seconds to keep track of logs when running in background
        const interval = setInterval(() => {
            fetchStatusAndLogs(false);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const handleTriggerImport = async () => {
        setShowImportModal(false);
        setActionLoading(true);
        try {
            const { data } = await api.post('/admin/dummy-data/import');
            if (data.success) {
                toast.success(data.message || 'Demo dataset populated successfully.');
                await fetchStatusAndLogs(false);
                if (data.data) {
                    setSelectedLog(data.data);
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Restoration failed due to MongoDB execution timeout.');
            await fetchStatusAndLogs(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTriggerCleanup = async () => {
        setShowCleanupModal(false);
        setActionLoading(true);
        try {
            const { data } = await api.post('/admin/dummy-data/cleanup');
            if (data.success) {
                toast.success(data.message || 'Dynamic system data deleted successfully.');
                await fetchStatusAndLogs(false);
                if (data.data) {
                    setSelectedLog(data.data);
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Data cleanup failed.');
            await fetchStatusAndLogs(false);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="admin-loading-spinner" style={{
                    width: '48px', height: '48px', border: '4.5px solid #f1f5f9',
                    borderTop: '4.5px solid #0d2e67', borderRadius: '50%',
                    animation: 'spin 1s linear infinite', margin: '0 auto 16px auto'
                }} />
                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                    Syncing Reset & Import Manager...
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>Fetching current database status logs</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <div className="admin-page" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Styles */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .metric-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.25s ease;
                }
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05);
                    border-color: #cbd5e1;
                }
                .console-panel {
                    font-family: 'Consolas', 'Courier New', monospace;
                    background-color: #0f172a;
                    color: #38bdf8;
                    border-radius: 8px;
                    padding: 16px;
                    height: 380px;
                    overflow-y: auto;
                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
                    line-height: 1.6;
                    font-size: 13px;
                }
                .log-row {
                    display: flex;
                    gap: 8px;
                    padding: 4px 0;
                    border-bottom: 1px dashed rgba(255,255,255,0.05);
                }
                .log-row:hover {
                    background-color: rgba(255,255,255,0.03);
                }
                .admin-button-primary {
                    background: #0d2e67;
                    color: #fff;
                    font-weight: 700;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .admin-button-primary:hover:not(:disabled) {
                    background: #0b2654;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(13,46,103,0.25);
                }
                .admin-button-danger {
                    background: #ef4444;
                    color: #fff;
                    font-weight: 700;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .admin-button-danger:hover:not(:disabled) {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239,68,68,0.25);
                }
                .admin-button-secondary {
                    background: #f1f5f9;
                    color: #475569;
                    font-weight: 700;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 10px 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .admin-button-secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    background: #ffffff;
                    border-radius: 16px;
                    max-width: 520px;
                    width: 90%;
                    padding: 28px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                .status-pulse {
                    display: inline-block;
                    width: 10px; height: 10px;
                    background-color: #10b981;
                    border-radius: 50%;
                    position: relative;
                }
                .status-pulse::after {
                    content: '';
                    position: absolute;
                    width: 100%; height: 100%;
                    background-color: inherit;
                    border-radius: inherit;
                    animation: pulse 1.6s ease-out infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.8); opacity: 0; }
                }
            `}</style>

            {/* Title Block */}
            <div className="admin-page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>Demo Data Reset & Import System</span>
                        {status.isCurrentlyRunning && (
                            <span className="admin-badge admin-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', padding: '4px 10px' }}>
                                <span className="status-pulse" style={{ backgroundColor: '#10b981' }}></span>
                                System Processing
                            </span>
                        )}
                    </h1>
                    <p className="admin-page-subtitle">Fully manage dummy B2B categories, products, customer accounts, and mediation logs. Trigger cleanups or complete system restorations.</p>
                </div>
            </div>

            {/* Overview Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="metric-card">
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(13,46,103,0.1)', color: '#0d2e67', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Active Demo Users</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{status.totalUsers}</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(13,46,103,0.1)', color: '#0d2e67', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Active Demo Products</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{status.totalProducts}</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Last Restored At</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginTop: '6px' }}>
                            {status.lastImportTime ? new Date(status.lastImportTime).toLocaleString() : 'Never'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Cards & Main Workstations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgGridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '24px' }}>
                
                {/* Control Panel Card */}
                <div className="admin-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        Database Controls & Actions
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Action 1: Import */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start', background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, minWidth: '240px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Import Predefined B2B Dummy Data</h4>
                                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>
                                    Deletes any existing demo users and custom products, and re-imports fresh structured mock buyer/supplier records, orders, transaction histories, reviews, and mediation disputes.
                                </p>
                            </div>
                            <button 
                                className="admin-button-primary"
                                onClick={() => setShowImportModal(true)}
                                disabled={actionLoading || status.isCurrentlyRunning}
                                style={{ flexShrink: 0 }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                {t('import_dummy') || 'Import Dummy Data'}
                            </button>
                        </div>

                        {/* Action 2: Cleanup */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start', background: '#fef2f2', padding: '20px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                            <div style={{ flex: 1, minWidth: '240px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#991b1b' }}>Clean All Dynamic Demo Data</h4>
                                <p style={{ margin: 0, fontSize: '12.5px', color: '#7f1d1d', lineHeight: '1.5' }}>
                                    Wipes out all orders, reviews, inquiries, chat logs, user wallets, transactions, customer accounts, and temporary product listings. <strong>Preserves critical admin records</strong> and master configurations.
                                </p>
                            </div>
                            <button 
                                className="admin-button-danger"
                                onClick={() => setShowCleanupModal(true)}
                                disabled={actionLoading || status.isCurrentlyRunning}
                                style={{ flexShrink: 0 }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                {t('cleanup_demo') || 'Cleanup Demo Data'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <div>
                            <strong>Daily Automated Task Enabled:</strong> The backend system will execute this cleanup and restore a fresh batch of demo B2B data automatically every single day at <strong>2:00 AM local time</strong>.
                        </div>
                    </div>
                </div>

                {/* Status Telemetry Card */}
                <div className="admin-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        System Status Telemetry
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Locking Engine</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: status.isCurrentlyRunning ? '#10b981' : '#64748b' }}>
                                {status.isCurrentlyRunning ? `MUTEX ENGAGED (${status.activeWorker || 'active'})` : 'RELEASED (IDLE)'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Dump Schema Version</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0d2e67' }}>
                                {status.importVersion || 'v1.0.4'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Server Hostname</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', fontFamily: 'monospace' }}>
                                {status.serverHostname || 'localhost'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Transaction Mode</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0d2e67' }}>
                                ACID SESSION / DYNAMIC FALLBACK
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Cron Trigger Scheduler</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                ACTIVE (02:00 AM)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Screen Log Console & Session History */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                
                {/* Panel 1: Session History */}
                <div className="admin-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                            Operation Session History
                        </h3>
                        <button 
                            onClick={() => fetchStatusAndLogs(false)} 
                            style={{ background: 'none', border: 'none', color: '#0d2e67', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Refresh
                        </button>
                    </div>

                    <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {historyLogs.map((log) => {
                            const isSelected = selectedLog?._id === log._id;
                            return (
                                <div 
                                    key={log._id}
                                    onClick={() => setSelectedLog(log)}
                                    style={{
                                        border: '1px solid',
                                        borderColor: isSelected ? '#0d2e67' : '#e2e8f0',
                                        backgroundColor: isSelected ? 'rgba(13,46,103,0.02)' : 'transparent',
                                        borderRadius: '8px',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {log.action === 'IMPORT' ? (
                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Full System Restore</>
                                            ) : (
                                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Database Cleanup</>
                                            )}
                                        </span>
                                        <span className={`admin-badge ${
                                            log.status === 'completed' ? 'admin-badge-success' : 
                                            log.status === 'failed' ? 'admin-badge-danger' : 
                                            'admin-badge-neutral'
                                        }`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                                        <span>Trigger: <strong style={{ textTransform: 'capitalize' }}>{log.triggerType}</strong></span>
                                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                    {log.durationMs > 0 && (
                                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                                            Time Elapsed: <strong>{(log.durationMs / 1000).toFixed(2)}s</strong>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {historyLogs.length === 0 && (
                            <div style={{ padding: '40px 20px', textItems: 'center', color: '#64748b', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                </div>
                                <h4 style={{ margin: '10px 0 4px 0' }}>No operations logged yet</h4>
                                <p style={{ margin: 0, fontSize: '12px' }}>Initialize a reset or cleanup action to view log telemetry sessions.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel 2: Live Log Stream Console */}
                <div className="admin-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        Session Telemetry Terminal Console
                    </h3>

                    {selectedLog ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px', color: '#64748b' }}>
                                <span>Session ID: <strong style={{ fontFamily: 'monospace' }}>{selectedLog._id}</strong></span>
                                {selectedLog.memoryUsage && (
                                    <span>Heap Memory: <strong>{selectedLog.memoryUsage.heapUsedMB}MB / {selectedLog.memoryUsage.heapTotalMB}MB</strong></span>
                                )}
                            </div>

                            <div className="console-panel">
                                {selectedLog.logs.map((line, idx) => (
                                    <div key={idx} className="log-row">
                                        <span style={{ color: '#64748b', select: 'none', minWidth: '24px' }}>{idx + 1}</span>
                                        <span>{line}</span>
                                    </div>
                                ))}

                                {selectedLog.error && (
                                    <div style={{ color: '#ef4444', marginTop: '12px', borderTop: '1px solid #ef4444', paddingTop: '8px', fontWeight: 'bold' }}>
                                        [CRITICAL ERROR] {selectedLog.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '380px', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', textItems: 'center', flexDirection: 'column', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                            </div>
                            <h4 style={{ margin: '12px 0 4px 0' }}>Terminal Offline</h4>
                            <p style={{ margin: 0, fontSize: '12.5px', padding: '0 24px' }}>Select an active or historical operation session from the history feed to stream logs.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal 1: Import Predefined Dummy Data */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(13,46,103,0.1)', color: '#0d2e67', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Trigger Database Restoration</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Re-populating baseline demo datasets</p>
                            </div>
                        </div>

                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                            Are you absolute certain you want to initiate a full dummy data restoration? 
                            This action will automatically <strong>delete all current orders, custom reviews, conversations, and user data</strong>, and replace them with standard verified B2B buyer and supplier mock portfolios.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="admin-button-secondary" onClick={() => setShowImportModal(false)}>
                                Cancel
                            </button>
                            <button className="admin-button-primary" onClick={handleTriggerImport}>
                                Yes, Restore System
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Cleanup Dynamic Data */}
            {showCleanupModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#991b1b' }}>Trigger Database Wipeout</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>Deleting transactional data securely</p>
                            </div>
                        </div>

                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                            Are you absolutely certain you want to trigger a complete dynamic data wipeout? 
                            This will wipe all <strong>live customer portfolios, reviews, orders, transaction histories, and private chat records</strong>. Administrators, cms channels, static parameters, and master categories will remain untouched.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="admin-button-secondary" onClick={() => setShowCleanupModal(false)}>
                                Cancel
                            </button>
                            <button className="admin-button-danger" onClick={handleTriggerCleanup}>
                                Yes, Clear Database
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDummyData;
