const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
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
    transaction_type: {
        type: String,
        enum: ['PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RETURN', 'CANCELLATION'],
        required: [true, 'Transaction type is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Transaction quantity is required']
    },
    before_qty: {
        type: Number,
        required: [true, 'Quantity before transaction is required']
    },
    after_qty: {
        type: Number,
        required: [true, 'Quantity after transaction is required']
    },
    reference_type: {
        type: String,
        enum: ['Order', 'StockTransfer', 'GoodsReceivedNote', 'InventoryAdjustment', 'Manual'],
        required: [true, 'Reference type is required']
    },
    reference_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
