const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { getPaymentSettings, updatePaymentSettings } = require('../../controllers/paymentSettingController');
const { getSocialLogin, updateSocialLogin } = require('../../controllers/socialLoginController');
const { getSiteSettings, updateSiteSettings, exportDatabaseBackup } = require('../../controllers/admin/siteSettingController');
const businessTypeController = require('../../controllers/admin/businessTypeController');
const emailTemplateController = require('../../controllers/admin/emailTemplateController');
const payoutMethodController = require('../../controllers/admin/payoutMethodController');
const { protect, authorizeRoles, checkPermission } = require('../../middlewares/authMiddleware');

// Register Mongoose models to prevent "Schema hasn't been registered" errors
require('../../models/Role');
require('../../models/Permission');
require('../../models/RolePermission');
require('../../models/AdminUser');

// Base route is /api/admin
router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/products', adminController.getAdminProducts);
router.put('/products/:id/approve', adminController.approveProduct);
router.put('/products/:id/reject', adminController.rejectProduct);
router.delete('/products/:id', adminController.deleteProduct);

router.get('/companies', adminController.getAdminCompanies);
router.put('/companies/:id/verify', adminController.verifyCompany);
router.post('/companies/:id/factory-audit', adminController.addFactoryAudit);

// Payment settings
router.get('/payment-settings', getPaymentSettings);
router.put('/payment-settings', updatePaymentSettings);

// Social Login settings
router.get('/social-login', getSocialLogin);
router.put('/social-login', updateSocialLogin);

// Audit Logs
const AuditLog = require('../../models/AuditLog');
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('userId', 'email first_name last_name');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Risk Alerts (Fraud Detection)
router.get('/risk-alerts', adminController.getRiskAlerts);

// ─── Admin Session / Device Management ────────────────────────────────────────
router.get('/sessions', async (req, res) => {
    try {
        const UserSession = require('../../models/UserSession');
        const { page = 1, limit = 20, search, status, device_type } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {};
        if (status === 'active') query.is_active = true;
        else if (status === 'expired') query.is_active = false;
        if (device_type && device_type !== 'all') {
            query.device_type = { $regex: device_type, $options: 'i' };
        }

        // Build session query and then filter by user if search provided
        let sessions = [];
        let total = 0;
        let stats = { total: 0, active: 0, mobile: 0, desktop: 0 };

        if (search) {
            const User = require('../../models/User');
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = matchingUsers.map(u => u._id);
            const ipBrowserQuery = {
                ...query,
                $or: [
                    { user_id: { $in: userIds } },
                    { ip_address: { $regex: search, $options: 'i' } },
                    { browser: { $regex: search, $options: 'i' } },
                    { os: { $regex: search, $options: 'i' } }
                ]
            };
            total = await UserSession.countDocuments(ipBrowserQuery);
            sessions = await UserSession.find(ipBrowserQuery)
                .populate('user_id', 'name email role')
                .sort({ last_active: -1 })
                .skip(skip).limit(parseInt(limit));
        } else {
            total = await UserSession.countDocuments(query);
            sessions = await UserSession.find(query)
                .populate('user_id', 'name email role')
                .sort({ last_active: -1 })
                .skip(skip).limit(parseInt(limit));
        }

        // Compute stats
        stats.total = await UserSession.countDocuments({});
        stats.active = await UserSession.countDocuments({ is_active: true, expires_at: { $gt: new Date() } });
        stats.mobile = await UserSession.countDocuments({ device_type: { $regex: 'mobile|phone', $options: 'i' } });
        stats.desktop = await UserSession.countDocuments({ device_type: { $not: /mobile|phone|tablet/i } });

        res.json({
            sessions,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            stats
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/sessions/:id', async (req, res) => {
    try {
        const UserSession = require('../../models/UserSession');
        const session = await UserSession.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        session.is_active = false;
        await session.save();
        res.json({ message: 'Session revoked successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/sessions/bulk-revoke', async (req, res) => {
    try {
        const UserSession = require('../../models/UserSession');
        const { session_ids } = req.body;
        if (!Array.isArray(session_ids) || session_ids.length === 0) {
            return res.status(400).json({ message: 'session_ids array is required' });
        }
        await UserSession.updateMany(
            { _id: { $in: session_ids } },
            { $set: { is_active: false } }
        );
        res.json({ message: `${session_ids.length} session(s) revoked` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// ──────────────────────────────────────────────────────────────────────────────


// Site Settings (color picker etc)
router.get('/site-settings', getSiteSettings);
router.put('/site-settings', updateSiteSettings);
router.get('/database-backup', exportDatabaseBackup);

// Dummy Data Reset & Import Management
const dummyDataController = require('../../controllers/admin/dummyDataController');
router.get('/dummy-data/status', dummyDataController.getStatus);
router.post('/dummy-data/import', dummyDataController.triggerImport);
router.post('/dummy-data/cleanup', dummyDataController.triggerCleanup);
router.get('/dummy-data/logs', dummyDataController.getLogs);

// Email Settings (.env modification)
const { getEmailSettings, updateEmailSettings, sendTestEmail } = require('../../controllers/admin/emailSettingController');
router.get('/email-settings', getEmailSettings);
router.put('/email-settings', updateEmailSettings);
router.post('/email-settings/test', sendTestEmail);

// Dynamic Menu
router.get('/menu', async (req, res) => {
    try {
        const menu = require('../../config/adminMenu.json');
        
        // Filter menu based on permissions
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        
        if (isSuperAdmin) {
            return res.json(menu);
        }
        
        // Resolve permissions for the Sub Admin
        const RolePermission = require('../../models/RolePermission');
        const rolePerms = await RolePermission.find({ role_id: req.user.role_id }).populate('permission_id');
        const userPermissions = rolePerms.map(rp => rp.permission_id?.slug).filter(Boolean);
        
        const filteredMenu = [];
        
        for (const item of menu) {
            if (item.group) {
                // It's a group, filter items in it
                const filteredItems = (item.items || []).filter(subItem => {
                    const requiredPerm = subItem.permission;
                    if (!requiredPerm) return true; // Default viewable if no permission specified
                    return userPermissions.includes(requiredPerm);
                });
                
                if (filteredItems.length > 0) {
                    filteredMenu.push({
                        ...item,
                        items: filteredItems
                    });
                }
            } else {
                // Plain menu item
                const requiredPerm = item.permission;
                if (!requiredPerm || userPermissions.includes(requiredPerm)) {
                    filteredMenu.push(item);
                }
            }
        }
        
        res.json(filteredMenu);
    } catch (err) {
        console.error('Menu filtering error:', err);
        res.status(500).json({ message: 'Failed to load menu configuration' });
    }
});

// Roles
router.get('/roles', checkPermission('roles.view'), async (req, res) => {
    try {
        const Role = require('../../models/Role');
        const { search, page = 1, limit = 10 } = req.query;
        
        let query = { name: { $nin: ['admin', 'buyer', 'supplier'] } };
        if (search) {
            query.name = { $regex: search, $options: 'i', $nin: ['admin', 'buyer', 'supplier'] };
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [roles, total] = await Promise.all([
            Role.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Role.countDocuments(query)
        ]);
        
        // Populate permissions count and check if they are mapped
        const RolePermission = require('../../models/RolePermission');
        const populatedRoles = await Promise.all(roles.map(async (role) => {
            const rolePerms = await RolePermission.find({ role_id: role._id }).populate('permission_id');
            const roleObj = role.toObject();
            roleObj.permissions = rolePerms.map(rp => rp.permission_id?.slug).filter(Boolean);
            roleObj.permissionsCount = rolePerms.length;
            return roleObj;
        }));
        
        res.json({
            roles: populatedRoles,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/roles', checkPermission('roles.create'), async (req, res) => {
    try {
        const Role = require('../../models/Role');
        const { name, description, status, permissions } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Role Name is required' });
        }
        
        const existing = await Role.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Role name must be unique' });
        }
        
        const role = await Role.create({
            name: name.trim(),
            description,
            status: status || 'active'
        });
        
        // Save role_permissions
        if (Array.isArray(permissions) && permissions.length > 0) {
            const Permission = require('../../models/Permission');
            const RolePermission = require('../../models/RolePermission');
            
            const perms = await Permission.find({ slug: { $in: permissions } });
            const mappings = perms.map(p => ({
                role_id: role._id,
                permission_id: p._id
            }));
            if (mappings.length > 0) {
                await RolePermission.insertMany(mappings);
            }
        }
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Role Created', 'ROLE_MANAGEMENT', 'success', { id: role._id, name: role.name });
        
        res.status(201).json(role);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/roles/:id', checkPermission('roles.edit'), async (req, res) => {
    try {
        const Role = require('../../models/Role');
        const { name, description, status, permissions } = req.body;
        
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        
        if (name && name.trim() !== role.name) {
            const existing = await Role.findOne({ name: name.trim() });
            if (existing) {
                return res.status(400).json({ message: 'Role name must be unique' });
            }
            role.name = name.trim();
        }
        
        if (description !== undefined) role.description = description;
        if (status !== undefined) role.status = status;
        await role.save();
        
        // Update role_permissions mapping
        if (Array.isArray(permissions)) {
            const Permission = require('../../models/Permission');
            const RolePermission = require('../../models/RolePermission');
            
            // Clear existing
            await RolePermission.deleteMany({ role_id: role._id });
            
            // Insert new mappings
            if (permissions.length > 0) {
                const perms = await Permission.find({ slug: { $in: permissions } });
                const mappings = perms.map(p => ({
                    role_id: role._id,
                    permission_id: p._id
                }));
                if (mappings.length > 0) {
                    await RolePermission.insertMany(mappings);
                }
            }
        }
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Role Updated', 'ROLE_MANAGEMENT', 'success', { id: role._id, name: role.name });
        
        res.json(role);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/roles/:id', checkPermission('roles.delete'), async (req, res) => {
    try {
        const Role = require('../../models/Role');
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        
        // Check if any Sub-Admins are using this role before deletion
        const AdminUser = require('../../models/AdminUser');
        const inUse = await AdminUser.findOne({ role_id: role._id });
        if (inUse) {
            return res.status(400).json({ message: 'Cannot delete role. It is assigned to one or more Sub Admins.' });
        }
        
        // Remove mappings
        const RolePermission = require('../../models/RolePermission');
        await RolePermission.deleteMany({ role_id: role._id });
        
        // Remove role
        await role.deleteOne();
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Role Deleted', 'ROLE_MANAGEMENT', 'success', { id: role._id, name: role.name });
        
        res.json({ success: true, message: 'Role deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Permissions list
router.get('/permissions', checkPermission('permissions.view'), async (req, res) => {
    try {
        const Permission = require('../../models/Permission');
        const permissions = await Permission.find().sort({ module_name: 1, permission_name: 1 });
        res.json(permissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Sub Admins CRUD
// Helper for syncing warehouse managers
const syncWarehouseManagers = async (subAdminId, newWarehouses, oldWarehouses = []) => {
    const Warehouse = require('../../models/Warehouse');
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

// Sub Admins CRUD
router.get('/sub-admins', checkPermission('users.view'), async (req, res) => {
    try {
        const AdminUser = require('../../models/AdminUser');
        const { search, page = 1, limit = 10 } = req.query;
        
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [subAdmins, total] = await Promise.all([
            AdminUser.find(query).populate('role_id', 'name').populate('assignedWarehouses', 'name code').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            AdminUser.countDocuments(query)
        ]);
        
        res.json({
            subAdmins,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/sub-admins', checkPermission('users.create'), async (req, res) => {
    try {
        const AdminUser = require('../../models/AdminUser');
        const { name, email, password, role_id, status, assignedWarehouses } = req.body;
        
        if (!name || !email || !password || !role_id) {
            return res.status(400).json({ message: 'All fields (name, email, password, role) are required' });
        }
        
        // Email uniqueness validation
        const existing = await AdminUser.findOne({ email: email.toLowerCase() });
        const existingUser = await require('../../models/User').findOne({ email: email.toLowerCase() });
        if (existing || existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        
        // Password strength validation
        const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!pwRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, number, and special character' });
        }
        
        const subAdmin = await AdminUser.create({
            name,
            email,
            password,
            role_id,
            status: status || 'active',
            assignedWarehouses: assignedWarehouses || []
        });
        
        if (assignedWarehouses && assignedWarehouses.length > 0) {
            await syncWarehouseManagers(subAdmin._id, assignedWarehouses, []);
        }
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Sub Admin Created', 'SUB_ADMIN_MANAGEMENT', 'success', { id: subAdmin._id, email: subAdmin.email });
        
        res.status(201).json({ success: true, message: 'Sub Admin created successfully', subAdmin });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/sub-admins/:id', checkPermission('users.edit'), async (req, res) => {
    try {
        const AdminUser = require('../../models/AdminUser');
        const { name, email, password, role_id, status, resetPassword, assignedWarehouses } = req.body;
        
        const subAdmin = await AdminUser.findById(req.params.id);
        if (!subAdmin) {
            return res.status(404).json({ message: 'Sub Admin not found' });
        }
        
        const oldWarehouses = subAdmin.assignedWarehouses || [];
        
        if (email && email.toLowerCase() !== subAdmin.email) {
            const existing = await AdminUser.findOne({ email: email.toLowerCase() });
            const existingUser = await require('../../models/User').findOne({ email: email.toLowerCase() });
            if (existing || existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            subAdmin.email = email.toLowerCase();
        }
        
        if (name !== undefined) subAdmin.name = name;
        if (role_id !== undefined) subAdmin.role_id = role_id;
        if (status !== undefined) subAdmin.status = status;
        if (assignedWarehouses !== undefined) subAdmin.assignedWarehouses = assignedWarehouses;
        
        // Password Reset logic
        if (resetPassword && password) {
            const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!pwRegex.test(password)) {
                return res.status(400).json({ message: 'Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, number, and special character' });
            }
            subAdmin.password = password;
        }
        
        await subAdmin.save();
        
        if (assignedWarehouses !== undefined) {
            await syncWarehouseManagers(subAdmin._id, assignedWarehouses, oldWarehouses);
        }
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Sub Admin Updated', 'SUB_ADMIN_MANAGEMENT', 'success', { id: subAdmin._id, email: subAdmin.email });
        
        res.json({ success: true, message: 'Sub Admin updated successfully', subAdmin });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/sub-admins/:id', checkPermission('users.delete'), async (req, res) => {
    try {
        const AdminUser = require('../../models/AdminUser');
        const subAdmin = await AdminUser.findById(req.params.id);
        if (!subAdmin) {
            return res.status(404).json({ message: 'Sub Admin not found' });
        }
        
        const oldWarehouses = subAdmin.assignedWarehouses || [];
        await subAdmin.deleteOne();
        
        // Cleanup warehouse manager assignments
        if (oldWarehouses.length > 0) {
            const Warehouse = require('../../models/Warehouse');
            await Warehouse.updateMany(
                { _id: { $in: oldWarehouses } },
                { $pull: { assigned_managers: subAdmin._id } }
            );
        }
        
        // Log Audit
        const auditService = require('../../services/auditService');
        await auditService.logAction(req, 'Sub Admin Deleted', 'SUB_ADMIN_MANAGEMENT', 'success', { id: subAdmin._id, email: subAdmin.email });
        
        res.json({ success: true, message: 'Sub Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Countries
const Country = require('../../models/Country');
router.get('/countries', async (req, res) => {
    try {
        const countries = await Country.find().sort({ name: 1 });
        res.json(countries);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/countries', async (req, res) => {
    try {
        const country = await Country.create(req.body);
        res.status(201).json(country);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/countries/:id', async (req, res) => {
    try {
        const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(country);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/countries/:id', async (req, res) => {
    try {
        await Country.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/countries/seed', async (req, res) => {
    try {
        const countryList = [
            { name: 'Afghanistan', code: 'AF', dial_code: '+93', flag: '🇦🇫', phone_length: 9 },
            { name: 'Albania', code: 'AL', dial_code: '+355', flag: '🇦🇱', phone_length: 9 },
            { name: 'Algeria', code: 'DZ', dial_code: '+213', flag: '🇩🇿', phone_length: 9 },
            { name: 'Andorra', code: 'AD', dial_code: '+376', flag: '🇦🇩', phone_length: 6 },
            { name: 'Angola', code: 'AO', dial_code: '+244', flag: '🇦🇴', phone_length: 9 },
            { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷', phone_length: 10 },
            { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺', phone_length: 9 },
            { name: 'Austria', code: 'AT', dial_code: '+43', flag: '🇦🇹', phone_length: 10 },
            { name: 'Bangladesh', code: 'BD', dial_code: '+880', flag: '🇧🇩', phone_length: 10 },
            { name: 'Belgium', code: 'BE', dial_code: '+32', flag: '🇧🇪', phone_length: 9 },
            { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷', phone_length: 11 },
            { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦', phone_length: 10 },
            { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳', phone_length: 11 },
            { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬', phone_length: 10 },
            { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷', phone_length: 9 },
            { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪', phone_length: 10 },
            { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳', phone_length: 10 },
            { name: 'Indonesia', code: 'ID', dial_code: '+62', flag: '🇮🇩', phone_length: 10 },
            { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹', phone_length: 10 },
            { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵', phone_length: 10 },
            { name: 'Malaysia', code: 'MY', dial_code: '+60', flag: '🇲🇾', phone_length: 9 },
            { name: 'Mexico', code: 'MX', dial_code: '+52', flag: '🇲🇽', phone_length: 10 },
            { name: 'Netherlands', code: 'NL', dial_code: '+31', flag: '🇳🇱', phone_length: 9 },
            { name: 'New Zealand', code: 'NZ', dial_code: '+64', flag: '🇳🇿', phone_length: 9 },
            { name: 'Pakistan', code: 'PK', dial_code: '+92', flag: '🇵🇰', phone_length: 10 },
            { name: 'Russia', code: 'RU', dial_code: '+7', flag: '🇷🇺', phone_length: 10 },
            { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', flag: '🇸🇦', phone_length: 9 },
            { name: 'Singapore', code: 'SG', dial_code: '+65', flag: '🇸🇬', phone_length: 8 },
            { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦', phone_length: 9 },
            { name: 'South Korea', code: 'KR', dial_code: '+82', flag: '🇰🇷', phone_length: 10 },
            { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸', phone_length: 9 },
            { name: 'Switzerland', code: 'CH', dial_code: '+41', flag: '🇨🇭', phone_length: 9 },
            { name: 'Turkey', code: 'TR', dial_code: '+90', flag: '🇹🇷', phone_length: 10 },
            { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪', phone_length: 9 },
            { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧', phone_length: 10 },
            { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸', phone_length: 10 },
            { name: 'Vietnam', code: 'VN', dial_code: '+84', flag: '🇻🇳', phone_length: 10 }
        ];

        for (const c of countryList) {
            await Country.findOneAndUpdate({ code: c.code }, c, { upsert: true });
        }
        res.json({ message: 'Countries seeded successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// States
const State = require('../../models/State');
router.get('/states', async (req, res) => {
    try {
        const states = await State.find().populate('country', 'name');
        res.json(states);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/states', async (req, res) => {
    try {
        const state = await State.create(req.body);
        res.status(201).json(state);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/states/:id', async (req, res) => {
    try {
        const state = await State.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(state);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/states/:id', async (req, res) => {
    try {
        await State.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Footer Menu
const FooterSection = require('../../models/FooterSection');
router.get('/footer-sections', async (req, res) => {
    try {
        const sections = await FooterSection.find().sort({ order: 1 });
        res.json(sections);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/footer-sections', async (req, res) => {
    try {
        const section = await FooterSection.create(req.body);
        res.status(201).json(section);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/footer-sections/:id', async (req, res) => {
    try {
        const section = await FooterSection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(section);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/footer-sections/:id', async (req, res) => {
    try {
        await FooterSection.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Header Menu
const HeaderNavigation = require('../../models/HeaderNavigation');
router.get('/header-navigations', async (req, res) => {
    try {
        const links = await HeaderNavigation.find().populate('parent').sort({ order: 1 });
        res.json(links);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/header-navigations', async (req, res) => {
    try {
        const link = await HeaderNavigation.create(req.body);
        res.status(201).json(link);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/header-navigations/:id', async (req, res) => {
    try {
        const link = await HeaderNavigation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(link);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/header-navigations/:id', async (req, res) => {
    try {
        await HeaderNavigation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Notifications
router.get('/notifications', async (req, res) => {
    try {
        const Notification = require('../../models/Notification');
        const notifications = await Notification.find({ userId: req.user._id, type: 'admin' }).sort({ createdAt: -1 }).limit(10);
        res.json(notifications);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Withdrawal Requests Management
router.get('/withdraw-requests', async (req, res) => {
    try {
        const Transaction = require('../../models/Transaction');
        const requests = await Transaction.find({ type: 'withdraw' }).populate('user_id', 'email first_name last_name company_name payout_methods').sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/payout-methods', adminController.getSupplierPayouts);

// Global Payout Options (Available for suppliers)
router.get('/payout-settings', payoutMethodController.getPayoutMethods);
router.put('/payout-settings/:id', payoutMethodController.updatePayoutMethod);
router.delete('/payout-settings/:id', payoutMethodController.deletePayoutMethod);
router.post('/payout-settings/seed', payoutMethodController.seedPayoutMethods);

router.put('/withdraw-requests/:id/approve', async (req, res) => {
    try {
        const Transaction = require('../../models/Transaction');
        const User = require('../../models/User');
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Request not found' });
        
        const supplier = await User.findById(transaction.user_id);
        if (supplier.wallet_balance < transaction.amount) {
            return res.status(400).json({ message: 'Insufficient supplier balance' });
        }

        supplier.wallet_balance -= transaction.amount;
        await supplier.save({ validateBeforeSave: false });

        transaction.status = 'approved';
        await transaction.save();

        res.json({ success: true, message: 'Withdrawal approved and balance updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/withdraw-requests/:id/decline', async (req, res) => {
    try {
        const Transaction = require('../../models/Transaction');
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Request not found' });

        transaction.status = 'declined';
        await transaction.save();

        res.json({ success: true, message: 'Withdrawal declined' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Business Types
router.get('/business-types', businessTypeController.getBusinessTypes);
router.post('/business-types', businessTypeController.createBusinessType);
router.put('/business-types/:id', businessTypeController.updateBusinessType);
router.delete('/business-types/:id', businessTypeController.deleteBusinessType);

// Languages
const Language = require('../../models/Language');
router.get('/languages', async (req, res) => {
    try {
        const languages = await Language.find().sort({ name: 1 });
        res.json(languages);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/languages', async (req, res) => {
    try {
        const language = await Language.create(req.body);
        res.status(201).json(language);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/languages/:id', async (req, res) => {
    try {
        const language = await Language.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(language);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/languages/:id', async (req, res) => {
    try {
        await Language.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Currencies
const Currency = require('../../models/Currency');
router.get('/currencies', async (req, res) => {
    try {
        const currencies = await Currency.find().sort({ code: 1 });
        res.json(currencies);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/currencies', async (req, res) => {
    try {
        const currency = await Currency.create(req.body);
        res.status(201).json(currency);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/currencies/:id', async (req, res) => {
    try {
        const currency = await Currency.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(currency);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/currencies/:id', async (req, res) => {
    try {
        await Currency.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Shipping Rules
const ShippingRule = require('../../models/ShippingRule');
router.get('/shipping-rules', async (req, res) => {
    try {
        const rules = await ShippingRule.find().sort({ country_name: 1 });
        res.json(rules);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/shipping-rules', async (req, res) => {
    try {
        const rule = await ShippingRule.create(req.body);
        res.status(201).json(rule);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.put('/shipping-rules/:id', async (req, res) => {
    try {
        const rule = await ShippingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(rule);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete('/shipping-rules/:id', async (req, res) => {
    try {
        await ShippingRule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Email Templates
router.get('/email-templates', emailTemplateController.getAllTemplates);
router.get('/email-templates/:id', emailTemplateController.getTemplateById);
router.post('/email-templates', emailTemplateController.createTemplate);
router.put('/email-templates/:id', emailTemplateController.updateTemplate);
router.delete('/email-templates/:id', emailTemplateController.deleteTemplate);

// Licensing Services
const licenseService = require('../../services/licenseService');
const cryptoService = require('../../services/cryptoService');

router.get('/license/details', async (req, res) => {
    try {
        const SiteSetting = require('../../models/SiteSetting');
        const settings = await SiteSetting.findOne();
        if (!settings) return res.status(404).json({ message: 'Settings not found' });

        const rawCode = cryptoService.decrypt(settings.license_key_encrypted) || '';
        const rawInstallId = cryptoService.decrypt(settings.installation_id_encrypted) || '';

        let maskedCode = 'N/A';
        if (rawCode) {
            const parts = rawCode.split('-');
            if (parts.length >= 3) {
                maskedCode = `${parts[0]}-${parts[1]}-XXXX-XXXX-${parts[parts.length - 1]}`;
            } else {
                maskedCode = rawCode.substring(0, 4) + '...' + rawCode.substring(Math.max(4, rawCode.length - 4));
            }
        }

        res.json({
            license_status: settings.license_status,
            purchase_code: maskedCode,
            installation_id: rawInstallId || 'N/A',
            last_verified_at: settings.last_verified_at
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/license/request-transfer', async (req, res) => {
    try {
        const result = await licenseService.requestTransfer(req.hostname);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
