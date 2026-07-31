const express = require('express');
const router = express.Router();
const { stripeWebhook, carrierTrackingWebhook } = require('../controllers/webhookController');

// Stripe requires the raw request body to verify the signature
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// Carrier Tracking Webhook (Shippo / EasyPost / FedEx / DHL)
router.post('/carrier-tracking', express.json(), carrierTrackingWebhook);

module.exports = router;

