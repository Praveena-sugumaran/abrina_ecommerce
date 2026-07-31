const twilio = require('twilio');
const SiteSetting = require('../models/SiteSetting');
const { normalizePhoneNumber } = require('./smsService');

/**
 * Sends a WhatsApp notification to a buyer/user using Twilio WhatsApp API
 * @param {string} toPhone - Recipient phone number (e.g. "+1234567890")
 * @param {string} messageText - The body of the WhatsApp message
 */
const sendWhatsAppMessage = async (toPhone, messageText) => {
    try {
        const settings = await SiteSetting.findOne();
        if (!settings) {
            throw new Error('Site settings not found');
        }

        const { twilio_account_sid, twilio_auth_token, twilio_phone_number, whatsapp_enabled, whatsapp_phone_number } = settings;

        const fromNumber = whatsapp_phone_number || twilio_phone_number;

        if (!whatsapp_enabled || !twilio_account_sid || !twilio_auth_token || !fromNumber) {
            console.log(`\n======================================================`);
            console.log(`[WHATSAPP MESSAGE SIMULATION (Gateway Disabled / Unconfigured)]`);
            console.log(`To: whatsapp:${normalizePhoneNumber(toPhone)}`);
            console.log(`Body:\n${messageText}`);
            console.log(`======================================================\n`);
            return { success: true, simulated: true };
        }

        const client = twilio(twilio_account_sid, twilio_auth_token);
        const formattedTo = `whatsapp:${normalizePhoneNumber(toPhone)}`;
        const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${normalizePhoneNumber(fromNumber)}`;

        const response = await client.messages.create({
            body: messageText,
            from: formattedFrom,
            to: formattedTo
        });

        console.log(`[WhatsApp Alert Dispatched] SID: ${response.sid}`);
        return { success: true, simulated: false, sid: response.sid };
    } catch (error) {
        console.error('Failed to send WhatsApp message via Twilio:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendWhatsAppMessage };
