const GiftCard = require('../models/GiftCard');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Generate Gift Card (Admin only)
exports.createGiftCard = async (req, res) => {
    try {
        const { amount, expiresAt, count = 1 } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid gift card amount' });
        }

        const generatedCards = [];
        for (let i = 0; i < count; i++) {
            // Generate unique 16 character voucher code (e.g. GIFT-XXXX-XXXX-XXXX)
            const randomCode = 'GIFT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase();

            const giftCard = new GiftCard({
                code: randomCode,
                initial_value: amount,
                balance: amount,
                is_active: true,
                expiresAt: expiresAt || null,
                created_by: req.user._id
            });
            await giftCard.save();
            generatedCards.push(giftCard);
        }

        res.status(201).json({ success: true, data: generatedCards });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all Gift Cards (Admin only)
exports.getGiftCards = async (req, res) => {
    try {
        const cards = await GiftCard.find({})
            .sort('-createdAt')
            .populate('created_by', 'first_name last_name email')
            .populate('owner', 'first_name last_name email');
        res.status(200).json({ success: true, data: cards });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Apply Gift Card at Checkout
exports.applyGiftCard = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Gift card code is required' });
        }

        const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
        if (!card) {
            return res.status(404).json({ success: false, message: 'Invalid Gift Card code' });
        }

        if (!card.is_active || card.balance <= 0) {
            return res.status(400).json({ success: false, message: 'Gift Card is inactive or has zero balance' });
        }

        if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
            card.is_active = false;
            await card.save();
            return res.status(400).json({ success: false, message: 'Gift Card has expired' });
        }

        // If card has a designated owner, check it matches the current user
        if (card.owner && card.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'This Gift Card belongs to another user' });
        }

        res.status(200).json({
            success: true,
            code: card.code,
            balance: card.balance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Redeem Gift Card into Wallet balance
exports.redeemGiftCard = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Gift card code is required' });
        }

        const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
        if (!card) {
            return res.status(404).json({ success: false, message: 'Invalid Gift Card code' });
        }

        if (!card.is_active || card.balance <= 0) {
            return res.status(400).json({ success: false, message: 'Gift Card is already redeemed or inactive' });
        }

        if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
            card.is_active = false;
            await card.save();
            return res.status(400).json({ success: false, message: 'Gift Card has expired' });
        }

        if (card.owner && card.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'This Gift Card belongs to another user' });
        }

        const amountToRedeem = card.balance;

        // Top up user wallet balance
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.wallet_balance = parseFloat(((user.wallet_balance || 0) + amountToRedeem).toFixed(2));
        await user.save();

        // Record redeem transaction on GiftCard ledger
        card.transactions.push({
            amount: amountToRedeem,
            type: 'redeem',
            description: `Redeemed to Wallet for User ${user.email}`
        });

        // Set card owner if not already set
        if (!card.owner) {
            card.owner = req.user._id;
        }
        card.balance = 0;
        card.is_active = false;
        await card.save();

        // Record credit transaction in general system ledger
        const transaction = new Transaction({
            user_id: req.user._id,
            type: 'credit',
            amount: amountToRedeem,
            currency: 'USD',
            status: 'completed',
            description: `Redeemed Gift Card code: ${card.code} to Wallet`
        });
        await transaction.save();

        res.status(200).json({
            success: true,
            message: `Successfully redeemed $${amountToRedeem.toFixed(2)} to your wallet!`,
            wallet_balance: user.wallet_balance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Deduct balance from card during checkout payment verification
exports.deductGiftCardBalanceInternal = async (code, amount, orderId) => {
    const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
    if (!card) throw new Error('Gift Card not found during balance deduction');
    if (card.balance < amount) {
        throw new Error(`Insufficient Gift Card balance. Required: $${amount}, Available: $${card.balance}`);
    }

    card.balance = parseFloat((card.balance - amount).toFixed(2));
    if (card.balance <= 0) {
        card.is_active = false;
    }

    card.transactions.push({
        amount,
        type: 'deduct',
        description: `Deducted $${amount} for checkout payment`,
        order_id: orderId
    });

    await card.save();
    return card;
};

// Helper: Refund balance to card during order cancellation
exports.refundGiftCardBalanceInternal = async (code, amount, orderId) => {
    const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
    if (!card) throw new Error('Gift Card not found during refund');

    card.balance = parseFloat((card.balance + amount).toFixed(2));
    card.is_active = true;

    card.transactions.push({
        amount,
        type: 'refund',
        description: `Refunded $${amount} due to order cancellation`,
        order_id: orderId
    });

    await card.save();
    return card;
};

// Purchase Gift Card (Stripe checkout session, PayPal, or Wallet direct payment)
exports.purchaseGiftCard = async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid gift card amount' });
        }

        const targetMethod = paymentMethod || 'stripe';
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: targetMethod, enable: true });

        if (!settings && targetMethod !== 'stripe' && targetMethod !== 'wallet') {
            return res.status(400).json({ success: false, message: `${targetMethod} payment is not enabled` });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
        let responseData = {};

        if (targetMethod === 'wallet') {
            const user = await User.findById(req.user._id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if ((user.wallet_balance || 0) < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }

            user.wallet_balance = parseFloat(((user.wallet_balance || 0) - amount).toFixed(2));
            await user.save();

            // Generate unique voucher code
            const randomCode = 'GIFT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase();

            const giftCard = new GiftCard({
                code: randomCode,
                initial_value: amount,
                balance: amount,
                is_active: true,
                owner: req.user._id,
                created_by: req.user._id,
                transactions: [{
                    amount,
                    type: 'redeem',
                    description: `Initial purchase using Wallet balance`
                }]
            });
            await giftCard.save();

            // Record transaction in ledger
            await Transaction.create({
                user_id: req.user._id,
                type: 'payment',
                amount: amount,
                currency: 'USD',
                status: 'completed',
                description: `Purchased Gift Card code: ${giftCard.code} via Wallet`
            });

            // Enqueue email
            try {
                const { enqueueTemplatedMail } = require('../services/mailService');
                enqueueTemplatedMail('gift-card-purchase', user.email, {
                    first_name: user.first_name,
                    gift_card_code: giftCard.code,
                    gift_card_amount: amount.toFixed(2)
                }).catch(e => console.error('Gift card purchase email error:', e));
            } catch (e) {}

            return res.status(201).json({
                success: true,
                message: `Successfully purchased $${amount.toFixed(2)} Gift Card!`,
                code: giftCard.code,
                wallet_balance: user.wallet_balance
            });
        } else if (targetMethod === 'stripe') {
            const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
            const session = await stripeInstance.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Digital Gift Certificate - $${amount.toFixed(2)}`,
                            description: `Store credit voucher code for AliExpress B2C marketplace.`
                        },
                        unit_amount: Math.round(amount * 100)
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`,
                client_reference_id: req.user._id.toString(),
                metadata: {
                    type: 'gift_card_purchase',
                    amount: String(amount),
                    buyer_id: req.user._id.toString()
                }
            });
            responseData = { id: session.id, url: session.url };
        } else if (targetMethod === 'paypal') {
            const isMock = !settings.public_key || !settings.secret_key ||
                           settings.public_key.includes('mock') || settings.secret_key.includes('mock');

            if (isMock) {
                const mockOrderId = `paypal_gc_mock_${Date.now()}`;
                responseData = {
                    id: mockOrderId,
                    url: `${FRONTEND_URL}/dashboard?status=success&token=${mockOrderId}&gc_amount=${amount}`
                };
            } else {
                const paypal = require('@paypal/checkout-server-sdk');
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
                            value: amount.toFixed(2)
                        },
                        description: `Gift Card Purchase - $${amount.toFixed(2)}`
                    }],
                    application_context: {
                        return_url: `${FRONTEND_URL}/dashboard?status=success&gc_amount=${amount}`,
                        cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`
                    }
                });

                const order = await client.execute(request);
                const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
                responseData = { id: order.result.id, url: approvalUrl };
            }
        }

        res.status(200).json({ success: true, ...responseData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyGiftCards = async (req, res) => {
    try {
        const giftCards = await GiftCard.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, giftCards });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

