const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'user_type'
    },
    user_type: {
        type: String,
        required: true,
        enum: ['User', 'AdminUser'],
        default: 'User'
    },
    ip_address: {
        type: String,
        default: 'Unknown'
    },
    user_agent: {
        type: String,
        default: ''
    },
    device_type: {
        type: String,
        default: 'Desktop'
    },
    device_name: {
        type: String,
        default: ''
    },
    os: {
        type: String,
        default: 'Unknown'
    },
    browser: {
        type: String,
        default: 'Unknown'
    },
    location: {
        type: String,
        default: ''
    },
    is_active: {
        type: Boolean,
        default: true
    },
    expires_at: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    last_active: {
        type: Date,
        default: Date.now
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Ensure indexes for fast queries
UserSessionSchema.index({ user_id: 1 });
UserSessionSchema.index({ created_at: 1 });
UserSessionSchema.index({ is_active: 1, expires_at: 1 });
UserSessionSchema.index({ device_type: 1 });

module.exports = mongoose.model('UserSession', UserSessionSchema);
