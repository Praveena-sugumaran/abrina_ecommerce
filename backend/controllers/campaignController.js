const Campaign = require('../models/Campaign');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { sendMail } = require('../services/mailService');

// @desc    Create a new marketing campaign
// @route   POST /api/campaigns
// @access  Private (Supplier or Admin)
exports.createCampaign = async (req, res) => {
    try {
        const {
            name,
            type,
            target_type,
            target_product_id,
            coupon_code,
            email_subject,
            email_body,
            target_emails
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'Name and type are required' });
        }

        const supplier_id = req.user._id;

        if (type === 'email') {
            if (!email_subject || !email_body || !Array.isArray(target_emails) || target_emails.length === 0) {
                return res.status(400).json({ message: 'Email subject, body, and target emails are required' });
            }

            // Create premium B2B styled HTML body
            let htmlBody = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="text-align: center; border-bottom: 2px solid #ff6600; padding-bottom: 20px; margin-bottom: 20px;">
                        <h1 style="color: #ff6600; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Exclusive Sourcing Offer</h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">From your verified B2B supplier</p>
                    </div>
                    <div style="padding: 10px 0; line-height: 1.7; color: #334155; font-size: 15px;">
                        ${email_body.replace(/\n/g, '<br/>')}
                    </div>
            `;

            if (target_product_id) {
                const product = await Product.findById(target_product_id);
                if (product) {
                    const productUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/product/${product.slug}`;
                    htmlBody += `
                        <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; margin: 24px 0; border: 1.5px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px; font-weight: 700;">${product.name}</h3>
                                <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">${product.description ? product.description.substring(0, 150) + '...' : ''}</p>
                                <a href="${productUrl}" style="display: inline-block; padding: 10px 18px; background-color: #ff6600; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-align: center; box-shadow: 0 4px 12px rgba(255,102,0,0.25);">View Product Details</a>
                            </div>
                        </div>
                    `;
                }
            } else if (target_type === 'shop') {
                const shopUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/supplier/${supplier_id}`;
                htmlBody += `
                    <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; margin: 24px 0; border: 1.5px solid #e2e8f0; text-align: center;">
                        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">Visit Our Entire B2B Storefront</h3>
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">Explore our complete catalog of certified premium products and custom manufacturing services.</p>
                        <a href="${shopUrl}" style="display: inline-block; padding: 10px 18px; background-color: #ff6600; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-align: center; box-shadow: 0 4px 12px rgba(255,102,0,0.25);">Visit Storefront</a>
                    </div>
                `;
            }

            if (coupon_code) {
                htmlBody += `
                    <div style="background-color: #fffaf0; border: 2px dashed #ff6600; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #7c2d12; letter-spacing: 1.5px;">Special Incentive Voucher</p>
                        <div style="font-size: 26px; font-weight: 800; color: #ff6600; font-family: monospace; background: #ffedd5; padding: 8px 16px; display: inline-block; border-radius: 6px; letter-spacing: 3px; border: 1px solid #fed7aa;">${coupon_code.toUpperCase()}</div>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #7c2d12; font-weight: 600;">Enter this code at checkout to claim your discount.</p>
                    </div>
                `;
            }

            htmlBody += `
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; line-height: 1.5;">
                        <p style="margin: 0 0 4px 0;">This email was sent on behalf of a verified seller on our B2B marketplace.</p>
                        <p style="margin: 0;">&copy; Alibaba B2B Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `;

            // Loop and dispatch emails (wrapped in try/catch to be robust if SMTP isn't set up)
            let sentCount = 0;
            for (const email of target_emails) {
                try {
                    await sendMail({
                        to: email,
                        subject: email_subject,
                        html: htmlBody
                    });
                    sentCount++;
                } catch (err) {
                    console.error(`Failed to send campaign email to ${email}:`, err);
                }
            }

            const campaign = new Campaign({
                supplier_id,
                name,
                type: 'email',
                target_type,
                target_product_id: target_product_id || null,
                coupon_code: coupon_code || '',
                email_subject,
                email_body,
                target_emails,
                status: 'completed',
                sent_at: new Date()
            });

            await campaign.save();
            return res.status(201).json(campaign);
        } else if (type === 'affiliate') {
            // Generate unique affiliate referral code
            const referral_code = 'CAMP_' + Math.random().toString(36).substr(2, 9).toUpperCase();

            const campaign = new Campaign({
                supplier_id,
                name,
                type: 'affiliate',
                target_type,
                target_product_id: target_product_id || null,
                coupon_code: coupon_code || '',
                referral_code,
                status: 'active'
            });

            await campaign.save();
            return res.status(201).json(campaign);
        } else if (type === 'sms') {
            const { sms_body, target_phones } = req.body;
            if (!sms_body || !Array.isArray(target_phones) || target_phones.length === 0) {
                return res.status(400).json({ message: 'SMS body and target phone numbers are required' });
            }

            const { sendSms } = require('../services/smsService');

            // Dispatch SMS campaigns asynchronously
            for (const phone of target_phones) {
                sendSms(phone, sms_body).catch(smsErr => {
                    console.error(`Failed to send campaign SMS to ${phone}:`, smsErr.message);
                });
            }

            const campaign = new Campaign({
                supplier_id,
                name,
                type: 'sms',
                target_type,
                target_product_id: target_product_id || null,
                coupon_code: coupon_code || '',
                sms_body,
                target_phones,
                status: 'completed',
                sent_at: new Date()
            });

            await campaign.save();
            return res.status(201).json(campaign);
        } else {
            return res.status(400).json({ message: 'Invalid campaign type' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all campaigns for a supplier or admin
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { supplier_id: req.user._id };
        const campaigns = await Campaign.find(query)
            .populate('target_product_id', 'name main_image images slug')
            .populate('supplier_id', 'first_name last_name company_name')
            .sort({ createdAt: -1 });

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get details of a specific campaign
// @route   GET /api/campaigns/:id
// @access  Private
exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('target_product_id', 'name main_image images slug')
            .populate('supplier_id', 'first_name last_name company_name');

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && campaign.supplier_id._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Track a click on an affiliate campaign
// @route   POST /api/campaigns/track/:referral_code
// @access  Public
exports.trackCampaignClick = async (req, res) => {
    try {
        const campaign = await Campaign.findOneAndUpdate(
            { referral_code: req.params.referral_code.toUpperCase() },
            { $inc: { clicks: 1 } },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ message: 'Referral campaign not found' });
        }

        res.json({ success: true, clicks: campaign.clicks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && campaign.supplier_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
