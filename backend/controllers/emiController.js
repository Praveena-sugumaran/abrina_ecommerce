const EmiPlan = require('../models/EmiPlan');
const EmiSchedule = require('../models/EmiSchedule');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Create EMI Plan (Admin only)
exports.createEmiPlan = async (req, res) => {
    try {
        const { name, installments, interest_rate, processing_fee, min_order_amount, max_order_amount, is_active } = req.body;
        const plan = new EmiPlan({
            name,
            installments,
            interest_rate,
            processing_fee,
            min_order_amount,
            max_order_amount,
            is_active
        });
        await plan.save();
        res.status(201).json({ success: true, data: plan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all EMI Plans
exports.getEmiPlans = async (req, res) => {
    try {
        const count = await EmiPlan.countDocuments();
        if (count === 0) {
            await EmiPlan.create([
                { name: '3-Month No-Cost EMI', installments: 3, interest_rate: 0, processing_fee: 0, min_order_amount: 100, max_order_amount: 100000, is_active: true },
                { name: '6-Month Easy EMI', installments: 6, interest_rate: 2, processing_fee: 10, min_order_amount: 300, max_order_amount: 100000, is_active: true },
                { name: '12-Month Standard EMI', installments: 12, interest_rate: 5, processing_fee: 25, min_order_amount: 500, max_order_amount: 100000, is_active: true }
            ]);
        }

        const isAdmin = req.user && (req.user.roles?.includes('admin') || req.user.role === 'admin');
        const query = isAdmin ? {} : { is_active: true };
        const plans = await EmiPlan.find(query).sort('installments');
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update EMI Plan (Admin only)
exports.updateEmiPlan = async (req, res) => {
    try {
        const plan = await EmiPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'EMI Plan not found' });
        }
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete EMI Plan (Admin only)
exports.deleteEmiPlan = async (req, res) => {
    try {
        const plan = await EmiPlan.findByIdAndDelete(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'EMI Plan not found' });
        }
        res.status(200).json({ success: true, message: 'EMI Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Calculate EMI Options for checkout Cart
exports.calculateEmi = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid checkout amount' });
        }

        const plans = await EmiPlan.find({
            is_active: true,
            min_order_amount: { $lte: amount },
            max_order_amount: { $gte: amount }
        });

        const calculation = plans.map(plan => {
            const processing_fee = plan.processing_fee || 0;
            // Amortization math: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
            // where R is interest rate per month, N is number of installments, P is principal.
            const P = amount;
            const R = (plan.interest_rate / 100); // monthly interest rate
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
                plan_id: plan._id,
                name: plan.name,
                installments: plan.installments,
                interest_rate: plan.interest_rate,
                processing_fee,
                monthly_installment: Math.round(monthlyPayment * 100) / 100,
                interest_total: Math.round(interest_total * 100) / 100,
                total_payable: Math.round(total_payable * 100) / 100
            };
        });

        res.status(200).json({ success: true, data: calculation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get My EMI Schedules (Buyer dashboard)
exports.getMyEmiSchedules = async (req, res) => {
    try {
        const schedules = await EmiSchedule.find({ buyer_id: req.user._id })
            .populate('emi_plan_id')
            .populate('order_id')
            .sort('-createdAt');
        res.status(200).json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Admin Emi Schedules
exports.getAdminEmiSchedules = async (req, res) => {
    try {
        const schedules = await EmiSchedule.find({})
            .populate('emi_plan_id')
            .populate('order_id')
            .populate('buyer_id', 'first_name last_name email')
            .sort('-createdAt');
        res.status(200).json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single EMI Schedule details
exports.getEmiScheduleById = async (req, res) => {
    try {
        const schedule = await EmiSchedule.findById(req.params.id)
            .populate('emi_plan_id')
            .populate({
                path: 'order_id',
                populate: { path: 'supplier_id', select: 'company_name' }
            });
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'EMI Schedule not found' });
        }
        // Verify owner or admin
        const isAdmin = req.user && (req.user.roles?.includes('admin') || req.user.role === 'admin');
        if (schedule.buyer_id.toString() !== req.user._id.toString() && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Pay Installment
exports.payInstallment = async (req, res) => {
    try {
        const { scheduleId, installmentNum } = req.params;
        const { paymentMethod } = req.body; // 'wallet' or 'stripe' or 'razorpay'

        const schedule = await EmiSchedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'EMI Schedule not found' });
        }

        if (schedule.buyer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const instIndex = schedule.installments.findIndex(i => i.number === parseInt(installmentNum));
        if (instIndex === -1) {
            return res.status(400).json({ success: false, message: 'Installment number not found' });
        }

        const installment = schedule.installments[instIndex];
        if (installment.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Installment already paid' });
        }

        const amountToPay = installment.amount;

        if (paymentMethod === 'wallet') {
            const user = await User.findById(req.user._id);
            if (user.wallet_balance < amountToPay) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }

            // Deduct from wallet
            user.wallet_balance -= amountToPay;
            await user.save();

            // Record transaction
            const transaction = new Transaction({
                user_id: req.user._id,
                order_id: schedule.order_id,
                type: 'payment',
                amount: amountToPay,
                currency: 'USD',
                status: 'completed',
                description: `Paid EMI installment #${installmentNum} for schedule: ${scheduleId}`
            });
            await transaction.save();
        } else {
            // Mock other payment gateways success
            const transaction = new Transaction({
                user_id: req.user._id,
                order_id: schedule.order_id,
                type: 'payment',
                amount: amountToPay,
                currency: 'USD',
                status: 'completed',
                description: `Paid EMI installment #${installmentNum} via card for schedule: ${scheduleId}`
            });
            await transaction.save();
        }

        // Update installment status
        installment.status = 'paid';
        installment.paid_at = new Date();
        installment.gateway = paymentMethod || 'Stripe';
        installment.payment_intent_id = 'mock_intent_' + Math.random().toString(36).substr(2, 9);

        // Check if all installments are paid
        const allPaid = schedule.installments.every(i => i.status === 'paid');
        if (allPaid) {
            schedule.status = 'completed';

            // Update order payment status
            const order = await Order.findById(schedule.order_id);
            if (order) {
                order.payment_status = 'paid';
                await order.save();
            }
        } else {
            // Update order status to partially_paid
            const order = await Order.findById(schedule.order_id);
            if (order && order.payment_status !== 'partially_paid') {
                order.payment_status = 'partially_paid';
                await order.save();
            }
        }

        await schedule.save();
        res.status(200).json({ success: true, message: `Installment #${installmentNum} paid successfully`, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
