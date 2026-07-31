const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Warehouse name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Warehouse code is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    address: {
        type: String,
        required: [true, 'Warehouse address is required'],
        trim: true
    },
    warehouse_type: {
        type: String,
        enum: ['Main', 'Regional', 'Retail', 'Dropship', 'Returns'],
        default: 'Main'
    },
    low_stock_threshold: {
        type: Number,
        default: 10,
        min: 0
    },
    contact_email: {
        type: String,
        required: [true, 'Contact email is required'],
        trim: true,
        lowercase: true
    },
    contact_phone: {
        type: String,
        required: [true, 'Contact phone is required'],
        trim: true
    },
    assigned_managers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
