const express = require('express');
const router = express.Router();
const { createAddress, getAddresses, updateAddress, deleteAddress } = require('../controllers/billingAddressController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, createAddress)
    .get(protect, getAddresses);

router.route('/:id')
    .put(protect, updateAddress)
    .delete(protect, deleteAddress);

module.exports = router;
