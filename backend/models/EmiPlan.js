const mongoose = require('mongoose');

const emiPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'EMI Plan name is required'],
        trim: true
    },
    installments: {
        type: Number,
        required: [true, 'Number of installments is required'],
        min: [1, 'Installments must be at least 1']
    },
    interest_rate: {
        type: Number,
        required: [true, 'Interest rate is required'],
        default: 0,
        min: [0, 'Interest rate cannot be negative']
    },
    processing_fee: {
        type: Number,
        default: 0,
        min: [0, 'Processing fee cannot be negative']
    },
    min_order_amount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount cannot be negative']
    },
    max_order_amount: {
        type: Number,
        default: 1000000,
        min: [0, 'Maximum order amount cannot be negative']
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('EmiPlan', emiPlanSchema);
