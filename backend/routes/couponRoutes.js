const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getCoupons,
    validateCoupon,
    updateCoupon,
    deleteCoupon,
    getApplicableCoupons,
    getPublicCoupons
} = require('../controllers/couponController');
const { protect } = require('../middlewares/authMiddleware');

// Public route to fetch active promo codes
router.get('/public', getPublicCoupons);

router.use(protect); // all other coupon actions require authentication

router.route('/')
    .post(createCoupon)
    .get(getCoupons);

router.post('/validate', validateCoupon);
router.post('/applicable', getApplicableCoupons);

router.route('/:id')
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;

