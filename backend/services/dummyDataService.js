const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all required models
const User = require('../models/User');
const Company = require('../models/Company');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');
const BillingAddress = require('../models/BillingAddress');
const ShippingAddress = require('../models/ShippingAddress');
const RFQ = require('../models/RFQ');
const Quote = require('../models/Quote');
const ProductEnquiry = require('../models/ProductEnquiry');
const ProductCustomizationRequest = require('../models/ProductCustomizationRequest');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Job = require('../models/Job');
const Coupon = require('../models/Coupon');
const MongoLock = require('../models/MongoLock');
const DummyDataLog = require('../models/DummyDataLog');

const { ObjectId } = mongoose.Types;

/**
 * Recursively convert 24-character hex strings to ObjectIds and ISO date strings to Dates.
 */
const castObjectIds = (val) => {
    if (typeof val === 'string') {
        if (/^[0-9a-fA-F]{24}$/.test(val)) {
            return new ObjectId(val);
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(val)) {
            return new Date(val);
        }
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(castObjectIds);
    }
    if (val !== null && typeof val === 'object') {
        const result = {};
        for (const key of Object.keys(val)) {
            result[key] = castObjectIds(val[key]);
        }
        return result;
    }
    return val;
};

const LOCK_KEY = 'dummy_data_action_lock';
const LOCK_TIMEOUT_MS = 600000; // 10 minutes max lock duration
const CHUNK_SIZE = 500; // Standard size to avoid BSON payload boundary errors

/**
 * Split array into chunks of a predefined maximum size
 */
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Capture current heap memory utilization
 */
const getMemoryTelemetry = () => {
    const memory = process.memoryUsage();
    return {
        heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100
    };
};

/**
 * Helper to acquire distributed lock in MongoDB
 */
const acquireLock = async (workerId) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS);
    try {
        const lock = await MongoLock.findOneAndUpdate(
            { key: LOCK_KEY },
            { 
                $setOnInsert: { 
                    key: LOCK_KEY,
                    workerId,
                    acquiredAt: now,
                    expiresAt
                } 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (lock.workerId === workerId) {
            return true;
        }

        if (lock.expiresAt < now) {
            const stolenLock = await MongoLock.findOneAndUpdate(
                { key: LOCK_KEY, expiresAt: { $lt: now } },
                { $set: { workerId, acquiredAt: now, expiresAt } },
                { new: true }
            );
            if (stolenLock && stolenLock.workerId === workerId) {
                return true;
            }
        }

        return false;
    } catch (err) {
        return false;
    }
};

/**
 * Helper to release distributed lock in MongoDB
 */
const releaseLock = async (workerId) => {
    try {
        await MongoLock.deleteOne({ key: LOCK_KEY, workerId });
    } catch (err) {
        console.error('Failed to release lock:', err);
    }
};

/**
 * Check if the current MongoDB connection supports replica sets/transactions
 */
const isReplicaSet = async () => {
    try {
        const adminDb = mongoose.connection.db.admin();
        const status = await adminDb.serverStatus();
        return !!status.repl;
    } catch (e) {
        return false;
    }
};

/**
 * Integrity & Readiness Health Check prior to database operations
 */
const runReadinessHealthChecks = () => {
    // 1. Verify Database socket readiness
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database Health Check Failed: MongoDB connection is currently offline or connecting.');
    }

    const storagePath = path.join(__dirname, '../storage/dummy_data_import');
    const metadataFile = path.join(storagePath, 'metadata.json');

    // 2. Verify Metadata Configuration
    if (!fs.existsSync(metadataFile)) {
        throw new Error('Readiness Check Failed: Storage metadata tracker mapping (metadata.json) is missing.');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    
    // 3. Verify Required Dump Files Presence
    if (metadata.requiredFiles && Array.isArray(metadata.requiredFiles)) {
        for (const file of metadata.requiredFiles) {
            const filePath = path.join(storagePath, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Readiness Check Failed: Required relational dump asset is missing or corrupted: ${file}`);
            }
        }
    }

    return metadata;
};

/**
 * Cleans dynamic demo and user data while KEEPING critical master collections
 */
const performCleanup = async (logSession, session = null) => {
    const addLog = (msg) => {
        const timestamped = `[${new Date().toISOString()}] ${msg}`;
        console.log(timestamped);
        logSession.logs.push(timestamped);
    };

    addLog('Starting Database Cleanup...');

    // 1. Resolve Demo users ObjectIds dynamically by email to avoid static ID coding dependencies
    const demoBuyer = await User.findOne({ email: 'buyer@gmail.com' }, null, { session });
    const demoSupplier = await User.findOne({ email: 'supplier@gmail.com' }, null, { session });

    const buyerId = demoBuyer ? demoBuyer._id : null;
    const supplierId = demoSupplier ? demoSupplier._id : null;

    if (buyerId || supplierId) {
        addLog(`Dynamics resolved for demo accounts - Buyer ID: ${buyerId || 'none'}, Supplier ID: ${supplierId || 'none'}.`);
    }

    // 2. Delete all Orders, Transactions, Reviews, Disputes
    const orderDel = await Order.deleteMany({}, { session });
    addLog(`Deleted ${orderDel.deletedCount} orders.`);

    const txDel = await Transaction.deleteMany({}, { session });
    addLog(`Deleted ${txDel.deletedCount} transactions.`);

    const revDel = await Review.deleteMany({}, { session });
    addLog(`Deleted ${revDel.deletedCount} product reviews.`);

    const dispDel = await Dispute.deleteMany({}, { session });
    addLog(`Deleted ${dispDel.deletedCount} disputes.`);

    // 3. Delete all Chats (Conversations & Messages)
    const msgDel = await Message.deleteMany({}, { session });
    const convDel = await Conversation.deleteMany({}, { session });
    addLog(`Deleted ${msgDel.deletedCount} chat messages and ${convDel.deletedCount} conversations.`);

    // 4. Delete dynamic Buyer inquiries, RFQs, Quotes, Customizations
    const rfqDel = await RFQ.deleteMany({}, { session });
    const quoteDel = await Quote.deleteMany({}, { session });
    const enqDel = await ProductEnquiry.deleteMany({}, { session });
    const custDel = await ProductCustomizationRequest.deleteMany({}, { session });
    addLog(`Cleared RFQs (${rfqDel.deletedCount}), Quotes (${quoteDel.deletedCount}), Enquiries (${enqDel.deletedCount}), and Customization Requests (${custDel.deletedCount}).`);

    // 5. Delete Address books
    const billDel = await BillingAddress.deleteMany({}, { session });
    const shipDel = await ShippingAddress.deleteMany({}, { session });
    addLog(`Cleared Billing (${billDel.deletedCount}) and Shipping (${shipDel.deletedCount}) address records.`);

    // 6. Delete general notifications
    const notifDel = await Notification.deleteMany({}, { session });
    addLog(`Deleted ${notifDel.deletedCount} user notifications.`);

    // 7. Delete users EXCEPT system admin accounts
    const userDel = await User.deleteMany({ roles: { $nin: ['admin'] } }, { session });
    addLog(`Deleted ${userDel.deletedCount} customer/supplier user profiles (keeping administrators).`);

    // 8. Delete all products EXCEPT those linked to remaining users (which would be none)
    const prodDel = await Product.deleteMany({}, { session });
    addLog(`Deleted ${prodDel.deletedCount} product listings.`);

    // 9. Delete supplier company profiles
    const compDel = await Company.deleteMany({}, { session });
    addLog(`Deleted ${compDel.deletedCount} supplier business profiles.`);

    // 10. Clean up pending background jobs
    const jobDel = await Job.deleteMany({}, { session });
    addLog(`Cleared ${jobDel.deletedCount} background jobs.`);

    // 10.5. Clean up Coupon codes
    const couponDel = await Coupon.deleteMany({}, { session });
    addLog(`Deleted ${couponDel.deletedCount} coupons.`);

    // 11. Delete logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldLogs = await AuditLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } }, { session });
    addLog(`Archived and deleted ${oldLogs.deletedCount} audit logs older than 30 days.`);

    // 12. Cleanup temporary uploads directory files if any (Safely, keeping master assets)
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let cleanedFiles = 0;
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const stat = fs.statSync(filePath);
                if (stat.isFile() && !file.startsWith('default') && !file.includes('site_logo')) {
                    fs.unlinkSync(filePath);
                    cleanedFiles++;
                }
            }
            if (cleanedFiles > 0) {
                addLog(`Cleaned up ${cleanedFiles} temporary/user uploaded files from storage.`);
            }
        }
    } catch (err) {
        addLog(`Warning on uploads cleanup: ${err.message}`);
    }

    addLog('Database Cleanup Completed Successfully.');
    
    return {
        users: userDel.deletedCount,
        products: prodDel.deletedCount,
        companies: compDel.deletedCount
    };
};

/**
 * Imports Predefined Dummy JSON dumps in chunked blocks
 */
const performImport = async (logSession, session = null) => {
    const addLog = (msg) => {
        const timestamped = `[${new Date().toISOString()}] ${msg}`;
        console.log(timestamped);
        logSession.logs.push(timestamped);
    };

    addLog('Starting Database Import from b2b_backup.json...');

    const backupPath = path.join(__dirname, '../storage/dummy_data_import/b2b_backup.json');
    if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found at: ${backupPath}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const db = mongoose.connection.db;

    const stats = {
        users: 0,
        products: 0,
        categories: 0,
        companies: 0,
        orders: 0,
        transactions: 0,
        reviews: 0,
        disputes: 0
    };

    // Collections to skip clearing/inserting (like active locking/logs)
    const skipCollections = ['mongolocks', 'dummydatalogs', 'dummydataoperations', 'dummydataoblogs', 'auditlogs'];

    // Loop through collections in the backup
    for (const [collectionName, documents] of Object.entries(backupData)) {
        if (skipCollections.includes(collectionName)) {
            addLog(`Skipping system collection: ${collectionName}`);
            continue;
        }

        addLog(`Restoring collection: ${collectionName} (${documents.length} documents)...`);

        const collection = db.collection(collectionName);

        // Delete all existing documents in this collection
        await collection.deleteMany({}, { session });

        if (documents.length > 0) {
            // Convert plain JSON documents to correct BSON types (ObjectIds, Dates)
            const parsedDocs = documents.map(doc => castObjectIds(doc));
            
            // Insert in chunks to avoid BSON payload boundary limits
            const chunks = chunkArray(parsedDocs, CHUNK_SIZE);
            for (const chunk of chunks) {
                await collection.insertMany(chunk, { session });
            }
        }

        // Keep track of stats for main collections
        if (collectionName === 'users') stats.users = documents.length;
        else if (collectionName === 'products') stats.products = documents.length;
        else if (collectionName === 'categories') stats.categories = documents.length;
        else if (collectionName === 'companies') stats.companies = documents.length;
        else if (collectionName === 'orders') stats.orders = documents.length;
        else if (collectionName === 'transactions') stats.transactions = documents.length;
        else if (collectionName === 'reviews') stats.reviews = documents.length;
        else if (collectionName === 'disputes') stats.disputes = documents.length;
    }

    addLog('Database Import from b2b_backup.json Completed Successfully.');

    return stats;
};

/**
 * Main Controller-facing function for Cleanup
 */
exports.cleanupDemoData = async (initiatedBy, triggerType) => {
    // 1. Run health readiness checks first
    const metadata = runReadinessHealthChecks();
    
    const workerId = `worker_${Date.now()}`;
    
    // Acquire Lock
    const locked = await acquireLock(workerId);
    if (!locked) {
        throw new Error('A data modification action (import or cleanup) is currently in progress. Please wait.');
    }

    let logSession;
    const startTime = Date.now();

    try {
        logSession = await DummyDataLog.create({
            action: 'CLEANUP',
            status: 'processing',
            initiatedBy,
            triggerType,
            importVersion: metadata.version,
            serverHostname: os.hostname(),
            memoryUsage: getMemoryTelemetry(),
            logs: [`[${new Date().toISOString()}] Worker ${workerId} acquired run lock.`]
        });

        const replica = await isReplicaSet();
        let stats;

        if (replica) {
            console.log('🔄 Running Cleanup in a secure MongoDB Transaction Session');
            const dbSession = await mongoose.startSession();
            dbSession.startTransaction();
            try {
                stats = await performCleanup(logSession, dbSession);
                await dbSession.commitTransaction();
            } catch (err) {
                await dbSession.abortTransaction();
                throw err;
            } finally {
                dbSession.endSession();
            }
        } else {
            console.log('⚠️ MongoDB standalone detected. Running Cleanup sequentially');
            stats = await performCleanup(logSession);
        }

        logSession.status = 'completed';
        logSession.stats = {
            ...logSession.stats,
            users: stats.users,
            products: stats.products,
            companies: stats.companies
        };
        logSession.durationMs = Date.now() - startTime;
        logSession.memoryUsage = getMemoryTelemetry();
        logSession.logs.push(`[${new Date().toISOString()}] Cleanup process finished successfully.`);
        await logSession.save();

        return logSession;
    } catch (err) {
        if (logSession) {
            try {
                logSession.status = 'failed';
                logSession.error = err.message;
                logSession.durationMs = Date.now() - startTime;
                logSession.memoryUsage = getMemoryTelemetry();
                logSession.logs.push(`[${new Date().toISOString()}] ERROR: ${err.message}`);
                logSession.logs.push(`[${new Date().toISOString()}] Rollback/Cleanup failed. Worker released lock.`);
                await logSession.save();
            } catch (saveErr) {
                console.error('Failed to save log session error status:', saveErr);
            }
        }
        throw err;
    } finally {
        await releaseLock(workerId);
    }
};

/**
 * Main Controller-facing function for Dummy Import
 */
exports.importDummyData = async (initiatedBy, triggerType) => {
    // 1. Run health readiness checks first
    const metadata = runReadinessHealthChecks();

    const workerId = `worker_${Date.now()}`;
    
    // Acquire Lock
    const locked = await acquireLock(workerId);
    if (!locked) {
        throw new Error('A data modification action (import or cleanup) is currently in progress. Please wait.');
    }

    let logSession;
    const startTime = Date.now();

    try {
        logSession = await DummyDataLog.create({
            action: 'IMPORT',
            status: 'processing',
            initiatedBy,
            triggerType,
            importVersion: metadata.version,
            serverHostname: os.hostname(),
            memoryUsage: getMemoryTelemetry(),
            logs: [`[${new Date().toISOString()}] Worker ${workerId} acquired run lock.`]
        });

        const replica = await isReplicaSet();
        let stats;

        if (replica) {
            console.log('🔄 Running Import in a secure MongoDB Transaction Session');
            const dbSession = await mongoose.startSession();
            dbSession.startTransaction();
            try {
                stats = await performImport(logSession, dbSession);
                await dbSession.commitTransaction();
            } catch (err) {
                await dbSession.abortTransaction();
                throw err;
            } finally {
                dbSession.endSession();
            }
        } else {
            console.log('⚠️ MongoDB standalone detected. Running Import sequentially');
            stats = await performImport(logSession);
        }

        logSession.status = 'completed';
        logSession.stats = {
            ...logSession.stats,
            users: stats.users,
            products: stats.products,
            categories: stats.categories,
            orders: stats.orders,
            transactions: stats.transactions,
            companies: stats.companies,
            reviews: stats.reviews,
            disputes: stats.disputes
        };
        logSession.durationMs = Date.now() - startTime;
        logSession.memoryUsage = getMemoryTelemetry();
        logSession.logs.push(`[${new Date().toISOString()}] Import process finished successfully.`);
        await logSession.save();

        return logSession;
    } catch (err) {
        if (logSession) {
            try {
                logSession.status = 'failed';
                logSession.error = err.message;
                logSession.durationMs = Date.now() - startTime;
                logSession.memoryUsage = getMemoryTelemetry();
                logSession.logs.push(`[${new Date().toISOString()}] ERROR: ${err.message}`);
                logSession.logs.push(`[${new Date().toISOString()}] Rollback triggered. Import session cancelled.`);
                await logSession.save();
            } catch (saveErr) {
                console.error('Failed to save log session error status:', saveErr);
            }
        }
        throw err;
    } finally {
        await releaseLock(workerId);
    }
};

/**
 * Controller-facing function for the dynamic Dashboard display status
 */
exports.getSystemStatus = async () => {
    let demoEmails = ['buyer@gmail.com', 'supplier@gmail.com'];
    let supplierIdCondition = '664c7e6b0000000000000011';
    try {
        const backupData = JSON.parse(fs.readFileSync(path.join(__dirname, '../storage/dummy_data_import/b2b_backup.json'), 'utf-8'));
        const usersData = backupData.users || [];
        demoEmails = usersData.map(u => u.email);
        supplierIdCondition = { $in: usersData.filter(u => u.roles && u.roles.includes('supplier')).map(u => u._id) };
    } catch (e) {
        console.error('Could not load b2b_backup.json for status calculation.');
    }
    const totalUsers = await User.countDocuments({ email: { $in: demoEmails } });
    const totalProducts = await Product.countDocuments({ supplier: supplierIdCondition });

    const lastImport = await DummyDataLog.findOne({ action: 'IMPORT', status: 'completed' }).sort({ createdAt: -1 });
    const activeLock = await MongoLock.findOne({ key: LOCK_KEY });

    return {
        totalUsers,
        totalProducts,
        lastImportTime: lastImport ? lastImport.createdAt : null,
        isCurrentlyRunning: !!activeLock && activeLock.expiresAt > new Date(),
        activeAction: activeLock ? 'processing' : 'idle',
        activeWorker: activeLock ? activeLock.workerId : null,
        serverHostname: lastImport ? lastImport.serverHostname : os.hostname(),
        importVersion: lastImport ? lastImport.importVersion : 'v1.0.0'
    };
};

/**
 * Get operation history logs
 */
exports.getSystemLogs = async () => {
    return await DummyDataLog.find().sort({ createdAt: -1 }).limit(50).populate('initiatedBy', 'email first_name last_name');
};
