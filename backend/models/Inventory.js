const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
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
    quantity: {
        type: Number,
        default: 0,
        min: [0, 'Quantity cannot be negative']
    },
    reserved_quantity: {
        type: Number,
        default: 0,
        min: [0, 'Reserved quantity cannot be negative']
    },
    damaged: {
        type: Number,
        default: 0,
        min: [0, 'Damaged quantity cannot be negative']
    },
    incoming: {
        type: Number,
        default: 0,
        min: [0, 'Incoming quantity cannot be negative']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate product-warehouse mappings
inventorySchema.index({ warehouse_id: 1, product_id: 1 }, { unique: true });

// Virtual field for available_quantity = quantity - reserved_quantity
inventorySchema.virtual('available_quantity').get(function() {
    return (this.quantity || 0) - (this.reserved_quantity || 0);
});

module.exports = mongoose.model('Inventory', inventorySchema);
