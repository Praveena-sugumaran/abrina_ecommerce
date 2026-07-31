'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Cart.module.css';

import { getImgUrl } from '@/utils/imageConfig';

interface CartItem {
    name: string;
    price: number;
    quantity: number;
    image: string;
    moq?: number;
    variants?: Record<string, string>;
    supplier?: string | { company_name?: string };
}

const Cart = () => {
    const { convertPrice, t, siteSettings } = useAuth();
    const navigate = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        const fetchCart = () => {
            const items = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('cart') : null) || '[]');
            setCartItems(items);
        };
        fetchCart();

        window.addEventListener('cartUpdated', fetchCart);
        return () => window.removeEventListener('cartUpdated', fetchCart);
    }, []);

    const updateQuantity = (index: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        const newCart = [...cartItems];
        newCart[index].quantity = newQuantity;
        setCartItems(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const removeItem = (index: number) => {
        const newCart = cartItems.filter((_, i) => i !== index);
        setCartItems(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingFee = 0; // Or calculate if needed

    const handleCheckout = () => {
        if (cartItems.length === 0) return;

        if (typeof window !== 'undefined') {
            (window as any).checkoutState = {
                cartItems: cartItems,
                bookingDetails: {
                    shippingFee: shippingFee,
                    orderTotal: totalAmount
                }
            };
        }
        navigate.push('/checkout');
    };

    return (
        <div className={styles['cart-page-premium']}>
            <div className={styles['container']}>
                <header className={styles['cart-header']}>
                    <h1 className={styles['page-title']}>{t('shopping_cart') || 'Shopping Cart'}</h1>
                    <p className={styles['page-subtitle']}>You have {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items in your cart</p>
                </header>

                {cartItems.length === 0 ? (
                        <div className={styles['empty-cart-state']}>
                            <div className={styles['empty-icon']}>🛒</div>
                            <h2>{t('empty_cart_msg') || 'Your cart feels a bit light'}</h2>
                            <p>{t('empty_cart_submsg') || 'Discover amazing products and start filling it up today!'}</p>
                            <Link href="/" className={styles['start-shopping-btn']}>
                                {t('start_shopping') || 'Start Shopping'}
                            </Link>
                        </div>
                    ) : (
                        <div className={styles['cart-main-layout']}>
                            {/* Cart Items (Left Side) */}
                            <div className={styles['cart-items-section']}>
                                {cartItems.map((item, index) => (
                                    <div key={index} className={styles['cart-item-card']}>
                                        <div className={styles['item-main-content']}>
                                            <div className={styles['item-image-wrapper']}>
                                                <img src={getImgUrl(item.image)} alt={item.name} />
                                            </div>
                                            
                                            <div className={styles['item-info-wrapper']}>
                                                <div className={styles['item-header']}>
                                                    <h3 className={styles['item-name']}>{item.name}</h3>
                                                    <button className={styles['remove-item-btn']} title="Remove" onClick={() => removeItem(index)}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                                                    </button>
                                                </div>
    
                                                <div className={styles['item-meta']}>
                                                    <span className={styles['tag-premium']}>Premium Choice</span>
                                                    <span className={styles['tag-shipping']}>Fast Delivery</span>
                                                </div>
    
                                                <div className={styles['item-variants']}>
                                                    {item.variants && Object.entries(item.variants).length > 0 
                                                        ? Object.entries(item.variants).map(([k, v]) => (
                                                            <span key={k} className={styles['variant-badge']}>{k}: {v}</span>
                                                        ))
                                                        : <span className={styles['variant-badge']}>Standard Edition</span>
                                                    }
                                                </div>
    
                                                <div className={styles['item-footer']}>
                                                    <div className={styles['price-block']}>
                                                        <span className={styles['price-amount']}>{convertPrice(item.price).formatted}</span>
                                                        <span className={styles['price-unit']}>/ unit</span>
                                                    </div>
    
                                                    <div className={styles['quantity-controls']}>
                                                        <button className={styles['qty-btn']} onClick={() => updateQuantity(index, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                                                        <input type="text" className={styles['qty-input']} value={item.quantity} readOnly />
                                                        <button className={styles['qty-btn']} onClick={() => updateQuantity(index, item.quantity + 1)}>+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
    
                                        {item.supplier && (
                                            <div className={styles['item-supplier-info']}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V4m0 3a3 3 0 006 0V4m0 3a3 3 0 006 0V4M4 21h16V10H4v11z"></path></svg>
                                                <span>Sold by: <strong>{typeof item.supplier === 'object' ? item.supplier.company_name : item.supplier}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
    
                            {/* Order Summary (Right Side) */}
                            <aside className={styles['cart-summary-section']}>
                                <div className={styles['summary-sticky-card']}>
                                    <h3 className={styles['summary-title']}>{t('order_summary') || 'Order Summary'}</h3>
                                    
                                    <div className={styles['summary-rows']}>
                                        <div className={styles['summary-row']}>
                                            <span>{t('merchandise_total') || 'Merchandise total'}</span>
                                            <span className={styles['value']}>{convertPrice(totalAmount).formatted}</span>
                                        </div>
                                        <div className={styles['summary-row']}>
                                            <span>{t('estimated_shipping') || 'Estimated shipping'}</span>
                                            <span className={styles['value-free']}>FREE</span>
                                        </div>
                                        <div className={styles['summary-divider']}></div>
                                        <div className={styles['summary-row-total']}>
                                            <span>{t('total') || 'Total'}</span>
                                            <span className={styles['total-value']}>{convertPrice(totalAmount).formatted}</span>
                                        </div>
                                    </div>
    
                                    <button onClick={handleCheckout} className={styles['main-checkout-btn']}>
                                        {t('proceed_to_checkout') || 'Proceed to Checkout'}
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </button>
    
                                    <div className={styles['protection-section']}>
                                        <div className={styles['protection-header']}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                            <span>Secure Buyer Protection</span>
                                        </div>
                                        <p className={styles['protection-desc']}>Your order is protected from payment to delivery with our Secure Purchase Guarantee.</p>
                                        
                                        <div className={styles['payment-icons']}>
                                            <span className={styles['pay-tag']}>VISA</span>
                                            <span className={styles['pay-tag']}>MasterCard</span>
                                            <span className={styles['pay-tag']}>PayPal</span>
                                            <span className={styles['pay-tag']}>ApplePay</span>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
