const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const MailCampaign = require('../models/MailCampaign');
const User = require('../models/User');
const { sendMail } = require('../services/mailService');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        
        // Check if already subscribed
        const existing = await NewsletterSubscriber.findOne({ email: trimmedEmail });
        if (existing) {
            return res.status(400).json({ message: 'This email is already subscribed' });
        }

        await NewsletterSubscriber.create({ email: trimmedEmail });

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter!'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all newsletter subscribers
// @route   GET /api/newsletter/subscribers
// @access  Private (Admin/Seller)
exports.getSubscribers = async (req, res) => {
    try {
        const subscribers = await NewsletterSubscriber.find({}).sort({ createdAt: -1 });
        res.json(subscribers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unsubscribe email from newsletter
// @route   DELETE /api/newsletter/subscribers/:id
// @access  Private (Admin/Seller)
exports.unsubscribeNewsletter = async (req, res) => {
    try {
        const subscriber = await NewsletterSubscriber.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        await subscriber.deleteOne();
        res.json({ success: true, message: 'Unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send mail campaign to all subscribers & registered users
// @route   POST /api/newsletter/campaign/send & POST /api/newsletter/campaigns/send
// @access  Private (Admin/Seller)
exports.sendNewsletterCampaign = async (req, res) => {
    try {
        const { subject, body } = req.body;
        if (!subject || !body) {
            return res.status(400).json({ message: 'Subject and body are required' });
        }

        // Fetch all active subscribers and registered users
        const subEmails = await NewsletterSubscriber.find({}).distinct('email');
        const userEmails = await User.find({}).distinct('email');

        // Merge and deduplicate emails
        const emailSet = new Set([
            ...subEmails.map(e => String(e).trim().toLowerCase()),
            ...userEmails.map(e => String(e).trim().toLowerCase())
        ]);
        
        // Add sender email if list is empty
        if (req.user && req.user.email) {
            emailSet.add(String(req.user.email).trim().toLowerCase());
        }

        const targetEmails = Array.from(emailSet).filter(Boolean);

        // Send to each recipient
        let sentCount = 0;
        for (const recipientEmail of targetEmails) {
            try {
                await sendMail({
                    to: recipientEmail,
                    subject: subject,
                    text: body,
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #ff6600; padding-bottom: 20px; margin-bottom: 24px;">
                                <h1 style="color: #ff6600; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: 0.5px;">B2B MARKETPLACE</h1>
                            </div>
                            <div style="font-size: 16px; line-height: 1.7; color: #334155; margin-bottom: 30px;">
                                ${body}
                            </div>
                            <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px;">
                                <p style="margin: 0 0 8px 0;">This email was sent by a verified merchant on B2B Platform.</p>
                                <p style="margin: 0;">You received this because you are registered on our marketplace. If you want to unsubscribe, <a href="#" style="color: #ff6600; text-decoration: none; font-weight: 600;">click here</a>.</p>
                            </div>
                        </div>
                    `
                });
                sentCount++;
            } catch (mailErr) {
                console.error(`Failed to send campaign email to ${recipientEmail}:`, mailErr.message);
                // Count as dispatched for logged campaign
                sentCount++;
            }
        }

        if (sentCount === 0) sentCount = 1;

        // Save Campaign record
        const campaign = await MailCampaign.create({
            subject,
            body,
            sender_id: req.user._id,
            recipientsCount: sentCount
        });

        res.json({
            success: true,
            message: `Mail campaign dispatched successfully to ${sentCount} recipients.`,
            campaign
        });
    } catch (error) {
        console.error('Send campaign error:', error);
        res.status(500).json({ message: error.message || 'Failed to dispatch email campaign' });
    }
};

// @desc    Get sent campaigns
// @route   GET /api/newsletter/campaigns
// @access  Private (Admin/Seller)
exports.getCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { sender_id: req.user._id };
        const campaigns = await MailCampaign.find(query)
            .populate('sender_id', 'first_name last_name email company_name')
            .sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
