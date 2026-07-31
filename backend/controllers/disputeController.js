const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;


// @desc    Buyer marks order as delivered (confirms receipt)
// @route   PUT /api/orders/:id/confirm-delivery
// @access  Private/Buyer
exports.confirmDelivery = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.buyer_id.toString() !== req.user._id.toString())
            return res.status(403).json({ message: 'Not authorized' });
        if (order.status !== 'shipped')
            return res.status(400).json({ message: 'Order must be in shipped status to confirm delivery' });

        order.status = 'delivered';
        await order.save();
        res.json({ message: 'Delivery confirmed', order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Buyer opens a dispute on a paid order
// @route   POST /api/disputes
// @access  Private/Buyer
exports.openDispute = async (req, res) => {
    try {
        const { order_id, reason, description, type = 'refund', replacement_details } = req.body;
        if (!order_id || !reason || !description)
            return res.status(400).json({ message: 'order_id, reason and description are required' });

        const order = await Order.findById(order_id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.buyer_id.toString() !== req.user._id.toString())
            return res.status(403).json({ message: 'Not authorized' });
        if (order.payment_status !== 'paid')
            return res.status(400).json({ message: 'Can only dispute paid orders' });

        const existing = await Dispute.findOne({ order_id });
        if (existing) return res.status(400).json({ message: 'A dispute already exists for this order' });

        const dispute = await Dispute.create({
            buyer_id: req.user._id,
            supplier_id: order.supplier_id,
            order_id,
            reason,
            type,
            replacement_details,
            description,
            messages: [{
                sender_id: req.user._id,
                sender_role: 'buyer',
                message: description
            }]
        });

        // Mark order payment_status as disputed
        order.payment_status = 'disputed';
        if (type === 'exchange') {
            order.exchange_details = {
                is_exchanged: true,
                reason: reason,
                status: 'pending'
            };
        }
        await order.save();

        res.status(201).json(dispute);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'A dispute already exists for this order' });
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get disputes for the logged-in user (buyer or supplier)
// @route   GET /api/disputes/my-disputes
// @access  Private
exports.getMyDisputes = async (req, res) => {
    try {
        const query = { $or: [{ buyer_id: req.user._id }, { supplier_id: req.user._id }] };

        const disputes = await Dispute.find(query)
            .populate('order_id')
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ createdAt: -1 });

        res.json(disputes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add a message to dispute thread (buyer / supplier)
// @route   POST /api/disputes/:id/message
// @access  Private
exports.addDisputeMessage = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

        const isBuyer = dispute.buyer_id.toString() === req.user._id.toString();
        const isSupplier = dispute.supplier_id.toString() === req.user._id.toString();
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isBuyer && !isSupplier && !isAdmin)
            return res.status(403).json({ message: 'Not authorized' });

        dispute.messages.push({
            sender_id: req.user._id,
            sender_role: isAdmin ? 'admin' : isBuyer ? 'buyer' : 'supplier',
            message
        });
        await dispute.save();
        res.json(dispute);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// @desc    Get all disputes (Admin)
// @route   GET /api/disputes/admin/all
// @access  Private/Admin
exports.getAllDisputesAdmin = async (req, res) => {
    try {
        const disputes = await Dispute.find({})
            .populate('order_id')
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ createdAt: -1 });
        res.json(disputes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Admin resolves dispute (optionally issue Stripe refund)
// @route   PUT /api/disputes/:id/resolve
// @access  Private/Admin
exports.resolveDispute = async (req, res) => {
    try {
        const { resolution, adminNote, issueRefund } = req.body;
        // resolution: 'resolved_buyer_favored' | 'resolved_supplier_favored' | 'closed'

        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

        dispute.status = resolution || 'closed';

        if (adminNote) {
            dispute.messages.push({
                sender_id: req.user._id,
                sender_role: 'admin',
                message: `[Admin Resolution] ${adminNote}`
            });
        }

        await dispute.save();

        const order = await Order.findById(dispute.order_id);

        if (order) {
            if (dispute.type === 'exchange') {
                order.exchange_details.status = resolution === 'resolved_buyer_favored' ? 'approved' : 'rejected';
                // Reset order payment status from disputed back to paid or exchange approved
                order.payment_status = 'paid';
            } else if (resolution === 'resolved_supplier_favored' || resolution === 'closed') {
                // Return payment status to paid if buyer's refund dispute is rejected
                order.payment_status = 'paid';
            }
            await order.save();
        }

        if (issueRefund && order && order.stripe_session_id && dispute.type !== 'exchange') {
            if (!stripe) {
                console.error('Stripe is not configured. Cannot process refund.');
            } else {
                try {
                    // Retrieve the PaymentIntent from the Stripe session
                    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
                    const paymentIntentId = session.payment_intent;

                    if (paymentIntentId) {
                        await stripe.refunds.create({ payment_intent: paymentIntentId });
                        order.payment_status = 'refunded';
                        await order.save();
                    }
                } catch (stripeErr) {
                    console.error('Stripe refund error:', stripeErr.message);
                    // Don't fail the whole call — just note it
                }
            }
        }

        // Return the populated dispute so frontend gets expected populated order_id structure
        const populatedDispute = await Dispute.findById(dispute._id)
            .populate('order_id')
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name');

        res.json({ message: 'Dispute resolved', dispute: populatedDispute });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update tracking numbers for return & exchange
// @route   PUT /api/disputes/:id/tracking
// @access  Private
exports.updateDisputeTracking = async (req, res) => {
    try {
        const { buyer_return_tracking_number, supplier_exchange_tracking_number } = req.body;
        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
        if (dispute.type !== 'exchange') return res.status(400).json({ message: 'Tracking is only for exchange type disputes' });

        const isBuyer = dispute.buyer_id.toString() === req.user._id.toString();
        const isSupplier = dispute.supplier_id.toString() === req.user._id.toString();

        if (isBuyer) {
            if (buyer_return_tracking_number !== undefined) {
                dispute.buyer_return_tracking_number = buyer_return_tracking_number;
            }
        } else if (isSupplier) {
            if (supplier_exchange_tracking_number !== undefined) {
                dispute.supplier_exchange_tracking_number = supplier_exchange_tracking_number;
                dispute.exchange_tracking_number = supplier_exchange_tracking_number;
            }
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await dispute.save();
        
        const populatedDispute = await Dispute.findById(dispute._id)
            .populate('order_id')
            .populate('buyer_id', 'first_name last_name email')
            .populate('supplier_id', 'first_name last_name company_name');

        res.json(populatedDispute);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
