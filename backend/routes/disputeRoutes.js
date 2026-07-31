const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, checkPermission } = require('../middlewares/authMiddleware');
const {
    openDispute,
    getMyDisputes,
    addDisputeMessage,
    getAllDisputesAdmin,
    resolveDispute,
    updateDisputeTracking
} = require('../controllers/disputeController');

// Buyer / Supplier
router.post('/', protect, openDispute);                          // Open a dispute
router.get('/my-disputes', protect, getMyDisputes);              // Get my disputes
router.post('/:id/message', protect, addDisputeMessage);         // Add message to thread
router.put('/:id/tracking', protect, updateDisputeTracking);     // Update tracking details for return & exchange

// Admin
router.get('/admin/all', protect, authorizeRoles('admin'), checkPermission('disputes.view'), getAllDisputesAdmin);
router.put('/:id/resolve', protect, authorizeRoles('admin'), checkPermission('disputes.edit'), resolveDispute);

module.exports = router;
