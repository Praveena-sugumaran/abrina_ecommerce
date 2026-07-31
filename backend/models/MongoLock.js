const mongoose = require('mongoose');

const mongoLockSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    acquiredAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    workerId: {
        type: String,
        required: true
    }
});

// Add an index that automatically removes expired locks
mongoLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MongoLock', mongoLockSchema);
