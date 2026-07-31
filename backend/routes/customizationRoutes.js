const express = require('express');
const router = express.Router();
const {
    createCustomizationRequest,
    getMyCustomizationRequests,
    updateCustomizationRequest,
    getAdminCustomizationRequests,
    adminDeleteCustomizationRequest
} = require('../controllers/customizationController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadCustomizationFile, uploadQuotationFile } = require('../middlewares/uploadMiddleware');

router.route('/')
    .post(protect, uploadCustomizationFile, createCustomizationRequest)
    .get(protect, getMyCustomizationRequests);

router.route('/:id')
    .put(protect, uploadQuotationFile, updateCustomizationRequest);

router.route('/admin/all')
    .get(protect, authorizeRoles('admin'), getAdminCustomizationRequests);

router.route('/admin/:id')
    .delete(protect, authorizeRoles('admin'), adminDeleteCustomizationRequest);

module.exports = router;
