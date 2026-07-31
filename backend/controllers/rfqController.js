const RFQ = require('../models/RFQ');
const Quote = require('../models/Quote');
const User = require('../models/User');
const supplierService = require('../services/supplierService');
const { enqueueTemplatedMail } = require('../services/mailService');
const SiteSetting = require('../models/SiteSetting');
const Category = require('../models/Category');

// @desc    Create a new RFQ
// @route   POST /api/rfq
// @access  Private/Buyer
exports.createRFQ = async (req, res) => {
    try {
        const { title, description, category, quantity, unit, target_price, currency, expiry_date, shipping_details } = req.body;

        // ── Subscription Check for Buyer RFQs ──
        const user = await User.findById(req.user._id).populate('subscription_plan');
        const limit = user?.subscription_plan ? user.subscription_plan.max_rfqs : 5; // Default 5 for free users

        if (limit !== -1) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const rfqCount = await RFQ.countDocuments({
                buyer: req.user._id,
                createdAt: { $gte: startOfMonth }
            });

            if (rfqCount >= limit) {
                return res.status(403).json({ 
                    message: `Monthly RFQ limit reached (${rfqCount}/${limit}). Please upgrade your plan to post more RFQs.` 
                });
            }
        }

        const attachments = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

        const rfq = await RFQ.create({
            buyer: req.user._id,
            title,
            description,
            category,
            quantity,
            unit,
            target_price,
            currency,
            expiry_date,
            shipping_details,
            attachments
        });

        // Send Email Confirmation (Queued)
        const siteSettings = await SiteSetting.findOne();
        enqueueTemplatedMail('post-rfq-confirmation', req.user.email, {
            user_name: `${req.user.first_name || 'Buyer'}`,
            rfq_title: rfq.title,
            quantity: rfq.quantity,
            unit: rfq.unit,
            target_price: rfq.target_price,
            currency: rfq.currency,
            site_name: siteSettings?.site_name || 'Our Marketplace'
        }).catch(e => console.error('Post RFQ email error:', e));

        // Send Notification to Admin (Queued)
        const categoryData = await Category.findById(category);
        enqueueTemplatedMail('admin-new-rfq-notification', process.env.MAIL_FROM_ADDRESS, {
            buyer_name: `${req.user.first_name} ${req.user.last_name}`,
            buyer_email: req.user.email,
            rfq_title: rfq.title,
            category: categoryData?.title || 'General',
            quantity: rfq.quantity,
            unit: rfq.unit,
            admin_link: `${process.env.FRONTEND_URL}/admin/rfqs`,
            site_name: siteSettings?.site_name || 'Our Marketplace'
        }).catch(e => console.error('Admin RFQ email error:', e));

        res.status(201).json(rfq);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all active RFQs
// @route   GET /api/rfq
// @access  Public (or Private/Supplier)
exports.getRFQs = async (req, res) => {
    try {
        const { category, status } = req.query;
        let query = { status: status || 'active' };

        if (category) query.category = category;

        const rfqs = await RFQ.find(query)
            .populate('buyer', 'first_name last_name company_name country_code')
            .populate('category', 'title')
            .sort({ isPromoted: -1, createdAt: -1 });

        // If authenticated supplier, check if they've already quoted
        const rfqList = await Promise.all(rfqs.map(async (rfq) => {
            let hasQuoted = false;
            if (req.user && (req.user.roles?.includes('supplier') || req.user.role === 'supplier')) {
                const quote = await Quote.findOne({ rfq: rfq._id, supplier: req.user._id });
                if (quote) hasQuoted = true;
            }
            return { ...rfq.toObject(), hasQuoted };
        }));

        res.json(rfqList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get RFQs created by the logged-in buyer
// @route   GET /api/rfq/my-rfqs
// @access  Private/Buyer
exports.getMyRFQs = async (req, res) => {
    try {
        const rfqs = await RFQ.find({ buyer: req.user._id })
            .populate('category', 'title')
            .sort({ createdAt: -1 });

        res.json(rfqs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get RFQ by ID
// @route   GET /api/rfq/:id
// @access  Private
exports.getRFQById = async (req, res) => {
    try {
        const rfq = await RFQ.findById(req.params.id)
            .populate('buyer', 'first_name last_name company_name country_code')
            .populate('category', 'title');

        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

        res.json(rfq);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a quote for an RFQ
// @route   POST /api/rfq/:id/quote
// @access  Private/Supplier
exports.submitQuote = async (req, res) => {
    try {
        const rfq = await RFQ.findById(req.params.id);
        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

        // Check if supplier already submitted a quote
        const existingQuote = await Quote.findOne({ rfq: req.params.id, supplier: req.user._id });
        if (existingQuote) {
            return res.status(400).json({ message: 'You have already submitted a quote for this RFQ' });
        }

        // Check if supplier has unlocked/purchased this lead
        const hasUnlocked = rfq.purchased_suppliers && rfq.purchased_suppliers.includes(req.user._id);

        // ── Subscription Check for RFQ Quota ──
        const user = await require('../models/User').findById(req.user._id).populate('subscription_plan');
        const plan = user?.subscription_plan;

        const isPremium = plan && (plan.max_rfq_responses === -1 || plan.name?.toLowerCase().includes('premium') || plan.name?.toLowerCase().includes('gold') || plan.name?.toLowerCase().includes('enterprise'));

        if (!hasUnlocked && !isPremium) {
            return res.status(403).json({ 
                message: `This sourcing lead is locked. Please unlock the lead for $${(rfq.lead_price || 5.00).toFixed(2)} or upgrade to a Gold/Premium subscription.`,
                lead_locked: true 
            });
        }

        // Quota check only if they are using their subscription plan quota (and haven't unlocked/purchased the lead separately)
        if (!hasUnlocked) {
            if (!plan) {
                return res.status(403).json({ message: 'Please subscribe to a plan to submit quotes.' });
            }

            if (plan.max_rfq_responses !== -1) {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const quoteCountThisMonth = await Quote.countDocuments({
                    supplier: req.user._id,
                    createdAt: { $gte: startOfMonth }
                });

                if (quoteCountThisMonth >= plan.max_rfq_responses) {
                    return res.status(403).json({ message: `Monthly quote limit reached for ${plan.name} plan (${plan.max_rfq_responses}). Please upgrade to send more quotes.` });
                }
            }
        }


        const { price_offered, currency, valid_until, note, estimated_delivery_days } = req.body;

        const quote = await Quote.create({
            rfq: req.params.id,
            supplier: req.user._id,
            price_offered,
            currency,
            valid_until,
            note,
            estimated_delivery_days,
            last_offered_by: 'supplier',
            status: 'pending'
        });

        // Notify Buyer
        const { sendNotification } = require('../services/notificationService');
        await sendNotification(
            req.io,
            rfq.buyer,
            'New Quote Received',
            `A supplier has submitted a quote for your RFQ: ${rfq.title}`,
            'rfq',
            `/dashboard/rfq/${rfq._id}`,
            'buyer'
        );

        // Send Email Notification to Buyer (Queued)
        const siteSettings = await SiteSetting.findOne();
        const buyer = await User.findById(rfq.buyer);
        enqueueTemplatedMail('new-quote-received', buyer.email, {
            user_name: buyer.first_name || 'Buyer',
            rfq_title: rfq.title,
            price_offered: quote.price_offered,
            currency: quote.currency,
            note: quote.note || 'No note provided',
            quote_link: `${process.env.FRONTEND_URL}/dashboard/rfq/${rfq._id}`,
            site_name: siteSettings?.site_name || 'Our Marketplace'
        }).catch(e => console.error('New quote email error:', e));

        // 📈 Update supplier response rate
        await supplierService.updateResponseMetrics(req.user._id);

        res.status(201).json(quote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user (supplier) quotes
// @route   GET /api/rfq/my-quotes
// @access  Private/Supplier
exports.getMyQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find({ supplier: req.user._id })
            .populate('rfq')
            .sort({ createdAt: -1 });

        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get quotes for an RFQ (Buyer only)
// @route   GET /api/rfq/:id/quotes
// @access  Private/Buyer
exports.getRFQQuotes = async (req, res) => {
    try {
        const rfq = await RFQ.findById(req.params.id);
        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

        // Check if requester is the buyer
        if (rfq.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view these quotes' });
        }

        const quotes = await Quote.find({ rfq: req.params.id })
            .populate('supplier', 'first_name last_name company_name country_code status');

        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Negotiate Quote (Buyer or Supplier)
// @route   PUT /api/rfq/quote/:quoteId/negotiate
// @access  Private
exports.negotiateQuote = async (req, res) => {
    try {
        const { price, note } = req.body;
        const quote = await Quote.findById(req.params.quoteId).populate('rfq');

        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        const isBuyer = quote.rfq.buyer.toString() === req.user._id.toString();
        const isSupplier = quote.supplier.toString() === req.user._id.toString();

        if (!isBuyer && !isSupplier && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized to negotiate this quote' });
        }

        // Add to history
        quote.negotiation_history.push({
            price: quote.price_offered,
            note: quote.note,
            offered_by: quote.last_offered_by || 'supplier',
            createdAt: new Date()
        });

        // Update with new offer
        quote.price_offered = price;
        quote.note = note || 'Counter-offer';
        quote.last_offered_by = isBuyer ? 'buyer' : 'supplier';
        quote.status = 'negotiating';

        await quote.save();

        // Notify the counter-party
        const { sendNotification } = require('../services/notificationService');
        const notifyUserId = isBuyer ? quote.supplier : quote.rfq.buyer;
        await sendNotification(
            req.io,
            notifyUserId,
            'Quote Negotiation',
            `${isBuyer ? 'Buyer' : 'Supplier'} has sent a counter-offer for RFQ: ${quote.rfq.title}`,
            'rfq',
            `${isBuyer ? '/supplier' : ''}/dashboard/rfq/${quote.rfq._id}`,
            isBuyer ? 'supplier' : 'buyer'
        );

        // Send Email to the counter-party (Queued)
        const siteSettings = await SiteSetting.findOne();
        const notifyUser = await User.findById(notifyUserId);
        enqueueTemplatedMail('quote-negotiated', notifyUser.email, {
            user_name: notifyUser.first_name || (isBuyer ? 'Supplier' : 'Buyer'),
            rfq_title: quote.rfq.title,
            price: price,
            currency: quote.currency || 'USD',
            note: note || 'Counter-offer',
            quote_link: `${process.env.FRONTEND_URL}${isBuyer ? '/supplier' : ''}/dashboard/rfq/${quote.rfq._id}`,
            site_name: siteSettings?.site_name || 'Our Marketplace'
        }).catch(e => console.error('Quote negotiate email error:', e));

        res.json({ success: true, quote });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update quote status (Accept/Reject)
// @route   PUT /api/rfq/quote/:quoteId/status
// @access  Private/Buyer
exports.updateQuoteStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const quote = await Quote.findById(req.params.quoteId).populate('rfq');

        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        // Check if requester is the buyer who posted the RFQ
        if (quote.rfq.buyer.toString() !== req.user._id.toString() && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized to update this quote' });
        }

        quote.status = status;
        await quote.save();

        // Notify Supplier
        const { sendNotification } = require('../services/notificationService');
        await sendNotification(
            req.io,
            quote.supplier,
            `Quote ${status}`,
            `Your quote for RFQ "${quote.rfq.title}" has been ${status}.`,
            'rfq',
            `/supplier/dashboard/rfq/${quote.rfq._id}`,
            'supplier'
        );

        // Send Email to Supplier (Queued)
        const siteSettings = await SiteSetting.findOne();
        const supplier = await User.findById(quote.supplier);
        enqueueTemplatedMail('quote-status-update', supplier.email, {
            user_name: supplier.first_name || 'Supplier',
            rfq_title: quote.rfq.title,
            status: status,
            quote_link: `${process.env.FRONTEND_URL}/supplier/dashboard/rfq/${quote.rfq._id}`,
            site_name: siteSettings?.site_name || 'Our Marketplace'
        }).catch(e => console.error('Quote status update email error:', e));

        res.json({ success: true, quote });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Boost an RFQ (Monetization)
// @route   PUT /api/rfq/:id/boost
// @access  Private
exports.boostRFQ = async (req, res) => {
    try {
        const { days = 7 } = req.body;
        const rfq = await RFQ.findById(req.params.id);

        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

        // Ensure user is the buyer or admin
        if (rfq.buyer.toString() !== req.user._id.toString() && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);

        rfq.isPromoted = true;
        rfq.promotion_expires = expiry;

        await rfq.save();

        res.json({ success: true, message: `RFQ boosted until ${expiry.toDateString()}`, rfq });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Purchase RFQ sourcing lead using supplier wallet balance
// @route   POST /api/rfq/:id/purchase-lead
// @access  Private/Supplier
exports.purchaseLead = async (req, res) => {
    try {
        const rfq = await RFQ.findById(req.params.id);
        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

        const isPurchased = rfq.purchased_suppliers && rfq.purchased_suppliers.includes(req.user._id);
        if (isPurchased) {
            return res.status(400).json({ message: 'You have already purchased/unlocked this lead.' });
        }

        const price = rfq.lead_price || 5.00;
        const supplier = await User.findById(req.user._id);

        if (supplier.wallet_balance < price) {
            return res.status(400).json({ message: `Insufficient wallet balance to unlock lead. Balance: $${supplier.wallet_balance.toFixed(2)}, Cost: $${price.toFixed(2)}.` });
        }

        // Deduct wallet balance
        supplier.wallet_balance = parseFloat((supplier.wallet_balance - price).toFixed(2));
        await supplier.save();

        // Push supplier to purchased_suppliers
        if (!rfq.purchased_suppliers) rfq.purchased_suppliers = [];
        rfq.purchased_suppliers.push(req.user._id);
        await rfq.save();

        // Create transaction history record
        const Transaction = require('../models/Transaction');
        await Transaction.create({
            user_id: supplier._id,
            type: 'debit',
            amount: price,
            status: 'completed',
            description: `Unlocked RFQ Sourcing Lead: ${rfq.title}`
        });

        res.json({ success: true, message: 'RFQ lead successfully unlocked.', wallet_balance: supplier.wallet_balance, purchased_suppliers: rfq.purchased_suppliers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

