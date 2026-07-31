import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import styles from './SupplierWallet.module.css';

const SupplierWallet = () => {
    const [balance, setBalance] = useState(0);
    const [activeTab, setActiveTab] = useState('incoming');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const { data } = await api.get('/auth/supplier/wallet');
            setBalance(data.balance || 0);
            setHistory(data.history || []);
        } catch (err) {
            console.error('Error fetching wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string, type: string = 'success') => { 
        setToast({ show: true, message: msg, type }); 
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000); 
    };

    const { user } = useAuth();

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'error');
        if (amount > balance) return showToast('Insufficient balance', 'error');
        
        // Check if user has a payout method setup
        if (!user?.payout_methods || user.payout_methods.length === 0) {
            return showToast('Please configure a Payout Method first', 'error');
        }
        
        setSubmitting(true);
        try {
            await api.post('/auth/supplier/withdraw', { amount });
            showToast('Withdrawal request submitted successfully!');
            setWithdrawAmount('');
            fetchWalletData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Withdrawal request failed', 'error');
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

    const incomingPayments = history.filter((h: any) => h.type === 'payment' || h.type === 'credit');
    const withdrawRequests = history.filter((h: any) => h.type === 'withdraw' || h.type === 'debit');

    return (
        <div className={styles['supplier-wallet-container']}>
            {toast.show && (
                <div className={`${styles['wallet-toast']} ${toast.type === 'error' ? styles['error'] : ''}`}>
                    {toast.message}
                </div>
            )}
            
            <div className={styles['wallet-header-card']}>
                <div className={styles['balance-info']}>
                    <span className={styles['balance-label']}>Total Wallet Balance</span>
                    <h1 className={styles['balance-value']}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
                </div>
                <div className={styles['withdraw-action']}>
                    <form onSubmit={handleWithdraw} className={styles['withdraw-form']}>
                        <div className={styles['input-with-symbol']}>
                            <span>$</span>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                min="1"
                                step="0.01"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={submitting || !withdrawAmount}
                            className={styles['payout-btn']}
                        >
                            {submitting ? 'Processing...' : 'Request Withdrawal'}
                        </button>
                    </form>
                    <p className={styles['withdraw-hint']}>Funds will be transferred to your default payout method upon approval.</p>
                </div>
            </div>

            <div className={styles['wallet-history-card']}>
                <div className={styles['wallet-tabs']}>
                    <button 
                        className={`wallet-tab ${activeTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('incoming')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                        Transaction
                    </button>
                    <button 
                        className={`wallet-tab ${activeTab === 'withdraw' ? 'active' : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/></svg>
                        Withdrawal Requests
                    </button>
                </div>

                <div className={styles['history-table-wrapper']}>
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
                            {(activeTab === 'incoming' ? incomingPayments : withdrawRequests).length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={styles['empty-row'] + " " + styles['text-center']}>
                                        <div className={styles['empty-state']}>
                                            <div className={styles['empty-icon']}>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                                    <polyline points="10 9 9 9 8 9"></polyline>
                                                </svg>
                                            </div>
                                            <p>No transactions found for this category</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (activeTab === 'incoming' ? incomingPayments : withdrawRequests).map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className={styles['detail-cell']}>
                                                <span className={styles['detail-title']}>{item.description || (item.type === 'payment' ? 'Order Fulfillment' : 'Withdrawal Request')}</span>
                                                {item.order_id && <span className={styles['detail-sub']}>Order ID: #{item.order_id._id || item.order_id}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles['date-cell']}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${item.status}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className={styles['text-right']}>
                                            <span className={`amount-cell ${item.type === 'payment' ? 'credit' : 'debit'}`}>
                                                {item.type === 'payment' ? '+' : '-'}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierWallet;
