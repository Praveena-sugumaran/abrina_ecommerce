const mongoose = require('mongoose');

const SmsSettingSchema = new mongoose.Schema({
    accountSid: {
        type: String,
        default: ''
    },
    authToken: {
        type: String,
        default: ''
    },
    fromNumber: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('SmsSetting', SmsSettingSchema);
