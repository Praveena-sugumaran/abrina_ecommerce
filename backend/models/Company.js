const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    company_name: {
        type: String,
        required: true,
        trim: true
    },
    business_type: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    website: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    phone_country: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    mobile: {
        type: String,
        trim: true,
        default: ''
    },
    mobile_country: {
        type: String,
        trim: true,
        default: ''
    },
    fax: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    tax_id: {
        type: String,
        trim: true,
        default: ''
    },
    id_proof: {
        type: String,
        trim: true,
        default: ''
    },
    logo: {
        type: String,
        trim: true,
        default: ''
    },
    banner_image: {
        type: String,
        trim: true,
        default: ''
    },
    video: {
        type: String,
        trim: true,
        default: ''
    },
    certifications: {
        type: [String],
        default: []
    },
    document: {
        type: String,
        trim: true,
        default: '' // Make it optional since buyers may not require it initially like suppliers
    },
    verification_status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    rejection_reason: {
        type: String,
        trim: true,
        default: ''
    },
    staff_size: {
        type: String,
        trim: true,
        default: ''
    },
    factory_area: {
        type: String,
        trim: true,
        default: ''
    },
    annual_revenue: {
        type: String,
        trim: true,
        default: ''
    },
    capabilities: {
        type: [String],
        default: []
    },
    factory_audits: [{
        audit_date: Date,
        auditor_name: String,
        audit_report_url: String,
        status: {
            type: String,
            enum: ['passed', 'failed', 'pending'],
            default: 'pending'
        }
    }],
    lat: {
        type: Number,
        default: 0
    },
    lng: {
        type: Number,
        default: 0
    },
    auto_reply_enabled: {
        type: Boolean,
        default: false
    },
    auto_reply_text: {
        type: String,
        default: 'Thank you for your message. We will get back to you shortly!'
    },
    split_payment_enabled: {
        type: Boolean,
        default: false
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
