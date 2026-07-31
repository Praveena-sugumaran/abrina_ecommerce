const express = require('express');
const router = express.Router();
const {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    purchasePlan,
    verifySession,
    verifyRazorpay,
    verifyPayPal
} = require('../controllers/subscriptionPlanController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.route('/')
    .get(getPlans)
    .post(protect, authorizeRoles('admin'), createPlan);

router.post('/purchase/:id', protect, purchasePlan);
router.post('/verify-session', protect, verifySession);
router.post('/verify-razorpay', protect, verifyRazorpay);
router.post('/verify-paypal', protect, verifyPayPal);

router.route('/:id')
    .put(protect, authorizeRoles('admin'), updatePlan)
    .delete(protect, authorizeRoles('admin'), deletePlan);

module.exports = router;
