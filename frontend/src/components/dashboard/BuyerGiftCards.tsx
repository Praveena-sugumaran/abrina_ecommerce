import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface GiftCardTemplate {
    _id: string;
    name: string;
    value: number;
    price: number;
    stock: number;
    is_active: boolean;
    description: string;
}

const BuyerGiftCards = () => {
    const { convertPrice } = useAuth();
    const { showToast } = useToast();
    
    const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<GiftCardTemplate | null>(null);
    const [giftCards, setGiftCards] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Purchase states
    const [enabledMethods, setEnabledMethods] = useState<any[]>([
        { id: 'stripe', label: 'Credit / Debit Card (Stripe)' },
        { id: 'wallet', label: 'Use Wallet Balance' }
    ]);
    const [paymentMethod, setPaymentMethod] = useState('stripe');
    const [purchasing, setPurchasing] = useState(false);
    
    // Redeem states
    const [redeemCode, setRedeemCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [templatesRes, gcRes, walletRes, payRes] = await Promise.all([
                api.get('/gift-cards/public-templates'),
                api.get('/gift-cards/my'),
                api.get('/auth/wallet'),
                api.get('/payment-methods/public').catch(() => ({ data: [] }))
            ]);

            const activeTemplates = templatesRes.data?.data || [];
            setTemplates(activeTemplates);
            if (activeTemplates.length > 0) {
                setSelectedTemplate(activeTemplates[0]);
            }
            setGiftCards(gcRes.data?.giftCards || []);
            const userWalletBal = walletRes.data?.balance || 0;
            setWalletBalance(userWalletBal);

            // Parse Admin enabled payment methods
            const publicMethods = payRes.data || [];
            const isStripeEnabled = publicMethods.length === 0 || publicMethods.some((m: any) => m.provider === 'stripe');
            const isPaypalEnabled = publicMethods.some((m: any) => m.provider === 'paypal');

            const availableList: any[] = [];
            if (isStripeEnabled) {
                availableList.push({ id: 'stripe', label: 'Credit / Debit Card (Stripe)' });
            }
            if (isPaypalEnabled) {
                availableList.push({ id: 'paypal', label: 'PayPal Checkout' });
            }
            availableList.push({ id: 'wallet', label: `Use Wallet Balance (${convertPrice(userWalletBal).formatted})` });

            setEnabledMethods(availableList);
            if (availableList.length > 0) {
                setPaymentMethod(availableList[0].id);
            }
        } catch (err: any) {
            console.error('Error fetching gift cards/wallet:', err);
            showToast('Failed to load gift card options.', 'error', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) {
            return showToast('Please select an available Admin-created Gift Card product.', 'error', 'Select Product');
        }

        if (selectedTemplate.stock <= 0) {
            return showToast('The selected Gift Card product is currently out of stock.', 'error', 'Out of Stock');
        }

        setPurchasing(true);
        try {
            const { data } = await api.post('/gift-cards/purchase', {
                templateId: selectedTemplate._id,
                paymentMethod
            });

            if (data.success) {
                if (paymentMethod === 'wallet') {
                    showToast(`Successfully purchased ${selectedTemplate.name}! Voucher code generated.`, 'success', 'Purchase Complete');
                    fetchInitialData();
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
            return showToast('Please enter a gift card voucher code.', 'error', 'Invalid Code');
        }

        setRedeeming(true);
        try {
            const { data } = await api.post('/gift-cards/redeem', {
                code: redeemCode.trim()
            });

            if (data.success) {
                showToast(`Successfully redeemed voucher! $${data.amount.toFixed(2)} credited to your account for booking.`, 'success', 'Redeemed Successfully');
                setRedeemCode('');
                fetchInitialData();
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to redeem gift card.', 'error', 'Redemption Failed');
        } finally {
            setRedeeming(false);
        }
    };

    const copyVoucherCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        showToast(`Voucher code ${code} copied! Paste this code under Gift Card field during checkout / booking.`, 'success', 'Code Copied');
        setTimeout(() => setCopiedCode(null), 3000);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', height: '140px', padding: '24px', opacity: 0.6 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', opacity: 0.6 }}>
                    <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', height: '260px' }} />
                    <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', height: '260px' }} />
                </div>
            </div>
        );
    }

    const totalVoucherBalance = giftCards.reduce((acc, card) => acc + (card.is_active && card.balance > 0 ? card.balance : 0), 0);

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header Section */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)', borderRadius: '20px', padding: '28px 32px', color: '#fff', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#93c5fd' }}>Official Store Vouchers</div>
                        <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '4px 0 0', lineHeight: 1.2 }}>Digital Gift Cards & Vouchers</h1>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '6px 0 0', maxWidth: '520px' }}>
                            Purchase Admin-approved Gift Cards or redeem voucher codes to pay for order bookings at Checkout.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px 20px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ fontSize: '11px', color: '#93c5fd', display: 'block', fontWeight: 700 }}>Wallet Balance</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginTop: '2px', display: 'block' }}>{convertPrice(walletBalance).formatted}</span>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px 20px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ fontSize: '11px', color: '#93c5fd', display: 'block', fontWeight: 700 }}>Active Vouchers Value</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80', marginTop: '2px', display: 'block' }}>{convertPrice(totalVoucherBalance).formatted}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Row: My Active Gift Cards & Admin Gift Card Products Catalog */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'start' }}>
                
                {/* Panel 1: My Purchased & Active Gift Cards */}
                <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', padding: '24px', boxShadow: '0 4px 20px rgba(13, 46, 103, 0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🎁</span> My Active Gift Cards ({giftCards.length})
                        </h3>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Ready for Booking</span>
                    </div>

                    {giftCards.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏷️</div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#334155' }}>No Active Gift Cards Found</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Purchased gift cards and redeemed vouchers will appear here for checkout booking.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }}>
                            {giftCards.map((card) => {
                                const isExpired = card.expiresAt && new Date(card.expiresAt) < new Date();
                                const isUsed = card.balance <= 0;
                                const isActive = card.is_active && !isExpired && !isUsed;

                                return (
                                    <div
                                        key={card._id}
                                        style={{
                                            background: isActive ? '#f0fdf4' : '#f8fafc',
                                            border: isActive ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                                            borderRadius: '14px',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>
                                                {card.code}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                textTransform: 'uppercase',
                                                background: isActive ? '#dcfce7' : isUsed ? '#e2e8f0' : '#fee2e2',
                                                color: isActive ? '#15803d' : isUsed ? '#64748b' : '#b91c1c'
                                            }}>
                                                {isActive ? 'Active' : isUsed ? 'Redeemed' : 'Expired'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Remaining Balance</span>
                                                <span style={{ fontSize: '20px', fontWeight: 900, color: isActive ? '#16a34a' : '#64748b' }}>
                                                    {convertPrice(card.balance).formatted}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8' }}>
                                                Initial Value: {convertPrice(card.initial_value).formatted}
                                            </div>
                                        </div>

                                        {isActive && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => copyVoucherCode(card.code)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        background: '#fff',
                                                        border: '1px solid #cbd5e1',
                                                        color: '#334155',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    {copiedCode === card.code ? '✓ Copied' : '📋 Copy Code'}
                                                </button>
                                                <a
                                                    href="/checkout"
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        background: '#ff6a00',
                                                        color: '#fff',
                                                        textDecoration: 'none',
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                        textAlign: 'center',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    🛒 Apply for Booking
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Panel 2: Available Admin Gift Card Products Catalog */}
                <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e8edf5', padding: '24px', boxShadow: '0 4px 20px rgba(13, 46, 103, 0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🛍️</span> Available Store Gift Cards
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Select an Admin-approved Gift Card product to purchase for order bookings or gift to friends.
                    </p>

                    {templates.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                            No Gift Card products currently available.
                        </div>
                    ) : (
                        <form onSubmit={handlePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                    Select Gift Card Product
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                    {templates.map((template) => {
                                        const isSelected = selectedTemplate?._id === template._id;
                                        const isOutOfStock = template.stock <= 0;

                                        return (
                                            <button
                                                key={template._id}
                                                type="button"
                                                disabled={isOutOfStock}
                                                onClick={() => setSelectedTemplate(template)}
                                                style={{
                                                    padding: '12px 10px',
                                                    borderRadius: '12px',
                                                    border: isSelected ? '2px solid #ff6a00' : '1px solid #cbd5e1',
                                                    background: isSelected ? '#fff7ed' : isOutOfStock ? '#f1f5f9' : '#fff',
                                                    color: isSelected ? '#ff6a00' : isOutOfStock ? '#94a3b8' : '#334155',
                                                    fontWeight: 800,
                                                    textAlign: 'center',
                                                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.15s',
                                                    opacity: isOutOfStock ? 0.6 : 1
                                                }}
                                            >
                                                <div style={{ fontSize: '15px', fontWeight: 900 }}>${template.value}</div>
                                                <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '2px', color: isSelected ? '#ff6a00' : '#64748b' }}>
                                                    {template.name}
                                                </div>
                                                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 750, color: isOutOfStock ? '#dc2626' : '#16a34a' }}>
                                                    {isOutOfStock ? 'Out of Stock' : `Price: $${template.price}`}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedTemplate && (
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>Selected: {selectedTemplate.name}</div>
                                    <div style={{ marginTop: '2px', color: '#64748b' }}>{selectedTemplate.description}</div>
                                </div>
                            )}

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Payment Method</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {enabledMethods.map((m) => (
                                        <label
                                            key={m.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: paymentMethod === m.id ? '2px solid #ff6a00' : '1px solid #e2e8f0',
                                                background: paymentMethod === m.id ? '#fff7ed' : '#fff',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                color: '#1e293b'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="pay"
                                                checked={paymentMethod === m.id}
                                                onChange={() => setPaymentMethod(m.id)}
                                            />
                                            <span>{m.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={purchasing || !selectedTemplate || selectedTemplate.stock <= 0}
                                style={{
                                    width: '100%',
                                    padding: '13px 20px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #ff6a00 0%, #ff8e3c 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    opacity: purchasing || !selectedTemplate || selectedTemplate.stock <= 0 ? 0.6 : 1,
                                    boxShadow: '0 4px 14px rgba(255, 106, 0, 0.25)',
                                    marginTop: '4px'
                                }}
                            >
                                {purchasing ? 'Processing Purchase...' : `Purchase ${selectedTemplate ? selectedTemplate.name : 'Gift Card'} ($${selectedTemplate ? selectedTemplate.price : 0})`}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuyerGiftCards;
