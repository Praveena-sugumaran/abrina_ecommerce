const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const SiteSetting = require('../models/SiteSetting');
const { isLocalEnvironment, activateLicense } = require('../services/licenseService');

// Middleware to prevent wizard access once installation is finalized
const blockIfInstalled = async (req, res, next) => {
    try {
        const settings = await SiteSetting.findOne();
        if (settings && settings.is_installed) {
            return res.status(403).json({ success: false, message: 'Installation has already been completed.' });
        }
        next();
    } catch (err) {
        next();
    }
};

// @route   GET /api/install/status
// @desc    Get the current installation state
router.get('/status', async (req, res) => {
    try {
        let settings = await SiteSetting.findOne();
        if (!settings) {
            // Seed settings defaults if not present
            settings = new SiteSetting();
            await settings.save();
        }

        if (settings.is_installed) {
            return res.json({ isInstalled: true });
        }

        const adminCount = await User.countDocuments({ roles: 'admin' });
        const localDev = isLocalEnvironment(req.hostname);

        res.json({
            isInstalled: false,
            hasAdmin: adminCount > 0,
            isLocal: localDev
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/install/db-test
// @desc    Verify database connection is active
router.post('/db-test', blockIfInstalled, async (req, res) => {
    try {
        const state = mongoose.connection.readyState;
        if (state === 1) {
            const dbName = mongoose.connection.name;
            
            // Check if this is a first-time installation (no products currently exist in DB)
            const Product = require('../models/Product');
            const productCount = await Product.countDocuments();
            let importMessage = '';
            
            if (productCount === 0) {
                console.log('First-time installation detected. Importing backup dummy data...');
                const dummyDataService = require('../services/dummyDataService');
                await dummyDataService.importDummyData(null, 'installer');
                console.log('Backup dummy data successfully imported on first-time install.');
                importMessage = ' and successfully initialized demo data';
            }
            
            return res.json({ 
                success: true, 
                message: `Successfully connected to MongoDB database: ${dbName}${importMessage}.` 
            });
        }
        res.status(500).json({ success: false, message: 'Database connection is inactive.' });
    } catch (err) {
        console.error('Failed to initialize database during installation test:', err);
        res.status(500).json({ success: false, message: `Database link verified, but seed import failed: ${err.message}` });
    }
});

// @route   POST /api/install/create-admin
// @desc    Register initial super admin account
router.post('/create-admin', blockIfInstalled, async (req, res) => {
    const { email, password, first_name, last_name } = req.body;
    try {
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'Please provide email, password, first and last name.' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists.' });
        }

        const admin = new User({
            first_name,
            last_name,
            email,
            password,
            roles: ['admin'],
            status: 'active',
            is_verified: true
        });

        await admin.save();
        res.status(201).json({ success: true, message: 'Super admin account created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/install/verify-license
// @desc    Verify license code with remote server
router.post('/verify-license', async (req, res) => {
    const { purchase_code, email } = req.body;
    try {
        const host = req.hostname;
        if (isLocalEnvironment(host)) {
            // Local dev auto activation
            const result = await activateLicense(null, null, host);
            return res.json(result);
        }

        if (!purchase_code || !email) {
            return res.status(400).json({ success: false, message: 'Purchase code and registered email are required.' });
        }

        const result = await activateLicense(purchase_code, email, host);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/install/complete
// @desc    Lock installation and complete wizard setup
router.post('/complete', blockIfInstalled, async (req, res) => {
    try {
        let settings = await SiteSetting.findOne();
        if (!settings) settings = new SiteSetting();

        const host = req.hostname;
        const isLocal = isLocalEnvironment(host);

        if (!isLocal) {
            // Live domain/production: must have active license status and valid license key
            if (settings.license_status !== 'active' || !settings.license_key_encrypted) {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase code verification must be successfully completed on production servers before installation can be completed.'
                });
            }
        } else {
            // Local dev setting
            settings.license_status = 'development';
        }

        settings.is_installed = true;
        settings.installation_completed_at = new Date();
        await settings.save();

        res.json({ success: true, message: 'Installation lock set. Setup finalized successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
