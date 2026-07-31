const express = require('express');
const router = express.Router();
const {
    createCampaign,
    getCampaigns,
    getCampaignById,
    trackCampaignClick,
    deleteCampaign
} = require('../controllers/campaignController');
const { protect } = require('../middlewares/authMiddleware');

// Public click tracking route
router.post('/track/:referral_code', trackCampaignClick);

// Protected campaign routes
router.use(protect);

router.route('/')
    .post(createCampaign)
    .get(getCampaigns);

router.route('/:id')
    .get(getCampaignById)
    .delete(deleteCampaign);

module.exports = router;
