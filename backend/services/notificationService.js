const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSms } = require('./smsService');
const { sendWhatsAppMessage } = require('./whatsappService');

const sendNotification = async (io, userId, title, message, type, link, role = 'buyer') => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type,
            link,
            role
        });

        if (io) {
            io.to(userId.toString()).emit('notificationReceived', notification);
        }

        // Send transactional SMS & WhatsApp if user has a registered phone number
        const user = await User.findById(userId);
        if (user && user.phone_number) {
            const alertText = `📲 *${title}*\n${message}\n\nView details: ${process.env.FRONTEND_URL || 'http://localhost:9010'}${link || '/'}`;
            
            sendSms(user.phone_number, `[B2B Alert] ${title}: ${message}`).catch(smsErr => {
                console.error(`Failed to dispatch transactional SMS alert:`, smsErr.message);
            });

            sendWhatsAppMessage(user.phone_number, alertText).catch(waErr => {
                console.error(`Failed to dispatch WhatsApp alert:`, waErr.message);
            });
        }

        // Send PWA Web Push Notification
        try {
            const webpush = require('web-push');
            const PushSubscription = require('../models/PushSubscription');
            const subscriptions = await PushSubscription.find({ user_id: userId });

            if (subscriptions.length > 0) {
                // Initialize VAPID details dynamically on startup / first dispatch
                const generatedKeys = webpush.generateVAPIDKeys();
                webpush.setVapidDetails(
                    'mailto:support@alibaba-clone.com',
                    process.env.VAPID_PUBLIC_KEY || generatedKeys.publicKey,
                    process.env.VAPID_PRIVATE_KEY || generatedKeys.privateKey
                );

                const payload = JSON.stringify({
                    title,
                    body: message,
                    url: link || '/'
                });

                subscriptions.forEach(sub => {
                    webpush.sendNotification(sub.subscription, payload)
                        .catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                // Clean up expired subscriptions
                                PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
                            } else {
                                console.error('PWA Web Push Error:', err.message);
                            }
                        });
                });
            }
        } catch (pushErr) {
            console.error('Web Push system dispatch failed:', pushErr.message);
        }

        return notification;
    } catch (err) {
        console.error('Failed to send notification:', err);
    }
};

module.exports = { sendNotification };
