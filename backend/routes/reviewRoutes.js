const express = require('express');
const router = express.Router();
const { 
    createReview, 
    getProductReviews, 
    getMyReviews,
    getSupplierProductReviews,
    replyToReview,
    reportReview,
    adminGetReviews,
    adminToggleHideReview,
    adminUpdateReview,
    adminDeleteReview,
    adminDeleteReply
} = require('../controllers/reviewController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadSingleMedia } = require('../middlewares/uploadMiddleware');
const { uploadSingleImage } = require('../controllers/productController');

// Public routes
router.get('/product/:productId', getProductReviews);

// Private buyer/general routes
router.post('/upload-media', protect, uploadSingleMedia, uploadSingleImage);
router.post('/', protect, createReview);
router.get('/my-reviews', protect, getMyReviews);
router.post('/:id/report', protect, reportReview);

// Private supplier routes
router.get('/supplier/my-products', protect, authorizeRoles('supplier'), getSupplierProductReviews);
router.put('/:id/reply', protect, authorizeRoles('supplier'), replyToReview);

// Private admin routes
router.get('/admin/all', protect, authorizeRoles('admin'), adminGetReviews);
router.put('/admin/:id/toggle-hide', protect, authorizeRoles('admin'), adminToggleHideReview);
router.put('/admin/:id', protect, authorizeRoles('admin'), adminUpdateReview);
router.delete('/admin/:id', protect, authorizeRoles('admin'), adminDeleteReview);
router.delete('/admin/:id/reply', protect, authorizeRoles('admin'), adminDeleteReply);

module.exports = router;
