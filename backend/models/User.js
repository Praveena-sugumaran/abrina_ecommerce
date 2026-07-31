const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        trim: true,
        default: ''
    },
    last_name: {
        type: String,
        trim: true,
        default: ''
    },
    country_code: {
        type: String,
        trim: true,
        default: ''
    },
    phone_number: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    roles: {
        type: [String],
        enum: ['buyer', 'seller', 'admin', 'delivery_partner', 'supplier'],
        default: ['buyer']
    },
    company_name: {
        type: String,
        trim: true,
        default: ''
    },
    business_type: {
        type: [String],
        default: []
    },
    address_line1: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    zip_code: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'profile_submitted', 'verified', 'rejected'],
        default: 'active'
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_phone_verified: {
        type: Boolean,
        default: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false
    },
    otp: {
        type: String,
        select: false
    },
    otp_expires: {
        type: Date,
        select: false
    },
    phone_otp: {
        type: String,
        select: false
    },
    phone_otp_expires: {
        type: Date,
        select: false
    },
    language: {
        type: String,
        default: 'English'
    },
    currency: {
        type: String,
        default: 'USD'
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    subscription_plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        default: null
    },
    subscription_start: {
        type: Date,
        default: null
    },
    subscription_end: {
        type: Date,
        default: null
    },
    response_rate: {
        type: Number,
        default: 0 // percentage
    },
    avg_response_time: {
        type: Number,
        default: 0 // in hours
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    logo: {
        type: String,
        default: ''
    },
    wallet_balance: {
        type: Number,
        default: 0
    },
    plan_active: {
        type: Boolean,
        default: false
    },
    subscription_status: {
        type: String,
        enum: ['none', 'active', 'expired', 'canceled'],
        default: 'none'
    },
    payout_methods: [{
        type: { type: String, default: 'bank' },
        bank_name: String,
        account_name: String,
        account_number: String,
        swift_code: String,
        ifsc_code: String,
        routing_number: String,
        details: { type: mongoose.Schema.Types.Mixed },
        is_default: { type: Boolean, default: false }
    }],
    ai_tasks_count: {
        type: Number,
        default: 0
    },
    ai_tasks_reset_date: {
        type: Date,
        default: Date.now
    },
    profile_image: {
        type: String,
        default: ''
    },
    provider: {
        type: String,
        enum: ['google', 'facebook', 'linkedin', 'local'],
        default: 'local'
    },
    lat: {
        type: Number,
        default: 0
    },
    lng: {
        type: Number,
        default: 0
    },
    loyalty_points: {
        type: Number,
        default: 0
    },
    coins: {
        type: Number,
        default: 0
    },
    last_check_in: {
        type: Date,
        default: null
    },
    referred_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    addresses: [{
        label: { type: String, default: 'Home' }, // 'Home', 'Work'
        first_name: String,
        last_name: String,
        address_line1: String,
        address_line2: String,
        city: String,
        state: String,
        zip_code: String,
        country: String,
        phone: String,
        is_default: { type: Boolean, default: false }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for single role (compat with existing code)
userSchema.virtual('role')
    .get(function() {
        return this.roles && this.roles.length > 0 ? this.roles[0] : 'customer';
    })
    .set(function(role) {
        this.roles = [role];
    });

// Encrypt password using bcrypt before save
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
