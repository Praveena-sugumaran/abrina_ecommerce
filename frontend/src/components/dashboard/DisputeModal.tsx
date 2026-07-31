import React, { useState } from 'react';
import { openDispute } from '@/services/disputeApi';
import styles from './DisputeModal.module.css';

const DisputeModal = ({ isOpen, onClose, order }: { isOpen: boolean; onClose: () => void; order: any }) => {
    const [reason, setReason] = useState('Item not as described');
    const [type, setType] = useState('refund');
    const [replacementDetails, setReplacementDetails] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !order) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await openDispute({
                order_id: order._id,
                reason,
                description,
                type,
                replacement_details: type === 'exchange' ? replacementDetails : undefined
            });
            alert('Dispute opened successfully. The supplier and admin will review your case.');
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to open dispute');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles['dispute-modal-overlay']}>
            <div className={styles['dispute-modal-content']}>
                <div className={styles['dispute-modal-header']}>
                    <h3>Open a Dispute</h3>
                    <button className={styles['close-btn']} onClick={onClose}>&times;</button>
                </div>

                <div className={styles['dispute-order-info'] + " " + styles['mb-4'] + " " + styles['text-sm'] + " " + styles['text-gray-500']}>
                    <p><strong>Order ID:</strong> {order._id}</p>
                    <p><strong>Supplier:</strong> {order.supplier_id?.company_name || order.supplier_id?.first_name}</p>
                    <p><strong>Status:</strong> {order.status}</p>
                </div>

                {error && <div className={styles['dispute-error']}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles['form-group']}>
                        <label>Dispute Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            required
                        >
                            <option value="refund">Refund (Request money back)</option>
                            <option value="exchange">Exchange (Request replacement item)</option>
                        </select>
                    </div>

                    <div className={styles['form-group']}>
                        <label>Reason for Dispute</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="Item not as described">Item not as described</option>
                            <option value="Item defective/broken">Item defective/broken</option>
                            <option value="Item not received">Item not received</option>
                            <option value="Counterfeit item">Counterfeit item</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {type === 'exchange' && (
                        <div className={styles['form-group']}>
                            <label>Replacement Details</label>
                            <textarea
                                value={replacementDetails}
                                onChange={(e) => setReplacementDetails(e.target.value)}
                                placeholder="Please specify your preferred size, color, or other replacement options..."
                                required
                                rows={3}
                            />
                        </div>
                    )}

                    <div className={styles['form-group']}>
                        <label>Detailed Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please explain the issue in detail to help us resolve it quickly..."
                            required
                            rows={4}
                        />
                    </div>

                    <div className={styles['dispute-modal-actions']}>
                        <button type="button" className={styles['cancel-btn']} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles['submit-btn'] + " " + styles['bg-red-600'] + " " + styles['hover:bg-red-700']} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Dispute'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DisputeModal;
