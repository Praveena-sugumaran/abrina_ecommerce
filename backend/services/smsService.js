const twilio = require('twilio');
const SiteSetting = require('../models/SiteSetting');

/**
 * Normalizes phone numbers by removing all non-digit characters except the leading '+'
 * @param {string} phone 
 * @returns {string}
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.trim().replace(/[^\d+]/g, '');
};

/**
 * Sends an SMS to a phone number using Twilio if configured,
 * otherwise falls back to console simulation.
 * 
 * @param {string} to - The recipient's phone number (e.g. "+1234567890")
 * @param {string} body - The text message body
 * @returns {Promise<{success: boolean, simulated: boolean, sid?: string}>}
 */
const sendSms = async (to, body) => {
    try {
        const settings = await SiteSetting.findOne();
        if (!settings) {
            throw new Error('Site settings not found in database');
        }

        const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = settings;

        // Check if Twilio settings are configured
        if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
            console.log(`\n======================================================`);
            console.log(`[SMS OTP SIMULATION (Twilio not configured)]`);
            console.log(`To: ${to}`);
            console.log(`Message: ${body}`);
            console.log(`======================================================\n`);
            return { success: true, simulated: true };
        }

        const cleanTo = normalizePhoneNumber(to);
        const cleanFrom = normalizePhoneNumber(twilio_phone_number);

        // Initialize Twilio client
        const client = twilio(twilio_account_sid, twilio_auth_token);

        // Send actual SMS
        const response = await client.messages.create({
            body: body,
            from: cleanFrom,
            to: cleanTo
        });

        console.log(`[Twilio SMS Sent Successfully] SID: ${response.sid}`);
        return { success: true, simulated: false, sid: response.sid };
    } catch (error) {
        console.error('Error sending SMS via Twilio:', error);
        // Fallback to simulation if sending fails, so user is not blocked but logs the error
        console.log(`\n======================================================`);
        console.log(`[SMS OTP SIMULATION FALLBACK (Twilio failed: ${error.message})]`);
        console.log(`To: ${to}`);
        console.log(`Message: ${body}`);
        console.log(`======================================================\n`);
        return { success: true, simulated: true, error: error.message };
    }
};

module.exports = { sendSms, normalizePhoneNumber };

