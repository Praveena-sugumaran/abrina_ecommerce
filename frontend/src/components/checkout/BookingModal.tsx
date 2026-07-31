import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './BookingModal.module.css';

const BookingModal = ({ isOpen, onClose, product, initialQuantity, initialVariants, onConfirm }: { isOpen: boolean; onClose: () => void; product: any; initialQuantity: number; initialVariants: any; onConfirm: (data: any) => void }) => {
    const navigate = useRouter();
    const { convertPrice, siteSettings } = useAuth();

    // States
    const [quantity, setQuantity] = useState(initialQuantity || 1);
    const [selectedVariants, setSelectedVariants] = useState(initialVariants || {});

    // Group variants by name (e.g., Language -> [English, Spanish], Software -> [Ubox, Android])
    const groupedVariants = product?.variants?.reduce((acc: any, variant: any) => {
        if (!acc[variant.name]) acc[variant.name] = [];
        acc[variant.name].push(variant);
        return acc;
    }, {}) || {};

    // Sync state if props change when reopened
    useEffect(() => {
        if (isOpen) {
            const isB2C = siteSettings?.rfq_enabled === false;
            setQuantity(initialQuantity || (isB2C ? 1 : (product?.moq || 1)));
            setSelectedVariants(initialVariants || {});
        }
    }, [isOpen, initialQuantity, initialVariants, product, siteSettings]);

    if (!isOpen || !product) return null;

    // --- Calculations ---

    // Find the applicable price tier based on quantity
    let currentTierPrice = product.main_price;
    let selectedTierIndex = -1;

    if (product.price_tiers && product.price_tiers.length > 0) {
        const sortedTiers = [...product.price_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
        for (let i = 0; i < sortedTiers.length; i++) {
            if (quantity >= sortedTiers[i].min_quantity) {
                currentTierPrice = sortedTiers[i].price;
                selectedTierIndex = i;
            }
        }
    }

    // Add variant price modifier to base price if a variant is selected
    let unitPrice = currentTierPrice;
    if (product.variants && product.variants.length > 0) {
        Object.entries(selectedVariants).forEach(([varName, varVal]) => {
            const v: any = product.variants.find((x: any) => x.name === varName && x.value === varVal);
            if (v && v.price_modifier) {
                unitPrice += v.price_modifier;
            }
        });
    }

    const itemSubtotal = unitPrice * quantity;

    // Mock Shipping Logic (for demo purposes)
    const baseShipping = 25; // Base shipping cost
    const perItemShipping = 2.5; // Additional cost per item
    const shippingFee = baseShipping + (quantity * perItemShipping);
    const orderTotal = itemSubtotal + shippingFee;

    const handleQuantityChange = (val: any) => {
        const minQty = siteSettings?.rfq_enabled === false ? 1 : (product.moq || 1);
        setQuantity(Math.max(minQty, val));
    };

    const handleVariantSelect = (name: any, val: any) => {
        setSelectedVariants((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleStartOrder = () => {
        onConfirm({
            quantity,
            selectedVariants,
            unitPrice,
            shippingFee,
            orderTotal
        });
    };

    // Calculate variations count for summary text
    const selectedVariantCount = Object.keys(selectedVariants).length;
    let variationText = "No variation selected";
    if (selectedVariantCount > 0) {
        variationText = `(${selectedVariantCount} variation${selectedVariantCount > 1 ? 's' : ''}, ${quantity} item${quantity > 1 ? 's' : ''})`;
    } else {
        variationText = `(${quantity} item${quantity > 1 ? 's' : ''})`;
    }

    return (
        <div className={styles['booking-modal-overlay'] + " " + styles['flex'] + " " + styles['items-center'] + " " + styles['justify-center'] + " " + styles['fixed'] + " " + styles['inset-0'] + " " + styles['z-50'] + " " + styles['bg-black/50']}>
            <div className={styles['booking-modal-content'] + " " + styles['bg-white'] + " " + styles['w-full'] + " " + styles['max-w-lg'] + " " + styles['rounded-xl'] + " " + styles['shadow-2xl'] + " " + styles['flex'] + " " + styles['flex-col'] + " " + styles['max-h-[90vh]']}>

                {/* Header */}
                <div className={styles['booking-modal-header'] + " " + styles['p-4'] + " " + styles['border-b'] + " " + styles['relative'] + " " + styles['flex'] + " " + styles['justify-center'] + " " + styles['items-center']}>
                    <h2 className={styles['text-lg'] + " " + styles['font-bold'] + " " + styles['text-gray-800']}>Select variations and quantity</h2>
                    <button
                        onClick={onClose}
                        className={styles['absolute'] + " " + styles['right-4'] + " " + styles['top-4'] + " " + styles['text-gray-400'] + " " + styles['hover:text-gray-800'] + " " + styles['focus:outline-none']}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className={styles['booking-modal-body'] + " " + styles['p-6'] + " " + styles['overflow-y-auto'] + " " + styles['flex-1']}>

                    {/* Price Tiers Matrix */}
                    {siteSettings?.rfq_enabled !== false && product.price_tiers && product.price_tiers.length > 0 ? (
                        <div className={styles['bm-price-tiers'] + " " + styles['mb-6']}>
                            <div className={styles['flex'] + " " + styles['gap-4'] + " " + styles['border-b'] + " " + styles['outline-none'] + " " + styles['select-none'] + " " + styles['pb-4']}>
                                {product.price_tiers.sort((a: any, b: any) => a.min_quantity - b.min_quantity).map((tier: any, idx: number) => {
                                    const isSelectedTier = idx === selectedTierIndex || (selectedTierIndex === -1 && idx === 0);

                                    return (
                                        <div key={idx} className={`flex-1 transition-opacity ${isSelectedTier ? 'opacity-100' : 'opacity-40'}`}>
                                            {isSelectedTier && idx === 0 && (
                                                <div className={styles['bg-[var(--primary-color)]'] + " " + styles['text-white'] + " " + styles['text-[10px]'] + " " + styles['uppercase'] + " " + styles['font-bold'] + " " + styles['px-1.5'] + " " + styles['py-0.5'] + " " + styles['inline-block'] + " " + styles['rounded'] + " " + styles['mb-1'] + " " + styles['whitespace-nowrap']}>
                                                    Lower priced than similar
                                                </div>
                                            )}
                                            {!isSelectedTier && idx === 0 && <div className={styles['h-[18px]'] + " " + styles['mb-1']}></div>}

                                            <div className={styles['text-xs'] + " " + styles['text-gray-500'] + " " + styles['mb-1'] + " " + styles['font-medium']}>
                                                {tier.min_quantity}{tier.max_quantity ? ` - ${tier.max_quantity}` : '+'} pieces
                                            </div>
                                            <div className={`text-xl font-bold ${isSelectedTier ? 'text-[var(--primary-color)]' : 'text-gray-800'}`}>
                                                {convertPrice(tier.price).formatted}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className={styles['bm-single-price'] + " " + styles['mb-6'] + " " + styles['border-b'] + " " + styles['pb-4']}>
                            <div className={styles['text-2xl'] + " " + styles['font-bold'] + " " + styles['text-[var(--primary-color)]']}>
                                {convertPrice(product.main_price).formatted}
                            </div>
                        </div>
                    )}

                    {/* Variations */}
                    {Object.keys(groupedVariants).map((varName: string) => (
                        <div key={varName} className={styles['bm-variant-group'] + " " + styles['mb-6']}>
                            <h3 className={styles['text-sm'] + " " + styles['font-bold'] + " " + styles['text-gray-800'] + " " + styles['mb-3']}>{varName}: <span className={styles['font-normal'] + " " + styles['text-gray-500']}>{selectedVariants[varName] || ''}</span></h3>
                            <div className={styles['flex'] + " " + styles['flex-wrap'] + " " + styles['gap-2']}>
                                {groupedVariants[varName].map((v: any, i: number) => {
                                    const isActive = selectedVariants[varName] === v.value;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleVariantSelect(varName, v.value)}
                                            className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${isActive
                                                ? 'border-gray-800 text-gray-800 font-medium'
                                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                                }`}
                                        >
                                            {v.value} {v.price_modifier ? `(${v.price_modifier > 0 ? '+' : ''}${convertPrice(v.price_modifier).formatted})` : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quantity Row */}
                    <div className={styles['bm-quantity-row'] + " " + styles['flex'] + " " + styles['justify-end'] + " " + styles['items-center'] + " " + styles['mb-8'] + " " + styles['pt-4'] + " " + styles['pb-2']}>
                        <div className={styles['flex'] + " " + styles['items-center'] + " " + styles['gap-4']}>
                            <span className={styles['font-medium'] + " " + styles['text-gray-800'] + " " + styles['text-sm']}>{convertPrice(unitPrice).formatted}</span>
                            <div className={styles['flex'] + " " + styles['rounded'] + " " + styles['border'] + " " + styles['border-gray-300'] + " " + styles['overflow-hidden'] + " " + styles['h-8']}>
                                <button
                                    className={styles['w-8'] + " " + styles['flex'] + " " + styles['items-center'] + " " + styles['justify-center'] + " " + styles['bg-white'] + " " + styles['hover:bg-gray-50'] + " " + styles['text-gray-500'] + " " + styles['text-lg'] + " " + styles['border-r'] + " " + styles['border-gray-300'] + " " + styles['outline-none'] + " " + styles['focus:outline-none'] + " " + styles['select-none'] + " " + styles['transition-colors']}
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                >
                                    −
                                </button>
                                <input
                                    className={styles['w-12'] + " " + styles['text-center'] + " " + styles['text-sm'] + " " + styles['font-medium'] + " " + styles['text-gray-800'] + " " + styles['outline-none'] + " " + styles['border-none'] + " " + styles['py-1'] + " " + styles['m-0'] + " " + styles['appearance-none'] + " " + styles['bg-white']}
                                    type="number"
                                    min={siteSettings?.rfq_enabled === false ? 1 : (product.moq || 1)}
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || (siteSettings?.rfq_enabled === false ? 1 : (product.moq || 1)))}
                                />
                                <button
                                    className={styles['w-8'] + " " + styles['flex'] + " " + styles['items-center'] + " " + styles['justify-center'] + " " + styles['bg-white'] + " " + styles['hover:bg-gray-50'] + " " + styles['text-gray-500'] + " " + styles['text-lg'] + " " + styles['border-l'] + " " + styles['border-gray-300'] + " " + styles['outline-none'] + " " + styles['focus:outline-none'] + " " + styles['select-none'] + " " + styles['transition-colors']}
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Section */}
                    <div className={styles['bm-shipping'] + " " + styles['mb-4']}>
                        <h3 className={styles['text-base'] + " " + styles['font-bold'] + " " + styles['text-gray-800'] + " " + styles['mb-3']}>Shipping</h3>
                        <div className={styles['bg-[#F7F8FA]'] + " " + styles['rounded-md'] + " " + styles['p-4'] + " " + styles['cursor-pointer'] + " " + styles['hover:bg-gray-100'] + " " + styles['transition-colors'] + " " + styles['group']}>
                            <div className={styles['flex'] + " " + styles['justify-between'] + " " + styles['items-start'] + " " + styles['mb-1']}>
                                <div className={styles['font-medium'] + " " + styles['text-sm'] + " " + styles['text-gray-900']}>
                                    Standard <span className={styles['text-[#F60]'] + " " + styles['font-bold']}>Alibaba.com</span> <span className={styles['text-gray-500'] + " " + styles['font-normal']}>Logistics</span>
                                </div>
                                <div className={styles['text-xs'] + " " + styles['text-gray-500'] + " " + styles['group-hover:text-gray-800'] + " " + styles['transition-colors'] + " " + styles['flex'] + " " + styles['items-center']}>
                                    Change <span className={styles['ml-1'] + " " + styles['text-base'] + " " + styles['leading-none']}>›</span>
                                </div>
                            </div>
                            <div className={styles['text-sm'] + " " + styles['text-gray-600'] + " " + styles['mb-1']}>
                                Shipping fee: {convertPrice(shippingFee).formatted} for {quantity} piece{quantity > 1 ? 's' : ''}
                            </div>
                            <div className={styles['text-sm'] + " " + styles['text-gray-600']}>
                                Estimated delivery by <span className={styles['font-bold'] + " " + styles['text-gray-800']}>14 Days</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer / Summary */}
                <div className={styles['booking-modal-footer'] + " " + styles['bg-white'] + " " + styles['border-t'] + " " + styles['p-6'] + " " + styles['pb-6'] + " " + styles['pt-4'] + " " + styles['rounded-b-xl']}>
                    <div className={styles['flex'] + " " + styles['justify-between'] + " " + styles['items-center'] + " " + styles['mb-3'] + " " + styles['group'] + " " + styles['cursor-pointer']}>
                        <span className={styles['font-bold'] + " " + styles['text-gray-800']}>Price</span>
                        <span className={styles['text-gray-400'] + " " + styles['group-hover:text-gray-800'] + " " + styles['block'] + " " + styles['transform'] + " " + styles['rotate-180'] + " " + styles['transition-transform']}>^</span>
                    </div>

                    <div className={styles['space-y-2'] + " " + styles['mb-4']}>
                        <div className={styles['flex'] + " " + styles['justify-between'] + " " + styles['text-sm'] + " " + styles['text-gray-600']}>
                            <span>Item subtotal <span className={styles['text-gray-400']}>{variationText}</span></span>
                            <span className={styles['font-medium'] + " " + styles['text-gray-900']}>{convertPrice(itemSubtotal).formatted}</span>
                        </div>
                        <div className={styles['flex'] + " " + styles['justify-between'] + " " + styles['text-sm'] + " " + styles['text-gray-600']}>
                            <span>Shipping total</span>
                            <span className={styles['font-medium'] + " " + styles['text-gray-900']}>{convertPrice(shippingFee).formatted}</span>
                        </div>
                    </div>

                    <div className={styles['flex'] + " " + styles['justify-between'] + " " + styles['items-center'] + " " + styles['pt-3'] + " " + styles['border-t'] + " " + styles['border-gray-100'] + " " + styles['mb-6']}>
                        <span className={styles['font-bold'] + " " + styles['text-gray-900']}>Subtotal</span>
                        <div className={styles['text-right'] + " " + styles['flex'] + " " + styles['flex-col'] + " " + styles['items-end']}>
                            <span className={styles['font-bold'] + " " + styles['text-lg'] + " " + styles['text-gray-900']}>{convertPrice(orderTotal).formatted}</span>
                            <span className={styles['text-xs'] + " " + styles['text-gray-500']}>({convertPrice(orderTotal / quantity).formatted}/piece)</span>
                        </div>
                    </div>

                    <div className={styles['flex'] + " " + styles['gap-3']}>
                        <button
                            onClick={() => {
                                handleStartOrder();
                            }}
                            className={styles['btn-primary-orange'] + " " + styles['flex-1'] + " " + styles['py-4'] + " " + styles['text-sm'] + " " + styles['shadow-sm']}
                        >
                            Start order
                        </button>
                        <button
                            className={styles['btn-secondary-outline'] + " " + styles['flex-1'] + " " + styles['py-4'] + " " + styles['text-sm'] + " " + styles['shadow-sm']}
                        >
                            Add to cart
                        </button>
                        <button
                            className={styles['btn-secondary-outline'] + " " + styles['flex-1'] + " " + styles['py-4'] + " " + styles['text-sm'] + " " + styles['shadow-sm']}
                            onClick={() => navigate.push('/rfq/post')}
                        >
                            Chat now
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BookingModal;
