const TaxRule = require('../models/TaxRule');

// GET all tax rules
exports.getTaxRules = async (req, res) => {
    try {
        const rules = await TaxRule.find()
            .populate('category_ids', 'title')
            .populate('product_ids', 'name')
            .sort({ country_name: 1 });
        res.json(rules);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET single tax rule
exports.getTaxRule = async (req, res) => {
    try {
        const rule = await TaxRule.findById(req.params.id)
            .populate('category_ids', 'title')
            .populate('product_ids', 'name');
        if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
        res.json(rule);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST create tax rule
exports.createTaxRule = async (req, res) => {
    try {
        const rule = await TaxRule.create(req.body);
        res.status(201).json(rule);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT update tax rule
exports.updateTaxRule = async (req, res) => {
    try {
        const rule = await TaxRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
        res.json(rule);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE tax rule
exports.deleteTaxRule = async (req, res) => {
    try {
        await TaxRule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Tax rule deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST calculate tax for a given country + amount
exports.calculateTax = async (req, res) => {
    try {
        const { country_code, amount, category_id, product_id } = req.body;

        // Priority: product > category > global for the given country
        let rule = null;

        if (product_id) {
            rule = await TaxRule.findOne({ country_code, scope: 'product', product_ids: product_id, is_active: true });
        }
        if (!rule && category_id) {
            rule = await TaxRule.findOne({ country_code, scope: 'category', category_ids: category_id, is_active: true });
        }
        if (!rule) {
            rule = await TaxRule.findOne({ country_code, scope: 'global', is_active: true });
        }

        if (!rule) {
            return res.json({ tax_amount: 0, tax_rule: null });
        }

        const tax_amount = rule.type === 'percentage'
            ? (amount * rule.value) / 100
            : rule.value;

        res.json({ tax_amount: parseFloat(tax_amount.toFixed(2)), tax_rule: rule });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
