import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';

interface UserInfo {
    _id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    email: string;
}

interface ProductInfo {
    _id: string;
    name: string;
    slug: string;
    main_image: string;
}

interface Review {
    _id: string;
    buyer_id: UserInfo;
    supplier_id: UserInfo;
    product_id: ProductInfo;
    rating: number;
    comment: string;
    images?: string[];
    videos?: string[];
    reply_comment?: string;
    reply_date?: string;
    is_hidden: boolean;
    report_count: number;
    report_reasons: string[];
    createdAt: string;
}

const ReviewsManagement: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const { siteSettings, t } = useAuth();
    
    // Filtering and search states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'reported' | 'hidden' | 'active'>('all');
    const [selectedReview, setSelectedReview] = useState<Review | null>(null); // For detail/report modal
    
    // Edit states
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [editRating, setEditRating] = useState<number>(5);
    const [editComment, setEditComment] = useState<string>('');
    const [editReply, setEditReply] = useState<string>('');
    const [editImages, setEditImages] = useState<string[]>([]);
    const [editVideos, setEditVideos] = useState<string[]>([]);
    const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
    const [editLoading, setEditLoading] = useState<boolean>(false);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(siteSettings?.pagination_limit || 10);

    useEffect(() => {
        if (siteSettings?.pagination_limit) {
            setItemsPerPage(siteSettings.pagination_limit);
        }
    }, [siteSettings?.pagination_limit]);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reviews/admin/all');
            setReviews(data || []);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to fetch reviews', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleHide = async (id: string) => {
        try {
            const { data } = await api.put(`/reviews/admin/${id}/toggle-hide`);
            showToast(data.message || 'Review visibility toggled successfully', 'success');
            
            // Update local state
            setReviews(prev => prev.map(r => r._id === id ? { ...r, is_hidden: data.review.is_hidden } : r));
            if (selectedReview && selectedReview._id === id) {
                setSelectedReview(prev => prev ? { ...prev, is_hidden: data.review.is_hidden } : null);
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to toggle review visibility', 'error');
        }
    };

    const handleDeleteReview = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this review? This action will recalculate the product rating and cannot be undone.')) {
            return;
        }
        try {
            await api.delete(`/reviews/admin/${id}`);
            showToast('Review deleted successfully', 'success');
            setReviews(prev => prev.filter(r => r._id !== id));
            setSelectedReview(null);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete review', 'error');
        }
    };

    const handleDeleteReply = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete the supplier\'s reply to this review?')) {
            return;
        }
        try {
            const { data } = await api.delete(`/reviews/admin/${id}/reply`);
            showToast('Supplier reply deleted successfully', 'success');
            
            // Update local state
            setReviews(prev => prev.map(r => r._id === id ? { ...r, reply_comment: undefined, reply_date: undefined } : r));
            if (selectedReview && selectedReview._id === id) {
                setSelectedReview(prev => prev ? { ...prev, reply_comment: undefined, reply_date: undefined } : null);
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete supplier reply', 'error');
        }
    };

    const handleEditClick = (review: Review) => {
        setEditingReview(review);
        setEditRating(review.rating);
        setEditComment(review.comment);
        setEditReply(review.reply_comment || '');
        setEditImages(review.images || []);
        setEditVideos(review.videos || []);
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingMedia(true);
        try {
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('images', file);
            });
            const { data } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const urls = data.urls || (data.url ? [data.url] : []);
            if (isVideo) {
                setEditVideos(prev => [...prev, ...urls]);
            } else {
                setEditImages(prev => [...prev, ...urls]);
            }
            showToast(`Uploaded ${urls.length} ${isVideo ? 'video(s)' : 'image(s)'}`, 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to upload media', 'error');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleRemoveImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveVideo = (index: number) => {
        setEditVideos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveEdit = async () => {
        if (!editingReview) return;
        if (editRating < 1 || editRating > 5) {
            showToast('Rating must be between 1 and 5', 'error');
            return;
        }
        if (!editComment.trim()) {
            showToast('Comment is required', 'error');
            return;
        }

        setEditLoading(true);
        try {
            const { data } = await api.put(`/reviews/admin/${editingReview._id}`, {
                rating: editRating,
                comment: editComment,
                reply_comment: editReply,
                images: editImages,
                videos: editVideos
            });
            showToast(data.message || 'Review updated successfully', 'success');
            
            // Update local state
            setReviews(prev => prev.map(r => r._id === editingReview._id ? data.review : r));
            setEditingReview(null);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update review', 'error');
        } finally {
            setEditLoading(false);
        }
    };

    // Filter Logic
    const filteredReviews = reviews.filter((r) => {
        const product_name = r.product_id?.name || '';
        const buyer_name = `${r.buyer_id?.first_name || ''} ${r.buyer_id?.last_name || ''}`;
        const supplier_name = `${r.supplier_id?.first_name || ''} ${r.supplier_id?.last_name || ''}`;
        const supplier_company = r.supplier_id?.company_name || '';
        
        const matchesSearch =
            product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.comment.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesTab = true;
        if (filterTab === 'reported') {
            matchesTab = r.report_count > 0;
        } else if (filterTab === 'hidden') {
            matchesTab = r.is_hidden === true;
        } else if (filterTab === 'active') {
            matchesTab = !r.is_hidden;
        }

        return matchesSearch && matchesTab;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentReviews = filteredReviews.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

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
        <div className={styles['admin-page']}>
            <div className="admin-page-header">
                <div>
                    <h1 className={styles['admin-page-title']}>Review Management</h1>
                    <p className={styles['admin-page-subtitle']}>Moderate customer reviews, supplier replies, and user reports.</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="admin-stats-grid">
                <div className={styles['admin-stat-premium']}>
                    <div className={styles['admin-stat-card-label']}>Total Reviews</div>
                    <div className={styles['admin-stat-card-value']} style={{ fontSize: '1.75rem' }}>{reviews.length}</div>
                </div>
                <div className={styles['admin-stat-premium']}>
                    <div className={styles['admin-stat-card-label']}>Reported Reviews</div>
                    <div className={styles['admin-stat-card-value']} style={{ fontSize: '1.75rem', color: reviews.some(r => r.report_count > 0) ? '#ef4444' : 'inherit' }}>
                        {reviews.filter(r => r.report_count > 0).length}
                    </div>
                </div>
                <div className={styles['admin-stat-premium']}>
                    <div className={styles['admin-stat-card-label']}>Hidden Reviews</div>
                    <div className={styles['admin-stat-card-value']} style={{ fontSize: '1.75rem' }}>{reviews.filter(r => r.is_hidden).length}</div>
                </div>
                <div className={styles['admin-stat-premium']}>
                    <div className={styles['admin-stat-card-label']}>Replied Reviews</div>
                    <div className={styles['admin-stat-card-value']} style={{ fontSize: '1.75rem' }}>{reviews.filter(r => r.reply_comment).length}</div>
                </div>
            </div>

            {/* Main Table Content Card */}
            <div className={styles['admin-card']} style={{ marginBottom: '24px' }}>
                {/* Filters and Search Bar */}
                <div style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                        <button
                            className={`${styles['admin-btn']} ${filterTab === 'all' ? styles['admin-btn-primary'] : styles['admin-btn-secondary']}`}
                            onClick={() => { setFilterTab('all'); setCurrentPage(1); }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            All Reviews
                        </button>
                        <button
                            className={`${styles['admin-btn']} ${filterTab === 'reported' ? styles['admin-btn-primary'] : styles['admin-btn-secondary']}`}
                            onClick={() => { setFilterTab('reported'); setCurrentPage(1); }}
                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: filterTab === 'reported' ? '#ef4444' : undefined }}
                        >
                            Reported {reviews.filter(r => r.report_count > 0).length > 0 && `(${reviews.filter(r => r.report_count > 0).length})`}
                        </button>
                        <button
                            className={`${styles['admin-btn']} ${filterTab === 'hidden' ? styles['admin-btn-primary'] : styles['admin-btn-secondary']}`}
                            onClick={() => { setFilterTab('hidden'); setCurrentPage(1); }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            Hidden
                        </button>
                        <button
                            className={`${styles['admin-btn']} ${filterTab === 'active' ? styles['admin-btn-primary'] : styles['admin-btn-secondary']}`}
                            onClick={() => { setFilterTab('active'); setCurrentPage(1); }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            Active
                        </button>
                    </div>

                    {/* Search */}
                    <div className={styles['admin-search-wrap']} style={{ width: '300px' }}>
                        <svg className={styles['admin-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            className={styles['admin-search-input-premium']}
                            placeholder="Search product, author, comment..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--admin-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-admin-main" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Showing {filteredReviews.length} of {reviews.length} reviews
                    </span>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles['admin-table']}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Rating & Comment</th>
                                <th>Buyer (Author)</th>
                                <th>Supplier</th>
                                <th>Flags</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                border: '3px solid #e2e8f0',
                                                borderTop: '3px solid var(--primary-color, #ff6a00)',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Fetching review records...</span>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentReviews.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No reviews found matching the filters.</td>
                                </tr>
                            ) : (
                                currentReviews.map((review) => (
                                    <tr key={review._id}>
                                        {/* Product */}
                                        <td style={{ maxWidth: '200px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                                    {review.product_id?.main_image ? (
                                                        <img src={getImgUrl(review.product_id.main_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>No Img</div>
                                                    )}
                                                </div>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {review.product_id?.name || 'Unknown Product'}
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                                                        ID: {review.product_id?._id?.slice(-6) || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Rating & Comment */}
                                        <td style={{ maxWidth: '280px' }}>
                                            <div style={{ marginBottom: '4px' }}>{renderStars(review.rating)}</div>
                                            <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--admin-text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }} title={review.comment}>
                                                "{review.comment}"
                                            </div>
                                            {((review.images && review.images.length > 0) || (review.videos && review.videos.length > 0)) && (
                                                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {review.images?.slice(0, 3).map((img, i) => (
                                                        <img key={i} src={getImgUrl(img)} alt="" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                    ))}
                                                    {review.images && review.images.length > 3 && (
                                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>+{review.images.length - 3}</span>
                                                    )}
                                                    {review.videos && review.videos.length > 0 && (
                                                        <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                            🎥 {review.videos.length} video{review.videos.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {review.reply_comment && (
                                                <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--primary-color)', fontSize: '11px', color: 'var(--admin-text-secondary)', background: 'rgba(13, 46, 103, 0.03)', padding: '4px 8px', borderRadius: '0 4px 4px 0' }}>
                                                    <strong>Supplier Reply:</strong> "{review.reply_comment}"
                                                    <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                                                        {review.reply_date ? new Date(review.reply_date).toLocaleDateString() : ''}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Buyer */}
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: '12.5px' }}>
                                                {review.buyer_id ? `${review.buyer_id.first_name} ${review.buyer_id.last_name}` : 'Deleted User'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                                                {review.buyer_id?.email}
                                            </div>
                                        </td>

                                        {/* Supplier */}
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: '12.5px' }}>
                                                {review.supplier_id?.company_name || 'Deleted Supplier'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                                                {review.supplier_id ? `${review.supplier_id.first_name} ${review.supplier_id.last_name}` : ''}
                                            </div>
                                        </td>

                                        {/* Flags */}
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {review.is_hidden && (
                                                    <span className={styles['admin-badge']} style={{ background: '#64748b', color: '#fff', fontSize: '9.5px', alignSelf: 'flex-start' }}>
                                                        Hidden
                                                    </span>
                                                )}
                                                {review.report_count > 0 ? (
                                                    <button 
                                                        onClick={() => setSelectedReview(review)}
                                                        className={styles['admin-badge']} 
                                                        style={{ background: '#ef4444', color: '#fff', fontSize: '9.5px', alignSelf: 'flex-start', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        {review.report_count} Reports ⓘ
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clean</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <button 
                                                    onClick={() => handleEditClick(review)} 
                                                    className="admin-action-btn-edit"
                                                    style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #dbeafe', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleHide(review._id)} 
                                                    className="admin-action-btn-edit"
                                                    style={review.is_hidden ? { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700' } : { background: '#fffbeb', color: '#d97706', border: '1.5px solid #fef3c7', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                                                >
                                                    {review.is_hidden ? 'Show' : 'Hide'}
                                                </button>
                                                
                                                {review.reply_comment && (
                                                    <button 
                                                        onClick={() => handleDeleteReply(review._id)} 
                                                        className="admin-action-btn-delete"
                                                        style={{ background: '#f8fafc', color: '#64748b', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                                                    >
                                                        Del Reply
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleDeleteReview(review._id)} 
                                                    className="admin-action-btn-delete"
                                                    style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles['admin-pagination-footer']}>
                        <span className={styles['admin-pagination-info']}>
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReviews.length)} of {filteredReviews.length} records
                        </span>
                        <div className={styles['admin-pagination-controls']}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['admin-pagination-btn-arrow']}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="text-admin-main" style={{ fontSize: '12px', fontWeight: 800 }}>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['admin-pagination-btn-arrow']}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Review Reports Detail Modal */}
            {selectedReview && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '500px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3 style={{ color: '#ef4444' }}>Report Details ({selectedReview.report_count} Reports)</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setSelectedReview(null)}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Original Review:</div>
                                <div style={{ fontSize: '12.5px', fontStyle: 'italic' }}>"{selectedReview.comment}"</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    By {selectedReview.buyer_id ? `${selectedReview.buyer_id.first_name} ${selectedReview.buyer_id.last_name}` : 'Deleted user'}
                                </div>
                            </div>
                            
                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>Reasons Logged:</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedReview.report_reasons && selectedReview.report_reasons.length > 0 ? (
                                    selectedReview.report_reasons.map((reason, index) => (
                                        <div 
                                            key={index} 
                                            style={{ 
                                                fontSize: '12px', 
                                                padding: '8px 12px', 
                                                background: '#fef2f2', 
                                                color: '#991b1b', 
                                                border: '1.5px solid #fee2e2', 
                                                borderRadius: '6px',
                                                fontWeight: 600
                                            }}
                                        >
                                            {index + 1}. {reason}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>
                                        No explicit reason given.
                                    </div>
                                )}
                            </div>

                            <div className={styles['admin-form-actions']} style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <button 
                                    type="button" 
                                    className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`} 
                                    onClick={() => setSelectedReview(null)}
                                >
                                    Close
                                </button>
                                <button 
                                    type="button" 
                                    className={`${styles['admin-btn']}`} 
                                    style={{ background: selectedReview.is_hidden ? '#22c55e' : '#f97316', color: '#fff', border: 'none' }}
                                    onClick={() => handleToggleHide(selectedReview._id)}
                                >
                                    {selectedReview.is_hidden ? 'Make Visible' : 'Hide Review'}
                                </button>
                                <button 
                                    type="button" 
                                    className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`} 
                                    style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => handleDeleteReview(selectedReview._id)}
                                >
                                    Delete Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Review Modal */}
            {editingReview && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '500px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3 style={{ color: 'var(--primary-color)' }}>Edit Review</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setEditingReview(null)}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--admin-text-main)' }}>
                                    Rating (1-5 stars)
                                </label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setEditRating(star)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: star <= editRating ? '#fbbf24' : '#e2e8f0',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <svg
                                                width="28"
                                                height="28"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                    <span style={{ fontSize: '13px', fontWeight: 700, marginLeft: '4px', color: 'var(--admin-text-secondary)' }}>
                                        {editRating} Star{editRating > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--admin-text-main)' }}>
                                    Review Comment
                                </label>
                                <textarea
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1.5px solid var(--admin-border-subtle)',
                                        fontSize: '13px',
                                        fontFamily: 'inherit',
                                        background: 'var(--admin-card-bg)',
                                        color: 'var(--admin-text-main)',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Type review comment here..."
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--admin-text-main)' }}>
                                    Supplier Reply Comment
                                </label>
                                <textarea
                                    value={editReply}
                                    onChange={(e) => setEditReply(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1.5px solid var(--admin-border-subtle)',
                                        fontSize: '13px',
                                        fontFamily: 'inherit',
                                        background: 'var(--admin-card-bg)',
                                        color: 'var(--admin-text-main)',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Type supplier reply comment here (optional)..."
                                />
                            </div>

                            {/* Review Media (Images & Videos) Section */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                                    Review Media (Images & Videos)
                                </label>
                                
                                {/* Upload Buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    <label className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', margin: 0 }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        {uploadingMedia ? 'Uploading...' : 'Add Images'}
                                        <input type="file" hidden accept="image/*" multiple onChange={(e) => handleMediaUpload(e, false)} disabled={uploadingMedia} />
                                    </label>

                                    <label className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', margin: 0 }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                                        {uploadingMedia ? 'Uploading...' : 'Add Video'}
                                        <input type="file" hidden accept="video/*" multiple onChange={(e) => handleMediaUpload(e, true)} disabled={uploadingMedia} />
                                    </label>
                                </div>

                                {/* Images Preview List */}
                                {editImages.length > 0 && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Uploaded Images ({editImages.length})</span>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {editImages.map((imgUrl, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                    <img src={getImgUrl(imgUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button type="button" onClick={() => handleRemoveImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Videos Preview List */}
                                {editVideos.length > 0 && (
                                    <div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Uploaded Videos ({editVideos.length})</span>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {editVideos.map((vidUrl, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '120px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
                                                    <video src={getImgUrl(vidUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                                                    <button type="button" onClick={() => handleRemoveVideo(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles['admin-form-actions']} style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}
                                    onClick={() => setEditingReview(null)}
                                    disabled={editLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`${styles['admin-btn']} ${styles['admin-btn-primary']}`}
                                    onClick={handleSaveEdit}
                                    disabled={editLoading}
                                >
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsManagement;
