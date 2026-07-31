const SiteSetting = require('../models/SiteSetting');
const { isLocalEnvironment } = require('../services/licenseService');

const checkClientLicense = async (req, res, next) => {
    try {
        const path = req.originalUrl;
        const host = req.hostname;

        // 1. Bypass public installation, activation, auth, and common settings APIs
        if (
            path.startsWith('/api/install') ||
            path.startsWith('/api/auth') ||
            path.startsWith('/api/common') ||
            path === '/api/site-settings/public' ||
            path.startsWith('/api/social-login') ||
            path === '/api/health' ||
            path.startsWith('/uploads')
        ) {
            return next();
        }

        // 2. Fetch site settings
        let settings = await SiteSetting.findOne();
        if (!settings) {
            // If settings aren't seeded yet, let the installer run or proceed
            return next();
        }

        // 3. Enforce Installation Wizard Redirect
        if (!settings.is_installed) {
            return res.status(451).json({
                success: false,
                isInstalled: false,
                licenseStatus: 'inactive',
                message: 'System installation wizard not completed. Access restricted.'
            });
        }

        // 4. Production Domain Lock Enforcement
        // If settings cache says development mode, but request is on a live production domain
        if (settings.license_status === 'development' && !isLocalEnvironment(host)) {
            settings.license_status = 'inactive';
            await settings.save();
            return res.status(451).json({
                success: false,
                isInstalled: true,
                licenseStatus: 'inactive',
                message: 'Production deployment detected. Please enter a valid purchase code.'
            });
        }

        // 5. Enforce License Active Checks
        if (settings.license_status !== 'active' && settings.license_status !== 'development') {
            return res.status(451).json({
                success: false,
                isInstalled: true,
                licenseStatus: settings.license_status,
                message: 'Active license key required to use the marketplace.'
            });
        }

        // Cryptographic Signature check to prevent DB manipulation bypasses
        if (settings.license_status === 'active') {
            try {
                const crypto = require('crypto');
                const cryptoService = require('../services/cryptoService');
                
                const purchaseCode = cryptoService.decrypt(settings.license_key_encrypted);
                const installationId = cryptoService.decrypt(settings.installation_id_encrypted);
                const signature = cryptoService.decrypt(settings.license_signature_encrypted);
                const secretKey = process.env.LICENSE_SECRET_KEY || 'shared_hmac_secret_key_9922';

                if (!purchaseCode || !installationId || !signature) {
                    throw new Error('Missing license crypto data');
                }

                const expectedSignature = crypto
                    .createHmac('sha256', secretKey)
                    .update(purchaseCode + installationId)
                    .digest('hex');

                if (signature !== expectedSignature) {
                    throw new Error('License signature mismatch');
                }
            } catch (cryptoErr) {
                settings.license_status = 'inactive';
                await settings.save();
                return res.status(451).json({
                    success: false,
                    isInstalled: true,
                    licenseStatus: 'inactive',
                    message: 'License cryptographic verification failed. Database manipulation detected.'
                });
            }
        }

        next();
    } catch (err) {
        console.error('License Middleware Error:', err);
        next(); // Fallback to let request proceed if DB goes down
    }
};

module.exports = checkClientLicense;
