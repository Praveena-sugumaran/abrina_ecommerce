const mongoose = require('mongoose');

const giftCardTransactionSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    type: { type: String, enum: ['redeem', 'deduct', 'refund'], required: true },
    description: { type: String, default: '' },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    date: { type: Date, default: Date.now }
});

const GiftCardSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    initial_value: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    expiresAt: {
        type: Date
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    transactions: [giftCardTransactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('GiftCard', GiftCardSchema);
