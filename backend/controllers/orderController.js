const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Razorpay = require('razorpay');
const Product = require('../models/Product');
const Order = require('../models/Order');
const TaxRule = require('../models/TaxRule');
const ShippingRule = require('../models/ShippingRule');
const CommissionRule = require('../models/CommissionRule');
const riskService = require('../services/riskService');
const { decrementProductStock } = require('./productController');
const { addJob } = require('../services/queueService');
const OrderStatusLog = require('../models/OrderStatusLog');

const createOrderStatusLog = async (orderId, status, message = '') => {
    try {
        await OrderStatusLog.create({
            order_id: orderId,
            status: status,
            message: message
        });
    } catch (err) {
        console.error('Error creating order status log:', err);
    }
};

const getShippingFeeForOrder = async (countryCode, items = []) => {
    try {
        const rule = await ShippingRule.findOne({ country_code: countryCode.toUpperCase(), is_active: true });
        if (!rule) return 50; // Default flat fee if no rule

        let totalWeight = 0;
        for (const item of items) {
            const product = await Product.findById(item.productId || item.product_id);
            if (product && product.weight) {
                totalWeight += product.weight * (item.quantity || 1);
            }
        }

        return rule.base_cost + (totalWeight * rule.cost_per_kg);
    } catch (err) {
        return 50;
    }
};

// Internal helper for tax calculation
const getTaxAmountForOrder = async (countryCode, amount, items = []) => {
    let totalTax = 0;
    let taxBreakdown = [];

    // Check for product-specific or category-specific taxes first if items are provided
    for (const item of items) {
        let itemRule = await TaxRule.findOne({ country_code: countryCode, scope: 'product', product_ids: item.productId || item.product_id, is_active: true });

        if (!itemRule) {
            // Need to fetch product for category_id if not in item
            const product = await Product.findById(item.productId || item.product_id);
            if (product) {
                itemRule = await TaxRule.findOne({ country_code: countryCode, scope: 'category', category_ids: product.category, is_active: true });
            }
        }

        if (itemRule) {
            const itemAmount = (item.price || 0) * (item.quantity || 1);
            const tax = itemRule.type === 'percentage' ? (itemAmount * itemRule.value) / 100 : itemRule.value;
            totalTax += tax;
            taxBreakdown.push({ name: itemRule.name, amount: tax, rule: itemRule });
        }
    }

    // If no item-specific taxes were applied, check for global country tax
    if (totalTax === 0) {
        const globalRule = await TaxRule.findOne({ country_code: countryCode, scope: 'global', is_active: true });
        if (globalRule) {
            totalTax = globalRule.type === 'percentage' ? (amount * globalRule.value) / 100 : globalRule.value;
            taxBreakdown.push({ name: globalRule.name, amount: totalTax, rule: globalRule });
        }
    }

    return { totalTax: parseFloat(totalTax.toFixed(2)), primaryRule: taxBreakdown[0]?.rule || null };
};

// @desc    Checkout for an accepted RFQ quote
// @route   POST /api/orders/checkout-quote/:quoteId
// @access  Private
exports.checkoutQuote = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.quoteId).populate('rfq').populate('supplier');
        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        if (quote.status !== 'accepted') {
            return res.status(400).json({ message: 'Only accepted quotes can be paid for' });
        }

        if (quote.rfq.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const itemSubtotal = quote.price_offered * (quote.rfq.quantity || 1);
        
        // Dynamic Commission
        let commRule = await CommissionRule.findOne({ is_active: true }); // Fallback to first active rule
        let serviceFee = parseFloat((itemSubtotal * 0.03).toFixed(2)); // Default fallback
        if (commRule) {
            serviceFee = commRule.type === 'Percentage' ? (itemSubtotal * commRule.value) / 100 : commRule.value;
        }

        const buyerCountry = req.user.country_code || 'US';
        const currencyCode = (quote.currency || 'USD').toLowerCase();
        const { totalTax, primaryRule } = await getTaxAmountForOrder(buyerCountry, itemSubtotal, [{ product_id: quote.rfq.product_id, price: quote.price_offered, quantity: quote.rfq.quantity }]);

        const lineItems = [{
            price_data: {
                currency: currencyCode,
                product_data: {
                    name: `RFQ Order: ${quote.rfq.title}`,
                    description: `Custom quote fulfillment for RFQ #${quote.rfq._id}`
                },
                unit_amount: Math.round(quote.price_offered * 100),
            },
            quantity: quote.rfq.quantity,
        }];

        if (serviceFee > 0) {
            lineItems.push({
                price_data: {
                    currency: currencyCode,
                    product_data: { name: 'Platform Service Fee' },
                    unit_amount: Math.round(serviceFee * 100),
                },
                quantity: 1,
            });
        }

        if (totalTax > 0) {
            lineItems.push({
                price_data: {
                    currency: currencyCode,
                    product_data: {
                        name: primaryRule ? `Tax (${primaryRule.name})` : 'Tax',
                    },
                    unit_amount: Math.round(totalTax * 100),
                },
                quantity: 1,
            });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || '';
        const { paymentMethod, useSplitPayment } = req.body;
        const targetMethod = paymentMethod || 'stripe';
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: targetMethod, enable: true });

        if (!settings && targetMethod !== 'stripe' && targetMethod !== 'net-terms' && targetMethod !== 'wallet') {
            return res.status(400).json({ message: `${targetMethod} payment is not enabled` });
        }

        if (useSplitPayment) {
            if (itemSubtotal < 100) {
                return res.status(400).json({ message: 'Split payment is only available for orders with a subtotal of $100 or greater.' });
            }
            const Company = require('../models/Company');
            const company = await Company.findOne({ user_id: quote.supplier?._id || quote.supplier });
            if (!company || !company.split_payment_enabled) {
                return res.status(400).json({ message: 'Split payment is not enabled by the supplier.' });
            }
            if (targetMethod !== 'stripe' && targetMethod !== 'razorpay') {
                return res.status(400).json({ message: 'Split payment is only supported for Stripe and Razorpay.' });
            }
        }

        let responseData = {};

        if (targetMethod === 'stripe') {
            const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
            let finalStripeLineItems = lineItems;
            if (useSplitPayment) {
                const finalTotal = itemSubtotal + totalTax + serviceFee;
                const depositAmount = parseFloat((finalTotal * 0.3).toFixed(2));
                
                finalStripeLineItems = [{
                    price_data: {
                        currency: currencyCode,
                        product_data: {
                            name: `30% Deposit Secure Payment: RFQ Order - ${quote.rfq.title}`,
                            description: `Custom quote deposit fulfillment for RFQ #${quote.rfq._id}`
                        },
                        unit_amount: Math.round(depositAmount * 100)
                    },
                    quantity: 1
                }];
            }

            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: finalStripeLineItems,
                mode: 'payment',
                success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`,
                client_reference_id: req.user._id.toString(),
                metadata: {
                    quoteId: quote._id.toString(),
                    rfqId: quote.rfq._id.toString(),
                    paymentType: useSplitPayment ? 'deposit' : 'full'
                }
            });
            responseData = { id: session.id, url: session.url };
        } else if (targetMethod === 'paypal') {
            const isMock = !settings.public_key || !settings.secret_key ||
                           settings.public_key.includes('mock') || settings.secret_key.includes('mock');
            if (isMock) {
                const mockOrderId = `paypal_order_mock_${Date.now()}`;
                responseData = {
                    id: mockOrderId,
                    url: `${FRONTEND_URL}/dashboard?status=success&token=${mockOrderId}`,
                    is_mock: true
                };
            } else {
                const clientId = settings.public_key;
                const clientSecret = settings.secret_key;
                const environment = settings.live_mode 
                    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
                    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
                const client = new paypal.core.PayPalHttpClient(environment);

                const request = new paypal.orders.OrdersCreateRequest();
                request.prefer("return=representation");
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: 'USD',
                            value: (itemSubtotal + totalTax + serviceFee).toFixed(2)
                        },
                        description: `RFQ Order: ${quote.rfq.title}`
                    }],
                    application_context: {
                        return_url: `${FRONTEND_URL}/dashboard?status=success`,
                        cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`
                    }
                });

                const order = await client.execute(request);
                const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
                responseData = { id: order.result.id, url: approvalUrl };
            }
        } else if (targetMethod === 'razorpay') {
            const finalTotal = itemSubtotal + totalTax + serviceFee;
            const rzpAmount = useSplitPayment 
                ? Math.round(parseFloat((finalTotal * 0.3).toFixed(2)) * 100)
                : Math.round(finalTotal * 100);

            const isMock = !settings.public_key || !settings.secret_key ||
                           settings.public_key.includes('mock') || settings.secret_key.includes('mock');
            if (isMock) {
                responseData = {
                    id: `rzp_order_mock_${Date.now()}`,
                    amount: rzpAmount,
                    currency: "INR",
                    key: settings.public_key || "rzp_test_mock_key",
                    is_mock: true
                };
            } else {
                const instance = new Razorpay({
                    key_id: settings.public_key,
                    key_secret: settings.secret_key,
                });

                const options = {
                    amount: rzpAmount,
                    currency: "INR",
                    receipt: `quote_${quote._id}_${Date.now()}`,
                };

                const rzpOrder = await instance.orders.create(options);
                responseData = { 
                    id: rzpOrder.id, 
                    amount: rzpOrder.amount, 
                    currency: rzpOrder.currency,
                    key: settings.public_key 
                };
            }
        } else if (targetMethod === 'net-terms') {
            const BusinessCredit = require('../models/BusinessCredit');
            const netTermsCredit = await BusinessCredit.findOne({ buyer_id: req.user._id });
            if (!netTermsCredit || netTermsCredit.status !== 'active') {
                return res.status(400).json({ message: 'You do not have an active Net-Terms credit line profile.' });
            }
            const totalOrderAmount = itemSubtotal + totalTax + serviceFee;
            if (netTermsCredit.available_credit < totalOrderAmount) {
                return res.status(400).json({ message: `Insufficient business credit limit. Required: $${totalOrderAmount.toFixed(2)}, Available: $${netTermsCredit.available_credit.toFixed(2)}.` });
            }

            netTermsCredit.available_credit = parseFloat((netTermsCredit.available_credit - totalOrderAmount).toFixed(2));
            netTermsCredit.used_credit = parseFloat((netTermsCredit.used_credit + totalOrderAmount).toFixed(2));
            await netTermsCredit.save();

            responseData = { success: true, message: 'Payment approved with Net-Terms credit line', order_method: 'net-terms' };
        } else if (targetMethod === 'wallet') {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const totalOrderAmount = itemSubtotal + totalTax + serviceFee;
            if ((user.wallet_balance || 0) < totalOrderAmount) {
                return res.status(400).json({ message: `Insufficient wallet balance. Required: $${totalOrderAmount.toFixed(2)}, Available: $${(user.wallet_balance || 0).toFixed(2)}.` });
            }

            user.wallet_balance = parseFloat(((user.wallet_balance || 0) - totalOrderAmount).toFixed(2));
            await user.save();

            responseData = { success: true, message: 'Payment approved with Wallet balance', order_method: 'wallet' };
        }

        const isImmediate = (targetMethod === 'net-terms' || targetMethod === 'wallet');
        const ordTotal = itemSubtotal + totalTax + serviceFee;
        const ordDepositAmount = parseFloat((ordTotal * 0.3).toFixed(2));
        const ordBalanceAmount = parseFloat((ordTotal * 0.7).toFixed(2));

        // Create the order
        const newOrder = await Order.create({
            buyer_id: req.user._id,
            supplier_id: quote.supplier._id,
            shipping_address: req.body.shippingAddress,
            order_items: [{
                rfq_id: quote.rfq._id,
                quote_id: quote._id,
                name: quote.rfq.title,
                quantity: quote.rfq.quantity,
                price: quote.price_offered,
            }],
            tax_amount: totalTax,
            tax_info: primaryRule ? {
                name: primaryRule.name,
                tax_type: primaryRule.type,
                value: primaryRule.value,
                country_code: primaryRule.country_code
            } : null,
            service_fee: serviceFee,
            total_amount: ordTotal,
            is_split_payment: useSplitPayment ? true : false,
            deposit_amount: useSplitPayment ? ordDepositAmount : 0,
            balance_amount: useSplitPayment ? ordBalanceAmount : 0,
            deposit_paid: false,
            balance_paid: false,
            deposit_stripe_session_id: (useSplitPayment && targetMethod === 'stripe') ? responseData.id : null,
            deposit_razorpay_order_id: (useSplitPayment && targetMethod === 'razorpay') ? responseData.id : null,
            stripe_session_id: (!useSplitPayment && targetMethod === 'stripe') ? responseData.id : null,
            paypal_order_id: targetMethod === 'paypal' ? responseData.id : null,
            razorpay_order_id: (!useSplitPayment && targetMethod === 'razorpay') ? responseData.id : null,
            payment_provider: targetMethod,
            payment_method: targetMethod === 'net-terms' ? 'Net-Terms' : (targetMethod === 'wallet' ? 'Wallet' : (targetMethod === 'stripe' ? 'Stripe' : (targetMethod === 'paypal' ? 'PayPal' : (targetMethod === 'razorpay' ? 'Razorpay' : targetMethod)))),
            status: isImmediate ? 'confirmed' : 'pending',
            payment_status: isImmediate ? 'paid' : 'unpaid'
        });

        // Initialize Timeline
        await createOrderStatusLog(newOrder._id, isImmediate ? 'Order Placed & Paid' : 'Order Placed', isImmediate ? `Order created and paid with ${targetMethod === 'wallet' ? 'Wallet balance' : 'Net-Terms credit line'}` : 'Order created and awaiting payment');

        // Log Transaction & execute post-payment tasks
        if (targetMethod === 'net-terms') {
            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user_id: req.user._id,
                order_id: newOrder._id,
                type: 'payment',
                amount: newOrder.total_amount,
                status: 'completed',
                description: `Checkout payment for Order ${newOrder._id} using Net-Terms financing.`
            });
        }

        if (targetMethod === 'wallet') {
            const Transaction = require('../models/Transaction');
            await Transaction.create({
                user_id: req.user._id,
                order_id: newOrder._id,
                type: 'payment',
                amount: newOrder.total_amount,
                status: 'completed',
                description: `Checkout payment for Order ${newOrder._id} using Wallet balance.`
            });

            // Post-payment actions (decrement stock, notify, credit supplier wallet, etc.)
            await completePaymentPostTasks(newOrder, req.io);
        }

        res.json(responseData);
    } catch (err) {
        console.error('Quote checkout error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create Stripe checkout session
// @route   POST /api/orders/create-checkout-session
// @access  Private
exports.createCheckoutSession = async (req, res) => {
    try {
        const { items, shippingFee, countryCode, paymentMethod, couponCode, referralCode, useSplitPayment, redeemPoints, is_dropship, dropship_note, is_emi, emi_plan_id, gift_wrap, gift_message, giftCardCode, guestEmail, guestName, guestPhone } = req.body;

        // Auto-provision buyer account for guest checkout if not authenticated
        if (!req.user) {
            if (!guestEmail) {
                return res.status(400).json({ message: 'Authentication required, or guest email must be provided for guest checkout.' });
            }

            const User = require('../models/User');
            let guestUser = await User.findOne({ email: guestEmail.toLowerCase() });
            
            if (!guestUser) {
                const bcrypt = require('bcryptjs');
                const randomPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(randomPassword, salt);

                const nameParts = (guestName || 'Guest Buyer').trim().split(/\s+/);
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || 'User';

                guestUser = new User({
                    first_name: firstName,
                    last_name: lastName,
                    email: guestEmail.toLowerCase(),
                    password: hashedPassword,
                    phone_number: guestPhone || '',
                    role: 'buyer',
                    roles: ['buyer'],
                    is_active: true,
                    country_code: countryCode || 'US'
                });
                await guestUser.save();
            }
            req.user = guestUser;
            req.isGuestCheckout = true;
        }

        const targetMethod = paymentMethod || 'stripe';
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: (targetMethod === 'apple_pay' ? 'stripe' : targetMethod), enable: true });

        if (!settings && targetMethod !== 'stripe' && targetMethod !== 'apple_pay' && targetMethod !== 'net-terms' && targetMethod !== 'wallet') {
            return res.status(400).json({ message: `${targetMethod} payment is not enabled` });
        }

        let emiPlan = null;
        if (is_emi && emi_plan_id) {
            const EmiPlan = require('../models/EmiPlan');
            emiPlan = await EmiPlan.findById(emi_plan_id);
            if (!emiPlan || !emiPlan.is_active) {
                return res.status(400).json({ message: 'Selected EMI plan is invalid or inactive' });
            }
        }

        const buyerCountry = countryCode || req.user.country_code || 'US';
        let dynamicShippingFee = shippingFee !== undefined ? shippingFee : await getShippingFeeForOrder(buyerCountry, items || []);

        // Load site settings once for free delivery and first-time fee checks
        const SiteSetting = require('../models/SiteSetting');
        const siteSettings = await SiteSetting.findOne();

        let normalizedItems = items;
        if (!items && req.body.productId) {
            normalizedItems = [{
                productId: req.body.productId,
                quantity: req.body.quantity,
                variantOptions: req.body.variantOptions,
                customizationId: req.body.customizationId
            }];
        }

        if (!normalizedItems || normalizedItems.length === 0) {
            return res.status(400).json({ message: 'No items in cart' });
        }

        // Validate coupon code if provided
        let discountAmount = 0;
        let appliedCoupon = null;

        if (couponCode) {
            const { validateCouponInternal } = require('./couponController');
            const validation = await validateCouponInternal(couponCode, normalizedItems, req.user._id);
            if (validation.isValid) {
                discountAmount = validation.discountAmount;
                appliedCoupon = validation.coupon;
            } else {
                return res.status(400).json({ message: validation.message });
            }
        }

        // Validate gift card code if provided
        let giftCardAppliedDiscount = 0;
        let validatedGiftCard = null;

        if (giftCardCode) {
            const GiftCard = require('../models/GiftCard');
            const card = await GiftCard.findOne({ code: giftCardCode.toUpperCase().trim() });
            if (!card) {
                return res.status(400).json({ message: 'Invalid Gift Card code' });
            }
            if (!card.is_active || card.balance <= 0) {
                return res.status(400).json({ message: 'Gift Card is inactive or has zero balance' });
            }
            if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
                card.is_active = false;
                await card.save();
                return res.status(400).json({ message: 'Gift Card has expired' });
            }
            if (card.owner && card.owner.toString() !== req.user._id.toString()) {
                return res.status(400).json({ message: 'This Gift Card belongs to another user' });
            }
            validatedGiftCard = card;
        }

        // Loyalty points discount calculation
        let pointsDiscount = 0;
        let redeemedPointsAmount = 0;
        if (redeemPoints && Number(redeemPoints) > 0) {
            const User = require('../models/User');
            const userObj = await User.findById(req.user._id);
            if (userObj) {
                const availablePoints = userObj.loyalty_points || 0;
                redeemedPointsAmount = Math.min(Number(redeemPoints), availablePoints);
                if (redeemedPointsAmount > 0) {
                    pointsDiscount = parseFloat((redeemedPointsAmount / 100).toFixed(2));
                }
            }
        }

        const lineItems = [];
        const supplierOrders = {}; // Group by supplierId

        const pricingService = require('../services/pricingService');
        const userContext = req.user ? { id: req.user._id } : null;
        const pricingResult = await pricingService.calculateCartTotals(normalizedItems, userContext);
        let totalCartAmount = pricingResult.totalCartAmount;

        for (const item of pricingResult.items) {
            const product = await Product.findById(item.product_id); // populate supplier isn't strictly needed here if pricingService returned it
            if (!product) continue;

            const price = item.final_price;
            const itemSubtotal = item.subtotal;

            // Usage logging (handled after payment normally, but for now we'll just track it via the order)
            item.originalItem = normalizedItems.find(n => n.productId.toString() === item.product_id.toString());


            const productData = { name: product.name };
            const variantValues = item.originalItem.variantOptions ? Object.values(item.originalItem.variantOptions) : [];
            if (variantValues.length > 0) {
                productData.description = `Variants: ${variantValues.join(', ')}`;
            }

            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: productData,
                    unit_amount: Math.round(price * 100),
                },
                quantity: item.quantity,
            });

            // Group for order creation
            const supplier = product.supplier;
            const sId = supplier?._id?.toString() || 'unknown_supplier';
            if (!supplierOrders[sId]) {
                supplierOrders[sId] = {
                    supplier: sId === 'unknown_supplier' ? null : sId,
                    items: [],
                    subtotal: 0
                };
            }
            supplierOrders[sId].items.push({
                product_id: product._id,
                name: product.name,
                quantity: item.quantity,
                price: price,
                image: product.images?.[0] || product.main_image || '',
                customization_id: item.originalItem.customizationId
            });
            supplierOrders[sId].subtotal += itemSubtotal;
        }

        // Validate split payment eligibility
        if (useSplitPayment) {
            if (totalCartAmount < 100) {
                return res.status(400).json({ message: 'Split payment is only available for orders with a subtotal of $100 or greater.' });
            }
            const Company = require('../models/Company');
            for (const supplierId of Object.keys(supplierOrders)) {
                if (supplierId === 'unknown_supplier') continue;
                const company = await Company.findOne({ user_id: supplierId });
                if (!company || !company.split_payment_enabled) {
                    return res.status(400).json({ message: 'Split payment is not enabled by the supplier.' });
                }
            }
            if (targetMethod !== 'stripe' && targetMethod !== 'razorpay') {
                return res.status(400).json({ message: 'Split payment is only supported for Stripe and Razorpay.' });
            }
        }

        // Calculate Tax and Fees for the entire cart
        const { totalTax, primaryRule } = await getTaxAmountForOrder(buyerCountry, totalCartAmount, normalizedItems);
        
        // Dynamic Commission calculation
        let totalServiceFee = 0;
        const mainCommRule = await CommissionRule.findOne({ appliesTo: 'All Products', is_active: true });
        if (mainCommRule) {
            totalServiceFee = mainCommRule.type === 'Percentage' ? (totalCartAmount * mainCommRule.value) / 100 : mainCommRule.value;
        } else {
            totalServiceFee = parseFloat((totalCartAmount * 0.03).toFixed(2)); // Original fallback
        }

        // Apply free delivery override based on SiteSettings
        const freeDeliveryEnabled = siteSettings?.free_delivery_enabled;
        const freeDeliveryThreshold = parseFloat(siteSettings?.free_delivery_threshold || 0);
        if (freeDeliveryEnabled && (freeDeliveryThreshold === 0 || totalCartAmount >= freeDeliveryThreshold)) {
            dynamicShippingFee = 0;
        }

        // Apply first-time platform fee free override based on SiteSettings
        if (siteSettings?.first_time_platform_fee_free) {
            const hasExistingOrders = await Order.exists({
                buyer_id: req.user._id,
                status: { $ne: 'cancelled' }
            });
            if (!hasExistingOrders) {
                totalServiceFee = 0;
            }
        }

        // Calculate Import Duty Tariff for international orders based on HS code
        let totalDutyFee = 0;
        for (const item of normalizedItems) {
            const product = await Product.findById(item.productId).populate('supplier');
            if (!product) continue;
            
            const supplierCountry = product.supplier?.country_code || 'US';
            const isCrossBorder = supplierCountry.toUpperCase() !== buyerCountry.toUpperCase();
            
            if (isCrossBorder && product.hs_code) {
                // Apply 5% import duty for HS-coded cross-border items
                let price = product.main_price;
                if (item.customizationId) {
                    price = item.price;
                } else {
                    if (product.price_tiers?.length > 0) {
                        const sortedTiers = [...product.price_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
                        for (const tier of sortedTiers) {
                            if (item.quantity >= tier.min_quantity) price = tier.price;
                        }
                    }
                    if (item.variantOptions) {
                        Object.entries(item.variantOptions).forEach(([vName, vVal]) => {
                            const v = product.variants?.find(x => x.name === vName && x.value === vVal);
                            if (v?.price_modifier) price += v.price_modifier;
                        });
                    }
                }
                const itemSubtotal = price * item.quantity;
                totalDutyFee += parseFloat((itemSubtotal * 0.05).toFixed(2));
            }
        }
        totalDutyFee = parseFloat(totalDutyFee.toFixed(2));

        if (totalDutyFee > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Import Duty & Customs Tariff' },
                    unit_amount: Math.round(totalDutyFee * 100),
                },
                quantity: 1,
            });
        }


        if (totalServiceFee > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Platform Service Fee' },
                    unit_amount: Math.round(totalServiceFee * 100),
                },
                quantity: 1,
            });
        }

        if (totalTax > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: primaryRule ? `Tax (${primaryRule.name})` : 'Tax',
                    },
                    unit_amount: Math.round(totalTax * 100),
                },
                quantity: 1,
            });
        }

        if (dynamicShippingFee > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Shipping & Logistics' },
                    unit_amount: Math.round(dynamicShippingFee * 100),
                },
                quantity: 1,
            });
        }

        let giftWrapFee = 0;
        if (gift_wrap) {
            const SiteSetting = require('../models/SiteSetting');
            const siteSettings = await SiteSetting.findOne();
            giftWrapFee = siteSettings && siteSettings.gift_wrap_fee !== undefined ? siteSettings.gift_wrap_fee : 5.00;
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Premium Gift Wrapping Services' },
                    unit_amount: Math.round(giftWrapFee * 100),
                },
                quantity: 1,
            });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || '';

        let responseData = {};
        let netTermsCredit = null;

        // Calculate order total including giftWrapFee
        const totalOrderAmount = Math.max(0, totalCartAmount + totalTax + dynamicShippingFee + totalServiceFee + totalDutyFee + giftWrapFee - discountAmount - pointsDiscount);

        giftCardAppliedDiscount = 0;
        if (validatedGiftCard) {
            giftCardAppliedDiscount = Math.min(validatedGiftCard.balance, totalOrderAmount);
        }
        const payableAmount = parseFloat((totalOrderAmount - giftCardAppliedDiscount).toFixed(2));

        // EMI Calculations
        let emiFirstInstallment = 0;
        let emiAmortization = null;

        if (is_emi && emiPlan) {
            const P = payableAmount;
            const R = (emiPlan.interest_rate / 100);
            const N = emiPlan.installments;
            let monthlyPayment = 0;
            let interest_total = 0;

            if (R === 0) {
                monthlyPayment = P / N;
            } else {
                monthlyPayment = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
                interest_total = (monthlyPayment * N) - P;
            }
            monthlyPayment = Math.round(monthlyPayment * 100) / 100;
            interest_total = Math.round(interest_total * 100) / 100;
            const total_payable = Math.round(((monthlyPayment * N) + emiPlan.processing_fee) * 100) / 100;
            const firstInstallment = Math.round((monthlyPayment + emiPlan.processing_fee) * 100) / 100;

            emiFirstInstallment = firstInstallment;
            emiAmortization = {
                monthlyPayment,
                interest_total,
                total_payable,
                firstInstallment
            };
        }

        // Deduct points from the user's loyalty_points balance if applicable
        if (redeemedPointsAmount > 0) {
            const User = require('../models/User');
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { loyalty_points: -redeemedPointsAmount }
            });
            const LoyaltyTransaction = require('../models/LoyaltyTransaction');
            await LoyaltyTransaction.create({
                user: req.user._id,
                points: -redeemedPointsAmount,
                type: 'redemption',
                description: `Redeemed ${redeemedPointsAmount} points for checkout discount`
            });
        }

        if (payableAmount === 0) {
            responseData = { success: true, message: 'Fully paid via Gift Card', order_method: 'gift-card' };
        } else if (targetMethod === 'net-terms') {
            if (is_emi) {
                return res.status(400).json({ message: 'EMI is not supported with Net-Terms financing' });
            }
            const BusinessCredit = require('../models/BusinessCredit');
            netTermsCredit = await BusinessCredit.findOne({ buyer_id: req.user._id });
            if (!netTermsCredit || netTermsCredit.status !== 'active') {
                return res.status(400).json({ message: 'You do not have an active Net-Terms credit line profile.' });
            }
            if (netTermsCredit.available_credit < payableAmount) {
                return res.status(400).json({ message: `Insufficient business credit limit. Required: $${payableAmount.toFixed(2)}, Available: $${netTermsCredit.available_credit.toFixed(2)}.` });
            }

            // Deduct available credit and add to used credit
            netTermsCredit.available_credit = parseFloat((netTermsCredit.available_credit - payableAmount).toFixed(2));
            netTermsCredit.used_credit = parseFloat((netTermsCredit.used_credit + payableAmount).toFixed(2));
            await netTermsCredit.save();

            responseData = { success: true, message: 'Payment approved with Net-Terms credit line', order_method: 'net-terms' };
        } else if (targetMethod === 'wallet') {
            const User = require('../models/User');
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            const amountToCharge = (is_emi && emiPlan) ? emiFirstInstallment : payableAmount;
            if ((user.wallet_balance || 0) < amountToCharge) {
                return res.status(400).json({ message: `Insufficient wallet balance. Required: $${amountToCharge.toFixed(2)}, Available: $${(user.wallet_balance || 0).toFixed(2)}.` });
            }

            // Deduct from wallet balance
            user.wallet_balance = parseFloat(((user.wallet_balance || 0) - amountToCharge).toFixed(2));
            await user.save();

            responseData = { success: true, message: 'Payment approved with Wallet balance', order_method: 'wallet' };
        } else if (targetMethod === 'stripe' || targetMethod === 'apple_pay') {
            const stripeKey = settings?.secret_key || process.env.STRIPE_SECRET_KEY;
            const isMockStripeKey = !stripeKey || 
                                   stripeKey.includes('mock') || 
                                   stripeKey.includes('m******cret') || 
                                   stripeKey.includes('placeholder') || 
                                   !stripeKey.startsWith('sk_');

            if (isMockStripeKey) {
                const mockSessionId = `cs_test_mock_${Date.now()}`;
                const redirectUrl = req.isGuestCheckout 
                    ? `${FRONTEND_URL}/checkout/success?session_id=${mockSessionId}&status=success`
                    : `${FRONTEND_URL}/dashboard?session_id=${mockSessionId}&status=success`;
                responseData = { id: mockSessionId, url: redirectUrl };
            } else {
                const stripeInstance = require('stripe')(stripeKey);
                let finalStripeLineItems = lineItems;
                let finalStripeDiscounts = [];

                if (is_emi && emiPlan) {
                    finalStripeLineItems = [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `EMI First Installment - ${emiPlan.name}`,
                                description: `Initial payment for order. Remaining ${emiPlan.installments - 1} installments of $${emiAmortization.monthlyPayment.toFixed(2)} will be billed monthly.`
                            },
                            unit_amount: Math.round(emiFirstInstallment * 100)
                        },
                        quantity: 1
                    }];
                } else if (useSplitPayment) {
                    const depositAmount = parseFloat((payableAmount * 0.3).toFixed(2));
                    
                    finalStripeLineItems = [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: '30% Deposit Secure Payment',
                                description: 'Upfront deposit for confirming your bulk order'
                            },
                            unit_amount: Math.round(depositAmount * 100)
                        },
                        quantity: 1
                    }];
                } else {
                    const totalStripeDiscount = discountAmount + pointsDiscount + giftCardAppliedDiscount;
                    if (totalStripeDiscount > 0) {
                        const stripeCoupon = await stripeInstance.coupons.create({
                            amount_off: Math.round(totalStripeDiscount * 100),
                            currency: 'usd',
                            duration: 'once',
                        });
                        finalStripeDiscounts = [{ coupon: stripeCoupon.id }];
                    }
                }

                const stripeSessionData = {
                    payment_method_types: ['card'],
                    line_items: finalStripeLineItems,
                    discounts: finalStripeDiscounts.length > 0 ? finalStripeDiscounts : undefined,
                    mode: 'payment',
                    success_url: req.isGuestCheckout 
                        ? `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&status=success`
                        : `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
                    cancel_url: `${FRONTEND_URL}/cart?status=cancel`,
                    client_reference_id: req.user._id.toString(),
                    metadata: {
                        buyerCountry,
                        paymentType: useSplitPayment ? 'deposit' : 'full',
                        is_emi: is_emi ? 'true' : 'false',
                        emi_plan_id: emi_plan_id || ''
                    }
                };

                const session = await stripeInstance.checkout.sessions.create(stripeSessionData);
                responseData = { id: session.id, url: session.url };
            }
        } else if (targetMethod === 'paypal') {
            const isMock = !settings.public_key || !settings.secret_key ||
                           settings.public_key.includes('mock') || settings.secret_key.includes('mock');
            
            const chargeAmount = (is_emi && emiPlan) ? emiFirstInstallment : payableAmount;

            if (isMock) {
                const mockOrderId = `paypal_order_mock_${Date.now()}`;
                responseData = {
                    id: mockOrderId,
                    url: req.isGuestCheckout 
                        ? `${FRONTEND_URL}/checkout/success?status=success&token=${mockOrderId}`
                        : `${FRONTEND_URL}/dashboard?status=success&token=${mockOrderId}`
                };
            } else {
                const clientId = settings.public_key;
                const clientSecret = settings.secret_key;
                const environment = settings.live_mode 
                    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
                    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
                const client = new paypal.core.PayPalHttpClient(environment);

                const request = new paypal.orders.OrdersCreateRequest();
                request.prefer("return=representation");
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: 'USD',
                            value: chargeAmount.toFixed(2)
                        }
                    }],
                    application_context: {
                        return_url: req.isGuestCheckout 
                            ? `${FRONTEND_URL}/checkout/success?status=success`
                            : `${FRONTEND_URL}/dashboard?status=success`,
                        cancel_url: `${FRONTEND_URL}/cart?status=cancel`
                    }
                });

                const order = await client.execute(request);
                const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
                responseData = { id: order.result.id, url: approvalUrl };
            }
        } else if (targetMethod === 'razorpay') {
            const finalTotal = payableAmount;
            const rzpAmount = useSplitPayment 
                ? Math.round(parseFloat((finalTotal * 0.3).toFixed(2)) * 100)
                : (is_emi && emiPlan)
                    ? Math.round(emiFirstInstallment * 100)
                    : Math.round(finalTotal * 100);

            const isMockKey = !settings.public_key || settings.public_key.includes('mock');
            if (isMockKey) {
                responseData = {
                    id: `rzp_order_mock_${Date.now()}`,
                    amount: rzpAmount,
                    currency: "INR",
                    key: settings.public_key || "rzp_test_mock_key",
                    is_mock: true
                };
            } else {
                const canCreateOrder = settings.secret_key && !settings.secret_key.includes('mock');
                let orderCreated = false;
                if (canCreateOrder) {
                    try {
                        const instance = new Razorpay({
                            key_id: settings.public_key,
                            key_secret: settings.secret_key,
                        });

                        const options = {
                            amount: rzpAmount,
                            currency: "INR",
                            receipt: `rcpt_${Date.now()}`,
                        };

                        const rzpOrder = await instance.orders.create(options);
                        responseData = { 
                            id: rzpOrder.id, 
                            amount: rzpOrder.amount, 
                            currency: rzpOrder.currency,
                            key: settings.public_key,
                            is_mock: false
                        };
                        orderCreated = true;
                    } catch (err) {
                        console.error("Failed to create real Razorpay order, falling back to standard checkout:", err);
                    }
                }
                if (!orderCreated) {
                    responseData = {
                        id: `rzp_order_mock_${Date.now()}`,
                        amount: rzpAmount,
                        currency: "INR",
                        key: settings.public_key,
                        is_mock: false,
                        use_standard_checkout: true
                    };
                }
            }
        } else {
            responseData = { success: true, message: 'Order created, manual payment required' };
        }

        // 🛡️ Log high value transaction for fraud detection (Admin review)
        if (totalCartAmount > 10000) {
            await riskService.logRisk(req.user._id, 'high_value_transaction', 'high', `Order exceeding $10,000 detected (Total: $${totalCartAmount})`, { id: responseData?.id || 'manual' });
        }

        // Create Order records for each supplier
        const orderIds = [];
        const supplierEntries = Object.entries(supplierOrders);
        for (let i = 0; i < supplierEntries.length; i++) {
            const [sId, data] = supplierEntries[i];

            // Distribute tax and fees proportionally or just apply to the first order for simplicity in MVP
            const orderTax = i === 0 ? totalTax : 0;
            const orderShipping = i === 0 ? dynamicShippingFee : 0;
            const orderServiceFee = i === 0 ? totalServiceFee : 0;
            const orderDutyFee = i === 0 ? totalDutyFee : 0;
            const orderGiftWrapFee = i === 0 ? giftWrapFee : 0;

            let orderDiscount = 0;
            if (appliedCoupon) {
                if (appliedCoupon.supplier) {
                    if (sId === appliedCoupon.supplier.toString()) {
                        orderDiscount = discountAmount;
                    }
                } else if (i === 0) {
                    orderDiscount = discountAmount;
                }
            }

            const orderPointsDiscount = i === 0 ? pointsDiscount : 0;
            const orderRedeemedPoints = i === 0 ? redeemedPointsAmount : 0;

            const orderGiftCardDiscount = i === 0 ? giftCardAppliedDiscount : 0;
            const ordTotal = Math.max(0, data.subtotal + orderTax + orderShipping + orderServiceFee + orderDutyFee + orderGiftWrapFee - orderDiscount - orderPointsDiscount - orderGiftCardDiscount);
            const ordDepositAmount = parseFloat((ordTotal * 0.3).toFixed(2));
            const ordBalanceAmount = parseFloat((ordTotal * 0.7).toFixed(2));

            const ord = await Order.create({
                buyer_id: req.user._id,
                supplier_id: sId === 'unknown_supplier' ? null : sId,
                shipping_address: req.body.shippingAddress,
                is_dropship: is_dropship || false,
                dropship_note: dropship_note || '',
                order_items: data.items,
                tax_amount: orderTax,
                duty_fee: orderDutyFee,
                tax_info: i === 0 && primaryRule ? {
                    name: primaryRule.name,
                    tax_type: primaryRule.type,
                    value: primaryRule.value,
                    country_code: primaryRule.country_code
                } : null,
                shipping_fee: orderShipping,
                service_fee: orderServiceFee,
                discount_amount: orderDiscount,
                redeemed_points: orderRedeemedPoints,
                points_discount: orderPointsDiscount,
                coupon_code: orderDiscount > 0 ? appliedCoupon.code : '',
                gift_card_code: i === 0 ? (giftCardCode || '') : '',
                gift_card_discount: orderGiftCardDiscount,
                gift_card_deducted: false,
                referral_code: referralCode || '',
                total_amount: ordTotal,
                is_split_payment: useSplitPayment ? true : false,
                deposit_amount: useSplitPayment ? ordDepositAmount : 0,
                balance_amount: useSplitPayment ? ordBalanceAmount : 0,
                deposit_paid: false,
                balance_paid: false,
                deposit_stripe_session_id: (useSplitPayment && targetMethod === 'stripe') ? responseData.id : null,
                deposit_razorpay_order_id: (useSplitPayment && targetMethod === 'razorpay') ? responseData.id : null,
                stripe_session_id: (!useSplitPayment && targetMethod === 'stripe') ? responseData.id : null,
                paypal_order_id: targetMethod === 'paypal' ? responseData.id : null,
                razorpay_order_id: (!useSplitPayment && targetMethod === 'razorpay') ? responseData.id : null,
                payment_provider: payableAmount === 0 ? 'gift-card' : targetMethod,
                payment_method: payableAmount === 0 ? 'Gift-Card' : (is_emi ? 'EMI' : (targetMethod === 'net-terms' ? 'Net-Terms' : (targetMethod === 'wallet' ? 'Wallet' : (targetMethod === 'stripe' ? 'Stripe' : (targetMethod === 'paypal' ? 'PayPal' : (targetMethod === 'razorpay' ? 'Razorpay' : targetMethod)))))),
                status: (payableAmount === 0 || targetMethod === 'net-terms' || targetMethod === 'wallet') ? 'confirmed' : 'pending',
                payment_status: (payableAmount === 0 || targetMethod === 'net-terms' || targetMethod === 'wallet') ? (is_emi ? 'partially_paid' : 'paid') : 'unpaid',
                is_emi: is_emi || false,
                emi_plan_id: emiPlan ? emiPlan._id : null,
                gift_wrap: {
                    selected: i === 0 ? (gift_wrap || false) : false,
                    fee: orderGiftWrapFee
                },
                gift_message: i === 0 ? (gift_message || '') : ''
            });

            // Initialize EMI Schedule if selected
            if (is_emi && emiPlan) {
                const EmiSchedule = require('../models/EmiSchedule');
                const P = ord.total_amount;
                const R = (emiPlan.interest_rate / 100);
                const N = emiPlan.installments;

                let monthlyPayment = 0;
                let interest_total = 0;

                if (R === 0) {
                    monthlyPayment = P / N;
                } else {
                    monthlyPayment = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
                    interest_total = (monthlyPayment * N) - P;
                }
                monthlyPayment = Math.round(monthlyPayment * 100) / 100;
                interest_total = Math.round(interest_total * 100) / 100;
                const processing_fee = i === 0 ? emiPlan.processing_fee : 0;
                const total_payable = (monthlyPayment * N) + processing_fee;
                const firstInstallment = monthlyPayment + processing_fee;

                const installmentsList = [];
                const isPaidInst1 = (targetMethod === 'wallet');

                for (let num = 1; num <= N; num++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + (num - 1));
                    
                    installmentsList.push({
                        number: num,
                        due_date: dueDate,
                        amount: num === 1 ? firstInstallment : monthlyPayment,
                        status: (num === 1 && isPaidInst1) ? 'paid' : 'pending',
                        paid_at: (num === 1 && isPaidInst1) ? new Date() : null,
                        gateway: (num === 1 && isPaidInst1) ? 'wallet' : null,
                        payment_intent_id: (num === 1 && isPaidInst1) ? 'wallet_checkout' : null
                    });
                }

                const emiScheduleObj = new EmiSchedule({
                    order_id: ord._id,
                    buyer_id: req.user._id,
                    emi_plan_id: emiPlan._id,
                    total_amount: total_payable,
                    principal: P,
                    interest_total,
                    processing_fee,
                    installments: installmentsList,
                    status: 'active'
                });
                await emiScheduleObj.save();

                ord.emi_schedule_id = emiScheduleObj._id;
                await ord.save();
            }

            // Link LoyaltyTransaction to the created order ID
            if (orderRedeemedPoints > 0) {
                const LoyaltyTransaction = require('../models/LoyaltyTransaction');
                await LoyaltyTransaction.findOneAndUpdate(
                    { user: req.user._id, order: { $exists: false }, type: 'redemption' },
                    { order: ord._id, description: `Redeemed ${orderRedeemedPoints} points for checkout discount on Order #${ord._id}` },
                    { sort: { createdAt: -1 } }
                );
            }

            // Touch CRM Lead
            const crmService = require('../services/crmService');
            if (ord.supplier_id) {
                await crmService.touchLead(ord.supplier_id, ord.buyer_id);
            }
            
            // Initialize Timeline
            await createOrderStatusLog(ord._id, (targetMethod === 'net-terms' || targetMethod === 'wallet') ? 'Order Placed & Paid' : 'Order Placed', (targetMethod === 'net-terms' || targetMethod === 'wallet') ? `Order created and paid with ${targetMethod === 'wallet' ? 'Wallet balance' : 'Net-Terms credit line'}` : 'Order created and awaiting payment');

            // Log Net-Terms Transaction history
            if (targetMethod === 'net-terms') {
                const Transaction = require('../models/Transaction');
                await Transaction.create({
                    user_id: req.user._id,
                    order_id: ord._id,
                    type: 'payment',
                    amount: ord.total_amount,
                    status: 'completed',
                    description: `Checkout payment for Order ${ord._id} using Net-Terms financing.`
                });
            }

            // Log Wallet Transaction history
            if (targetMethod === 'wallet') {
                const Transaction = require('../models/Transaction');
                await Transaction.create({
                    user_id: req.user._id,
                    order_id: ord._id,
                    type: 'payment',
                    amount: ord.total_amount,
                    status: 'completed',
                    description: `Checkout payment for Order ${ord._id} using Wallet balance.`
                });

                // Since it is paid immediately, perform post-payment actions
                await completePaymentPostTasks(ord, req.io);
            }

            // Deduct gift card balance immediately for immediate payment methods
            if (payableAmount === 0 || targetMethod === 'wallet' || targetMethod === 'net-terms') {
                if (orderGiftCardDiscount > 0 && !ord.gift_card_deducted) {
                    const { deductGiftCardBalanceInternal } = require('./giftCardController');
                    try {
                        await deductGiftCardBalanceInternal(giftCardCode, orderGiftCardDiscount, ord._id);
                        ord.gift_card_deducted = true;
                        await ord.save();
                    } catch (gcErr) {
                        console.error('Failed to deduct gift card balance immediately:', gcErr.message);
                    }
                }
            }

            // Since it is paid immediately via Gift Card, perform post-payment actions
            if (payableAmount === 0) {
                await completePaymentPostTasks(ord, req.io);
            }
            
            orderIds.push(ord._id);
        }

        // Increment coupon usage
        if (appliedCoupon) {
            appliedCoupon.used_count += 1;
            await appliedCoupon.save();
        }

        res.json({ ...responseData, order_ids: orderIds });

    } catch (err) {
        console.error('Checkout error:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Lookup guest order details by payment session references
// @route   GET /api/orders/guest/lookup
// @access  Public (softProtect)
exports.lookupGuestOrder = async (req, res) => {
    try {
        const { session_id, token } = req.query;
        if (!session_id && !token) {
            return res.status(400).json({ message: 'Session ID or PayPal Token is required for guest lookup' });
        }

        const query = {};
        if (session_id) {
            query.$or = [
                { stripe_session_id: session_id },
                { deposit_stripe_session_id: session_id },
                { balance_stripe_session_id: session_id }
            ];
        } else if (token) {
            query.paypal_order_id = token;
        }

        const order = await Order.findOne(query)
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name business_type email')
            .populate('order_items.product_id', 'isDigital digitalFile name main_image');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const timeline = await OrderStatusLog.find({ order_id: order._id }).sort({ createdAt: 1 });

        res.json({
            ...order._doc,
            timeline: timeline || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyer_id', 'first_name last_name email profile_image')
            .populate('supplier_id', 'first_name last_name company_name business_type email')
            .populate('order_items.product_id', 'isDigital digitalFile')
            .populate('emi_schedule_id');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check auth: Buyer, Supplier, Admin or Guest with matching session token
        let isAuthorized = false;
        if (req.user) {
            const isBuyer = order.buyer_id?._id?.toString() === req.user._id.toString();
            const isSupplier = order.supplier_id?._id?.toString() === req.user._id.toString();
            const isAdmin = (req.user.roles?.includes('admin') || req.user.role === 'admin');
            if (isBuyer || isSupplier || isAdmin) {
                isAuthorized = true;
            }
        } else {
            const sessionRef = req.query.session_id || req.query.token || req.query.paypal_token;
            if (sessionRef && (
                order.stripe_session_id === sessionRef ||
                order.paypal_order_id === sessionRef ||
                order.deposit_stripe_session_id === sessionRef ||
                order.balance_stripe_session_id === sessionRef
            )) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        // Fetch Timeline Logs
        const timeline = await OrderStatusLog.find({ order_id: order._id }).sort({ createdAt: 1 });

        res.json({
            ...order._doc,
            timeline: timeline || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyer_id: req.user._id })
            .populate('supplier_id', 'first_name last_name company_name')
            .populate('order_items.product_id', 'isDigital digitalFile')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Stripe session and update status
// @route   POST /api/orders/verify-session
// @access  Private
exports.verifySession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId || sessionId.includes('mock') || sessionId.startsWith('cs_test_mock_')) {
            const mockOrders = await Order.find({ buyer_id: req.user?._id }).sort({ createdAt: -1 }).limit(1);
            if (mockOrders.length > 0) {
                const order = mockOrders[0];
                if (order.payment_status !== 'paid' && order.payment_status !== 'partially_paid') {
                    if (order.is_split_payment) {
                        order.payment_status = 'partially_paid';
                        order.deposit_paid = true;
                        order.status = 'confirmed';
                        await order.save();
                        await createOrderStatusLog(order._id, 'Deposit Paid', 'Deposit payment (30%) verified successfully via Mock Stripe. Order is confirmed.');
                        await completePaymentPostTasks(order, req.io, 'deposit');
                    } else if (order.is_emi) {
                        order.payment_status = 'partially_paid';
                        order.status = 'confirmed';
                        await order.save();
                        
                        const EmiSchedule = require('../models/EmiSchedule');
                        const schedule = await EmiSchedule.findOne({ order_id: order._id });
                        if (schedule && schedule.installments.length > 0) {
                            schedule.installments[0].status = 'paid';
                            schedule.installments[0].paid_at = new Date();
                            schedule.installments[0].gateway = 'Mock Stripe';
                            await schedule.save();
                        }
                        
                        const { decrementProductStock } = require('./productController');
                        if (order.order_items && order.order_items.length > 0) {
                            await decrementProductStock(order.order_items);
                        }
                        await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via Mock Stripe. Order is confirmed.');
                        await completePaymentPostTasks(order, req.io, 'full');
                    } else {
                        order.payment_status = 'paid';
                        order.status = 'confirmed';
                        await order.save();
                        await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via Mock Stripe');
                        await completePaymentPostTasks(order, req.io, 'full');
                    }
                }
            }
            return res.json({ success: true, verified: true, orders: mockOrders, message: 'Mock payment session verified' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const orders = await Order.find({
                $or: [
                    { stripe_session_id: sessionId },
                    { deposit_stripe_session_id: sessionId },
                    { balance_stripe_session_id: sessionId }
                ]
            }).populate('buyer_id', 'first_name last_name');
            if (orders.length > 0) {
                for (let order of orders) {
                    if (order.is_emi) {
                        if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                            order.payment_status = 'partially_paid';
                            order.status = 'confirmed';
                            await order.save();
                            
                            // Find and update EmiSchedule first installment
                            const EmiSchedule = require('../models/EmiSchedule');
                            const schedule = await EmiSchedule.findOne({ order_id: order._id });
                            if (schedule && schedule.installments.length > 0) {
                                schedule.installments[0].status = 'paid';
                                schedule.installments[0].paid_at = new Date();
                                schedule.installments[0].gateway = 'Stripe';
                                schedule.installments[0].payment_intent_id = session.payment_intent || 'stripe_checkout';
                                await schedule.save();
                            }

                            // Decrement stock
                            const { decrementProductStock } = require('./productController');
                            if (order.order_items && order.order_items.length > 0) {
                                await decrementProductStock(order.order_items);
                            }

                            await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via Stripe. Order is confirmed.');
                            await completePaymentPostTasks(order, req.io, 'full');
                        }
                    } else if (order.is_split_payment) {
                        if (order.balance_stripe_session_id === sessionId) {
                            if (order.payment_status !== 'paid') {
                                order.payment_status = 'paid';
                                order.balance_paid = true;
                                await order.save();
                                await createOrderStatusLog(order._id, 'Balance Paid', 'Balance payment (70%) verified successfully via Stripe');
                                await completePaymentPostTasks(order, req.io, 'balance');
                            }
                        } else {
                            if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                                order.payment_status = 'partially_paid';
                                order.deposit_paid = true;
                                order.status = 'confirmed';
                                await order.save();
                                await createOrderStatusLog(order._id, 'Deposit Paid', 'Deposit payment (30%) verified successfully via Stripe. Order is confirmed.');
                                await completePaymentPostTasks(order, req.io, 'deposit');
                            }
                        }
                    } else {
                        if (order.payment_status !== 'paid') {
                            order.payment_status = 'paid';
                            order.status = 'confirmed';
                            await order.save();
                            await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via Stripe');
                            await completePaymentPostTasks(order, req.io, 'full');
                        }
                    }
                }
                return res.json({ success: true, message: 'Orders updated successfully.' });
            } else {
                // Check if this Stripe session is for a Gift Card Purchase
                if (session.metadata && session.metadata.type === 'gift_card_purchase') {
                    const GiftCard = require('../models/GiftCard');
                    const User = require('../models/User');
                    const Transaction = require('../models/Transaction');

                    const alreadyProcessed = await GiftCard.exists({ 'transactions.description': { $regex: new RegExp(sessionId) } });
                    if (!alreadyProcessed) {
                        const amount = parseFloat(session.metadata.amount);
                        const buyerId = session.metadata.buyer_id;

                        // Generate unique voucher code
                        const randomCode = 'GIFT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                           Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                                           Math.random().toString(36).substring(2, 6).toUpperCase();

                        const giftCard = await GiftCard.create({
                            code: randomCode,
                            initial_value: amount,
                            balance: amount,
                            is_active: true,
                            owner: buyerId,
                            created_by: buyerId,
                            transactions: [{
                                amount,
                                type: 'redeem',
                                description: `Initial Stripe purchase Session ${sessionId}`
                            }]
                        });

                        // Record in general ledger
                        await Transaction.create({
                            user_id: buyerId,
                            type: 'payment',
                            amount,
                            currency: 'USD',
                            status: 'completed',
                            description: `Stripe purchase of Gift Card code: ${giftCard.code}`
                        });

                        // Send email
                        try {
                            const { enqueueTemplatedMail } = require('../services/mailService');
                            const buyerUser = await User.findById(buyerId);
                            if (buyerUser) {
                                enqueueTemplatedMail('gift-card-purchase', buyerUser.email, {
                                    first_name: buyerUser.first_name,
                                    gift_card_code: giftCard.code,
                                    gift_card_amount: amount.toFixed(2)
                                }).catch(e => console.error('Gift card email error:', e));
                            }
                        } catch (e) {}
                    }
                    return res.json({ success: true, message: 'Gift card purchase verified successfully.' });
                }
            }
        }
        res.status(400).json({ message: 'Payment not verified' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get supplier orders
// @route   GET /api/orders/supplier-orders
// @access  Private/Supplier
exports.getSupplierOrders = async (req, res) => {
    try {
        const orders = await Order.find({ supplier_id: req.user._id })
            .populate('buyer_id', 'first_name last_name email')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order status (Supplier/Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/(Supplier or Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, tracking_number, shipping_company, estimated_delivery_date } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check auth
        if (order.supplier_id.toString() !== req.user._id.toString() && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized to update this order' });
        }

        if (status && status !== order.status) {
            const oldStatus = order.status;
            order.status = status;
            await createOrderStatusLog(order._id, status.charAt(0).toUpperCase() + status.slice(1), `Order status updated from ${oldStatus} to ${status}`);
        }
        if (status === 'cancelled') {
            // Refund Gift Card if balance was deducted
            if (order.gift_card_code && order.gift_card_discount > 0 && order.gift_card_deducted) {
                const { refundGiftCardBalanceInternal } = require('./giftCardController');
                try {
                    await refundGiftCardBalanceInternal(order.gift_card_code, order.gift_card_discount, order._id);
                    order.gift_card_deducted = false;
                } catch (gcErr) {
                    console.error('Failed to refund gift card balance on supplier cancellation:', gcErr.message);
                }
            }

            const { sendNotification } = require('../services/notificationService');
            await sendNotification(
                req.io,
                order.buyer_id, // Notify buyer if supplier/admin cancelled
                'Order Cancelled',
                `Order #${order._id} was cancelled.`,
                'order',
                `/dashboard/orders/${order._id}`
            );

            // 📧 Send email (Queued Template)
            const { enqueueTemplatedMail } = require('../services/mailService');
            const User = require('../models/User');
            const buyer = await User.findById(order.buyer_id);
            if (buyer && buyer.email) {
                enqueueTemplatedMail('order-cancelled', buyer.email, {
                    first_name: buyer.first_name,
                    order_id: order._id,
                    order_url: `${process.env.FRONTEND_URL}/dashboard/orders/${order._id}`
                }).catch(e => console.error('Order cancelled email error:', e));
            }
        }

        if (status === 'shipped') {
            const courierService = require('../services/courierService');
            if (shipping_company !== undefined) order.shipping_company = shipping_company;
            if (!order.shipping_company) order.shipping_company = 'DHL Express';
            
            if (tracking_number !== undefined && tracking_number !== '') {
                order.tracking_number = tracking_number;
            } else if (!order.tracking_number) {
                order.tracking_number = courierService.generateTrackingNumber(order.shipping_company);
            }

            // 📧 Send email (Queued Template)
            const { enqueueTemplatedMail } = require('../services/mailService');
            const User = require('../models/User');
            const buyer = await User.findById(order.buyer_id);
            if (buyer && buyer.email) {
                enqueueTemplatedMail('order-shipped', buyer.email, {
                    first_name: buyer.first_name,
                    order_id: order._id,
                    tracking_number: order.tracking_number || 'N/A',
                    shipping_company: order.shipping_company || 'Standard Shipping',
                    order_url: `${process.env.FRONTEND_URL}/dashboard/orders/${order._id}`
                }).catch(e => console.error('Order shipped email error:', e));
            }

            // 📱 Send SMS (Twilio configured alert)
            if (buyer && order.shipping_address && order.shipping_address.phone) {
                try {
                    const { sendSMS } = require('../utils/smsSender');
                    const smsMsg = `Hi ${buyer.first_name || 'there'}, your AliExpress order #${order._id} has been shipped via ${order.shipping_company} with tracking: ${order.tracking_number}. Track it in your buyer dashboard!`;
                    sendSMS(order.shipping_address.phone, smsMsg);
                } catch (smsErr) {
                    console.error('Order shipped SMS alert error:', smsErr);
                }
            }
        } else {
            if (tracking_number !== undefined) order.tracking_number = tracking_number;
            if (shipping_company !== undefined) order.shipping_company = shipping_company;
        }

        if (estimated_delivery_date !== undefined) order.estimated_delivery_date = estimated_delivery_date;

        await order.save();
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrdersAdmin = async (req, res) => {
    try {
        if (!(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        const orders = await Order.find({})
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete order (Admin)
// @route   DELETE /api/orders/admin/:id
// @access  Private/Admin
exports.deleteOrderAdmin = async (req, res) => {
    try {
        if (!(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear all pending orders (Admin)
// @route   DELETE /api/orders/admin/clear-pending
// @access  Private/Admin
exports.clearPendingOrdersAdmin = async (req, res) => {
    try {
        if (!(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        const result = await Order.deleteMany({ status: 'pending' });
        res.json({ message: `Cleared ${result.deletedCount} pending orders` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Buyer confirms delivery
// @route   PUT /api/orders/:id/confirm-delivery
// @access  Private/Buyer
exports.confirmDelivery = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.buyer_id.toString() !== req.user._id.toString())
            return res.status(403).json({ message: 'Not authorized' });
        if (!['shipped', 'confirmed'].includes(order.status))
            return res.status(400).json({ message: 'Order must be shipped or confirmed to mark as delivered' });
        if (order.is_split_payment && !order.balance_paid) {
            return res.status(400).json({ message: 'Please pay the remaining balance amount before confirming delivery' });
        }

        order.status = 'delivered';
        await order.save();
        await createOrderStatusLog(order._id, 'Delivered', 'Order delivery confirmed by buyer');

        // Escrow / Trade Assurance Logic: Release funds to supplier
        if (order.payment_status === 'paid' && order.supplier_id) {
            const User = require('../models/User');
            const Transaction = require('../models/Transaction');
            
            // Calculate amount to credit (exclude service fee and tax, or simply subtract them from total)
            const amountToCredit = order.total_amount - (order.service_fee || 0) - (order.tax_amount || 0);

            if (amountToCredit > 0) {
                const supplier = await User.findById(order.supplier_id);
                if (supplier) {
                    supplier.wallet_balance = (supplier.wallet_balance || 0) + amountToCredit;
                    await supplier.save();

                    await Transaction.create({
                        user_id: supplier._id,
                        order_id: order._id,
                        type: 'credit',
                        amount: amountToCredit,
                        currency: 'USD',
                        status: 'completed',
                        description: `Payment released for delivered order #${order._id}`
                    });
                }
            }
        }

        res.json({ message: 'Delivery confirmed', order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/orders/verify-razorpay
// @access  Private
// @desc    Verify Razorpay Payment
// @route   POST /api/orders/verify-razorpay
// @access  Private
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const crypto = require('crypto');
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'razorpay' });

        if (!settings || !settings.enable) {
            return res.status(400).json({ success: false, message: 'Razorpay is not enabled' });
        }

        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (razorpay_order_id && razorpay_order_id.startsWith('rzp_order_mock_')) ||
                       !razorpay_signature;

        if (isMock) {
            const orders = await Order.find({
                $or: [
                    { razorpay_order_id },
                    { deposit_razorpay_order_id: razorpay_order_id },
                    { balance_razorpay_order_id: razorpay_order_id }
                ]
            }).populate('buyer_id', 'first_name last_name');
            
            for (let order of orders) {
                if (order.is_split_payment) {
                    if (order.balance_razorpay_order_id === razorpay_order_id) {
                        if (order.payment_status !== 'paid') {
                            order.payment_status = 'paid';
                            order.balance_paid = true;
                            order.razorpay_payment_id = razorpay_payment_id || `rzp_payment_mock_${Date.now()}`;
                            await order.save();
                            await createOrderStatusLog(order._id, 'Balance Paid', 'Balance payment (70%) verified successfully via Mock Razorpay');
                            await completePaymentPostTasks(order, req.io, 'balance');
                        }
                    } else {
                        if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                            order.payment_status = 'partially_paid';
                            order.deposit_paid = true;
                            order.status = 'confirmed';
                            order.razorpay_payment_id = razorpay_payment_id || `rzp_payment_mock_${Date.now()}`;
                            await order.save();
                            await createOrderStatusLog(order._id, 'Deposit Paid', 'Deposit payment (30%) verified successfully via Mock Razorpay. Order is confirmed.');
                            await completePaymentPostTasks(order, req.io, 'deposit');
                        }
                    }
                } else if (order.is_emi) {
                    if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                        order.payment_status = 'partially_paid';
                        order.status = 'confirmed';
                        order.razorpay_payment_id = razorpay_payment_id || `rzp_payment_mock_${Date.now()}`;
                        await order.save();
                        
                        // Find and update EmiSchedule first installment
                        const EmiSchedule = require('../models/EmiSchedule');
                        const schedule = await EmiSchedule.findOne({ order_id: order._id });
                        if (schedule && schedule.installments.length > 0) {
                            schedule.installments[0].status = 'paid';
                            schedule.installments[0].paid_at = new Date();
                            schedule.installments[0].gateway = 'Razorpay';
                            schedule.installments[0].payment_intent_id = razorpay_payment_id || `rzp_payment_mock_${Date.now()}`;
                            await schedule.save();
                        }

                        // Decrement stock
                        const { decrementProductStock } = require('./productController');
                        if (order.order_items && order.order_items.length > 0) {
                            await decrementProductStock(order.order_items);
                        }

                        await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via Razorpay. Order is confirmed.');
                        await completePaymentPostTasks(order, req.io, 'full');
                    }
                } else {
                    if (order.payment_status !== 'paid') {
                        order.payment_status = 'paid';
                        order.status = 'confirmed';
                        order.razorpay_payment_id = razorpay_payment_id || `rzp_payment_mock_${Date.now()}`;
                        await order.save();
                        await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via Mock Razorpay');
                        await completePaymentPostTasks(order, req.io, 'full');
                    }
                }
            }
            return res.json({ success: true });
        }

        if (!settings.secret_key) {
            return res.status(400).json({ success: false, message: 'Razorpay secret key is not configured' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", settings.secret_key)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const orders = await Order.find({
                $or: [
                    { razorpay_order_id },
                    { deposit_razorpay_order_id: razorpay_order_id },
                    { balance_razorpay_order_id: razorpay_order_id }
                ]
            }).populate('buyer_id', 'first_name last_name');
            
            for (let order of orders) {
                if (order.is_split_payment) {
                    if (order.balance_razorpay_order_id === razorpay_order_id) {
                        if (order.payment_status !== 'paid') {
                            order.payment_status = 'paid';
                            order.balance_paid = true;
                            order.razorpay_payment_id = razorpay_payment_id;
                            await order.save();
                            await createOrderStatusLog(order._id, 'Balance Paid', 'Balance payment (70%) verified successfully via Razorpay');
                            await completePaymentPostTasks(order, req.io, 'balance');
                        }
                    } else {
                        if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                            order.payment_status = 'partially_paid';
                            order.deposit_paid = true;
                            order.status = 'confirmed';
                            order.razorpay_payment_id = razorpay_payment_id;
                            await order.save();
                            await createOrderStatusLog(order._id, 'Deposit Paid', 'Deposit payment (30%) verified successfully via Razorpay. Order is confirmed.');
                            await completePaymentPostTasks(order, req.io, 'deposit');
                        }
                    }
                } else if (order.is_emi) {
                    if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                        order.payment_status = 'partially_paid';
                        order.status = 'confirmed';
                        order.razorpay_payment_id = razorpay_payment_id;
                        await order.save();
                        
                        // Find and update EmiSchedule first installment
                        const EmiSchedule = require('../models/EmiSchedule');
                        const schedule = await EmiSchedule.findOne({ order_id: order._id });
                        if (schedule && schedule.installments.length > 0) {
                            schedule.installments[0].status = 'paid';
                            schedule.installments[0].paid_at = new Date();
                            schedule.installments[0].gateway = 'Razorpay';
                            schedule.installments[0].payment_intent_id = razorpay_payment_id;
                            await schedule.save();
                        }

                        // Decrement stock
                        const { decrementProductStock } = require('./productController');
                        if (order.order_items && order.order_items.length > 0) {
                            await decrementProductStock(order.order_items);
                        }

                        await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via Razorpay. Order is confirmed.');
                        await completePaymentPostTasks(order, req.io, 'full');
                    }
                } else {
                    if (order.payment_status !== 'paid') {
                        order.payment_status = 'paid';
                        order.status = 'confirmed';
                        order.razorpay_payment_id = razorpay_payment_id;
                        await order.save();
                        await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via Razorpay');
                        await completePaymentPostTasks(order, req.io, 'full');
                    }
                }
            }
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Helper for PayPal gift card provisioning
async function verifyGiftCardPaymentPayPal(orderId, userId, amount) {
    if (!amount || amount <= 0 || !userId) return;
    const GiftCard = require('../models/GiftCard');
    const Transaction = require('../models/Transaction');
    const User = require('../models/User');

    const alreadyProcessed = await GiftCard.exists({ 'transactions.description': { $regex: new RegExp(orderId) } });
    if (!alreadyProcessed) {
        const randomCode = 'GIFT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                           Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                           Math.random().toString(36).substring(2, 6).toUpperCase();

        const giftCard = await GiftCard.create({
            code: randomCode,
            initial_value: amount,
            balance: amount,
            is_active: true,
            owner: userId,
            created_by: userId,
            transactions: [{
                amount,
                type: 'redeem',
                description: `Initial PayPal purchase Order ${orderId}`
            }]
        });

        await Transaction.create({
            user_id: userId,
            type: 'payment',
            amount,
            currency: 'USD',
            status: 'completed',
            description: `PayPal purchase of Gift Card code: ${giftCard.code}`
        });

        try {
            const { enqueueTemplatedMail } = require('../services/mailService');
            const buyerUser = await User.findById(userId);
            if (buyerUser) {
                enqueueTemplatedMail('gift-card-purchase', buyerUser.email, {
                    first_name: buyerUser.first_name,
                    gift_card_code: giftCard.code,
                    gift_card_amount: amount.toFixed(2)
                }).catch(e => console.error('Gift card email error:', e));
            }
        } catch (e) {}
    }
}

// @desc    Verify PayPal payment and update status
// @route   POST /api/orders/verify-paypal
// @access  Private
exports.verifyPayPalPayment = async (req, res) => {
    try {
        const { orderId } = req.body; 
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'paypal' });

        if (!settings || !settings.enable) return res.status(400).json({ message: 'PayPal not enabled' });
        
        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (orderId && orderId.startsWith('paypal_order_mock_')) ||
                       (orderId && orderId.startsWith('paypal_gc_mock_'));

        if (isMock) {
            const orders = await Order.find({ paypal_order_id: orderId }).populate('buyer_id', 'first_name last_name');
            if (orders.length > 0) {
                for (let order of orders) {
                    if (order.is_emi) {
                        if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                            order.payment_status = 'partially_paid';
                            order.status = 'confirmed';
                            await order.save();
                            
                            // Find and update EmiSchedule first installment
                            const EmiSchedule = require('../models/EmiSchedule');
                            const schedule = await EmiSchedule.findOne({ order_id: order._id });
                            if (schedule && schedule.installments.length > 0) {
                                schedule.installments[0].status = 'paid';
                                schedule.installments[0].paid_at = new Date();
                                schedule.installments[0].gateway = 'PayPal';
                                schedule.installments[0].payment_intent_id = orderId || 'paypal_checkout';
                                await schedule.save();
                            }

                            // Decrement stock
                            const { decrementProductStock } = require('./productController');
                            if (order.order_items && order.order_items.length > 0) {
                                await decrementProductStock(order.order_items);
                            }

                            await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via PayPal. Order is confirmed.');
                            await completePaymentPostTasks(order, req.io, 'full');
                        }
                    } else if (order.payment_status !== 'paid') {
                        order.payment_status = 'paid';
                        order.status = 'confirmed';
                        await order.save();
                        await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via Mock PayPal');
                        await completePaymentPostTasks(order, req.io);
                    }
                }
            } else {
                const amountVal = parseFloat(req.body.amount || req.query.amount || 0);
                if (amountVal > 0 && req.user) {
                    await verifyGiftCardPaymentPayPal(orderId, req.user._id, amountVal);
                }
            }
            return res.json({ success: true });
        }

        if (!settings.public_key || !settings.secret_key) {
            return res.status(400).json({ message: 'PayPal keys are not configured' });
        }

        const environment = settings.live_mode
            ? new paypal.core.LiveEnvironment(settings.public_key, settings.secret_key)
            : new paypal.core.SandboxEnvironment(settings.public_key, settings.secret_key);
        const client = new paypal.core.PayPalHttpClient(environment);

        const getRequest = new paypal.orders.OrdersGetRequest(orderId);
        let orderDetail;
        try {
            orderDetail = await client.execute(getRequest);
        } catch (getErr) {
            console.error('PayPal Order Get Error:', getErr.message);
            return res.status(400).json({ success: false, message: 'Failed to retrieve PayPal order details' });
        }

        let status = orderDetail.result.status;
        if (status === 'APPROVED') {
            try {
                const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
                captureRequest.requestBody({});
                const capture = await client.execute(captureRequest);
                status = capture.result.status;
            } catch (captureErr) {
                console.error('PayPal Order Capture Error:', captureErr.message);
                const doubleCheck = await client.execute(getRequest);
                status = doubleCheck.result.status;
            }
        }

        if (status === 'COMPLETED') {
            const orders = await Order.find({ paypal_order_id: orderId }).populate('buyer_id', 'first_name last_name');
            if (orders.length > 0) {
                for (let order of orders) {
                    if (order.is_emi) {
                        if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                            order.payment_status = 'partially_paid';
                            order.status = 'confirmed';
                            await order.save();
                            
                            // Find and update EmiSchedule first installment
                            const EmiSchedule = require('../models/EmiSchedule');
                            const schedule = await EmiSchedule.findOne({ order_id: order._id });
                            if (schedule && schedule.installments.length > 0) {
                                schedule.installments[0].status = 'paid';
                                schedule.installments[0].paid_at = new Date();
                                schedule.installments[0].gateway = 'PayPal';
                                schedule.installments[0].payment_intent_id = orderId;
                                await schedule.save();
                            }

                            // Decrement stock
                            const { decrementProductStock } = require('./productController');
                            if (order.order_items && order.order_items.length > 0) {
                                await decrementProductStock(order.order_items);
                            }

                            await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via PayPal. Order is confirmed.');
                            await completePaymentPostTasks(order, req.io, 'full');
                        }
                    } else if (order.payment_status !== 'paid') {
                        order.payment_status = 'paid';
                        order.status = 'confirmed';
                        await order.save();
                        await createOrderStatusLog(order._id, 'Payment Confirmed', 'Payment verified successfully via PayPal');
                        await completePaymentPostTasks(order, req.io);
                    }
                }
            } else {
                const amountVal = parseFloat(req.body.amount || req.query.amount || 0);
                if (amountVal > 0 && req.user) {
                    await verifyGiftCardPaymentPayPal(orderId, req.user._id, amountVal);
                }
            }
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: `Payment not completed (Status: ${status})` });
        }
    } catch (err) {
        console.error('verifyPayPalPayment error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Helper for post-payment tasks
async function completePaymentPostTasks(order, io, paymentType = 'full') {
    // Deduct applied gift card balance if not already done
    if (order.gift_card_code && order.gift_card_discount > 0 && !order.gift_card_deducted) {
        const { deductGiftCardBalanceInternal } = require('./giftCardController');
        try {
            await deductGiftCardBalanceInternal(order.gift_card_code, order.gift_card_discount, order._id);
            order.gift_card_deducted = true;
            await order.save();
        } catch (gcErr) {
            console.error('Failed to deduct gift card balance in completePaymentPostTasks:', gcErr.message);
        }
    }

    // 1. Decrement Stock
    if (!order.is_split_payment || paymentType === 'deposit') {
        await decrementProductStock(order.order_items);
    }

    // 1.5 Award Loyalty Points for purchase
    try {
        const User = require('../models/User');
        const buyer = await User.findById(order.buyer_id);
        if (buyer) {
            const LoyaltyTransaction = require('../models/LoyaltyTransaction');
            const existingEarnTx = await LoyaltyTransaction.findOne({ user: buyer._id, order: order._id, type: 'purchase' });
            if (!existingEarnTx) {
                const earnedPoints = Math.floor(order.total_amount);
                if (earnedPoints > 0) {
                    buyer.loyalty_points = (buyer.loyalty_points || 0) + earnedPoints;
                    await buyer.save({ validateBeforeSave: false });
                    
                    await LoyaltyTransaction.create({
                        user: buyer._id,
                        points: earnedPoints,
                        type: 'purchase',
                        order: order._id,
                        description: `Earned ${earnedPoints} loyalty points for purchasing Order #${order._id}`
                    });
                }
            }
        }
    } catch (pointsErr) {
        console.error('Error awarding loyalty points:', pointsErr);
    }

    // 2. Credit Supplier Wallet
    const Transaction = require('../models/Transaction');
    const User = require('../models/User');
    const supplier = await User.findById(order.supplier_id);
    if (supplier) {
        let creditAmount = order.total_amount - (order.service_fee || 0);
        let description = `Order payment for Order #${order._id}`;
        
        if (order.is_split_payment) {
            if (paymentType === 'deposit') {
                creditAmount = order.deposit_amount - ((order.service_fee || 0) * 0.3);
                description = `30% Deposit payment for split-pay Order #${order._id}`;
            } else if (paymentType === 'balance') {
                creditAmount = order.balance_amount - ((order.service_fee || 0) * 0.7);
                description = `70% Balance payment for split-pay Order #${order._id}`;
            }
        }
        
        creditAmount = parseFloat(creditAmount.toFixed(2));
        supplier.wallet_balance = (supplier.wallet_balance || 0) + creditAmount;
        await supplier.save({ validateBeforeSave: false });

        await Transaction.create({
            user_id: supplier._id,
            order_id: order._id,
            type: 'payment',
            amount: creditAmount,
            status: 'completed',
            description: description
        });
    }

    // 5. Update Quote/RFQ status (B2B features disabled)

    // 3. Notify Supplier
    const { sendNotification } = require('../services/notificationService');
    const buyerName = `${order.buyer_id?.first_name || ''} ${order.buyer_id?.last_name || ''}`.trim() || 'Buyer';
    let notifyTitle = 'Order Booked';
    let notifyMsg = `${buyerName} booked the product(s). Your wallet has been credited.`;
    if (order.is_split_payment) {
        if (paymentType === 'deposit') {
            notifyTitle = 'Order Booked (Deposit Paid)';
            notifyMsg = `${buyerName} paid the 30% deposit for order #${order._id}. Your wallet has been credited.`;
        } else if (paymentType === 'balance') {
            notifyTitle = 'Order Fully Paid';
            notifyMsg = `${buyerName} paid the 70% balance for order #${order._id}. Your wallet has been credited.`;
        }
    }

    await sendNotification(
        io,
        order.supplier_id,
        notifyTitle,
        notifyMsg,
        'order',
        `/dashboard/orders/${order._id}`
    );

    // 4. Send Email (Queued Template)
    try {
        const { enqueueTemplatedMail } = require('../services/mailService');
        const buyer = await User.findById(order.buyer_id);
        if (buyer && buyer.email) {
            enqueueTemplatedMail('order-confirmation', buyer.email, {
                first_name: buyer.first_name,
                order_id: order._id,
                total_currency: '$', // Adjust if dynamic currency is used
                total_amount: order.total_amount,
                order_url: `${process.env.FRONTEND_URL}/dashboard/orders/${order._id}`
            }).catch(e => console.error('Order confirmation templated email error:', e));
        }
    } catch (e) {
        console.error('Email notify error:', e);
    }

    // 6. Credit Campaign Affiliate Metrics if applicable
    if (order.referral_code) {
        try {
            const Campaign = require('../models/Campaign');
            const campaign = await Campaign.findOne({
                referral_code: order.referral_code,
                supplier_id: order.supplier_id
            });
            if (campaign) {
                campaign.referred_orders_count += 1;
                campaign.referred_sales_amount += order.total_amount;
                await campaign.save();
                console.log(`Credited campaign ${campaign.name} for referral code ${order.referral_code}`);
            }

            // Award 500 loyalty points to the referring customer if referral_code belongs to a customer
            const User = require('../models/User');
            let referrer = null;
            if (order.referral_code) {
                if (order.referral_code.length === 24) {
                    referrer = await User.findById(order.referral_code);
                } else if (order.referral_code.length === 8) {
                    // Suffix matching
                    referrer = await User.findOne({
                        $expr: {
                            $eq: [
                                { $substrCP: [{ $toString: "$_id" }, 16, 8] },
                                order.referral_code
                            ]
                        }
                    });
                }
            }
            if (!referrer) {
                // Fallback to referred_by on User
                const buyer = await User.findById(order.buyer_id);
                if (buyer && buyer.referred_by) {
                    referrer = await User.findById(buyer.referred_by);
                }
            }

            if (referrer && referrer._id.toString() !== order.buyer_id.toString()) {
                // Check if this is the buyer's first paid order
                const Order = require('../models/Order');
                const priorOrdersCount = await Order.countDocuments({
                    buyer_id: order.buyer_id,
                    payment_status: 'paid',
                    _id: { $ne: order._id }
                });

                if (priorOrdersCount === 0) {
                    const LoyaltyTransaction = require('../models/LoyaltyTransaction');
                    const existingRefTx = await LoyaltyTransaction.findOne({ user: referrer._id, order: order._id, type: 'referral' });
                    if (!existingRefTx) {
                        referrer.loyalty_points = (referrer.loyalty_points || 0) + 500;
                        await referrer.save({ validateBeforeSave: false });

                        await LoyaltyTransaction.create({
                            user: referrer._id,
                            points: 500,
                            type: 'referral',
                            order: order._id,
                            description: `Referred customer successfully placed their first order (Order #${order._id})`
                        });
                        console.log(`Awarded 500 loyalty points to referrer user ${referrer._id}`);
                    }
                } else {
                    console.log(`Buyer ${order.buyer_id} has prior orders. Referral points not awarded to referrer ${referrer._id}.`);
                }
            }
        } catch (campaignErr) {
            console.error('Error crediting campaign referral or awarding points:', campaignErr);
        }
    }

    // 7. Post Automatic Order Notice in Chat & Trigger Supplier Auto-reply
    try {
        const Conversation = require('../models/Conversation');
        const Message = require('../models/Message');
        const Company = require('../models/Company');

        let conversation = await Conversation.findOne({
            buyer_id: order.buyer_id,
            supplier_id: order.supplier_id
        });

        if (!conversation) {
            conversation = await Conversation.create({
                buyer_id: order.buyer_id,
                supplier_id: order.supplier_id
            });
        }

        const orderMsg = order.is_split_payment 
            ? `[System Notice] I have placed an order (Order #${order._id}) using Split Payment.\n\n` +
              `• Order Total: $${order.total_amount}\n` +
              `• 30% Deposit Paid: $${order.deposit_amount}\n` +
              `• 70% Balance Due: $${order.balance_amount}\n` +
              `• Payment Method: ${order.payment_method}\n` +
              `• Shipping Fee: $${order.shipping_fee}`
            : `[System Notice] I have placed an order (Order #${order._id}) successfully.\n\n` +
              `• Order Total: $${order.total_amount}\n` +
              `• Payment Method: ${order.payment_method}\n` +
              `• Shipping Fee: $${order.shipping_fee}`;

        if (!order.is_split_payment || paymentType === 'deposit') {
            const newMessage = await Message.create({
                conversationId: conversation._id,
                senderId: order.buyer_id,
                receiverId: order.supplier_id,
                content: orderMsg,
                messageType: 'text'
            });

            const supplierCompany = await Company.findOne({ user_id: order.supplier_id });
            let lastMsgId = newMessage._id;

            if (supplierCompany && supplierCompany.auto_reply_enabled) {
                const replyMsg = supplierCompany.auto_reply_text || 'Thank you for your order. We will process it shortly!';
                const autoReplyMessage = await Message.create({
                    conversationId: conversation._id,
                    senderId: order.supplier_id,
                    receiverId: order.buyer_id,
                    content: `[Auto-Reply] ${replyMsg}`,
                    messageType: 'text'
                });
                lastMsgId = autoReplyMessage._id;
            }

            conversation.lastMessage = lastMsgId;
            await conversation.save();

            if (io) {
                io.to(conversation._id.toString()).emit('messageReceived', newMessage);
                if (supplierCompany && supplierCompany.auto_reply_enabled) {
                    io.to(conversation._id.toString()).emit('messageReceived', { _id: lastMsgId, content: `[Auto-Reply] ${supplierCompany.auto_reply_text}`, senderId: order.supplier_id });
                }
            }
        }
    } catch (chatErr) {
        console.error('Error posting automatic order notice in chat:', chatErr);
    }
}

// @desc    Pay remaining balance of a split payment order
// @route   POST /api/orders/:id/pay-balance
// @access  Private/Buyer
exports.payBalanceOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.buyer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (!order.is_split_payment) {
            return res.status(400).json({ message: 'This order is not a split payment order' });
        }
        if (!order.deposit_paid) {
            return res.status(400).json({ message: 'Deposit has not been paid yet' });
        }
        if (order.balance_paid) {
            return res.status(400).json({ message: 'Balance has already been paid' });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || '';
        const targetMethod = req.body.paymentMethod || order.payment_provider || 'stripe';
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: targetMethod, enable: true });

        if (!settings && targetMethod !== 'stripe') {
            return res.status(400).json({ message: `${targetMethod} payment is not enabled` });
        }

        let responseData = {};
        const balanceVal = order.balance_amount;

        if (targetMethod === 'stripe') {
            const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `70% Balance Secure Payment: Order #${order._id}`,
                            description: `Final balance payment for order #${order._id}`
                        },
                        unit_amount: Math.round(balanceVal * 100),
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`,
                client_reference_id: req.user._id.toString(),
                metadata: {
                    orderId: order._id.toString(),
                    paymentType: 'balance'
                }
            });

            order.balance_stripe_session_id = session.id;
            await order.save();
            responseData = { id: session.id, url: session.url };
        } else if (targetMethod === 'razorpay') {
            const isMock = !settings.public_key || !settings.secret_key ||
                           settings.public_key.includes('mock') || settings.secret_key.includes('mock');
            if (isMock) {
                responseData = {
                    id: `rzp_order_mock_${Date.now()}`,
                    amount: Math.round(balanceVal * 100),
                    currency: "INR",
                    key: settings.public_key || "rzp_test_mock_key",
                    is_mock: true
                };
            } else {
                const instance = new Razorpay({
                    key_id: settings.public_key,
                    key_secret: settings.secret_key,
                });

                const options = {
                    amount: Math.round(balanceVal * 100),
                    currency: "INR",
                    receipt: `balance_${order._id}_${Date.now()}`,
                };

                const rzpOrder = await instance.orders.create(options);
                responseData = { 
                    id: rzpOrder.id, 
                    amount: rzpOrder.amount, 
                    currency: rzpOrder.currency,
                    key: settings.public_key 
                };
            }

            order.balance_razorpay_order_id = responseData.id;
            await order.save();
        } else {
            return res.status(400).json({ message: 'Pay balance only supported via Stripe or Razorpay' });
        }

        res.json(responseData);
    } catch (err) {
        console.error('Pay balance error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Cancel order (Buyer)
// @route   PUT /api/orders/:id/cancel
// @access  Private/Buyer
exports.buyerCancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify that the user is the buyer of the order
        if (order.buyer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this order' });
        }

        // Check if status is pending or confirmed
        const allowedStatuses = ['pending', 'confirmed'];
        if (!allowedStatuses.includes(order.status.toLowerCase())) {
            return res.status(400).json({ 
                message: `Cannot cancel order after it has been ${order.status}. Cancellation is only allowed when order is pending or preparing.` 
            });
        }

        const oldStatus = order.status;
        order.status = 'cancelled';

        // Refund Gift Card if balance was deducted
        if (order.gift_card_code && order.gift_card_discount > 0 && order.gift_card_deducted) {
            const { refundGiftCardBalanceInternal } = require('./giftCardController');
            try {
                await refundGiftCardBalanceInternal(order.gift_card_code, order.gift_card_discount, order._id);
                order.gift_card_deducted = false;
            } catch (gcErr) {
                console.error('Failed to refund gift card balance on buyer cancellation:', gcErr.message);
            }
        }

        await order.save();

        await createOrderStatusLog(order._id, 'Cancelled', `Order cancelled by buyer. Prior status was: ${oldStatus}`);

        // Notify Supplier
        const { sendNotification } = require('../services/notificationService');
        const User = require('../models/User');
        const buyer = await User.findById(order.buyer_id);
        const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() : 'Buyer';
        
        await sendNotification(
            req.io,
            order.supplier_id,
            'Order Cancelled',
            `Order #${order._id} was cancelled by the buyer (${buyerName}).`,
            'order',
            `/dashboard/orders/${order._id}`
        );

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Buyer cancel order error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Supplier updates exchange tracking information
// @route   PUT /api/orders/:id/exchange-tracking
// @access  Private/Supplier
exports.updateExchangeTracking = async (req, res) => {
    try {
        const { carrier, tracking_number } = req.body;
        if (!carrier || !tracking_number) {
            return res.status(400).json({ message: 'Carrier and tracking_number are required' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update tracking for this order' });
        }

        const courierService = require('../services/courierService');
        order.exchange_details.carrier = carrier || 'DHL Express';
        order.exchange_details.tracking_number = tracking_number || courierService.generateTrackingNumber(order.exchange_details.carrier);
        order.exchange_details.status = 'shipped';

        await order.save();
        await createOrderStatusLog(order._id, 'Exchange Shipped', `Replacement shipped via ${order.exchange_details.carrier} with tracking: ${order.exchange_details.tracking_number}`);

        const { sendNotification } = require('../services/notificationService');
        await sendNotification(
            req.io,
            order.buyer_id,
            'Exchange Items Shipped',
            `Your replacement item for order #${order._id} has been shipped via ${order.exchange_details.carrier}.`,
            'order',
            `/dashboard/orders/${order._id}`
        );

        res.json({ message: 'Exchange tracking updated successfully', order });
    } catch (error) {
        console.error('Update exchange tracking error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Buyer confirms delivery receipt of exchanged items
// @route   PUT /api/orders/:id/confirm-exchange-delivery
// @access  Private/Buyer
exports.confirmExchangeDelivery = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.buyer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        order.exchange_details.status = 'delivered';
        order.status = 'delivered';

        await order.save();
        await createOrderStatusLog(order._id, 'Exchange Delivered', 'Buyer confirmed receipt of the exchange items.');

        const { sendNotification } = require('../services/notificationService');
        await sendNotification(
            req.io,
            order.supplier_id,
            'Exchange Delivered',
            `The buyer confirmed delivery of replacement items for order #${order._id}.`,
            'order',
            `/dashboard/orders/${order._id}`
        );

        res.json({ message: 'Exchange delivery confirmed successfully', order });
    } catch (error) {
        console.error('Confirm exchange delivery error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Calculate live courier shipping rates
// @route   POST /api/orders/shipping/rates
// @access  Private
exports.calculateShippingRates = async (req, res) => {
    try {
        const { items, countryCode } = req.body;
        if (!items || !countryCode) {
            return res.status(400).json({ message: 'items and countryCode are required' });
        }

        let totalWeight = 0;
        for (const item of items) {
            const product = await Product.findById(item.product_id || item.productId);
            if (product && product.weight) {
                totalWeight += product.weight * (item.quantity || 1);
            }
        }

        const courierService = require('../services/courierService');
        const rates = courierService.calculateRates(totalWeight, countryCode);

        res.json({ rates });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get printable shipping label (HTML format)
// @route   GET /api/orders/:id/shipping-label
// @access  Private/Supplier or Admin
exports.getShippingLabel = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyer_id', 'first_name last_name email');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.supplier_id.toString() !== req.user._id.toString() && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized to view shipping label' });
        }

        const courierService = require('../services/courierService');
        const carrier = order.shipping_company || 'DHL Express';
        const tracking = order.tracking_number || courierService.generateTrackingNumber(carrier);

        const html = courierService.generateShippingLabelHtml(order, carrier, tracking);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.completePaymentPostTasks = completePaymentPostTasks;
exports.createOrderStatusLog = createOrderStatusLog;
