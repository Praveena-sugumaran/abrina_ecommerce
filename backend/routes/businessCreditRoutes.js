const express = require('express');
const router = express.Router();
const {
    requestCredit,
    getMyCreditLimit,
    getAllCreditRequestsAdmin,
    updateCreditLimitAdmin,
    repayCredit
} = require('../controllers/businessCreditController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Protected buyer routes
router.use(protect);

router.post('/request', authorizeRoles('buyer'), requestCredit);
router.get('/my-limit', authorizeRoles('buyer'), getMyCreditLimit);
router.post('/repay', authorizeRoles('buyer'), repayCredit);

// Admin-only review routes
router.get('/admin/requests', authorizeRoles('admin'), getAllCreditRequestsAdmin);
router.put('/admin/approve/:id', authorizeRoles('admin'), updateCreditLimitAdmin);

module.exports = router;
