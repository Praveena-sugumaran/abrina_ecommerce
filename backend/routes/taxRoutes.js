const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const {
    getTaxRules,
    getTaxRule,
    createTaxRule,
    updateTaxRule,
    deleteTaxRule,
    calculateTax
} = require('../controllers/taxController');

router.route('/')
    .get(protect, authorizeRoles('admin'), getTaxRules)
    .post(protect, authorizeRoles('admin'), createTaxRule);

router.route('/calculate')
    .post(calculateTax); // Public — called at checkout

router.route('/:id')
    .get(protect, authorizeRoles('admin'), getTaxRule)
    .put(protect, authorizeRoles('admin'), updateTaxRule)
    .delete(protect, authorizeRoles('admin'), deleteTaxRule);

module.exports = router;
