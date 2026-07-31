const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    type: {
        type: String,
        enum: ['payment', 'withdraw', 'credit', 'debit', 'commission'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'approved', 'declined', 'failed'],
        default: 'pending'
    },
    description: String,
    bank_details: {
        bank_name: String,
        account_name: String,
        account_number: String,
        swift_code: String,
        routing_number: String
    },
    payout_method_type: {
        type: String,
        default: 'bank'
    },
    payout_details: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
