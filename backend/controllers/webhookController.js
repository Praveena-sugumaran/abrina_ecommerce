const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { decrementProductStock } = require('./productController');

exports.stripeWebhook = async (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Stripe requires the raw body, which we handle in server.js
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            // Fulfill the orders (could be multiple if multi-supplier checkout)
            try {
                if (session.metadata.type === 'subscription') {
                    const { planId } = session.metadata;
                    const userId = session.client_reference_id;
                    
                    if (userId && planId) {
                        // Import helper or model to activate
                        const User = require('../models/User');
                        const SubscriptionPlan = require('../models/SubscriptionPlan');
                        const user = await User.findById(userId);
                        const plan = await SubscriptionPlan.findById(planId);
                        
                        if (user && plan) {
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
                        }
                    }
                } else {
                    const orders = await Order.find({
                        $or: [
                            { stripe_session_id: session.id },
                            { deposit_stripe_session_id: session.id },
                            { balance_stripe_session_id: session.id }
                        ]
                    });
                    if (orders && orders.length > 0) {
                        const { completePaymentPostTasks, createOrderStatusLog } = require('./orderController');
                        for (const order of orders) {
                            if (order.is_emi) {
                                if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                                    order.payment_status = 'partially_paid';
                                    order.status = 'confirmed';
                                    await order.save();

                                    // Find and update EmiSchedule first installment
                                    const EmiSchedule = require('../models/EmiSchedule');
                                    const schedule = await EmiSchedule.findOne({ order_id: order._id });
                                    if (schedule && schedule.installments.length > 0) {
                                        schedule.installments[0].status = 'paid';
                                        schedule.installments[0].paid_at = new Date();
                                        schedule.installments[0].gateway = 'Stripe';
                                        schedule.installments[0].payment_intent_id = session.payment_intent || 'stripe_webhook';
                                        await schedule.save();
                                    }

                                    // Decrement stock
                                    if (order.order_items && order.order_items.length > 0) {
                                        await decrementProductStock(order.order_items);
                                    }

                                    if (createOrderStatusLog) {
                                        await createOrderStatusLog(order._id, 'First Installment Paid', 'First EMI installment verified successfully via Stripe Webhook');
                                    }
                                    if (completePaymentPostTasks) {
                                        await completePaymentPostTasks(order, req.io, 'full');
                                    }
                                }
                            } else if (order.is_split_payment) {
                                if (order.balance_stripe_session_id === session.id) {
                                    if (order.payment_status !== 'paid') {
                                        order.payment_status = 'paid';
                                        order.balance_paid = true;
                                        await order.save();
                                        if (createOrderStatusLog) {
                                            await createOrderStatusLog(order._id, 'Balance Paid', 'Balance payment (70%) verified successfully via Stripe Webhook');
                                        }
                                        if (completePaymentPostTasks) {
                                            await completePaymentPostTasks(order, req.io, 'balance');
                                        }
                                    }
                                } else {
                                    if (order.payment_status !== 'partially_paid' && order.payment_status !== 'paid') {
                                        order.payment_status = 'partially_paid';
                                        order.deposit_paid = true;
                                        order.status = 'confirmed';
                                        await order.save();
                                        if (createOrderStatusLog) {
                                            await createOrderStatusLog(order._id, 'Deposit Paid', 'Deposit payment (30%) verified successfully via Stripe Webhook');
                                        }
                                        if (completePaymentPostTasks) {
                                            await completePaymentPostTasks(order, req.io, 'deposit');
                                        }
                                    }
                                }
                            } else {
                                if (order.payment_status !== 'paid') {
                                    order.payment_status = 'paid';
                                    order.status = 'confirmed';
                                    await order.save();
                                    
                                    // Decrement stock
                                    if (order.order_items && order.order_items.length > 0) {
                                        await decrementProductStock(order.order_items);
                                    }
                                    
                                    if (completePaymentPostTasks) {
                                        await completePaymentPostTasks(order, req.io, 'full');
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error updating orders/subscriptions upon payment webhook:", err);
            }
            break;
        default:
            // Unknown/unhandled webhook event; ignore safely.
    }

    res.json({ received: true });
};
