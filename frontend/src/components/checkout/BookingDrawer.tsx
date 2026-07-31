import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import api from '@/services/axiosConfig';
import styles from './BookingDrawer.module.css';

const ShippingModal = ({ isOpen, onClose, services, currentId, onSelect, totalQuantity, convertPrice, countryName }: { isOpen: boolean; onClose: () => void; services: any[]; currentId: any; onSelect: (id: any) => void; totalQuantity: number; convertPrice: any; countryName: string }) => {
    const [selectedId, setSelectedId] = useState(currentId);

    useEffect(() => {
        setSelectedId(currentId);
    }, [currentId, isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        onSelect(selectedId);
        onClose();
    };

    return (
        <div className={styles['shipping-modal-overlay']} onClick={onClose}>
            <div className={styles['shipping-modal-box']} onClick={e => e.stopPropagation()}>
                <div className={styles['shipping-modal-header']}>
                    <h3>Select shipping service</h3>
                    <button className={styles['shipping-modal-close']} onClick={onClose}>✕</button>
                </div>
                <div className={styles['shipping-modal-body']}>
                    <p className={styles['shipping-modal-subtext']}>Ship from <strong>China</strong>; Deliver to <strong>{countryName || 'Global'}</strong>; Quantity: <strong>{totalQuantity} piece{totalQuantity > 1 ? 's' : ''}</strong></p>

                    <div className={styles['shipping-services-list']}>
                        {services.map((s: any) => {
                            const fee = s.baseFee + (totalQuantity * s.unitFee);
                            const perPiece = fee / (totalQuantity || 1);

                            const d1 = new Date();
                            d1.setDate(d1.getDate() + s.minDays);
                            const d2 = new Date();
                            d2.setDate(d2.getDate() + s.maxDays);

                            const dateStr = `${d1.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${d2.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;

                            return (
                                    <div key={s.id} className={`${styles['shipping-service-item']} ${selectedId === s.id ? styles['active'] : ''}`}
                                    onClick={() => setSelectedId(s.id)}
                                >
                                    <div className={styles['ss-radio']}>
                                        <div className={`${styles['ss-radio-inner']} ${selectedId === s.id ? styles['checked'] : ''}`} />
                                    </div>
                                    <div className={styles['ss-info']}>
                                        <div className={styles['ss-name']}>
                                            {s.name.includes('Alibaba.com') ? (
                                                <>
                                                    {s.name.split('Alibaba.com')[0]}
                                                    <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Alibaba.com</span>
                                                    {s.name.split('Alibaba.com')[1]}
                                                </>
                                            ) : s.name}
                                        </div>
                                        <div className={styles['ss-delivery']}>
                                            Guaranteed delivery: <strong>{dateStr}</strong>
                                        </div>
                                    </div>
                                    <div className={styles['ss-price']}>
                                        {convertPrice(fee).formatted} <span className={styles['ss-price-sub']}>({convertPrice(perPiece).formatted}/piece)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className={styles['shipping-modal-footer']}>
                    <button className={styles['ss-apply-btn']} onClick={handleApply}>Apply</button>
                </div>
            </div>
        </div>
    );
};


const BookingDrawer = ({ isOpen, onClose, product, initialQuantity, initialVariants, onConfirm }: { isOpen: boolean; onClose: () => void; product: any; initialQuantity: number; initialVariants: any; onConfirm: (data: any) => void }) => {
    const navigate = useRouter();
    const { convertPrice, user, siteSettings } = useAuth();

    const [quantity, setQuantity] = useState(initialQuantity || 1);
    const [selectedVariants, setSelectedVariants] = useState<any>({});
    const [variantQtys, setVariantQtys] = useState<any>({});

    // Dynamic Shipping States
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [loadingShipping, setLoadingShipping] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(user?.country_code || 'US');
    const [selectedCountryName, setSelectedCountryName] = useState('Global');

    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [selectedShippingId, setSelectedShippingId] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(false);
    
    // Derived state
    const groupedVariants = product?.variants?.reduce((acc: any, variant: any) => {
        if (!acc[variant.name]) acc[variant.name] = [];
        acc[variant.name].push(variant);
        return acc;
    }, {}) || {};

    const hasVariants = Object.keys(groupedVariants).length > 0;
    const totalQuantity: number = hasVariants
        ? (Object.values(variantQtys) as any[]).reduce((a: number, b: number) => a + b, 0)
        : quantity;

    // Fetch Shipping Rules
    useEffect(() => {
        const fetchShippingRules = async () => {
            try {
                setLoadingShipping(true);
                let services = [];

                // 1. Try Distance-based Calculation (falls back to country rules if coordinates are missing)
                if (product?.supplier?._id) {
                    try {
                        const distRes = await api.post('/common/shipping/calculate', {
                            product_id: product._id,
                            supplier_id: product.supplier._id,
                            buyer_lat: user?.lat || 0,
                            buyer_lng: user?.lng || 0,
                            dest_country: selectedCountry,
                            quantity: totalQuantity
                        });
                        
                        if (distRes.data.shipping_methods && distRes.data.shipping_methods.length > 0) {
                            services = distRes.data.shipping_methods.map((m: any) => ({
                                id: m.id,
                                name: m.name,
                                baseFee: parseFloat(m.total_cost) - (totalQuantity * parseFloat(m.cost_per_piece || 0) / 10), // approximate breakdown
                                unitFee: parseFloat(m.cost_per_piece),
                                minDays: m.minDays,
                                maxDays: m.maxDays,
                                label: m.name
                            }));
                        }
                    } catch (distErr: any) {
                        // Fallback to country-based shipping rules.
                    }
                }

                // 2. Fallback to Country-based Rules if no distance rules or no coordinates
                if (services.length === 0) {
                    const res = await api.get(`/common/shipping-rules?country_code=${selectedCountry}`);
                    if (res.data.length > 0) {
                        setSelectedCountryName(res.data[0].country_name);
                    }
                    
                    services = res.data.map((rule: any) => ({
                        id: rule._id,
                        name: rule.carrier,
                        baseFee: rule.base_cost,
                        unitFee: rule.cost_per_kg * (product.weight || 1),
                        minDays: rule.estimated_days_min,
                        maxDays: rule.estimated_days_max,
                        label: rule.carrier
                    }));
                }

                // 3. Final Default Fallback
                if (services.length === 0) {
                    services.push({
                        id: 'default',
                        name: 'Logistics Service',
                        baseFee: 50,
                        unitFee: 5 * (product.weight || 1),
                        minDays: 14,
                        maxDays: 30,
                        label: 'Standard'
                    });
                }

                setAvailableServices(services);
                setSelectedShippingId(services[0].id);
            } catch (err) {
                console.error('Error fetching shipping rules:', err);
            } finally {
                setLoadingShipping(false);
            }
        };

        if (isOpen && product) {
            fetchShippingRules();
        }
    }, [isOpen, selectedCountry, product, user?.lat, user?.lng, totalQuantity]);


    useEffect(() => {
        if (isOpen) {
            const isB2C = siteSettings?.rfq_enabled === false;
            const initialQty = initialQuantity || (isB2C ? 1 : (product?.moq || 1));
            setQuantity(initialQty);

            // Auto-populate the selected variant from the product page with the initial quantity
            if (initialVariants && Object.keys(initialVariants).length > 0) {
                const initialVQs: any = {};
                Object.values(initialVariants).forEach((val: any) => {
                    initialVQs[val] = initialQty;
                });
                setVariantQtys(initialVQs);
            } else {
                setVariantQtys({});
            }
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, initialQuantity, initialVariants, product]);

    if (!product) return null;

    // Compute active tier
    const sortedTiers = (siteSettings?.rfq_enabled !== false && product.price_tiers?.length > 0)
        ? [...product.price_tiers].sort((a: any, b: any) => a.min_quantity - b.min_quantity)
        : [{ min_quantity: 1, price: product.main_price || 0 }];

    let currentTierPrice = product.main_price;
    let activeTierIdx = 0;
    sortedTiers.forEach((tier: any, i: number) => {
        if (totalQuantity >= tier.min_quantity) {
            currentTierPrice = tier.price;
            activeTierIdx = i;
        }
    });

    const itemSubtotal = currentTierPrice * totalQuantity;
    const selectedService: any = availableServices.find((s: any) => s.id === selectedShippingId) || availableServices[0] || { baseFee: 0, unitFee: 0, minDays: 0, maxDays: 0, name: '' };
    const shippingFee = totalQuantity > 0 ? (selectedService.baseFee + (totalQuantity * selectedService.unitFee)) : 0;
    const subtotal = itemSubtotal + shippingFee;

    // Estimated delivery 
    const d1 = new Date();
    d1.setDate(d1.getDate() + (selectedService.minDays || 0));
    const d2 = new Date();
    d2.setDate(d2.getDate() + (selectedService.maxDays || 0));
    const deliveryStr = d2.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    const handleConfirm = () => {
        if (totalQuantity === 0) return alert('Please select a quantity greater than 0.');
        onConfirm({ quantity: totalQuantity, variantQtys, unitPrice: currentTierPrice, shippingFee, orderTotal: subtotal, shippingAddress: null });
    };

    const handleVariantQty = (vValue: any, delta: any) => {
        setVariantQtys((prev: any) => {
            const current = prev[vValue] || 0;
            const next = current + delta;
            if (next <= 0) {
                const newQtys = { ...prev };
                delete newQtys[vValue];
                return newQtys;
            }
            return { ...prev, [vValue]: next };
        });
    };

    return (
        <>
            <div className={`${styles['drawer-overlay']} ${isOpen ? styles['active'] : ''}`} onClick={onClose} />
            <div className={`${styles['booking-drawer']} ${isOpen ? styles['open'] : ''}`}>

                {/* Header */}
                <div className={styles['drawer-header']}>
                    <h3>Select variations and quantity</h3>
                    <button className={styles['close-drawer']} onClick={onClose}>✕</button>
                </div>

                {/* Scrollable Body */}
                <div className={styles['drawer-body']}>

                    {/* Lower priced badge */}
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ background: '#000', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '4px', display: 'inline-block' }}>
                            Lower priced than similar
                        </span>
                    </div>

                    {/* Price Tiers (Horizontal) */}
                    {siteSettings?.rfq_enabled !== false && (
                        <div style={{ display: 'flex', gap: '30px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                            {sortedTiers.map((tier, idx) => {
                                const nextTier = sortedTiers[idx + 1];
                                const rangeText = nextTier ? `${tier.min_quantity} - ${nextTier.min_quantity - 1} ${product.unit || 'sets'}` : `>= ${tier.min_quantity} ${product.unit || 'sets'}`;
                                const isActive = activeTierIdx === idx;
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: isActive ? `3px solid #111` : 'none', paddingBottom: '8px' }}>
                                        <div style={{ fontSize: '11px', color: isActive ? '#111' : '#666', fontWeight: isActive ? '800' : '400' }}>
                                            {rangeText}
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: '900', color: isActive ? '#111' : '#444' }}>
                                            {convertPrice(tier.price).formatted}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Variations with inline qty */}
                    {Object.keys(groupedVariants).map((varName: string) => (
                        <div key={varName} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f5f5f5' }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#111', marginBottom: '16px' }}>
                                {varName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {groupedVariants[varName].map((v: any, i: number) => {
                                    const qty = variantQtys[v.value] || 0;
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {/* Swatch Image */}
                                                <div style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', padding: '2px', background: '#fff' }}>
                                                    {v.image ? (
                                                        <img src={getImgUrl(v.image)} alt={v.value} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontSize: '10px' }}>{v.value.substring(0, 2)}</div>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '13px', color: '#333' }}>{v.value}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <span style={{ fontSize: '13px', color: '#333' }}>
                                                    {convertPrice(currentTierPrice + (v.price_modifier || 0)).formatted}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${qty > 0 ? '#111' : '#ddd'}`, borderRadius: '20px', overflow: 'hidden', height: '32px', transition: 'all 0.2s' }}>
                                                    <button onClick={() => handleVariantQty(v.value, -1)} style={{ width: '32px', height: '100%', border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                    <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: qty > 0 ? '#111' : '#333' }}>{qty}</span>
                                                    <button onClick={() => handleVariantQty(v.value, 1)} style={{ width: '32px', height: '100%', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '16px', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #ddd' }}>+</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quantity (if no variants) */}
                    {Object.keys(groupedVariants).length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700' }}>Quantity</span>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                <button onClick={() => setQuantity(Math.max(siteSettings?.rfq_enabled === false ? 1 : (product.moq || 1), quantity - 1))} style={{ width: '36px', height: '36px', border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>−</button>
                                <input type="number" value={quantity} onChange={e => setQuantity(Math.max(siteSettings?.rfq_enabled === false ? 1 : (product.moq || 1), Number(e.target.value)))} style={{ width: '48px', textAlign: 'center', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600' }} />
                                <button onClick={() => setQuantity(quantity + 1)} style={{ width: '36px', height: '36px', border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>+</button>
                            </div>
                        </div>
                    )}

                    {/* Shipping Section */}
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Shipping</div>
                        <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                                        {selectedService.name.includes('Alibaba.com') ? (
                                            <>
                                                {selectedService.name.split('Alibaba.com')[0]}
                                                <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Alibaba.com</span>
                                                {selectedService.name.split('Alibaba.com')[1]}
                                            </>
                                        ) : selectedService.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#555' }}>
                                        Shipping fee: {convertPrice(shippingFee).formatted} for {totalQuantity} set{totalQuantity > 1 ? 's' : ''}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                                        Guaranteed delivery by <strong>{deliveryStr}</strong>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsShippingModalOpen(true)}
                                    style={{ fontSize: '12px', color: '#333', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                                >
                                    Change &gt;
                                </button>
                            </div>
                        </div>
                    </div>



                </div>

                {/* Sticky Footer */}
                <div className={styles['drawer-footer']}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#000' }}>Subtotal</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#000' }}>
                                {convertPrice(subtotal).formatted}
                            </span>
                            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setShowBreakdown(!showBreakdown)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{ transform: showBreakdown ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}><path d="M18 15l-6-6-6 6" /></svg>
                            </span>
                        </div>
                    </div>

                    {showBreakdown && (
                        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#666' }}>Item subtotal</span>
                                <span style={{ color: '#000', fontWeight: '600' }}>{convertPrice(itemSubtotal).formatted}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Shipping fee (to {selectedCountryName})</span>
                                <span style={{ color: '#000', fontWeight: '600' }}>{convertPrice(shippingFee).formatted}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleConfirm}
                        disabled={totalQuantity === 0}
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            background: totalQuantity > 0 ? 'var(--primary-color)' : '#f5f5f5', 
                            color: totalQuantity > 0 ? '#fff' : '#aaa', 
                            border: 'none', 
                            borderRadius: '30px', 
                            fontWeight: '800', 
                            fontSize: '15px', 
                            cursor: totalQuantity > 0 ? 'pointer' : 'not-allowed', 
                            transition: 'all 0.2s', 
                            boxShadow: totalQuantity > 0 ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' 
                        }}
                    >
                        Start order
                    </button>
                </div>

            </div>
            <ShippingModal
                isOpen={isShippingModalOpen}
                onClose={() => setIsShippingModalOpen(false)}
                services={availableServices}
                currentId={selectedShippingId}
                onSelect={(id: any) => setSelectedShippingId(id)}
                totalQuantity={totalQuantity}
                convertPrice={convertPrice}
                countryName={selectedCountryName}
            />
        </>
    );
};

export default BookingDrawer;
