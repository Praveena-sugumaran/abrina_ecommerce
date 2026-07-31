const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { checkPermission } = require('../middlewares/authMiddleware');

dotenv.config({ path: path.join(__dirname, '../.env') });

const assert = (condition, message) => {
    if (!condition) {
        console.error(`\x1b[31m❌ Assertion Failed: ${message}\x1b[0m`);
        process.exit(1);
    }
    console.log(`\x1b[32m✓ Assertion Passed: ${message}\x1b[0m`);
};

const runTests = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alibaba_demo');
        console.log('Database connected.');

        // 1. Assert Super Admin bypass
        console.log('\nRunning Test 1: Super Admin bypass...');
        const reqSuper = {
            user: {
                roles: ['admin'],
                role_id: null // Super Admin has no role_id link
            }
        };
        let nextCalledSuper = false;
        const middleware = checkPermission('any.permission');
        await middleware(reqSuper, {}, () => { nextCalledSuper = true; });
        assert(nextCalledSuper, 'Super Admin should bypass permission check');

        // 2. Assert Sub Admin permission mapping
        console.log('\nRunning Test 2: Sub Admin permission check...');
        const Role = require('../models/Role');
        const Permission = require('../models/Permission');
        const RolePermission = require('../models/RolePermission');

        // Setup mock role
        const testRole = await Role.findOneAndUpdate(
            { name: 'Test QA Role' },
            { name: 'Test QA Role', description: 'Test', status: 'active' },
            { upsert: true, new: true }
        );

        // Setup mock permissions
        const viewPerm = await Permission.findOneAndUpdate(
            { slug: 'test.view' },
            { module_name: 'Test', permission_name: 'Test View', slug: 'test.view' },
            { upsert: true, new: true }
        );

        const editPerm = await Permission.findOneAndUpdate(
            { slug: 'test.edit' },
            { module_name: 'Test', permission_name: 'Test Edit', slug: 'test.edit' },
            { upsert: true, new: true }
        );

        // Clear existing mock permissions
        await RolePermission.deleteMany({ role_id: testRole._id });

        // Map testRole to test.view but not test.edit
        await RolePermission.create({
            role_id: testRole._id,
            permission_id: viewPerm._id
        });

        // Mock Sub Admin with role
        const reqSubAdmin = {
            user: {
                roles: ['admin'],
                role_id: testRole._id
            }
        };

        let nextCalledView = false;
        const viewMiddleware = checkPermission('test.view');
        await viewMiddleware(reqSubAdmin, {}, () => { nextCalledView = true; });
        assert(nextCalledView, 'Sub Admin with view permission should access test.view');

        let nextCalledEdit = false;
        let resStatus = null;
        let resJson = null;
        const resMock = {
            status: (code) => {
                resStatus = code;
                return {
                    json: (data) => { resJson = data; }
                };
            }
        };

        const editMiddleware = checkPermission('test.edit');
        await editMiddleware(reqSubAdmin, resMock, () => { nextCalledEdit = true; });
        
        assert(!nextCalledEdit, 'Sub Admin without edit permission should be blocked on test.edit');
        assert(resStatus === 403, 'Response status should be 403 Forbidden');
        assert(resJson && resJson.success === false, 'Response payload should indicate success false');

        // Cleanup
        await RolePermission.deleteMany({ role_id: testRole._id });
        await testRole.deleteOne();
        await viewPerm.deleteOne();
        await editPerm.deleteOne();

        console.log('\n\x1b[32m✅ All RBAC verification tests passed successfully!\x1b[0m');
        mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Test run failed with error:', err);
        process.exit(1);
    }
};

runTests();
