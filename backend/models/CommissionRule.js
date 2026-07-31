const mongoose = require('mongoose');

const commissionRuleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Percentage', 'Fixed'], default: 'Percentage' },
    value: { type: Number, required: true },
    appliesTo: { type: String, default: 'All Products' }, // 'All Products' or Category Name
    description: { type: String },
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('CommissionRule', commissionRuleSchema);
