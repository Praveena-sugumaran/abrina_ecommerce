const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g., 'LOGIN', 'DELETE_PRODUCT', 'UPDATE_SETTINGS'
    module: { type: String, required: true }, // e.g., 'AUTH', 'PRODUCT', 'ADMIN'
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    details: { type: Object },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
