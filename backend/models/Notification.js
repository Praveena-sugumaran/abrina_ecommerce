const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['buyer', 'supplier', 'admin'],
        default: 'buyer'
    },
    type: {
        type: String,
        enum: ['chat', 'order', 'system', 'admin'],
        default: 'system'
    },
    link: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
