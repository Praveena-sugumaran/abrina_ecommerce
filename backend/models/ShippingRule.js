const mongoose = require('mongoose');

const shippingRuleSchema = new mongoose.Schema({
    country_code: { type: String, required: true, uppercase: true, index: true },
    country_name: { type: String, required: true },
    base_cost: { type: Number, required: true, default: 0 },
    cost_per_kg: { type: Number, default: 0 },
    estimated_days_min: { type: Number, default: 3 },
    estimated_days_max: { type: Number, default: 15 },
    carrier: { type: String, default: 'Standard Global' },
    is_active: { type: Boolean, default: true },
    type: { type: String, enum: ['country', 'distance'], default: 'country' },
    min_distance: { type: Number, default: 0 },
    max_distance: { type: Number, default: 99999 },
    cost_per_km: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ShippingRule', shippingRuleSchema);
