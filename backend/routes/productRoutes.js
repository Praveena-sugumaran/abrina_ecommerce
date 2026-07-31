const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getMyProducts,
    getAllProductsAdmin,
    approveProduct,
    rejectProduct,
    bulkUploadProducts,
    exportProducts,
    exportAllProductsAdmin,
    requestSample,
    uploadSingleImage,
    searchByImage,
    aiSourcingSearch,
    toggleShowcase,
    searchWorldwide,
    getTopRankingByCategory,
    getProductBundle,
    getProductPriceHistory,
    generateDownloadToken,
    downloadDigitalFile,
    getFrequentlyBoughtTogether,
    searchProductByBarcode
} = require('../controllers/productController');
const { protect, softProtect, authorizeRoles } = require('../middlewares/authMiddleware');
const { uploadProductImages, uploadCsv } = require('../middlewares/uploadMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/search/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ─── PUBLIC ───────────────────────────────────
router.get('/', getProducts);
router.post('/search-image', upload.single('image'), searchByImage);
router.get('/worldwide-search', searchWorldwide);
router.get('/top-ranking', getTopRankingByCategory);
router.get('/search-barcode/:barcode', searchProductByBarcode);
router.get('/download/:token', downloadDigitalFile);
router.get('/:id/bundle', getProductBundle);
router.get('/:id/price-history', getProductPriceHistory);
router.get('/:id/frequently-bought-together', getFrequentlyBoughtTogether);
router.get('/:id', getProductById);

// ─── SUPPLIER ─────────────────────────────────
router.get('/my/products', protect, authorizeRoles('supplier'), getMyProducts);
router.get('/my/export', protect, authorizeRoles('supplier'), exportProducts);
router.post('/bulk-upload', protect, authorizeRoles('supplier'), uploadCsv, bulkUploadProducts);
router.post('/upload-single', protect, authorizeRoles('supplier', 'admin'), uploadProductImages, uploadSingleImage);
router.post('/upload-media', protect, authorizeRoles('supplier', 'admin'), require('../middlewares/uploadMiddleware').uploadSingleMedia, uploadSingleImage); // Reusing uploadSingleImage for now as it generic enough
router.post('/', protect, authorizeRoles('supplier'), uploadProductImages, createProduct);
router.put('/:id', protect, authorizeRoles('supplier', 'admin'), uploadProductImages, updateProduct);
router.delete('/:id', protect, authorizeRoles('supplier', 'admin'), deleteProduct);
router.put('/:id/toggle-showcase', protect, authorizeRoles('supplier'), toggleShowcase);

// ─── BUYER ────────────────────────────────────
router.get('/ai-sourcing', protect, aiSourcingSearch);
router.post('/download-token', softProtect, generateDownloadToken);
router.post('/:id/request-sample', protect, authorizeRoles('buyer'), requestSample);

// ─── ADMIN ────────────────────────────────────
router.get('/admin/all', protect, authorizeRoles('admin'), getAllProductsAdmin);
router.get('/admin/export', protect, authorizeRoles('admin'), exportAllProductsAdmin);
router.put('/:id/approve', protect, authorizeRoles('admin'), approveProduct);
router.put('/:id/reject', protect, authorizeRoles('admin'), rejectProduct);

module.exports = router;

