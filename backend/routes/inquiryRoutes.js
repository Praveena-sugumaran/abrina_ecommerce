const express = require('express');
const router = express.Router();
const { createInquiry, getMyInquiries, getInquiryById, updateStatus } = require('../controllers/inquiryController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, createInquiry)
    .get(protect, getMyInquiries);

router.route('/:id')
    .get(protect, getInquiryById)
    .put(protect, updateStatus);

module.exports = router;
