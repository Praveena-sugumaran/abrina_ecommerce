const mongoose = require('mongoose');

const adCampaignSchema = new mongoose.Schema({
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    campaign_name: {
        type: String,
        required: true,
        trim: true
    },
    budget_type: {
        type: String,
        enum: ['daily', 'lifetime'],
        default: 'daily'
    },
    budget_amount: {
        type: Number,
        required: true
    },
    spent_amount: {
        type: Number,
        default: 0
    },
    cpc_bid: {
        type: Number,
        default: 0
    },
    cpm_bid: {
        type: Number,
        default: 0
    },
    campaign_type: {
        type: String,
        enum: ['cpc', 'cpm'],
        default: 'cpc'
    },
    unbilled_spent: {
        type: Number,
        default: 0
    },
    keywords: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['active', 'paused', 'exhausted', 'completed'],
        default: 'active'
    },
    impressions: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Ensure unique active campaign per product for simplicity, or just indexing
adCampaignSchema.index({ supplier_id: 1 });
adCampaignSchema.index({ product_id: 1 });
adCampaignSchema.index({ status: 1 });
adCampaignSchema.index({ keywords: 1 });

module.exports = mongoose.model('AdCampaign', adCampaignSchema);
