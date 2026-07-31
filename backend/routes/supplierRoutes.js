const express = require('express');
const router = express.Router();
const { getSupplierStats } = require('../controllers/supplierController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/stats', protect, authorizeRoles('supplier', 'admin'), getSupplierStats);

module.exports = router;
