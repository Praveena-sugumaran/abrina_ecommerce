const express = require('express');
const router = express.Router();
const giftCardController = require('../controllers/giftCardController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Public Gift Card Products list (Customer side)
router.get('/public-templates', giftCardController.getPublicTemplates);

// Customer endpoints
router.post('/redeem', protect, giftCardController.redeemGiftCard);
router.post('/apply', protect, giftCardController.applyGiftCard);
router.post('/purchase', protect, giftCardController.purchaseGiftCard);
router.get('/my', protect, giftCardController.getMyGiftCards);

// Admin-only endpoints to manage Gift Card products & generated cards
router.get('/admin/templates', protect, authorizeRoles('admin'), giftCardController.getAdminTemplates);
router.post('/admin/templates', protect, authorizeRoles('admin'), giftCardController.createTemplate);
router.put('/admin/templates/:id', protect, authorizeRoles('admin'), giftCardController.updateTemplate);
router.delete('/admin/templates/:id', protect, authorizeRoles('admin'), giftCardController.deleteTemplate);

router.get('/', protect, authorizeRoles('admin'), giftCardController.getGiftCards);
router.post('/create', protect, authorizeRoles('admin'), giftCardController.createGiftCard);

module.exports = router;
