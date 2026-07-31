const express = require('express');
const router = express.Router();
const heroSlideController = require('../controllers/heroSlideController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.route('/')
    .get(heroSlideController.getActiveSlides)
    .post(protect, authorizeRoles('admin'), heroSlideController.createSlide);

router.route('/all')
    .get(protect, authorizeRoles('admin'), heroSlideController.getAllSlides);

router.route('/:id/track')
    .post(heroSlideController.trackSlide);

router.route('/:id')
    .put(protect, authorizeRoles('admin'), heroSlideController.updateSlide)
    .delete(protect, authorizeRoles('admin'), heroSlideController.deleteSlide);

module.exports = router;
