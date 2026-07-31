const mongoose = require('mongoose');

const riskAlertSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        enum: ['failed_login', 'suspicious_order', 'bulk_rfq', 'high_value_transaction'],
        required: true
    },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('RiskAlert', riskAlertSchema);
