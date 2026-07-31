const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer reference is required'],
            index: true
        },
        title: {
            type: String,
            required: [true, 'RFQ title is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required']
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        unit: {
            type: String,
            required: [true, 'Unit of measurement is required'],
            trim: true
        },
        target_price: {
            type: Number,
            min: [0, 'Target price cannot be negative']
        },
        currency: {
            type: String,
            default: 'USD',
            trim: true
        },
        expiry_date: {
            type: Date
        },
        shipping_details: {
            type: String,
            trim: true
        },
        attachments: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ['active', 'closed', 'completed'],
            default: 'active',
            index: true
        },
        isPromoted: {
            type: Boolean,
            default: false
        },
        lead_price: {
            type: Number,
            default: 5.00
        },
        purchased_suppliers: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            default: []
        }
    },
    {
        timestamps: true
    }
);

const RFQ = mongoose.model('RFQ', rfqSchema);

module.exports = RFQ;
