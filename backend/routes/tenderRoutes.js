const express = require('express');
const router = express.Router();
const {
    createTender,
    getTenders,
    getTenderById,
    placeBid,
    awardTender
} = require('../controllers/tenderController');
const { protect, authorizeRoles, softProtect } = require('../middlewares/authMiddleware');

router.route('/')
    .get(softProtect, getTenders)
    .post(protect, authorizeRoles('buyer', 'admin'), createTender);

router.route('/:id')
    .get(softProtect, getTenderById);

router.route('/:id/bid')
    .post(protect, authorizeRoles('supplier', 'admin'), placeBid);

router.route('/:id/award')
    .post(protect, authorizeRoles('buyer', 'admin'), awardTender);

module.exports = router;
