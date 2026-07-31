import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

interface Plan {
    _id: string;
    name: string;
    price: number;
    duration_type: string;
    duration_value: number;
    features: string[];
    is_active: boolean;
    is_recommended: boolean;
    badge_icon?: string;
    max_products: number;
    max_images_per_product: number;
    max_showcases: number;
    max_rfq_responses: number;
}

interface PaymentMethod {
    provider: string;
}

const SupplierSubscription = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [toast, setToast] = useState({ msg: '', type: 'success' });
    const scrollRef = useRef<HTMLDivElement>(null);
    const { user, login } = useAuth();
    const location = usePathname();
    const navigate = useRouter();
    const searchParams = useSearchParams();

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
    };

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data } = await api.get('/subscription-plans?type=supplier');
                setPlans(data.filter((p: Plan) => p.is_active));
            } catch (err) {
                console.error('Error fetching supplier plans:', err);
            } finally {
                setLoading(false);
            }
        };
        const fetchMethods = async () => {
            try {
                const { data } = await api.get('/payment-methods/public');
                setEnabledMethods(data);
                if (data.length > 0) setPaymentMethod(data[0].provider);
            } catch (err) { console.error(err); }
        };
        fetchPlans();
        fetchMethods();
    }, []);

    const hasVerified = useRef(false);

    useEffect(() => {
        const verifyPayment = async () => {
            const params = new URLSearchParams(searchParams?.toString());
            const sessionId = params.get('session_id');
            const planId = params.get('plan_id');
            const status = params.get('status');
            const method = params.get('method');

            if (status === 'success' && planId && !hasVerified.current) {
                hasVerified.current = true;
                try {
                    if (sessionId && !method) {
                        // Stripe verification
                        const { data } = await api.post('/subscription-plans/verify-session', { sessionId, planId });
                        if (data.success) {
                            showToast('Subscription activated!');
                            const profileRes = await api.get('/auth/profile');
                            login(profileRes.data);
                            window.history.replaceState({}, '', '/supplier/dashboard/subscription');
                        }
                    } else if (method === 'paypal') {
                        // PayPal verification
                        const orderId = params.get('token');
                        const { data } = await api.post('/subscription-plans/verify-paypal', { orderId, planId });
                        if (data.success) {
                            showToast('Subscription activated via PayPal!');
                            const profileRes = await api.get('/auth/profile');
                            login(profileRes.data);
                            window.history.replaceState({}, '', '/supplier/dashboard/subscription');
                        }
                    }
                } catch (err) { console.error(err); hasVerified.current = false; }
            }
        };
        verifyPayment();
    }, [searchParams]);

    const handlePurchase = async (plan: Plan) => {
        if (plan.price > 0 && !showPaymentModal && enabledMethods.length > 1) {
            setSelectedPlan(plan);
            setShowPaymentModal(true);
            return;
        }

        setPurchasingId(plan._id);
        setShowPaymentModal(false);
        try {
            const basePath = location.includes('/supplier/dashboard') ? '/supplier/dashboard' : location.includes('/buyer/dashboard') ? '/buyer/dashboard' : '/dashboard';
            const { data } = await api.post(`/subscription-plans/purchase/${plan._id}`, {
                paymentMethod: paymentMethod || 'stripe',
                basePath
            });

            if (plan.price > 0) {
                if (data.url) {
                    window.location.href = data.url;
                } else if (paymentMethod === 'razorpay') {
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

                                const themeColor = this.options.theme?.color || 'var(--primary-color)';

                                card.innerHTML = `
                                    <div style="background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div style="text-align: left;">
                                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${this.options.name || 'B2B Marketplace'}</h4>
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
                            setPurchasingId(null);
                            return;
                        }
                    }

                    const options = {
                        key: data.key,
                        amount: data.amount,
                        currency: data.currency,
                        name: "Alibaba Demo Subscription",
                        description: `Subscription: ${plan.name}`,
                        ...(data.use_standard_checkout ? {} : { order_id: data.id }),
                        handler: async function (response: any) {
                            try {
                                await api.post('/subscription-plans/verify-razorpay', {
                                    razorpay_order_id: response.razorpay_order_id || data.id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    planId: plan._id
                                });
                                showToast('Subscription activated!');
                                const profileRes = await api.get('/auth/profile');
                                login(profileRes.data);
                                navigate.push('/supplier/dashboard/subscription');
                            } catch (err) {
                                showToast('Verification failed.', 'error');
                            }
                        },
                        prefill: {
                            name: `${user.first_name} ${user.last_name}`,
                            email: user.email,
                            contact: user.phone_number || ''
                        },
                        theme: { color: "var(--primary-color)" }
                    };
                    const rzp = new window.Razorpay(options);
                    rzp.open();
                } else {
                    showToast('Could not initiate checkout.', 'error');
                }
            } else {
                showToast('Free plan activated!');
                const profileRes = await api.get('/auth/profile');
                login(profileRes.data);
            }
        } catch (err) {
            showToast('Failed to start checkout.', 'error');
        } finally {
            setPurchasingId(null);
        }
    };

    const scrollBy = (dir: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
        }
    };

    const currentPlanId = user?.subscription_plan?._id || user?.subscription_plan;
    const isExpired = user?.subscription_end ? new Date() > new Date(user.subscription_end) : false;
    const hasActivePlan = currentPlanId && !isExpired;

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'hidden' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ minWidth: '240px', height: '400px', background: '#f3f4f6', borderRadius: '20px', flexShrink: 0, animation: 'pulse 1.5s infinite' }}></div>
                    ))}
                </div>
                <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 10px' }}>
            <style jsx>{`
                .plan-scroll-container {
                    display: flex;
                    gap: 24px;
                    overflow-x: auto;
                    padding: 10px 0 24px 0;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    width: 100%;
                    -webkit-overflow-scrolling: touch;
                }
                .plan-scroll-container::-webkit-scrollbar {
                    display: none;
                }
                @media (max-width: 1024px) {
                    .scroll-buttons {
                        display: flex !important;
                    }
                }
                @media (max-width: 768px) {
                    .plan-card {
                        min-width: 260px !important;
                        max-width: 290px !important;
                    }
                    .plan-card-body {
                        padding: 24px 20px 0 !important;
                    }
                    .plan-card-footer {
                        padding: 0 20px 24px !important;
                    }
                    .plan-stats-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                    }
                    .plan-stat-box {
                        padding: 10px 12px !important;
                        text-align: center !important;
                    }
                    .plan-stat-box p {
                        word-break: break-word !important;
                        white-space: normal !important;
                    }
                }
                @media (max-width: 1024px) {
                    .current-plan-banner {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        text-align: center !important;
                        padding: 40px 20px !important;
                        gap: 24px !important;
                        border-radius: 40px !important;
                        box-shadow: 0 15px 40px rgba(79, 70, 229, 0.08) !important;
                        width: calc(100% - 20px) !important;
                        margin: 0 auto 40px auto !important;
                    }
                    .banner-info-group {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 20px !important;
                        width: 100% !important;
                    }
                    .status-badge {
                        display: flex !important;
                        width: 100% !important;
                        max-width: 200px !important;
                        padding: 14px !important;
                        border-radius: 24px !important;
                        margin: 0 auto !important;
                        font-size: 16px !important;
                        justify-content: center !important;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.04) !important;
                    }
                }
            `}</style>
            {toast.msg && (
                <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#dc2626' : 'var(--primary-color)', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out' }}>
                    {toast.msg}
                    <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}

            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-color)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                    Business Growth Plans
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Expand your reach, boost your products, and connect with global buyers.</p>
            </div>

            {/* Current Plan Banner */}
            {hasActivePlan && (
                <div className="current-plan-banner" style={{ 
                    marginBottom: '40px', 
                    padding: '32px 40px', 
                    borderRadius: '32px', 
                    background: '#f0f3ff', 
                    border: '1px solid #e0e7ff', 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '24px', 
                    boxShadow: '0 10px 40px rgba(79, 70, 229, 0.05)',
                    width: '100%',
                    margin: '0 auto 40px auto'
                }}>
                    <div className="banner-info-group" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            background: '#fff', 
                            borderRadius: '18px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#4f46e5', 
                            boxShadow: '0 8px 16px rgba(0,0,0,0.04)', 
                            flexShrink: 0 
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" stroke="#4f46e5" strokeOpacity="0.1" />
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"></path>
                                <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '11px', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member Status</p>
                            <h3 style={{ margin: '4px 0 0', fontSize: '1.75rem', fontWeight: 900, color: '#1e1b4b', lineHeight: 1.2 }}>{user?.subscription_plan?.name || 'Verified Supplier'}</h3>
                            {user?.subscription_end && <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6366f1', fontWeight: 600, opacity: 0.8 }}>Expires: {new Date(user.subscription_end).toLocaleDateString()}</p>}
                        </div>
                    </div>
                    <div className="status-badge" style={{ 
                        background: '#fff', 
                        color: '#4f46e5', 
                        padding: '10px 32px', 
                        borderRadius: '100px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.1)', 
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>Active <span style={{fontSize: '16px'}}>✓</span></div>
                </div>
            )}

            {!hasActivePlan && (
                <div style={{ marginBottom: '24px', padding: '18px 24px', borderRadius: '16px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>📢</span>
                    <span>{isExpired ? 'Your visibility plan has expired.' : 'No active growth plan.'} Upgrade now to boost your search rankings and reach more buyers.</span>
                </div>
            )}

            {/* Horizontal scrollable card area */}
            <div style={{ position: 'relative', marginTop: '10px' }}>


                {plans.length > 1 && (
                    <div className="scroll-buttons" style={{ display: plans.length > 1 ? 'flex' : 'none', justifyContent: 'flex-end', gap: '12px', marginBottom: '12px' }}>
                        <button
                            onClick={() => scrollBy(-1)}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"></path></svg>
                        </button>
                        <button
                            onClick={() => scrollBy(1)}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"></path></svg>
                        </button>
                    </div>
                )}

                <div
                    ref={scrollRef}
                    className="plan-scroll-container"
                >
                    {plans.map(plan => {
                        const isCurrentPlan = currentPlanId === plan._id;
                        const isActivePlan = isCurrentPlan && !isExpired;
                        const isRecommended = plan.is_recommended;

                        return (
                            <div
                                key={plan._id}
                                className="plan-card"
                                style={{
                                    minWidth: '280px',
                                    maxWidth: '320px',
                                    flexShrink: 0,
                                    border: isActivePlan ? '3px solid #4f46e5' : isRecommended ? '2.5px solid #818cf8' : '1px solid #e2e8f0',
                                    background: '#fff',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    boxShadow: isActivePlan ? '0 20px 40px rgba(79, 70, 229, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = isActivePlan ? '0 25px 50px rgba(79, 70, 229, 0.2)' : '0 15px 35px rgba(0,0,0,0.08)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = isActivePlan ? '0 20px 40px rgba(79, 70, 229, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)';
                                }}
                            >
                                {isRecommended && !isActivePlan && (
                                    <div style={{ position: 'absolute', top: 20, right: 20, background: '#4f46e5', color: '#fff', padding: '6px 14px', borderRadius: '30px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Most Popular
                                    </div>
                                )}
                                {isActivePlan && (
                                    <div style={{ position: 'absolute', top: 20, right: 20, background: '#10b981', color: '#fff', padding: '6px 14px', borderRadius: '30px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>
                                        Current
                                    </div>
                                )}

                                <div className="plan-card-body" style={{ padding: '32px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        {plan.badge_icon && (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                                                <img src={getImgUrl(plan.badge_icon)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        )}
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#1e1b4b' }}>
                                            {plan.name}
                                        </h3>
                                    </div>

                                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--primary-color)' }}>
                                            ₹{plan.price.toLocaleString('en-IN')}
                                        </span>
                                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>/{plan.duration_type}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 24px', fontWeight: 500 }}>
                                        Tax exclusive · {plan.duration_value} {plan.duration_type}(s)
                                    </p>

                                    {/* Image Limit Feature */}
                                    <div className="plan-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                        <div className="plan-stat-box" style={{ padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Image Gallery</p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                                                {plan.max_images_per_product > 0 ? `${plan.max_images_per_product} / Prod` : 'Unlimited'}
                                            </p>
                                        </div>
                                        <div className="plan-stat-box" style={{ padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Product Listings</p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                                                {plan.max_products > 0 ? plan.max_products : 'Unlimited'}
                                            </p>
                                        </div>
                                        <div className="plan-stat-box" style={{ padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Showcases</p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                                                {plan.max_showcases > 0 ? plan.max_showcases : 'Unlimited'}
                                            </p>
                                        </div>
                                        <div className="plan-stat-box" style={{ padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Max RFQ</p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                                                {plan.max_rfq_responses > 0 ? plan.max_rfq_responses : 'Unlimited'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Feature list */}
                                    <div style={{ flex: 1, marginBottom: '24px' }}>
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                            {plan.features.map((f, i) => (
                                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', fontSize: '14px', color: '#475569', fontWeight: 500 }}>
                                                    <div style={{ width: '20px', height: '20px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    </div>
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="plan-card-footer" style={{ padding: '0 28px 32px' }}>
                                    <button
                                        onClick={() => !isActivePlan && handlePurchase(plan)}
                                        disabled={isActivePlan || purchasingId !== null}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            background: isActivePlan ? '#f1f5f9' : 'transparent',
                                            border: isActivePlan ? 'none' : '2px solid var(--primary-color)',
                                            color: isActivePlan ? '#94a3b8' : 'var(--primary-color)',
                                            fontWeight: 900,
                                            fontSize: '15px',
                                            cursor: isActivePlan || purchasingId ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: isActivePlan ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                                        }}
                                        onMouseEnter={e => !isActivePlan && (e.currentTarget.style.background = 'var(--primary-color)', e.currentTarget.style.color = '#fff')}
                                        onMouseLeave={e => !isActivePlan && (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--primary-color)')}
                                    >
                                        {purchasingId === plan._id ? '⏳ Processing...' : isActivePlan ? 'Current Plan' : isCurrentPlan && isExpired ? 'Renew Growth Plan' : 'Select Plan'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            {plans.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: '32px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚀</div>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: '#1e1b4b' }}>Scaling Plans Coming Soon</p>
                    <p style={{ fontSize: '15px', fontWeight: 500 }}>We're finalizing our premium tools to help you grow your business global.</p>
                </div>
            )}
            {showPaymentModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <button onClick={() => setShowPaymentModal(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f8fafc', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '18px' }}>&times;</button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Choose Payment</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>{selectedPlan?.name} Plan</p>
                        </div>

                        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                            {enabledMethods.map(m => (
                                <div
                                    key={m.provider}
                                    onClick={() => setPaymentMethod(m.provider)}
                                    style={{
                                        padding: '16px 20px',
                                        borderRadius: '16px',
                                        border: `2px solid ${paymentMethod === m.provider ? 'var(--primary-color)' : '#f1f5f9'}`,
                                        background: paymentMethod === m.provider ? '#f8faff' : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem', textTransform: 'capitalize' }}>{m.provider.replace('_', ' ')}</span>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${paymentMethod === m.provider ? 'var(--primary-color)' : '#cbd5e1'}`, background: paymentMethod === m.provider ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {paymentMethod === m.provider && <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => selectedPlan && handlePurchase(selectedPlan)}
                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', transition: 'all 0.2s' }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                    <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                </div>
            )}

        </div>
    );
};

export default SupplierSubscription;

