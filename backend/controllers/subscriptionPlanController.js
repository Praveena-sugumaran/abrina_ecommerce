const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Razorpay = require('razorpay');
const { addJob } = require('../services/queueService');

// @desc    Get all subscription plans
// @route   GET /api/subscription-plans
// @access  Public
exports.getPlans = async (req, res) => {
    try {
        const filter = {};
        if (req.query.type) filter.plan_type = req.query.type;
        const plans = await SubscriptionPlan.find(filter).sort({ level: 1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create a new subscription plan
// @route   POST /api/subscription-plans
// @access  Admin
exports.createPlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(plan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update a subscription plan
// @route   PUT /api/subscription-plans/:id
// @access  Admin
exports.updatePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a subscription plan
// @route   DELETE /api/subscription-plans/:id
// @access  Admin
exports.deletePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Purchase a subscription plan
// @route   POST /api/subscription-plans/purchase/:id
// @access  Private
exports.purchasePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (plan.price > 0) {
            const { paymentMethod } = req.body;
            const targetMethod = paymentMethod || 'stripe';
            const PaymentSetting = require('../models/PaymentSetting');
            const settings = await PaymentSetting.findOne({ provider: targetMethod, enable: true });

            if (!settings && targetMethod !== 'stripe') {
                return res.status(400).json({ message: `${targetMethod} payment is not enabled` });
            }

            const FRONTEND_URL = process.env.FRONTEND_URL || '';
            const basePath = req.body.basePath || '/dashboard';
            const returnUrl = 'subscription';

            if (targetMethod === 'stripe') {
                const stripeInstance = require('stripe')(settings?.secret_key || process.env.STRIPE_SECRET_KEY);
                const session = await stripeInstance.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Subscription: ${plan.name}`,
                                description: plan.description || `Plan duration: ${plan.duration_value} ${plan.duration_type}`
                            },
                            unit_amount: Math.round(plan.price * 100),
                        },
                        quantity: 1,
                    }],
                    mode: 'payment',
                    success_url: `${FRONTEND_URL}${basePath}/${returnUrl}?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan._id}&status=success`,
                    cancel_url: `${FRONTEND_URL}${basePath}/${returnUrl}?status=cancel`,
                    client_reference_id: req.user._id.toString(),
                    metadata: {
                        type: 'subscription',
                        planId: plan._id.toString()
                    }
                });

                return res.json({ id: session.id, url: session.url });
            } else if (targetMethod === 'paypal') {
                const isMock = !settings.public_key || !settings.secret_key ||
                               settings.public_key.includes('mock') || settings.secret_key.includes('mock');
                if (isMock) {
                    const mockOrderId = `paypal_sub_mock_${Date.now()}`;
                    return res.json({
                        id: mockOrderId,
                        url: `${FRONTEND_URL}${basePath}/${returnUrl}?status=success&plan_id=${plan._id}&method=paypal&orderId=${mockOrderId}&is_mock=true`
                    });
                }
                const clientId = settings.public_key;
                const clientSecret = settings.secret_key;
                const environment = settings.live_mode 
                    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
                    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
                const client = new paypal.core.PayPalHttpClient(environment);

                const request = new paypal.orders.OrdersCreateRequest();
                request.prefer("return=representation");
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: 'USD',
                            value: plan.price.toFixed(2)
                        },
                        description: `Subscription: ${plan.name}`
                    }],
                    application_context: {
                        return_url: `${FRONTEND_URL}${basePath}/${returnUrl}?status=success&plan_id=${plan._id}&method=paypal`,
                        cancel_url: `${FRONTEND_URL}${basePath}/${returnUrl}?status=cancel`
                    }
                });

                const order = await client.execute(request);
                const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
                return res.json({ id: order.result.id, url: approvalUrl });
            } else if (targetMethod === 'razorpay') {
                const isMockKey = !settings.public_key || settings.public_key.includes('mock');
                if (isMockKey) {
                    return res.json({
                        id: `rzp_order_mock_${Date.now()}`,
                        amount: Math.round(plan.price * 100),
                        currency: "INR",
                        key: settings.public_key || "rzp_test_mock_key",
                        plan_id: plan._id,
                        is_mock: true
                    });
                } else {
                    const canCreateOrder = settings.secret_key && !settings.secret_key.includes('mock');
                    let orderCreated = false;
                    if (canCreateOrder) {
                        try {
                            const instance = new Razorpay({
                                key_id: settings.public_key,
                                key_secret: settings.secret_key,
                            });

                            const options = {
                                amount: Math.round(plan.price * 100),
                                currency: "INR",
                                receipt: `sub_${Date.now()}`,
                            };

                            const rzpOrder = await instance.orders.create(options);
                            return res.json({ 
                                id: rzpOrder.id, 
                                amount: rzpOrder.amount, 
                                currency: rzpOrder.currency,
                                key: settings.public_key,
                                plan_id: plan._id,
                                is_mock: false
                            });
                        } catch (err) {
                            console.error("Failed to create real Razorpay order for subscription:", err);
                        }
                    }
                    if (!orderCreated) {
                        return res.json({
                            id: `rzp_order_mock_${Date.now()}`,
                            amount: Math.round(plan.price * 100),
                            currency: "INR",
                            key: settings.public_key,
                            plan_id: plan._id,
                            is_mock: false,
                            use_standard_checkout: true
                        });
                    }
                }
            }
        } else {
            // Free plan logic
            const startDate = new Date();
            const endDate = new Date();

            if (plan.duration_type === 'day') endDate.setDate(endDate.getDate() + plan.duration_value);
            else if (plan.duration_type === 'month') endDate.setMonth(endDate.getMonth() + plan.duration_value);
            else if (plan.duration_type === 'year') endDate.setFullYear(endDate.getFullYear() + plan.duration_value);

            user.subscription_plan = plan._id;
            user.subscription_start = startDate;
            user.subscription_end = endDate;
            user.plan_active = true;
            user.subscription_status = 'active';

            await user.save({ validateBeforeSave: false });

            // 📧 Send Subscription Activation Email for Free Plan
            try {
                const { addJob } = require('../services/queueService');
                await addJob('email', {
                    to: user.email,
                    subject: `Subscription Activated - ${plan.name}`,
                    text: `Your subscription to ${plan.name} has been activated. It will expire on ${endDate.toLocaleDateString()}.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #ff6600;">Subscription Activated!</h2>
                            <p>Hi ${user.first_name},</p>
                            <p>Your subscription to the <strong>${plan.name}</strong> plan is now active.</p>
                            <div style="background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p><strong>Plan:</strong> ${plan.name} (Free Trial)</p>
                                <p><strong>Start Date:</strong> ${startDate.toLocaleDateString()}</p>
                                <p><strong>Expiry Date:</strong> ${endDate.toLocaleDateString()}</p>
                            </div>
                            <p>Thank you for choosing Alibaba Demo.</p>
                            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
                        </div>
                    `
                });
            } catch (mailErr) {
                console.error('Free subscription activation email error:', mailErr);
            }

            res.json({ message: 'Plan purchased successfully', subscription_plan: plan });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify Subscription Stripe session and update status
// @route   POST /api/subscription-plans/verify-session
// @access  Private
exports.verifySession = async (req, res) => {
    try {
        const { sessionId, planId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            await activateUserSubscription(req.user._id, planId);
            return res.json({ success: true, message: 'Subscription updated to paid.' });
        }
        res.json({ success: false, message: 'Payment not verified' });
    } catch (error) {
        console.error('Subscription Session Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Razorpay Subscription
// @route   POST /api/subscription-plans/verify-razorpay
// @access  Private
exports.verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
        const crypto = require('crypto');
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'razorpay' });

        if (!settings || !settings.enable) {
            return res.status(400).json({ success: false, message: 'Razorpay is not enabled' });
        }

        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (razorpay_order_id && razorpay_order_id.startsWith('rzp_order_mock_')) ||
                       !razorpay_signature;

        if (isMock) {
            await activateUserSubscription(req.user._id, planId);
            return res.json({ success: true });
        }

        if (!settings.secret_key) {
            return res.status(400).json({ success: false, message: 'Razorpay secret key is not configured' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", settings.secret_key)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            await activateUserSubscription(req.user._id, planId);
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// @desc    Verify PayPal Subscription
// @route   POST /api/subscription-plans/verify-paypal
// @access  Private
exports.verifyPayPal = async (req, res) => {
    try {
        const { orderId, planId } = req.body;
        const PaymentSetting = require('../models/PaymentSetting');
        const settings = await PaymentSetting.findOne({ provider: 'paypal', enable: true });

        if (!settings) return res.status(400).json({ message: 'PayPal not enabled' });

        const isMock = !settings.public_key || !settings.secret_key ||
                       settings.public_key.includes('mock') || settings.secret_key.includes('mock') ||
                       (orderId && orderId.startsWith('paypal_sub_mock_'));

        if (isMock) {
            await activateUserSubscription(req.user._id, planId);
            return res.json({ success: true });
        }

        if (!settings.public_key || !settings.secret_key) {
            return res.status(400).json({ message: 'PayPal keys are not configured' });
        }

        const environment = settings.live_mode
            ? new paypal.core.LiveEnvironment(settings.public_key, settings.secret_key)
            : new paypal.core.SandboxEnvironment(settings.public_key, settings.secret_key);
        const client = new paypal.core.PayPalHttpClient(environment);

        const getRequest = new paypal.orders.OrdersGetRequest(orderId);
        let orderDetail;
        try {
            orderDetail = await client.execute(getRequest);
        } catch (getErr) {
            console.error('PayPal Subscription Get Error:', getErr.message);
            return res.status(400).json({ success: false, message: 'Failed to retrieve PayPal order details' });
        }

        let status = orderDetail.result.status;
        if (status === 'APPROVED') {
            try {
                const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
                captureRequest.requestBody({});
                const capture = await client.execute(captureRequest);
                status = capture.result.status;
            } catch (captureErr) {
                console.error('PayPal Subscription Capture Error:', captureErr.message);
                const doubleCheck = await client.execute(getRequest);
                status = doubleCheck.result.status;
            }
        }

        if (status === 'COMPLETED') {
            await activateUserSubscription(req.user._id, planId);
            res.json({ success: true });
        } else {
            res.status(400).json({ message: `Payment not completed (Status: ${status})` });
        }
    } catch (err) {
        console.error('verifyPayPal subscription error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Shared helper to activate subscription
async function activateUserSubscription(userId, planId) {
    const user = await User.findById(userId);
    const plan = await SubscriptionPlan.findById(planId);
    if (!user || !plan) throw new Error('User or Plan not found');

    const startDate = new Date();
    const endDate = new Date();

    if (plan.duration_type === 'day') endDate.setDate(endDate.getDate() + plan.duration_value);
    else if (plan.duration_type === 'month') endDate.setMonth(endDate.getMonth() + plan.duration_value);
    else if (plan.duration_type === 'year') endDate.setFullYear(endDate.getFullYear() + plan.duration_value);

    user.subscription_plan = plan._id;
    user.subscription_start = startDate;
    user.subscription_end = endDate;
    user.plan_active = true;
    user.subscription_status = 'active';

    await user.save({ validateBeforeSave: false });

    // Send Email
    try {
        const { addJob: addMailJob } = require('../services/queueService');
        await addMailJob('email', {
            to: user.email,
            subject: `Subscription Activated - ${plan.name}`,
            html: `<h3>Subscription Activated!</h3><p>Hi ${user.first_name}, your subscription to <b>${plan.name}</b> is active until ${endDate.toLocaleDateString()}.</p>`
        });
    } catch (e) { console.error('Sub email error:', e); }
}
