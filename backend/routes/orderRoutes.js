const express = require('express');
const router = express.Router();
const { protect, softProtect } = require('../middlewares/authMiddleware');
const { createCheckoutSession, getMyOrders, getOrderById, verifySession, getAllOrdersAdmin, getSupplierOrders, updateOrderStatus, checkoutQuote, confirmDelivery, deleteOrderAdmin, clearPendingOrdersAdmin, verifyRazorpayPayment, verifyPayPalPayment, payBalanceOrder, buyerCancelOrder, updateExchangeTracking, confirmExchangeDelivery, calculateShippingRates, getShippingLabel, lookupGuestOrder } = require('../controllers/orderController');

router.post('/checkout-quote/:quoteId', protect, checkoutQuote);
router.post('/create-checkout-session', softProtect, createCheckoutSession);
router.post('/verify-session', softProtect, verifySession);
router.post('/verify-razorpay', softProtect, verifyRazorpayPayment);
router.post('/verify-paypal', softProtect, verifyPayPalPayment);
router.post('/shipping/rates', softProtect, calculateShippingRates);
router.get('/:id/shipping-label', protect, getShippingLabel);
router.post('/:id/pay-balance', protect, payBalanceOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/supplier-orders', protect, getSupplierOrders);
router.get('/admin/all', protect, getAllOrdersAdmin);
router.get('/guest/lookup', softProtect, lookupGuestOrder);
router.get('/:id', softProtect, getOrderById);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.put('/:id/cancel', protect, buyerCancelOrder);
router.put('/:id/exchange-tracking', protect, updateExchangeTracking);
router.put('/:id/confirm-exchange-delivery', protect, confirmExchangeDelivery);
router.delete('/admin/clear-pending', protect, clearPendingOrdersAdmin);
router.delete('/admin/:id', protect, deleteOrderAdmin);

module.exports = router;
