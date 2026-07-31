const express = require('express');
const router = express.Router();
const saleCampaignController = require('../controllers/saleCampaignController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Public endpoint to get currently running sale campaign
router.get('/active', saleCampaignController.getActiveCampaign);

// Admin-only CRUD operations
router.use(protect, authorizeRoles('admin'));

router.route('/')
    .get(saleCampaignController.getAllCampaigns)
    .post(saleCampaignController.createCampaign);

router.route('/:id')
    .put(saleCampaignController.updateCampaign)
    .delete(saleCampaignController.deleteCampaign);

module.exports = router;
