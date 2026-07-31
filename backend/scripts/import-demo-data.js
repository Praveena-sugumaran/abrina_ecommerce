#!/usr/bin/env node

/**
 * Enterprise CLI command script to perform transaction-safe Demo Data Reset & Import operations.
 * 
 * Usage:
 *   node backend/scripts/import-demo-data.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Verify connection URI is set
if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', '❌ CLI Error: MONGO_URI is not set inside your .env configuration file.');
    process.exit(1);
}

// Set up models globally (ensuring they register in Mongoose)
require('../models/User');
require('../models/Company');
require('../models/Category');
require('../models/Product');
require('../models/Order');
require('../models/Transaction');
require('../models/Review');
require('../models/Dispute');
require('../models/BillingAddress');
require('../models/ShippingAddress');
require('../models/RFQ');
require('../models/Quote');
require('../models/ProductEnquiry');
require('../models/ProductCustomizationRequest');
require('../models/Notification');
require('../models/AuditLog');
require('../models/Conversation');
require('../models/Message');
require('../models/Job');
require('../models/MongoLock');
require('../models/DummyDataLog');

const dummyDataService = require('../services/dummyDataService');

const runCliRestore = async () => {
    console.log('\x1b[36m%s\x1b[0m', '🔄 Connecting to MongoDB Cluster...');
    
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 20000
        });
        console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connection established.');

        console.log('\x1b[33m%s\x1b[0m', '⏳ Initiating database Mutex Lock verification and system reset...');
        
        // Trigger import (which cleans up first, verifies dumps integrity, chunks products bulk inserts, and Telemetrizes details)
        const logSession = await dummyDataService.importDummyData(null, 'cli');

        console.log('\n\x1b[32m%s\x1b[0m', '🏆 ==================================================');
        console.log('\x1b[32m%s\x1b[0m', '🏆 DEMO RESTORATION COMPLETED SUCCESSFULLY!');
        console.log('\x1b[32m%s\x1b[0m', '🏆 ==================================================');
        console.log(`⏱️  Duration: \x1b[35m${(logSession.durationMs / 1000).toFixed(2)}s\x1b[0m`);
        console.log(`📦 Dump Version: \x1b[36m${logSession.importVersion}\x1b[0m`);
        console.log(`🖥️  Host Node: \x1b[33m${logSession.serverHostname}\x1b[0m`);
        console.log(`📟 Memory heap: \x1b[35m${logSession.memoryUsage.heapUsedMB} MB\x1b[0m`);
        console.log('\n📊 Seeding counts:');
        console.log(`  - Users: ${logSession.stats.users}`);
        console.log(`  - Products: ${logSession.stats.products}`);
        console.log(`  - Categories: ${logSession.stats.categories}`);
        console.log(`  - Companies: ${logSession.stats.companies}`);
        console.log(`  - Orders: ${logSession.stats.orders}`);
        console.log(`  - Transactions: ${logSession.stats.transactions}`);
        console.log(`  - Disputes: ${logSession.stats.disputes}`);
        console.log(`  - Reviews: ${logSession.stats.reviews}`);
        
        process.exit(0);
    } catch (err) {
        console.error('\n\x1b[31m%s\x1b[0m', '❌ ==================================================');
        console.error('\x1b[31m%s\x1b[0m', '❌ CRITICAL SYSTEM ERROR DURING SEED RESTORATION!');
        console.error('\x1b[31m%s\x1b[0m', '❌ ==================================================');
        console.error('\x1b[31m%s\x1b[0m', err.stack || err.message);
        
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

runCliRestore();
