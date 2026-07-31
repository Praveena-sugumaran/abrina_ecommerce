const BusinessCredit = require('../models/BusinessCredit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Buyer requests a Net-Terms credit limit
// @route   POST /api/credit/request
// @access  Private (Buyer)
exports.requestCredit = async (req, res) => {
    try {
        const { requested_amount, verification_documents } = req.body;

        if (!requested_amount || requested_amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid requested limit amount.' });
        }

        // Check if a credit profile already exists for this buyer
        let credit = await BusinessCredit.findOne({ buyer_id: req.user._id });
        if (credit) {
            if (credit.status === 'active') {
                if (credit.requested_limit > 0) {
                    return res.status(400).json({ message: 'You already have a pending limit increase request.' });
                }
                credit.requested_limit = requested_amount;
                if (verification_documents && verification_documents.length > 0) {
                    credit.verification_documents = verification_documents;
                }
                await credit.save();
                return res.status(200).json({ success: true, message: 'Credit limit increase request submitted successfully.', credit });
            } else if (credit.status === 'pending') {
                return res.status(400).json({ message: 'Your credit limit request is already pending approval.' });
            } else {
                // If suspended or rejected, allow resubmission
                credit.credit_limit = requested_amount;
                credit.requested_limit = 0;
                credit.verification_documents = verification_documents || [];
                credit.status = 'pending';
                await credit.save();
                return res.status(200).json({ success: true, credit });
            }
        }

        credit = new BusinessCredit({
            buyer_id: req.user._id,
            credit_limit: requested_amount,
            requested_limit: 0,
            available_credit: 0, // Not available until approved
            verification_documents: verification_documents || [],
            status: 'pending'
        });

        await credit.save();
        res.status(201).json({ success: true, credit });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get current buyer's credit limit information
// @route   GET /api/credit/my-limit
// @access  Private (Buyer)
exports.getMyCreditLimit = async (req, res) => {
    try {
        let credit = await BusinessCredit.findOne({ buyer_id: req.user._id });
        if (!credit) {
            // Return empty credit format if none exists yet
            return res.json({ credit_limit: 0, available_credit: 0, used_credit: 0, status: 'none' });
        }
        res.json(credit);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all credit requests for admin review
// @route   GET /api/credit/admin/requests
// @access  Private (Admin)
exports.getAllCreditRequestsAdmin = async (req, res) => {
    try {
        const requests = await BusinessCredit.find({})
            .populate('buyer_id', 'first_name last_name email company_name business_type country_code')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Admin approve/reject or edit credit limit for a buyer
// @route   PUT /api/credit/admin/approve/:id
// @access  Private (Admin)
exports.updateCreditLimitAdmin = async (req, res) => {
    try {
        const credit = await BusinessCredit.findById(req.params.id);
        if (!credit) {
            return res.status(404).json({ message: 'Credit record not found.' });
        }

        const { credit_limit, status, net_days, interest_rate_overdue } = req.body;

        if (credit_limit !== undefined) {
            // Recalculate available credit based on new limit and currently used credit
            credit.credit_limit = credit_limit;
            credit.available_credit = Math.max(0, credit_limit - credit.used_credit);
            credit.requested_limit = 0; // Reset requested limit on admin update/approval
        }

        if (status) {
            credit.status = status;
            if (status === 'active' && credit.available_credit === 0 && credit.used_credit === 0) {
                // First approval
                credit.available_credit = credit.credit_limit;
            }
        }
        
        if (net_days !== undefined) credit.net_days = net_days;
        if (interest_rate_overdue !== undefined) credit.interest_rate_overdue = interest_rate_overdue;

        await credit.save();

        // Send notification to buyer
        try {
            const { sendNotification } = require('../services/notificationService');
            // Lazy load io
            const { getIO } = require('../socket/socketHandler');
            await sendNotification(
                getIO(),
                credit.buyer_id,
                'Business Credit Update',
                `Your Net-Terms credit line request has been updated. Status: ${credit.status.toUpperCase()}. Limit: $${credit.credit_limit}.`,
                'buyer',
                '/dashboard?tab=credit'
            );
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        res.json({ success: true, credit });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Repay credit limit using wallet balance
// @route   POST /api/credit/repay
// @access  Private (Buyer)
exports.repayCredit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please specify a valid positive repayment amount.' });
        }

        const credit = await BusinessCredit.findOne({ buyer_id: req.user._id });
        if (!credit || credit.status !== 'active') {
            return res.status(400).json({ message: 'No active credit limit found for your account.' });
        }

        if (amount > credit.used_credit) {
            return res.status(400).json({ message: `Repayment amount exceeds outstanding balance of $${credit.used_credit}.` });
        }

        const buyer = await User.findById(req.user._id);
        if (buyer.wallet_balance < amount) {
            return res.status(400).json({ message: `Insufficient wallet balance. Outstanding balance: $${credit.used_credit}. Your Wallet Balance: $${buyer.wallet_balance}.` });
        }

        // Process repayment
        buyer.wallet_balance = parseFloat((buyer.wallet_balance - amount).toFixed(2));
        await buyer.save();

        credit.used_credit = parseFloat((credit.used_credit - amount).toFixed(2));
        credit.available_credit = parseFloat((credit.available_credit + amount).toFixed(2));
        await credit.save();

        // Create transaction history
        await Transaction.create({
            user_id: buyer._id,
            type: 'payment',
            amount: amount,
            status: 'completed',
            description: `Repayment of Net-Terms business credit line. Restored credit available by $${amount}.`
        });

        res.json({ success: true, credit, wallet_balance: buyer.wallet_balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
