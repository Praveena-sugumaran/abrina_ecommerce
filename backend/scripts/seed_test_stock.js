const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');

// Helper to sync aggregate Product countInStock from the Inventory collection
const syncProductTotalStock = async (productId) => {
    const aggregate = await Inventory.aggregate([
        { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: '$product_id', totalQuantity: { $sum: '$quantity' } } }
    ]);

    const totalQty = aggregate.length > 0 ? aggregate[0].totalQuantity : 0;
    await Product.findByIdAndUpdate(productId, { countInStock: totalQty });
};

async function seedTestStock() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB.');

        const warehouses = await Warehouse.find({ status: 'active' });
        const products = await Product.find({ status: 'active' });

        if (warehouses.length === 0) {
            console.error('❌ Error: No active warehouses found in the database. Please create warehouses first.');
            process.exit(1);
        }

        if (products.length === 0) {
            console.error('❌ Error: No active products found in the database. Please create products first.');
            process.exit(1);
        }

        console.log(`Seeding stock: ${products.length} products across ${warehouses.length} warehouses...`);

        for (const wh of warehouses) {
            console.log(`Processing warehouse: ${wh.name} (${wh.code})`);
            for (const prod of products) {
                // Find or initialize inventory
                let inventory = await Inventory.findOne({ warehouse_id: wh._id, product_id: prod._id });
                const seedQty = 100; // Let's seed 100 units of each product

                if (inventory) {
                    const beforeQty = inventory.quantity;
                    inventory.quantity += seedQty;
                    await inventory.save();
                    
                    // Write Ledger Transaction
                    await InventoryTransaction.create({
                        warehouse_id: wh._id,
                        product_id: prod._id,
                        transaction_type: 'PURCHASE',
                        quantity: seedQty,
                        before_qty: beforeQty,
                        after_qty: inventory.quantity,
                        reference_type: 'Manual',
                        reference_id: wh._id
                    });
                } else {
                    await Inventory.create({
                        warehouse_id: wh._id,
                        product_id: prod._id,
                        quantity: seedQty,
                        reserved_quantity: 0
                    });

                    // Write Ledger Transaction
                    await InventoryTransaction.create({
                        warehouse_id: wh._id,
                        product_id: prod._id,
                        transaction_type: 'PURCHASE',
                        quantity: seedQty,
                        before_qty: 0,
                        after_qty: seedQty,
                        reference_type: 'Manual',
                        reference_id: wh._id
                    });
                }
            }
        }

        // Sync Product total countInStock
        console.log('Syncing countInStock for all products...');
        for (const prod of products) {
            await syncProductTotalStock(prod._id);
        }

        console.log('✅ Success: Test inventory stock seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding test stock failed:', err);
        process.exit(1);
    }
}

seedTestStock();
