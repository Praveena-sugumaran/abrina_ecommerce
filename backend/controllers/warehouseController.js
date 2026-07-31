const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const GoodsReceivedNote = require('../models/GoodsReceivedNote');
const StockTransfer = require('../models/StockTransfer');
const WarehouseAuditLog = require('../models/WarehouseAuditLog');
const Product = require('../models/Product');
const AdminUser = require('../models/AdminUser');
const Order = require('../models/Order');

// Helper to sync aggregate Product countInStock from the Inventory collection
const syncProductTotalStock = async (productId, session = null) => {
    const aggregate = await Inventory.aggregate([
        { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: '$product_id', totalQuantity: { $sum: '$quantity' } } }
    ]).session(session);

    const totalQty = aggregate.length > 0 ? aggregate[0].totalQuantity : 0;
    await Product.findByIdAndUpdate(productId, { countInStock: totalQty }).session(session);
};

// ── WAREHOUSE CRUD ──

exports.getWarehouses = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        let query = {};

        // Manager scoping
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin && req.query.all !== 'true') {
            const assigned = req.user.assignedWarehouses || [];
            query._id = { $in: assigned };
        }

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [warehouses, total] = await Promise.all([
            Warehouse.find(query).populate('assigned_managers', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Warehouse.countDocuments(query)
        ]);

        res.json({
            success: true,
            warehouses,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createWarehouse = async (req, res) => {
    try {
        const { name, code, address, warehouse_type, low_stock_threshold, contact_email, contact_phone, assigned_managers } = req.body;

        if (!contact_email || !contact_email.trim() || !contact_phone || !contact_phone.trim()) {
            return res.status(400).json({ success: false, message: 'Contact email and contact phone are required' });
        }

        const existing = await Warehouse.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Warehouse code must be unique' });
        }

        const warehouse = await Warehouse.create({
            name,
            code,
            address,
            warehouse_type,
            low_stock_threshold: low_stock_threshold !== undefined ? low_stock_threshold : 10,
            contact_email: contact_email.trim(),
            contact_phone: contact_phone.trim(),
            assigned_managers: assigned_managers || []
        });

        // Audit Log
        await WarehouseAuditLog.create({
            warehouse_id: warehouse._id,
            action: 'CREATE',
            user_id: req.user._id,
            new_data: warehouse.toObject()
        });

        // Update assigned managers' assignedWarehouses lists
        if (assigned_managers && assigned_managers.length > 0) {
            await AdminUser.updateMany(
                { _id: { $in: assigned_managers } },
                { $addToSet: { assignedWarehouses: warehouse._id } }
            );
        }

        res.status(201).json({ success: true, warehouse });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.updateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        const oldData = warehouse.toObject();
        const { name, address, warehouse_type, low_stock_threshold, contact_email, contact_phone, assigned_managers, status } = req.body;

        if (contact_email !== undefined && !contact_email.trim()) {
            return res.status(400).json({ success: false, message: 'Contact email is required' });
        }
        if (contact_phone !== undefined && !contact_phone.trim()) {
            return res.status(400).json({ success: false, message: 'Contact phone is required' });
        }

        if (name !== undefined) warehouse.name = name;
        if (address !== undefined) warehouse.address = address;
        if (warehouse_type !== undefined) warehouse.warehouse_type = warehouse_type;
        if (low_stock_threshold !== undefined) warehouse.low_stock_threshold = low_stock_threshold;
        if (contact_email !== undefined) warehouse.contact_email = contact_email.trim();
        if (contact_phone !== undefined) warehouse.contact_phone = contact_phone.trim();
        if (status !== undefined) warehouse.status = status;

        const oldManagers = warehouse.assigned_managers.map(id => id.toString());
        if (assigned_managers !== undefined) {
            warehouse.assigned_managers = assigned_managers;
        }

        await warehouse.save();

        // Update managers lists if managers changed
        if (assigned_managers !== undefined) {
            const newManagers = assigned_managers.map(id => id.toString());
            const added = newManagers.filter(id => !oldManagers.includes(id));
            const removed = oldManagers.filter(id => !newManagers.includes(id));

            if (added.length > 0) {
                await AdminUser.updateMany(
                    { _id: { $in: added } },
                    { $addToSet: { assignedWarehouses: warehouse._id } }
                );
            }
            if (removed.length > 0) {
                await AdminUser.updateMany(
                    { _id: { $in: removed } },
                    { $pull: { assignedWarehouses: warehouse._id } }
                );
            }
        }

        // Audit Log
        await WarehouseAuditLog.create({
            warehouse_id: warehouse._id,
            action: 'UPDATE',
            user_id: req.user._id,
            old_data: oldData,
            new_data: warehouse.toObject()
        });

        res.json({ success: true, warehouse });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        const oldData = warehouse.toObject();
        // Structural Protection: Soft delete only
        warehouse.status = 'inactive';
        await warehouse.save();

        // Remove from all managers' lists
        await AdminUser.updateMany(
            { assignedWarehouses: warehouse._id },
            { $pull: { assignedWarehouses: warehouse._id } }
        );

        // Audit Log
        await WarehouseAuditLog.create({
            warehouse_id: warehouse._id,
            action: 'DEACTIVATE_SOFT_DELETE',
            user_id: req.user._id,
            old_data: oldData,
            new_data: warehouse.toObject()
        });

        res.json({ success: true, message: 'Warehouse deactivated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── GOODS RECEIVED NOTE (GRN) INTAKE ──

exports.createGoodsReceivedNote = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { grn_number, warehouse_id, purchase_order_reference, items } = req.body;

        const existing = await GoodsReceivedNote.findOne({ grn_number: grn_number.toUpperCase() }).session(session);
        if (existing) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'GRN number already exists' });
        }

        const grnItems = [];
        for (const item of items) {
            const { product_id, quantity_received } = item;

            // Find or initialize inventory
            let inventory = await Inventory.findOne({ warehouse_id, product_id }).session(session);
            const beforeQty = inventory ? inventory.quantity : 0;
            const afterQty = beforeQty + parseInt(quantity_received);

            if (inventory) {
                inventory.quantity = afterQty;
                await inventory.save({ session });
            } else {
                inventory = await Inventory.create([{
                    warehouse_id,
                    product_id,
                    quantity: afterQty
                }], { session });
            }

            // Write Ledger Transaction
            await InventoryTransaction.create([{
                warehouse_id,
                product_id,
                transaction_type: 'PURCHASE',
                quantity: parseInt(quantity_received),
                before_qty: beforeQty,
                after_qty: afterQty,
                reference_type: 'GoodsReceivedNote',
                created_by: req.user._id
            }], { session });

            // Sync aggregate countInStock on Product
            await syncProductTotalStock(product_id, session);

            grnItems.push({
                product_id,
                quantity_received: parseInt(quantity_received)
            });
        }

        const grn = await GoodsReceivedNote.create([{
            grn_number: grn_number.toUpperCase(),
            warehouse_id,
            purchase_order_reference,
            items: grnItems,
            received_by: req.user._id
        }], { session });

        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ success: true, grn: grn[0] });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── INVENTORY ADJUSTMENT ──

exports.createInventoryAdjustment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { warehouse_id, product_id, adjustment_type, quantity, reason } = req.body;
        const qtyDelta = parseInt(quantity);

        let inventory = await Inventory.findOne({ warehouse_id, product_id }).session(session);
        const beforeQty = inventory ? inventory.quantity : 0;
        let afterQty = beforeQty;

        if (adjustment_type === 'ADD') {
            afterQty += qtyDelta;
        } else {
            afterQty -= qtyDelta;
            if (afterQty < 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'Stock quantity cannot drop below zero' });
            }
            if (inventory && afterQty < inventory.reserved_quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'Stock quantity cannot drop below reserved orders stock' });
            }
        }

        if (inventory) {
            inventory.quantity = afterQty;
            await inventory.save({ session });
        } else {
            if (adjustment_type === 'SUBTRACT') {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'Cannot subtract stock. No inventory record exists' });
            }
            inventory = await Inventory.create([{
                warehouse_id,
                product_id,
                quantity: afterQty
            }], { session });
        }

        // Ledger
        await InventoryTransaction.create([{
            warehouse_id,
            product_id,
            transaction_type: 'ADJUSTMENT',
            quantity: adjustment_type === 'ADD' ? qtyDelta : -qtyDelta,
            before_qty: beforeQty,
            after_qty: afterQty,
            reference_type: 'InventoryAdjustment',
            created_by: req.user._id
        }], { session });

        // Sync Product
        await syncProductTotalStock(product_id, session);

        const adj = await InventoryAdjustment.create([{
            warehouse_id,
            product_id,
            adjustment_type,
            quantity: qtyDelta,
            reason,
            created_by: req.user._id
        }], { session });

        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ success: true, adjustment: adj[0] });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── INVENTORY STATUS LIST ──

exports.getInventoryStatus = async (req, res) => {
    try {
        const { warehouse_id, search, lowStock, page = 1, limit = 10 } = req.query;
        let query = {};

        // Manager scoping
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin) {
            const assigned = req.user.assignedWarehouses || [];
            query.warehouse_id = { $in: assigned };
        }

        if (warehouse_id) {
            query.warehouse_id = warehouse_id;
        }

        // Search products
        if (search) {
            const matchedProducts = await Product.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');
            const productIds = matchedProducts.map(p => p._id);
            query.product_id = { $in: productIds };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        let inventoryList = await Inventory.find(query)
            .populate('warehouse_id', 'name code low_stock_threshold')
            .populate('product_id', 'name sku main_image main_price countInStock')
            .sort({ updatedAt: -1 });

        // Filter low stock if requested
        if (lowStock === 'true') {
            inventoryList = inventoryList.filter(item => {
                const threshold = item.warehouse_id?.low_stock_threshold || 10;
                return item.quantity <= threshold;
            });
        }

        const total = inventoryList.length;
        const paginated = inventoryList.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            inventory: paginated,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── STOCK TRANSFERS ──

exports.createStockTransfer = async (req, res) => {
    try {
        const { from_warehouse, to_warehouse, product, quantity, notes } = req.body;

        if (from_warehouse === to_warehouse) {
            return res.status(400).json({ success: false, message: 'Source and destination warehouses cannot be the same' });
        }

        // Validate source inventory availability
        const sourceInventory = await Inventory.findOne({ warehouse_id: from_warehouse, product_id: product });
        const available = sourceInventory ? (sourceInventory.quantity - sourceInventory.reserved_quantity) : 0;

        if (available < parseInt(quantity)) {
            return res.status(400).json({ success: false, message: `Insufficient available stock in source warehouse. Available: ${available}` });
        }

        const transfer = await StockTransfer.create({
            from_warehouse,
            to_warehouse,
            product,
            quantity: parseInt(quantity),
            status: 'Draft',
            notes
        });

        res.status(201).json({ success: true, transfer });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getTransfers = async (req, res) => {
    try {
        const { warehouse_id, status, page = 1, limit = 10 } = req.query;
        let query = {};

        // Manager scoping
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin) {
            const assigned = req.user.assignedWarehouses || [];
            query.$or = [
                { from_warehouse: { $in: assigned } },
                { to_warehouse: { $in: assigned } }
            ];
        }

        if (warehouse_id) {
            query.$or = [
                { from_warehouse: warehouse_id },
                { to_warehouse: warehouse_id }
            ];
        }

        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [transfers, total] = await Promise.all([
            StockTransfer.find(query)
                .populate('from_warehouse', 'name code')
                .populate('to_warehouse', 'name code')
                .populate('product', 'name sku main_image')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            StockTransfer.countDocuments(query)
        ]);

        res.json({
            success: true,
            transfers,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateTransferStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const transfer = await StockTransfer.findById(req.params.id).session(session);
        if (!transfer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        const { status } = req.body;
        const validStatuses = ['Draft', 'Pending Approval', 'Approved', 'In Transit', 'Received', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const currentStatus = transfer.status;
        if (currentStatus === 'Received' || currentStatus === 'Cancelled') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Cannot modify a completed or cancelled transfer' });
        }

        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin) {
            const assigned = (req.user.assignedWarehouses || []).map(id => id.toString());
            
            if (['In Transit', 'Cancelled', 'Draft', 'Pending Approval', 'Approved'].includes(status)) {
                if (!assigned.includes(transfer.from_warehouse.toString())) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(403).json({ success: false, message: 'You are not assigned to manage the source warehouse of this transfer' });
                }
            }
            if (status === 'Received') {
                if (!assigned.includes(transfer.to_warehouse.toString())) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(403).json({ success: false, message: 'You are not assigned to manage the destination warehouse of this transfer' });
                }
            }
        }

        // Logic check for transition into transit (Subtract from source)
        if (status === 'In Transit' && currentStatus !== 'In Transit') {
            const sourceInventory = await Inventory.findOne({
                warehouse_id: transfer.from_warehouse,
                product_id: transfer.product
            }).session(session);

            if (!sourceInventory || (sourceInventory.quantity - sourceInventory.reserved_quantity) < transfer.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'Insufficient stock in source warehouse to ship' });
            }

            const beforeQty = sourceInventory.quantity;
            sourceInventory.quantity -= transfer.quantity;
            await sourceInventory.save({ session });

            // Ledger
            await InventoryTransaction.create([{
                warehouse_id: transfer.from_warehouse,
                product_id: transfer.product,
                transaction_type: 'TRANSFER_OUT',
                quantity: -transfer.quantity,
                before_qty: beforeQty,
                after_qty: sourceInventory.quantity,
                reference_type: 'StockTransfer',
                reference_id: transfer._id,
                created_by: req.user._id
            }], { session });

            await syncProductTotalStock(transfer.product, session);
        }

        // Logic check for receipt (Add to destination)
        if (status === 'Received' && currentStatus === 'In Transit') {
            let destInventory = await Inventory.findOne({
                warehouse_id: transfer.to_warehouse,
                product_id: transfer.product
            }).session(session);

            const beforeQty = destInventory ? destInventory.quantity : 0;
            const afterQty = beforeQty + transfer.quantity;

            if (destInventory) {
                destInventory.quantity = afterQty;
                await destInventory.save({ session });
            } else {
                destInventory = await Inventory.create([{
                    warehouse_id: transfer.to_warehouse,
                    product_id: transfer.product,
                    quantity: afterQty
                }], { session });
            }

            // Ledger
            await InventoryTransaction.create([{
                warehouse_id: transfer.to_warehouse,
                product_id: transfer.product,
                transaction_type: 'TRANSFER_IN',
                quantity: transfer.quantity,
                before_qty: beforeQty,
                after_qty: afterQty,
                reference_type: 'StockTransfer',
                reference_id: transfer._id,
                created_by: req.user._id
            }], { session });

            await syncProductTotalStock(transfer.product, session);
        }

        // Logic check for reversion (revert source stock if cancelled while in transit)
        if (status === 'Cancelled' && currentStatus === 'In Transit') {
            const sourceInventory = await Inventory.findOne({
                warehouse_id: transfer.from_warehouse,
                product_id: transfer.product
            }).session(session);

            if (sourceInventory) {
                const beforeQty = sourceInventory.quantity;
                sourceInventory.quantity += transfer.quantity;
                await sourceInventory.save({ session });

                // Ledger reversion
                await InventoryTransaction.create([{
                    warehouse_id: transfer.from_warehouse,
                    product_id: transfer.product,
                    transaction_type: 'TRANSFER_IN', // return it back
                    quantity: transfer.quantity,
                    before_qty: beforeQty,
                    after_qty: sourceInventory.quantity,
                    reference_type: 'StockTransfer',
                    reference_id: transfer._id,
                    created_by: req.user._id
                }], { session });

                await syncProductTotalStock(transfer.product, session);
            }
        }

        transfer.status = status;
        await transfer.save({ session });

        await session.commitTransaction();
        session.endSession();
        res.json({ success: true, transfer });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
};

// ── AUTO STOCK RESERVATION (TRIGGERED ON ORDER PLACEMENT) ──

exports.reserveStockForOrder = async (orderId, session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || !order.warehouse_id) return;

    for (const item of order.order_items) {
        if (!item.product_id) continue;

        let inventory = await Inventory.findOne({
            warehouse_id: order.warehouse_id,
            product_id: item.product_id
        }).session(session);

        if (!inventory) {
            inventory = await Inventory.create([{
                warehouse_id: order.warehouse_id,
                product_id: item.product_id,
                quantity: 0,
                reserved_quantity: item.quantity
            }], { session });
            inventory = inventory[0];
        } else {
            inventory.reserved_quantity += item.quantity;
            await inventory.save({ session });
        }
    }
};

exports.commitStockShipment = async (orderId, session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || !order.warehouse_id) return;

    for (const item of order.order_items) {
        if (!item.product_id) continue;

        const inventory = await Inventory.findOne({
            warehouse_id: order.warehouse_id,
            product_id: item.product_id
        }).session(session);

        if (inventory) {
            const beforeQty = inventory.quantity;
            inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
            inventory.reserved_quantity = Math.max(0, inventory.reserved_quantity - item.quantity);
            await inventory.save({ session });

            // Write Ledger Transaction
            await InventoryTransaction.create([{
                warehouse_id: order.warehouse_id,
                product_id: item.product_id,
                transaction_type: 'SALE',
                quantity: -item.quantity,
                before_qty: beforeQty,
                after_qty: inventory.quantity,
                reference_type: 'Order',
                reference_id: orderId
            }], { session });

            await syncProductTotalStock(item.product_id, session);
        }
    }
};

exports.cancelOrderReservation = async (orderId, session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || !order.warehouse_id) return;

    for (const item of order.order_items) {
        if (!item.product_id) continue;

        const inventory = await Inventory.findOne({
            warehouse_id: order.warehouse_id,
            product_id: item.product_id
        }).session(session);

        if (inventory) {
            inventory.reserved_quantity = Math.max(0, inventory.reserved_quantity - item.quantity);
            await inventory.save({ session });
        }
    }
};

exports.getTransactionLogs = async (req, res) => {
    try {
        const { warehouse_id, product_id, transaction_type, page = 1, limit = 10 } = req.query;
        let query = {};

        // Manager scoping
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin) {
            const assigned = req.user.assignedWarehouses || [];
            query.warehouse_id = { $in: assigned };
        } else if (warehouse_id) {
            query.warehouse_id = warehouse_id;
        }

        if (product_id) {
            query.product_id = product_id;
        }
        if (transaction_type) {
            query.transaction_type = transaction_type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [transactions, total] = await Promise.all([
            InventoryTransaction.find(query)
                .populate('warehouse_id', 'name code')
                .populate('product_id', 'name sku')
                .populate('created_by', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            InventoryTransaction.countDocuments(query)
        ]);

        res.json({
            success: true,
            transactions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getWarehouseAuditLogs = async (req, res) => {
    try {
        const { warehouse_id, action, page = 1, limit = 10 } = req.query;
        let query = {};

        // Manager scoping
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        const isSuperAdmin = userRoles.includes('admin') && !req.user.role_id;
        if (!isSuperAdmin) {
            const assigned = req.user.assignedWarehouses || [];
            query.warehouse_id = { $in: assigned };
        } else if (warehouse_id) {
            query.warehouse_id = warehouse_id;
        }

        if (action) {
            query.action = action;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            WarehouseAuditLog.find(query)
                .populate('warehouse_id', 'name code')
                .populate('user_id', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            WarehouseAuditLog.countDocuments(query)
        ]);

        res.json({
            success: true,
            logs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
