const RiskAlert = require('../models/RiskAlert');
const User = require('../models/User');
const { sendNotification } = require('./notificationService');
const { getIO } = require('../socket/socketHandler');

/**
 * Logs a suspicious activity for admin review.
 */
exports.logRisk = async (userId, type, severity, description, metadata = {}) => {
    try {
        const io = getIO();
        
        // Log to DB
        await RiskAlert.create({
            userId,
            type,
            severity,
            description,
            metadata
        });

        // Notify admins
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await sendNotification(
                io, 
                admin._id, 
                `🛡️ Risk Alert: ${type}`, 
                `${severity.toUpperCase()}: ${description}`,
                'admin',
                '/admin/risk-alerts'
            );
        }

        console.log(`🛡️ Risk Alert Logged & Admins Notified: [${severity.toUpperCase()}] ${type} - ${description}`);
    } catch (err) {
        console.error('Error logging risk alert:', err);
    }
};
