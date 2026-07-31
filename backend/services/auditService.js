const AuditLog = require('../models/AuditLog');

/**
 * Logs a system action for audit purposes.
 */
exports.logAction = async (req, action, module, status = 'success', details = {}) => {
    try {
        await AuditLog.create({
            userId: req.user?._id,
            action,
            module,
            status,
            details,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent']
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};
