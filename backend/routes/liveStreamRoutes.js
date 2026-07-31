const express = require('express');
const router = express.Router();
const {
    createStream,
    listStreams,
    getStreamDetails,
    updateStreamStatus,
    joinStream,
    leaveStream,
    requestQuoteDuringStream,
    pinProduct,
    startPoll,
    raiseHand,
    getStreamMessages,
    getStreamAnalytics,
    deleteStream
} = require('../controllers/liveStreamController');
const { protect } = require('../middlewares/authMiddleware');

// Middleware to ensure user has a supplier role
const requireSupplier = (req, res, next) => {
    const roles = req.user.roles || [req.user.role];
    if (roles.includes('supplier') || roles.includes('admin')) {
        return next();
    }
    return res.status(403).json({ message: 'Only suppliers or administrators can perform this action' });
};

// Route definitions
router.post('/', protect, requireSupplier, createStream);
router.get('/', listStreams);
router.get('/:id', getStreamDetails);
router.put('/:id/status', protect, requireSupplier, updateStreamStatus);
router.delete('/:id', protect, requireSupplier, deleteStream);
router.post('/:id/join', joinStream);
router.post('/:id/leave', leaveStream);
router.post('/:id/quote', protect, requestQuoteDuringStream);

// Enterprise extensions
router.put('/:id/pin', protect, requireSupplier, pinProduct);
router.post('/:id/poll', protect, requireSupplier, startPoll);
router.post('/:id/raise-hand', protect, raiseHand);
router.get('/:id/messages', getStreamMessages);
router.get('/:id/analytics', protect, requireSupplier, getStreamAnalytics);

module.exports = router;
