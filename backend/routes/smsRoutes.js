const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const SmsSetting = require('../models/SmsSetting');

// @desc    Retrieve active Twilio setting configurations
// @route   GET /api/settings/sms
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
    try {
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required.' });

        let settings = await SmsSetting.findOne();
        if (!settings) {
            settings = await SmsSetting.create({ accountSid: '', authToken: '', fromNumber: '' });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update Twilio setting credentials
// @route   PUT /api/settings/sms
// @access  Private/Admin
router.put('/', protect, async (req, res) => {
    try {
        const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required.' });

        const { accountSid, authToken, fromNumber } = req.body;
        
        let settings = await SmsSetting.findOne();
        if (!settings) {
            settings = new SmsSetting();
        }

        settings.accountSid = accountSid;
        settings.authToken = authToken;
        settings.fromNumber = fromNumber;

        await settings.save();
        res.json({ success: true, message: 'SMS settings saved successfully!', settings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
