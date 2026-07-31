const PaymentSetting = require('../models/PaymentSetting');

// @desc  Get payment settings (keys masked for non-superadmin)
// @route GET /api/admin/payment-settings
exports.getPaymentSettings = async (req, res) => {
    try {
        const provider = req.query.provider || 'stripe';
        let setting = await PaymentSetting.findOne({ provider });
        if (!setting) {
            setting = await PaymentSetting.create({ provider });
        }
        // Mask secret key — only show last 4 chars
        const masked = setting.toObject();
        if (masked.secret_key && masked.secret_key.length > 4) {
            masked.secret_key_masked = '••••••••' + masked.secret_key.slice(-4);
        } else {
            masked.secret_key_masked = '';
        }
        res.json(masked);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Update payment settings
// @route PUT /api/admin/payment-settings
exports.updatePaymentSettings = async (req, res) => {
    try {
        const { enable, live_mode, public_key, secret_key, provider } = req.body;
        const targetProvider = provider || 'stripe';
        let setting = await PaymentSetting.findOne({ provider: targetProvider });
        if (!setting) setting = new PaymentSetting({ provider: targetProvider });

        if (typeof enable !== 'undefined') setting.enable = enable;
        if (typeof live_mode !== 'undefined') setting.live_mode = live_mode;
        if (public_key !== undefined) setting.public_key = public_key;
        if (secret_key !== undefined && secret_key !== '') setting.secret_key = secret_key;

        await setting.save();
        res.json({ message: 'Payment settings updated successfully', enable: setting.enable, live_mode: setting.live_mode });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get enabled payment methods for checkout (public)
// @route GET /api/payment-methods/public
exports.getPaymentMethodsPublic = async (req, res) => {
    try {
        const methods = await PaymentSetting.find({ enable: true }).select('provider public_key live_mode');
        res.json(methods);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
