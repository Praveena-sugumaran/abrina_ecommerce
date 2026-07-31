const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');
const SiteSetting = require('../models/SiteSetting');

let transporter = null;

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: process.env.MAIL_PORT || 587,
        secure: process.env.MAIL_ENCRYPTION === 'ssl', // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
        },
    });
};

const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};

// Reset transporter when settings change (handled in emailSettingController potentially)
const resetTransporter = () => {
    transporter = null;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<void>}
 */
const sendMail = async ({ to, subject, text, html }) => {
    // Run email sending in the background to prevent blocking the HTTP response
    // when SMTP connections are slow or timing out.
    Promise.resolve().then(async () => {
        try {
            let siteName = process.env.MAIL_FROM_NAME || 'Alibaba Demo';
            try {
                const settings = await SiteSetting.findOne();
                if (settings && settings.site_name) {
                    siteName = settings.site_name;
                }
            } catch (dbErr) {
                console.error('Error fetching site name from SiteSetting:', dbErr);
            }

            let finalSubject = subject;
            if (finalSubject) {
                finalSubject = finalSubject
                    .replace(/Alibaba Live Demo/gi, siteName)
                    .replace(/Alibaba Demo/gi, siteName);
            }

            let finalHtml = html;
            if (finalHtml) {
                finalHtml = finalHtml
                    .replace(/Alibaba Live Demo/gi, siteName)
                    .replace(/Alibaba Demo/gi, siteName);
            }

            let finalTxt = text;
            if (finalTxt) {
                finalTxt = finalTxt
                    .replace(/Alibaba Live Demo/gi, siteName)
                    .replace(/Alibaba Demo/gi, siteName);
            }

            const info = await getTransporter().sendMail({
                from: `"${siteName}" <${process.env.MAIL_FROM_ADDRESS}>`,
                to,
                subject: finalSubject,
                text: finalTxt,
                html: finalHtml,
            });

            console.log('Background message sent: %s', info.messageId);
        } catch (error) {
            console.error('Background email send error:', error);
        }
    });

    // Return a dummy info object immediately to not break callers expecting properties
    return { messageId: 'background-queued-' + Date.now() };
};

/**
 * Send an email using a template
 * @param {string} slug - Template slug
 * @param {string} to - Recipient email
 * @param {Object} data - Placeholder data
 * @returns {Promise<void>}
 */
const sendTemplatedMail = async (slug, to, data) => {
    try {
        const template = await EmailTemplate.findOne({ slug, status: 'active' });
        if (!template) {
            console.error(`Template not found or inactive: ${slug}`);
            return;
        }

        let subject = template.subject;
        let body = template.body;

        // Replace placeholders
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, data[key]);
            body = body.replace(regex, data[key]);
        });

        // Basic HTML wrapper if not already HTML
        const html = body.includes('<') ? body : body.replace(/\n/g, '<br/>');

        return await sendMail({
            to,
            subject,
            html
        });
    } catch (error) {
        console.error(`Error sending templated email (${slug}):`, error);
        throw error;
    }
};

/**
 * Enqueue a templated email [Queue Integration]
 * @param {string} slug - Template slug
 * @param {string} to - Recipient email
 * @param {Object} data - Placeholder data
 * @returns {Promise<void>}
 */
const enqueueTemplatedMail = async (slug, to, data) => {
    try {
        const template = await EmailTemplate.findOne({ slug, status: 'active' });
        if (!template) {
            console.error(`Template not found or inactive for queue: ${slug}`);
            return;
        }

        let subject = template.subject;
        let body = template.body;

        // Replace placeholders (doing this now so it's stored pre-processed in the job)
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, data[key]);
            body = body.replace(regex, data[key]);
        });

        const html = body.includes('<') ? body : body.replace(/\n/g, '<br/>');

        const { addJob } = require('./queueService');
        return await addJob('email', {
            to,
            subject,
            html
        });
    } catch (error) {
        console.error(`Error enqueuing templated email (${slug}):`, error);
        throw error;
    }
};

module.exports = { sendMail, sendTemplatedMail, enqueueTemplatedMail, resetTransporter, getTransporter };

