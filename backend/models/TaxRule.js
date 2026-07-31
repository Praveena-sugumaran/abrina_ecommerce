const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },          // e.g. "EU VAT", "India GST"
    country_code: { type: String, required: true, trim: true },  // ISO 2-letter, e.g. "IN", "DE", "GB"
    country_name: { type: String, required: true, trim: true },  // Display name

    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: { type: Number, required: true },  // % or fixed amount in USD

    // Scope: applies globally, to specific categories, or specific products
    scope: {
        type: String,
        enum: ['global', 'category', 'product'],
        default: 'global'
    },
    category_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    product_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    is_active: { type: Boolean, default: true },
    description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('TaxRule', taxRuleSchema);
