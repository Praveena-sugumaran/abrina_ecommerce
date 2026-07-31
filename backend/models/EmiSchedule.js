const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true
    },
    due_date: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'waived'],
        default: 'pending'
    },
    paid_at: {
        type: Date,
        default: null
    },
    payment_intent_id: {
        type: String,
        default: null
    },
    gateway: {
        type: String,
        default: null
    }
});

const emiScheduleSchema = new mongoose.Schema({
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    emi_plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmiPlan',
        required: true
    },
    total_amount: {
        type: Number,
        required: true
    },
    principal: {
        type: Number,
        required: true
    },
    interest_total: {
        type: Number,
        required: true
    },
    processing_fee: {
        type: Number,
        required: true
    },
    installments: [installmentSchema],
    status: {
        type: String,
        enum: ['active', 'completed', 'defaulted', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('EmiSchedule', emiScheduleSchema);
