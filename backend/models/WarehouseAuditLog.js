const mongoose = require('mongoose');

const warehouseAuditLogSchema = new mongoose.Schema({
    warehouse_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: [true, 'Warehouse ID is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required']
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: [true, 'User ID is required']
    },
    old_data: {
        type: mongoose.Schema.Types.Map,
        of: mongoose.Schema.Types.Mixed
    },
    new_data: {
        type: mongoose.Schema.Types.Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('WarehouseAuditLog', warehouseAuditLogSchema);
