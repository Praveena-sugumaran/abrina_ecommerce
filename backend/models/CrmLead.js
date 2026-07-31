const mongoose = require('mongoose');

const crmLeadSchema = new mongoose.Schema({
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'],
        default: 'New',
        index: true
    },
    notes: {
        type: String,
        default: ''
    },
    last_contact_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Prevent duplicate supplier-buyer pairings
crmLeadSchema.index({ supplier_id: 1, buyer_id: 1 }, { unique: true });

module.exports = mongoose.model('CrmLead', crmLeadSchema);
