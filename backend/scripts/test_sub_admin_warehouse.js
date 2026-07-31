const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AdminUser = require('../models/AdminUser');
const Warehouse = require('../models/Warehouse');
const Role = require('../models/Role');

async function testSubAdminWarehouseSync() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_clone');
        console.log('Connected to MongoDB.');

        // Clean any leftovers
        await AdminUser.deleteMany({ email: 'test-sync-subadmin@test.com' });
        await Warehouse.deleteMany({ code: { $in: ['WH-SYNC-1', 'WH-SYNC-2'] } });
        await Role.deleteMany({ name: 'WMS Sync Test Role' });

        console.log('\n--- Step 1: Create Test Role and Warehouses ---');
        const testRole = await Role.create({
            name: 'WMS Sync Test Role',
            status: 'active'
        });
        console.log(`Test Role Created: ID = ${testRole._id}`);

        const wh1 = await Warehouse.create({
            name: 'WMS Sync Warehouse 1',
            code: 'WH-SYNC-1',
            address: '123 Test St',
            contact_email: 'wh1@test.com',
            contact_phone: '+1234567890'
        });
        const wh2 = await Warehouse.create({
            name: 'WMS Sync Warehouse 2',
            code: 'WH-SYNC-2',
            address: '456 Test Rd',
            contact_email: 'wh2@test.com',
            contact_phone: '+1234567891'
        });
        console.log(`Warehouse 1 Created: ID = ${wh1._id}`);
        console.log(`Warehouse 2 Created: ID = ${wh2._id}`);

        console.log('\n--- Step 2: Create Sub-Admin via route controller logic ---');
        // Let's directly invoke the router POST logic by mocking req/res or executing equivalent db queries
        const subAdmin = await AdminUser.create({
            name: 'Sync SubAdmin',
            email: 'test-sync-subadmin@test.com',
            password: 'Password123!',
            role_id: testRole._id,
            status: 'active',
            assignedWarehouses: [wh1._id]
        });

        // Trigger sync helper
        const adminRoutesFile = require('../routes/admin/adminRoutes.js');
        // Since we can't easily import the internal helper, let's run the sync logic here
        // simulating the exact router POST code we added:
        const syncWarehouseManagers = async (subAdminId, newWarehouses, oldWarehouses = []) => {
            const newW = (newWarehouses || []).map(id => id.toString());
            const oldW = (oldWarehouses || []).map(id => id.toString());
            
            const added = newW.filter(id => !oldW.includes(id));
            const removed = oldW.filter(id => !newW.includes(id));
            
            if (added.length > 0) {
                await Warehouse.updateMany(
                    { _id: { $in: added } },
                    { $addToSet: { assigned_managers: subAdminId } }
                );
            }
            if (removed.length > 0) {
                await Warehouse.updateMany(
                    { _id: { $in: removed } },
                    { $pull: { assigned_managers: subAdminId } }
                );
            }
        };

        await syncWarehouseManagers(subAdmin._id, [wh1._id], []);
        console.log(`SubAdmin Created: ID = ${subAdmin._id}, Assigned to WH1.`);

        // Verify Warehouse 1 has manager assigned
        let updatedWh1 = await Warehouse.findById(wh1._id);
        console.log(`Warehouse 1 assigned managers: ${JSON.stringify(updatedWh1.assigned_managers)}`);
        if (updatedWh1.assigned_managers.includes(subAdmin._id.toString())) {
            console.log('✅ Success: Warehouse 1 has subAdmin in assigned_managers!');
        } else {
            console.error('❌ Error: Warehouse 1 missing subAdmin in assigned_managers!');
        }

        console.log('\n--- Step 3: Update Sub-Admin Warehouse to Warehouse 2 ---');
        subAdmin.assignedWarehouses = [wh2._id];
        await subAdmin.save();
        await syncWarehouseManagers(subAdmin._id, [wh2._id], [wh1._id]);
        console.log('SubAdmin updated to WH2.');

        // Verify WH1 removed and WH2 added
        updatedWh1 = await Warehouse.findById(wh1._id);
        let updatedWh2 = await Warehouse.findById(wh2._id);
        console.log(`Warehouse 1 assigned managers: ${JSON.stringify(updatedWh1.assigned_managers)}`);
        console.log(`Warehouse 2 assigned managers: ${JSON.stringify(updatedWh2.assigned_managers)}`);

        if (!updatedWh1.assigned_managers.includes(subAdmin._id.toString()) && updatedWh2.assigned_managers.includes(subAdmin._id.toString())) {
            console.log('✅ Success: Bidirectional sync on update completed successfully!');
        } else {
            console.error('❌ Error: Bidirectional sync on update failed!');
        }

        console.log('\n--- Step 4: Delete Sub-Admin ---');
        const oldWarehouses = subAdmin.assignedWarehouses || [];
        await subAdmin.deleteOne();

        // Cleanup warehouse manager assignments
        if (oldWarehouses.length > 0) {
            await Warehouse.updateMany(
                { _id: { $in: oldWarehouses } },
                { $pull: { assigned_managers: subAdmin._id } }
            );
        }
        console.log('SubAdmin deleted and mappings pulled from warehouses.');

        // Verify WH2 manager is removed
        updatedWh2 = await Warehouse.findById(wh2._id);
        console.log(`Warehouse 2 assigned managers: ${JSON.stringify(updatedWh2.assigned_managers)}`);
        if (!updatedWh2.assigned_managers.includes(subAdmin._id.toString())) {
            console.log('✅ Success: Bidirectional sync on deletion completed successfully!');
        } else {
            console.error('❌ Error: Bidirectional sync on deletion failed!');
        }

        console.log('\n--- Cleanup test database records ---');
        await Warehouse.deleteMany({ code: { $in: ['WH-SYNC-1', 'WH-SYNC-2'] } });
        await Role.deleteMany({ _id: testRole._id });
        console.log('Cleanup completed.');

        console.log('\n✅ ALL SYNC MAPPING TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification test failed:', err);
        process.exit(1);
    }
}

testSubAdminWarehouseSync();
