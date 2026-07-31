import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface BuyerInfo {
    _id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
}

interface ProductInfo {
    _id: string;
    name: string;
    slug: string;
    main_image: string;
}

interface Review {
    _id: string;
    buyer_id: BuyerInfo;
    product_id: ProductInfo;
    rating: number;
    comment: string;
    reply_comment?: string;
    reply_date?: string;
    is_hidden: boolean;
    createdAt: string;
}

const SupplierReviews: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
    const [replyTexts, setReplyTexts] = useState<{ [reviewId: string]: string }>({});
    const [editingReplyIds, setEditingReplyIds] = useState<{ [reviewId: string]: boolean }>({});
    
    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

    const { showToast } = useToast();
    const { t } = useAuth();

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reviews/supplier/my-products');
            setReviews(data || []);
            
            // Initialize reply inputs with existing replies
            const initialTexts: { [key: string]: string } = {};
            data.forEach((r: Review) => {
                if (r.reply_comment) {
                    initialTexts[r._id] = r.reply_comment;
                }
            });
            setReplyTexts(initialTexts);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to fetch reviews', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async (reviewId: string) => {
        const replyText = replyTexts[reviewId]?.trim();
        if (!replyText) {
            showToast('Reply comment cannot be empty', 'error');
            return;
        }

        setSubmittingReplyId(reviewId);
        try {
            const { data } = await api.put(`/reviews/${reviewId}/reply`, { reply_comment: replyText });
            showToast('Reply submitted successfully!', 'success');
            
            // Update local review state
            setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, reply_comment: data.reply_comment, reply_date: data.reply_date } : r));
            setEditingReplyIds(prev => ({ ...prev, [reviewId]: false }));
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to submit reply', 'error');
        } finally {
            setSubmittingReplyId(null);
        }
    };

    const handleEditToggle = (reviewId: string) => {
        setEditingReplyIds(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
    };

    const handleReplyChange = (reviewId: string, val: string) => {
        setReplyTexts(prev => ({ ...prev, [reviewId]: val }));
    };

    // Calculate rating statistics
    const totalCount = reviews.length;
    const averageRating = totalCount > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1)
        : '0.0';

    const starCounts = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) {
            starCounts[r.rating - 1]++;
        }
    });

    // Filtered reviews list
    const filteredReviews = reviews.filter(r => {
        const product_name = r.product_id?.name || '';
        const buyer_name = `${r.buyer_id?.first_name || ''} ${r.buyer_id?.last_name || ''}`;
        const matchesSearch = 
            product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.comment.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRating = ratingFilter === 'all' ? true : r.rating === ratingFilter;

        return matchesSearch && matchesRating;
    });

    const renderStars = (rating: number) => {
        return (
            <div style={{ display: 'flex', gap: '2px', color: '#fbbf24' }}>
                {Array.from({ length: 5 }).map((_, idx) => (
                    <svg
                        key={idx}
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill={idx < rating ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="dashboard-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'inherit' }}>
            
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
                        {t('customer_reviews') || 'Customer Reviews'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                        {t('customer_reviews_desc') || 'Browse feedback from buyers and submit official supplier responses.'}
                    </p>
                </div>
            </div>

            {/* Stats Cards Section */}
            {totalCount > 0 && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 2fr', 
                    gap: '20px', 
                    background: '#fff', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1.5px solid #e8edf5',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                    {/* Left: Avg Rating */}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRight: '1.5px solid #f1f5f9',
                        paddingRight: '20px'
                    }}>
                        <div style={{ fontSize: '48px', fontWeight: '950', color: 'var(--primary-color)' }}>{averageRating}</div>
                        <div style={{ margin: '8px 0' }}>{renderStars(Math.round(parseFloat(averageRating)))}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Based on {totalCount} reviews</div>
                    </div>

                    {/* Right: Distribution Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                        {[5, 4, 3, 2, 1].map((stars) => {
                            const count = starCounts[stars - 1];
                            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                            return (
                                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                                    <span style={{ minWidth: '45px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {stars} Star
                                    </span>
                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${percentage}%`, height: '100%', background: '#fbbf24', borderRadius: '4px' }}></div>
                                    </div>
                                    <span style={{ minWidth: '30px', textAlign: 'right', fontWeight: '700', color: '#64748b' }}>
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filter and Search controls */}
            <div style={{ 
                background: '#fff', 
                borderRadius: '16px', 
                border: '1.5px solid #e8edf5', 
                padding: '16px 20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search product name, buyer or keyword..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 16px 0 42px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '13.5px',
                            fontWeight: '600',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                </div>

                {/* Rating filter dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Rating:</span>
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        style={{
                            height: '42px',
                            padding: '0 32px 0 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '13.5px',
                            fontWeight: '700',
                            color: '#1e293b',
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '12px',
                            backgroundColor: '#fff'
                        }}
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Star Reviews</option>
                        <option value="4">4 Star Reviews</option>
                        <option value="3">3 Star Reviews</option>
                        <option value="2">2 Star Reviews</option>
                        <option value="1">1 Star Reviews</option>
                    </select>
                </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', border: '3px solid #f1f5f9', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ color: '#64748b', fontSize: '13.5px', fontWeight: '600' }}>Fetching product reviews...</p>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1.5px solid #e8edf5', color: '#94a3b8' }}>
                        <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{ marginBottom: '12px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.151-.316.57-.316.72 0l1.547 3.24a1 1 0 00.757.545l3.568.513c.348.05.485.474.233.717l-2.58 2.516a1 1 0 00-.27.837l.609 3.552c.06.347-.306.611-.612.448l-3.192-1.682a1 1 0 00-.946 0l-3.192 1.682c-.306.163-.672-.101-.612-.448l.609-3.552a1 1 0 00-.27-.837L3.09 9.022c-.252-.243-.115-.668.233-.717l3.568-.513a1 1 0 00.758-.545l1.546-3.24z" /></svg>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>No reviews found matching the filters.</p>
                    </div>
                ) : (
                    filteredReviews.map((review) => {
                        const hasReply = !!review.reply_comment;
                        const isEditing = editingReplyIds[review._id] || !hasReply;
                        const characterLimit = 500;
                        const textLength = replyTexts[review._id]?.length || 0;

                        return (
                            <div 
                                key={review._id} 
                                style={{ 
                                    background: '#fff', 
                                    borderRadius: '16px', 
                                    border: '1.5px solid #e8edf5', 
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    position: 'relative',
                                    opacity: review.is_hidden ? 0.6 : 1
                                }}
                            >
                                {/* Review header: Product info & rating */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                            {review.product_id?.main_image ? (
                                                <img src={getImgUrl(review.product_id.main_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>No Img</div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {review.product_id?.name || 'Unknown Product'}
                                            </h4>
                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                                By: {review.buyer_id ? `${review.buyer_id.first_name} ${review.buyer_id.last_name}` : 'Deleted User'} 
                                                {review.buyer_id?.company_name ? ` (${review.buyer_id.company_name})` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        {renderStars(review.rating)}
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Review comment */}
                                <div style={{ 
                                    fontSize: '13.5px', 
                                    lineHeight: '1.6', 
                                    color: '#334155', 
                                    fontWeight: '500', 
                                    padding: '12px 16px', 
                                    background: '#f8fafc', 
                                    borderRadius: '10px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    "{review.comment}"
                                    {review.is_hidden && (
                                        <span style={{ marginLeft: '10px', fontSize: '10px', background: '#64748b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                            Hidden by Admin
                                        </span>
                                    )}
                                </div>

                                {/* Supplier Reply Container */}
                                {hasReply && !editingReplyIds[review._id] && (
                                    <div style={{ 
                                        padding: '16px', 
                                        borderRadius: '12px', 
                                        background: 'rgba(13,46,103,0.03)', 
                                        border: '1.5px dashed rgba(13,46,103,0.15)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: '900', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                Supplier Response
                                            </span>
                                            <button 
                                                onClick={() => handleEditToggle(review._id)}
                                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                Edit Reply
                                            </button>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#475569', fontWeight: '600' }}>
                                            "{review.reply_comment}"
                                        </p>
                                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', alignSelf: 'flex-start', marginTop: '2px' }}>
                                            Posted on {review.reply_date ? new Date(review.reply_date).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                )}

                                {/* Reply Input Form (shown if editing or no reply exists yet) */}
                                {isEditing && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#475569' }}>
                                                {hasReply ? 'Edit your reply:' : 'Reply to this review:'}
                                            </label>
                                            <span style={{ fontSize: '11px', color: textLength > characterLimit ? '#ef4444' : '#94a3b8', fontWeight: '700' }}>
                                                {textLength} / {characterLimit}
                                            </span>
                                        </div>
                                        <textarea
                                            placeholder="Write your professional response here..."
                                            value={replyTexts[review._id] || ''}
                                            onChange={(e) => handleReplyChange(review._id, e.target.value.slice(0, characterLimit))}
                                            style={{
                                                width: '100%',
                                                height: '90px',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #e2e8f0',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                outline: 'none',
                                                resize: 'none',
                                                fontFamily: 'inherit',
                                                lineHeight: '1.5',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                                            {hasReply && (
                                                <button
                                                    onClick={() => handleEditToggle(review._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '10px',
                                                        border: '1.5px solid #e2e8f0',
                                                        background: '#fff',
                                                        color: '#475569',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleReplySubmit(review._id)}
                                                disabled={submittingReplyId === review._id}
                                                style={{
                                                    padding: '8px 18px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'var(--primary-color)',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 10px rgba(13,46,103,0.1)'
                                                }}
                                            >
                                                {submittingReplyId === review._id ? (
                                                    <>
                                                        <div style={{ width: '12px', height: '12px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    hasReply ? 'Update Reply' : 'Submit Reply'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SupplierReviews;
