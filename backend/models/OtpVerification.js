const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otp_expires: { type: Date, required: true },
    is_verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour TTL
});

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
