import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';

const methodMeta: any = {
    stripe: { label: 'Stripe' },
    paypal: { label: 'Paypal' },
    razorpay: { label: 'Razorpay' }
};

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const BuyerCredit = () => {
    const [credit, setCredit] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [requestedLimit, setRequestedLimit] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [topupAmount, setTopupAmount] = useState('');
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletHistory, setWalletHistory] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // Payment Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('stripe');
    const [enabledMethods, setEnabledMethods] = useState<any[]>([]);

    useEffect(() => {
        fetchCreditData();
    }, []);

    useEffect(() => {
        // Intercept redirection success callback parameters
        const query = new URLSearchParams(window.location.search);
        const sessionId = query.get('session_id');
        const type = query.get('type');
        const status = query.get('status');
        const method = query.get('method');
        const amount = query.get('amount');
        const payPalToken = query.get('token'); // PayPal passes order token

        const verifyPayment = async () => {
            if (status === 'success' || (sessionId && type === 'wallet_deposit')) {
                setLoading(true);
                try {
                    if (sessionId && type === 'wallet_deposit') {
                        // Stripe wallet top-up verification
                        const { data } = await api.post('/auth/wallet/topup/verify', { sessionId });
                        showToast(data.message || 'Deposit completed successfully!');
                    } else if (method === 'paypal' && payPalToken) {
                        // PayPal wallet top-up verification
                        const { data } = await api.post('/auth/wallet/topup/paypal/verify', {
                            orderId: payPalToken,
                            amount: parseFloat(amount || '0')
                        });
                        showToast(data.message || 'Deposit completed successfully!');
                    }
                    
                    // Cleanup query parameters from the address bar
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                    fetchCreditData();
                } catch (err: any) {
                    console.error('Payment verification error:', err);
                    showToast(err.response?.data?.message || 'Payment verification failed.', 'error');
                } finally {
                    setLoading(false);
                }
            } else if (status === 'cancel') {
                showToast('Payment cancelled by user.', 'error');
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        };

        verifyPayment();
    }, []);

    const fetchCreditData = async () => {
        try {
            setLoading(true);
            const [creditRes, walletRes] = await Promise.all([
                api.get('/credit/my-limit'),
                api.get('/auth/supplier/wallet') // Reusing supplier wallet details for balance & transactions
            ]);
            setCredit(creditRes.data || null);
            setWalletBalance(walletRes.data?.balance || 0);
            setWalletHistory(walletRes.data?.history || []);
        } catch (err) {
            console.error('Error fetching credit data:', err);
            showToast('Failed to load credit details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string, type = 'success') => {
        setToast({ show: true, message: msg, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
    };

    const handleRequestCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        const limit = parseFloat(requestedLimit);
        if (isNaN(limit) || limit <= 0) {
            return showToast('Please enter a valid requested limit amount.', 'error');
        }

        setSubmitting(true);
        try {
            await api.post('/credit/request', {
                requested_amount: limit,
                verification_documents: ['dummy_incorporation_cert.pdf', 'dummy_bank_statements.pdf']
            });
            showToast('Credit limit request submitted successfully!');
            fetchCreditData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to submit credit request', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRepayCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        const repay = parseFloat(repayAmount);
        if (isNaN(repay) || repay <= 0) {
            return showToast('Please enter a valid repayment amount.', 'error');
        }

        if (repay > walletBalance) {
            return showToast('Insufficient wallet balance to complete repayment.', 'error');
        }

        if (repay > credit.used_credit) {
            return showToast(`Repayment amount exceeds outstanding balance of $${credit.used_credit}.`, 'error');
        }

        setSubmitting(true);
        try {
            await api.post('/credit/repay', { amount: repay });
            showToast('Outstanding balance repaid successfully!');
            setRepayAmount('');
            fetchCreditData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Repayment failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenTopupModal = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(topupAmount);
        if (isNaN(amt) || amt <= 0) {
            return showToast('Please enter a valid top-up amount.', 'error');
        }

        setSubmitting(true);
        try {
            const { data } = await api.get('/payment-methods/public');
            setEnabledMethods(data);
            if (data && data.length > 0) {
                const stripeExists = data.some((m: any) => m.provider === 'stripe');
                setSelectedMethod(stripeExists ? 'stripe' : data[0].provider);
            } else {
                setEnabledMethods([{ provider: 'stripe' }]);
                setSelectedMethod('stripe');
            }
            setIsModalOpen(true);
        } catch (err: any) {
            console.error('Error fetching public payment settings:', err);
            setEnabledMethods([{ provider: 'stripe' }]);
            setSelectedMethod('stripe');
            setIsModalOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleModalPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(topupAmount);
        if (isNaN(amt) || amt <= 0) {
            return showToast('Please enter a valid top-up amount.', 'error');
        }

        setSubmitting(true);
        try {
            if (selectedMethod === 'stripe') {
                // Stripe redirect to checkout session
                const { data } = await api.post('/auth/wallet/topup/stripe', { amount: amt });
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    showToast('Failed to create Stripe checkout session.', 'error');
                }
            } else if (selectedMethod === 'paypal') {
                // PayPal redirect to approval URL
                const { data } = await api.post('/auth/wallet/topup/paypal', { amount: amt });
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    showToast('Failed to create PayPal checkout order.', 'error');
                }
            } else if (selectedMethod === 'razorpay') {
                // Razorpay in-page SDK modal checkout
                const { data } = await api.post('/auth/wallet/topup/razorpay', { amount: amt });
                if (data.is_mock) {
                    (window as any).Razorpay = class MockRazorpay {
                        options: any;
                        constructor(options: any) {
                            this.options = options;
                        }
                        open() {
                            const overlay = document.createElement('div');
                            overlay.id = 'razorpay-mock-modal';
                            overlay.style.position = 'fixed';
                            overlay.style.inset = '0';
                            overlay.style.zIndex = '99999';
                            overlay.style.display = 'flex';
                            overlay.style.alignItems = 'center';
                            overlay.style.justifyContent = 'center';
                            overlay.style.background = 'rgba(15, 23, 42, 0.6)';
                            overlay.style.backdropFilter = 'blur(4px)';
                            overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

                            const card = document.createElement('div');
                            card.style.background = '#ffffff';
                            card.style.width = '100%';
                            card.style.maxWidth = '380px';
                            card.style.borderRadius = '16px';
                            card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                            card.style.overflow = 'hidden';
                            card.style.display = 'flex';
                            card.style.flexDirection = 'column';
                            card.style.animation = 'rzpPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

                            const amountInINR = this.options.amount / 100;
                            const formattedAmount = new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: this.options.currency || 'INR'
                            }).format(amountInINR);

                            const themeColor = this.options.theme?.color || '#ff5a3c';

                            card.innerHTML = `
                                <div style="background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="text-align: left;">
                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${this.options.name || 'B2B Portal'}</h4>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${this.options.description || 'Payment Gateway'}</p>
                                    </div>
                                    <button id="rzp-close-btn" style="border: none; background: transparent; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
                                </div>
                                <div style="padding: 20px; text-align: center; background: #ffffff;">
                                    <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Amount to Pay</span>
                                    <h2 style="margin: 6px 0 0 0; font-size: 32px; font-weight: 900; color: ${themeColor};">${formattedAmount}</h2>
                                </div>
                                <div style="padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; text-align: left;">Mock Payment Options</div>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 2px solid ${themeColor}; background: #f0f9ff; border-radius: 12px; cursor: pointer; width: 100%; box-sizing: border-box;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <span style="font-size: 20px;">💳</span>
                                            <div style="text-align: left;">
                                                <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Card / UPI / Netbanking</div>
                                                <div style="font-size: 11px; color: #64748b;">Simulate live checkout screen</div>
                                            </div>
                                        </div>
                                        <input type="radio" name="mock_option" checked style="accent-color: ${themeColor};" />
                                    </label>
                                </div>
                                <div style="padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                                    <button id="rzp-pay-btn" style="width: 100%; padding: 14px; background: ${themeColor}; color: #ffffff; border: none; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        Pay ${formattedAmount}
                                    </button>
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; font-weight: 600;">
                                        🛡️ Secured by <span style="color: #0f172a; font-weight: 800;">Razorpay</span> Mock Sandbox
                                    </div>
                                </div>
                                <style>
                                    @keyframes rzpPop {
                                        from { transform: scale(0.95); opacity: 0; }
                                        to { transform: scale(1); opacity: 1; }
                                    }
                                </style>
                            `;

                            overlay.appendChild(card);
                            document.body.appendChild(overlay);

                            const closeBtn = card.querySelector('#rzp-close-btn');
                            closeBtn?.addEventListener('click', () => {
                                document.body.removeChild(overlay);
                            });

                            const payBtn = card.querySelector('#rzp-pay-btn') as HTMLButtonElement;
                            payBtn?.addEventListener('click', () => {
                                payBtn.disabled = true;
                                payBtn.innerHTML = `<span style="width: 18px; height: 18px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; display: inline-block; animation: rzpSpin 0.6s linear infinite;"></span> Processing...`;
                                
                                if (!document.getElementById('rzp-spin-style')) {
                                    const style = document.createElement('style');
                                    style.id = 'rzp-spin-style';
                                    style.innerHTML = `@keyframes rzpSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                                    document.head.appendChild(style);
                                }

                                setTimeout(() => {
                                    document.body.removeChild(overlay);
                                    const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11);
                                    this.options.handler({
                                        razorpay_order_id: this.options.order_id,
                                        razorpay_payment_id: mockPaymentId,
                                        razorpay_signature: 'mock_signature'
                                    });
                                }, 1500);
                            });
                        }
                    };
                } else {
                    const scriptLoaded = await loadRazorpayScript();
                    if (!scriptLoaded) {
                        showToast('Failed to load Razorpay SDK.', 'error');
                        setSubmitting(false);
                        return;
                    }
                }

                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "B2B Escrow Portal",
                    description: `Wallet Top-up of $${amt.toFixed(2)}`,
                    ...(data.use_standard_checkout ? {} : { order_id: data.id }),
                    handler: async function (response: any) {
                        try {
                            setSubmitting(true);
                            await api.post('/auth/wallet/topup/razorpay/verify', {
                                razorpay_order_id: response.razorpay_order_id || data.id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount: amt
                            });
                            showToast('Wallet topped up successfully via Razorpay!');
                            setIsModalOpen(false);
                            setTopupAmount('');
                            fetchCreditData();
                        } catch (err: any) {
                            showToast(err.response?.data?.message || 'Razorpay payment verification failed.', 'error');
                        } finally {
                            setSubmitting(false);
                        }
                    },
                    prefill: {
                        name: '',
                        email: ''
                    },
                    theme: { color: "#ff5a3c" }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                setIsModalOpen(false);
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Checkout creation failed.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !credit) {
        return (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
                <p>Retrieving Business Credit Profile...</p>
            </div>
        );
    }

    const hasProfile = credit && credit.status !== 'none';

    return (
        <div className="dashboard-card-container" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'inherit', textAlign: 'left' }}>
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px',
                    padding: '12px 24px', borderRadius: '10px',
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', fontWeight: 'bold', zIndex: 10000,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Overview / Header */}
            <div>
                <h2 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: '900' }}>Trade Finance & Business Credit</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Secure Net-30/60/90 days financing limits to pay later for large volume procurement orders.</p>
            </div>

            {/* WALLET BALANCE INFO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '18px 24px', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Balance</span>
                        <h2 style={{ margin: '4px 0 0 0', fontWeight: '900', color: '#0f172a' }}>${walletBalance.toFixed(2)}</h2>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Deduct directly from your wallet balance to settle outstanding credit balances.</p>
                    </div>
                    {/* Simulated Top Up */}
                    <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <form onSubmit={handleOpenTopupModal} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', height: '32px', border: '1.5px solid #cbd5e1',
                                borderRadius: '6px', padding: '0 8px', flex: 1, background: '#fff'
                            }}>
                                <span style={{ color: '#64748b', marginRight: '4px', fontSize: '12px', fontWeight: 'bold' }}>$</span>
                                <input
                                    type="number"
                                    placeholder="Add Funds"
                                    min="1"
                                    step="0.01"
                                    value={topupAmount}
                                    onChange={e => setTopupAmount(e.target.value)}
                                    required
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%', fontSize: '12px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    height: '32px', padding: '0 12px', background: 'var(--primary-color, #ff7000)',
                                    color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px'
                                }}
                            >
                                {submitting ? '...' : 'Top Up'}
                            </button>
                        </form>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '18px 24px', border: '1.5px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repayment Standard</span>
                    <h2 style={{ margin: '4px 0 0 0', fontWeight: '900', color: '#0d2e67' }}>Net-{credit?.net_days || 30} Days</h2>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Standard trade terms allocated. Penalty interest applies thereafter.</p>
                </div>
            </div>

            {hasProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* CREDIT PORTAL METRICS */}
                    <div style={{
                        background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'
                    }}>
                        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Credit Status</span>
                            <div style={{ marginTop: '8px' }}>
                                <span style={{
                                    display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                    background: credit.status === 'active' ? '#e8fdf0' : (credit.status === 'pending' ? '#fffbeb' : '#fee2e2'),
                                    color: credit.status === 'active' ? '#10b981' : (credit.status === 'pending' ? '#d97706' : '#ef4444')
                                }}>
                                    {credit.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Approved Limit</span>
                            <h2 style={{ margin: '6px 0 0 0', fontWeight: '900', color: '#0f172a' }}>${credit.credit_limit.toFixed(2)}</h2>
                        </div>
                        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Available Limit</span>
                            <h2 style={{ margin: '6px 0 0 0', fontWeight: '900', color: '#10b981' }}>${credit.available_credit.toFixed(2)}</h2>
                        </div>
                        <div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Balance</span>
                            <h2 style={{ margin: '6px 0 0 0', fontWeight: '900', color: '#ef4444' }}>${credit.used_credit.toFixed(2)}</h2>
                        </div>
                    </div>

                    {/* REPAYMENT PORTION */}
                    {credit.status === 'active' && credit.used_credit > 0 && (
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800' }}>Settle Outstanding Net-Terms Dues</h3>
                            <form onSubmit={handleRepayCredit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', height: '40px', border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px', padding: '0 12px', flex: 1, background: '#f8fafc'
                                }}>
                                    <span style={{ color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>$</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        min="1"
                                        step="0.01"
                                        max={credit.used_credit}
                                        value={repayAmount}
                                        onChange={e => setRepayAmount(e.target.value)}
                                        required
                                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        height: '40px', padding: '0 24px', background: 'var(--primary-color, #0d2e67)',
                                        color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    {submitting ? 'Processing...' : 'Settle Now'}
                                </button>
                            </form>
                        </div>
                    )}

                    {credit.status === 'active' && (
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginTop: '16px' }}>
                            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800' }}>Request Credit Limit Increase</h3>
                            {credit.requested_limit > 0 ? (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', color: '#d97706', fontSize: '13px' }}>
                                    <strong>Request Pending:</strong> You have a pending request to increase your credit limit to <strong>${credit.requested_limit.toFixed(2)}</strong>. Our auditing team is reviewing it.
                                </div>
                            ) : (
                                <form onSubmit={handleRequestCredit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', height: '40px', border: '1.5px solid #cbd5e1',
                                        borderRadius: '8px', padding: '0 12px', flex: 1, background: '#f8fafc'
                                    }}>
                                        <span style={{ color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>$</span>
                                        <input
                                            type="number"
                                            placeholder={`Enter new limit amount (must exceed $${credit.credit_limit})`}
                                            min={credit.credit_limit + 1}
                                            value={requestedLimit}
                                            onChange={e => setRequestedLimit(e.target.value)}
                                            required
                                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            height: '40px', padding: '0 24px', background: '#ff5a3c',
                                            color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
                                        }}
                                    >
                                        {submitting ? 'Submitting...' : 'Request Increase'}
                                    </button>
                                </form>
                            )}
                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>Request a credit limit upgrade by specifying the desired total limit value.</p>
                        </div>
                    )}

                    {credit.status === 'pending' && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', color: '#d97706' }}>
                            <h4 style={{ margin: '0 0 4px 0', fontWeight: '800' }}>Review in Progress</h4>
                            <p style={{ margin: 0, fontSize: '13px' }}>Our credit review committee is currently auditing your incorporation and financial statements. We will update you via notifications once approved.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* REQUEST PORTAL - NO PROFILE */
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontWeight: '800' }}>Apply for Net-Terms Credit Limit</h3>
                    <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
                        Upload business credentials, bank ledger details, and audit history to extend credit limits from `$1,000` up to `$100,000` to pay for wholesale vendor bulk procurements on Net trade credit terms.
                    </p>

                    <form onSubmit={handleRequestCredit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Requested Credit Limit ($) *</label>
                            <div style={{
                                display: 'flex', alignItems: 'center', height: '40px', border: '1.5px solid #cbd5e1',
                                borderRadius: '8px', padding: '0 12px'
                            }}>
                                <span style={{ color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>$</span>
                                <input
                                    type="number"
                                    placeholder="5000"
                                    min="500"
                                    value={requestedLimit}
                                    onChange={e => setRequestedLimit(e.target.value)}
                                    required
                                    style={{ border: 'none', outline: 'none', width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Required Verification Documents</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: '20px' }}>📄</span>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>Business Registration Certificate</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>incorporation_certificate.pdf (Simulated Upload)</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: '20px' }}>📄</span>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>6 Months Bank Statement Audit Ledger</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>bank_statements.pdf (Simulated Upload)</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: '100%', height: '42px', background: 'var(--primary-color, #0d2e67)',
                                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer',
                                textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px'
                            }}
                        >
                            {submitting ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {/* WALLET HISTORY TABLE */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800', fontSize: '18px', fontFamily: 'Outfit, Inter, sans-serif' }}>Wallet Transaction History</h3>
                {walletHistory.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                                    <th style={{ padding: '12px 8px' }}>Date</th>
                                    <th style={{ padding: '12px 8px' }}>Transaction ID</th>
                                    <th style={{ padding: '12px 8px' }}>Type</th>
                                    <th style={{ padding: '12px 8px' }}>Description</th>
                                    <th style={{ padding: '12px 8px' }}>Amount</th>
                                    <th style={{ padding: '12px 8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {walletHistory.map((tx) => (
                                    <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                                        <td style={{ padding: '14px 8px', whiteSpace: 'nowrap' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '14px 8px', fontFamily: 'monospace', color: '#64748b' }}>#{tx._id.slice(-8).toUpperCase()}</td>
                                        <td style={{ padding: '14px 8px', textTransform: 'capitalize', fontWeight: '600' }}>{tx.type}</td>
                                        <td style={{ padding: '14px 8px', color: '#64748b' }}>{tx.description}</td>
                                        <td style={{ padding: '14px 8px', fontWeight: '700', color: tx.type === 'credit' ? '#10b981' : '#ef4444' }}>
                                            {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '14px 8px' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                                                background: tx.status === 'completed' ? '#e8fdf0' : (tx.status === 'pending' ? '#fffbeb' : '#fee2e2'),
                                                color: tx.status === 'completed' ? '#10b981' : (tx.status === 'pending' ? '#d97706' : '#ef4444')
                                            }}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>No wallet transactions found.</p>
                    </div>
                )}
            </div>

            {/* PAYMENT MODAL POPUP */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '480px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', position: 'relative', padding: '32px 32px 16px 32px' }}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    position: 'absolute', right: '24px', top: '24px',
                                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', color: '#64748b',
                                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            >
                                ✕
                            </button>
                            <h3 style={{ margin: '0 0 6px 0', fontWeight: '800', color: '#0f172a', fontSize: '24px', fontFamily: 'Outfit, Inter, sans-serif' }}>
                                Choose Payment
                            </h3>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                                Starter Plan • ${parseFloat(topupAmount).toFixed(2)}
                            </span>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleModalPaymentSubmit} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {enabledMethods.map((method: any) => {
                                    const isSelected = selectedMethod === method.provider;
                                    const label = methodMeta[method.provider]?.label || method.provider.toUpperCase();
                                    return (
                                        <div
                                            key={method.provider}
                                            onClick={() => setSelectedMethod(method.provider)}
                                            style={{
                                                border: isSelected ? '2px solid #ff5a3c' : '1.5px solid #e2e8f0',
                                                borderRadius: '16px',
                                                padding: '18px 24px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                background: isSelected ? '#fff9f7' : '#fff',
                                                boxShadow: isSelected ? '0 4px 12px rgba(255, 90, 60, 0.08)' : 'none',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                color: '#1e293b',
                                                fontFamily: 'Outfit, Inter, sans-serif'
                                            }}>
                                                {label}
                                            </span>
                                            <div style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                border: '2px solid ' + (isSelected ? '#ff5a3c' : '#cbd5e1'),
                                                background: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'border 0.2s ease'
                                            }}>
                                                {isSelected && (
                                                    <div style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: '#ff5a3c',
                                                    }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%', height: '50px', background: '#ff5a3c',
                                    color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '800',
                                    cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '15px',
                                    fontFamily: 'Outfit, Inter, sans-serif', marginTop: '12px',
                                    boxShadow: '0 4px 12px rgba(255, 90, 60, 0.2)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e04a2d';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 90, 60, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ff5a3c';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 90, 60, 0.2)';
                                }}
                            >
                                {submitting ? 'Redirecting to checkout...' : 'Proceed to Checkout'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyerCredit;
