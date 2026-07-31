'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './Checkout.module.css';

import { getImgUrl } from '@/utils/imageConfig';
import GoogleAddressAutocomplete from '@/components/js/GoogleAddressAutocomplete';

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

interface CheckoutData {
    product?: any;
    bookingDetails?: any;
    cartItems?: any[];
    isQuote?: boolean;
    quote?: any;
    rfq?: any;
    isBalancePayment?: boolean;
    orderId?: string;
    balanceAmount?: number;
    shippingAddress?: any;
    checkoutItems?: any[];
    items?: any[];
}

interface Country {
    _id: string;
    name: string;
    countryCode: string;
}

interface State {
    _id: string;
    name: string;
}

interface Address {
    _id: string;
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    country: string;
    country_code: string;
    postalCode: string;
    isDefault: boolean;
    lat?: number;
    lng?: number;
}

interface CheckoutItem {
    name: string;
    description?: string;
    price: number;
    quantity: number;
    image: string;
    productId?: string;
    variantOptions?: any;
}

const Checkout = () => {
    const location = usePathname();
    const navigate = useRouter();
    const { convertPrice, user, currency, t, siteSettings } = useAuth();
    const { showToast } = useToast();
    const [checkoutData, setCheckoutData] = useState<CheckoutData>({});
    const { product, bookingDetails, cartItems, isQuote, quote, rfq, isBalancePayment, orderId, balanceAmount, shippingAddress, items } = checkoutData;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            let state = (window as any).checkoutState;
            if (!state) {
                const stored = sessionStorage.getItem('checkoutState');
                if (stored) {
                    try {
                        state = JSON.parse(stored);
                    } catch (e) {
                        console.error('Failed to parse checkoutState from sessionStorage:', e);
                    }
                }
            }
            if (state) {
                setCheckoutData(state);
            }
        }
    }, []);

    const handleUpdateItemQuantity = (index: number, newQty: number) => {
        if (newQty < 1) return;
        
        if (checkoutData.cartItems) {
            const updatedCartItems = [...checkoutData.cartItems];
            updatedCartItems[index] = {
                ...updatedCartItems[index],
                quantity: newQty
            };
            const updatedState = {
                ...checkoutData,
                cartItems: updatedCartItems
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
            
            localStorage.setItem('cart', JSON.stringify(updatedCartItems));
            window.dispatchEvent(new Event('cartUpdated'));
        } else if (checkoutData.items) {
            const updatedItems = [...checkoutData.items];
            updatedItems[index] = {
                ...updatedItems[index],
                quantity: newQty
            };
            const updatedState = {
                ...checkoutData,
                items: updatedItems
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
        } else if (checkoutData.bookingDetails) {
            const updatedBooking = {
                ...checkoutData.bookingDetails,
                quantity: newQty
            };
            const updatedState = {
                ...checkoutData,
                bookingDetails: updatedBooking
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
        }
    };

    const handleRemoveItem = (index: number) => {
        if (checkoutData.cartItems) {
            const updatedCartItems = checkoutData.cartItems.filter((_, i) => i !== index);
            const updatedState = {
                ...checkoutData,
                cartItems: updatedCartItems
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
            
            localStorage.setItem('cart', JSON.stringify(updatedCartItems));
            window.dispatchEvent(new Event('cartUpdated'));
            
            if (updatedCartItems.length === 0) {
                navigate.push('/cart');
            }
        } else if (checkoutData.items) {
            const updatedItems = checkoutData.items.filter((_, i) => i !== index);
            const updatedState = {
                ...checkoutData,
                items: updatedItems
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
            
            if (updatedItems.length === 0) {
                navigate.push('/');
            }
        } else {
            const updatedState = {
                ...checkoutData,
                product: undefined,
                bookingDetails: undefined
            };
            setCheckoutData(updatedState);
            sessionStorage.setItem('checkoutState', JSON.stringify(updatedState));
            (window as any).checkoutState = updatedState;
            navigate.push('/');
        }
    };

    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [street, setStreet] = useState('');
    const [apartment, setApartment] = useState('');
    const [fullName, setFullName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [stateVal, setStateVal] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState(user?.country_code || 'IN');
    const [taxInfo, setTaxInfo] = useState({ amount: 0, name: '' });
    const [commissionInfo, setCommissionInfo] = useState({ amount: 0, name: '' });
    const [paymentMethod, setPaymentMethod] = useState('');
    const [enabledMethods, setEnabledMethods] = useState<any[]>([]);
    const [protectionOpen, setProtectionOpen] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [isDefault, setIsDefault] = useState(false);
    const [addressSaving, setAddressSaving] = useState(false);
    const [lat, setLat] = useState(0);
    const [lng, setLng] = useState(0);
    const [buyerCredit, setBuyerCredit] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [isDropship, setIsDropship] = useState(false);
    const [dropshipNote, setDropshipNote] = useState('');
    const [giftWrap, setGiftWrap] = useState(false);
    const [giftMessage, setGiftMessage] = useState('');
    const [emiPlans, setEmiPlans] = useState<any[]>([]);
    const [selectedEmiPlanId, setSelectedEmiPlanId] = useState<string | null>(null);
    const [isEmiSelected, setIsEmiSelected] = useState(false);
    const [giftCardCode, setGiftCardCode] = useState('');
    const [giftCardLoading, setGiftCardLoading] = useState(false);
    const [appliedGiftCard, setAppliedGiftCard] = useState<any | null>(null);
    const [giftCardApplyError, setGiftCardApplyError] = useState('');
    const [giftCardApplyLoading, setGiftCardApplyLoading] = useState(false);
    const [giftCardApplyCode, setGiftCardApplyCode] = useState('');

    useEffect(() => {
        const fetchCreditAndWallet = async () => {
            if (!user) return;
            try {
                const { data } = await api.get('/credit/my-limit');
                setBuyerCredit(data);
            } catch (err) {
                console.error('Failed to fetch buyer credit:', err);
            }
            try {
                const { data } = await api.get('/auth/supplier/wallet');
                setWalletBalance(data.balance);
            } catch (err) {
                console.error('Failed to fetch wallet balance:', err);
            }
        };
        fetchCreditAndWallet();
    }, [user]);

    useEffect(() => {
        const fetchEmiPlans = async () => {
            if (!user) return;
            try {
                const { data } = await api.get('/emi/plans');
                const plansArray = data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
                const activePlans = plansArray.filter((p: any) => p.is_active);
                setEmiPlans(activePlans);
                if (activePlans.length > 0) {
                    setSelectedEmiPlanId(activePlans[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch EMI plans:', err);
            }
        };
        fetchEmiPlans();
    }, [user]);

    useEffect(() => {
        if (isBalancePayment && shippingAddress) {
            setFullName(shippingAddress.fullName || '');
            setPhone(shippingAddress.phone || '');
            setStreet(shippingAddress.addressLine || '');
            setCity(shippingAddress.city || '');
            setStateVal(shippingAddress.state || '');
            setPostalCode(shippingAddress.postalCode || '');
            setCountry(shippingAddress.country_code || shippingAddress.country || 'IN');
            setIsEditingAddress(false);
        }
    }, [checkoutData, isBalancePayment, shippingAddress]);

    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [supplierSplitPaymentEnabled, setSupplierSplitPaymentEnabled] = useState<boolean>(false);
    const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);


    useEffect(() => {
        if (isSplitPayment && paymentMethod !== 'stripe' && paymentMethod !== 'razorpay' && paymentMethod !== 'paypal') {
            setIsSplitPayment(false);
        }
    }, [paymentMethod, isSplitPayment]);


    // Shipping fee & auto-calculation states
    const [shippingFee, setShippingFee] = useState(0);
    const [shippingMethods, setShippingMethods] = useState<any[]>([]);
    const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
    const [shippingLoading, setShippingLoading] = useState(false);

    // Coupon / Promo Code states & handlers
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [applicableCoupons, setApplicableCoupons] = useState<any[]>([]);
    const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);

    const handleApplyCoupon = async (specificCode?: string) => {
        const targetCode = specificCode !== undefined ? specificCode : couponCode;
        if (!targetCode.trim()) {
            setCouponError('Please enter a coupon code.');
            return;
        }
        setCouponLoading(true);
        setCouponError('');
        try {
            const { data } = await api.post('/coupons/validate', {
                code: targetCode.trim(),
                items: checkoutItems
            });
            setAppliedCoupon(data);
            setCouponCode(targetCode.trim().toUpperCase());
            setCouponError('');
            showToast('Coupon applied successfully!', 'success');
        } catch (err: any) {
            console.error('Coupon validation failed:', err);
            const msg = err.response?.data?.message || 'Invalid coupon code';
            setCouponError(msg);
            setAppliedCoupon(null);
            showToast(msg, 'error');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
        showToast('Coupon removed.', 'info');
    };

    const handleRedeemGiftCard = async () => {
        if (!giftCardCode.trim()) return;
        setGiftCardLoading(true);
        try {
            const { data } = await api.post('/gift-cards/redeem', { code: giftCardCode.trim() });
            showToast('Gift card redeemed successfully! Wallet topped up.', 'success');
            setGiftCardCode('');
            // Re-fetch wallet balance
            const walletRes = await api.get('/auth/supplier/wallet');
            setWalletBalance(walletRes.data.balance);
        } catch (err: any) {
            console.error('Failed to redeem gift card:', err);
            showToast(err.response?.data?.message || 'Invalid or expired gift card code', 'error');
        } finally {
            setGiftCardLoading(false);
        }
    };

    const handleApplyGiftCardToOrder = async () => {
        if (!giftCardApplyCode.trim()) return;
        setGiftCardApplyLoading(true);
        setGiftCardApplyError('');
        try {
            const { data } = await api.post('/gift-cards/apply', { code: giftCardApplyCode.trim() });
            setAppliedGiftCard(data);
            setGiftCardApplyError('');
            showToast('Gift card applied to order successfully!', 'success');
        } catch (err: any) {
            console.error('Failed to apply gift card:', err);
            const msg = err.response?.data?.message || 'Invalid or expired gift card code';
            setGiftCardApplyError(msg);
            showToast(msg, 'error');
        } finally {
            setGiftCardApplyLoading(false);
        }
    };

    const getEmiCalculation = (plan: any) => {
        const P = finalTotalWithLoyalty;
        const R = plan.interest_rate / 100;
        const N = plan.installments;
        let monthlyPayment = 0;
        let interestTotal = 0;
        
        if (R === 0) {
            monthlyPayment = P / N;
        } else {
            monthlyPayment = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
            interestTotal = (monthlyPayment * N) - P;
        }
        monthlyPayment = Math.round(monthlyPayment * 100) / 100;
        interestTotal = Math.round(interestTotal * 100) / 100;
        const totalPayable = Math.round(((monthlyPayment * N) + plan.processing_fee) * 100) / 100;
        const dueNow = Math.round((monthlyPayment + plan.processing_fee) * 100) / 100;
        
        return {
            monthlyPayment,
            interestTotal,
            totalPayable,
            dueNow
        };
    };

    useEffect(() => {
        const fetchApplicableCoupons = async () => {
            if (!user) return;
            if (isQuote || checkoutItems.length === 0) return;
            try {
                const { data } = await api.post('/coupons/applicable', {
                    items: checkoutItems
                });
                setApplicableCoupons(data);
            } catch (err) {
                console.error('Failed to fetch applicable coupons:', err);
            }
        };
        if (Object.keys(checkoutData).length > 0) {
            fetchApplicableCoupons();
        }
    }, [checkoutData, isQuote, user]);



    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const { data } = await api.get('/payment-methods/public');
                setEnabledMethods(data);
                if (data.length > 0) {
                    const hasStripe = data.some((m: any) => m.provider === 'stripe');
                    setPaymentMethod(hasStripe ? 'stripe' : data[0].provider);
                }
            } catch (err) {
                console.error('Failed to fetch payment methods:', err);
            }
        };

        const fetchCountries = async () => {
            try {
                const { data } = await api.get('/common/countries');
                setCountries(data);
            } catch (err) {
                console.error('Failed to fetch countries:', err);
            }
        };

        const fetchAddresses = async () => {
            if (!user) {
                setIsEditingAddress(true);
                return;
            }
            try {
                const { data } = await api.get('/shipping-address');
                setSavedAddresses(data);
                const defaultAddr = data.find((addr: Address) => addr.isDefault) || data[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr._id);
                    setStreet(defaultAddr.addressLine || '');
                    setCity(defaultAddr.city || '');
                    setStateVal(defaultAddr.state || '');
                    setPostalCode(defaultAddr.postalCode || '');
                    setPhone(defaultAddr.phone || '');
                    setFullName(defaultAddr.fullName || '');
                    setCountry(defaultAddr.country_code || defaultAddr.country || user?.country_code || 'IN');

                    const cObj = data.find((c: Country) => c.name === defaultAddr.country || c.countryCode === defaultAddr.country_code);
                    if (cObj) {
                        const { data: stData } = await api.get(`/common/states/${cObj._id}`);
                        setStates(stData);
                    }
                } else {
                    setIsEditingAddress(true);
                }
            } catch (err) {
                console.error('Failed to fetch shipping addresses:', err);
                setIsEditingAddress(true);
            }
        };

        fetchMethods();
        fetchCountries();
        fetchAddresses();
    }, [user]);

    const fetchStates = async (countryId: string) => {
        if (!countryId) { setStates([]); return []; }
        try {
            const { data } = await api.get(`/common/states/${countryId}`);
            setStates(data);
            return data;
        } catch (err) {
            console.error('Failed to fetch states:', err);
            return [];
        }
    };

    const handleCountryChange = (val: string) => {
        setCountry(val);
        setStateVal('');
        const selectedC = countries.find(c => c.countryCode === val || c.name === val || c._id === val);
        if (selectedC) fetchStates(selectedC._id);
    };

    const handleAddressSelect = (data: any) => {
        setStreet(data.addressLine || data.formatted_address);
        if (data.city) setCity(data.city);
        if (data.state) setStateVal(data.state);
        if (data.postalCode) setPostalCode(data.postalCode);
        if (data.country) handleCountryChange(data.country);
        if (data.lat) setLat(data.lat);
        if (data.lng) setLng(data.lng);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude } }) => {
                setLat(latitude);
                setLng(longitude);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const data = await res.json();
                    const addr = data.address || {};
                    const road = addr.road || addr.pedestrian || addr.footway || '';
                    setStreet(`${addr.house_number || ''} ${road}`.trim() || data.display_name?.split(',')[0] || '');
                    setCity(addr.city || addr.town || addr.village || addr.county || '');

                    const countryName = addr.country;
                    const matchedC = countries.find(c => c.name.toLowerCase() === countryName?.toLowerCase());
                    if (matchedC) {
                        setCountry(matchedC.countryCode || matchedC.name);
                        const fetchedStates = await fetchStates(matchedC._id);
                        if (addr.state) {
                            const matchedS = fetchedStates.find((s: any) => s.name.toLowerCase() === addr.state.toLowerCase());
                            setStateVal(matchedS ? matchedS.name : addr.state);
                        } else {
                            setStateVal('');
                        }
                    } else {
                        setStateVal(addr.state || addr.region || '');
                    }
                    setPostalCode(addr.postcode || '');
                } catch { showToast('Could not fetch address. Please enter manually.', 'info'); }
                finally { setLocationLoading(false); }
            },
            () => {
                setLocationLoading(false);
                showToast('Unable to retrieve location.', 'error');
            }
        );
    };

    const activeItems = cartItems || items;
    const checkoutItems: CheckoutItem[] = isBalancePayment
        ? (checkoutData.checkoutItems || [])
        : isQuote
            ? [{
            name: `RFQ: as per your request`,
            description: rfq?.sourcing_purpose || 'Custom Quote fulfillment',
            price: quote?.price_offered || 0,
            quantity: rfq?.quantity || 1,
            image: getImgUrl(rfq?.attachments?.[0]),
            variantOptions: null
        }]
        : activeItems
            ? activeItems.map((item: any) => ({ 
                productId: item.productId, 
                quantity: item.quantity, 
                variantOptions: item.variants || item.variantOptions, 
                name: item.name, 
                price: item.price, 
                image: getImgUrl(item.image) 
            }))
            : [{
                productId: product?._id,
                quantity: bookingDetails?.quantity,
                variantOptions: bookingDetails?.selectedVariants || bookingDetails?.variantQtys,
                name: product?.name,
                price: bookingDetails?.unitPrice,
                image: getImgUrl(product?.images?.[0] || product?.main_image),
                customizationId: bookingDetails?.customizationId
            }];

    // shippingFee is managed as a state variable
    const itemSubtotal = isBalancePayment ? (balanceAmount || 0) : checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // fetchedProducts state to hold populated product info for duty calculation
    const [fetchedProducts, setFetchedProducts] = useState<Record<string, any>>({});

    useEffect(() => {
        // Resolve supplier ID
        let resolvedSupplierId = null;
        if (isQuote && quote) {
            resolvedSupplierId = quote.supplier?._id || quote.supplier;
        } else if (product) {
            resolvedSupplierId = product.supplier?._id || product.supplier;
        } else if (checkoutItems.length > 0) {
            const firstItem = checkoutItems[0];
            if (firstItem?.productId && fetchedProducts[firstItem.productId]) {
                resolvedSupplierId = fetchedProducts[firstItem.productId]?.supplier?._id || fetchedProducts[firstItem.productId]?.supplier;
            }
        }

        if (resolvedSupplierId) {
            if (typeof resolvedSupplierId === 'string') {
                setSupplierId(resolvedSupplierId);
            } else if (typeof resolvedSupplierId === 'object' && resolvedSupplierId._id) {
                setSupplierId(resolvedSupplierId._id);
            }
        }
    }, [checkoutData, checkoutItems, fetchedProducts, isQuote, quote, product]);

    useEffect(() => {
        const fetchSupplierCompany = async () => {
            if (!supplierId) return;
            try {
                const { data } = await api.get(`/company/supplier/${supplierId}`);
                if (data?.company) {
                    setSupplierSplitPaymentEnabled(!!data.company.split_payment_enabled);
                }
            } catch (err) {
                console.error('Failed to fetch supplier company details for split payment check:', err);
            }
        };
        fetchSupplierCompany();
    }, [supplierId]);

    const [dutyFee, setDutyFee] = useState(0);

    useEffect(() => {
        const fetchProductData = async () => {
            const newFetched: Record<string, any> = {};
            if (isQuote && rfq?.product_id) {
                const pid = rfq.product_id;
                if (!fetchedProducts[pid]) {
                    try {
                        const { data } = await api.get(`/products/${pid}`);
                        newFetched[pid] = data;
                    } catch (e) {
                        console.error('Error fetching product for quote RFQ:', e);
                    }
                }
            } else if (!isQuote && checkoutItems.length > 0) {
                for (const item of checkoutItems) {
                    if (item.productId && !fetchedProducts[item.productId]) {
                        try {
                            const { data } = await api.get(`/products/${item.productId}`);
                            newFetched[item.productId] = data;
                        } catch (e) {
                            console.error('Error fetching product details:', e);
                        }
                    }
                }
            }
            if (Object.keys(newFetched).length > 0) {
                setFetchedProducts(prev => ({ ...prev, ...newFetched }));
            }
        };
        fetchProductData();
    }, [checkoutItems, isQuote, rfq]);

    // Calculate duty fee when shipping country, fetched products, or items change
    useEffect(() => {
        let calculatedDuty = 0;
        if (!isQuote) {
            for (const item of checkoutItems) {
                if (item.productId && fetchedProducts[item.productId]) {
                    const prod = fetchedProducts[item.productId];
                    const supplierCountry = prod.supplier?.country_code || 'US';
                    const isCrossBorder = supplierCountry.toUpperCase() !== country.toUpperCase();
                    if (isCrossBorder && prod.hs_code) {
                        calculatedDuty += parseFloat(((item.price * item.quantity) * 0.05).toFixed(2));
                    }
                }
            }
        }
        setDutyFee(parseFloat(calculatedDuty.toFixed(2)));
    }, [country, checkoutItems, isQuote, fetchedProducts]);

    useEffect(() => {
        const fetchTaxAndCommission = async () => {
            if (itemSubtotal <= 0) return;
            try {
                const taxRes = await api.post('/tax/calculate', {
                    country_code: country,
                    amount: itemSubtotal
                });
                setTaxInfo({ amount: taxRes.data.tax_amount, name: taxRes.data.tax_rule?.name || 'Tax' });

                const firstCategory = product?.category?.title || cartItems?.[0]?.category || '';
                const commRes = await api.post('/commissions/calculate', {
                    amount: itemSubtotal,
                    category: firstCategory
                });
                setCommissionInfo({ amount: commRes.data.commission_amount, name: commRes.data.rule_name || 'Service Fee' });

            } catch (err) {
                console.error('Calculation error:', err);
            }
        };
        fetchTaxAndCommission();
    }, [country, itemSubtotal, product, cartItems]);

    useEffect(() => {
        if (bookingDetails?.shippingFee !== undefined) {
            setShippingFee(bookingDetails.shippingFee);
        }
    }, [bookingDetails]);

    const handleSelectShippingMethod = (method: any) => {
        setSelectedShippingMethodId(method.id);
        setShippingFee(parseFloat(method.total_cost));
    };

    useEffect(() => {
        const fetchShippingCost = async () => {
            if (checkoutItems.length === 0 || !country) return;
            setShippingLoading(true);
            try {
                const response = await api.post('/common/shipping/calculate', {
                    products: checkoutItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    })),
                    dest_country: country,
                    dest_state: stateVal,
                    dest_zip: postalCode,
                    buyer_lat: lat,
                    buyer_lng: lng
                });
                
                const methods = response.data.shipping_methods || [];
                setShippingMethods(methods);
                if (methods.length > 0) {
                    const existing = methods.find((m: any) => m.id === selectedShippingMethodId);
                    const selected = existing || methods[0];
                    setSelectedShippingMethodId(selected.id);
                    setShippingFee(parseFloat(selected.total_cost));
                } else {
                    setShippingFee(0);
                    setSelectedShippingMethodId(null);
                }
            } catch (err) {
                console.error('Failed to calculate shipping:', err);
                setShippingFee(bookingDetails?.shippingFee || 50);
            } finally {
                setShippingLoading(false);
            }
        };

        fetchShippingCost();
    }, [checkoutData, country, stateVal, postalCode, lat, lng]);

    if (!cartItems && !items && (!product || !bookingDetails) && !isQuote) {
        return (
            <div className={styles['co-empty-state']}>
                <div className={styles['co-empty-icon']}>🛒</div>
                <h2 className={styles['co-empty-title']}>Your checkout is currently empty</h2>
                <p className={styles['co-empty-text']}>
                    You haven't selected any items for checkout. Add items to your cart or start an order from the product page.
                </p>
                <button onClick={() => navigate.push('/')} className={styles['co-btn-pay']}>
                    Return to home
                </button>
            </div>
        );
    }

    const isDropshippingSupported = (() => {
        if (isBalancePayment) return false;
        if (isQuote) {
            if (rfq?.product_id) {
                const prod = fetchedProducts[rfq.product_id];
                if (prod && prod.dropshipping_supported === false) return false;
            }
            return true;
        }
        if (checkoutItems.length > 0) {
            for (const item of checkoutItems) {
                if (product && product._id === item.productId) {
                    if (product.dropshipping_supported === false) return false;
                }
                if (item.productId && fetchedProducts[item.productId]) {
                    if (fetchedProducts[item.productId].dropshipping_supported === false) return false;
                }
            }
        }
        return true;
    })();

    const isGiftWrapSupported = (() => {
        if (isBalancePayment) return false;
        if (isQuote) {
            if (rfq?.product_id) {
                const prod = fetchedProducts[rfq.product_id];
                if (prod && prod.gift_wrap_supported === false) return false;
            }
            return true;
        }
        if (checkoutItems.length > 0) {
            for (const item of checkoutItems) {
                if (product && product._id === item.productId) {
                    if (product.gift_wrap_supported === false) return false;
                }
                if (item.productId && fetchedProducts[item.productId]) {
                    if (fetchedProducts[item.productId].gift_wrap_supported === false) return false;
                }
            }
        }
        return true;
    })();

    const wrapFee = (() => {
        if (checkoutItems.length > 0) {
            for (const item of checkoutItems) {
                if (product && (product._id === item.productId || product.id === item.productId) && product.gift_wrap_fee !== undefined && product.gift_wrap_fee !== null && product.gift_wrap_fee !== '') {
                    return Number(product.gift_wrap_fee);
                }
                if (item.productId && fetchedProducts[item.productId] && fetchedProducts[item.productId].gift_wrap_fee !== undefined && fetchedProducts[item.productId].gift_wrap_fee !== null && fetchedProducts[item.productId].gift_wrap_fee !== '') {
                    return Number(fetchedProducts[item.productId].gift_wrap_fee);
                }
            }
        }
        return siteSettings?.gift_wrap_fee !== undefined ? Number(siteSettings.gift_wrap_fee) : 5.00;
    })();
    const orderTotal = isBalancePayment ? (balanceAmount || 0) : (itemSubtotal + shippingFee + taxInfo.amount + dutyFee + (giftWrap && isGiftWrapSupported ? wrapFee : 0));
    const processingFee = isBalancePayment ? 0 : commissionInfo.amount;
    const finalTotal = isBalancePayment ? (balanceAmount || 0) : (orderTotal + processingFee);
    const discountAmount = isBalancePayment ? 0 : (appliedCoupon ? appliedCoupon.discount_amount : 0);
    const discountedTotal = Math.max(0, finalTotal - discountAmount);

    const availablePoints = user?.loyalty_points || 0;
    const pointsToUSD = 100; // 100 points = $1
    const maxPointsValue = availablePoints / pointsToUSD;
    const pointsDiscount = useLoyaltyPoints ? Math.min(maxPointsValue, discountedTotal) : 0;
    const redeemedPoints = useLoyaltyPoints ? Math.min(availablePoints, Math.round(pointsDiscount * pointsToUSD)) : 0;
    const totalBeforeGiftCard = Math.max(0, discountedTotal - pointsDiscount);
    const giftCardDiscount = appliedGiftCard ? Math.min(appliedGiftCard.balance, totalBeforeGiftCard) : 0;
    const finalTotalWithLoyalty = Math.max(0, totalBeforeGiftCard - giftCardDiscount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const shippingAddress = {
                fullName,
                phone,
                addressLine: street,
                city,
                state: stateVal,
                country: countries.find(c => c.countryCode === country || c.name === country)?.name || country,
                postalCode,
                lat,
                lng
            };

            let response;
            if (isBalancePayment) {
                response = await api.post(`/orders/${orderId}/pay-balance`, {
                    paymentMethod
                });
            } else if (isQuote) {
                response = await api.post(`/orders/checkout-quote/${quote._id}`, {
                    countryCode: country,
                    shippingAddress,
                    paymentMethod,
                    useSplitPayment: isSplitPayment
                });
            } else {
                const referralCode = typeof window !== 'undefined' ? localStorage.getItem('affiliate_referral') : null;
                
                // Validate Guest Email if logged out
                if (!user) {
                    if (!guestEmail || !guestEmail.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail)) {
                        showToast('Please enter a valid Email Address for guest checkout.', 'error');
                        setLoading(false);
                        return;
                    }
                    if (!fullName || !fullName.trim() || fullName.trim().length < 2) {
                        showToast('Please enter a valid Full Name (at least 2 characters).', 'error');
                        setLoading(false);
                        return;
                    }
                    const cleanPhone = (phone || '').replace(/\D/g, '');
                    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
                        showToast('Please enter a valid phone number (7-15 digits).', 'error');
                        setLoading(false);
                        return;
                    }
                    if (!street || !street.trim()) {
                        showToast('Street address is required.', 'error');
                        setLoading(false);
                        return;
                    }
                }

                const selectedMethod = shippingMethods.find(m => m.id === selectedShippingMethodId);
                const shippingCompany = selectedMethod ? selectedMethod.name : 'Standard Shipping';

                response = await api.post('/orders/create-checkout-session', {
                    items: checkoutItems,
                    shippingFee,
                    countryCode: country,
                    shippingAddress,
                    paymentMethod,
                    couponCode: appliedCoupon?.code || undefined,
                    referralCode: referralCode || undefined,
                    useSplitPayment: isSplitPayment,
                    redeemPoints: redeemedPoints,
                    is_dropship: isDropship && isDropshippingSupported,
                    dropship_note: (isDropship && isDropshippingSupported) ? dropshipNote : undefined,
                    is_emi: isEmiSelected,
                    emi_plan_id: isEmiSelected ? selectedEmiPlanId : undefined,
                    gift_wrap: giftWrap && isGiftWrapSupported,
                    gift_message: (giftWrap && isGiftWrapSupported) ? giftMessage : undefined,
                    giftCardCode: appliedGiftCard?.code || undefined,
                    guestEmail: !user ? guestEmail : undefined,
                    guestName: !user ? fullName : undefined,
                    guestPhone: !user ? phone : undefined,
                    shippingCompany
                });
                if (typeof window !== 'undefined' && referralCode) {
                    localStorage.removeItem('affiliate_referral');
                }
            }

            const { data } = response;
            const redirectSuccess = (orderMethod = '') => {
                const successOrderId = data.order_ids?.[0] || data.id || '';
                if (!user) {
                    navigate.push(`/checkout/success?status=success&order_id=${successOrderId}`);
                } else {
                    if (orderMethod === 'orders') {
                        navigate.push('/dashboard?tab=orders');
                    } else {
                        navigate.push('/dashboard?status=success');
                    }
                }
            };

            if (data.order_method === 'gift-card') {
                showToast('Order placed and paid successfully using Gift Card.', 'success');
                redirectSuccess();
            } else if (data.url) {
                window.location.href = data.url;
            } else if (paymentMethod === 'razorpay') {
                if (data.is_mock) {
                    (window as any).Razorpay = class MockRazorpay {
                        options: any;
                        constructor(options: any) {
                            this.options = options;
                        }
                        open() {
                            const overlay = document.createElement('div');
                            overlay.id = 'razorpay-mock-modal';
                            overlay.style.position = 'fixed';
                            overlay.style.inset = '0';
                            overlay.style.zIndex = '99999';
                            overlay.style.display = 'flex';
                            overlay.style.alignItems = 'center';
                            overlay.style.justifyContent = 'center';
                            overlay.style.background = 'rgba(15, 23, 42, 0.6)';
                            overlay.style.backdropFilter = 'blur(4px)';
                            overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

                            const card = document.createElement('div');
                            card.style.background = '#ffffff';
                            card.style.width = '100%';
                            card.style.maxWidth = '380px';
                            card.style.borderRadius = '16px';
                            card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                            card.style.overflow = 'hidden';
                            card.style.display = 'flex';
                            card.style.flexDirection = 'column';
                            card.style.animation = 'rzpPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

                            const amountInINR = this.options.amount / 100;
                            const formattedAmount = new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: this.options.currency || 'INR'
                            }).format(amountInINR);

                            const themeColor = this.options.theme?.color || '#ff6600';

                            card.innerHTML = `
                                <div style="background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="text-align: left;">
                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${this.options.name || 'B2B Marketplace'}</h4>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${this.options.description || 'Payment Gateway'}</p>
                                    </div>
                                    <button id="rzp-close-btn" style="border: none; background: transparent; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
                                </div>
                                <div style="padding: 20px; text-align: center; background: #ffffff;">
                                    <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Amount to Pay</span>
                                    <h2 style="margin: 6px 0 0 0; font-size: 32px; font-weight: 900; color: ${themeColor};">${formattedAmount}</h2>
                                </div>
                                <div style="padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; text-align: left;">Mock Payment Options</div>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 2px solid ${themeColor}; background: #f0f9ff; border-radius: 12px; cursor: pointer; width: 100%; box-sizing: border-box;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <span style="font-size: 20px;">💳</span>
                                            <div style="text-align: left;">
                                                <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Card / UPI / Netbanking</div>
                                                <div style="font-size: 11px; color: #64748b;">Simulate live checkout screen</div>
                                            </div>
                                        </div>
                                        <input type="radio" name="mock_option" checked style="accent-color: ${themeColor};" />
                                    </label>
                                </div>
                                <div style="padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                                    <button id="rzp-pay-btn" style="width: 100%; padding: 14px; background: ${themeColor}; color: #ffffff; border: none; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        Pay ${formattedAmount}
                                    </button>
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; font-weight: 600;">
                                        🛡️ Secured by <span style="color: #0f172a; font-weight: 800;">Razorpay</span> Mock Sandbox
                                    </div>
                                </div>
                                <style>
                                    @keyframes rzpPop {
                                        from { transform: scale(0.95); opacity: 0; }
                                        to { transform: scale(1); opacity: 1; }
                                    }
                                </style>
                            `;

                            overlay.appendChild(card);
                            document.body.appendChild(overlay);

                            const closeBtn = card.querySelector('#rzp-close-btn');
                            closeBtn?.addEventListener('click', () => {
                                document.body.removeChild(overlay);
                            });

                            const payBtn = card.querySelector('#rzp-pay-btn') as HTMLButtonElement;
                            payBtn?.addEventListener('click', () => {
                                payBtn.disabled = true;
                                payBtn.innerHTML = `<span style="width: 18px; height: 18px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; display: inline-block; animation: rzpSpin 0.6s linear infinite;"></span> Processing...`;
                                
                                if (!document.getElementById('rzp-spin-style')) {
                                    const style = document.createElement('style');
                                    style.id = 'rzp-spin-style';
                                    style.innerHTML = `@keyframes rzpSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                                    document.head.appendChild(style);
                                }

                                setTimeout(() => {
                                    document.body.removeChild(overlay);
                                    const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11);
                                    this.options.handler({
                                        razorpay_order_id: this.options.order_id,
                                        razorpay_payment_id: mockPaymentId,
                                        razorpay_signature: 'mock_signature'
                                    });
                                }, 1500);
                            });
                        }
                    };
                } else {
                    const scriptLoaded = await loadRazorpayScript();
                    if (!scriptLoaded) {
                        showToast('Failed to load Razorpay SDK.', 'error');
                        setLoading(false);
                        return;
                    }
                }

                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "B2B Marketplace",
                    description: isQuote ? "RFQ Quote Payment" : "Order Checkout",
                    ...(data.use_standard_checkout ? {} : { order_id: data.id }),
                    handler: async function (response: any) {
                        try {
                            const verifyData = {
                                razorpay_order_id: response.razorpay_order_id || data.id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            };
                            await api.post('/orders/verify-razorpay', verifyData);
                            redirectSuccess();
                        } catch (err) {
                            showToast('Verification failed. Please contact support.', 'error');
                        }
                    },
                    prefill: {
                        name: fullName,
                        email: user?.email || guestEmail,
                        contact: phone
                    },
                    theme: {
                        color: "#ff6600"
                    }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                setLoading(false);
            } else if (paymentMethod === 'net-terms') {
                showToast('Order placed successfully using Net-Terms financing.', 'success');
                redirectSuccess('orders');
            } else if (paymentMethod === 'wallet') {
                showToast('Order placed and paid successfully using Wallet balance.', 'success');
                redirectSuccess();
            } else if (paymentMethod === 'bank_transfer' || paymentMethod === 'cod') {
                showToast('Order placed successfully. Please complete payment as instructed.', 'success');
                redirectSuccess('orders');
            }
        } catch (err) {
            console.error(err);
            showToast('Could not start checkout. Please try again.', 'error');
            setLoading(false);
        }
    };

    const handleSelectSavedAddress = async (addr: Address) => {
        setFullName(addr.fullName || '');
        setPhone(addr.phone || '');
        setStreet(addr.addressLine || '');
        setCity(addr.city || '');
        setPostalCode(addr.postalCode || '');
        setIsDefault(addr.isDefault || false);

        const cVal = addr.country_code || addr.country || 'IN';
        setCountry(cVal);

        const cObj = countries.find(c => c.countryCode === cVal || c.name === addr.country || c._id === addr.country);
        if (cObj) {
            await fetchStates(cObj._id);
            setStateVal(addr.state || '');
        } else {
            setStateVal(addr.state || '');
        }

        if (addr.lat) setLat(addr.lat);
        if (addr.lng) setLng(addr.lng);

        setSelectedAddressId(addr._id);
        setIsEditingAddress(false);
    };

    const handleSaveAddress = async () => {
        // Full Name Validation
        if (!fullName || !fullName.trim() || fullName.trim().length < 2) {
            showToast('Please enter a valid Full Name (at least 2 characters).', 'error');
            return;
        }

        // Phone Validation
        const cleanPhone = (phone || '').replace(/\D/g, '');
        if (!cleanPhone) {
            showToast('Phone Number is required.', 'error');
            return;
        }
        if (cleanPhone.length < 7 || cleanPhone.length > 15) {
            showToast('Phone Number must be a valid number between 7 and 15 digits.', 'error');
            return;
        }

        // Street Address Validation
        if (!street || !street.trim()) {
            showToast('Street Address is required. Please search and select a valid address.', 'error');
            return;
        }

        // Country Validation
        if (!country || !country.trim()) {
            showToast('Country is required.', 'error');
            return;
        }

        // State Validation
        if (!stateVal || !stateVal.trim()) {
            showToast('State / Province is required.', 'error');
            return;
        }

        // City Validation
        if (!city || !city.trim()) {
            showToast('City is required.', 'error');
            return;
        }

        // Postal Code Validation
        if (!postalCode || !postalCode.trim() || postalCode.trim().length < 3) {
            showToast('Please enter a valid Postal Code (at least 3 characters).', 'error');
            return;
        }

        setAddressSaving(true);
        try {
            const payload = {
                fullName,
                phone,
                addressLine: street,
                city,
                state: stateVal,
                country: countries.find(c => c.countryCode === country || c.name === country)?.name || country,
                country_code: country,
                postalCode,
                isDefault,
                lat,
                lng
            };

            if (selectedAddressId) {
                await api.put(`/shipping-address/${selectedAddressId}`, payload);
            } else {
                const { data } = await api.post('/shipping-address', payload);
                setSelectedAddressId(data._id);
            }

            const { data: refreshed } = await api.get('/shipping-address');
            setSavedAddresses(refreshed);

            setIsEditingAddress(false);
            showToast('Address saved successfully', 'success');
        } catch (err) {
            console.error('Failed to save address:', err);
            showToast('Could not save address. Proceeding with checkout.', 'info');
            setIsEditingAddress(false);
        } finally {
            setAddressSaving(false);
        }
    };

    const countryObj = countries.find(c => c.countryCode === country || c.name === country || c._id === country);
    const countryName = countryObj ? countryObj.name : country;

    const fullAddress = [street, apartment, city, stateVal, countryName, postalCode].filter(Boolean).join(', ');

    return (
        <div className={styles['co-page']}>
            {/* Rich Checkout Header */}
            <div className={styles['co-header']}>
                <div className={styles['co-header-inner']} style={{ justifyContent: 'center' }}>
                    <div className={styles['co-header-steps']}>
                        <div className={`${styles['co-step-item']} ${styles['completed']}`}>
                            <span className={styles['co-step-num']}>✓</span>
                            <span>Cart</span>
                        </div>
                        <div className={styles['co-step-divider']} />
                        <div className={`${styles['co-step-item']} ${styles['active']}`}>
                            <span className={styles['co-step-num']}>2</span>
                            <span>Shipping & Payment</span>
                        </div>
                        <div className={styles['co-step-divider']} />
                        <div className={styles['co-step-item']}>
                            <span className={styles['co-step-num']}>3</span>
                            <span>Order Confirmed</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles['co-body']}>
                <form onSubmit={handleSubmit} className={styles['co-layout']}>

                    {/* ── LEFT COLUMN ─────────────────────────── */}
                    <div className={styles['co-left']}>

                        {/* Shipping Address */}
                        <section className={styles['co-section']}>
                            <div className={styles['co-section-header']}>
                                <h2 className={styles['co-section-title']}>{t('shipping_address') || 'Shipping address'}</h2>
                                {savedAddresses.length > 0 && !isEditingAddress && (
                                    <button type="button" className={styles['co-change-btn']} onClick={() => setIsEditingAddress(true)}>
                                        {t('change') || 'Change'}
                                    </button>
                                )}
                            </div>

                            {isEditingAddress ? (
                                <div className={styles['co-address-editor']}>
                                    {savedAddresses.length > 0 && (
                                        <div className={styles['co-saved-list']} style={{ marginBottom: '1.5rem' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Select a saved address</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                                {savedAddresses.map(addr => (
                                                    <div
                                                        key={addr._id}
                                                        className={`${styles['co-address-card']} ${selectedAddressId === addr._id ? styles['active'] : ''}`}
                                                        onClick={() => handleSelectSavedAddress(addr)}
                                                    >
                                                        <p className={styles['co-addr-name']}>{addr.fullName}</p>
                                                        <p className={styles['co-addr-line'] + " " + styles['line-clamp-1']}>{addr.addressLine}, {addr.city}</p>
                                                        {selectedAddressId === addr._id && <span className={styles['co-check-mark']}>✓</span>}
                                                    </div>
                                                ))}
                                                <div
                                                    className={styles['co-address-card'] + " " + styles['add-new']}
                                                    onClick={() => {
                                                        setSelectedAddressId(null);
                                                        setStreet(''); setCity(''); setStateVal(''); setPostalCode(''); setPhone(''); setFullName(''); setApartment('');
                                                    }}
                                                >
                                                    <span>+ Use different address</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles['co-form-grid']}>
                                        {!user && (
                                            <div className={styles['co-field'] + " " + styles['co-field-full']}>
                                                <label>Email Address (for Order updates & Guest Account) *</label>
                                                <input 
                                                    type="email" 
                                                    className={styles['co-input']} 
                                                    required 
                                                    value={guestEmail} 
                                                    onChange={e => setGuestEmail(e.target.value)} 
                                                    placeholder="e.g. buyer@example.com" 
                                                />
                                            </div>
                                        )}
                                        <div className={styles['co-field'] + " " + styles['co-field-full']}>
                                            <label>Country / region</label>
                                            <select
                                                className={styles['co-input']}
                                                value={country}
                                                onChange={(e) => handleCountryChange(e.target.value)}
                                            >
                                                <option value="">Select Country</option>
                                                {countries.map(c => (
                                                    <option key={c._id} value={c.countryCode || c.name}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles['co-field']}>
                                            <label>First & Last name *</label>
                                            <input type="text" className={styles['co-input']} required value={fullName} onChange={e => setFullName(e.target.value)} />
                                        </div>
                                        <div className={styles['co-field']}>
                                            <label>Phone number *</label>
                                            <div className={styles['co-phone-wrap']}>
                                                <span className={styles['co-phone-prefix']}>+91</span>
                                                <input type="tel" className={styles['co-input'] + " " + styles['co-phone-input']} required value={phone} onChange={e => setPhone(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className={styles['co-field'] + " " + styles['co-field-full'] + " " + styles['co-field-relative']}>
                                            <label>Street address or P.O. box *</label>
                                            <GoogleAddressAutocomplete
                                                onAddressSelect={handleAddressSelect}
                                                placeholder="Search for address..."
                                                className={styles['co-input'] + " " + styles['co-input-loc']}
                                            />
                                            <button type="button" className={styles['co-loc-btn']} onClick={handleUseMyLocation} disabled={locationLoading}>
                                                {locationLoading ? 'Detecting...' : 'Use my current location'}
                                            </button>
                                        </div>
                                        <div className={styles['co-field'] + " " + styles['co-field-full']}>
                                            <label>Apartment, suite, floor (optional)</label>
                                            <input type="text" className={styles['co-input']} value={apartment} onChange={e => setApartment(e.target.value)} />
                                        </div>
                                        <div className={styles['co-field']}>
                                            <label>State / province *</label>
                                            {states.length > 0 ? (
                                                <select
                                                    className={styles['co-input']}
                                                    required
                                                    value={stateVal}
                                                    onChange={e => setStateVal(e.target.value)}
                                                >
                                                    <option value="">Select State</option>
                                                    {states.map(s => (
                                                        <option key={s._id} value={s.name}>{s.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type="text" className={styles['co-input']} required value={stateVal} onChange={e => setStateVal(e.target.value)} />
                                            )}
                                        </div>
                                        <div className={styles['co-field']}>
                                            <label>City *</label>
                                            <input type="text" className={styles['co-input']} required value={city} onChange={e => setCity(e.target.value)} />
                                        </div>
                                        <div className={styles['co-field']}>
                                            <label>Postal code *</label>
                                            <input type="text" className={styles['co-input']} required value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                                        </div>
                                        <div className={styles['co-field'] + " " + styles['co-field-full'] + " " + styles['co-checkbox-row']}>
                                            <input
                                                type="checkbox"
                                                id="def-addr"
                                                checked={isDefault}
                                                onChange={e => setIsDefault(e.target.checked)}
                                            />
                                            <label htmlFor="def-addr" className={styles['co-checkbox-label']}>Set as default shipping address</label>
                                        </div>
                                        <div className={styles['co-field'] + " " + styles['co-field-full']}>
                                            <button
                                                type="button"
                                                className={styles['co-btn-save-addr']}
                                                onClick={handleSaveAddress}
                                                disabled={addressSaving}
                                            >
                                                {addressSaving ? 'Saving...' : 'Use this address'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles['co-address-display']}>
                                    <p className={styles['co-address-name']}>{fullName || `${user?.first_name} ${user?.last_name}`} {phone && <span className={styles['co-address-phone']}>({phone})</span>}</p>
                                    <p className={styles['co-address-line']}>{fullAddress}</p>
                                </div>
                            )}
                        </section>

                        {/* Shipping Methods Selection */}
                        <section className={styles['co-section']}>
                            <div className={styles['co-section-header']}>
                                <h2 className={styles['co-section-title']}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                    {t('shipping_method') || 'Shipping method'}
                                </h2>
                            </div>

                            {shippingLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', color: '#6b7280' }}>
                                    <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', border: '3px solid #f3f3f3', borderTop: '3px solid #ff6600', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
                                        <style>{`
                                            @keyframes spin {
                                                0% { transform: rotate(0deg); }
                                                100% { transform: rotate(360deg); }
                                            }
                                        `}</style>
                                    </div>
                                    <span style={{ fontSize: '14px' }}>Calculating shipping fees...</span>
                                </div>
                            ) : shippingMethods.length > 0 ? (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {shippingMethods.map(method => (
                                        <div
                                            key={method.id}
                                            className={`${styles['co-payment-row-v2']} ${selectedShippingMethodId === method.id ? styles['active'] : ''}`}
                                            onClick={() => handleSelectShippingMethod(method)}
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input type="radio" checked={selectedShippingMethodId === method.id} readOnly />
                                                <div className={styles['co-pay-info']}>
                                                    <span className={styles['co-pay-title']} style={{ fontWeight: '600' }}>{method.name}</span>
                                                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                                                        Est. Delivery: {method.delivery_range} {parseFloat(method.distance) > 0 ? `(${method.distance} km)` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--clr-accent, #ff6600)' }}>
                                                {convertPrice(parseFloat(method.total_cost)).formatted}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: '#6b7280', padding: '0.5rem 0' }}>
                                    No custom shipping options available for this destination. Default shipping fee will be applied.
                                </p>
                            )}
                        </section>

                        {/* Payment Method */}
                        <section className={styles['co-section']}>
                            <div className={styles['co-section-header']}>
                                <h2 className={styles['co-section-title']}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('payment_method') || 'Payment method'}
                                </h2>
                            </div>

                            <div className={styles['co-payment-options']}>
                                {walletBalance !== null && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'wallet' ? styles['active'] : ''}`}
                                        onClick={() => {
                                            if (walletBalance >= finalTotalWithLoyalty) {
                                                setPaymentMethod('wallet');
                                                setIsEmiSelected(false);
                                            }
                                        }}
                                        style={{
                                            opacity: walletBalance >= finalTotalWithLoyalty ? 1 : 0.6,
                                            cursor: walletBalance >= finalTotalWithLoyalty ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="wallet"
                                            checked={paymentMethod === 'wallet'}
                                            disabled={walletBalance < finalTotalWithLoyalty}
                                            readOnly
                                        />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']} style={{ fontWeight: '600' }}>Wallet Payment</span>
                                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                Wallet Balance: ${walletBalance.toFixed(2)}
                                            </span>
                                            {walletBalance < finalTotalWithLoyalty && (
                                                <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>
                                                    Order total exceeds your available wallet balance.
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'wallet' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {buyerCredit && buyerCredit.status === 'active' && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'net-terms' ? styles['active'] : ''}`}
                                        onClick={() => {
                                            if (buyerCredit.available_credit >= finalTotalWithLoyalty) {
                                                setPaymentMethod('net-terms');
                                            }
                                        }}
                                        style={{
                                            opacity: buyerCredit.available_credit >= finalTotalWithLoyalty ? 1 : 0.6,
                                            cursor: buyerCredit.available_credit >= finalTotalWithLoyalty ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="net-terms"
                                            checked={paymentMethod === 'net-terms'}
                                            disabled={buyerCredit.available_credit < finalTotalWithLoyalty}
                                            readOnly
                                        />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']} style={{ fontWeight: '600' }}>Pay Later (Net-Terms Financing)</span>
                                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                Available Credit: ${buyerCredit.available_credit.toFixed(2)} (Net-{buyerCredit.net_days || 30} days)
                                            </span>
                                            {buyerCredit.available_credit < finalTotalWithLoyalty && (
                                                <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>
                                                    Order total exceeds your available credit line.
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'net-terms' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.some(m => m.provider === 'stripe') && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'stripe' ? styles['active'] : ''}`}
                                        onClick={() => setPaymentMethod('stripe')}
                                    >
                                        <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} readOnly />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']}>Stripe (Credit / Debit Card)</span>
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'stripe' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.some(m => m.provider === 'paypal') && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'paypal' ? styles['active'] : ''}`}
                                        onClick={() => setPaymentMethod('paypal')}
                                    >
                                        <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} readOnly />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']}>PayPal</span>
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'paypal' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.some(m => m.provider === 'razorpay') && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'razorpay' ? styles['active'] : ''}`}
                                        onClick={() => setPaymentMethod('razorpay')}
                                    >
                                        <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} readOnly />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']}>Razorpay</span>
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'razorpay' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.some(m => m.provider === 'bank_transfer') && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'bank_transfer' ? styles['active'] : ''}`}
                                        onClick={() => setPaymentMethod('bank_transfer')}
                                    >
                                        <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} readOnly />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']}>Bank Transfer</span>
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'bank_transfer' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.some(m => m.provider === 'cod') && (
                                    <label
                                        className={`${styles['co-payment-row-v2']} ${paymentMethod === 'cod' ? styles['active'] : ''}`}
                                        onClick={() => setPaymentMethod('cod')}
                                    >
                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} readOnly />
                                        <div className={styles['co-pay-info']}>
                                            <span className={styles['co-pay-title']}>Cash on Delivery</span>
                                        </div>
                                        <div className={styles['co-pay-check']}>
                                            {paymentMethod === 'cod' && <div className={styles['dot']}></div>}
                                        </div>
                                    </label>
                                )}

                                {enabledMethods.length === 0 && (
                                    <p className={styles['co-no-methods']}>No payment methods available.</p>
                                )}
                            </div>




                        </section>

                        {/* Items & Delivery */}
                        <section className={styles['co-section']}>
                            <h2 className={styles['co-section-title']} style={{ marginBottom: '12px' }}>{t('items_and_delivery') || 'Items and delivery options'}</h2>
                            {checkoutItems.map((item, idx) => (
                                <div key={idx} className={styles['co-item-row']} style={{ marginBottom: idx < checkoutItems.length - 1 ? '16px' : '0', borderBottom: idx < checkoutItems.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: idx < checkoutItems.length - 1 ? '16px' : '0' }}>
                                    <div className={styles['co-item-img-wrap']} onClick={() => setPreviewIndex(idx)} style={{ cursor: 'pointer' }}>
                                        <img src={item.image} alt="" className={styles['co-item-img']} />
                                        <span className={styles['co-item-qty-badge']}>{item.quantity}</span>
                                    </div>
                                    <div className={styles['co-item-info']}>
                                        <p className={styles['co-item-name']}>{item.name}</p>
                                        {item.variantOptions && Object.entries(item.variantOptions).map(([k, v]) => (
                                            <span key={k} className={styles['co-item-variant']}>{k}: {String(v)}</span>
                                        ))}
                                        {!isBalancePayment && !isQuote && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', height: '28px', background: '#fff', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                                        style={{ width: '28px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', outline: 'none' }}
                                                    >
                                                        -
                                                    </button>
                                                    <span style={{ padding: '0 8px', minWidth: '24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                                        style={{ width: '28px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', outline: 'none' }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    <span>{t('remove') || 'Remove'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles['co-item-price']}>{convertPrice(item.price * item.quantity).formatted}</div>
                                </div>
                            ))}
                        </section>

                        {/* Blind Dropshipping Options */}
                        {isDropshippingSupported && (
                            <div className={styles['co-coupon-container']} style={{ marginTop: '20px', padding: '16px', background: '#fcfcfd', border: '1.5px dashed #e2e8f0', borderRadius: '12px' }}>
                                <label className={styles['co-coupon-label']} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ color: '#ff6600' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1M18 8h-3v4h5V9a1 1 0 00-1-1z" /></svg>
                                    <span>Blind Dropshipping Options</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="blind-dropship-cb"
                                        checked={isDropship}
                                        onChange={e => setIsDropship(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ff6600', marginTop: '3px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <label htmlFor="blind-dropship-cb" style={{ fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#334155' }}>
                                            Enable Blind Dropshipping
                                        </label>
                                        <p style={{ margin: '2px 0 8px', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                                            If enabled, the vendor will ship this order directly to your end-customer without any invoice, logo, or promotional flyers from AliExpress Next.
                                        </p>
                                    </div>
                                </div>
                                {isDropship && (
                                    <div style={{ marginTop: '8px' }}>
                                        <label htmlFor="dropship-note" style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                                            Dropshipping Instructions / Customer Notes
                                        </label>
                                        <input
                                            type="text"
                                            id="dropship-note"
                                            className={styles['co-coupon-input']}
                                            placeholder="e.g. Please write 'Gift from Store' on package"
                                            value={dropshipNote}
                                            onChange={e => setDropshipNote(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Premium Gift Wrapping Options */}
                        {isGiftWrapSupported && (
                            <div className={styles['co-coupon-container']} style={{ marginTop: '20px', padding: '16px', background: '#f5f3ff', border: '1.5px dashed #c084fc', borderRadius: '12px' }}>
                                <label className={styles['co-coupon-label']} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: '#581c87', marginBottom: '8px' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ color: '#8b5cf6' }}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12V8H4v4M2 4h20v4H2V4zm10 4v12M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6H4z" /></svg>
                                    <span>Premium Gift Wrap Services (+{convertPrice(wrapFee).formatted})</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="gift-wrap-cb"
                                        checked={giftWrap}
                                        onChange={e => setGiftWrap(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8b5cf6', marginTop: '3px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <label htmlFor="gift-wrap-cb" style={{ fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#4c1d95' }}>
                                            Wrap this order as a beautiful gift
                                        </label>
                                        <p style={{ margin: '2px 0 8px', fontSize: '11px', color: '#6b21a8', lineHeight: '1.4' }}>
                                            We will wrap your items in holiday premium packaging and exclude price tags from the packages. You can also include a greeting message below!
                                        </p>
                                    </div>
                                </div>
                                {giftWrap && (
                                    <div style={{ marginTop: '8px' }}>
                                        <label htmlFor="gift-message" style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b21a8', marginBottom: '4px' }}>
                                            Personal Greeting Message
                                        </label>
                                        <textarea
                                            id="gift-message"
                                            rows={2}
                                            placeholder="Type your message here (e.g. Happy Birthday! Love, Mom & Dad)"
                                            value={giftMessage}
                                            onChange={e => setGiftMessage(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Submit */}
                        <div className={styles['co-submit-row']}>
                            <button type="submit" disabled={loading} className={styles['co-btn-pay']}>
                                {loading ? 'Processing...' : isSplitPayment ? 'Pay Deposit Now' : (t('continue_to_payment') || 'Continue to payment')}
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────── */}
                    <div className={styles['co-right']}>
                        <div className={styles['co-summary-card']}>
                            <h2 className={styles['co-summary-title']}>{t('order_summary') || 'Order summary'} ({checkoutItems.length} item{checkoutItems.length > 1 ? 's' : ''})</h2>

                            {/* Product thumbs list */}
                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                                {checkoutItems.map((item, idx) => (
                                    <div key={idx} className={styles['co-summary-product']} style={{ marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className={styles['co-item-img-wrap']} onClick={() => setPreviewIndex(idx)} style={{ width: '40px', height: '40px', cursor: 'pointer', position: 'relative' }}>
                                            <img src={item.image} alt="" className={styles['co-item-img']} />
                                            <span className={styles['co-item-qty-badge']}>{item.quantity}</span>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.4', fontWeight: '600' }}>{item.name}</div>
                                            {!isBalancePayment && !isQuote && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', height: '24px', background: '#fff', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                                            style={{ width: '22px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', outline: 'none' }}
                                                        >
                                                            -
                                                        </button>
                                                        <span style={{ padding: '0 4px', minWidth: '18px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                                                            {item.quantity}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                                            style={{ width: '22px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px', outline: 'none' }}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        {t('remove') || 'Remove'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Coupon / Promo Code Field */}
                            {!isQuote && (
                                <div className={styles['co-coupon-container']}>
                                    <label className={styles['co-coupon-label']}>Promo / Coupon Code</label>
                                    {appliedCoupon ? (
                                        <div className={styles['co-coupon-applied-badge']}>
                                            <div className={styles['co-coupon-badge-info']}>
                                                <div className={styles['co-coupon-badge-title']}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                                    {appliedCoupon.code}
                                                </div>
                                                <div className={styles['co-coupon-badge-desc']}>
                                                    Discount: -{convertPrice(appliedCoupon.discount_amount).formatted}
                                                </div>
                                            </div>
                                            <button type="button" className={styles['co-coupon-remove-btn']} onClick={handleRemoveCoupon} title="Remove coupon">×</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles['co-coupon-input-group']}>
                                                <input
                                                    type="text"
                                                    className={styles['co-coupon-input']}
                                                    placeholder="Enter code"
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleApplyCoupon();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles['co-coupon-btn']}
                                                    onClick={() => handleApplyCoupon()}
                                                    disabled={couponLoading}
                                                >
                                                    {couponLoading ? 'Applying...' : 'Apply'}
                                                </button>
                                            </div>
                                            {couponError && (
                                                <div className={styles['co-coupon-error']}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                    {couponError}
                                                </div>
                                            )}
                                            {applicableCoupons.length > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={styles['co-coupons-available-toggle']}
                                                        onClick={() => setShowAvailableCoupons(v => !v)}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '4px' }}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                                        {showAvailableCoupons ? 'Hide available offers' : `View available offers (${applicableCoupons.length})`}
                                                    </button>
                                                    {showAvailableCoupons && (
                                                        <div className={styles['co-coupons-dropdown']}>
                                                            {applicableCoupons.map((coupon) => (
                                                                <div key={coupon._id} className={styles['co-coupon-item']}>
                                                                    <div className={styles['co-coupon-item-info']}>
                                                                        <div className={styles['co-coupon-item-code-row']}>
                                                                            <span className={styles['co-coupon-item-pill']}>{coupon.code}</span>
                                                                            <span className={styles['co-coupon-item-scope']}>
                                                                                {coupon.supplier ? 'Supplier Offer' : 'Global Offer'}
                                                                            </span>
                                                                        </div>
                                                                        <div className={styles['co-coupon-item-desc']}>
                                                                            {coupon.discount_type === 'percentage' 
                                                                                ? `${coupon.discount_value}% Off` 
                                                                                : `$${coupon.discount_value} Off`
                                                                            }
                                                                            {coupon.max_discount_amount && ` up to $${coupon.max_discount_amount}`}
                                                                        </div>
                                                                        <div className={styles['co-coupon-item-min-spend']}>
                                                                            Min. Spend: ${coupon.min_order_amount}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className={styles['co-coupon-item-apply-btn']}
                                                                        onClick={() => handleApplyCoupon(coupon.code)}
                                                                        disabled={couponLoading}
                                                                    >
                                                                        Apply
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Gift Card Wallet Top-up */}
                            {!isQuote && (
                                <div className={styles['co-coupon-container']} style={{ marginTop: '12px' }}>
                                    <label className={styles['co-coupon-label']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>Redeem Gift Card</span>
                                        {walletBalance !== null && (
                                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                                                Wallet: {convertPrice(walletBalance).formatted}
                                            </span>
                                        )}
                                    </label>
                                    <div className={styles['co-coupon-input-group']} style={{ marginTop: '6px' }}>
                                        <input
                                            type="text"
                                            className={styles['co-coupon-input']}
                                            placeholder="Gift Card Code"
                                            value={giftCardCode}
                                            onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                                        />
                                        <button
                                            type="button"
                                            className={styles['co-coupon-btn']}
                                            onClick={handleRedeemGiftCard}
                                            disabled={giftCardLoading || !giftCardCode.trim()}
                                        >
                                            {giftCardLoading ? 'Redeeming...' : 'Redeem'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Apply Gift Card to Order */}
                            {!isQuote && (
                                <div className={styles['co-coupon-container']} style={{ marginTop: '12px' }}>
                                    <label className={styles['co-coupon-label']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>Apply Gift Card to Order</span>
                                        {appliedGiftCard && (
                                            <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>
                                                Applied: -{convertPrice(giftCardDiscount).formatted}
                                            </span>
                                        )}
                                    </label>
                                    {appliedGiftCard ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', padding: '6px 12px', background: '#f5f3ff', border: '1px dashed #c084fc', borderRadius: '6px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#5b21b6' }}>
                                                {appliedGiftCard.code} (Balance: {convertPrice(appliedGiftCard.balance).formatted})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAppliedGiftCard(null)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles['co-coupon-input-group']} style={{ marginTop: '6px' }}>
                                                <input
                                                    type="text"
                                                    className={styles['co-coupon-input']}
                                                    placeholder="Voucher or Gift Card Code"
                                                    value={giftCardApplyCode}
                                                    onChange={e => setGiftCardApplyCode(e.target.value.toUpperCase())}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles['co-coupon-btn']}
                                                    onClick={handleApplyGiftCardToOrder}
                                                    disabled={giftCardApplyLoading || !giftCardApplyCode.trim()}
                                                >
                                                    {giftCardApplyLoading ? 'Applying...' : 'Apply'}
                                                </button>
                                            </div>
                                            {giftCardApplyError && (
                                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{giftCardApplyError}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* AliExpress Coins & Rewards */}
                            {!isQuote && availablePoints > 0 && (
                                <div className={styles['co-coupon-container']} style={{ marginTop: '12px' }}>
                                    <label className={styles['co-coupon-label']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>Redeem AliExpress Coins</span>
                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                                            Balance: {availablePoints} coins
                                        </span>
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <input
                                            type="checkbox"
                                            id="redeem-points-cb"
                                            checked={useLoyaltyPoints}
                                            onChange={e => setUseLoyaltyPoints(e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ff6600' }}
                                        />
                                        <label htmlFor="redeem-points-cb" style={{ fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                                            Use coins for discount (100 coins = $1.00)
                                        </label>
                                    </div>
                                    {useLoyaltyPoints && redeemedPoints > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                            Applying -{convertPrice(pointsDiscount).formatted} discount ({redeemedPoints} coins redeemed)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Price rows */}
                            <div className={styles['co-summary-rows']}>
                                <div className={styles['co-summary-row']}>
                                    <span>{t('merchandise_total') || 'Item subtotal'}</span>
                                    <span>{convertPrice(itemSubtotal).formatted}</span>
                                </div>
                                <div className={styles['co-summary-row']}>
                                    <span>{t('estimated_shipping') || 'Shipping fee'}</span>
                                    <span>{convertPrice(shippingFee).formatted}</span>
                                </div>
                                {taxInfo.amount > 0 && (
                                    <div className={styles['co-summary-row']}>
                                        <span>{t('tax') || 'Tax'} ({taxInfo.name})</span>
                                        <span>{convertPrice(taxInfo.amount).formatted}</span>
                                    </div>
                                )}
                                {dutyFee > 0 && (
                                    <div className={styles['co-summary-row']}>
                                        <span>Import Duty & Tariff (Estimated)</span>
                                        <span>{convertPrice(dutyFee).formatted}</span>
                                    </div>
                                )}
                                {giftWrap && (
                                    <div className={styles['co-summary-row']}>
                                        <span>Gift Wrap Services</span>
                                        <span>{convertPrice(5.00).formatted}</span>
                                    </div>
                                )}
                                {appliedCoupon && (
                                    <div className={`${styles['co-summary-row']} ${styles['co-discount-row']}`}>
                                        <span>Coupon Discount ({appliedCoupon.code})</span>
                                        <span className={styles['co-discount-amount']}>-{convertPrice(appliedCoupon.discount_amount).formatted}</span>
                                    </div>
                                )}
                                {pointsDiscount > 0 && (
                                    <div className={`${styles['co-summary-row']} ${styles['co-discount-row']}`}>
                                        <span>Coins Discount ({redeemedPoints} coins)</span>
                                        <span className={styles['co-discount-amount']}>-{convertPrice(pointsDiscount).formatted}</span>
                                    </div>
                                )}
                                {appliedGiftCard && giftCardDiscount > 0 && (
                                    <div className={`${styles['co-summary-row']} ${styles['co-discount-row']}`}>
                                        <span>Gift Card ({appliedGiftCard.code})</span>
                                        <span className={styles['co-discount-amount']}>-{convertPrice(giftCardDiscount).formatted}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles['co-summary-rows'] + " " + styles['co-summary-sub']}>
                                <div className={styles['co-summary-row'] + " " + styles['co-bold']}>
                                    <span>{t('subtotal') || 'Subtotal'}</span>
                                    <span>{convertPrice(orderTotal).formatted}</span>
                                </div>
                                <div className={styles['co-summary-row']}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {commissionInfo.name || t('payment_processing_fee') || 'Payment processing fee'}
                                        <span title="Estimated platform service fee" style={{ cursor: 'help', color: '#aaa' }}>ⓘ</span>
                                    </span>
                                    <span>{convertPrice(processingFee).formatted}</span>
                                </div>
                            </div>

                            {isEmiSelected && selectedEmiPlanId ? (() => {
                                const selectedPlan = emiPlans.find(p => p._id === selectedEmiPlanId);
                                if (!selectedPlan) return null;
                                const calc = getEmiCalculation(selectedPlan);
                                return (
                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                            <span>Principal Order Amount</span>
                                            <span style={{ fontWeight: '600' }}>{convertPrice(finalTotalWithLoyalty).formatted}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                            <span>Processing Fee</span>
                                            <span style={{ fontWeight: '600' }}>{convertPrice(selectedPlan.processing_fee).formatted}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                            <span>Interest ({selectedPlan.interest_rate}%)</span>
                                            <span style={{ fontWeight: '600' }}>{convertPrice(calc.interestTotal).formatted}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#10b981' }}>
                                            <span>Monthly Installment</span>
                                            <span style={{ fontWeight: '700' }}>{convertPrice(calc.monthlyPayment).formatted} / month</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                            <span>EMI Duration</span>
                                            <span style={{ fontWeight: '600' }}>{selectedPlan.installments} months</span>
                                        </div>
                                        <div className={styles['co-summary-total']} style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '8px' }}>
                                            <span>First Installment Due Now</span>
                                            <span>{convertPrice(calc.dueNow).formatted}</span>
                                        </div>
                                    </div>
                                );
                            })() : isSplitPayment ? (
                                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                        <span>Total Order Amount</span>
                                        <span style={{ fontWeight: '600' }}>{convertPrice(finalTotalWithLoyalty).formatted}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#10b981' }}>
                                        <span>30% Deposit Due Now</span>
                                        <span style={{ fontWeight: '700' }}>{convertPrice(parseFloat((finalTotalWithLoyalty * 0.3).toFixed(2))).formatted}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                        <span>70% Balance Due Later</span>
                                        <span style={{ fontWeight: '600' }}>{convertPrice(parseFloat((finalTotalWithLoyalty * 0.7).toFixed(2))).formatted}</span>
                                    </div>
                                    <div className={styles['co-summary-total']} style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '8px' }}>
                                        <span>Amount to Pay</span>
                                        <span>{convertPrice(parseFloat((finalTotalWithLoyalty * 0.3).toFixed(2))).formatted}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles['co-summary-total']}>
                                    <span>{t('pay_in') || 'Pay in'} {currency}</span>
                                    <span>{convertPrice(finalTotalWithLoyalty).formatted}</span>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className={styles['co-btn-pay'] + " " + styles['co-pay-full']}>
                                {loading ? (t('processing') || 'Processing...') : isSplitPayment ? 'Pay Deposit Now' : (t('pay_now') || 'Pay now')}
                            </button>

                            <p className={styles['co-terms']}>
                                {t('by_clicking_above') || 'By clicking the above, you agree to'}{' '}
                                <Link href="/page/terms-of-use" className={styles['co-link']}>{t('terms_of_use') || 'Terms of Use'}</Link> {t('and') || 'and'}{' '}
                                <Link href="/page/privacy-policy" className={styles['co-link']}>{t('privacy_policy') || 'Privacy Policy'}</Link>
                            </p>

                            {/* Protection */}
                            <div className={styles['co-protection']}>
                                <div className={styles['co-protection-header']} onClick={() => setProtectionOpen(v => !v)}>
                                    <span className={styles['co-protection-title']}>{siteSettings?.site_name || 'B2B'} order protection</span>
                                    <span>{protectionOpen ? '∧' : '›'}</span>
                                </div>
                                {protectionOpen && (
                                    <div className={styles['co-protection-items']}>
                                        {[
                                            { title: 'Secure payments', text: 'Every payment is secured with strict SSL encryption and PCI DSS data protection.' },
                                            { title: `Delivery via ${siteSettings?.site_name || 'B2B'} Logistics`, text: 'Expect your order delivered on time or receive compensation.' },
                                            { title: 'Money-back protection', text: "Claim a refund if your order doesn't ship, is missing, or arrives with issues." },
                                        ].map((p, i) => (
                                            <div key={i} className={styles['co-protection-item']}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                <div>
                                                    <div className={styles['co-protection-item-title']}>{p.title}</div>
                                                    <div className={styles['co-protection-item-text']}>{p.text}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </form>
            </div>
            {previewIndex !== null && checkoutItems[previewIndex] && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                    }}
                    onClick={() => setPreviewIndex(null)}
                >
                    {/* Close button */}
                    <button 
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100000,
                            transition: 'background 0.2s'
                        }}
                        onClick={() => setPreviewIndex(null)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        &times;
                    </button>

                    <div 
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '90%',
                            maxWidth: '650px',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Content Card */}
                        <div 
                            style={{
                                background: '#fff',
                                borderRadius: '16px',
                                padding: '16px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                position: 'relative'
                            }}
                        >
                            {/* Prev Button */}
                            {checkoutItems.length > 1 && (
                                <button
                                    style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        color: '#fff',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s',
                                        zIndex: 100002
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(previewIndex === 0 ? checkoutItems.length - 1 : previewIndex - 1);
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'}
                                >
                                    &#10094;
                                </button>
                            )}

                            <img 
                                src={checkoutItems[previewIndex].image} 
                                alt={checkoutItems[previewIndex].name} 
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '65vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px'
                                }} 
                            />

                            {/* Next Button */}
                            {checkoutItems.length > 1 && (
                                <button
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        color: '#fff',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s',
                                        zIndex: 100002
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(previewIndex === checkoutItems.length - 1 ? 0 : previewIndex + 1);
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'}
                                >
                                    &#10095;
                                </button>
                            )}

                            <div 
                                style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: '#1e293b', 
                                    textAlign: 'center',
                                    width: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    padding: '0 45px'
                                }}
                            >
                                {checkoutItems[previewIndex].name}
                            </div>
                        </div>
                    </div>

                    {/* Pagination Indicators / Dots */}
                    {checkoutItems.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            {checkoutItems.map((_, dotIdx) => (
                                <button
                                    key={dotIdx}
                                    style={{
                                        border: 'none',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: dotIdx === previewIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        padding: 0,
                                        transition: 'background 0.2s, transform 0.2s',
                                        transform: dotIdx === previewIndex ? 'scale(1.2)' : 'none'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(dotIdx);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export default Checkout;
