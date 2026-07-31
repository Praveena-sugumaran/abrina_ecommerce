const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            let user = await User.findById(decoded.id).select('-password');
            if (!user) {
                user = await AdminUser.findById(decoded.id).select('-password');
            }
            req.user = user;
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Stateful session check
            if (decoded.sessionId) {
                const UserSession = require('../models/UserSession');
                const session = await UserSession.findOne({ _id: decoded.sessionId, user_id: decoded.id });
                if (!session || session.is_active === false || (session.expires_at && session.expires_at < new Date())) {
                    return res.status(401).json({ message: 'Session has been revoked or expired' });
                }
                // Update last active
                session.last_active = new Date();
                await session.save();
                req.session_id = decoded.sessionId;
            }

            return next();
        } catch (error) {
            console.error('Auth protect error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const softProtect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            let user = await User.findById(decoded.id).select('-password');
            if (!user) {
                user = await AdminUser.findById(decoded.id).select('-password');
            }
            req.user = user;

            // Soft session check
            if (decoded.sessionId && req.user) {
                const UserSession = require('../models/UserSession');
                const session = await UserSession.findOne({ _id: decoded.sessionId, user_id: decoded.id });
                if (session && session.is_active !== false && (!session.expires_at || session.expires_at > new Date())) {
                    session.last_active = new Date();
                    await session.save();
                    req.session_id = decoded.sessionId;
                } else {
                    req.user = null;
                }
            }
        } catch (error) {
            // Ignore token error, proceed as guest
        }
    }
    next();
};

const authorizeRoles = (...rolesToAuthorize) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no user found' });
        }
        // Handle both new array format and old string format for backward compatibility
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []); 
        
        // Every authenticated user (supplier, admin) can implicitly act as a buyer
        const effectiveRoles = [...userRoles];
        if (effectiveRoles.includes('seller') && !effectiveRoles.includes('supplier')) {
            effectiveRoles.push('supplier');
        }
        if (!effectiveRoles.includes('buyer')) {
            effectiveRoles.push('buyer');
        }

        const isAuthorized = rolesToAuthorize.some(role => effectiveRoles.includes(role));

        if (!isAuthorized) {
            return res.status(403).json({
                message: `User roles '${userRoles.join(', ')}' are not authorized to access this route`
            });
        }
        next();
    };
};

const checkPermission = (permissionSlug) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, no user found' });
        }

        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;

        if (isSuperAdmin) {
            return next();
        }

        if (req.user.role_id) {
            const RolePermission = require('../models/RolePermission');
            const Permission = require('../models/Permission');

            const rolePerms = await RolePermission.find({ role_id: req.user.role_id }).populate('permission_id');
            const hasPerm = rolePerms.some(rp => rp.permission_id && rp.permission_id.slug === permissionSlug);

            if (hasPerm) {
                return next();
            }
        }

        return res.status(403).json({ success: false, message: 'Permission denied' });
    };
};

module.exports = { protect, authorizeRoles, softProtect, checkPermission };

