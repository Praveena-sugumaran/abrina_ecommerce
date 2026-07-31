const express = require('express');
const router = express.Router();
const {
    createEnquiry,
    bulkCreateEnquiry,
    getMyEnquiries,
    replyEnquiry,
    closeEnquiry,
    getAdminEnquiries,
    adminDeleteEnquiry
} = require('../controllers/enquiryController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadEnquiryFile } = require('../middlewares/uploadMiddleware');

router.route('/')
    .post(protect, uploadEnquiryFile, createEnquiry)
    .get(protect, getMyEnquiries);

router.route('/bulk')
    .post(protect, uploadEnquiryFile, bulkCreateEnquiry);

router.route('/:id/reply')
    .post(protect, replyEnquiry);

router.route('/:id/close')
    .put(protect, closeEnquiry);

router.route('/admin/all')
    .get(protect, authorizeRoles('admin'), getAdminEnquiries);

router.route('/admin/:id')
    .delete(protect, authorizeRoles('admin'), adminDeleteEnquiry);

module.exports = router;
