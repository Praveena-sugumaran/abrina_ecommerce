'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useToast } from '@/context/ToastContext';

export default function CustomerLoyaltyRewards() {
    const { showToast } = useToast();
    const [balance, setBalance] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalRedeemed, setTotalRedeemed] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemPoints, setRedeemPoints] = useState(100);
    const [redeeming, setRedeeming] = useState(false);
    const [lastCoupon, setLastCoupon] = useState<any>(null);

    useEffect(() => {
        fetchLoyaltyData();
    }, []);

    const fetchLoyaltyData = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/auth/loyalty-history');
            if (data.success) {
                setBalance(data.balance || 0);
                setTotalEarned(data.totalEarned || 0);
                setTotalRedeemed(data.totalRedeemed || 0);
                setTransactions(data.transactions || []);
            }
        } catch (err) {
            console.error('Failed to load loyalty data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (balance < redeemPoints) {
            showToast(`Insufficient points. You have ${balance} points.`, 'error');
            return;
        }

        setRedeeming(true);
        try {
            const { data } = await api.post('/auth/redeem-loyalty', { pointsToRedeem: redeemPoints });
            if (data.success) {
                showToast(data.message, 'success');
                setLastCoupon({ code: data.couponCode, value: data.discountValue });
                fetchLoyaltyData();
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Redemption failed.', 'error');
        } finally {
            setRedeeming(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <div className="spinner-circle"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Banner */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #7c3aed 100%)', borderRadius: '20px', padding: '28px 32px', color: '#fff', boxShadow: '0 8px 24px rgba(30,64,175,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Loyalty Rewards Program</div>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '4px 0 0', lineHeight: 1.2 }}>{balance.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 600 }}>Points</span></h1>
                        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Earn 1 point for every $1 spent on orders</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 20px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', opacity: 0.75 }}>Total Earned</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{totalEarned.toLocaleString()}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 20px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', opacity: 0.75 }}>Total Redeemed</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{totalRedeemed.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Convert Points Modal Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: '#0f172a' }}>🎁 Redeem Points for Discount Coupon</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Select Points to Redeem</label>
                        <select value={redeemPoints} onChange={e => setRedeemPoints(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none' }}>
                            <option value={100}>100 Points ($10 Off Coupon)</option>
                            <option value={250}>250 Points ($25 Off Coupon)</option>
                            <option value={500}>500 Points ($50 Off Coupon)</option>
                            <option value={1000}>1000 Points ($100 Off Coupon)</option>
                        </select>
                    </div>
                    <div style={{ paddingTop: '18px' }}>
                        <button onClick={handleRedeem} disabled={redeeming || balance < redeemPoints} style={{ padding: '11px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #059669)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: redeeming || balance < redeemPoints ? 0.6 : 1 }}>
                            {redeeming ? 'Processing...' : 'Redeem Now'}
                        </button>
                    </div>
                </div>

                {lastCoupon && (
                    <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700 }}>Coupon Generated Successfully!</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: '2px' }}>{lastCoupon.code}</div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>${lastCoupon.value} OFF</div>
                    </div>
                )}
            </div>

            {/* Transactions History */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: '15px', color: '#0f172a', background: '#f8fafc' }}>
                    Points History Log ({transactions.length})
                </div>
                {transactions.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        No points history yet. Make purchases to earn loyalty rewards!
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ padding: '12px 20px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 700, textTransform: 'capitalize' }}>{t.type}</td>
                                    <td style={{ padding: '14px 20px', color: '#0f172a' }}>{t.description || 'Points Activity'}</td>
                                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, color: t.points > 0 ? '#16a34a' : '#dc2626' }}>
                                        {t.points > 0 ? `+${t.points}` : t.points}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
