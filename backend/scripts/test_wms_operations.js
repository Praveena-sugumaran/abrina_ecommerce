const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const GoodsReceivedNote = require('../models/GoodsReceivedNote');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const StockTransfer = require('../models/StockTransfer');

// Stub a request/response context to test controller methods directly
const {
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    createGoodsReceivedNote,
    createInventoryAdjustment,
    createStockTransfer,
    updateTransferStatus
} = require('../controllers/warehouseController');

async function testWMSOperations() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB.');

        // 1. Set up test mock entities
        const testUser = {
            _id: new mongoose.Types.ObjectId(),
            roles: ['admin']
        };

        const testProduct = await Product.findOne();
        if (!testProduct) {
            console.error('No products found in DB to run integration tests.');
            process.exit(1);
        }
        console.log(`Testing with product: ${testProduct.name} (${testProduct._id})`);

        // Clean any leftovers
        await Warehouse.deleteMany({ code: { $in: ['WH-TEST-S', 'WH-TEST-D'] } });

        console.log('\n--- Test Step 1: Create Warehouses (CRUD) ---');
        // Source Warehouse
        let srcWarehouse;
        const res1 = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { srcWarehouse = data.warehouse; }
        };
        await createWarehouse({
            user: testUser,
            body: {
                name: 'Test Source WH',
                code: 'WH-TEST-S',
                address: '456 Source Rd',
                warehouse_type: 'Main',
                low_stock_threshold: 10,
                contact_email: 'sourcewh@test.com',
                contact_phone: '+1234567890',
                assigned_managers: []
            }
        }, res1);
        console.log(`Source Warehouse Created: ${srcWarehouse ? srcWarehouse.name : 'undefined'} (${srcWarehouse ? srcWarehouse.code : 'undefined'}), ID: ${srcWarehouse ? srcWarehouse._id : 'undefined'}`);

        // Destination Warehouse
        let dstWarehouse;
        const res2 = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { dstWarehouse = data.warehouse; }
        };
        await createWarehouse({
            user: testUser,
            body: {
                name: 'Test Destination WH',
                code: 'WH-TEST-D',
                address: '789 Dest Ave',
                warehouse_type: 'Retail',
                low_stock_threshold: 5,
                contact_email: 'destwh@test.com',
                contact_phone: '+1234567891',
                assigned_managers: []
            }
        }, res2);
        console.log(`Destination Warehouse Created: ${dstWarehouse ? dstWarehouse.name : 'undefined'} (${dstWarehouse ? dstWarehouse.code : 'undefined'}), ID: ${dstWarehouse ? dstWarehouse._id : 'undefined'}`);

        // Clear inventories for these test warehouses just in case
        await Inventory.deleteMany({ warehouse_id: { $in: [srcWarehouse._id, dstWarehouse._id] } });
        await InventoryTransaction.deleteMany({ warehouse_id: { $in: [srcWarehouse._id, dstWarehouse._id] } });

        console.log('\n--- Test Step 2: Inbound Goods Received Note (GRN) ---');
        let grnResult;
        const resGRN = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { grnResult = data.grn; }
        };
        await createGoodsReceivedNote({
            user: testUser,
            body: {
                grn_number: 'GRN-TEST-101',
                warehouse_id: srcWarehouse._id.toString(),
                purchase_order_reference: 'PO-TEST-99',
                items: [{
                    product_id: testProduct._id.toString(),
                    quantity_received: 100
                }]
            }
        }, resGRN);
        console.log(`GRN Registered: Number = ${grnResult.grn_number}`);

        // Verify inventory count in Source Warehouse
        let srcInv = await Inventory.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id });
        console.log(`Source Warehouse Inventory Quantity after GRN: ${srcInv ? srcInv.quantity : 0}`);
        if (srcInv && srcInv.quantity === 100) {
            console.log('✅ Success: Inventory set to 100.');
        } else {
            console.error('❌ Error: Expected inventory quantity of 100.');
        }

        // Verify ledger record
        let ledgerGRN = await InventoryTransaction.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id, transaction_type: 'PURCHASE' });
        if (ledgerGRN && ledgerGRN.quantity === 100) {
            console.log('✅ Success: Inbound Purchase ledger entry logged with qty +100.');
        } else {
            console.error('❌ Error: Inbound ledger entry missing or incorrect.');
        }

        console.log('\n--- Test Step 3: Manual Stock Adjustment ---');
        let adjResult;
        const resAdj = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { adjResult = data.adjustment; }
        };
        await createInventoryAdjustment({
            user: testUser,
            body: {
                warehouse_id: srcWarehouse._id.toString(),
                product_id: testProduct._id.toString(),
                adjustment_type: 'SUBTRACT',
                quantity: 10,
                reason: 'DAMAGE'
            }
        }, resAdj);
        console.log(`Adjustment Registered: Type = ${adjResult.adjustment_type}, Qty = ${adjResult.quantity}, Reason = ${adjResult.reason}`);

        // Verify inventory count
        srcInv = await Inventory.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id });
        console.log(`Source Warehouse Inventory Quantity after subtraction: ${srcInv ? srcInv.quantity : 0}`);
        if (srcInv && srcInv.quantity === 90) {
            console.log('✅ Success: Inventory successfully reduced to 90.');
        } else {
            console.error('❌ Error: Expected inventory quantity of 90.');
        }

        // Verify ledger record
        let ledgerAdj = await InventoryTransaction.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id, transaction_type: 'ADJUSTMENT' });
        if (ledgerAdj && ledgerAdj.quantity === -10) {
            console.log('✅ Success: Manual adjustment ledger entry logged with qty -10.');
        } else {
            console.error('❌ Error: Adjustment ledger entry missing or incorrect.');
        }

        console.log('\n--- Test Step 4: Multi-stage Stock Transfer ---');
        // A. Create Stock Transfer in Draft
        let transferResult;
        const resTransfer = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { transferResult = data.transfer; }
        };
        await createStockTransfer({
            user: testUser,
            body: {
                from_warehouse: srcWarehouse._id.toString(),
                to_warehouse: dstWarehouse._id.toString(),
                product: testProduct._id.toString(),
                quantity: 20,
                notes: 'Test Stock Transfer notes'
            }
        }, resTransfer);
        console.log(`Transfer Created: Status = ${transferResult.status}, Qty = ${transferResult.quantity}`);

        // B. Update status to In Transit
        let transferUpdated;
        const resUpdate1 = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { transferUpdated = data.transfer; }
        };
        await updateTransferStatus({
            user: testUser,
            params: { id: transferResult._id.toString() },
            body: { status: 'In Transit' }
        }, resUpdate1);
        console.log(`Transfer Shipped: New Status = ${transferUpdated.status}`);

        // Verify Source stock has been deducted
        srcInv = await Inventory.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id });
        console.log(`Source Warehouse Inventory Quantity after Shipping: ${srcInv ? srcInv.quantity : 0}`);
        if (srcInv && srcInv.quantity === 70) {
            console.log('✅ Success: Inventory reduced to 70 (90 - 20).');
        } else {
            console.error('❌ Error: Expected inventory quantity of 70 in Source.');
        }

        // Verify ledger record for source deduction
        let ledgerShip = await InventoryTransaction.findOne({ warehouse_id: srcWarehouse._id, product_id: testProduct._id, transaction_type: 'TRANSFER_OUT' });
        if (ledgerShip && ledgerShip.quantity === -20) {
            console.log('✅ Success: TRANSFER_OUT ledger entry logged with qty -20.');
        } else {
            console.error('❌ Error: TRANSFER_OUT ledger entry missing or incorrect.');
        }

        // Verify destination has no stock yet
        let dstInv = await Inventory.findOne({ warehouse_id: dstWarehouse._id, product_id: testProduct._id });
        console.log(`Destination Warehouse Inventory Quantity while In Transit: ${dstInv ? dstInv.quantity : 0}`);
        if (!dstInv || dstInv.quantity === 0) {
            console.log('✅ Success: Destination warehouse has no stock yet.');
        } else {
            console.error('❌ Error: Expected destination to have 0 stock.');
        }

        // C. Update status to Received
        const resUpdate2 = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { transferUpdated = data.transfer; }
        };
        await updateTransferStatus({
            user: testUser,
            params: { id: transferResult._id.toString() },
            body: { status: 'Received' }
        }, resUpdate2);
        console.log(`Transfer Completed: New Status = ${transferUpdated.status}`);

        // Verify destination stock increased
        dstInv = await Inventory.findOne({ warehouse_id: dstWarehouse._id, product_id: testProduct._id });
        console.log(`Destination Warehouse Inventory Quantity after receipt: ${dstInv ? dstInv.quantity : 0}`);
        if (dstInv && dstInv.quantity === 20) {
            console.log('✅ Success: Destination inventory successfully set to 20.');
        } else {
            console.error('❌ Error: Expected destination inventory to have 20 units.');
        }

        // Verify ledger record for destination receipt
        let ledgerReceipt = await InventoryTransaction.findOne({ warehouse_id: dstWarehouse._id, product_id: testProduct._id, transaction_type: 'TRANSFER_IN' });
        if (ledgerReceipt && ledgerReceipt.quantity === 20) {
            console.log('✅ Success: TRANSFER_IN ledger entry logged with qty +20.');
        } else {
            console.error('❌ Error: TRANSFER_IN ledger entry missing or incorrect.');
        }

        console.log('\n--- Cleanup test database records ---');
        await Inventory.deleteMany({ warehouse_id: { $in: [srcWarehouse._id, dstWarehouse._id] } });
        await InventoryTransaction.deleteMany({ warehouse_id: { $in: [srcWarehouse._id, dstWarehouse._id] } });
        await GoodsReceivedNote.deleteMany({ warehouse_id: srcWarehouse._id });
        await InventoryAdjustment.deleteMany({ warehouse_id: srcWarehouse._id });
        await StockTransfer.deleteMany({ _id: transferResult._id });
        await Warehouse.deleteMany({ code: { $in: ['WH-TEST-S', 'WH-TEST-D'] } });
        console.log('All test documents cleaned up.');

        console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Integration operations test failed:', err);
        process.exit(1);
    }
}

testWMSOperations();
