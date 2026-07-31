import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './SupplierWallet.module.css';

const CustomerWallet = () => {
    const { user, convertPrice, t } = useAuth();
    const [balance, setBalance] = useState(0);
    const [points, setPoints] = useState(user?.loyalty_points || 0);
    const [activeTab, setActiveTab] = useState('wallet_history');
    const [walletHistory, setWalletHistory] = useState<any[]>([]);
    const [pointsHistory, setPointsHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositAmount, setDepositAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        fetchWalletData();
        fetchPointsData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const { data } = await api.get('/auth/wallet');
            setBalance(data.balance || 0);
            setWalletHistory(data.history || []);
        } catch (err) {
            console.error('Error fetching wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPointsData = async () => {
        try {
            const { data } = await api.get('/auth/loyalty/transactions');
            setPointsHistory(data || []);
        } catch (err) {
            console.error('Error fetching points history:', err);
        }
    };

    const showToast = (msg: string, type = 'success') => { 
        setToast({ show: true, message: msg, type }); 
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000); 
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'error');
        
        setSubmitting(true);
        try {
            const { data } = await api.post('/auth/wallet/topup/simulate', {
                amount,
                paymentMethod: 'Mock Sandbox Pay'
            });
            showToast(data.message || 'Deposit successful!');
            setDepositAmount('');
            fetchWalletData();
            // Fetch updated user context (to show updated balance)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wishlistUpdated'));
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Deposit failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className={styles['wallet-loading']}>
            <div className={styles['spinner']}></div>
            <p>Syncing Financial Ledger...</p>
        </div>
    );

    return (
        <div className={styles['supplier-wallet-container']}>
            {toast.show && (
                <div className={`${styles['wallet-toast']} ${toast.type === 'error' ? styles['error'] : ''}`}>
                    {toast.message}
                </div>
            )}
            
            <div className={styles['wallet-header-card']} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className={styles['balance-info']}>
                    <span className={styles['balance-label']}>Total Wallet Balance</span>
                    <h1 className={styles['balance-value']}>
                        {convertPrice(balance).formatted}
                    </h1>
                    <div style={{ marginTop: '12px', background: 'rgba(255, 112, 0, 0.08)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#ff6600' }}>Loyalty Points</span>
                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#ff6600' }}>{user?.loyalty_points || 0} pts</span>
                    </div>
                </div>
                
                <div className={styles['withdraw-action']}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'block' }}>Add Sandbox Funds (Simulation)</label>
                    <form onSubmit={handleDeposit} className={styles['withdraw-form']}>
                        <div className={styles['input-with-symbol']}>
                            <span>$</span>
                            <input 
                                type="number" 
                                placeholder="Enter Amount" 
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                min="1"
                                step="1"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={submitting || !depositAmount}
                            className={styles['payout-btn']}
                            style={{ background: '#10b981' }}
                        >
                            {submitting ? 'Processing...' : 'Load Funds'}
                        </button>
                    </form>
                    <p className={styles['withdraw-hint']}>This is a sandbox wallet top-up simulation for testing the B2C checkout flow.</p>
                </div>
            </div>

            <div className={styles['wallet-history-card']}>
                <div className={styles['wallet-tabs']} style={{ borderBottom: '1px solid #eef2f6' }}>
                    <button 
                        className={`wallet-tab ${activeTab === 'wallet_history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wallet_history')}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            color: activeTab === 'wallet_history' ? 'var(--clr-primary, #ff6600)' : '#64748b',
                            borderBottom: activeTab === 'wallet_history' ? '2px solid var(--clr-primary, #ff6600)' : 'none'
                        }}
                    >
                        Wallet History
                    </button>
                    <button 
                        className={`wallet-tab ${activeTab === 'points_history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('points_history')}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            color: activeTab === 'points_history' ? 'var(--clr-primary, #ff6600)' : '#64748b',
                            borderBottom: activeTab === 'points_history' ? '2px solid var(--clr-primary, #ff6600)' : 'none'
                        }}
                    >
                        Loyalty Points Ledger
                    </button>
                </div>

                <div className={styles['history-table-wrapper']}>
                    {activeTab === 'wallet_history' ? (
                        <table className={styles['history-table']}>
                            <thead>
                                <tr>
                                    <th>Transaction Detail</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th className={styles['text-right']}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {walletHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className={styles['empty-row'] + " " + styles['text-center']}>
                                            <p style={{ padding: '2rem 0', color: '#94a3b8' }}>No wallet transactions found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    walletHistory.map(item => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className={styles['detail-cell']}>
                                                    <span className={styles['detail-title']}>{item.description || (item.type === 'credit' ? 'Wallet Top-up' : 'Checkout Payment')}</span>
                                                    {item.order_id && <span className={styles['detail-sub']}>Order ID: #{item.order_id._id || item.order_id}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={styles['date-cell']}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${item.status}`} style={{
                                                    display: 'inline-block',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    background: item.status === 'completed' ? '#dcfce7' : '#fef3c7',
                                                    color: item.status === 'completed' ? '#166534' : '#92400e'
                                                }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className={styles['text-right']}>
                                                <span className={`amount-cell ${item.type === 'credit' ? 'credit' : 'debit'}`} style={{
                                                    fontWeight: '700',
                                                    color: item.type === 'credit' ? '#10b981' : '#ef4444'
                                                }}>
                                                    {item.type === 'credit' ? '+' : '-'}{convertPrice(item.amount).formatted}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className={styles['history-table']}>
                            <thead>
                                <tr>
                                    <th>Reward Action</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th className={styles['text-right']}>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pointsHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className={styles['empty-row'] + " " + styles['text-center']}>
                                            <p style={{ padding: '2rem 0', color: '#94a3b8' }}>No loyalty points transactions found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    pointsHistory.map(item => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className={styles['detail-cell']}>
                                                    <span className={styles['detail-title']}>{item.description || 'Loyalty Points Update'}</span>
                                                    {item.order && <span className={styles['detail-sub']}>Linked Order: #{item.order}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={styles['date-cell']}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    background: item.type === 'purchase' || item.type === 'referral' ? '#dcfce7' : '#fee2e2',
                                                    color: item.type === 'purchase' || item.type === 'referral' ? '#166534' : '#991b1b'
                                                }}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className={styles['text-right']}>
                                                <span style={{
                                                    fontWeight: '900',
                                                    color: item.points > 0 ? '#10b981' : '#ef4444'
                                                }}>
                                                    {item.points > 0 ? '+' : ''}{item.points} pts
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerWallet;
