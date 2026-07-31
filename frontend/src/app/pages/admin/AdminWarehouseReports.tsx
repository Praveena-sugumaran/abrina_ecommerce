'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface TransactionLog {
  _id: string;
  warehouse_id: Warehouse | null;
  product_id: Product | null;
  transaction_type: string;
  quantity: number;
  before_qty: number;
  after_qty: number;
  reference_type: string;
  reference_id: string;
  created_by: User | null;
  createdAt: string;
}

interface AuditLog {
  _id: string;
  warehouse_id: Warehouse | null;
  user_id: User | null;
  action: string;
  details: string;
  createdAt: string;
}

export default function AdminWarehouseReports() {
  const { user, t } = useAuth();
  const [activeTab, setActiveTab] = useState<'ledger' | 'audit'>('ledger');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Scoping check
  const currentUserRoles = user?.roles || (user?.role ? [user?.role] : []);
  const isSuperAdmin = currentUserRoles.includes('admin') && !user?.role_id;
  const assignedWarehouseIds = user?.assignedWarehouses || [];

  // Filter states
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');

  // Pagination states
  const [ledgerData, setLedgerData] = useState<TransactionLog[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit] = useState(10);

  const [auditData, setAuditData] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(10);

  // Fetch warehouses for filters
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await api.get('/warehouses', { params: { limit: 100, all: 'true', status: 'active' } });
        const allWhs = res.data.warehouses || [];
        
        // Scope warehouse managers dropdown options
        if (!isSuperAdmin) {
          const scoped = allWhs.filter((w: any) => assignedWarehouseIds.includes(w._id));
          setWarehouses(scoped);
          if (scoped.length > 0) {
            setSelectedWarehouse(scoped[0]._id);
          }
        } else {
          setWarehouses(allWhs);
        }
      } catch (err: any) {
        console.error('Error fetching warehouses:', err);
      }
    };
    fetchWarehouses();
  }, [user]);

  // Fetch ledger transactions
  const fetchLedger = async () => {
    if (activeTab !== 'ledger') return;
    setLoading(true);
    setPageError('');
    try {
      const params: any = {
        page: ledgerPage,
        limit: ledgerLimit,
      };
      if (selectedWarehouse) params.warehouse_id = selectedWarehouse;
      if (transactionType) params.transaction_type = transactionType;
      // We search by SKU or name using a text parameter, or we can filter locally. 
      // The backend accepts product_id, so we'll fetch all matching records, but let's query.
      
      const res = await api.get('/warehouses/reports/transactions', { params });
      if (res.data.success) {
        let items = res.data.transactions || [];
        // Local filtering for SKU or Name to make it highly user friendly without requiring a product_id dropdown
        if (productSearch.trim()) {
          const term = productSearch.toLowerCase();
          items = items.filter((item: TransactionLog) => {
            return (
              item.product_id?.name?.toLowerCase().includes(term) ||
              item.product_id?.sku?.toLowerCase().includes(term)
            );
          });
        }
        setLedgerData(items);
        setLedgerTotal(res.data.total);
      }
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Failed to retrieve inventory transactions ledger.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (activeTab !== 'audit') return;
    setLoading(true);
    setPageError('');
    try {
      const params: any = {
        page: auditPage,
        limit: auditLimit,
      };
      if (selectedWarehouse) params.warehouse_id = selectedWarehouse;
      if (auditAction) params.action = auditAction;

      const res = await api.get('/warehouses/reports/audit-logs', { params });
      if (res.data.success) {
        setAuditData(res.data.logs || []);
        setAuditTotal(res.data.total);
      }
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Failed to retrieve warehouse activity audit logs.');
    } finally {
      setLoading(false);
    }
  };

  // Triggers
  useEffect(() => {
    fetchLedger();
  }, [activeTab, selectedWarehouse, transactionType, ledgerPage, productSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [activeTab, selectedWarehouse, auditAction, auditPage]);

  // Reset page when filters change
  const handleWarehouseChange = (val: string) => {
    setSelectedWarehouse(val);
    setLedgerPage(1);
    setAuditPage(1);
  };

  const getTransactionTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'TRANSFER_IN':
        return { bg: '#dcfce7', color: '#15803d' };
      case 'SALE':
      case 'TRANSFER_OUT':
        return { bg: '#fee2e2', color: '#b91c1c' };
      case 'ADJUSTMENT':
        return { bg: '#fef3c7', color: '#d97706' };
      default:
        return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE')) return { bg: '#dcfce7', color: '#15803d' };
    if (action.includes('UPDATE')) return { bg: '#dbeafe', color: '#1e40af' };
    if (action.includes('DELETE')) return { bg: '#fee2e2', color: '#b91c1c' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 32px 100px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main, #0d2e67)', margin: 0 }}>
            {t('warehouse_reports') || 'Warehouse & Inventory Reports'}
          </h1>
          <p style={{ color: 'var(--admin-text-secondary, #64748b)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Monitor stock ledger entries, audit structural actions, and search inventory changes.
          </p>
        </div>
      </div>

      {/* Metrics Summary cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-premium">
          <div className="admin-stat-card-label">Total Transactions Logged</div>
          <div className="admin-stat-card-value">{activeTab === 'ledger' ? ledgerTotal : '—'}</div>
        </div>
        <div className="admin-stat-premium">
          <div className="admin-stat-card-label">Total Audit Events</div>
          <div className="admin-stat-card-value" style={{ color: '#1e40af' }}>{activeTab === 'audit' ? auditTotal : '—'}</div>
        </div>
        <div className="admin-stat-premium">
          <div className="admin-stat-card-label">Active Monitored Locations</div>
          <div className="admin-stat-card-value" style={{ color: '#10b981' }}>{warehouses.length}</div>
        </div>
      </div>

      {pageError && (
        <div style={{ padding: '16px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: '700', fontSize: '14px' }}>
          {pageError}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '2.5px solid var(--admin-border-subtle, #f0f4ff)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ledger' ? '3px solid var(--primary-color, #ff6600)' : '3px solid transparent',
            color: activeTab === 'ledger' ? 'var(--admin-text-main, #0d2e67)' : 'var(--admin-text-muted, #8898b3)',
            fontWeight: '800',
            fontSize: '14.5px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2.5px'
          }}
        >
          Inventory Transaction Ledger
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid var(--primary-color, #ff6600)' : '3px solid transparent',
            color: activeTab === 'audit' ? 'var(--admin-text-main, #0d2e67)' : 'var(--admin-text-muted, #8898b3)',
            fontWeight: '800',
            fontSize: '14.5px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2.5px'
          }}
        >
          Configuration Audit Logs
        </button>
      </div>

      {/* Filters Area */}
      <div style={{
        background: 'var(--admin-card-bg, #ffffff)',
        border: '1px solid var(--admin-border, #e2e8f0)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Scoped Warehouse Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Select Warehouse</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            style={{
              height: '42px',
              borderRadius: '10px',
              border: '1.5px solid var(--admin-border, #e2e8f0)',
              padding: '0 12px',
              fontSize: '13.5px',
              outline: 'none',
              background: '#fff',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            {isSuperAdmin && <option value="">All Warehouses</option>}
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'ledger' ? (
          <>
            {/* Transaction Type Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Type</label>
              <select
                value={transactionType}
                onChange={(e) => { setTransactionType(e.target.value); setLedgerPage(1); }}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--admin-border, #e2e8f0)',
                  padding: '0 12px',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                <option value="">All Types</option>
                <option value="PURCHASE">Purchase Order Inbound</option>
                <option value="SALE">Order Sale Deduction</option>
                <option value="TRANSFER_IN">Transfer Received</option>
                <option value="TRANSFER_OUT">Transfer Shipped</option>
                <option value="ADJUSTMENT">Manual Stock Correction</option>
                <option value="RETURN">Customer Return</option>
                <option value="CANCELLATION">Order Cancel Reversion</option>
              </select>
            </div>

            {/* Product text filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Filter SKU or Product Name</label>
              <input
                type="text"
                placeholder="Type name or SKU SKU-..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setLedgerPage(1); }}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--admin-border, #e2e8f0)',
                  padding: '0 12px',
                  fontSize: '13.5px',
                  outline: 'none',
                  color: 'var(--admin-text-secondary)'
                }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Audit Action Type Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Action Category</label>
              <select
                value={auditAction}
                onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--admin-border, #e2e8f0)',
                  padding: '0 12px',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  minWidth: '180px'
                }}
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE (Setup Warehouse)</option>
                <option value="UPDATE">UPDATE (Structure Change)</option>
                <option value="DELETE">DELETE (Deactivations)</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Reports Table container */}
      <div className="admin-panel-card-premium" style={{ background: 'var(--admin-card-bg, #ffffff)', border: '1px solid var(--admin-border, #e2e8f0)', borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="admin-loading-spinner" />
          </div>
        ) : activeTab === 'ledger' ? (
          /* Tab 1: Inventory Transaction Ledger */
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-bg, #f8fafc)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Product Details</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Warehouse</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Qty Delta</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Balances</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Reference</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.length > 0 ? ledgerData.map((item) => {
                  const badge = getTransactionTypeBadgeColor(item.transaction_type);
                  return (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--admin-border-subtle, #f0f4ff)' }}>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                        {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {item.product_id ? (
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--admin-text-main, #0d2e67)', fontSize: '13.5px' }}>{item.product_id.name}</div>
                            <div style={{ fontSize: '11px', color: '#8898b3', marginTop: '2px', fontWeight: '700' }}>SKU: {item.product_id.sku}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Product Deleted</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                        {item.warehouse_id ? `${item.warehouse_id.name} (${item.warehouse_id.code})` : 'Deleted Warehouse'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className="admin-badge" style={{ ...badge, fontSize: '10.5px', padding: '3px 8px', fontWeight: '800' }}>
                          {item.transaction_type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: item.quantity > 0 ? '#10b981' : '#ef4444' }}>
                        {item.quantity > 0 ? `+${item.quantity}` : item.quantity} units
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span>Prev: <b>{item.before_qty}</b></span>
                          <span style={{ color: '#94a3b8' }}>→</span>
                          <span>New: <b>{item.after_qty}</b></span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>
                        {item.reference_type ? (
                          <div>
                            <div>{item.reference_type}</div>
                            {item.reference_id && <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>#{item.reference_id.slice(-6)}</div>}
                          </div>
                        ) : (
                          'Manual Correct'
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                        {item.created_by ? (
                          <div>
                            <div style={{ fontWeight: '700' }}>{item.created_by.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.created_by.email}</div>
                          </div>
                        ) : (
                          'System Auto'
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      No ledger transactions found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Configuration Audit Logs */
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-bg, #f8fafc)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Warehouse</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Details / Notes</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--admin-text-muted, #8898b3)', textTransform: 'uppercase' }}>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {auditData.length > 0 ? auditData.map((log) => {
                  const badge = getActionBadgeColor(log.action);
                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--admin-border-subtle, #f0f4ff)' }}>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                        {log.warehouse_id ? `${log.warehouse_id.name} (${log.warehouse_id.code})` : 'System Core'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className="admin-badge" style={{ ...badge, fontSize: '10.5px', padding: '3px 8px', fontWeight: '800' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                        {log.details}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                        {log.user_id ? (
                          <div>
                            <div style={{ fontWeight: '700' }}>{log.user_id.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.user_id.email}</div>
                          </div>
                        ) : (
                          'System Automated'
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      No configurations audit events logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination component */}
      {activeTab === 'ledger' && ledgerTotal > ledgerLimit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            Showing page <b>{ledgerPage}</b> of <b>{Math.ceil(ledgerTotal / ledgerLimit)}</b> ({ledgerTotal} items total)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
              disabled={ledgerPage === 1}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '8px', border: '1.5px solid var(--admin-border)',
                background: '#fff', color: ledgerPage === 1 ? '#cbd5e1' : 'var(--admin-text-main)',
                fontWeight: '700', fontSize: '13px', cursor: ledgerPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setLedgerPage(prev => (ledgerPage * ledgerLimit < ledgerTotal ? prev + 1 : prev))}
              disabled={ledgerPage * ledgerLimit >= ledgerTotal}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '8px', border: '1.5px solid var(--admin-border)',
                background: '#fff', color: ledgerPage * ledgerLimit >= ledgerTotal ? '#cbd5e1' : 'var(--admin-text-main)',
                fontWeight: '700', fontSize: '13px', cursor: ledgerPage * ledgerLimit >= ledgerTotal ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && auditTotal > auditLimit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            Showing page <b>{auditPage}</b> of <b>{Math.ceil(auditTotal / auditLimit)}</b> ({auditTotal} items total)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
              disabled={auditPage === 1}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '8px', border: '1.5px solid var(--admin-border)',
                background: '#fff', color: auditPage === 1 ? '#cbd5e1' : 'var(--admin-text-main)',
                fontWeight: '700', fontSize: '13px', cursor: auditPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setAuditPage(prev => (auditPage * auditLimit < auditTotal ? prev + 1 : prev))}
              disabled={auditPage * auditLimit >= auditTotal}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '8px', border: '1.5px solid var(--admin-border)',
                background: '#fff', color: auditPage * auditLimit >= auditTotal ? '#cbd5e1' : 'var(--admin-text-main)',
                fontWeight: '700', fontSize: '13px', cursor: auditPage * auditLimit >= auditTotal ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
