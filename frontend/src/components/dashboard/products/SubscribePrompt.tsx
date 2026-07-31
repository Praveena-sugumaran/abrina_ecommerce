import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const SubscribePrompt = ({ onSubscribed }: { onSubscribed: () => void }) => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, login } = useAuth();
    const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data } = await axios.get(`${BACKEND_URL}/subscription-plans`);
                setPlans(data.filter((p: any) => p.is_active));
            } catch (error) {
                console.error('Error fetching plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handlePurchase = async (plan: any) => {
        if (plan.price > 0) {
            try {
                const { data } = await axios.post(`${BACKEND_URL}/subscription-plans/purchase/${plan._id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (data.url) {
                    window.location.href = data.url; // Redirect directly to Stripe
                } else {
                    alert('Could not initiate checkout.');
                }
            } catch (error) {
                console.error('Error starting checkout:', error);
                alert('Failed to start checkout.');
            }
        } else {
            // Free plan, purchase instantly
            await finalizePurchase(plan._id);
        }
    };

    const finalizePurchase = async (planId: string) => {
        try {
            const { data } = await axios.post(`${BACKEND_URL}/subscription-plans/purchase/${planId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Subscription purchased successfully!');

            // Refresh User
            const profileRes = await axios.get(`${BACKEND_URL}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
            login(profileRes.data);

            onSubscribed();
        } catch (error) {
            console.error('Error purchasing plan:', error);
            alert('Failed to purchase plan.');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading plans...</div>;

    const currentPlanId = user?.subscription_plan?._id || user?.subscription_plan;
    const isExpired = user?.subscription_end ? new Date() > new Date(user.subscription_end) : false;
    const hasActivePlan = currentPlanId && !isExpired;

    return (
        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>To add products, you need an active subscription plan</h2>
                <p style={{ color: '#666', marginTop: '8px' }}>Choose a plan below to unlock your storefront features.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {plans.map(plan => {
                    const isCurrentPlan = currentPlanId === plan._id;
                    const isActivePlan = isCurrentPlan && !isExpired;

                    return (
                        <div key={plan._id} style={{ border: isActivePlan ? '2px solid var(--primary-color)' : '2px solid #e5e5e5', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', backgroundColor: isActivePlan ? '#fafbff' : '#fff' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: plan.badge_color || '#333' }}>{plan.name}</h3>
                            {plan.tagline && <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#555', marginBottom: '8px', fontWeight: 'bold' }}>{plan.tagline}</p>}
                            <p style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px' }}>${plan.price} <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>/ {plan.duration_value} {plan.duration_type}(s)</span></p>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{plan.description}</p>
                            <div style={{ background: '#f5f7ff', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--primary-color)' }}>
                                <strong>Limits:</strong> {plan.max_products <= 0 ? 'Unlimited' : plan.max_products} Products | {plan.max_images_per_product <= 0 ? 'Unlimited' : plan.max_images_per_product} Images/Product
                            </div>

                            <ul style={{ margin: '0 0 32px 0', padding: 0, fontSize: '14px', color: '#444', listStyle: 'none', flex: 1 }}>
                                {plan.features.map((f: any, i: number) => (
                                    <li key={i} style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePurchase(plan)}
                                disabled={isActivePlan || (hasActivePlan && !isCurrentPlan)}
                                style={{ 
                                    width: '100%', 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    background: (isActivePlan || (hasActivePlan && !isCurrentPlan)) ? '#ccc' : 'var(--clr-accent)', 
                                    color: (isActivePlan || (hasActivePlan && !isCurrentPlan)) ? '#666' : 'white', 
                                    fontWeight: 'bold', 
                                    fontSize: '16px', 
                                    border: 'none', 
                                    cursor: (isActivePlan || (hasActivePlan && !isCurrentPlan)) ? 'not-allowed' : 'pointer', 
                                    transition: 'background 0.2s', 
                                    boxShadow: (isActivePlan || (hasActivePlan && !isCurrentPlan)) ? 'none' : '0 4px 12px rgba(255,106,0,0.2)' 
                                }}
                            >
                                {isActivePlan ? 'Active Plan' : (isCurrentPlan && isExpired ? 'Renew Plan' : 'Select Plan')}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button onClick={onSubscribed} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}>Cancel & Go Back</button>
            </div>
        </div>
    );
};

export default SubscribePrompt;
