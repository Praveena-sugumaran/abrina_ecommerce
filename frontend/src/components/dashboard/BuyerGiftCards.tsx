import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const BuyerGiftCards = () => {
    const { convertPrice } = useAuth();
    const { showToast } = useToast();
    
    const [giftCards, setGiftCards] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Purchase states
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('stripe');
    const [purchasing, setPurchasing] = useState(false);
    
    // Redeem states
    const [redeemCode, setRedeemCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        fetchGiftCardsAndWallet();
    }, []);

    const fetchGiftCardsAndWallet = async () => {
        setLoading(true);
        try {
            const [gcRes, walletRes] = await Promise.all([
                api.get('/gift-cards/my'),
                api.get('/auth/wallet')
            ]);
            setGiftCards(gcRes.data?.giftCards || []);
            setWalletBalance(walletRes.data?.balance || 0);
        } catch (err: any) {
            console.error('Error fetching gift cards/wallet:', err);
            showToast('Failed to load gift cards data.', 'error', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmount = purchaseAmount === 'custom' ? parseFloat(customAmount) : parseFloat(purchaseAmount);
        
        if (isNaN(finalAmount) || finalAmount <= 0) {
            return showToast('Please select or input a valid purchase amount.', 'error', 'Invalid Amount');
        }

        setPurchasing(true);
        try {
            const { data } = await api.post('/gift-cards/purchase', {
                amount: finalAmount,
                paymentMethod
            });

            if (data.success) {
                if (paymentMethod === 'wallet') {
                    showToast(`Successfully purchased $${finalAmount.toFixed(2)} Gift Card! Check code below.`, 'success', 'Purchase Complete');
                    setPurchaseAmount('');
                    setCustomAmount('');
                    fetchGiftCardsAndWallet();
                } else if (data.url) {
                    showToast('Redirecting to payment gateway...', 'success', 'Payment Redirect');
                    window.location.href = data.url;
                } else {
                    showToast('Gift card purchase initialized successfully.', 'success', 'Success');
                }
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to purchase gift card.', 'error', 'Purchase Failed');
        } finally {
            setPurchasing(false);
        }
    };

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!redeemCode.trim()) {
            return showToast('Please enter a gift card code.', 'error', 'Invalid Code');
        }

        setRedeeming(true);
        try {
            const { data } = await api.post('/gift-cards/redeem', {
                code: redeemCode.trim()
            });

            if (data.success) {
                showToast(`Successfully redeemed gift card! $${data.amount.toFixed(2)} added to Wallet.`, 'success', 'Redeemed Successfully');
                setRedeemCode('');
                fetchGiftCardsAndWallet();
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to redeem gift card.', 'error', 'Redemption Failed');
        } finally {
            setRedeeming(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #ff6600', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '10px 0', color: '#1e293b' }}>
            {/* Header section with wallet info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0f172a' }}>Digital Gift Cards</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Buy gift certificates for shopping, or redeem codes to top-up wallet balance.</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '14px 20px', borderRadius: '12px', border: '1px solid #fcd34d', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#78350f', display: 'block' }}>Wallet Balance</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#78350f' }}>{convertPrice(walletBalance).formatted}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                {/* Panel 1: Purchase Gift Card */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎁</span> Buy Gift Card
                    </h3>
                    <form onSubmit={handlePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px' }}>Select Voucher Value</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                                {['10', '25', '50', '100'].map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setPurchaseAmount(amt)}
                                        style={{
                                            padding: '10px 0',
                                            borderRadius: '8px',
                                            border: purchaseAmount === amt ? '2px solid #ff6600' : '1px solid #cbd5e1',
                                            background: purchaseAmount === amt ? '#fff7ed' : '#fff',
                                            color: purchaseAmount === amt ? '#ff6600' : '#1e293b',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPurchaseAmount('custom')}
                                style={{
                                    width: '100%',
                                    padding: '10px 0',
                                    borderRadius: '8px',
                                    border: purchaseAmount === 'custom' ? '2px solid #ff6600' : '1px solid #cbd5e1',
                                    background: purchaseAmount === 'custom' ? '#fff7ed' : '#fff',
                                    color: purchaseAmount === 'custom' ? '#ff6600' : '#1e293b',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginBottom: '10px'
                                }}
                            >
                                Custom Amount...
                            </button>
                            {purchaseAmount === 'custom' && (
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Enter amount (USD)"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 28px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px' }}>Select Payment Method</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { id: 'stripe', label: 'Credit Card (Stripe)' },
                                    { id: 'paypal', label: 'PayPal Checkout' },
                                    { id: 'wallet', label: `Use Wallet Balance (Current: ${convertPrice(walletBalance).formatted})` }
                                ].map(method => (
                                    <label
                                        key={method.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            background: paymentMethod === method.id ? '#f8fafc' : '#fff'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === method.id}
                                            onChange={() => setPaymentMethod(method.id)}
                                            style={{ accentColor: '#ff6600' }}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{method.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={purchasing}
                            style={{
                                width: '100%',
                                padding: '14px 0',
                                borderRadius: '8px',
                                background: '#ff6600',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '14px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(255, 102, 0, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {purchasing ? 'Processing Order...' : 'Confirm & Buy Gift Card'}
                        </button>
                    </form>
                </div>

                {/* Panel 2: Redeem Gift Card */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>💳</span> Redeem Voucher Code
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Received a gift card? Enter the code below to credit the balance directly into your marketplace wallet.</p>
                        
                        <form onSubmit={handleRedeem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="GIFT-XXXX-XXXX-XXXX"
                                value={redeemCode}
                                onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #cbd5e1',
                                    fontSize: '14px',
                                    letterSpacing: '0.08em',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    boxSizing: 'border-box',
                                    textAlign: 'center'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={redeeming}
                                style={{
                                    width: '100%',
                                    padding: '14px 0',
                                    borderRadius: '8px',
                                    background: '#0f172a',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {redeeming ? 'Claiming Voucher...' : 'Redeem Code to Wallet'}
                            </button>
                        </form>
                    </div>

                    <div style={{ marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>💡 Quick Tips:</span>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                            <li>Voucher codes are case-insensitive.</li>
                            <li>Wallet credits can be spent on any checkout order.</li>
                            <li>Gift cards never expire!</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* List Section: Purchased Cards */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>Purchased Gift Cards</h3>
                {giftCards.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Code</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Initial Value</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Current Balance</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Purchase Date</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {giftCards.map((card, i) => (
                                    <tr key={card._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', letterSpacing: '0.05em' }}>
                                            {card.code}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>${card.initial_value?.toFixed(2)}</td>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: card.balance > 0 ? '#10b981' : '#64748b' }}>
                                            ${card.balance?.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#64748b' }}>
                                            {new Date(card.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                background: card.balance > 0 ? '#dcfce7' : '#f1f5f9',
                                                color: card.balance > 0 ? '#15803d' : '#64748b'
                                            }}>
                                                {card.balance > 0 ? 'Active' : 'Redeemed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
                        <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🎫</span>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#475569' }}>No Gift Cards Yet</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Purchase a digital gift certificate above to see it here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuyerGiftCards;
