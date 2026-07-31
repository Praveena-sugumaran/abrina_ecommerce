const express = require('express');
const router = express.Router();
const { getLanguages, getCurrencies, getFooterSections, getHeaderNavigations, getCountries, getStates, getBusinessTypes, getShippingRules, calculateShipping, getTrustItems, getPartners, resetDatabase } = require('../controllers/commonController');
const { getPayoutMethods } = require('../controllers/admin/payoutMethodController');

router.get('/languages', getLanguages);
router.get('/currencies', getCurrencies);
router.get('/countries', getCountries);
router.get('/states/:countryId', getStates);
router.get('/business-types', getBusinessTypes);
router.get('/footer-sections', getFooterSections);
router.get('/header-navigations', getHeaderNavigations);
router.get('/shipping-rules', getShippingRules);
router.get('/trust-items', getTrustItems);
router.get('/partners', getPartners);
router.post('/shipping/calculate', calculateShipping);
router.get('/payout-methods', getPayoutMethods);
router.get('/reset-db', resetDatabase);


module.exports = router;

