const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    rfq_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ' },
    quote_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    customization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCustomizationRequest' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String }
});

const orderSchema = new mongoose.Schema({
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order_items: [orderItemSchema],
    shipping_fee: {
        type: Number,
        default: 0.0
    },
    discount_amount: {
        type: Number,
        default: 0.0
    },
    redeemed_points: {
        type: Number,
        default: 0
    },
    points_discount: {
        type: Number,
        default: 0.0
    },
    coupon_code: {
        type: String,
        default: ''
    },
    referral_code: {
        type: String,
        default: ''
    },
    gift_card_code: {
        type: String,
        default: ''
    },
    gift_card_discount: {
        type: Number,
        default: 0.0
    },
    gift_card_deducted: {
        type: Boolean,
        default: false
    },
    total_amount: {
        type: Number,
        required: true,
        default: 0.0
    },
    tax_amount: {
        type: Number,
        default: 0.0
    },
    duty_fee: {
        type: Number,
        default: 0.0
    },
    tax_info: {
        name: String,
        tax_type: String, // percentage or fixed
        value: Number,
        country_code: String
    },
    service_fee: {
        type: Number,
        default: 0.0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    payment_status: {
        type: String,
        enum: ['unpaid', 'partially_paid', 'paid', 'refunded', 'disputed'],
        default: 'unpaid'
    },
    is_split_payment: { type: Boolean, default: false },
    deposit_amount: { type: Number, default: 0.0 },
    balance_amount: { type: Number, default: 0.0 },
    deposit_paid: { type: Boolean, default: false },
    balance_paid: { type: Boolean, default: false },
    deposit_stripe_session_id: { type: String },
    balance_stripe_session_id: { type: String },
    deposit_razorpay_order_id: { type: String },
    balance_razorpay_order_id: { type: String },
    payment_method: {
        type: String,
        default: 'Stripe'
    },
    stripe_session_id: {
        type: String
    },
    paypal_order_id: {
        type: String
    },
    razorpay_order_id: {
        type: String
    },
    razorpay_payment_id: {
        type: String
    },
    payment_provider: {
        type: String,
        default: 'stripe'
    },
    is_dropship: {
        type: Boolean,
        default: false
    },
    dropship_note: {
        type: String,
        default: ''
    },
    tracking_number: {
        type: String,
        default: ''
    },
    shipping_company: {
        type: String,
        default: ''
    },
    estimated_delivery_date: {
        type: Date
    },
    warehouse_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        index: true
    },
    shipping_address: {
        fullName: String,
        phone: String,
        addressLine: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    is_emi: {
        type: Boolean,
        default: false
    },
    emi_plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmiPlan',
        default: null
    },
    emi_schedule_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmiSchedule',
        default: null
    },
    gift_wrap: {
        selected: { type: Boolean, default: false },
        fee: { type: Number, default: 0.0 }
    },
    gift_message: {
        type: String,
        default: ''
    },
    exchange_details: {
        is_exchanged: { type: Boolean, default: false },
        reason: { type: String, default: '' },
        status: { type: String, enum: ['', 'pending', 'approved', 'rejected', 'shipped', 'delivered'], default: '' },
        carrier: { type: String, default: '' },
        tracking_number: { type: String, default: '' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
