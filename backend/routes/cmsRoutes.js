const express = require('express');
const router = express.Router();
const { getPages, getPageBySlug, upsertPage, updatePage, deletePage } = require('../controllers/cmsController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const admin = authorizeRoles('admin');

router.get('/', getPages);
router.get('/:slug', getPageBySlug);
router.post('/', protect, admin, upsertPage);
router.put('/:id', protect, admin, updatePage);
router.delete('/:id', protect, admin, deletePage);

module.exports = router;
