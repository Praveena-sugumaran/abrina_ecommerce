'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import styles from '@/app/pages/tender/Tender.module.css';
import { toast } from 'react-hot-toast';

const TenderLive = ({ tenderId, role }: { tenderId: string; role: 'buyer' | 'supplier' }) => {
    const navigate = useRouter();
    const { user, convertPrice } = useAuth();
    const { socket } = useChat();

    const [tender, setTender] = useState<any>(null);
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Bid Form states
    const [priceOffered, setPriceOffered] = useState('');
    const [deliveryDays, setDeliveryDays] = useState('');
    const [notes, setNotes] = useState('');
    const [submittingBid, setSubmittingBid] = useState(false);

    // Countdown Timer states
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    // Custom Modal states for Awarding Tenders
    const [showAwardModal, setShowAwardModal] = useState(false);
    const [selectedBid, setSelectedBid] = useState<{ bidId: string; supplierName: string } | null>(null);
    const [awardingInProgress, setAwardingInProgress] = useState(false);

    const fetchTenderDetails = async () => {
        try {
            const { data } = await api.get(`/tenders/${tenderId}`);
            setTender(data.data.tender);
            setBids(data.data.bids || []);
        } catch (err: any) {
            setError('Failed to fetch tender details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenderId) {
            fetchTenderDetails();
        }
    }, [tenderId]);

    // Socket Room Listeners
    useEffect(() => {
        if (socket && tenderId) {
            socket.emit('joinTender', tenderId);

            socket.on('bidPlaced', (data: any) => {
                setTender((prev: any) => {
                    if (!prev) return null;
                    return { ...prev, current_lowest_bid: data.current_lowest_bid };
                });
                setBids((prev: any[]) => {
                    // Avoid duplicate records
                    if (prev.some(b => b._id === data.bid._id)) return prev;
                    const updated = [...prev, data.bid];
                    return updated.sort((a, b) => a.price_offered - b.price_offered);
                });
                toast.success(`New lowest bid placed: $${data.current_lowest_bid}!`);
            });

            socket.on('tenderAwarded', (data: any) => {
                setTender((prev: any) => {
                    if (!prev) return null;
                    return { 
                        ...prev, 
                        status: 'awarded', 
                        winning_bid_id: data.tender.winning_bid_id 
                    };
                });
                toast.success('This tender has been awarded!');
            });
        }

        return () => {
            if (socket && tenderId) {
                socket.emit('leaveTender', tenderId);
                socket.off('bidPlaced');
                socket.off('tenderAwarded');
            }
        };
    }, [socket, tenderId]);

    // Live countdown timer execution
    useEffect(() => {
        if (!tender || tender.status !== 'active') return;

        const updateTimer = () => {
            const end = new Date(tender.end_time).getTime();
            const now = new Date().getTime();
            const distance = end - now;

            if (distance <= 0) {
                setIsExpired(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        updateTimer();
        const timerId = setInterval(updateTimer, 1000);

        return () => clearInterval(timerId);
    }, [tender]);

    const handlePlaceBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tender || submittingBid) return;

        const currentLowest = tender.current_lowest_bid !== undefined ? tender.current_lowest_bid : tender.start_price;
        const maxAllowed = currentLowest - tender.min_decrement;
        const bidPrice = Number(priceOffered);

        if (bidPrice > maxAllowed) {
            toast.error(`Your bid must be at most $${maxAllowed} (Current lowest: $${currentLowest} minus decrement of $${tender.min_decrement})`);
            return;
        }

        setSubmittingBid(true);
        try {
            await api.post(`/tenders/${tenderId}/bid`, {
                price_offered: bidPrice,
                delivery_days: Number(deliveryDays),
                notes
            });
            toast.success('Bid placed successfully!');
            setPriceOffered('');
            setDeliveryDays('');
            setNotes('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit bid');
        } finally {
            setSubmittingBid(false);
        }
    };

    const handleAwardClick = (bidId: string, supplierName: string) => {
        setSelectedBid({ bidId, supplierName });
        setShowAwardModal(true);
    };

    const handleConfirmAward = async () => {
        if (!selectedBid || awardingInProgress) return;
        setAwardingInProgress(true);
        try {
            await api.post(`/tenders/${tenderId}/award`, { bid_id: selectedBid.bidId });
            toast.success('Tender awarded successfully!');
            setShowAwardModal(false);
            setSelectedBid(null);
            fetchTenderDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to award tender');
        } finally {
            setAwardingInProgress(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading live auction...</div>;
    if (error) return <div className={styles['tender-alert-error']}>{error}</div>;
    if (!tender) return <div style={{ padding: '40px', textAlign: 'center' }}>Tender not found</div>;

    const currentLowest = tender.current_lowest_bid !== undefined ? tender.current_lowest_bid : tender.start_price;
    const maxAllowedBid = currentLowest - tender.min_decrement;

    return (
        <div className={styles['tender-container']}>
            {/* Live Timer Banner */}
            <div className={styles['timer-banner']}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{tender.title}</h3>
                    <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                        Procurement for {tender.quantity} {tender.unit} · floor price: {convertPrice ? convertPrice(tender.start_price).formatted : `$${tender.start_price}`}
                    </p>
                </div>
                <div>
                    {tender.status === 'active' && !isExpired ? (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Time Remaining</div>
                            <div className={styles['timer-box']}>
                                <span className={styles['timer-unit']}>{timeLeft.days}d</span>
                                <span className={styles['timer-unit']}>{timeLeft.hours}h</span>
                                <span className={styles['timer-unit']}>{timeLeft.minutes}m</span>
                                <span className={styles['timer-unit']}>{timeLeft.seconds}s</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                            Auction {tender.status === 'awarded' ? 'Awarded' : 'Ended'}
                        </div>
                    )}
                </div>
            </div>

            {/* Current Lowest Bid highlighted banner */}
            <div className={styles['lowest-bid-highlight']}>
                <div>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Leading Low Bid</span>
                    <h2 style={{ margin: '4px 0 0', fontSize: '2rem', color: '#ff6600', fontWeight: 900 }}>
                        {convertPrice ? convertPrice(currentLowest).formatted : `$${currentLowest}`}
                    </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Required decrement:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                        {convertPrice ? convertPrice(tender.min_decrement).formatted : `$${tender.min_decrement}`}
                    </div>
                </div>
            </div>

            <div className={styles['tender-row']}>
                {/* Left side: Bids Matrix */}
                <div className={styles['tender-col-7']}>
                    <div className={styles['tender-form-card']} style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 850 }}>Live Bidding Board</h3>
                        
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles['bid-table']}>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Supplier</th>
                                        <th>Bid Price</th>
                                        <th>Est. Delivery</th>
                                        <th>Notes</th>
                                        {role === 'buyer' && tender.status === 'active' && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bids.map((bid, idx) => {
                                        const isWinner = tender.status === 'awarded' && tender.winning_bid_id === bid._id;
                                        return (
                                            <tr key={bid._id} className={isWinner ? styles['winning-row'] : ''}>
                                                <td>
                                                    {isWinner ? (
                                                        <span className={styles['badge-winner']}>Winner</span>
                                                    ) : (
                                                        <strong>#{idx + 1}</strong>
                                                    )}
                                                </td>
                                                <td>
                                                    <strong>{bid.supplier_id?.company_name || 'Verified Supplier'}</strong>
                                                </td>
                                                <td style={{ color: idx === 0 ? '#10b981' : '#0f172a', fontWeight: 'bold' }}>
                                                    {convertPrice ? convertPrice(bid.price_offered).formatted : `$${bid.price_offered}`}
                                                </td>
                                                <td>{bid.delivery_days} days</td>
                                                <td>{bid.notes || '—'}</td>
                                                {role === 'buyer' && tender.status === 'active' && (
                                                    <td>
                                                        <button 
                                                            className={styles['award-btn']}
                                                            onClick={() => handleAwardClick(bid._id, bid.supplier_id?.company_name || 'this supplier')}
                                                        >
                                                            Award Contract
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {bids.length === 0 && (
                                        <tr>
                                            <td colSpan={role === 'buyer' ? 6 : 5} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                                                No bids placed yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles['tender-form-card']} style={{ padding: '20px', marginTop: '20px' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 850 }}>Procurement Specifications</h3>
                        <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{tender.description}</p>
                    </div>
                </div>

                {/* Right side: Place Bid Form (Supplier only) */}
                {role === 'supplier' && (
                    <div className={styles['tender-col-5']}>
                        <div className={styles['tender-form-card']} style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 850 }}>Place Competitive Bid</h3>
                            
                            {tender.status !== 'active' || isExpired ? (
                                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                                    Bidding is closed for this tender.
                                </div>
                            ) : (
                                <form onSubmit={handlePlaceBid}>
                                    <div className={styles['tender-field-group']}>
                                        <label>Price Offered ($) *</label>
                                        <input 
                                            type="number" 
                                            placeholder={`Must be ≤ $${maxAllowedBid}`}
                                            value={priceOffered}
                                            onChange={e => setPriceOffered(e.target.value)}
                                            max={maxAllowedBid}
                                            required 
                                        />
                                        <small style={{ color: '#64748b', marginTop: '2px' }}>
                                            Must beat the current leading bid of ${currentLowest} by at least ${tender.min_decrement}.
                                        </small>
                                    </div>

                                    <div className={styles['tender-field-group']}>
                                        <label>Estimated Delivery Time (days) *</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            placeholder="e.g. 15"
                                            value={deliveryDays}
                                            onChange={e => setDeliveryDays(e.target.value)}
                                            required 
                                        />
                                    </div>

                                    <div className={styles['tender-field-group']}>
                                        <label>Proposal Details / Notes (Optional)</label>
                                        <textarea 
                                            rows={3}
                                            placeholder="Add packaging preferences, material certifications, etc."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        className={styles['tender-btn-submit']}
                                        style={{ width: '100%', marginTop: '12px' }}
                                        disabled={submittingBid}
                                    >
                                        {submittingBid ? 'Submitting Bid...' : 'Submit Bid'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {/* Custom Award Tender Confirmation Modal */}
            {showAwardModal && selectedBid && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '460px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #f1f5f9',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        {/* Award Icon / Badge */}
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#fef3c7',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            marginBottom: '20px'
                        }}>
                            🏆
                        </div>

                        {/* Title */}
                        <h3 style={{
                            margin: '0 0 12px 0',
                            fontSize: '1.25rem',
                            fontWeight: 850,
                            color: '#0f172a'
                        }}>
                            Award Procurement Contract
                        </h3>

                        {/* Warning/Confirmation text */}
                        <p style={{
                            margin: '0 0 28px 0',
                            fontSize: '0.95rem',
                            color: '#475569',
                            lineHeight: 1.6
                        }}>
                            Are you sure you want to award the procurement contract to <strong style={{ color: '#0f172a' }}>{selectedBid.supplierName}</strong>? This decision will finalize the tender bidding process.
                        </p>

                        {/* Actions container */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            width: '100%',
                            justifyContent: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAwardModal(false);
                                    setSelectedBid(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                disabled={awardingInProgress}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAward}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#ff6600',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)'
                                }}
                                disabled={awardingInProgress}
                            >
                                {awardingInProgress ? 'Awarding...' : 'Award Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenderLive;
