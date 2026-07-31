const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, checkWishlist, toggleWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .get(protect, getWishlist);

router.route('/toggle/:productId')
    .post(protect, toggleWishlist);

router.route('/:productId')
    .post(protect, addToWishlist)
    .delete(protect, removeFromWishlist);

router.route('/check/:productId')
    .get(protect, checkWishlist);

module.exports = router;
