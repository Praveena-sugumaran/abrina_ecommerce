const GiftCard = require('../models/GiftCard');
const GiftCardTemplate = require('../models/GiftCardTemplate');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Default initial templates to seed if database is empty
const defaultTemplates = [
    { name: '$10 Gift Card', value: 10, price: 10, stock: 100, is_active: true, description: 'Standard $10 Gift Card Voucher for order bookings' },
    { name: '$25 Gift Card', value: 25, price: 25, stock: 100, is_active: true, description: 'Popular $25 Gift Card Voucher for order bookings' },
    { name: '$50 Gift Card', value: 50, price: 50, stock: 100, is_active: true, description: 'Premium $50 Gift Card Voucher for order bookings' },
    { name: '$100 Gift Card', value: 100, price: 100, stock: 100, is_active: true, description: 'VIP $100 Gift Card Voucher for order bookings' },
    { name: '$250 Gift Card', value: 250, price: 250, stock: 100, is_active: true, description: 'Executive $250 Gift Card Voucher for order bookings' }
];

// Helper to ensure initial default templates exist
const ensureTemplatesSeeded = async () => {
    try {
        const count = await GiftCardTemplate.countDocuments({});
        if (count === 0) {
            await GiftCardTemplate.insertMany(defaultTemplates);
        }
    } catch (e) {
        console.error('Failed to seed default gift card templates:', e);
    }
};

// 1. Get Public Gift Card Products for Customers
exports.getPublicTemplates = async (req, res) => {
    try {
        await ensureTemplatesSeeded();
        const templates = await GiftCardTemplate.find({ is_active: true }).sort({ price: 1 });
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Admin: Get all Gift Card Products
exports.getAdminTemplates = async (req, res) => {
    try {
        await ensureTemplatesSeeded();
        const templates = await GiftCardTemplate.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Admin: Create Gift Card Product
exports.createTemplate = async (req, res) => {
    try {
        const { name, value, price, stock, description, terms, image, expires_in_days } = req.body;
        if (!name || !value || value <= 0) {
            return res.status(400).json({ success: false, message: 'Valid Gift Card name and value are required' });
        }

        const template = new GiftCardTemplate({
            name,
            value: Number(value),
            price: price !== undefined && price !== '' ? Number(price) : Number(value),
            stock: stock !== undefined && stock !== '' ? Number(stock) : 100,
            description: description || `Official $${value} Gift Card Voucher`,
            terms: terms || 'Valid for all product bookings and checkout orders.',
            image: image || '',
            expires_in_days: expires_in_days ? Number(expires_in_days) : 365,
            is_active: true
        });

        await template.save();
        res.status(201).json({ success: true, data: template, message: 'Gift Card product created successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. Admin: Update Gift Card Product
exports.updateTemplate = async (req, res) => {
    try {
        const template = await GiftCardTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!template) return res.status(404).json({ success: false, message: 'Gift Card product not found' });
        res.status(200).json({ success: true, data: template, message: 'Gift Card product updated' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Admin: Delete Gift Card Product
exports.deleteTemplate = async (req, res) => {
    try {
        const template = await GiftCardTemplate.findByIdAndDelete(req.params.id);
        if (!template) return res.status(404).json({ success: false, message: 'Gift Card product not found' });
        res.status(200).json({ success: true, message: 'Gift Card product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate Gift Card Code Manually (Admin only)
exports.createGiftCard = async (req, res) => {
    try {
        const { amount, expiresAt, count = 1 } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid gift card amount' });
        }

        const generatedCards = [];
        for (let i = 0; i < count; i++) {
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

// Get all generated Gift Cards (Admin only)
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
            return res.status(404).json({ success: false, message: 'Invalid gift card code' });
        }

        if (!card.is_active) {
            return res.status(400).json({ success: false, message: 'This gift card has been deactivated' });
        }

        if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'This gift card has expired' });
        }

        if (card.balance <= 0) {
            return res.status(400).json({ success: false, message: 'This gift card has zero remaining balance' });
        }

        res.status(200).json({
            success: true,
            code: card.code,
            balance: card.balance,
            initial_value: card.initial_value,
            message: `Gift card applied! Balance available: $${card.balance}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Redeem Gift Card to Account / Wallet Balance
exports.redeemGiftCard = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Gift card code is required' });
        }

        const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
        if (!card) {
            return res.status(404).json({ success: false, message: 'Invalid gift card code' });
        }

        if (!card.is_active) {
            return res.status(400).json({ success: false, message: 'This gift card has been deactivated' });
        }

        if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'This gift card has expired' });
        }

        if (card.balance <= 0) {
            return res.status(400).json({ success: false, message: 'This gift card balance has already been fully redeemed' });
        }

        const redeemAmount = card.balance;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.wallet_balance = (user.wallet_balance || 0) + redeemAmount;
        await user.save();

        card.balance = 0;
        card.is_active = false;
        card.owner = req.user._id;
        card.transactions.push({
            amount: redeemAmount,
            type: 'redeem',
            description: `Redeemed to Wallet Balance by ${user.first_name} ${user.last_name}`
        });
        await card.save();

        await Transaction.create({
            user_id: req.user._id,
            type: 'deposit',
            amount: redeemAmount,
            currency: 'USD',
            status: 'completed',
            description: `Redeemed Gift Card code: ${card.code}`
        });

        res.status(200).json({
            success: true,
            message: `Successfully redeemed gift card! $${redeemAmount.toFixed(2)} credited to your account for booking.`,
            amount: redeemAmount,
            wallet_balance: user.wallet_balance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Purchase Gift Card Product (Customer selection from Admin defined Gift Card products)
exports.purchaseGiftCard = async (req, res) => {
    try {
        const { templateId, template_id, paymentMethod } = req.body;
        const targetId = templateId || template_id;

        await ensureTemplatesSeeded();

        let template = null;
        if (targetId) {
            template = await GiftCardTemplate.findById(targetId);
        } else if (req.body.amount) {
            template = await GiftCardTemplate.findOne({
                is_active: true,
                $or: [{ value: Number(req.body.amount) }, { price: Number(req.body.amount) }]
            });
        }

        if (!template || !template.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Custom amounts are disabled. Please select an available Admin-created Gift Card product.'
            });
        }

        if (template.stock <= 0) {
            return res.status(400).json({
                success: false,
                message: `The selected Gift Card product (${template.name}) is currently out of stock.`
            });
        }

        const cardValue = template.value;
        const chargeAmount = template.price;

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
            if ((user.wallet_balance || 0) < chargeAmount) {
                return res.status(400).json({ success: false, message: `Insufficient wallet balance. Charge price is $${chargeAmount.toFixed(2)}.` });
            }

            user.wallet_balance = parseFloat(((user.wallet_balance || 0) - chargeAmount).toFixed(2));
            await user.save();

            // Decrement template stock
            template.stock = Math.max(0, template.stock - 1);
            template.sold_count = (template.sold_count || 0) + 1;
            await template.save();

            // Generate unique voucher code
            const randomCode = 'GIFT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                               Math.random().toString(36).substring(2, 6).toUpperCase();

            const expiresAt = template.expires_in_days 
                ? new Date(Date.now() + template.expires_in_days * 24 * 60 * 60 * 1000) 
                : null;

            const giftCard = new GiftCard({
                code: randomCode,
                initial_value: cardValue,
                balance: cardValue,
                is_active: true,
                expiresAt,
                owner: req.user._id,
                created_by: req.user._id,
                transactions: [{
                    amount: cardValue,
                    type: 'redeem',
                    description: `Purchased template: ${template.name}`
                }]
            });
            await giftCard.save();

            await Transaction.create({
                user_id: req.user._id,
                type: 'payment',
                amount: chargeAmount,
                currency: 'USD',
                status: 'completed',
                description: `Purchased ${template.name} (${giftCard.code})`
            });

            return res.status(201).json({
                success: true,
                message: `Successfully purchased ${template.name}! Code: ${giftCard.code}`,
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
                            name: template.name,
                            description: template.description || `$${cardValue} Store credit voucher for order bookings.`
                        },
                        unit_amount: Math.round(chargeAmount * 100)
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${FRONTEND_URL}/dashboard?status=cancel`,
                client_reference_id: req.user._id.toString(),
                metadata: {
                    type: 'gift_card_purchase',
                    amount: String(cardValue),
                    template_id: String(template._id),
                    buyer_id: req.user._id.toString()
                }
            });
            responseData = { id: session.id, url: session.url };
        } else if (targetMethod === 'paypal') {
            const mockOrderId = `paypal_gc_mock_${Date.now()}`;
            responseData = {
                id: mockOrderId,
                url: `${FRONTEND_URL}/dashboard?status=success&token=${mockOrderId}&gc_amount=${cardValue}`
            };
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
