const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const adminOnly = authorizeRoles('admin');
const {
    getCountries,
    getWorldwideContent,
    getAllHubs, createHub, updateHub, deleteHub,
    getAllRankings, createRanking, updateRanking, deleteRanking
} = require('../controllers/worldwideController');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'worldwide');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `worldwide-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const hubUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'sideImage1', maxCount: 1 },
    { name: 'sideImage2', maxCount: 1 }
]);

// Public
router.get('/countries', getCountries);
router.get('/', getWorldwideContent);

// Admin — Hubs
router.get('/admin/hubs', protect, adminOnly, getAllHubs);
router.post('/admin/hubs', protect, adminOnly, hubUpload, createHub);
router.put('/admin/hubs/:id', protect, adminOnly, hubUpload, updateHub);
router.delete('/admin/hubs/:id', protect, adminOnly, deleteHub);

// Admin — Rankings
router.get('/admin/rankings', protect, adminOnly, getAllRankings);
router.post('/admin/rankings', protect, adminOnly, createRanking);
router.put('/admin/rankings/:id', protect, adminOnly, updateRanking);
router.delete('/admin/rankings/:id', protect, adminOnly, deleteRanking);

module.exports = router;
