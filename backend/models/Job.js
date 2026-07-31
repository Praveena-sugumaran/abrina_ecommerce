const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['email']
    },
    data: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'processing', 'completed', 'failed']
    },
    attempts: {
        type: Number,
        default: 0
    },
    error: {
        type: String
    },
    processAfter: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
