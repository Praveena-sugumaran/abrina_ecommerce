const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
    primary_color: { type: String, default: '#ff6a00' },
    secondary_color: { type: String, default: '' },
    site_name: { type: String, default: '' },
    seo_title: { type: String, default: '' },
    meta_description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    pagination_limit: { type: Number, default: 10 },
    // New Fields
    maintenance_mode: { type: Boolean, default: false },
    enable_cron_reset: { type: Boolean, default: true },
    product_auto_approval: { type: Boolean, default: false },
    default_currency: { type: String, default: 'USD' },
    default_language: { type: String, default: 'en' },
    date_format: { type: String, default: 'DD/MM/YYYY' },
    price_format: { type: String, enum: ['prefix', 'suffix'], default: 'prefix' }, // $500 vs 500$
    contact_email: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    address: { type: String, default: '' },
    ai_api_key: { type: String, default: '' },
    logo_dark: { type: String, default: '' },
    logo_light: { type: String, default: '' },
    favicon: { type: String, default: '' },
    footer_description: { type: String, default: '' },
    customer_login_banner: { type: String, default: '' },
    customer_login_text: { type: String, default: 'Your data privacy is our priority' },
    seller_login_banner: { type: String, default: '' },
    seller_login_text: { type: String, default: 'A Trusted Platform\n\nA Professional Operations Team to Boost Your Sales Performance!' },
    customer_register_banner: { type: String, default: '' },
    customer_register_text: { type: String, default: 'Join millions of shoppers worldwide' },
    seller_register_banner: { type: String, default: '' },
    seller_register_text: { type: String, default: 'Start Selling Today\n\nReach millions of buyers and grow your business globally!' },
    google_maps_enabled: { type: Boolean, default: false },
    google_maps_api_key: { type: String, default: '' },
    facebook_url: { type: String, default: '' },
    twitter_url: { type: String, default: '' },
    instagram_url: { type: String, default: '' },
    linkedin_url: { type: String, default: '' },
    youtube_url: { type: String, default: '' },
    app_store_link: { type: String, default: '' },
    google_play_link: { type: String, default: '' },
    enable_recaptcha: { type: Boolean, default: false },
    recaptcha_site_key: { type: String, default: '' },
    recaptcha_secret_key: { type: String, default: '' },
    enable_mobile_verification: { type: Boolean, default: false },
    twilio_account_sid: { type: String, default: '' },
    twilio_auth_token: { type: String, default: '' },
    twilio_phone_number: { type: String, default: '' },
    chatbot_enabled: { type: Boolean, default: true },
    
    // Live Streaming Configurations
    live_stream_enabled: { type: Boolean, default: true },
    rfq_enabled: { type: Boolean, default: false },
    zego_app_id: { type: String, default: '' },
    zego_app_sign: { type: String, default: '' },
    zego_server_secret: { type: String, default: '' },
    
    // License Verification Cache Fields
    license_key_encrypted: { type: String, default: '' },
    license_email_encrypted: { type: String, default: '' },
    installation_id_encrypted: { type: String, default: '' },
    server_fingerprint_encrypted: { type: String, default: '' },
    license_status: { type: String, enum: ['active', 'inactive', 'development'], default: 'inactive' },
    last_verified_at: { type: Date },
    license_signature_encrypted: { type: String, default: '' },
    is_installed: { type: Boolean, default: false },
    installation_completed_at: { type: Date },
    
    // Free delivery and first-time platform fee settings
    free_delivery_enabled: { type: Boolean, default: false },
    free_delivery_threshold: { type: Number, default: 0 },
    first_time_platform_fee_free: { type: Boolean, default: false },
    first_time_booking_offer_enabled: { type: Boolean, default: false },
    first_time_booking_offer_price: { type: Number, default: 0 },
    first_time_booking_offer_type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    gift_wrap_fee: { type: Number, default: 5.00 },

    // Deals of the Day Countdown Timer
    deals_timer_hours: { type: Number, default: 24 },
    deals_timer_end_date: { type: String, default: '' },

    // WhatsApp Business Gateway
    whatsapp_enabled: { type: Boolean, default: false },
    whatsapp_phone_number: { type: String, default: '' },

    // Live Carrier Shipping Integrations
    carrier_fedex_enabled: { type: Boolean, default: false },
    fedex_api_key: { type: String, default: '' },
    fedex_secret_key: { type: String, default: '' },
    fedex_account_number: { type: String, default: '' },

    carrier_dhl_enabled: { type: Boolean, default: false },
    dhl_site_id: { type: String, default: '' },
    dhl_api_key: { type: String, default: '' },

    carrier_ups_enabled: { type: Boolean, default: false },
    ups_access_key: { type: String, default: '' },
    ups_account_number: { type: String, default: '' },

    // Media Storage & Cloud CDN
    media_storage_driver: { type: String, enum: ['local', 's3', 'cloudinary'], default: 'local' },
    s3_bucket_name: { type: String, default: '' },
    s3_region: { type: String, default: 'us-east-1' },
    s3_access_key: { type: String, default: '' },
    s3_secret_key: { type: String, default: '' },
    cloudinary_cloud_name: { type: String, default: '' },
    cloudinary_api_key: { type: String, default: '' },
    cloudinary_api_secret: { type: String, default: '' },

    // Redis Query Cache
    redis_cache_enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
