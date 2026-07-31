const mongoose = require('mongoose');

// Global Mongoose license verification plugin (Multi-Layered Gating)
const licensePlugin = (schema) => {
    // Avoid running license checks on the SiteSetting model to prevent infinite recursion loop
    if (schema.options && schema.options.collection === 'sitesettings') {
        return;
    }
    // Also avoid checks on utility system logs / locks
    if (schema.options && (
        schema.options.collection === 'mongolocks' || 
        schema.options.collection === 'auditlogs' || 
        schema.options.collection === 'dummydataimages'
    )) {
        return;
    }

    const verifyLicenseHook = async function(next) {
        try {
            // Retrieve site settings model dynamically to check status
            const SiteSetting = mongoose.model('SiteSetting');
            const settings = await SiteSetting.findOne();
            if (!settings || !settings.is_installed) {
                return next(); // Installer is running, allow database access
            }

            // Enforce license validation
            if (settings.license_status !== 'active' && settings.license_status !== 'development') {
                return next(new Error('Database Access Denied: Active purchase code license required.'));
            }

            // Cryptographic validation for 'active' status to prevent DB manipulation bypasses
            if (settings.license_status === 'active') {
                const crypto = require('crypto');
                const cryptoService = require('../services/cryptoService');

                const purchaseCode = cryptoService.decrypt(settings.license_key_encrypted);
                const installationId = cryptoService.decrypt(settings.installation_id_encrypted);
                const signature = cryptoService.decrypt(settings.license_signature_encrypted);
                const secretKey = process.env.LICENSE_SECRET_KEY || 'shared_hmac_secret_key_9922';

                if (!purchaseCode || !installationId || !signature) {
                    throw new Error('Missing license crypto details');
                }

                const expectedSignature = crypto
                    .createHmac('sha256', secretKey)
                    .update(purchaseCode + installationId)
                    .digest('hex');

                if (signature !== expectedSignature) {
                    throw new Error('Invalid signature');
                }
            }
            next();
        } catch (err) {
            next(new Error(`Database Access Denied: License validation failed (${err.message}).`));
        }
    };

    // Apply pre-hooks for Mongoose read/write/count operations
    schema.pre('find', verifyLicenseHook);
    schema.pre('findOne', verifyLicenseHook);
    schema.pre('findOneAndUpdate', verifyLicenseHook);
    schema.pre('countDocuments', verifyLicenseHook);
    schema.pre('save', verifyLicenseHook);
};

// Apply plugin globally to all database schemas
mongoose.plugin(licensePlugin);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000, // Timeout after 15s instead of default
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Clean up legacy unique index on 'username' if it exists in the DB
        try {
            const db = conn.connection.db;
            const collections = await db.listCollections({ name: 'users' }).toArray();
            if (collections.length > 0) {
                // Check if index exists before dropping
                const indexes = await db.collection('users').listIndexes().toArray();
                if (indexes.some(idx => idx.name === 'username_1')) {
                    await db.collection('users').dropIndex('username_1');
                    console.log('Stray username_1 index dropped successfully');
                }
            }
        } catch (err) {
            console.warn('Note: username_1 index cleanup check skipped or not needed.');
        }
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Re-throw to prevent server from starting in a broken state for DB-dependent features
        throw error;
    }
};

module.exports = connectDB;
