const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema({
    provider: { type: String, default: 'stripe' },
    enable: { type: Boolean, default: false },
    live_mode: { type: Boolean, default: false },
    public_key: { type: String, default: '' },
    secret_key: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PaymentSetting', paymentSettingSchema);
