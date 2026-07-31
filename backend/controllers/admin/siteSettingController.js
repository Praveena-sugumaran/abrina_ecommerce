const SiteSetting = require('../../models/SiteSetting');
const mongoose = require('mongoose');

let cachedPublicSettings = null;

// GET site settings (public — no auth needed for color fetch, private fields filtered)
const getSiteSettingsPublic = async (req, res) => {
    try {
        console.time("getSiteSettingsPublic");
        if (cachedPublicSettings) {
            console.log("Serving site settings from memory cache...");
            console.timeEnd("getSiteSettingsPublic");
            return res.json(cachedPublicSettings);
        }
        let settings = await SiteSetting.findOne();
        if (!settings) settings = await SiteSetting.create({});
        
        // Return only safe fields (no private API keys or secrets)
        const publicSettings = {
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            site_name: settings.site_name,
            seo_title: settings.seo_title,
            meta_description: settings.meta_description,
            keywords: settings.keywords,
            pagination_limit: settings.pagination_limit,
            maintenance_mode: settings.maintenance_mode,
            default_currency: settings.default_currency,
            default_language: settings.default_language,
            date_format: settings.date_format,
            price_format: settings.price_format,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            product_auto_approval: settings.product_auto_approval,
            address: settings.address,
            logo_dark: settings.logo_dark,
            logo_light: settings.logo_light,
            favicon: settings.favicon,
            footer_description: settings.footer_description,
            customer_login_banner: settings.customer_login_banner,
            customer_login_text: settings.customer_login_text,
            seller_login_banner: settings.seller_login_banner,
            seller_login_text: settings.seller_login_text,
            customer_register_banner: settings.customer_register_banner,
            customer_register_text: settings.customer_register_text,
            seller_register_banner: settings.seller_register_banner,
            seller_register_text: settings.seller_register_text,
            google_maps_enabled: settings.google_maps_enabled,
            google_maps_api_key: settings.google_maps_api_key,
            enable_recaptcha: settings.enable_recaptcha,
            recaptcha_site_key: settings.recaptcha_site_key,
            enable_mobile_verification: settings.enable_mobile_verification !== undefined ? settings.enable_mobile_verification : false,
            chatbot_enabled: settings.chatbot_enabled,
            live_stream_enabled: settings.live_stream_enabled !== undefined ? settings.live_stream_enabled : true,
            rfq_enabled: settings.rfq_enabled !== undefined ? settings.rfq_enabled : false,
            zego_app_id: settings.zego_app_id,
            zego_app_sign: settings.zego_app_sign,
            zego_server_secret: settings.zego_server_secret,
            free_delivery_enabled: settings.free_delivery_enabled !== undefined ? settings.free_delivery_enabled : false,
            free_delivery_threshold: settings.free_delivery_threshold !== undefined ? settings.free_delivery_threshold : 0,
            first_time_platform_fee_free: settings.first_time_platform_fee_free !== undefined ? settings.first_time_platform_fee_free : false,
            gift_wrap_fee: settings.gift_wrap_fee !== undefined ? settings.gift_wrap_fee : 5.00,
            is_installed: settings.is_installed !== undefined ? settings.is_installed : true,
            license_status: settings.license_status || 'development'
        };
        cachedPublicSettings = publicSettings;
        res.json(publicSettings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET site settings (admin only — returns all fields including keys)
const getSiteSettings = async (req, res) => {
    try {
        let settings = await SiteSetting.findOne();
        if (!settings) settings = await SiteSetting.create({});
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// UPDATE site settings (admin only)
const updateSiteSettings = async (req, res) => {
    try {
        const { 
            primary_color, secondary_color, site_name, seo_title, meta_description, keywords, pagination_limit,
            maintenance_mode, default_currency, default_language, date_format, price_format,
            contact_email, contact_phone, address, ai_api_key,
            logo_dark, logo_light, favicon, footer_description,
            customer_login_banner, customer_login_text, seller_login_banner, seller_login_text,
            customer_register_banner, customer_register_text, seller_register_banner, seller_register_text,
            google_maps_enabled, google_maps_api_key,
            live_stream_enabled, rfq_enabled,
            zego_app_id, zego_app_sign, zego_server_secret,
            product_auto_approval,
            enable_mobile_verification,
            twilio_account_sid,
            twilio_auth_token,
            twilio_phone_number,
            gift_wrap_fee
        } = req.body;
        
        let settings = await SiteSetting.findOne();
        if (!settings) settings = new SiteSetting();
        
        if (primary_color !== undefined) settings.primary_color = primary_color;
        if (secondary_color !== undefined) settings.secondary_color = secondary_color;
        if (site_name !== undefined) settings.site_name = site_name;
        if (seo_title !== undefined) settings.seo_title = seo_title;
        if (meta_description !== undefined) settings.meta_description = meta_description;
        if (keywords !== undefined) settings.keywords = keywords;
        if (pagination_limit !== undefined) settings.pagination_limit = Number(pagination_limit);
        
        if (maintenance_mode !== undefined) settings.maintenance_mode = !!maintenance_mode;
        if (req.body.enable_cron_reset !== undefined) settings.enable_cron_reset = !!req.body.enable_cron_reset;
        if (default_currency !== undefined) settings.default_currency = default_currency;
        if (default_language !== undefined) settings.default_language = default_language;
        if (date_format !== undefined) settings.date_format = date_format;
        if (price_format !== undefined) settings.price_format = price_format;
        if (contact_email !== undefined) settings.contact_email = contact_email;
        if (contact_phone !== undefined) settings.contact_phone = contact_phone;
        if (address !== undefined) settings.address = address;
        if (ai_api_key !== undefined) settings.ai_api_key = ai_api_key;
        if (logo_dark !== undefined) settings.logo_dark = logo_dark;
        if (logo_light !== undefined) settings.logo_light = logo_light;
        if (product_auto_approval !== undefined) settings.product_auto_approval = !!product_auto_approval;
        if (favicon !== undefined) settings.favicon = favicon;
        if (footer_description !== undefined) settings.footer_description = footer_description;
        if (customer_login_banner !== undefined) settings.customer_login_banner = customer_login_banner;
        if (customer_login_text !== undefined) settings.customer_login_text = customer_login_text;
        if (seller_login_banner !== undefined) settings.seller_login_banner = seller_login_banner;
        if (seller_login_text !== undefined) settings.seller_login_text = seller_login_text;
        if (customer_register_banner !== undefined) settings.customer_register_banner = customer_register_banner;
        if (customer_register_text !== undefined) settings.customer_register_text = customer_register_text;
        if (seller_register_banner !== undefined) settings.seller_register_banner = seller_register_banner;
        if (seller_register_text !== undefined) settings.seller_register_text = seller_register_text;
        if (google_maps_enabled !== undefined) settings.google_maps_enabled = !!google_maps_enabled;
        if (google_maps_api_key !== undefined) settings.google_maps_api_key = google_maps_api_key;
         if (req.body.enable_recaptcha !== undefined) settings.enable_recaptcha = !!req.body.enable_recaptcha;
        if (req.body.recaptcha_site_key !== undefined) settings.recaptcha_site_key = req.body.recaptcha_site_key;
        if (req.body.recaptcha_secret_key !== undefined) settings.recaptcha_secret_key = req.body.recaptcha_secret_key;
        if (enable_mobile_verification !== undefined) settings.enable_mobile_verification = !!enable_mobile_verification;
        if (twilio_account_sid !== undefined) settings.twilio_account_sid = twilio_account_sid;
        if (twilio_auth_token !== undefined) settings.twilio_auth_token = twilio_auth_token;
        if (twilio_phone_number !== undefined) settings.twilio_phone_number = twilio_phone_number;
        if (req.body.chatbot_enabled !== undefined) settings.chatbot_enabled = !!req.body.chatbot_enabled;

        // Live stream settings
        if (live_stream_enabled !== undefined) settings.live_stream_enabled = !!live_stream_enabled;
        if (rfq_enabled !== undefined) settings.rfq_enabled = !!rfq_enabled;
        if (zego_app_id !== undefined) settings.zego_app_id = zego_app_id;
        if (zego_app_sign !== undefined) settings.zego_app_sign = zego_app_sign;
        if (zego_server_secret !== undefined) settings.zego_server_secret = zego_server_secret;

        // Free delivery & Platform fee settings
        if (req.body.free_delivery_enabled !== undefined) settings.free_delivery_enabled = !!req.body.free_delivery_enabled;
        if (req.body.free_delivery_threshold !== undefined) settings.free_delivery_threshold = Number(req.body.free_delivery_threshold);
        if (req.body.first_time_platform_fee_free !== undefined) settings.first_time_platform_fee_free = !!req.body.first_time_platform_fee_free;
        if (req.body.first_time_booking_offer_enabled !== undefined) settings.first_time_booking_offer_enabled = !!req.body.first_time_booking_offer_enabled;
        if (req.body.first_time_booking_offer_price !== undefined) settings.first_time_booking_offer_price = Number(req.body.first_time_booking_offer_price);
        if (req.body.first_time_booking_offer_type !== undefined) settings.first_time_booking_offer_type = req.body.first_time_booking_offer_type;
        if (gift_wrap_fee !== undefined) settings.gift_wrap_fee = Number(gift_wrap_fee);

        await settings.save();
        cachedPublicSettings = null; // Invalidate cache
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// FULL DATABASE BACKUP
const exportDatabaseBackup = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const backupData = {};

        for (const collInfo of collections) {
            const collectionName = collInfo.name;
            const collectionData = await db.collection(collectionName).find({}).toArray();
            backupData[collectionName] = collectionData;
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `alibaba-b2b-backup-${dateStr}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // We stringify the entire DB mapping
        res.send(JSON.stringify(backupData, null, 2));

    } catch (err) {
        console.error('Database backup error:', err);
        res.status(500).json({ message: 'Failed to generate database backup' });
    }
};

module.exports = { getSiteSettings, getSiteSettingsPublic, updateSiteSettings, exportDatabaseBackup };
