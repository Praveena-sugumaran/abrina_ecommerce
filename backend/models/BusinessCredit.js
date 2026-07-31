const mongoose = require('mongoose');

const businessCreditSchema = new mongoose.Schema({
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    credit_limit: {
        type: Number,
        required: true,
        default: 0
    },
    available_credit: {
        type: Number,
        required: true,
        default: 0
    },
    net_days: {
        type: Number,
        default: 30 // E.g., Net-30
    },
    interest_rate_overdue: {
        type: Number,
        default: 1.5 // 1.5% monthly late interest penalty
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'rejected'],
        default: 'pending'
    },
    verification_documents: [{
        type: String
    }],
    used_credit: {
        type: Number,
        default: 0
    },
    requested_limit: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

businessCreditSchema.index({ buyer_id: 1 });
businessCreditSchema.index({ status: 1 });

module.exports = mongoose.model('BusinessCredit', businessCreditSchema);
