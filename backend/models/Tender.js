const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema(
    {
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer reference is required'],
            index: true
        },
        title: {
            type: String,
            required: [true, 'Tender title is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category reference is required']
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        unit: {
            type: String,
            required: [true, 'Unit is required'],
            trim: true
        },
        start_price: {
            type: Number,
            required: [true, 'Start price is required'],
            min: [0, 'Start price cannot be negative']
        },
        current_lowest_bid: {
            type: Number
        },
        min_decrement: {
            type: Number,
            default: 10,
            min: [0, 'Min decrement cannot be negative']
        },
        end_time: {
            type: Date,
            required: [true, 'End time is required']
        },
        type: {
            type: String,
            enum: ['public', 'private'],
            default: 'public'
        },
        invited_suppliers: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            default: []
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'closed', 'cancelled', 'ended'],
            default: 'active',
            index: true
        }
    },
    {
        timestamps: true
    }
);

const Tender = mongoose.model('Tender', tenderSchema);

module.exports = Tender;
