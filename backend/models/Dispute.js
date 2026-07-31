const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_role: { type: String, enum: ['buyer', 'supplier', 'admin'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const disputeSchema = new mongoose.Schema({
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true // Usually one dispute per order max
    },
    reason: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['refund', 'exchange'],
        default: 'refund'
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'under_review', 'resolved_buyer_favored', 'resolved_supplier_favored', 'closed'],
        default: 'open'
    },
    exchange_tracking_number: {
        type: String,
        default: ''
    },
    replacement_details: {
        type: String,
        default: ''
    },
    buyer_return_tracking_number: {
        type: String,
        default: ''
    },
    supplier_exchange_tracking_number: {
        type: String,
        default: ''
    },
    messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
