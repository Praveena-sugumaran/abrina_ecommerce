const express = require('express');
const router = express.Router();
const {
    createAdCampaign,
    getAdCampaigns,
    updateAdCampaign,
    trackAdClick,
    getPublicSponsoredProducts,
    trackAdImpression
} = require('../controllers/adController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Public click tracking
router.post('/click/:id', trackAdClick);

// Public impression tracking
router.post('/impression/:id', trackAdImpression);

// Public sponsored products for homepage
router.get('/public/sponsored', getPublicSponsoredProducts);

// Protected routes (Supplier/Admin)
router.use(protect);

router.route('/campaigns')
    .post(authorizeRoles('supplier'), createAdCampaign)
    .get(authorizeRoles('supplier', 'admin'), getAdCampaigns);

router.route('/campaigns/:id')
    .put(authorizeRoles('supplier', 'admin'), updateAdCampaign);

module.exports = router;
