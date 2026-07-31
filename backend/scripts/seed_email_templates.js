const mongoose = require('mongoose');
const dotenv = require('dotenv');
const EmailTemplate = require('../models/EmailTemplate');

dotenv.config();

const templates = [
    {
        name: 'Company Verification Approved',
        slug: 'company-verification-approved',
        subject: 'Your Company Verification is Approved!',
        body: '<h3>Congratulations {{first_name}}!</h3><p>Your company <strong>{{company_name}}</strong> has been successfully verified on our platform.</p><p>You can now start posting products and enjoying full supplier benefits.</p><p><a href="{{login_url}}">Login to your dashboard</a></p>',
        placeholders: ['first_name', 'company_name', 'login_url'],
        description: 'Sent when an admin approves a supplier\'s company verification request.'
    },
    {
        name: 'Company Verification Rejected',
        slug: 'company-verification-rejected',
        subject: 'Update on Your Company Verification Request',
        body: '<h3>Hello {{first_name}},</h3><p>We reviewed your company verification request for <strong>{{company_name}}</strong>.</p><p>Unfortunately, it was not approved for the following reason:</p><blockquote style="padding: 10px; background: #f9f9f9; border-left: 5px solid #ccc;">{{reason}}</blockquote><p>Please update your details and resubmit for verification.</p><p><a href="{{resubmit_url}}">Resubmit verification</a></p>',
        placeholders: ['first_name', 'company_name', 'reason', 'resubmit_url'],
        description: 'Sent when an admin rejects a supplier\'s company verification request.'
    },
    {
        name: 'Product Approved',
        slug: 'product-approved',
        subject: 'Your Product "{{product_name}}" is Live!',
        body: '<h3>Great news!</h3><p>Your product <strong>{{product_name}}</strong> has been approved by our team and is now live on the marketplace.</p><p><a href="{{product_url}}">View your product</a></p>',
        placeholders: ['product_name', 'product_url'],
        description: 'Sent when an admin approves a new product.'
    },
    {
        name: 'Product Rejected',
        slug: 'product-rejected',
        subject: 'Action Required: Your Product "{{product_name}}" was not approved',
        body: '<h3>Hello,</h3><p>Your product <strong>{{product_name}}</strong> was not approved for the marketplace.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please make the necessary changes and resubmit it.</p><p><a href="{{edit_url}}">Edit product</a></p>',
        placeholders: ['product_name', 'reason', 'edit_url'],
        description: 'Sent when an admin rejects a product submission.'
    },
    {
        name: 'Order Confirmation',
        slug: 'order-confirmation',
        subject: 'Order Confirmation - Order #{{order_id}}',
        body: '<h3>Thank you for your order!</h3><p>Hi {{first_name}}, your order <strong>#{{order_id}}</strong> has been confirmed.</p><p><strong>Total Amount:</strong> {{total_currency}}{{total_amount}}</p><p>We will notify you once the supplier ships your items.</p><p><a href="{{order_url}}">View order details</a></p>',
        placeholders: ['first_name', 'order_id', 'total_currency', 'total_amount', 'order_url'],
        description: 'Sent to the buyer when their order is confirmed (paid).'
    },
    {
        name: 'Order Shipped',
        slug: 'order-shipped',
        subject: 'Your order #{{order_id}} has been shipped!',
        body: '<h3>Good news!</h3><p>Hi {{first_name}}, your order <strong>#{{order_id}}</strong> has been shipped.</p><p><strong>Tracking Number:</strong> {{tracking_number}}</p><p><strong>Shipping Company:</strong> {{shipping_company}}</p><p><a href="{{order_url}}">Track your order</a></p>',
        placeholders: ['first_name', 'order_id', 'tracking_number', 'shipping_company', 'order_url'],
        description: 'Sent to the buyer when their order is marked as shipped.'
    },
    {
        name: 'Order Cancelled',
        slug: 'order-cancelled',
        subject: 'Order #{{order_id}} Cancelled',
        body: '<h3>Hello {{first_name}},</h3><p>Your order <strong>#{{order_id}}</strong> has been cancelled.</p><p>If you have already paid, a refund will be processed according to our policy.</p><p><a href="{{order_url}}">View order details</a></p>',
        placeholders: ['first_name', 'order_id', 'order_url'],
        description: 'Sent to the buyer when their order is cancelled.'
    },
    {
        name: 'New Inquiry Received',
        slug: 'new-inquiry-received',
        subject: 'New Inquiry Received - {{product_name}}',
        body: '<h3>Hello {{first_name}},</h3><p>You have received a new inquiry from <strong>{{buyer_name}}</strong> regarding your product: <strong>{{product_name}}</strong>.</p><div style="background: #f9f9f9; border-left: 4px solid #2980b9; padding: 15px; margin: 20px 0;"><p><strong>Subject:</strong> {{subject}}</p><p><strong>Quantity:</strong> {{quantity}} {{unit}}</p><p><strong>Message:</strong> {{message}}</p></div><p>Please log in to your dashboard to reply.</p><p><a href="{{inquiry_url}}">View Inquiry</a></p>',
        placeholders: ['first_name', 'buyer_name', 'product_name', 'subject', 'quantity', 'unit', 'message', 'inquiry_url'],
        description: 'Sent to the supplier when they receive a new product inquiry.'
    },
    {
        name: 'Referral Invite',
        slug: 'referral-invite',
        subject: '{{referrer_name}} invited you to join {{site_name}}!',
        body: '<h3>Hello!</h3><p>Your friend <strong>{{referrer_name}}</strong> has invited you to join <strong>{{site_name}}</strong>, the premier online B2B marketplace!</p><p>Sign up today using their invite link to get an exclusive welcome bonus of <strong>200 loyalty points</strong> ($2.00 value) instantly credited to your account!</p><div style="margin: 25px 0;"><a href="{{invite_url}}" style="background-color: #ff6a00; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation & Sign Up</a></div><p>Or use the referral code during registration: <strong>{{referral_code}}</strong></p><p>We look forward to seeing you on our platform!</p>',
        placeholders: ['referrer_name', 'site_name', 'invite_url', 'referral_code'],
        description: 'Sent to a friend when a user invites them via the referral sharing widget.'
    }
];

const seedTemplates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const t of templates) {
            await EmailTemplate.findOneAndUpdate(
                { slug: t.slug },
                t,
                { upsert: true, new: true }
            );
            console.log(`Updated/Created template: ${t.slug}`);
        }

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};

seedTemplates();
