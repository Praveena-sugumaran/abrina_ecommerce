const express = require('express');
const router = express.Router();
const {
    createRFQ,
    getRFQs,
    getMyRFQs,
    getRFQById,
    submitQuote,
    getRFQQuotes,
    getMyQuotes,
    updateQuoteStatus,
    negotiateQuote,
    boostRFQ,
    purchaseLead
} = require('../controllers/rfqController');
const { protect, authorizeRoles, softProtect } = require('../middlewares/authMiddleware');
const { uploadRfqAttachments } = require('../middlewares/uploadMiddleware');

router.route('/')
    .get(softProtect, getRFQs)
    .post(protect, authorizeRoles('buyer', 'supplier', 'admin'), uploadRfqAttachments, createRFQ);

router.route('/my-rfqs')
    .get(protect, authorizeRoles('buyer', 'supplier', 'admin'), getMyRFQs);

router.get('/my-quotes', protect, authorizeRoles('supplier'), getMyQuotes);

router.route('/:id')
    .get(getRFQById);

router.put('/:id/boost', protect, boostRFQ);

router.route('/:id/purchase-lead')
    .post(protect, authorizeRoles('supplier', 'admin'), purchaseLead);

router.route('/:id/quote')
    .post(protect, authorizeRoles('supplier', 'admin'), submitQuote);

router.route('/:id/quotes')
    .get(protect, authorizeRoles('buyer', 'admin'), getRFQQuotes);

router.route('/quote/:quoteId/status')
    .put(protect, authorizeRoles('buyer', 'admin'), updateQuoteStatus);

router.route('/quote/:quoteId/negotiate')
    .put(protect, negotiateQuote);

module.exports = router;
