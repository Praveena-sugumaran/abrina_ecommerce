const mongoose = require('mongoose');

const EmailCampaignSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    recipientsCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'sent'],
        default: 'sent'
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('EmailCampaign', EmailCampaignSchema);
