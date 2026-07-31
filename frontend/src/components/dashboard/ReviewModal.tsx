import React, { useState } from 'react';
import { createReview } from '@/services/reviewApi';
import { useToast } from '@/context/ToastContext';
import styles from './ReviewModal.module.css';
import api from '@/services/axiosConfig';
import { getImgUrl } from '@/utils/imageConfig';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    orderId: string;
}

const ratingLabels: { [key: number]: string } = {
    1: 'Terrible',
    2: 'Poor',
    3: 'Fair',
    4: 'Good',
    5: 'Excellent!'
};

const ReviewModal = ({ isOpen, onClose, product, orderId }: ReviewModalProps) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadMediaFiles(Array.from(e.dataTransfer.files));
        }
    };

    const uploadMediaFiles = async (files: File[]) => {
        setUploading(true);
        setError('');
        
        for (const file of files) {
            const formData = new FormData();
            formData.append('media', file);
            try {
                const { data } = await api.post('/reviews/upload-media', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                if (data.success && data.url) {
                    const isVideo = file.type.startsWith('video') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);
                    if (isVideo) {
                        setVideos(prev => [...prev, data.url]);
                    } else {
                        setImages(prev => [...prev, data.url]);
                    }
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to upload media');
            }
        }
        setUploading(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        await uploadMediaFiles(files);
    };

    const handleRemoveImage = (idx: number) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRemoveVideo = (idx: number) => {
        setVideos(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await createReview({
                product_id: typeof product.product_id === 'object' && product.product_id !== null
                    ? (product.product_id._id || product.product_id)
                    : (product.product_id || product._id),
                order_id: orderId,
                rating,
                comment,
                images,
                videos
            });
            showToast('Review submitted successfully!', 'success');
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const activeRating = hoverRating || rating;

    return (
        <div className={styles['review-modal-overlay']}>
            <div className={styles['review-modal-content']}>
                <div className={styles['review-modal-header']}>
                    <div>
                        <h3 className={styles['modal-title']}>Share Your Thoughts</h3>
                        <p className={styles['modal-subtitle']}>Your feedback helps millions of buyers make better choices.</p>
                    </div>
                    <button className={styles['close-btn']} onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </div>

                <div className={styles['review-product-info']}>
                    <img src={getImgUrl(product.image)} alt={product.name} className={styles['product-img']} />
                    <div className={styles['product-details']}>
                        <span className={styles['verified-badge']}>Verified Purchase</span>
                        <h4 className={styles['product-name']}>{product.name}</h4>
                    </div>
                </div>

                {error && <div className={styles['review-error']}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles['review-form']}>
                    <div className={styles['form-group']}>
                        <label className={styles['form-label']}>Overall Rating</label>
                        <div className={styles['rating-container']}>
                            <div className={styles['star-rating']}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        type="button"
                                        key={star}
                                        className={`${styles.star} ${star <= activeRating ? styles.filled : ''}`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(null)}
                                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <span className={`${styles['rating-description']} ${styles[`rating-${activeRating}`]}`}>
                                {ratingLabels[activeRating]}
                            </span>
                        </div>
                    </div>

                    <div className={styles['form-group']}>
                        <label className={styles['form-label']}>Your Review</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us what you liked or disliked about this product. Your honest review is highly appreciated..."
                            required
                            rows={4}
                            className={styles['textarea-input']}
                        />
                    </div>

                    {/* Media Upload Area */}
                    <div className={styles['media-upload-section']}>
                        <label className={styles['form-label']}>Add Photos or Video</label>
                        <div 
                            className={`${styles['upload-zone']} ${isDragActive ? styles['upload-zone-active'] : ''}`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => {
                                const fileInput = document.getElementById('review-file-input');
                                if (fileInput) fileInput.click();
                            }}
                        >
                            <span className={styles['upload-text']}>
                                Drag & drop files here, or <span className={styles['browse-link']}>browse</span>
                            </span>
                            <span className={styles['upload-subtext']}>Supports JPG, PNG, MP4. Max 10MB per file.</span>
                            <input 
                                id="review-file-input"
                                type="file" 
                                accept="image/*,video/*" 
                                multiple 
                                style={{ display: 'none' }} 
                                onChange={handleFileChange}
                                disabled={uploading || submitting}
                            />
                        </div>

                        {uploading && (
                            <div className={styles['upload-spinner']}>
                                <div className={styles['mini-spinner']}></div>
                                <span>Uploading media...</span>
                            </div>
                        )}

                        {(images.length > 0 || videos.length > 0) && (
                            <div className={styles['media-previews']}>
                                {images.map((img, i) => (
                                    <div key={`img-${i}`} className={styles['preview-card']}>
                                        <img src={getImgUrl(img)} alt="review preview" />
                                        <button 
                                            type="button" 
                                            className={styles['remove-media-btn']}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage(i);
                                            }}
                                            aria-label="Remove image"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                                {videos.map((vid, i) => (
                                    <div key={`vid-${i}`} className={styles['preview-card']}>
                                        <video src={getImgUrl(vid)} />
                                        <div className={styles['video-badge']}>▶</div>
                                        <button 
                                            type="button" 
                                            className={styles['remove-media-btn']}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveVideo(i);
                                            }}
                                            aria-label="Remove video"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles['review-modal-actions']}>
                        <button type="button" className={styles['cancel-btn']} onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className={styles['submit-btn']} disabled={submitting || uploading}>
                            {submitting ? (
                                <div className={styles['btn-spinner-container']}>
                                    <div className={styles['btn-spinner']}></div>
                                    <span>Submitting...</span>
                                </div>
                            ) : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
