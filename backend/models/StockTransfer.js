const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
    from_warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: [true, 'Source warehouse is required']
    },
    to_warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: [true, 'Destination warehouse is required']
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending Approval', 'Approved', 'In Transit', 'Received', 'Cancelled'],
        default: 'Draft'
    },
    transfer_date: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Single-field indexes for efficient querying of warehouse transfers
stockTransferSchema.index({ from_warehouse: 1 });
stockTransferSchema.index({ to_warehouse: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
