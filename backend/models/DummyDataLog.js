const mongoose = require('mongoose');

const dummyDataLogSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['IMPORT', 'CLEANUP', 'RESET'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    triggerType: {
        type: String,
        enum: ['manual', 'cron', 'cli', 'url_trigger'],
        required: true
    },
    importVersion: {
        type: String,
        default: 'v1.0.0'
    },
    serverHostname: {
        type: String,
        default: ''
    },
    memoryUsage: {
        heapUsedMB: Number,
        heapTotalMB: Number
    },
    stats: {
        users: { type: Number, default: 0 },
        products: { type: Number, default: 0 },
        categories: { type: Number, default: 0 },
        orders: { type: Number, default: 0 },
        transactions: { type: Number, default: 0 },
        companies: { type: Number, default: 0 },
        reviews: { type: Number, default: 0 },
        disputes: { type: Number, default: 0 }
    },
    logs: {
        type: [String],
        default: []
    },
    error: {
        type: String,
        default: null
    },
    durationMs: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DummyDataLog', dummyDataLogSchema);
