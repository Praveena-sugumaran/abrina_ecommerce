const SmsSetting = require('../models/SmsSetting');

/**
 * Dispatch SMS alerts to users using configured Twilio credentials or simulator fallback
 * @param {string} to - Recipient phone number (e.g. +1234567890)
 * @param {string} body - Message content text
 * @returns {Promise<void>}
 */
const sendSMS = async (to, body) => {
    // Run asynchronously to not block order/webhook flows
    Promise.resolve().then(async () => {
        try {
            const settings = await SmsSetting.findOne();
            const twilioSid = settings?.accountSid || process.env.TWILIO_ACCOUNT_SID;
            const twilioAuth = settings?.authToken || process.env.TWILIO_AUTH_TOKEN;
            const twilioFrom = settings?.fromNumber || process.env.TWILIO_FROM_NUMBER;

            if (twilioSid && twilioAuth && twilioFrom && to) {
                const twilio = require('twilio');
                const client = twilio(twilioSid, twilioAuth);
                const message = await client.messages.create({
                    body,
                    from: twilioFrom,
                    to
                });
                console.log('Twilio message sent successfully:', message.sid);
            } else {
                console.log(`[TWILIO SMS SIMULATOR] To: ${to || 'Unknown'} | Message: "${body}"`);
            }
        } catch (error) {
            console.error('Twilio SMS sending error:', error.message);
            console.log(`[TWILIO SMS SIMULATOR FALLBACK] To: ${to || 'Unknown'} | Message: "${body}"`);
        }
    });
};

module.exports = { sendSMS };
