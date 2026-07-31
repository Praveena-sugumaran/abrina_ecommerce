const mongoose = require('mongoose');

const variantCombinationSchema = new mongoose.Schema({
    sku: { type: String, trim: true },
    attributes: [{
        name: { type: String, required: true, trim: true }, // e.g. "Color"
        value: { type: String, required: true, trim: true } // e.g. "Red"
    }],
    price: { type: Number, default: null }, // Price override (if different from base price)
    stock: { type: Number, default: 0 },
    image: { type: String, default: '' },
    images: [{ type: String }]
});

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            index: true
        },
        slug: {
            type: String,
            lowercase: true,
            index: true
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true
        },
        category_id: {
            type: String,
            index: true
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        sku: {
            type: String,
            trim: true,
            index: true
        },
        currency: {
            type: String,
            default: 'USD'
        },
        price: {
            type: Number,
            required: [true, 'Base price is required']
        },
        sale_price: {
            type: Number,
            default: null
        },
        variants: [variantCombinationSchema],
        key_attributes: [{
            key: { type: String, trim: true },
            value: { type: String, trim: true }
        }],
        main_price: {
            type: Number,
            index: true
        },
        images: [{ type: String }],
        main_image: { type: String },
        images_metadata: [{
            url: { type: String, required: true },
            alt: { type: String, default: '' }
        }],
        video: { type: String, default: '' },
        rating: { type: Number, default: 0, index: true },
        numReviews: { type: Number, default: 0 },
        numOrders: { type: Number, default: 0 },
        countInStock: { type: Number, default: 0 },
        default_warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'draft'],
            default: 'draft',
            index: true
        },
        approval_status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true
        },
        approval_note: {
            type: String,
            default: ''
        },
        isFeatured: { type: Boolean, default: false, index: true },
        isPromoted: { type: Boolean, default: false, index: true },
        promotion_expires: { type: Date },
        ppc_bid: { type: Number, default: 0 },
        section: { type: String, default: 'None', index: true },
        oldPrice: { type: Number, default: 0 },
        // Internationalization & Compliance
        hs_code: { type: String, trim: true },
        country_of_origin: { type: String, trim: true },
        weight: { type: Number, default: 0 }, // in kg
        dimensions: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number }
        },
        // Sales Region Control
        sales_type: {
            type: String,
            enum: ['worldwide', 'specific'],
            default: 'worldwide',
            index: true
        },
        countries: [{
            type: String, // ISO country codes like ["IN", "US", "UK"]
            trim: true
        }],
        // 3D Media
        three_d_model: { type: String, default: '' },
        // Features
        features: [{ type: String, trim: true }],
        // SEO Fields
        meta_title: { type: String, trim: true },
        meta_description: { type: String, trim: true },
        meta_keywords: [{ type: String, trim: true }],
        // Tags
        tags: [{ type: String, index: true }],
        // Analytics
        views: { type: Number, default: 0, index: true },
        ranking_score: { type: Number, default: 0, index: true },
        // Digital Download Fields
        isDigital: { type: Boolean, default: false, index: true },
        digitalFile: { type: String, default: '' },
        // Barcode Field
        barcode: { type: String, default: '', index: true },
        // Dropshipping & Gift Wrap Management
        dropshipping_supported: { type: Boolean, default: true, index: true },
        gift_wrap_supported: { type: Boolean, default: true, index: true },
        gift_wrap_fee: { type: Number, default: null },
        emi_supported: { type: Boolean, default: true, index: true },
        bundle_discount: { type: Number, default: 10 }
    },
    { timestamps: true }
);

// Text search index
productSchema.index({ name: 'text', description: 'text' });

productSchema.pre('save', async function () {
    // Generate slug
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Update main_price to the sale_price or price for efficient sorting/filtering
    this.main_price = this.sale_price !== null && this.sale_price !== undefined ? this.sale_price : this.price;

    // Track price change flag for post-save history logging
    this._priceChanged = this.isModified('price') || this.isModified('sale_price') || this.isNew;

    // Dynamically calculate ranking_score based on Alibaba-like strategy:
    // Sales (40%), Views (20%), Rating (20%), Reviews (10%), Freshness/Misc (10%)
    // Normalized approx: numOrders * 50, views * 1, rating * 100, numReviews * 20
    this.ranking_score = ((this.numOrders || 0) * 50) + ((this.views || 0) * 1) + ((this.rating || 0) * 100) + ((this.numReviews || 0) * 20);
});

productSchema.post('save', async function (doc, next) {
    if (doc._priceChanged) {
        try {
            const PriceHistory = require('./PriceHistory');
            await PriceHistory.create({
                product: doc._id,
                price: doc.main_price
            });
        } catch (err) {
            console.error('Failed to log price history:', err);
        }
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);
