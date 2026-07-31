const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product ID is required']
    },
    quantity_received: {
        type: Number,
        required: [true, 'Received quantity is required'],
        min: [1, 'Quantity must be at least 1']
    }
});

const grnSchema = new mongoose.Schema({
    grn_number: {
        type: String,
        required: [true, 'GRN number is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    warehouse_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: [true, 'Warehouse ID is required']
    },
    purchase_order_reference: {
        type: String,
        trim: true
    },
    items: [grnItemSchema],
    received_date: {
        type: Date,
        default: Date.now
    },
    received_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: [true, 'Receiver ID is required']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GoodsReceivedNote', grnSchema);
