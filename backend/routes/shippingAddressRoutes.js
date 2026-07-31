const express = require('express');
const router = express.Router();
const { 
    createAddress, 
    getAddresses, 
    updateAddress, 
    deleteAddress, 
    setDefault 
} = require('../controllers/shippingAddressController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, createAddress)
    .get(protect, getAddresses);

router.route('/:id')
    .put(protect, updateAddress)
    .delete(protect, deleteAddress);

router.put('/:id/set-default', protect, setDefault);

module.exports = router;
