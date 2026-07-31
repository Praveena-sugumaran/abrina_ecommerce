const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Permission = require('../models/Permission');

dotenv.config({ path: path.join(__dirname, '../.env') });

const permissions = [
    // User Management
    { module_name: 'User Management', permission_name: 'View Users', slug: 'users.view' },
    { module_name: 'User Management', permission_name: 'Create Users', slug: 'users.create' },
    { module_name: 'User Management', permission_name: 'Edit Users', slug: 'users.edit' },
    { module_name: 'User Management', permission_name: 'Delete Users', slug: 'users.delete' },

    // Role Management
    { module_name: 'Role Management', permission_name: 'View Roles', slug: 'roles.view' },
    { module_name: 'Role Management', permission_name: 'Create Roles', slug: 'roles.create' },
    { module_name: 'Role Management', permission_name: 'Edit Roles', slug: 'roles.edit' },
    { module_name: 'Role Management', permission_name: 'Delete Roles', slug: 'roles.delete' },

    // Permission Management
    { module_name: 'Permission Management', permission_name: 'View Permissions', slug: 'permissions.view' },
    { module_name: 'Permission Management', permission_name: 'Create Permissions', slug: 'permissions.create' },
    { module_name: 'Permission Management', permission_name: 'Edit Permissions', slug: 'permissions.edit' },
    { module_name: 'Permission Management', permission_name: 'Delete Permissions', slug: 'permissions.delete' },

    // Product Management
    { module_name: 'Product Management', permission_name: 'View Products', slug: 'products.view' },
    { module_name: 'Product Management', permission_name: 'Create Products', slug: 'products.create' },
    { module_name: 'Product Management', permission_name: 'Edit Products', slug: 'products.edit' },
    { module_name: 'Product Management', permission_name: 'Delete Products', slug: 'products.delete' },

    // Order Management
    { module_name: 'Order Management', permission_name: 'View Orders', slug: 'orders.view' },
    { module_name: 'Order Management', permission_name: 'Create Orders', slug: 'orders.create' },
    { module_name: 'Order Management', permission_name: 'Edit Orders', slug: 'orders.edit' },
    { module_name: 'Order Management', permission_name: 'Delete Orders', slug: 'orders.delete' },
    { module_name: 'Order Management', permission_name: 'View Disputes', slug: 'disputes.view' },
    { module_name: 'Order Management', permission_name: 'Resolve Disputes', slug: 'disputes.edit' },

    // Reports
    { module_name: 'Reports', permission_name: 'View Reports', slug: 'reports.view' },
    { module_name: 'Reports', permission_name: 'Export Reports', slug: 'reports.export' },

    // Settings
    { module_name: 'Settings', permission_name: 'View Settings', slug: 'settings.view' },
    { module_name: 'Settings', permission_name: 'Update Settings', slug: 'settings.update' },

    // Warehouse Management
    { module_name: 'Warehouse Management', permission_name: 'View Warehouses', slug: 'warehouses.view' },
    { module_name: 'Warehouse Management', permission_name: 'Create Warehouses', slug: 'warehouses.create' },
    { module_name: 'Warehouse Management', permission_name: 'Edit Warehouses', slug: 'warehouses.edit' },
    { module_name: 'Warehouse Management', permission_name: 'View Inventory Status', slug: 'warehouse.inventory.view' },
    { module_name: 'Warehouse Management', permission_name: 'Edit Inventory Status', slug: 'warehouse.inventory.edit' },
    { module_name: 'Warehouse Management', permission_name: 'View Stock Transfers', slug: 'warehouse.transfer.view' },
    { module_name: 'Warehouse Management', permission_name: 'Create Stock Transfers', slug: 'warehouse.transfer.create' },
    { module_name: 'Warehouse Management', permission_name: 'Approve Stock Transfers', slug: 'warehouse.transfer.approve' },
    { module_name: 'Warehouse Management', permission_name: 'View Reports', slug: 'warehouse.reports.view' },
    { module_name: 'Warehouse Management', permission_name: 'View Warehouse Audits', slug: 'warehouse.audit.view' },
    { module_name: 'Warehouse Management', permission_name: 'Assign Warehouse Manager', slug: 'warehouse.manager.assign' }
];

const seedPermissions = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Database connected.');

        console.log('Seeding permissions...');
        for (const p of permissions) {
            await Permission.findOneAndUpdate(
                { slug: p.slug },
                p,
                { upsert: true, new: true }
            );
        }

        console.log('✅ Permissions seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seedPermissions();
