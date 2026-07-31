const mongoose = require('mongoose');

const inventoryAdjustmentSchema = new mongoose.Schema({
    warehouse_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: [true, 'Warehouse ID is required']
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product ID is required']
    },
    adjustment_type: {
        type: String,
        enum: ['ADD', 'SUBTRACT'],
        required: [true, 'Adjustment type is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Adjustment quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    reason: {
        type: String,
        enum: ['DAMAGE', 'LOST', 'FOUND', 'CORRECTION', 'AUDIT'],
        required: [true, 'Adjustment reason is required']
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: [true, 'User ID is required']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);
