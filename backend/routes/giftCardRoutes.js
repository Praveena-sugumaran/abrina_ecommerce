const express = require('express');
const router = express.Router();
const giftCardController = require('../controllers/giftCardController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Redeem Gift Card to user's wallet
router.post('/redeem', protect, giftCardController.redeemGiftCard);
router.post('/apply', protect, giftCardController.applyGiftCard);
router.post('/purchase', protect, giftCardController.purchaseGiftCard);
router.get('/my', protect, giftCardController.getMyGiftCards);

// Admin-only endpoints to manage gift cards
router.get('/', protect, authorizeRoles('admin'), giftCardController.getGiftCards);
router.post('/create', protect, authorizeRoles('admin'), giftCardController.createGiftCard);

module.exports = router;
