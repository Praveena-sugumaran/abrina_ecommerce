const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    client_id: { type: String, default: '' },
    client_secret: { type: String, default: '' },
    app_id: { type: String, default: '' },    // Facebook uses app_id
    app_secret: { type: String, default: '' }, // Facebook uses app_secret
});

const socialLoginSchema = new mongoose.Schema({
    google: { type: providerSchema, default: () => ({}) },
    facebook: { type: providerSchema, default: () => ({}) },
    linkedin: { type: providerSchema, default: () => ({}) },
}, { timestamps: true });

module.exports = mongoose.model('SocialLogin', socialLoginSchema);
