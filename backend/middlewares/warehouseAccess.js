const checkWarehouseAccess = (paramLocation = 'params', fieldName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, no user found' });
        }

        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;

        if (isSuperAdmin) {
            return next();
        }

        // Extract warehouse ID
        let warehouseId;
        if (paramLocation === 'params') {
            warehouseId = req.params[fieldName];
        } else if (paramLocation === 'body') {
            warehouseId = req.body[fieldName];
        } else if (paramLocation === 'query') {
            warehouseId = req.query[fieldName];
        }

        if (!warehouseId) {
            return next();
        }

        const assigned = req.user.assignedWarehouses || [];
        const isAssigned = assigned.some(id => id.toString() === warehouseId.toString());

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: You are not assigned to manage this warehouse.'
            });
        }

        next();
    };
};

const scopeWarehouseOrders = (req, res, next) => {
    if (!req.user) {
        return next();
    }
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;

    if (isSuperAdmin) {
        return next();
    }

    const assigned = req.user.assignedWarehouses || [];
    // Restrict the query to only assigned warehouses
    req.query.warehouse_id = { $in: assigned };
    next();
};

module.exports = { checkWarehouseAccess, scopeWarehouseOrders };
