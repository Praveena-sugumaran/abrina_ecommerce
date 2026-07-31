const AuditLog = require('../models/AuditLog');

const logAction = (action, module) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            const status = res.statusCode < 400 ? 'success' : 'failure';

            // Log in background
            AuditLog.create({
                userId: req.user ? req.user._id : null,
                action,
                module,
                status,
                details: {
                    path: req.originalUrl,
                    method: req.method,
                    payload: req.body, // Be careful with sensitive data in production
                    response: status === 'failure' ? data : 'See response data'
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }).catch(err => console.error('Audit Log Error:', err));

            originalSend.apply(res, arguments);
        };
        next();
    };
};

module.exports = { logAction };
