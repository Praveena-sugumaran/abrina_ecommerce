const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');

async function testWMS() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB.');

        console.log('\n--- 1. Model Verification ---');
        console.log(`Warehouse model loaded: ${!!Warehouse}`);
        console.log(`Inventory model loaded: ${!!Inventory}`);
        console.log(`Product model loaded: ${!!Product}`);
        console.log(`InventoryTransaction model loaded: ${!!InventoryTransaction}`);

        console.log('\n--- 2. Checking Inventory Indexes ---');
        const indexes = await Inventory.collection.indexes();
        console.log('Existing indexes on Inventory collection:');
        console.log(JSON.stringify(indexes, null, 2));

        const hasCompoundUnique = indexes.some(idx => {
            const keys = Object.keys(idx.key);
            return keys.includes('warehouse_id') && keys.includes('product_id') && idx.unique === true;
        });

        if (hasCompoundUnique) {
            console.log('✅ Success: Unique compound index on { warehouse_id: 1, product_id: 1 } found!');
        } else {
            console.warn('❌ Warning: Unique compound index on { warehouse_id: 1, product_id: 1 } was NOT found or is not unique.');
        }

        console.log('\n--- 3. Testing Index Uniqueness Constraint ---');
        // Retrieve or create a test product and warehouse
        let product = await Product.findOne();
        if (!product) {
            console.log('Creating a temporary product for testing...');
            product = await Product.create({
                name: 'WMS Test Product',
                description: 'Test description',
                sku: 'TEST-WMS-SKU-99',
                moq: 1,
                currency: 'USD',
                status: 'active',
                approval_status: 'approved'
            });
        }
        console.log(`Using Product: ID = ${product._id}, SKU = ${product.sku}`);

        let warehouse = await Warehouse.findOne({ code: 'TEST-WH-01' });
        if (!warehouse) {
            console.log('Creating a temporary warehouse for testing...');
            warehouse = await Warehouse.create({
                name: 'Test Warehouse 01',
                code: 'TEST-WH-01',
                address: '123 Test St, Test City',
                warehouse_type: 'Main',
                low_stock_threshold: 5,
                contact_email: 'testwh01@test.com',
                contact_phone: '+1234567890'
            });
        }
        console.log(`Using Warehouse: ID = ${warehouse._id}, Code = ${warehouse.code}`);

        // Clean any existing test inventory
        await Inventory.deleteMany({ warehouse_id: warehouse._id, product_id: product._id });

        // Insert first inventory item
        console.log('Inserting first inventory mapping...');
        const inv1 = await Inventory.create({
            warehouse_id: warehouse._id,
            product_id: product._id,
            quantity: 100,
            reserved_quantity: 15
        });
        console.log(`First inventory created. ID: ${inv1._id}`);

        // Try to insert second identical mapping
        console.log('Attempting duplicate inventory mapping insertion (should fail)...');
        try {
            await Inventory.create({
                warehouse_id: warehouse._id,
                product_id: product._id,
                quantity: 50,
                reserved_quantity: 5
            });
            console.error('❌ Error: Duplicate mapping was successfully inserted! Index uniqueness constraint failed.');
        } catch (err) {
            console.log(`✅ Success: Uniqueness error caught correctly! Error message: ${err.message}`);
        }

        console.log('\n--- 4. Testing Virtual available_quantity calculation ---');
        const retrieved = await Inventory.findOne({ warehouse_id: warehouse._id, product_id: product._id });
        if (retrieved) {
            console.log(`Physical quantity: ${retrieved.quantity}`);
            console.log(`Reserved quantity: ${retrieved.reserved_quantity}`);
            console.log(`Virtual available_quantity: ${retrieved.available_quantity}`);
            if (retrieved.available_quantity === 85) {
                console.log('✅ Success: available_quantity matches virtual calculation (100 - 15 = 85)');
            } else {
                console.error(`❌ Error: Expected 85, got ${retrieved.available_quantity}`);
            }
        } else {
            console.error('❌ Error: Could not retrieve inventory mapping.');
        }

        // Cleanup test data
        console.log('\nCleaning up test inventory mappings...');
        await Inventory.deleteMany({ warehouse_id: warehouse._id, product_id: product._id });
        console.log('Cleanup completed.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Diagnostic test error:', err);
        process.exit(1);
    }
}

testWMS();
