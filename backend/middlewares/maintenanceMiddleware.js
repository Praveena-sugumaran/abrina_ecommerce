const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SiteSetting = require('../models/SiteSetting');

const maintenanceMiddleware = async (req, res, next) => {
    try {
        const settings = await SiteSetting.findOne().select('maintenance_mode');
        if (settings && settings.maintenance_mode) {
            const urlPath = req.originalUrl.split('?')[0];

            // 1. Whitelist routes that must run regardless of maintenance mode
            const isWhitelisted = [
                '/api/site-settings/public',
                '/api/common/languages',
                '/api/common/currencies',
                '/api/auth/countries',
                '/api/auth/login',
                '/api/auth/profile'
            ].some(whitelisted => urlPath === whitelisted) || 
            urlPath.startsWith('/api/install') || 
            urlPath.startsWith('/api/webhook') ||
            urlPath.startsWith('/uploads'); // Allow viewing uploaded assets like logos

            if (isWhitelisted) {
                return next();
            }

            // 2. Decode JWT token to check if user is admin
            let isAdmin = false;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const user = await User.findById(decoded.id);
                    if (user) {
                        const roles = user.roles || (user.role ? [user.role] : []);
                        if (roles.includes('admin')) {
                            isAdmin = true;
                        }
                    }
                } catch (err) {
                    // Ignore token verification errors here
                }
            }

            // 3. If they are admin, let them proceed (e.g. for profile, admin panels, settings updates)
            if (isAdmin) {
                return next();
            }

            // 4. Admin API endpoints require admin check anyway, but let's allow paths starting with `/api/admin`
            if (urlPath.startsWith('/api/admin')) {
                return next();
            }

            // 5. Block all other requests with 503 Service Unavailable
            return res.status(503).json({
                maintenance: true,
                message: 'System is currently undergoing maintenance. Please try again later.'
            });
        }
    } catch (err) {
        console.error('Maintenance middleware error:', err);
    }
    next();
};

module.exports = maintenanceMiddleware;
