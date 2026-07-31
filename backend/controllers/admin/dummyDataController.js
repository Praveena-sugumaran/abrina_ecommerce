const dummyDataService = require('../../services/dummyDataService');
const AuditLog = require('../../models/AuditLog');

/**
 * Audit trail utility for dummy actions
 */
const writeAuditLog = async (req, action, status, details = {}) => {
    try {
        await AuditLog.create({
            userId: req.user._id,
            action,
            module: 'ADMIN_DUMMY_DATA',
            status,
            details,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
            userAgent: req.headers['user-agent'] || ''
        });
    } catch (err) {
        console.error('Audit Log failed:', err);
    }
};

/**
 * GET /api/admin/dummy-data/status
 */
exports.getStatus = async (req, res) => {
    try {
        const status = await dummyDataService.getSystemStatus();
        res.json({ success: true, data: status });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/admin/dummy-data/import
 */
exports.triggerImport = async (req, res) => {
    try {
        // Safe check for locking
        const status = await dummyDataService.getSystemStatus();
        if (status.isCurrentlyRunning) {
            return res.status(409).json({ success: false, message: 'A system operation is currently running. Please wait for it to complete.' });
        }

        // Trigger Import asynchronously (or synchronously for small datasets, but synchronously gives direct feedback since the lock releases on exit)
        // Since we optimized the datasets and indexing, synchronous execution takes <1-2s and keeps UI completely synchronized!
        const logSession = await dummyDataService.importDummyData(req.user._id, 'manual');

        await writeAuditLog(req, 'DUMMY_DATA_IMPORT', 'success', { logSessionId: logSession._id });

        res.json({
            success: true,
            message: 'Demo dummy data successfully imported and synced.',
            data: logSession
        });
    } catch (err) {
        await writeAuditLog(req, 'DUMMY_DATA_IMPORT', 'failure', { error: err.message });
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/admin/dummy-data/cleanup
 */
exports.triggerCleanup = async (req, res) => {
    try {
        const status = await dummyDataService.getSystemStatus();
        if (status.isCurrentlyRunning) {
            return res.status(409).json({ success: false, message: 'A system operation is currently running. Please wait for it to complete.' });
        }

        const logSession = await dummyDataService.cleanupDemoData(req.user._id, 'manual');

        await writeAuditLog(req, 'DUMMY_DATA_CLEANUP', 'success', { logSessionId: logSession._id });

        res.json({
            success: true,
            message: 'All dynamic demo/user data cleared and master collections preserved.',
            data: logSession
        });
    } catch (err) {
        await writeAuditLog(req, 'DUMMY_DATA_CLEANUP', 'failure', { error: err.message });
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/admin/dummy-data/logs
 */
exports.getLogs = async (req, res) => {
    try {
        const logs = await dummyDataService.getSystemLogs();
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
