import React, { useEffect, useState } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Installment {
    number: number;
    due_date: string;
    amount: number;
    status: 'paid' | 'pending';
    paid_at?: string;
    gateway?: string;
    payment_intent_id?: string;
}

interface EmiSchedule {
    _id: string;
    order_id: {
        _id: string;
        total_amount: number;
        status: string;
        payment_status: string;
        createdAt: string;
        supplier_id?: {
            company_name: string;
        };
    };
    emi_plan_id: {
        _id: string;
        name: string;
        installments: number;
        interest_rate: number;
        processing_fee: number;
    };
    total_amount: number;
    principal: number;
    interest_total: number;
    processing_fee: number;
    installments: Installment[];
    status: 'active' | 'completed' | 'defaulted';
    createdAt: string;
}

const MyEmiSchedules = () => {
    const { convertPrice, user } = useAuth();
    const { showToast } = useToast();
    const [schedules, setSchedules] = useState<EmiSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<EmiSchedule | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'stripe'>('wallet');
    const [payingNum, setPayingNum] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/emi/my-schedules');
            setSchedules(data.data || []);
            // Update selected schedule details if currently viewable
            if (selectedSchedule) {
                const updated = (data.data || []).find((s: EmiSchedule) => s._id === selectedSchedule._id);
                if (updated) setSelectedSchedule(updated);
            }
        } catch (err) {
            console.error('Failed to fetch EMI schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const handlePayInstallment = async (scheduleId: string, installmentNum: number) => {
        setPayingNum(installmentNum);
        setActionLoading(true);
        try {
            const { data } = await api.post(`/emi/schedule/${scheduleId}/pay/${installmentNum}`, {
                paymentMethod
            });
            showToast(`Installment #${installmentNum} paid successfully!`, 'success');
            await fetchSchedules();
        } catch (err: any) {
            console.error('Payment failed:', err);
            showToast(err.response?.data?.message || 'Payment processing failed. Please check your wallet balance.', 'error');
        } finally {
            setActionLoading(false);
            setPayingNum(null);
        }
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>My Financing & EMIs</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Track your active credit schedules, monthly payments, and pay outstanding installments.</p>
                </div>
                <button 
                    onClick={fetchSchedules}
                    style={{
                        padding: '8px 16px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🔄 Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2].map(i => (
                        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', opacity: 0.6, animation: 'pulse 1.5s infinite' }}>
                            <div style={{ width: '140px', height: '20px', background: '#e2e8f0', borderRadius: '6px', marginBottom: '12px' }} />
                            <div style={{ width: '60%', height: '16px', background: '#cbd5e1', borderRadius: '6px', marginBottom: '8px' }} />
                            <div style={{ width: '40%', height: '14px', background: '#e2e8f0', borderRadius: '6px' }} />
                        </div>
                    ))}
                </div>
            ) : schedules.length === 0 ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
                    <span style={{ fontSize: '48px' }}>💳</span>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginTop: '16px' }}>No EMI Schedules Found</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0' }}>
                        You haven't financed any purchases with EMI yet. Select the EMI installment option at checkout for eligible orders.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: selectedSchedule ? '1fr 380px' : '1fr', gap: '24px', alignItems: 'start' }}>
                    {/* List of Schedules */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {schedules.map((schedule) => {
                            const paidCount = schedule.installments.filter(i => i.status === 'paid').length;
                            const totalCount = schedule.installments.length;
                            const progressPercent = (paidCount / totalCount) * 100;
                            const isSelected = selectedSchedule?._id === schedule._id;

                            return (
                                <div 
                                    key={schedule._id}
                                    style={{
                                        background: '#ffffff',
                                        border: isSelected ? '2px solid #ff6600' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 10px 25px -5px rgba(255, 102, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => setSelectedSchedule(schedule)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px' }}>
                                                    {schedule.emi_plan_id?.name || `${totalCount}-Month Plan`}
                                                </span>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    fontWeight: '800', 
                                                    background: schedule.status === 'completed' ? '#ecfdf5' : '#fffbeb', 
                                                    color: schedule.status === 'completed' ? '#065f46' : '#92400e', 
                                                    padding: '4px 8px', 
                                                    borderRadius: '6px' 
                                                }}>
                                                    {schedule.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '12px', margin: '12px 0 4px' }}>
                                                Order Reference: #{schedule.order_id?._id || schedule._id}
                                            </h3>
                                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                                Vendor: <strong>{schedule.order_id?.supplier_id?.company_name || 'B2C Seller'}</strong>
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Total Payable</div>
                                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                                                {convertPrice(schedule.total_amount).formatted}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                Principal: {convertPrice(schedule.principal).formatted} | Interest: {convertPrice(schedule.interest_total).formatted}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Section */}
                                    <div style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>
                                            <span>Installments Progress</span>
                                            <span style={{ color: '#ff6600' }}>{paidCount} of {totalCount} paid ({Math.round(progressPercent)}%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#ff6600', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                                        <span>Started: {new Date(schedule.createdAt).toLocaleDateString()}</span>
                                        <span style={{ color: '#ff6600', fontWeight: '700' }}>Click to view details & pay ❯</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed view of Selected Schedule */}
                    {selectedSchedule && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'sticky', top: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Schedule Details</h3>
                                <button 
                                    onClick={() => setSelectedSchedule(null)} 
                                    style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Monthly Installment</div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#ff6600' }}>
                                    {convertPrice(selectedSchedule.installments[0]?.amount || 0).formatted}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                    Plan: {selectedSchedule.emi_plan_id?.name || 'Active EMI Plan'}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                                    Payment Trigger Method
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: paymentMethod === 'wallet' ? '2px solid #ff6600' : '1px solid #cbd5e1',
                                            background: paymentMethod === 'wallet' ? '#fffaf5' : '#fff',
                                            color: paymentMethod === 'wallet' ? '#ff6600' : '#475569',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        👛 Wallet Balance
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('stripe')}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: paymentMethod === 'stripe' ? '2px solid #ff6600' : '1px solid #cbd5e1',
                                            background: paymentMethod === 'stripe' ? '#fffaf5' : '#fff',
                                            color: paymentMethod === 'stripe' ? '#ff6600' : '#475569',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        💳 Debit/Credit Card
                                    </button>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Installments Checklist</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                {selectedSchedule.installments.map((inst) => {
                                    const isDue = inst.status === 'pending';
                                    const formattedDueDate = new Date(inst.due_date).toLocaleDateString();

                                    return (
                                        <div 
                                            key={inst.number}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: inst.status === 'paid' ? '#f0fdf4' : '#f8fafc',
                                                border: inst.status === 'paid' ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: inst.status === 'paid' ? '#166534' : '#1e293b' }}>
                                                    Installment #{inst.number}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    {inst.status === 'paid' ? `Paid on ${new Date(inst.paid_at || '').toLocaleDateString()}` : `Due by ${formattedDueDate}`}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                    {convertPrice(inst.amount).formatted}
                                                </span>
                                                {inst.status === 'paid' ? (
                                                    <span style={{ fontSize: '16px', color: '#22c55e' }}>✓</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePayInstallment(selectedSchedule._id, inst.number)}
                                                        disabled={actionLoading}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: '#ff6600',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            opacity: actionLoading && payingNum === inst.number ? 0.6 : 1
                                                        }}
                                                    >
                                                        {actionLoading && payingNum === inst.number ? 'Paying...' : 'Pay'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyEmiSchedules;
