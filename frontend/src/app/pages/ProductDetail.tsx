'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { fetchProductById } from '@/services/productApi';
import { toggleWishlist, getWishlist } from '@/services/wishlistApi';
import { getProductReviews } from '@/services/reviewApi';
import BookingDrawer from '@/components/checkout/BookingDrawer';
import CustomizationModal from '@/components/products/CustomizationModal';
import GeneralEnquiryModal from '@/components/products/GeneralEnquiryModal';
import api from '@/services/axiosConfig';
import styles from './ProductDetail.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

import { getImgUrl } from '@/utils/imageConfig';

import { useChat } from '@/context/ChatContext';

// ─── 3D Product Viewer (Three.js) ───────────────────────────────────────────
const Product3DViewer = ({ product, onClose }: { product: any; onClose: () => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState('#ff6600');

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#f8fafc');

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 8);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.xr.enabled = true;
        
        // Clear previous canvas
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);

        // Add AR Button
        const arButton = ARButton.createButton(renderer, { requiredFeatures: ['local'] });
        containerRef.current.appendChild(arButton);

        // Lighting
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const pointLight = new THREE.PointLight('#ff6600', 0.5, 10);
        pointLight.position.set(-3, -3, 3);
        scene.add(pointLight);

        let customModel: THREE.Group | null = null;
        let defaultCrate: THREE.Mesh | null = null;
        let ringMesh: THREE.Mesh | null = null;

        const renderProceduralBox = () => {
            const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.3,
                metalness: 0.8,
                wireframe: false
            });

            defaultCrate = new THREE.Mesh(geometry, material);
            defaultCrate.castShadow = true;
            defaultCrate.receiveShadow = true;
            scene.add(defaultCrate);

            const ringGeo = new THREE.TorusGeometry(0.8, 0.15, 16, 100);
            const ringMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 1 });
            ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.position.set(0, 0, 1.3); // Place it on the front face of the box
            scene.add(ringMesh);
        };

        if (product && product.three_d_model) {
            const loader = new GLTFLoader();
            const modelUrl = getImgUrl(product.three_d_model);
            
            loader.load(
                modelUrl,
                (gltf) => {
                    customModel = gltf.scene;
                    
                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(customModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 0) {
                        const scale = 3.2 / maxDim;
                        customModel.scale.set(scale, scale, scale);
                    }
                    
                    // Center the model's pivot
                    customModel.position.sub(center.multiplyScalar(customModel.scale.x));
                    
                    // Enable shadows and apply customizer color
                    customModel.traverse((child: any) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach((mat: any) => {
                                        if (mat.color) mat.color.set(color);
                                    });
                                } else if (child.material.color) {
                                    child.material.color.set(color);
                                }
                            }
                        }
                    });
                    
                    scene.add(customModel);
                },
                undefined,
                (error) => {
                    console.error('Error loading custom 3D model, falling back to procedural model:', error);
                    renderProceduralBox();
                }
            );
        } else {
            renderProceduralBox();
        }

        // Interaction state for simple rotation dragging (both mouse and touch)
        let isDragging = false;
        let isTouching = false;
        let lastTouchX = 0;
        let lastTouchY = 0;

        const handleMouseDown = () => {
            isDragging = true;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Use robust movementX/movementY to prevent snapping and jumps
                const deltaRotationQuaternion = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(
                        (e.movementY * 0.005),
                        (e.movementX * 0.005),
                        0,
                        'XYZ'
                    ));
                
                if (customModel) {
                    customModel.quaternion.multiplyQuaternions(deltaRotationQuaternion, customModel.quaternion);
                }
                if (defaultCrate) {
                    defaultCrate.quaternion.multiplyQuaternions(deltaRotationQuaternion, defaultCrate.quaternion);
                }
                if (ringMesh) {
                    ringMesh.quaternion.multiplyQuaternions(deltaRotationQuaternion, ringMesh.quaternion);
                }
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                isTouching = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isTouching && e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchX - lastTouchX;
                const deltaY = touchY - lastTouchY;

                const deltaRotationQuaternion = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(
                        (deltaY * 0.005),
                        (deltaX * 0.005),
                        0,
                        'XYZ'
                    ));

                if (customModel) {
                    customModel.quaternion.multiplyQuaternions(deltaRotationQuaternion, customModel.quaternion);
                }
                if (defaultCrate) {
                    defaultCrate.quaternion.multiplyQuaternions(deltaRotationQuaternion, defaultCrate.quaternion);
                }
                if (ringMesh) {
                    ringMesh.quaternion.multiplyQuaternions(deltaRotationQuaternion, ringMesh.quaternion);
                }

                lastTouchX = touchX;
                lastTouchY = touchY;
            }
        };

        const handleTouchEnd = () => {
            isTouching = false;
        };

        const canvasElement = renderer.domElement;
        canvasElement.addEventListener('mousedown', handleMouseDown);
        canvasElement.addEventListener('mousemove', handleMouseMove);
        canvasElement.addEventListener('touchstart', handleTouchStart);
        canvasElement.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleTouchEnd);

        // Zoom via wheel
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            camera.position.z = Math.min(Math.max(camera.position.z + e.deltaY * 0.01, 3), 15);
        };
        canvasElement.addEventListener('wheel', handleWheel, { passive: false });

        // Animation Loop
        const animate = () => {
            // Auto rotate slowly when not dragging/touching
            if (!isDragging && !isTouching) {
                if (customModel) {
                    customModel.rotation.y += 0.005;
                }
                if (defaultCrate) {
                    defaultCrate.rotation.y += 0.005;
                    defaultCrate.rotation.x += 0.002;
                }
                if (ringMesh) {
                    ringMesh.rotation.y += 0.005;
                    ringMesh.rotation.x += 0.002;
                }
            }
            
            renderer.render(scene, camera);
        };
        renderer.setAnimationLoop(animate);

        // Resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            renderer.setAnimationLoop(null);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleTouchEnd);
            canvasElement.removeEventListener('mousedown', handleMouseDown);
            canvasElement.removeEventListener('mousemove', handleMouseMove);
            canvasElement.removeEventListener('touchstart', handleTouchStart);
            canvasElement.removeEventListener('touchmove', handleTouchMove);
            canvasElement.removeEventListener('wheel', handleWheel);
            renderer.dispose();
        };
    }, [color, product]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div ref={containerRef} style={{ flex: 1, minHeight: '300px', cursor: 'grab' }} />
            
            {/* 3D Customizer Overlay */}
            <div style={{
                position: 'absolute', bottom: '15px', left: '15px', right: '15px',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(5px)',
                padding: '10px 15px', borderRadius: '12px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                        {product && product.three_d_model ? 'Customize Color:' : 'Crate Color:'}
                    </span>
                    {['#ff6600', '#0d2e67', '#10b981', '#3b82f6', '#1e293b'].map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                backgroundColor: c, border: color === c ? '2px solid #fff' : 'none',
                                boxShadow: color === c ? '0 0 0 2px #ff6600' : '0 1px 3px rgba(0,0,0,0.2)',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: 'bold',
                        background: '#ef4444', color: '#fff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer'
                    }}
                >
                    Exit 3D
                </button>
            </div>
            
            {/* Guide overlay */}
            <div style={{
                position: 'absolute', top: '15px', left: '15px',
                pointerEvents: 'none', background: 'rgba(15,23,42,0.6)',
                color: '#fff', padding: '4px 8px', borderRadius: '6px',
                fontSize: '10px', fontWeight: '600'
            }}>
                🖱️ Drag to Rotate | 📜 Scroll to Zoom
            </div>
        </div>
    );
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
const SkeletonLoader = () => (
    <div className={styles['pd-skeleton-wrap']}>
        <div className={styles['pd-skeleton-breadcrumb']} />
        <div className={styles['pd-skeleton-layout']}>
            {/* 1. Left Column: Gallery */}
            <div className={styles['pd-skeleton-left']}>
                <div className={styles['pd-skeleton-thumbs']}>
                    {[...Array(4)].map((_, i) => <div key={i} className={styles['pd-skel-thumb']} />)}
                </div>
                <div className={styles['pd-skel-main-img']} />
            </div>

            {/* 2. Middle Column: Product Details Info */}
            <div className={styles['pd-skeleton-middle']}>
                {/* Title */}
                <div className={styles['pd-skel-line'] + " " + styles['w90'] + " " + styles['h24']} />
                <div className={styles['pd-skel-line'] + " " + styles['w70'] + " " + styles['h24']} />
                
                {/* Meta stars & sold */}
                <div className={styles['pd-skel-line'] + " " + styles['w40'] + " " + styles['mt16']} />
                
                {/* Price block */}
                <div className={styles['pd-skel-price-block']} />
                
                {/* Promo banner */}
                <div className={styles['pd-skel-promo-banner']} />
                
                {/* Variants */}
                <div className={styles['pd-skel-variant-group']}>
                    <div className={styles['pd-skel-line'] + " " + styles['w20']} />
                    <div className={styles['pd-skel-variant-boxes']}>
                        {[...Array(3)].map((_, i) => <div key={i} className={styles['pd-skel-variant-box']} />)}
                    </div>
                </div>
                <div className={styles['pd-skel-variant-group']}>
                    <div className={styles['pd-skel-line'] + " " + styles['w20']} />
                    <div className={styles['pd-skel-variant-boxes']}>
                        {[...Array(5)].map((_, i) => <div key={i} className={styles['pd-skel-variant-box']} />)}
                    </div>
                </div>
            </div>

            {/* 3. Right Column: Sidebar Purchase Card */}
            <div className={styles['pd-skeleton-sidebar']}>
                {/* Sold by */}
                <div className={styles['pd-skel-line'] + " " + styles['w60']} style={{ marginBottom: '16px' }} />
                
                {/* Commitments block */}
                <div className={styles['pd-skel-commitments-block']} />
                
                {/* Quantity */}
                <div className={styles['pd-skel-line'] + " " + styles['w30']} style={{ marginTop: '20px', marginBottom: '8px' }} />
                <div className={styles['pd-skel-qty-control']} />
                
                {/* Action buttons */}
                <div className={styles['pd-skel-btn-large']} />
                <div className={styles['pd-skel-btn-large']} />
            </div>
        </div>
    </div>
);

// ─── Star Rating Display ──────────────────────────────────────────────────────
interface StarRatingProps {
    rating?: number | string;
    size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating = 0, size = 16 }) => {
    const numericRating = Number(rating) || 0;
    const full = Math.floor(numericRating);
    const half = numericRating % 1 >= 0.5;
    return (
        <span className={styles['pd-stars']}>
            {[...Array(5)].map((_, i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? '#f59e0b' : (i === full && half ? 'url(#half)' : '#e5e7eb')}>
                    <defs>
                        <linearGradient id="half"><stop offset="50%" stopColor="#f59e0b" /><stop offset="50%" stopColor="#e5e7eb" /></linearGradient>
                    </defs>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </span>
    );
};

// ─── Rating Bar ───────────────────────────────────────────────────────────────
interface RatingBarProps {
    label: string;
    count: number;
    total: number;
}

const RatingBar: React.FC<RatingBarProps> = ({ label, count, total }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className={styles['pd-rating-bar-row']}>
            <span className={styles['pd-rating-bar-label']}>{label}</span>
            <div className={styles['pd-rating-bar-track']}><div className={styles['pd-rating-bar-fill']} style={{ width: `${pct}%` }} /></div>
            <span className={styles['pd-rating-bar-count']}>{count}</span>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductDetail = () => {
    const params = useParams();
    const id = (params?.slug || params?.id) as string;
    const navigate = useRouter();
    const { user, openLogin, convertPrice, siteSettings, t, currency } = useAuth();
    const { showToast } = useToast();
    const { openChat } = useChat();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mainImage, setMainImage] = useState('');
    const [mainImageIdx, setMainImageIdx] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('details');
    const [activeSidebarTab, setActiveSidebarTab] = useState('wholesale');
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isFullScreenZoom, setIsFullScreenZoom] = useState(false);
    const [is3DMode, setIs3DMode] = useState(false);
    const [sampleModal, setSampleModal] = useState(false);
    const [sampleAddress, setSampleAddress] = useState('');
    const [sampleNote, setSampleNote] = useState('');
    const [sampleLoading, setSampleLoading] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
    const [cartSuccess, setCartSuccess] = useState(false);
    const [showCartModal, setShowCartModal] = useState(false);
    const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
    const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

    // Advanced Experience states
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [bundleData, setBundleData] = useState<{ mainProduct: any; bundleProducts: any[]; discountPercentage: number } | null>(null);
    const [selectedBundleItems, setSelectedBundleItems] = useState<Record<string, boolean>>({});
    const [bundleSuccess, setBundleSuccess] = useState(false);

    // Frequently Bought Together states
    const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState<any[]>([]);
    const [selectedBoughtTogether, setSelectedBoughtTogether] = useState<Record<string, boolean>>({});
    const [boughtTogetherSuccess, setBoughtTogetherSuccess] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifySubmitting, setNotifySubmitting] = useState(false);
    const [notifySuccess, setNotifySuccess] = useState(false);
    const [showNotifyMeForm, setShowNotifyMeForm] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // EMI states
    const [emiPlans, setEmiPlans] = useState<any[]>([]);
    const [showEmiPlansModal, setShowEmiPlansModal] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (user && user.email) {
            setNotifyEmail(user.email);
        }
    }, [user]);

    const [qas, setQas] = useState<any[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [newQuestionLoading, setNewQuestionLoading] = useState(false);
    const [answeringQaId, setAnsweringQaId] = useState<string | null>(null);
    const [newAnswer, setNewAnswer] = useState('');
    const [newAnswerLoading, setNewAnswerLoading] = useState(false);

    const fetchQas = async () => {
        if (!id) return;
        try {
            const { data } = await api.get(`/product-qa/${id}`);
            setQas(data || []);
        } catch (err) {
            console.error('Error fetching Q&As:', err);
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { openLogin(); return; }
        if (!newQuestion.trim()) return;
        setNewQuestionLoading(true);
        try {
            await api.post('/product-qa/question', { productId: product?._id || id, question: newQuestion.trim() });
            setNewQuestion('');
            showToast('Question posted successfully!', 'success');
            fetchQas();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to post question', 'error');
        } finally {
            setNewQuestionLoading(false);
        }
    };

    const handleAnswerQuestion = async (e: React.FormEvent, qaId: string) => {
        e.preventDefault();
        if (!user) { openLogin(); return; }
        if (!newAnswer.trim()) return;
        setNewAnswerLoading(true);
        try {
            await api.post('/product-qa/answer', { qaId, answer: newAnswer.trim() });
            setNewAnswer('');
            setAnsweringQaId(null);
            showToast('Answer posted successfully!', 'success');
            fetchQas();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to post answer', 'error');
        } finally {
            setNewAnswerLoading(false);
        }
    };
    const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
    const [reportReason, setReportReason] = useState('Spam');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const relatedSliderRef = useRef<HTMLDivElement>(null);

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            openLogin();
            return;
        }
        if (!reportingReviewId) return;
        setIsSubmittingReport(true);
        try {
            await api.post(`/reviews/${reportingReviewId}/report`, { reason: reportReason });
            showToast('Review reported successfully for moderation', 'success');
            setIsReportModalOpen(false);
            setReportingReviewId(null);
            setReportReason('Spam');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to report review', 'error');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleCopyCoupon = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        showToast(`Promo code "${code}" copied to clipboard!`, 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsShareModalOpen(true);
    };

    const handleCopyLinkOnly = (e: any) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    // Magnifier Zoom
    const [lensStyle, setLensStyle] = useState<React.CSSProperties>({});
    const [isZoomActive, setIsZoomActive] = useState(false);

    const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const zoom = 2.5;
        const lensSize = 160;
        
        const bgX = -(x * zoom - lensSize / 2);
        const bgY = -(y * zoom - lensSize / 2);
        
        setLensStyle({
            display: 'block',
            left: `${x - lensSize / 2}px`,
            top: `${y - lensSize / 2}px`,
            backgroundImage: `url(${mainImage})`,
            backgroundSize: `${rect.width * zoom}px ${rect.height * zoom}px`,
            backgroundPosition: `${bgX}px ${bgY}px`
        });
        setIsZoomActive(true);
    };

    const handleImageMouseLeave = () => {
        setLensStyle({ display: 'none' });
        setIsZoomActive(false);
    };

    // Mobile Touch Swipe for image gallery
    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diffX = touchStartX.current - e.touches[0].clientX;
        if (Math.abs(diffX) > 50) {
            const matchingVariant = product?.variants?.find((v: any) => {
                return v.attributes?.every((attr: any) => selectedVariants[attr.name] === attr.value);
            });
            const variantImages = (matchingVariant && matchingVariant.images && matchingVariant.images.length > 0)
                ? matchingVariant.images
                : ((matchingVariant && matchingVariant.image)
                    ? [matchingVariant.image]
                    : (product.images?.length > 0 ? product.images : (product.main_image ? [product.main_image] : []))
                  );

            if (variantImages.length > 1) {
                if (diffX > 0) {
                    const ni = (mainImageIdx + 1) % variantImages.length;
                    setMainImage(getImgUrl(variantImages[ni]));
                    setMainImageIdx(ni);
                } else {
                    const ni = (mainImageIdx - 1 + variantImages.length) % variantImages.length;
                    setMainImage(getImgUrl(variantImages[ni]));
                    setMainImageIdx(ni);
                }
            }
            touchStartX.current = null;
        }
    };

    const handleTouchEnd = () => {
        touchStartX.current = null;
    };

    useEffect(() => {
        const fetchAll = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const { data } = await fetchProductById(id);
                setProduct(data);
                if (data.variants && data.variants.length > 0) {
                    const initialSelection: Record<string, string> = {};
                    data.variants[0].attributes?.forEach((attr: any) => {
                        initialSelection[attr.name] = attr.value;
                    });
                    setSelectedVariants(initialSelection);
                }
                const imgs = data.images?.length > 0 ? data.images : [data.main_image || ''];
                setMainImage(getImgUrl(imgs[0]));
                setMainImageIdx(0);
                setQuantity(siteSettings?.rfq_enabled === false ? 1 : (data.moq || 1));

                // Stop the main loader immediately so the user can see the product
                setLoading(false);

                // Fetch ancillary data asynchronously in parallel
                if (user?._id) {
                    getWishlist().then(({ data: wl }) => {
                        setIsWishlisted(wl.some((item: any) => (item.product?._id || item.product) === data._id));
                    }).catch(() => {});
                }

                getProductReviews(id).then(({ data: rv }) => {
                    setReviews(rv || []);
                }).catch(() => {});

                api.get(`/products/${id}/price-history`).then(({ data: hist }) => {
                    if (hist.success && hist.history) setPriceHistory(hist.history);
                }).catch(err => console.error('Failed to load price history:', err));

                api.get(`/products/${id}/bundle`).then(({ data: bundle }) => {
                    setBundleData(bundle);
                    if (bundle && bundle.bundleProducts) {
                        const initialSelection: Record<string, boolean> = { [bundle.mainProduct._id]: true };
                        bundle.bundleProducts.forEach((p: any) => {
                            initialSelection[p._id] = true;
                        });
                        setSelectedBundleItems(initialSelection);
                    }
                }).catch(err => console.error('Failed to load bundle recommendations:', err));

                api.get('/emi/plans').then(({ data: plansRes }) => {
                    if (plansRes.success && plansRes.data) setEmiPlans(plansRes.data);
                }).catch(err => console.error('Failed to load EMI plans:', err));

                api.get('/products', { params: { category_id: data.category?._id, limit: 10 } }).then(({ data: rel }) => {
                    setRelatedProducts((rel.products || []).filter((p: any) => p._id !== data._id));
                }).catch(() => {});

                api.get(`/products/${id}/frequently-bought-together`).then(({ data: fbt }) => {
                    setFrequentlyBoughtTogether(fbt || []);
                    if (fbt && fbt.length > 0) {
                        const initialSelection: Record<string, boolean> = {};
                        fbt.forEach((p: any) => {
                            initialSelection[p._id] = true;
                        });
                        setSelectedBoughtTogether(initialSelection);
                    }
                }).catch(err => console.error('Failed to load frequently bought together:', err));

                api.get('/products', { params: { sort_by: 'rating', limit: 10 } }).then(({ data: tr }) => {
                    setTrendingProducts((tr.products || []).filter((p: any) => p._id !== data._id));
                }).catch(() => {});

                const supplierId = data.supplier?._id || data.supplier;
                const couponParams = supplierId ? { supplier: supplierId } : {};
                api.get('/coupons/public', { params: couponParams }).then(({ data: cp }) => {
                    setCoupons(cp || []);
                }).catch(err => console.error('Error fetching public coupons for product:', err));

                fetchQas().catch(err => console.error('Error fetching Q&As:', err));

                try {
                    const viewed = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('recentlyViewed') : null) || '[]');
                    setRecentlyViewed(viewed.filter((p: any) => p._id !== data._id).slice(0, 8));
                    const updatedViewed = [{ _id: data._id, name: data.name, main_image: data.main_image, moq: data.moq, main_price: data.main_price || data.price_tiers?.[0]?.price }, ...viewed.filter((p: any) => p._id !== data._id)].slice(0, 20);
                    localStorage.setItem('recentlyViewed', JSON.stringify(updatedViewed));
                } catch { }

            } catch (err: any) {
                setError(err.response?.data?.message || err.message);
                setLoading(false);
            }
        };
        fetchAll();
    }, [id, user?._id]);

    // Sync main image when matching variant changes
    useEffect(() => {
        if (product) {
            const matchingVariant = product.variants?.find((v: any) => {
                return v.attributes?.every((attr: any) => selectedVariants[attr.name] === attr.value);
            });
            const variantImages = (matchingVariant && matchingVariant.images && matchingVariant.images.length > 0)
                ? matchingVariant.images
                : ((matchingVariant && matchingVariant.image)
                    ? [matchingVariant.image]
                    : (product.images?.length > 0 ? product.images : (product.main_image ? [product.main_image] : []))
                  );
            
            if (variantImages.length > 0) {
                setMainImage(getImgUrl(variantImages[0]));
                setMainImageIdx(0);
            }
        }
    }, [selectedVariants, product]);

    const handleVariantSelect = (name: string, value: string) => setSelectedVariants(prev => ({ ...prev, [name]: value }));

    const handleStartOrderClick = () => {
        if (!product) return;
        
        // Find matching variant combination
        const matchingVariant = product.variants?.find((v: any) => {
            return v.attributes?.every((attr: any) => selectedVariants[attr.name] === attr.value);
        });

        // Direct checkout: save this item in checkoutState and redirect to /checkout
        const checkoutItem = {
            productId: product._id,
            name: product.name,
            price: activePrice,
            image: mainImage,
            quantity,
            variants: selectedVariants,
            sku: matchingVariant?.sku || product.sku,
            supplier: product.supplier
        };
        const state = { items: [checkoutItem], direct: true };
        sessionStorage.setItem('checkoutState', JSON.stringify(state));
        if (typeof window !== 'undefined') {
            (window as any).checkoutState = state;
        }
        navigate.push('/checkout');
    };

    const handleConfirmBooking = (bookingData: any) => {
        if (typeof window !== 'undefined') {
            const state = { product, bookingDetails: bookingData };
            sessionStorage.setItem('checkoutState', JSON.stringify(state));
            (window as any).checkoutState = state;
        }
        navigate.push('/checkout');
    };

    const handleAddToCart = () => {
        if (!product) return;
        
        // Find matching variant combination
        const matchingVariant = product.variants?.find((v: any) => {
            return v.attributes?.every((attr: any) => selectedVariants[attr.name] === attr.value);
        });

        const cartItem = {
            productId: product._id,
            name: product.name,
            price: activePrice,
            image: mainImage,
            quantity,
            variants: selectedVariants,
            sku: matchingVariant?.sku || product.sku,
            supplier: product.supplier
        };

        const cart = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');
        const idx = cart.findIndex((i: any) => i.productId === cartItem.productId && JSON.stringify(i.variants) === JSON.stringify(cartItem.variants));
        if (idx > -1) cart[idx].quantity += quantity;
        else cart.push(cartItem);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        setCartSuccess(true);
        setShowCartModal(true);
        setTimeout(() => setCartSuccess(false), 2500);
    };

    const handleAddBundleToCart = () => {
        if (!bundleData) return;

        const cart = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');

        const addProductToCartArray = (prod: any, qty: number, isMainProduct: boolean = false) => {
            const price = isMainProduct ? activePrice : (prod.main_price || prod.price_tiers?.[0]?.price || 0);
            const discountedPrice = price * 0.9; // 10% off

            const cartItem = {
                productId: prod._id,
                name: prod.name + " (Bundle Offer 🎁)",
                price: discountedPrice,
                image: prod.main_image || prod.images?.[0] || '',
                quantity: qty,
                variants: isMainProduct ? selectedVariants : {},
                sku: prod.sku || '',
                supplier: prod.supplier || product.supplier
            };

            const idx = cart.findIndex((i: any) => i.productId === cartItem.productId && JSON.stringify(i.variants) === JSON.stringify(cartItem.variants));
            if (idx > -1) cart[idx].quantity += qty;
            else cart.push(cartItem);
        };

        if (selectedBundleItems[bundleData.mainProduct._id]) {
            addProductToCartArray(bundleData.mainProduct, quantity, true);
        }

        bundleData.bundleProducts.forEach((prod: any) => {
            if (selectedBundleItems[prod._id]) {
                addProductToCartArray(prod, prod.moq || 1, false);
            }
        });

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        setBundleSuccess(true);
        showToast('Selected bundle items added to your cart with 10% discount!', 'success');
        setTimeout(() => setBundleSuccess(false), 3000);
    };

    const handleAddToBoughtTogetherCart = () => {
        const cart = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');

        const mainCartItem = {
            productId: product._id,
            name: product.name + " (Bought Together Bundle 📦)",
            price: activePrice * 0.9,
            image: product.main_image || product.images?.[0] || '',
            quantity: quantity,
            variants: selectedVariants,
            sku: product.sku || '',
            supplier: product.supplier
        };

        const mainIdx = cart.findIndex((i: any) => i.productId === mainCartItem.productId && JSON.stringify(i.variants) === JSON.stringify(mainCartItem.variants));
        if (mainIdx > -1) cart[mainIdx].quantity += quantity;
        else cart.push(mainCartItem);

        frequentlyBoughtTogether.forEach((prod: any) => {
            if (selectedBoughtTogether[prod._id]) {
                const basePrice = prod.sale_price !== null && prod.sale_price !== undefined ? prod.sale_price : prod.price;
                const bundleItem = {
                    productId: prod._id,
                    name: prod.name + " (Bought Together Bundle 📦)",
                    price: basePrice * 0.9,
                    image: prod.main_image || prod.images?.[0] || '',
                    quantity: 1,
                    variants: {},
                    sku: prod.sku || '',
                    supplier: prod.supplier || product.supplier
                };

                const idx = cart.findIndex((i: any) => i.productId === bundleItem.productId && JSON.stringify(i.variants) === JSON.stringify(bundleItem.variants));
                if (idx > -1) cart[idx].quantity += 1;
                else cart.push(bundleItem);
            }
        });

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        setBoughtTogetherSuccess(true);
        showToast('Selected bundle items added to your cart with 10% discount!', 'success');
        setTimeout(() => setBoughtTogetherSuccess(false), 3000);
    };

    const handleSubscribeStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notifyEmail.trim()) return;
        setNotifySubmitting(true);
        try {
            const { data } = await api.post('/stock-notifications/subscribe', {
                email: notifyEmail,
                product_id: product._id
            });
            if (data.success) {
                setNotifySuccess(true);
                showToast(data.message || 'Subscribed successfully!', 'success');
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to subscribe.', 'error');
        } finally {
            setNotifySubmitting(false);
        }
    };

    const handleQuantityChange = (val: string | number) => {
        const moq = 1;
        const max = product?.countInStock ?? -1;
        let n = typeof val === 'string' ? parseInt(val) : val;

        if (isNaN(n) || n < moq) n = moq;
        if (max !== -1 && n > max) n = max;

        setQuantity(n);
    };

    if (loading) return <SkeletonLoader />;
    if (error) return (
        <div className={styles['pd-error-state']}>
            <div className={styles['pd-error-icon']}>⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button onClick={() => window.location.reload()} className={styles['pd-btn-primary']}>Try Again</button>
                <button onClick={() => navigate.back()} className={styles['pd-btn-outline']}>Go Back</button>
            </div>
        </div>
    );
    if (!product) return <div className={styles['pd-error-state']}><h2>Product not found.</h2></div>;

    // Find matching variant combination
    const matchingVariant = product.variants?.find((v: any) => {
        return v.attributes?.every((attr: any) => selectedVariants[attr.name] === attr.value);
    });

    const allImages: string[] = (matchingVariant && matchingVariant.images && matchingVariant.images.length > 0)
        ? matchingVariant.images
        : ((matchingVariant && matchingVariant.image)
            ? [matchingVariant.image]
            : (product.images?.length > 0 ? product.images : (product.main_image ? [product.main_image] : []))
          );

    // Extract unique attribute values for grouping from combinations
    const attributesMap: Record<string, Set<string>> = {};
    product.variants?.forEach((v: any) => {
        v.attributes?.forEach((attr: any) => {
            if (!attributesMap[attr.name]) {
                attributesMap[attr.name] = new Set<string>();
            }
            attributesMap[attr.name].add(attr.value);
        });
    });
    const groupedVariants = Object.keys(attributesMap).reduce((acc: Record<string, string[]>, name) => {
        acc[name] = Array.from(attributesMap[name]);
        return acc;
    }, {});
    const validRatings = reviews.filter(r => r && (typeof r.rating === 'number' || (typeof r.rating === 'string' && !isNaN(Number(r.rating)))));
    const dbRating = validRatings.length > 0
        ? validRatings.reduce((a, r) => a + Number(r.rating), 0) / validRatings.length
        : 0;
    const fallbackRating = (product.rating && product.rating > 0) ? product.rating : (product._id ? 4.0 + (product._id.charCodeAt(product._id.length - 1) % 10) * 0.1 : 4.8);
    const dynamicRating = dbRating > 0 ? dbRating : fallbackRating;

    // displayReviews defined early so count/breakdown can reference it
    const displayReviews = reviews || [];

    // Count is always the length of what we actually display
    const dynamicNumReviews = displayReviews.length;

    // Rating breakdown computed from displayReviews
    const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
        const count = displayReviews.filter(r => Math.round(Number(r.rating || 0)) === star).length;
        return { label: `${star}★`, count };
    });






    const activePrice = matchingVariant?.price || product.sale_price || product.price || 0;
    const rawDiscountPct = product._id ? 30 + (product._id.charCodeAt(product._id.length - 2) % 6) * 5 : 45;
    const computedOldPrice = activePrice / (1 - rawDiscountPct / 100);
    const displayOldPrice = product.oldPrice || ((matchingVariant?.price || product.sale_price) ? (product.price || 0) : computedOldPrice);
    const totalPrice = activePrice * quantity;
    const discountPct = Math.round(((displayOldPrice - activePrice) / displayOldPrice) * 100);

    const eligiblePlans = emiPlans.filter((plan: any) => {
        return activePrice >= (plan.min_order_amount || 0) && activePrice <= (plan.max_order_amount || 1000000);
    });

    const calculateEmiForPlan = (plan: any, amount: number) => {
        const processing_fee = plan.processing_fee || 0;
        const P = amount;
        const R = (plan.interest_rate / 100);
        const N = plan.installments;

        let monthlyPayment = 0;
        let interest_total = 0;

        if (R === 0) {
            monthlyPayment = P / N;
            interest_total = 0;
        } else {
            monthlyPayment = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
            interest_total = (monthlyPayment * N) - P;
        }

        const total_payable = (monthlyPayment * N) + processing_fee;
        return {
            monthly_installment: Math.round(monthlyPayment * 100) / 100,
            interest_total: Math.round(interest_total * 100) / 100,
            total_payable: Math.round(total_payable * 100) / 100
        };
    };
    const displayStock = matchingVariant !== undefined ? (matchingVariant.stock ?? 0) : (product.countInStock ?? -1);

    const getAttributeImage = (name: string, value: string) => {
        const found = product.variants?.find((v: any) => {
            return v.attributes?.some((attr: any) => attr.name === name && attr.value === value) && v.image;
        });
        return found ? getImgUrl(found.image) : null;
    };

    const yrs = product.supplier?.createdAt ? Math.max(1, new Date().getFullYear() - new Date(product.supplier.createdAt).getFullYear()) : null;

    const planInfo = product.supplier?.subscription_plan;
    const isVerified = product.supplier?.is_verified || product.supplier?.verification_status === 'verified';
    const isPlanVerified = !!(planInfo?.has_verified_badge && isVerified);
    const badgeColor = planInfo?.badge_color || '#d97706';

    const isAvailableInRegion = product.sales_type === 'worldwide' ||
        (product.sales_type === 'specific' && product.countries?.includes(user?.country_code || 'IN'));

    const isOwner = user && product.supplier && (user._id === (product.supplier._id || product.supplier));

    return (
        <div className={styles['pd-page']}>
            {/* ── Breadcrumb ── */}
            <div className={styles['pd-breadcrumb']}>
                <Link href="/">{t('home') || 'Home'}</Link>
                <span className={styles['pd-bc-sep']}>›</span>
                <Link href="/search">{t('all_products') || 'All Products'}</Link>
                {product.category?.title && (<><span className={styles['pd-bc-sep']}>›</span><Link href={`/search?category=${product.category._id}`}>{product.category.title}</Link></>)}
                <span className={styles['pd-bc-sep']}>›</span>
                <span className={styles['pd-bc-current']}>{product.name?.slice(0, 50)}{product.name?.length > 50 ? '...' : ''}</span>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/*  MAIN PRODUCT SECTION                                          */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className={styles['pd-main-section']}>
                {!isAvailableInRegion && (
                    <div className={styles['pd-restriction-alert']} style={{ gridColumn: '1 / -1', background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🚫</span>
                        <div>
                            <div style={{ fontWeight: 800 }}>Not available in your region</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>This supplier does not ship this specific product to your country.</div>
                        </div>
                    </div>
                )}

                <div className={styles['pd-left-main-wrap']}>
                    <div className={styles['pd-gallery-details-row']}>
                        {/* ── LEFT: Image Gallery ── */}
                        <div className={styles['pd-gallery']}>
                            {/* Thumbnail strip — LEFT side */}
                            <div className={styles['pd-thumb-list']}>
                                {allImages.map((img: string, idx: number) => {
                                    const url = getImgUrl(img);
                                    return (
                                        <button
                                            key={idx}
                                            className={`${styles['pd-thumb']} ${!is3DMode && mainImageIdx === idx ? styles['active'] : ''}`}
                                            onMouseEnter={() => { setMainImage(url); setMainImageIdx(idx); setIs3DMode(false); }}
                                            onClick={() => { setMainImage(url); setMainImageIdx(idx); setIs3DMode(false); }}
                                        >
                                            <img src={url} alt="" loading="lazy" />
                                        </button>
                                    );
                                })}
                                {/* 3D Mode Toggle Button in thumbnail list */}
                                {product && product.three_d_model && (
                                    <button
                                        className={`${styles['pd-thumb']} ${is3DMode ? styles['active'] : ''}`}
                                        onClick={() => setIs3DMode(!is3DMode)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: is3DMode ? '#ff6600' : '#f1f5f9',
                                            color: is3DMode ? '#fff' : '#0d2e67',
                                            border: '1.5px solid currentColor',
                                            minHeight: '60px',
                                            borderRadius: '8px',
                                            gap: '2px',
                                            cursor: 'pointer'
                                        }}
                                        title="Interactive 3D View"
                                    >
                                        <span style={{ fontSize: '16px' }}>📦</span>
                                        <span style={{ fontSize: '8px', fontWeight: '800' }}>3D VIEW</span>
                                    </button>
                                )}

                                {/* Video Tab Navigation Button in thumbnail list */}
                                {product && product.video && (
                                    <button
                                        className={`${styles['pd-thumb']} ${activeTab === 'video' ? styles['active'] : ''}`}
                                        onClick={() => {
                                            setActiveTab('video');
                                            document.getElementById('pd-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: activeTab === 'video' ? 'var(--primary-color)' : '#f1f5f9',
                                            color: activeTab === 'video' ? '#fff' : '#0d2e67',
                                            border: '1.5px solid currentColor',
                                            minHeight: '60px',
                                            borderRadius: '8px',
                                            gap: '2px',
                                            cursor: 'pointer'
                                        }}
                                        title="Product Video"
                                    >
                                        <span style={{ fontSize: '16px' }}>🎥</span>
                                        <span style={{ fontSize: '8px', fontWeight: '800' }}>VIDEO</span>
                                    </button>
                                )}
                            </div>

                            {/* Main image — RIGHT side */}
                            <div 
                                className={styles['pd-main-img-wrap']} 
                                onMouseMove={!is3DMode ? handleImageMouseMove : undefined} 
                                onMouseLeave={!is3DMode ? handleImageMouseLeave : undefined}
                                onTouchStart={!is3DMode ? handleTouchStart : undefined}
                                onTouchMove={!is3DMode ? handleTouchMove : undefined}
                                onTouchEnd={!is3DMode ? handleTouchEnd : undefined}
                            >
                                {is3DMode ? (
                                    <div className={styles['pd-main-img-inner']} style={{ width: '100%', height: '100%', minHeight: '350px', position: 'relative', background: '#f8fafc' }}>
                                        <Product3DViewer product={product} onClose={() => setIs3DMode(false)} />
                                    </div>
                                ) : isVideoPlaying ? (
                                    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '350px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                                        {product.video.includes('youtube.com') || product.video.includes('youtu.be') ? (
                                            <iframe
                                                src={product.video.replace('watch?v=', 'embed/')}
                                                title="Product Video"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                style={{ width: '100%', height: '100%', minHeight: '350px', border: 'none' }}
                                            />
                                        ) : (
                                            <video 
                                                src={getImgUrl(product.video)} 
                                                controls 
                                                autoPlay
                                                style={{ width: '100%', height: '100%', minHeight: '350px', objectFit: 'contain' }} 
                                            />
                                        )}
                                        <button 
                                            onClick={() => setIsVideoPlaying(false)}
                                            style={{
                                                position: 'absolute',
                                                top: '15px',
                                                right: '15px',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '36px',
                                                height: '36px',
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                color: '#1a1a2e',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                zIndex: 10
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles['pd-main-img-inner']} style={{ cursor: 'crosshair', overflow: 'hidden', position: 'relative' }}>
                                        <img src={mainImage} alt={product.name} loading="lazy" />
                                        {isZoomActive && (
                                            <div
                                                className={styles['pd-magnifier-lens']}
                                                style={{
                                                    position: 'absolute',
                                                    width: '160px',
                                                    height: '160px',
                                                    borderRadius: '50%',
                                                    border: '2px solid rgba(255, 255, 255, 0.8)',
                                                    boxShadow: '0 5px 20px rgba(0,0,0,0.3), inset 0 0 12px rgba(0,0,0,0.15)',
                                                    pointerEvents: 'none',
                                                    backgroundRepeat: 'no-repeat',
                                                    ...lensStyle
                                                }}
                                            />
                                        )}
                                        {product.video && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsVideoPlaying(true); }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    background: 'var(--primary-color)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '64px',
                                                    height: '64px',
                                                    fontSize: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 24px rgba(255,102,0,0.3)',
                                                    transition: 'all 0.2s',
                                                    zIndex: 5
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
                                                title="Play Product Video"
                                            >
                                                ▶
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Top Right Controls */}
                                {!is3DMode && (
                                    <div 
                                        className={styles['pd-img-controls-top']}
                                        onMouseMove={(e) => e.stopPropagation()}
                                        onMouseEnter={handleImageMouseLeave}
                                    >
                                        {/* Wishlist btn */}
                                        <button
                                            className={`${styles['pd-wish-btn']} ${isWishlisted ? styles['active'] : ''}`}
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                if (!user) { openLogin(); return; }
                                                try { const { data } = await toggleWishlist(product._id); setIsWishlisted(data.isLiked); } catch { }
                                            }}
                                            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                        >
                                            {isWishlisted ? (
                                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                            ) : (
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                            )}
                                        </button>

                                        {/* Share btn */}
                                        <button
                                            className={styles['pd-share-btn']}
                                            onClick={handleShare}
                                            title="Share Product"
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0L8 6m4-4v12" />
                                            </svg>
                                        </button>

                                        {/* Fullscreen btn */}
                                        <button className={styles['pd-zoom-btn']} onClick={() => setIsFullScreenZoom(true)} title="View fullscreen">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    </div>
                                )}

                                {/* Nav arrows */}
                                {!is3DMode && allImages.length > 1 && (
                                    <>
                                        <button 
                                            className={styles['pd-img-nav'] + " " + styles['pd-img-prev']} 
                                            onClick={() => { const ni = (mainImageIdx - 1 + allImages.length) % allImages.length; setMainImage(getImgUrl(allImages[ni])); setMainImageIdx(ni); }}
                                            onMouseMove={(e) => e.stopPropagation()}
                                            onMouseEnter={handleImageMouseLeave}
                                        >
                                            ‹
                                        </button>
                                        <button 
                                            className={styles['pd-img-nav'] + " " + styles['pd-img-next']} 
                                            onClick={() => { const ni = (mainImageIdx + 1) % allImages.length; setMainImage(getImgUrl(allImages[ni])); setMainImageIdx(ni); }}
                                            onMouseMove={(e) => e.stopPropagation()}
                                            onMouseEnter={handleImageMouseLeave}
                                        >
                                            ›
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── MIDDLE COLUMN: Product Details Info ── */}
                        <div className={styles['pd-details-info-new']}>
                            <h1 className={styles['pd-title-new']}>{product.name}</h1>

                            {/* Meta row */}
                            <div className={styles['pd-meta-row']}>
                                <span className={styles['pd-meta-by']}>by </span>
                                {product.supplier && (
                                    <Link href={`/supplier/${product.supplier._id}`} className={styles['pd-meta-supplier-name']}>
                                        {product.supplier.company_name}
                                    </Link>
                                )}
                                <span className={styles['pd-meta-stats-wrap']}>
                                    <span className={styles['pd-meta-star-icon']}>★</span>
                                    <span className={styles['pd-meta-rating-val']}>{dynamicRating.toFixed(1)}</span>
                                    <span className={styles['pd-meta-sep-char']}>|</span>
                                    <span className={styles['pd-meta-sold-val']}>
                                        {(product.numOrders && product.numOrders > 0) ? product.numOrders : (product._id ? (product._id.charCodeAt(product._id.length - 1) % 9) * 50 + 100 : 500)}+ sold
                                    </span>
                                </span>
                            </div>
                            {/* Dynamic Promotion Banner */}
                            {product.promotion && (
                                <div style={{ background: 'linear-gradient(90deg, #ff4d4f, #ff7875)', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>🔥 {product.promotion.title}</span>
                                        {product.promotion.remaining !== null && (
                                            <span style={{ fontSize: '12px', opacity: 0.9 }}>Only {product.promotion.remaining} left!</span>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {product.promotion.badge && (
                                            <span style={{ background: '#fff', color: '#ff4d4f', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                                {product.promotion.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Price Block */}
                            <div className={styles['pd-price-block']}>
                                <div className={styles['pd-single-price']}>
                                    <span className={styles['pd-price-main']}>{convertPrice(product.promotion ? activePrice - product.promotion.discount : activePrice).formatted}</span>
                                    {displayOldPrice > 0 && (
                                        <>
                                            <span className={styles['pd-price-old']}>{convertPrice(displayOldPrice).formatted}</span>
                                            {discountPct && discountPct > 0 && <span className={styles['pd-price-discount-badge']}>{discountPct}% off</span>}
                                        </>
                                    )}
                                </div>
                                <div className={styles['pd-price-subtext']}>
                                    Tax excluded, add at checkout if applicable
                                </div>

                                {product.emi_supported !== false && eligiblePlans.length > 0 && (
                                    <div className={styles['pd-emi-preview-box']}>
                                        <div className={styles['pd-emi-info-col']}>
                                            <div className={styles['pd-emi-tagline']}>
                                                Or interest-free installments of <span className={styles['pd-emi-highlight']}>{convertPrice(calculateEmiForPlan(eligiblePlans[0], activePrice).monthly_installment).formatted}/mo</span>
                                            </div>
                                            <div className={styles['pd-emi-subtext']}>
                                                Available for {eligiblePlans[0].installments} installments under {eligiblePlans[0].name}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles['pd-emi-action-btn']}
                                            onClick={() => setShowEmiPlansModal(true)}
                                        >
                                            View Plans
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Special Promotion Banner */}
                            <div className={styles['pd-promo-banner']}>
                                <div className={styles['pd-promo-left']}>
                                    <span className={styles['pd-promo-tag-icon']}>🏷️</span>
                                    <span className={styles['pd-promo-banner-text']}>Buy {product.moq || 2} pieces get 3% off</span>
                                </div>
                            </div>

                            {/* Trust Signals */}
                            <div className={styles['pd-trust-signals']}>
                                <div className={styles['pd-trust-item']}>
                                    <svg className={styles['pd-trust-icon']} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    Secure Payments
                                </div>
                                <div className={styles['pd-trust-item']}>
                                    <svg className={styles['pd-trust-icon']} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/></svg>
                                    Easy Returns
                                </div>
                                <div className={styles['pd-trust-item']}>
                                    <svg className={styles['pd-trust-icon']} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                                    Fast Shipping
                                </div>
                            </div>

                            {/* Key Info Table */}
                            <div className={styles['pd-key-info']}>

                                <div className={styles['pd-ki-row']}>
                                    <span className={styles['pd-ki-label']}>Availability</span>
                                    <span className={styles['pd-ki-val']}>
                                        {product.sales_type === 'specific' ? (
                                            <span className={`${styles['pd-availability-tag']} ${styles['pd-avail-specific']}`}>
                                                Available in: {product.countries?.join(', ') || 'N/A'}
                                            </span>
                                        ) : (
                                            <span className={`${styles['pd-availability-tag']} ${styles['pd-avail-worldwide']}`}>
                                                Available Worldwide
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Key Product Features (Highlights) */}
                            {product.features && product.features.length > 0 && (
                                <div className={styles['pd-features-block']}>
                                    <h3 className={styles['pd-features-title']}>Product Highlights</h3>
                                    <ul className={styles['pd-features-list']}>
                                        {product.features.map((feature: string, idx: number) => (
                                            <li key={idx} className={styles['pd-feature-item']}>
                                                <span className={styles['pd-feature-bullet']}>✓</span>
                                                <span className={styles['pd-feature-text']}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Variants */}
                            {groupedVariants && Object.keys(groupedVariants).length > 0 && (
                                <div className={styles['pd-variants-block']}>
                                    {Object.keys(groupedVariants).map((vName) => (
                                        <div key={vName} className={styles['pd-variant-group']}>
                                            <div className={styles['pd-variant-label']}>
                                                <span>{vName}:</span>
                                                {selectedVariants[vName] && <span className={styles['pd-variant-selected']}>{selectedVariants[vName]}</span>}
                                            </div>
                                            <div className={styles['pd-variant-options']}>
                                                {groupedVariants[vName].map((val: string, vi: number) => {
                                                    const isActive = selectedVariants[vName] === val;
                                                    const valImg = getAttributeImage(vName, val);
                                                    return (
                                                        <button
                                                            key={vi}
                                                            className={`${styles['pd-variant-btn']} ${valImg ? styles['has-image'] : ''} ${isActive ? styles['active'] : ''}`}
                                                            onClick={() => {
                                                                handleVariantSelect(vName, val);
                                                                const updatedSelection = { ...selectedVariants, [vName]: val };
                                                                const matched = product.variants?.find((v: any) =>
                                                                    v.attributes?.every((attr: any) => updatedSelection[attr.name] === attr.value)
                                                                );
                                                                if (matched?.image) {
                                                                    setMainImage(getImgUrl(matched.image));
                                                                } else if (valImg) {
                                                                    setMainImage(valImg);
                                                                }
                                                            }}
                                                        >
                                                            {valImg ? <img src={valImg} alt={val} /> : val}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/*  TABS SECTION                                                   */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <div id="pd-tabs-section" className={styles['pd-tabs-section']}>
                        <div className={styles['pd-tabs-nav']}>
                            {[
                                { id: 'details', label: t('overview') || 'Overview' },
                                ...(product && product.video ? [{ id: 'video', label: 'Product Video 🎥' }] : []),
                                { id: 'reviews', label: `${t('reviews') || 'Reviews'} (${dynamicNumReviews})` },
                                { id: 'profile', label: t('supplier_profile') || 'Supplier Profile' },
                                { id: 'qa', label: `Q&A (${qas.length})` }
                            ].map(tab => (
                                <button key={tab.id} className={`${styles['pd-tab-nav-btn']} ${activeTab === tab.id ? styles['active'] : ''}`} onClick={() => setActiveTab(tab.id)}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className={styles['pd-tab-body']}>
                            {/* ── Overview ── */}
                            {activeTab === 'details' && (
                                <div className={styles['pd-overview-layout']}>
                                    <div className={styles['pd-overview-left']}>
                                        {product.description ? (
                                            <div className={styles['pd-desc-content']} dangerouslySetInnerHTML={{ __html: product.description }} />
                                        ) : (
                                            <div style={{ color: '#64748b', marginBottom: '24px' }}>No description available.</div>
                                        )}
                                        
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '24px 0 16px', color: '#0f172a' }}>Specifications</h3>
                                        <div className={styles['pd-specs-grid']}>
                                            {product.barcode && (
                                                <div className={styles['pd-spec-row']}>
                                                    <div className={styles['pd-spec-key']}>GTIN / Barcode</div>
                                                    <div className={styles['pd-spec-val']} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{product.barcode}</div>
                                                </div>
                                            )}
                                            {product.key_attributes?.length > 0 ? (
                                                product.key_attributes.map((attr: any, i: number) => (
                                                    <div className={styles['pd-spec-row']} key={i}>
                                                        <div className={styles['pd-spec-key']}>{attr.key}</div>
                                                        <div className={styles['pd-spec-val']}>{attr.value}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: '#64748b', fontSize: '14px', padding: '12px 0' }}>No specifications provided.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles['pd-overview-right']}>
                                        <div className={styles['pd-mfg-highlights']}>
                                            <h4 className={styles['pd-mfg-title']}>Manufacturing Highlights</h4>
                                            <div className={styles['pd-mfg-stat']}>
                                                <span className={styles['pd-mfg-label']}>Lead Time</span>
                                                <span className={styles['pd-mfg-val']}>{product.key_attributes?.find((a: any) => a.key.toLowerCase().includes('lead time'))?.value || '15-20 days (Est)'}</span>
                                            </div>
                                            <div className={styles['pd-mfg-stat']}>
                                                <span className={styles['pd-mfg-label']}>QC Process</span>
                                                <span className={styles['pd-mfg-val']}>{product.key_attributes?.find((a: any) => a.key.toLowerCase().includes('qc'))?.value || 'Standard AQL'}</span>
                                            </div>
                                            <div className={styles['pd-mfg-stat']}>
                                                <span className={styles['pd-mfg-label']}>Warranty</span>
                                                <span className={styles['pd-mfg-val']}>{product.key_attributes?.find((a: any) => a.key.toLowerCase().includes('warranty'))?.value || 'Contact Supplier'}</span>
                                            </div>
                                            <div className={styles['pd-mfg-stat']}>
                                                <span className={styles['pd-mfg-label']}>Customization</span>
                                                <span className={styles['pd-mfg-val']}>{product.key_attributes?.find((a: any) => a.key.toLowerCase().includes('customization') || a.key.toLowerCase().includes('oem'))?.value || 'OEM/ODM Available'}</span>
                                            </div>
                                            <div className={styles['pd-mfg-stat']}>
                                                <span className={styles['pd-mfg-label']}>Certifications</span>
                                                <span className={styles['pd-mfg-val']}>{product.key_attributes?.find((a: any) => a.key.toLowerCase().includes('certification'))?.value || 'Verified Standard'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Product Video ── */}
                            {activeTab === 'video' && product.video && (
                                <div className={styles['pd-video-tab']}>
                                    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {product.video.includes('youtube.com') || product.video.includes('youtu.be') ? (
                                            <div className={styles['pd-video-embed-wrapper']}>
                                                <iframe
                                                    src={product.video.replace('watch?v=', 'embed/')}
                                                    title="Product Video"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    style={{ width: '100%', height: '450px', borderRadius: '8px', border: 'none' }}
                                                />
                                            </div>
                                        ) : (
                                            <video 
                                                src={getImgUrl(product.video)} 
                                                controls 
                                                style={{ width: '100%', maxHeight: '500px', borderRadius: '8px', backgroundColor: '#000' }} 
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Reviews ── */}
                            {activeTab === 'reviews' && (
                                <div className={styles['pd-reviews-section']}>
                                    {displayReviews.length > 0 ? (
                                        <>
                                            <div className={styles['pd-review-summary']}>
                                                <div className={styles['pd-review-big-score']}>
                                                    <div className={styles['pd-review-score-num']}>{dynamicRating.toFixed(1)}</div>
                                                    <StarRating rating={dynamicRating} size={22} />
                                                    <div className={styles['pd-review-count-label']}>{dynamicNumReviews} Reviews</div>
                                                </div>
                                                <div className={styles['pd-review-bars']}>
                                                    {ratingBreakdown.map(rb => (
                                                        <RatingBar key={rb.label} label={rb.label} count={rb.count} total={dynamicNumReviews} />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={styles['pd-review-list']}>
                                                {displayReviews.slice(0, 4).map((r, i) => {
                                                    const reviewerName = r.buyer_id
                                                        ? `${r.buyer_id.first_name || ''} ${r.buyer_id.last_name || ''}`.trim() || r.buyer_id.company_name || 'Buyer'
                                                        : 'Buyer';
                                                    const avatarChar = (reviewerName || 'B')[0].toUpperCase();
                                                    return (
                                                        <div className={styles['pd-review-item']} key={i}>
                                                            <div className={styles['pd-review-avatar']}>{avatarChar}</div>
                                                            <div className={styles['pd-review-body']}>
                                                                <div className={styles['pd-review-top']}>
                                                                    <span className={styles['pd-reviewer-name']}>{reviewerName}</span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <span className={styles['pd-review-date']}>{new Date(r.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                        {r.buyer_id?._id !== user?._id && (
                                                                            <button 
                                                                                className={styles['pd-review-report-btn']}
                                                                                onClick={() => {
                                                                                    if (!user) { openLogin(); return; }
                                                                                    setReportingReviewId(r._id);
                                                                                    setIsReportModalOpen(true);
                                                                                }}
                                                                                title="Report Review"
                                                                            >
                                                                                🚩 Report
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <StarRating rating={r.rating} size={13} />
                                                                <p className={styles['pd-review-comment']}>{r.comment}</p>
                                                                {((r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)) && (
                                                                    <div className={styles['pd-review-media-row']}>
                                                                        {r.images && r.images.map((img: string, j: number) => (
                                                                            <img 
                                                                                key={`img-${j}`} 
                                                                                src={getImgUrl(img)} 
                                                                                alt="review" 
                                                                                onClick={() => setLightboxImage(img)}
                                                                                className={styles['pd-review-media-item']}
                                                                                style={{ cursor: 'zoom-in' }}
                                                                            />
                                                                        ))}
                                                                        {r.videos && r.videos.map((vid: string, k: number) => (
                                                                            <video 
                                                                                key={`vid-${k}`} 
                                                                                src={getImgUrl(vid)} 
                                                                                controls 
                                                                                className={styles['pd-review-media-item']}
                                                                                style={{ background: '#000' }} 
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {r.reply_comment && (
                                                                    <div className={styles['pd-review-reply']}>
                                                                        <div className={styles['pd-review-reply-header']}>
                                                                            <span className={styles['pd-review-reply-author']}>Supplier Response</span>
                                                                            <span className={styles['pd-review-reply-date']}>
                                                                                {new Date(r.reply_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className={styles['pd-review-reply-comment']}>{r.reply_comment}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {displayReviews.length > 4 && (
                                                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                                    <button
                                                        onClick={() => setIsReviewsModalOpen(true)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '2px solid var(--primary-color)',
                                                            color: 'var(--primary-color)',
                                                            padding: '10px 32px',
                                                            borderRadius: '30px',
                                                            fontWeight: '700',
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                                                    >
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        View All {displayReviews.length} Reviews
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles['pd-empty-tab']}>
                                            <svg width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            <p>No reviews yet. Be the first to review this product!</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Supplier Profile Tab ── */}
                            {activeTab === 'profile' && (
                                <div className={styles['pd-supplier-profile-tab']}>
                                    <div className={styles['pd-sp-header']}>
                                        <div className={styles['pd-sp-logo']}>
                                            {product.supplier?.logo
                                                ? <img src={getImgUrl(product.supplier.logo)} alt="Logo" />
                                                : <span>{(product.supplier?.company_name || 'S')[0]}</span>}
                                        </div>
                                        <div>
                                            <h3 className={styles['pd-sp-name']}>{product.supplier?.company_name}</h3>
                                            <div className={styles['pd-sp-meta']}>
                                                {(isPlanVerified || isVerified) && (
                                                    <span className={styles['pd-sp-verified']} style={isPlanVerified ? { color: badgeColor } : {}}>
                                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                                        {isPlanVerified ? 'Verified Pro' : 'Verified'}
                                                    </span>
                                                )}
                                                {product.supplier?.business_type && (
                                                    <>
                                                        <span>{Array.isArray(product.supplier.business_type) ? product.supplier.business_type.join(', ') : product.supplier.business_type}</span>
                                                        {yrs && <span>·</span>}
                                                    </>
                                                )}
                                                {yrs && <span>{yrs} yr{yrs !== 1 ? 's' : ''} on platform</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles['pd-sp-stats-grid']}>
                                        {product.supplier?.response_rate && <div className={styles['pd-sp-stat']}><div className={styles['pd-sp-stat-val']}>{product.supplier.response_rate}%</div><div className={styles['pd-sp-stat-label']}>Response Rate</div></div>}
                                        {product.supplier?.avg_response_time && <div className={styles['pd-sp-stat']}><div className={styles['pd-sp-stat-val']}>≤{product.supplier.avg_response_time}h</div><div className={styles['pd-sp-stat-label']}>Avg Response</div></div>}
                                        {product.supplier?.createdAt && <div className={styles['pd-sp-stat']}><div className={styles['pd-sp-stat-val']}>{new Date(product.supplier.createdAt).getFullYear()}</div><div className={styles['pd-sp-stat-label']}>Year Founded</div></div>}
                                        {product.supplier?.country_code && <div className={styles['pd-sp-stat']}><div className={styles['pd-sp-stat-val']}>{product.supplier.country_code}</div><div className={styles['pd-sp-stat-label']}>Location</div></div>}
                                    </div>

                                    <div className={styles['pd-sp-actions']}>
                                        {isOwner ? (
                                            <button className={styles['pd-sp-btn-primary']} disabled style={{ cursor: 'not-allowed', background: '#e2e8f0', color: '#94a3b8', border: 'none' }}>
                                                Own Company
                                            </button>
                                        ) : (
                                            <button className={styles['pd-sp-btn-primary']} onClick={() => user ? openChat(product.supplier, product) : openLogin()}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                Contact Supplier
                                            </button>
                                        )}
                                        <button className={styles['pd-sp-btn-outline']} onClick={() => navigate.push(`/supplier/${product.supplier?._id}`)}>
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            View Full Profile
                                        </button>
                                        <button className={styles['pd-sp-btn-outline']} onClick={() => navigate.push(`/search?supplier=${product.supplier?._id}`)}>
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            More Products
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'qa' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Post question form */}
                                    <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="text"
                                            placeholder="Ask a question about this product..."
                                            value={newQuestion}
                                            onChange={e => setNewQuestion(e.target.value)}
                                            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={newQuestionLoading || !newQuestion.trim()}
                                            style={{
                                                background: 'var(--primary-color)',
                                                color: '#fff',
                                                padding: '12px 24px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: '700',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                opacity: !newQuestion.trim() ? 0.6 : 1
                                            }}
                                        >
                                            {newQuestionLoading ? 'Posting...' : 'Ask'}
                                        </button>
                                    </form>

                                    {/* Q&A List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {qas.length > 0 ? (
                                            qas.map((qa: any) => {
                                                const customerName = qa.customer
                                                    ? `${qa.customer.first_name || ''} ${qa.customer.last_name || ''}`.trim() || 'Customer'
                                                    : 'Customer';
                                                return (
                                                    <div key={qa._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontWeight: '800', color: '#ff6600', fontSize: '16px' }}>Q:</span>
                                                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{qa.question}</span>
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '24px', marginTop: '2px' }}>
                                                                    Asked by {customerName} on {new Date(qa.createdAt).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                            {/* Answering button for Seller or Admin */}
                                                            {user && (user.roles?.includes('seller') || user.roles?.includes('supplier') || user.roles?.includes('admin') || user.role === 'admin' || user.role === 'supplier' || user.role === 'seller') && (
                                                                <button
                                                                    onClick={() => setAnsweringQaId(answeringQaId === qa._id ? null : qa._id)}
                                                                    style={{ fontSize: '12px', color: 'var(--primary-color)', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                                                                >
                                                                    Answer
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Answering form */}
                                                        {answeringQaId === qa._id && (
                                                            <form onSubmit={(e) => handleAnswerQuestion(e, qa._id)} style={{ display: 'flex', gap: '12px', marginLeft: '24px', marginTop: '8px' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Write your answer..."
                                                                    value={newAnswer}
                                                                    onChange={e => setNewAnswer(e.target.value)}
                                                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                                                />
                                                                <button
                                                                    type="submit"
                                                                    disabled={newAnswerLoading || !newAnswer.trim()}
                                                                    style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                                                >
                                                                    Post
                                                                </button>
                                                            </form>
                                                        )}

                                                        {/* Answers List */}
                                                        <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                            {qa.answers && qa.answers.length > 0 ? (
                                                                qa.answers.map((ans: any, ai: number) => {
                                                                    const responderName = ans.user
                                                                        ? `${ans.user.first_name || ''} ${ans.user.last_name || ''}`.trim() || ans.user.company_name || 'User'
                                                                        : 'User';
                                                                    const isSeller = ans.user?.roles?.includes('seller') || ans.user?.roles?.includes('supplier') || ans.user?.role === 'supplier' || ans.user?.role === 'seller';
                                                                    return (
                                                                        <div key={ai} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span style={{ fontWeight: '800', color: '#10b981', fontSize: '14px' }}>A:</span>
                                                                                <span style={{ fontSize: '13.5px', color: '#334155' }}>{ans.answer}</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '18px' }}>
                                                                                <span>Replied by {responderName}</span>
                                                                                {isSeller && (
                                                                                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700' }}>Seller</span>
                                                                                )}
                                                                                <span>on {new Date(ans.createdAt).toLocaleDateString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No answers yet.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className={styles['pd-empty-tab']} style={{ padding: '30px 20px', textAlign: 'center' }}>
                                                <svg width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                <p>No questions asked yet. Have a question? Ask away!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Price History Chart Section */}
                    {priceHistory && priceHistory.length > 0 && (() => {
                        const numericValues = priceHistory.map(item => {
                            const converted = convertPrice(item.price);
                            const val = parseFloat(converted?.amount || item.price);
                            return isNaN(val) ? Number(item.price || 0) : val;
                        });

                        const lowestPrice = Math.min(...numericValues);
                        const highestPrice = Math.max(...numericValues);
                        const currentPrice = numericValues[numericValues.length - 1];
                        const firstPrice = numericValues[0];
                        const diff = currentPrice - firstPrice;
                        const pctChange = firstPrice > 0 ? ((diff / firstPrice) * 100).toFixed(1) : '0';

                        const currObj = convertPrice(1);
                        const currSymbol = currObj?.symbol || currency || '$';

                        const minScale = Math.max(0, Math.floor(lowestPrice * 0.9));
                        const maxScale = Math.ceil(highestPrice * 1.1);

                        return (
                            <div className={styles['price-history-section']}>
                                <div className={styles['price-history-header-box']}>
                                    <div className={styles['price-history-title-group']}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={styles['price-history-pulse-dot']} />
                                            <h3 className={styles['price-history-title']}>Price History (30 Days)</h3>
                                        </div>
                                    </div>

                                    <div className={styles['price-history-pills-row']}>
                                        <div className={styles['price-pill']}>
                                            <span className={styles['pill-label']}>Lowest:</span>
                                            <span className={styles['pill-val-green']}>{currSymbol}{lowestPrice.toFixed(2)}</span>
                                        </div>
                                        <div className={styles['price-pill']}>
                                            <span className={styles['pill-label']}>Current:</span>
                                            <span className={styles['pill-val-orange']}>{currSymbol}{currentPrice.toFixed(2)}</span>
                                        </div>
                                        <div className={styles['price-pill']}>
                                            <span className={styles['pill-label']}>Highest:</span>
                                            <span className={styles['pill-val-red']}>{currSymbol}{highestPrice.toFixed(2)}</span>
                                        </div>
                                        <div className={`${styles['price-history-trend-badge']} ${diff < 0 ? styles['drop'] : diff > 0 ? styles['rise'] : styles['stable']}`}>
                                            {diff < 0 ? `📉 ${Math.abs(Number(pctChange))}% Drop` : diff > 0 ? `📈 +${pctChange}% Rise` : `⚖️ Stable`}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles['price-history-chart-wrap']}>
                                    {isMounted && (
                                        <Line 
                                            data={{
                                                labels: priceHistory.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
                                                datasets: [
                                                    {
                                                        label: `Price (${currSymbol})`,
                                                        data: numericValues,
                                                        borderColor: '#ff6a00',
                                                        backgroundColor: (context: any) => {
                                                            const ctx = context.chart?.ctx;
                                                            if (!ctx) return 'rgba(255, 106, 0, 0.08)';
                                                            const gradient = ctx.createLinearGradient(0, 0, 0, 150);
                                                            gradient.addColorStop(0, 'rgba(255, 106, 0, 0.15)');
                                                            gradient.addColorStop(1, 'rgba(255, 106, 0, 0.00)');
                                                            return gradient;
                                                        },
                                                        borderWidth: 2,
                                                        fill: true,
                                                        tension: 0.35,
                                                        pointBackgroundColor: '#ff6a00',
                                                        pointBorderColor: '#ffffff',
                                                        pointBorderWidth: 2,
                                                        pointRadius: 4,
                                                        pointHoverRadius: 7,
                                                    }
                                                ]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { display: false },
                                                    tooltip: {
                                                        mode: 'index',
                                                        intersect: false,
                                                        backgroundColor: '#0f172a',
                                                        titleColor: '#94a3b8',
                                                        bodyColor: '#ffffff',
                                                        borderColor: '#334155',
                                                        borderWidth: 1,
                                                        padding: 8,
                                                        displayColors: false,
                                                        callbacks: {
                                                            label: function(context) {
                                                                return `Price: ${currSymbol} ${context.parsed.y.toFixed(2)}`;
                                                            }
                                                        }
                                                    }
                                                },
                                                scales: {
                                                    x: {
                                                        grid: { display: false },
                                                        ticks: {
                                                            color: '#94a3b8',
                                                            font: { size: 10, weight: '500' }
                                                        }
                                                    },
                                                    y: {
                                                        min: minScale,
                                                        max: maxScale,
                                                        grid: { color: 'rgba(241, 245, 249, 0.8)' },
                                                        ticks: {
                                                            color: '#94a3b8',
                                                            font: { size: 10, weight: '500' },
                                                            callback: function(val) {
                                                                return `${currSymbol}${typeof val === 'number' ? val.toFixed(2) : val}`;
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                </div>

                {/* ── RIGHT COLUMN: Purchase Sidebar ── */}
                <div className={styles['pd-sidebar-card-new']}>
                    {/* 1. Supplier Card */}
                    <div className={styles['ps-sold-by-section']} style={{ padding: '20px', borderBottom: '1px solid var(--pd-border)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                            <div className={styles['ps-supplier-avatar']} style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                                {product.supplier?.logo ? (
                                    <img src={getImgUrl(product.supplier.logo)} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                    <span>{(product.supplier?.company_name || 'S')[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                {product.supplier && (
                                    <Link href={`/supplier/${product.supplier._id}`} className={styles['ps-sold-by-name']} style={{ fontSize: '16px', fontWeight: 800 }}>
                                        {product.supplier.company_name}
                                    </Link>
                                )}
                                {(isPlanVerified || isVerified) && (
                                    <span style={{ fontSize: '12px', color: '#0ea5e9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                        Verified Supplier
                                    </span>
                                )}
                            </div>
                        </div>
                        {!isOwner && product.supplier && (
                            <button 
                                className={styles['ps-message-btn']} 
                                onClick={() => user ? openChat(product.supplier, product) : openLogin()}
                                style={{ width: '100%', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Contact Supplier
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* 2. Quantity Section */}
                        <div className={styles['ps-quantity-section']} style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</span>
                                {displayStock !== -1 && (
                                    <span style={{ fontSize: '13px', color: displayStock > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                        {displayStock > 0 ? `${displayStock} Available` : 'Out of stock'}
                                    </span>
                                )}
                            </div>
                            <div className={styles['ps-qty-control-row']} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                <button
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                    disabled={displayStock === 0 || quantity <= 1}
                                    style={{ width: '40px', height: '40px', border: 'none', background: '#f8fafc', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #cbd5e1' }}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    min={1}
                                    max={displayStock !== -1 ? displayStock : undefined}
                                    disabled={displayStock === 0}
                                    onChange={e => handleQuantityChange(e.target.value)}
                                    style={{ flex: 1, border: 'none', background: 'transparent', textAlign: 'center', fontSize: '16px', fontWeight: 700, padding: '0', margin: '0' }}
                                />
                                <button
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                    disabled={displayStock === 0 || (displayStock !== -1 && quantity >= displayStock)}
                                    style={{ width: '40px', height: '40px', border: 'none', background: '#f8fafc', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #cbd5e1' }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* 3. Action Buttons */}
                        <div className={styles['ps-actions-block']}>
                            {isOwner ? (
                                <button className={styles['pd-btn-req-quote']} disabled>
                                    Own Product
                                </button>
                            ) : !isAvailableInRegion || displayStock === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                    <Link href={`/search?category=${product.category?._id}`} className={styles['pd-btn-buy-now']}>
                                        Find Similar
                                    </Link>
                                    
                                    {displayStock === 0 && (
                                        <div className={styles['notify-me-box']}>
                                            {!showNotifyMeForm ? (
                                                <button 
                                                    type="button"
                                                    className={styles['pd-btn-req-quote']}
                                                    onClick={() => setShowNotifyMeForm(true)}
                                                >
                                                    🔔 Alert Me When In Stock
                                                </button>
                                            ) : notifySuccess ? (
                                                <div className={styles['notify-success-text']}>
                                                    ✓ Subscribed for stock alerts!
                                                </div>
                                            ) : (
                                                <form onSubmit={handleSubscribeStock} className={styles['notify-me-form']} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <input 
                                                        type="email"
                                                        required
                                                        placeholder="Enter your email"
                                                        value={notifyEmail}
                                                        onChange={e => setNotifyEmail(e.target.value)}
                                                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                    <button 
                                                        type="submit"
                                                        disabled={notifySubmitting}
                                                        className={styles['pd-btn-add-cart']}
                                                    >
                                                        {notifySubmitting ? '...' : 'Notify'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <button className={styles['pd-btn-buy-now']} onClick={handleStartOrderClick}>
                                        Buy Now
                                    </button>
                                    <button 
                                        className={styles['pd-btn-add-cart']} 
                                        onClick={handleAddToCart}
                                    >
                                        {cartSuccess ? '✓ Added to Cart' : 'Add to Cart'}
                                    </button>
                                    <button 
                                        className={styles['pd-btn-req-quote']} 
                                        onClick={() => setIsEnquiryModalOpen(true)}
                                    >
                                        Request Quote
                                    </button>
                                </>
                            )}
                        </div>

                        {/* 4. Service Commitment Box */}
                        <div className={styles['pd-service-commitment']}>
                            <h4>Service Commitment</h4>
                            <div className={styles['pd-service-list']}>
                                <div className={styles['pd-service-item']}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    Free shipping
                                </div>
                                <div className={styles['pd-service-item']}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    Returns & refund policy
                                </div>
                                <div className={styles['pd-service-item']}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    Security & Privacy
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/*  FREQUENTLY BOUGHT TOGETHER                                    */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {frequentlyBoughtTogether.length > 0 && (
                <div style={{
                    margin: '32px 0',
                    padding: '28px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
                    border: '1px solid #f1f5f9',
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
                        <span>🛍️ Frequently Bought Together</span>
                        {(product?.bundle_discount ?? 0) > 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>Bundle Discount ({product?.bundle_discount}% Off)</span>
                        )}
                    </h3>
                    
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
                            <div style={{
                                width: '150px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1.5px solid #ff6600',
                                position: 'relative'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '6px',
                                    left: '6px',
                                    background: '#ff6600',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>THIS ITEM</span>
                                <img src={getImgUrl(product.main_image || product.images?.[0])} alt={product.name} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{product.name}</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ff6600', marginTop: '4px' }}>{convertPrice(activePrice).formatted}</div>
                            </div>

                            {frequentlyBoughtTogether.map((prod: any) => (
                                <React.Fragment key={prod._id}>
                                    <span style={{ fontSize: '24px', fontWeight: 300, color: '#94a3b8' }}>+</span>
                                    <div style={{
                                        width: '150px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        padding: '12px',
                                        background: '#fff',
                                        borderRadius: '12px',
                                        border: selectedBoughtTogether[prod._id] ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                                        opacity: selectedBoughtTogether[prod._id] ? 1 : 0.5,
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={!!selectedBoughtTogether[prod._id]}
                                            onChange={() => {
                                                setSelectedBoughtTogether(prev => ({
                                                    ...prev,
                                                    [prod._id]: !prev[prod._id]
                                                }));
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                cursor: 'pointer',
                                                accentColor: '#ff6600',
                                                width: '16px',
                                                height: '16px'
                                            }}
                                        />
                                        <img src={getImgUrl(prod.main_image || prod.images?.[0])} alt={prod.name} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{prod.name}</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>
                                            {convertPrice(prod.sale_price !== null && prod.sale_price !== undefined ? prod.sale_price : prod.price).formatted}
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        <div style={{
                            width: '280px',
                            padding: '20px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Bundle Price:</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                    {(product?.bundle_discount ?? 0) > 0 ? (
                                        <>
                                            <span style={{ fontSize: '0.875rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                                                {convertPrice(
                                                    activePrice +
                                                    frequentlyBoughtTogether
                                                        .filter(p => selectedBoughtTogether[p._id])
                                                        .reduce((sum, p) => sum + (p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.price), 0)
                                                ).formatted}
                                            </span>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff6600' }}>
                                                {convertPrice(
                                                    (activePrice +
                                                    frequentlyBoughtTogether
                                                        .filter(p => selectedBoughtTogether[p._id])
                                                        .reduce((sum, p) => sum + (p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.price), 0)) * (1 - ((product?.bundle_discount ?? 0) / 100))
                                                ).formatted}
                                            </span>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff6600' }}>
                                            {convertPrice(
                                                activePrice +
                                                frequentlyBoughtTogether
                                                    .filter(p => selectedBoughtTogether[p._id])
                                                    .reduce((sum, p) => sum + (p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.price), 0)
                                            ).formatted}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleAddToBoughtTogetherCart}
                                disabled={boughtTogetherSuccess}
                                style={{
                                    width: '100%',
                                    background: boughtTogetherSuccess ? '#16a34a' : 'var(--primary-color, #ff6600)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(255, 102, 0, 0.15)',
                                    transition: 'all 0.25s'
                                }}
                            >
                                {boughtTogetherSuccess ? '✓ Bundle Added!' : 'Add Bundle to Cart'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/*  RELATED PRODUCTS                                              */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {relatedProducts.length > 0 && (
                <div className={styles['pd-related-section']}>
                    <div className={styles['pd-related-header']}>
                        <h2>Related Products</h2>
                        <Link href={`/search?category=${product.category?._id}`} className={styles['pd-related-see-all']}>See all →</Link>
                    </div>
                    <div className={styles['pd-related-slider']} ref={relatedSliderRef}>
                        {relatedProducts.slice(0, 8).map((p: any) => (
                            <Link key={p._id} href={`/product/${p.slug || p._id}`} className={styles['pd-related-card']}>
                                <div className={styles['pd-rc-img']}>
                                    <img src={getImgUrl(p.main_image || p.images?.[0])} alt={p.name} loading="lazy" />
                                </div>
                                <div className={styles['pd-rc-body']}>
                                    <h4 className={styles['pd-rc-name']} title={p.name}>{p.name}</h4>
                                    <div className={styles['pd-rc-price']}>{convertPrice(p.main_price || p.price_tiers?.[0]?.price || 0).formatted}</div>
                                    {siteSettings?.rfq_enabled !== false && <div className={styles['pd-rc-moq']}>MOQ: {p.moq || 1} pcs</div>}
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className={styles['pd-related-nav']}>
                        <button onClick={() => relatedSliderRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}>‹</button>
                        <button onClick={() => relatedSliderRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}>›</button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/*  RECENTLY VIEWED + TRENDING (Full Width)                       */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {[
                { title: 'Recently Viewed', data: recentlyViewed.slice(0, 6) },
                { title: 'Trending Products', data: trendingProducts.slice(0, 6) }
            ].map((sec, si) => sec.data.length > 0 && (
                <div key={si} className={styles['pd-trending-section']}>
                    <div className={styles['pd-ts-header']}>
                        <h2>{sec.title}</h2>
                        <Link href="/search" className={styles['pd-related-see-all']}>View more →</Link>
                    </div>
                    <div className={styles['pd-trending-grid']}>
                        {sec.data.map((p: any) => (
                            <Link key={p._id} href={`/product/${p.slug || p._id}`} className={styles['pd-tc']}>
                                <div className={styles['pd-tc-img']}><img src={getImgUrl(p.main_image || p.images?.[0])} alt={p.name} loading="lazy" /></div>
                                <div className={styles['pd-tc-body']}>
                                    <h4 title={p.name}>{p.name}</h4>
                                    <div className={styles['pd-tc-price']}>{convertPrice(p.main_price || p.price_tiers?.[0]?.price || 0).formatted}</div>
                                    {siteSettings?.rfq_enabled !== false && <div className={styles['pd-tc-moq']}>MOQ: {p.moq || 1}</div>}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}

            {/* ── Booking Drawer ── */}
            <BookingDrawer
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                product={product}
                initialQuantity={quantity}
                initialVariants={selectedVariants}
                onConfirm={handleConfirmBooking}
            />

            {/* ── Customization Request Modal ── */}
            <CustomizationModal isOpen={isCustomizationModalOpen} onClose={() => setIsCustomizationModalOpen(false)} product={product} />

            {/* ── General Enquiry Modal ── */}
            <GeneralEnquiryModal isOpen={isEnquiryModalOpen} onClose={() => setIsEnquiryModalOpen(false)} product={product} />

            {/* ── Sample Modal ── */}
            {sampleModal && (
                <div className={styles['pd-modal-overlay']} onClick={() => setSampleModal(false)}>
                    <div className={styles['pd-modal-box']} onClick={e => e.stopPropagation()}>
                        <div className={styles['pd-modal-header']}>
                            <h3>Request a Sample</h3>
                            <button onClick={() => setSampleModal(false)}>✕</button>
                        </div>
                        <p className={styles['pd-modal-sub']}>Sample price: <strong>{convertPrice(product.sample_price || 0).formatted}</strong> / unit</p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (isOwner) {
                                showToast('Suppliers cannot request samples of their own products', 'error');
                                setSampleModal(false);
                                return;
                            }
                            setSampleLoading(true);
                            try { await api.post(`/products/${product._id}/request-sample`, { shipping_address: sampleAddress, note: sampleNote }); showToast('Sample request submitted!', 'success'); setSampleModal(false); }
                            catch (err: any) { showToast(err.response?.data?.message || 'Failed', 'error'); }
                            finally { setSampleLoading(false); }
                        }}>
                            <div className={styles['pd-modal-field']}><label>Shipping Address *</label><textarea required value={sampleAddress} onChange={e => setSampleAddress(e.target.value)} rows={4} placeholder="Full address, city, state, zip..." /></div>
                            <div className={styles['pd-modal-field']}><label>Note to Supplier</label><input value={sampleNote} onChange={e => setSampleNote(e.target.value)} placeholder="Specific requirements..." /></div>
                            <div className={styles['pd-modal-actions']}>
                                <button type="button" onClick={() => setSampleModal(false)} className={styles['pd-btn-outline']}>Cancel</button>
                                <button type="submit" disabled={sampleLoading} className={styles['pd-btn-primary']}>{sampleLoading ? 'Sending...' : 'Submit Request'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Full Screen Zoom ── */}
            {isFullScreenZoom && (
                <div className={styles['pd-fullscreen-overlay']} onClick={() => setIsFullScreenZoom(false)}>
                    <button className={styles['pd-fs-close']} onClick={() => setIsFullScreenZoom(false)}>✕</button>
                    <div className={styles['pd-fs-nav']}>
                        <button onClick={(e) => { e.stopPropagation(); const ni = (mainImageIdx - 1 + allImages.length) % allImages.length; setMainImage(getImgUrl(allImages[ni])); setMainImageIdx(ni); }}>‹</button>
                        <button onClick={(e) => { e.stopPropagation(); const ni = (mainImageIdx + 1) % allImages.length; setMainImage(getImgUrl(allImages[ni])); setMainImageIdx(ni); }}>›</button>
                    </div>
                    <img src={mainImage} alt="Zoom" onClick={e => e.stopPropagation()} />
                    <div className={styles['pd-fs-counter']}>{mainImageIdx + 1} / {allImages.length}</div>
                    {/* Caption for Alt Text */}
                    {(() => {
                        const currentImgUrl = allImages[mainImageIdx];
                        const matchingMeta = product?.images_metadata?.find((m: any) => 
                            m.url === currentImgUrl || 
                            (m.url && currentImgUrl && (m.url.endsWith(currentImgUrl) || currentImgUrl.endsWith(m.url)))
                        );
                        const activeAlt = matchingMeta?.alt || '';
                        if (activeAlt) {
                            return (
                                <div 
                                    className={styles['pd-fs-caption']}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        bottom: '140px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(0, 0, 0, 0.75)',
                                        color: '#fff',
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        maxWidth: '80%',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        zIndex: 3020
                                    }}
                                >
                                    {activeAlt}
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            )}
            {/* ── Cart Success Modal ── */}
            {showCartModal && (
                <div className={styles['pd-cart-modal-overlay']} onClick={() => setShowCartModal(false)}>
                    <div className={styles['pd-cart-modal']} onClick={e => e.stopPropagation()}>
                        <button className={styles['pd-modal-close']} onClick={() => setShowCartModal(false)}>✕</button>
                        <div className={styles['pd-cart-success-header']}>
                            <div className={styles['pd-success-circle']}>
                                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <h3>Added to Cart!</h3>
                        </div>
                        <div className={styles['pd-cart-item-preview']}>
                            <img src={mainImage} alt={product.name} />
                            <div className={styles['pd-cart-item-info']}>
                                <h4>{product.name}</h4>
                                <p>Quantity: {quantity}</p>
                                <p className={styles['pd-cart-item-price']}>{convertPrice(totalPrice).formatted}</p>
                            </div>
                        </div>
                        <div className={styles['pd-cart-modal-actions']}>
                            <button className={styles['pd-btn-outline']} onClick={() => setShowCartModal(false)}>Continue Shopping</button>
                            <button className={styles['pd-btn-primary']} onClick={() => navigate.push('/cart')}>View Cart & Checkout</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EMI Plans Modal Popup ── */}
            {showEmiPlansModal && (
                <div className={styles['pd-emi-modal-overlay']} onClick={() => setShowEmiPlansModal(false)}>
                    <div className={styles['pd-emi-modal']} onClick={e => e.stopPropagation()}>
                        <button className={styles['pd-emi-modal-close']} onClick={() => setShowEmiPlansModal(false)}>✕</button>
                        <h3 className={styles['pd-emi-modal-title']}>
                            💳 Available EMI / Installment Plans
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                            Choose from the following plans at checkout to pay in easy monthly installments.
                        </p>
                        <div className={styles['pd-emi-plans-list']}>
                            {eligiblePlans.map((plan: any) => {
                                const details = calculateEmiForPlan(plan, activePrice);
                                return (
                                    <div key={plan._id} className={styles['pd-emi-plan-card']}>
                                        <div className={styles['pd-emi-plan-header']}>
                                            <span className={styles['pd-emi-plan-name']}>{plan.name}</span>
                                            <span className={styles['pd-emi-plan-price']}>
                                                {convertPrice(details.monthly_installment).formatted}/mo
                                            </span>
                                        </div>
                                        <div className={styles['pd-emi-plan-details']}>
                                            <div className={styles['pd-emi-plan-detail-item']}>
                                                Interest Rate: <span className={styles['pd-emi-plan-detail-val']}>{plan.interest_rate}%</span>
                                            </div>
                                            <div className={styles['pd-emi-plan-detail-item']}>
                                                Months: <span className={styles['pd-emi-plan-detail-val']}>{plan.installments}</span>
                                            </div>
                                            <div className={styles['pd-emi-plan-detail-item']}>
                                                Processing Fee: <span className={styles['pd-emi-plan-detail-val']}>{convertPrice(plan.processing_fee || 0).formatted}</span>
                                            </div>
                                            <div className={styles['pd-emi-plan-detail-item']}>
                                                Total Payable: <span className={styles['pd-emi-plan-detail-val']}>{convertPrice(details.total_payable).formatted}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reviews Modal Popup ── */}
            {isReviewsModalOpen && (
                <div className={styles['pd-modal-overlay']} onClick={() => setIsReviewsModalOpen(false)}>
                    <div className={styles['pd-modal-box']} style={{ maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px 32px' }} onClick={e => e.stopPropagation()}>
                        <div className={styles['pd-modal-header']} style={{ marginBottom: '20px' }}>
                            <h3>Customer Reviews ({dynamicNumReviews})</h3>
                            <button onClick={() => setIsReviewsModalOpen(false)}>✕</button>
                        </div>
                        <div style={{ overflowY: 'auto', paddingRight: '8px', flex: 1 }}>
                            {displayReviews.length > 0 ? (
                                <>
                                    <div className={styles['pd-review-summary']} style={{ marginBottom: '28px' }}>
                                        <div className={styles['pd-review-big-score']}>
                                            <div className={styles['pd-review-score-num']}>{dynamicRating.toFixed(1)}</div>
                                            <StarRating rating={dynamicRating} size={22} />
                                            <div className={styles['pd-review-count-label']}>{dynamicNumReviews} Reviews</div>
                                        </div>
                                        <div className={styles['pd-review-bars']}>
                                            {ratingBreakdown.map(rb => (
                                                <RatingBar key={rb.label} label={rb.label} count={rb.count} total={dynamicNumReviews} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles['pd-review-list']}>
                                        {displayReviews.map((r, i) => {
                                            const reviewerName = r.buyer_id
                                                ? `${r.buyer_id.first_name || ''} ${r.buyer_id.last_name || ''}`.trim() || r.buyer_id.company_name || 'Buyer'
                                                : 'Buyer';
                                            const avatarChar = (reviewerName || 'B')[0].toUpperCase();
                                            return (
                                                <div className={styles['pd-review-item']} key={i}>
                                                    <div className={styles['pd-review-avatar']}>{avatarChar}</div>
                                                    <div className={styles['pd-review-body']}>
                                                        <div className={styles['pd-review-top']}>
                                                            <span className={styles['pd-reviewer-name']}>{reviewerName}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span className={styles['pd-review-date']}>{new Date(r.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                {r.buyer_id?._id !== user?._id && (
                                                                    <button 
                                                                        className={styles['pd-review-report-btn']}
                                                                        onClick={() => {
                                                                            if (!user) { openLogin(); return; }
                                                                            setReportingReviewId(r._id);
                                                                            setIsReportModalOpen(true);
                                                                        }}
                                                                        title="Report Review"
                                                                    >
                                                                        🚩 Report
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <StarRating rating={r.rating} size={13} />
                                                        <p className={styles['pd-review-comment']}>{r.comment}</p>
                                                        {((r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)) && (
                                                            <>
                                                                {r.images && r.images.length > 0 && (
                                                                    <div className={styles['pd-review-imgs']}>
                                                                        {r.images.map((img: string, j: number) => (
                                                                            <img 
                                                                                key={j} 
                                                                                src={getImgUrl(img)} 
                                                                                alt="review" 
                                                                                onClick={() => setLightboxImage(img)}
                                                                                style={{ cursor: 'zoom-in' }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {r.videos && r.videos.length > 0 && (
                                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '10px' }}>
                                                                        {r.videos.map((vid: string, k: number) => (
                                                                            <video 
                                                                                key={k} 
                                                                                src={getImgUrl(vid)} 
                                                                                controls 
                                                                                style={{ width: '120px', maxHeight: '90px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#000' }} 
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        {r.reply_comment && (
                                                            <div className={styles['pd-review-reply']}>
                                                                <div className={styles['pd-review-reply-header']}>
                                                                    <span className={styles['pd-review-reply-author']}>Supplier Response</span>
                                                                    <span className={styles['pd-review-reply-date']}>
                                                                        {new Date(r.reply_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                                <p className={styles['pd-review-reply-comment']}>{r.reply_comment}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className={styles['pd-empty-tab']} style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <svg width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <p>No reviews yet. Be the first to review this product!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Report Review Modal Popup ── */}
            {isReportModalOpen && (
                <div className={styles['pd-modal-overlay']} onClick={() => { setIsReportModalOpen(false); setReportingReviewId(null); }}>
                    <div className={styles['pd-modal-box']} style={{ maxWidth: '450px', padding: '24px 32px' }} onClick={e => e.stopPropagation()}>
                        <div className={styles['pd-modal-header']} style={{ marginBottom: '16px' }}>
                            <h3>Report Review</h3>
                            <button onClick={() => { setIsReportModalOpen(false); setReportingReviewId(null); }}>✕</button>
                        </div>
                        <form onSubmit={handleReportSubmit}>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                                Please select the reason why you are reporting this review. The platform administrators will moderate the flagged content.
                              </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                {['Spam', 'Harassment', 'Inaccurate', 'Inappropriate Content', 'Other'].map((reason) => (
                                    <label 
                                        key={reason} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            fontSize: '13.5px', 
                                            fontWeight: '600', 
                                            cursor: 'pointer',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid',
                                            borderColor: reportReason === reason ? 'var(--primary-color)' : '#e2e8f0',
                                            background: reportReason === reason ? 'rgba(13, 46, 103, 0.02)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="reportReason"
                                            value={reason}
                                            checked={reportReason === reason}
                                            onChange={() => setReportReason(reason)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {reason}
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setIsReportModalOpen(false); setReportingReviewId(null); }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '20px',
                                        border: '1.5px solid #e2e8f0',
                                        background: '#fff',
                                        color: '#475569',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReport}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                    }}
                                >
                                    {isSubmittingReport ? (
                                        <>
                                            <div style={{ width: '12px', height: '12px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Report'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Social Media Sharing Modal */}
            {isShareModalOpen && (
                <div className={styles['pd-share-overlay']} onClick={() => setIsShareModalOpen(false)}>
                    <div className={styles['pd-share-modal-box']} onClick={e => e.stopPropagation()}>
                        <div className={styles['pd-share-modal-header']}>
                            <h3 className={styles['pd-share-modal-title']}>Share this Product</h3>
                            <button 
                                onClick={() => setIsShareModalOpen(false)}
                                className={styles['pd-share-modal-close']}
                            >✕</button>
                        </div>
                        
                        <p className={styles['pd-share-modal-subtitle']}>
                            Select a platform to share this premium product listing:
                        </p>
                        
                        <div className={styles['pd-share-grid-premium']}>
                            {[
                                { name: 'Facebook', key: 'fb', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}` },
                                { name: 'X / Twitter', key: 'x', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(product?.name || '')}` },
                                { name: 'LinkedIn', key: 'ln', icon: <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}` },
                                { name: 'WhatsApp', key: 'wa', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, url: `https://api.whatsapp.com/send?text=${encodeURIComponent((product?.name || '') + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}` },
                                { name: 'Pinterest', key: 'pin', icon: <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.905 2.167-2.905 1.024 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.168 1.777 2.168 2.133 0 3.772-2.249 3.772-5.493 0-2.87-2.064-4.877-5.024-4.877-3.424 0-5.433 2.568-5.433 5.219 0 1.036.398 2.146.896 2.746.099.12.112.225.083.348-.09.374-.291 1.189-.331 1.353-.053.213-.175.258-.404.152-1.507-.699-2.449-2.898-2.449-4.662 0-3.799 2.758-7.29 7.962-7.29 4.18 0 7.428 2.977 7.428 6.96 0 4.153-2.617 7.5-6.25 7.5-1.22 0-2.37-.635-2.76-1.378l-.75 2.86c-.27 1.034-1.002 2.329-1.492 3.13 1.12.348 2.31.539 3.549.539 6.621 0 11.988-5.367 11.988-11.99C24.006 5.367 18.639 0 12.017 0z"/></svg>, url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&media=${encodeURIComponent(product?.main_image ? getImgUrl(product.main_image) : '')}&description=${encodeURIComponent(product?.name || '')}` }
                            ].map(item => (
                                <a 
                                    key={item.name}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles['pd-share-card'] + ' ' + styles[item.key]}
                                >
                                    <div className={styles['pd-share-icon-container']} style={{ background: item.key === 'fb' ? '#1877f2' : item.key === 'x' ? '#000000' : item.key === 'ln' ? '#0a66c2' : item.key === 'wa' ? '#25d366' : '#bd081c' }}>
                                        {item.icon}
                                    </div>
                                    <span>{item.name}</span>
                                </a>
                            ))}

                            {/* Copy Link Card */}
                            <div 
                                onClick={handleCopyLinkOnly}
                                className={styles['pd-share-card'] + ' ' + styles['copylink']}
                            >
                                <div className={styles['pd-share-icon-container']} style={{ background: '#64748b' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </div>
                                <span>Copy Link</span>
                            </div>
                        </div>

                        {/* QR Code Container */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                alt="Product QR Code" 
                                style={{ width: '150px', height: '150px', borderRadius: '8px', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                            />
                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontWeight: '600' }}>Scan QR code to open on your mobile device</span>
                        </div>

                        {/* Link Input Row */}
                        <div className={styles['pd-share-copylink-bar']}>
                            <svg className={styles['pd-share-copy-chain-icon']} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            <input 
                                readOnly 
                                value={typeof window !== 'undefined' ? window.location.href : ''} 
                                className={styles['pd-share-copylink-input']}
                            />
                            <button 
                                onClick={handleCopyLinkOnly}
                                className={styles['pd-share-copy-button-premium'] + (copied ? ' ' + styles['copied'] : '')}
                            >
                                {copied ? (
                                    <>
                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        Copied
                                    </>
                                ) : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox for review images */}
            {lightboxImage && (
                <div 
                    onClick={() => setLightboxImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5000,
                        cursor: 'zoom-out'
                    }}
                >
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(null);
                        }}
                        style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '32px',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            zIndex: 5001
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        aria-label="Close image"
                    >
                        &times;
                    </button>
                    <img 
                        src={getImgUrl(lightboxImage)} 
                        alt="Enlarged review photo" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            maxWidth: '90%', 
                            maxHeight: '90%', 
                            objectFit: 'contain', 
                            borderRadius: '12px', 
                            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                            cursor: 'default'
                        }} 
                    />
                </div>
            )}
        </div>
    );
};


export default ProductDetail;
