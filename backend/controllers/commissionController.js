const CommissionRule = require('../models/CommissionRule');

// @desc    Get all commission rules
// @route   GET /api/commissions
// @access  Private/Admin
exports.getCommissions = async (req, res) => {
    try {
        const rules = await CommissionRule.find().sort({ createdAt: -1 });
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a commission rule
// @route   POST /api/commissions
// @access  Private/Admin
exports.createCommission = async (req, res) => {
    try {
        const rule = await CommissionRule.create(req.body);
        res.status(201).json(rule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a commission rule
// @route   PUT /api/commissions/:id
// @access  Private/Admin
exports.updateCommission = async (req, res) => {
    try {
        const rule = await CommissionRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });
        res.json(rule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a commission rule
// @route   DELETE /api/commissions/:id
// @access  Private/Admin
exports.deleteCommission = async (req, res) => {
    try {
        const rule = await CommissionRule.findByIdAndDelete(req.params.id);
        if (!rule) return res.status(404).json({ message: 'Rule not found' });
        res.json({ message: 'Rule removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Calculate commission for an amount (Public)
// @route   POST /api/commissions/calculate
// @access  Public (softProtect)
exports.calculateCommission = async (req, res) => {
    try {
        const { amount, category } = req.body;
        
        let rule = null;
        if (category) {
            rule = await CommissionRule.findOne({ appliesTo: category, is_active: true });
        }
        
        if (!rule) {
            rule = await CommissionRule.findOne({ appliesTo: 'All Products', is_active: true });
        }

        let commission = 0;
        let ruleName = 'Default Service Fee (3%)';

        if (!rule) {
            commission = parseFloat((amount * 0.03).toFixed(2));
        } else {
            commission = rule.type === 'Percentage' ? (amount * rule.value) / 100 : rule.value;
            ruleName = rule.name;
        }

        // Check first-time platform fee free setting
        const SiteSetting = require('../models/SiteSetting');
        const siteSettings = await SiteSetting.findOne();
        if (siteSettings?.first_time_platform_fee_free && req.user) {
            const Order = require('../models/Order');
            const hasExistingOrders = await Order.exists({
                buyer_id: req.user._id,
                status: { $ne: 'cancelled' }
            });
            if (!hasExistingOrders) {
                commission = 0;
                ruleName = 'First Order — Platform Fee Waived 🎉';
            }
        }

        res.json({
            commission_amount: parseFloat(commission.toFixed(2)),
            rule_name: ruleName,
            rule_type: rule?.type,
            rule_value: rule?.value
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
