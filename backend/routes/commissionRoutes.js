const express = require('express');
const router = express.Router();
const { protect, softProtect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
    getCommissions,
    createCommission,
    updateCommission,
    deleteCommission,
    calculateCommission
} = require('../controllers/commissionController');

// Admin routes
router.route('/')
    .get(protect, authorizeRoles('admin'), getCommissions)
    .post(protect, authorizeRoles('admin'), createCommission);

router.route('/:id')
    .put(protect, authorizeRoles('admin'), updateCommission)
    .delete(protect, authorizeRoles('admin'), deleteCommission);

// Public calculation (soft-protected for first-time user check)
router.post('/calculate', softProtect, calculateCommission);

module.exports = router;
