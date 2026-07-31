const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/authMiddleware');
const { checkWarehouseAccess } = require('../middlewares/warehouseAccess');
const {
    getWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    createGoodsReceivedNote,
    createInventoryAdjustment,
    getInventoryStatus,
    createStockTransfer,
    getTransfers,
    updateTransferStatus,
    getTransactionLogs,
    getWarehouseAuditLogs
} = require('../controllers/warehouseController');

// All warehouse routes are protected by default (logged-in sub-admins or admins)
router.use(protect);

// Warehouse Master CRUD
router.get('/', checkPermission('warehouses.view'), getWarehouses);
router.post('/', checkPermission('warehouses.create'), createWarehouse);
router.put('/:id', checkPermission('warehouses.edit'), checkWarehouseAccess('params', 'id'), updateWarehouse);
router.delete('/:id', checkPermission('warehouses.edit'), checkWarehouseAccess('params', 'id'), deleteWarehouse);

// Inventory Status & Operations
router.get('/inventory', checkPermission('warehouse.inventory.view'), getInventoryStatus);
router.post('/grn', checkPermission('warehouse.inventory.edit'), checkWarehouseAccess('body', 'warehouse_id'), createGoodsReceivedNote);
router.post('/adjust', checkPermission('warehouse.inventory.edit'), checkWarehouseAccess('body', 'warehouse_id'), createInventoryAdjustment);

// Stock Transfers
router.get('/transfers', checkPermission('warehouse.transfer.view'), getTransfers);
router.post('/transfers', checkPermission('warehouse.transfer.create'), checkWarehouseAccess('body', 'from_warehouse'), createStockTransfer);
router.put('/transfers/:id/status', checkPermission('warehouse.transfer.approve'), updateTransferStatus);

// Reports
router.get('/reports/transactions', checkPermission('warehouse.reports.view'), getTransactionLogs);
router.get('/reports/audit-logs', checkPermission('warehouse.reports.view'), getWarehouseAuditLogs);

module.exports = router;
