const express = require('express');
const router = express.Router();
const {
    subscribeNewsletter,
    getSubscribers,
    unsubscribeNewsletter,
    sendNewsletterCampaign,
    getCampaigns
} = require('../controllers/newsletterController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Public routes
router.post('/subscribe', subscribeNewsletter);

// Protected routes (Admin & Suppliers/Sellers)
router.get('/subscribers', protect, authorizeRoles('admin', 'supplier', 'seller'), getSubscribers);
router.delete('/subscribers/:id', protect, authorizeRoles('admin', 'supplier', 'seller'), unsubscribeNewsletter);
router.post('/campaign/send', protect, authorizeRoles('admin', 'supplier', 'seller'), sendNewsletterCampaign);
router.post('/campaigns/send', protect, authorizeRoles('admin', 'supplier', 'seller'), sendNewsletterCampaign);
router.get('/campaigns', protect, authorizeRoles('admin', 'supplier', 'seller'), getCampaigns);

module.exports = router;
