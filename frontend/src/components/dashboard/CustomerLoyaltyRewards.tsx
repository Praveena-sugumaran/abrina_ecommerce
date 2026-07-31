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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ height: '140px', background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', borderRadius: '20px', opacity: 0.8 }} />
                <div style={{ height: '100px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }} />
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

            {/* Info Banner: How Points are Applied */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '20px 24px', color: '#1e40af', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ fontSize: '24px', lineHeight: 1 }}>🛒</div>
                    <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#1e3a8a' }}>How to Use Your Loyalty Points</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                            Your loyalty points can be applied <strong>directly during checkout / booking</strong>! When placing an order, simply check <strong>"Use Loyalty Points"</strong> on the checkout page to receive an instant discount on your order total.
                        </p>
                    </div>
                </div>
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
