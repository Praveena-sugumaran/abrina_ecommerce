const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema(
    {
        rfq: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RFQ',
            required: [true, 'RFQ reference is required'],
            index: true
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Supplier reference is required'],
            index: true
        },
        price_offered: {
            type: Number,
            required: [true, 'Offered price is required'],
            min: [0, 'Price offered cannot be negative']
        },
        currency: {
            type: String,
            default: 'USD',
            trim: true
        },
        valid_until: {
            type: Date
        },
        note: {
            type: String,
            trim: true
        },
        estimated_delivery_days: {
            type: Number,
            min: [1, 'Estimated delivery days must be at least 1']
        },
        last_offered_by: {
            type: String,
            enum: ['buyer', 'supplier'],
            default: 'supplier'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'negotiating'],
            default: 'pending',
            index: true
        }
    },
    {
        timestamps: true
    }
);

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
