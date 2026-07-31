import React from 'react';
import styles from './OrderTimeline.module.css';

const OrderTimeline = ({ timeline, currentStatus }: { timeline?: any[]; currentStatus?: string }) => {
    const isCancelled = (currentStatus || '').toLowerCase() === 'cancelled';

    const steps = [
        { status: 'pending', label: 'Order Placed' },
        { status: 'confirmed', label: 'Payment Confirmed' },
        { status: 'processing', label: 'Processing' },
        { status: 'shipped', label: 'Shipped' },
        { status: 'out_for_delivery', label: 'Out for Delivery' },
        { status: 'delivered', label: 'Delivered' }
    ];

    const getStatusIndex = (status: string) => {
        const idx = steps.findIndex(s => s.status === (status || '').toLowerCase());
        return idx === -1 ? 0 : idx;
    };

    const currentIdx = isCancelled ? -1 : getStatusIndex(currentStatus || 'pending');

    return (
        <div className={`${styles['ot-container']} ${isCancelled ? styles['cancelled-order'] : ''}`}>
            <h3 className={styles['ot-title']}>
                {isCancelled ? (
                    <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✕ Order Cancelled
                    </span>
                ) : 'Order Progress'}
            </h3>
            <div className={styles['ot-timeline']}>
                {steps.map((step, index) => {
                    const isCompleted = !isCancelled && index <= currentIdx;
                    const isCurrent = !isCancelled && index === currentIdx;
                    const logEntry = timeline?.find((l: any) => (l?.status || '').toLowerCase() === step.status.toLowerCase() ||
                        (l?.status === 'Confirmed' && step.status === 'confirmed') ||
                        (l?.status === 'Out for Delivery' && step.status === 'out_for_delivery') ||
                        (l?.status === 'Processing' && step.status === 'processing'));

                    const customLog = timeline?.find((l: any) => l?.status === step.label);
                    const finalLog = customLog || logEntry;

                    return (
                        <div key={index} className={`${styles['ot-step']} ${isCompleted ? styles['completed'] : ''} ${isCurrent ? styles['current'] : ''}`}>
                            <div className={styles['ot-line']}></div>
                            <div className={styles['ot-icon-wrapper']}>
                                <div className={styles['ot-icon']}>
                                    {isCompleted && !isCurrent ? '✔' : (index + 1)}
                                </div>
                            </div>
                            <div className={styles['ot-content']}>
                                <span className={styles['ot-label']}>{step.label}</span>
                                <span className={styles['ot-date']}>
                                    {finalLog ? new Date(finalLog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (isCompleted ? 'Completed' : 'Pending')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderTimeline;
