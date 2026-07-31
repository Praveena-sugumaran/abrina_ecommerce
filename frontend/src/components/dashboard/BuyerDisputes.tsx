import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { updateDisputeTracking } from '@/services/disputeApi';
import styles from './BuyerDisputes.module.css';

const STATUS_COLORS = {
    open: { bg: '#fff7ed', color: '#ea580c', label: 'Open' },
    under_review: { bg: '#eff6ff', color: '#2563eb', label: 'Under Review' },
    resolved_buyer_favored: { bg: '#ecfdf5', color: '#059669', label: 'Resolved (Buyer)' },
    resolved_supplier_favored: { bg: '#f0fdf4', color: '#16a34a', label: 'Resolved (Supplier)' },
    closed: { bg: '#f1f5f9', color: '#475569', label: 'Closed' },
};

const BuyerDisputes = ({ role = 'buyer' }: { role?: 'buyer' | 'supplier' }) => {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any | null>(null);
    const [buyerMsg, setBuyerMsg] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [trackingNum, setTrackingNum] = useState('');
    const [updatingTracking, setUpdatingTracking] = useState(false);

    const fetchDisputes = async () => {
        try {
            const { data } = await api.get('/disputes/my-disputes');
            setDisputes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDisputes(); }, []);

    useEffect(() => {
        if (selected) {
            const updated = disputes.find((d: any) => d._id === selected._id);
            if (updated) setSelected(updated);
        }
    }, [disputes]);

    useEffect(() => {
        setTrackingNum('');
    }, [selected?._id]);

    const handleUpdateTracking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNum.trim() || !selected) return;
        setUpdatingTracking(true);
        try {
            const payload = role === 'buyer'
                ? { buyer_return_tracking_number: trackingNum }
                : { supplier_exchange_tracking_number: trackingNum };
            
            const { data } = await updateDisputeTracking(selected._id, payload);
            setSelected(data);
            setTrackingNum('');
            await fetchDisputes();
            alert('Tracking number updated successfully.');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update tracking');
        } finally {
            setUpdatingTracking(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerMsg.trim() || !selected) return;
        setSendingMsg(true);
        try {
            await api.post(`/disputes/${selected._id}/message`, { message: buyerMsg });
            setBuyerMsg('');
            await fetchDisputes();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSendingMsg(false);
        }
    };

    const filtered = filterStatus === 'all' ? disputes : disputes.filter(d => d.status === filterStatus);

    if (loading) {
        return (
            <div className={styles.spinnerWrap}>
                <div className={styles.spinner}></div>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading disputes...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h2>Dispute Management</h2>
                    <p>Track, resolve, and chat with buyers about claim disputes.</p>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    {['all', 'open', 'under_review', 'closed'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setFilterStatus(s); setSelected(null); }}
                            className={`${styles.tab} ${filterStatus === s ? styles.active : ''}`}
                        >
                            {s === 'all' ? 'All' : STATUS_COLORS[s as keyof typeof STATUS_COLORS]?.label || s}
                        </button>
                    ))}
                </div>
                <span className={styles.countText}>{filtered.length} dispute{filtered.length !== 1 ? 's' : ''} found</span>
            </div>

            {/* Split Workspace */}
            <div className={styles.workspace}>
                {/* Left panel: List */}
                <div className={`${styles.leftPanel} ${!selected ? styles.fullWidth : ''}`}>
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>🛡️</div>
                            <div className={styles.emptyStateTitle}>No disputes in this category</div>
                        </div>
                    ) : (
                        filtered.map((d: any) => {
                            const sc = STATUS_COLORS[d.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.open;
                            const isSelected = selected?._id === d._id;
                            return (
                                <div
                                    key={d._id}
                                    onClick={() => setSelected(d)}
                                    className={`${styles.disputeCard} ${isSelected ? styles.selected : ''}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <div className={styles.orderId}>
                                                Order #{String(d.order_id?._id || d.order_id || '').slice(-12).toUpperCase()}
                                            </div>
                                            <div className={styles.dateText}>
                                                Opened {new Date(d.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <span className={`${styles.statusTag} ${styles[d.status] || ''}`}>
                                            {sc.label}
                                        </span>
                                    </div>
                                    <div className={styles.reasonBox}>
                                        Reason: {d.reason}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right panel: Details + Chat */}
                {selected && (
                    <div className={styles.rightPanel}>
                        <div className={styles.detailSection}>
                            <div className={styles.detailHeader}>
                                <div className={styles.detailHeaderLeft}>
                                    <span style={{ fontSize: 20 }}>📄</span>
                                    <h3>Dispute Overview</h3>
                                </div>
                                <button onClick={() => setSelected(null)} className={styles.closeDetailsBtn}>
                                    ✕ Close
                                </button>
                            </div>

                            <div className={styles.statsGrid}>
                                <div>
                                    <div className={styles.statItemLabel}>Order Ref</div>
                                    <div className={styles.statItemValue} style={{ fontFamily: 'monospace' }}>
                                        #{String(selected.order_id?._id || selected.order_id || '').slice(-12).toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className={styles.statItemLabel}>Claim Reason</div>
                                    <div className={styles.statItemValue}>{selected.reason}</div>
                                </div>
                                <div>
                                    <div className={styles.statItemLabel}>Dispute Type</div>
                                    <div className={styles.statItemValue} style={{ textTransform: 'capitalize' }}>
                                        {selected.type || 'refund'}
                                    </div>
                                </div>
                                <div>
                                    <div className={styles.statItemLabel}>Status</div>
                                    <span className={`${styles.statusTag} ${styles[selected.status] || ''}`} style={{ display: 'inline-block', marginTop: 4 }}>
                                        {STATUS_COLORS[selected.status as keyof typeof STATUS_COLORS]?.label || selected.status}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <div className={styles.descriptionLabel}>Detailed Description</div>
                                <div className={styles.descriptionValue}>{selected.description}</div>
                            </div>

                            {/* Return & Exchange Tracking */}
                            {selected.type === 'exchange' && selected.status === 'resolved_buyer_favored' && (
                                <div style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
                                    <h4 className={styles.trackingTitle}>Return & Replacement Shipping</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Buyer Shipment */}
                                        <div className={styles.trackingBox}>
                                            <div className={styles.trackingBoxTitle}>1. Buyer Return Tracking</div>
                                            {selected.buyer_return_tracking_number ? (
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                                    Tracking Number: <code style={{ color: 'var(--primary-color)' }}>{selected.buyer_return_tracking_number}</code>
                                                </div>
                                            ) : role === 'buyer' ? (
                                                <form onSubmit={handleUpdateTracking} className={styles.trackingInputForm}>
                                                    <input
                                                        type="text"
                                                        value={trackingNum}
                                                        onChange={e => setTrackingNum(e.target.value)}
                                                        placeholder="Enter return tracking ID..."
                                                        className={styles.trackingInput}
                                                    />
                                                    <button type="submit" disabled={updatingTracking} className={styles.trackingBtn}>
                                                        Submit
                                                    </button>
                                                </form>
                                            ) : (
                                                <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    Awaiting buyer return tracking...
                                                </div>
                                            )}
                                        </div>

                                        {/* Supplier Replacement */}
                                        <div className={styles.trackingBox}>
                                            <div className={styles.trackingBoxTitle}>2. Supplier Replacement Tracking</div>
                                            {selected.supplier_exchange_tracking_number ? (
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                                    Tracking Number: <code style={{ color: '#10b981' }}>{selected.supplier_exchange_tracking_number}</code>
                                                </div>
                                            ) : role === 'supplier' ? (
                                                <form onSubmit={handleUpdateTracking} className={styles.trackingInputForm}>
                                                    <input
                                                        type="text"
                                                        value={trackingNum}
                                                        onChange={e => setTrackingNum(e.target.value)}
                                                        placeholder="Enter replacement tracking ID..."
                                                        className={styles.trackingInput}
                                                    />
                                                    <button type="submit" disabled={updatingTracking} className={styles.trackingBtn} style={{ background: '#10b981' }}>
                                                        Submit
                                                    </button>
                                                </form>
                                            ) : (
                                                <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    Awaiting supplier replacement tracking...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timeline Resolution Chat */}
                        <div className={styles.detailSection} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderDot}></div>
                                <h4>Resolution Thread</h4>
                            </div>

                            <div className={styles.chatMessages}>
                                {(!selected.messages || selected.messages.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                                            No messages yet. Send a message below to start resolving the issue.
                                        </p>
                                    </div>
                                )}
                                {selected.messages?.map((msg: any, i: number) => {
                                    const isMe = msg.sender_role === role;
                                    const isAdmin = msg.sender_role === 'admin';
                                    
                                    const avatarBg = isAdmin ? '#fff1f2' : isMe ? 'var(--primary-color)' : '#ecfdf5';
                                    const avatarColor = isAdmin ? '#e11d48' : isMe ? '#fff' : '#10b981';
                                    
                                    const bubbleBg = isAdmin ? '#fff1f2' : isMe ? '#f8fafc' : '#f0fdf4';
                                    const bubbleBorder = isAdmin ? '#fee2e2' : isMe ? '#e2e8f0' : '#dcfce7';
                                    const nameColor = isMe ? 'var(--primary-color)' : '#94a3b8';

                                    return (
                                        <div key={i} className={`${styles.msgRow} ${isMe ? styles.me : ''}`}>
                                            <div className={styles.msgAvatar} style={{ background: avatarBg, color: avatarColor }}>
                                                {isAdmin ? 'A' : msg.sender_role === 'buyer' ? 'B' : 'S'}
                                            </div>
                                            <div className={styles.msgBubble} style={{ background: bubbleBg, borderColor: bubbleBorder, borderStyle: 'solid', borderWidth: '1.5px' }}>
                                                <div className={styles.msgMetaName} style={{ color: nameColor }}>
                                                    {isAdmin ? 'Platform Admin' : isMe ? 'You' : (msg.sender_role === 'buyer' ? 'Buyer' : 'Supplier')}
                                                </div>
                                                <div className={styles.msgText}>{msg.message}</div>
                                                <div className={styles.msgTime}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Message input */}
                            {!['resolved_buyer_favored', 'resolved_supplier_favored', 'closed'].includes(selected.status) && (
                                <form onSubmit={handleSendMessage} className={styles.chatInputForm}>
                                    <input
                                        value={buyerMsg}
                                        onChange={e => setBuyerMsg(e.target.value)}
                                        placeholder="Add to the claim response thread..."
                                        className={styles.chatInput}
                                    />
                                    <button type="submit" disabled={sendingMsg} className={styles.chatSendBtn}>
                                        {sendingMsg ? '...' : 'Send'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuyerDisputes;
