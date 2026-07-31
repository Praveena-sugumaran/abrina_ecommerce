const express = require('express');
const router = express.Router();
const {
    getSections,
    updateSectionsOrder,
    toggleSection,
    updateSectionContent
} = require('../../controllers/admin/homepageSectionController');
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');

router.get('/', getSections);

// Admin only below
router.use(protect);
router.use(authorizeRoles('admin'));
router.put('/order', updateSectionsOrder);
router.put('/:id/toggle', toggleSection);
router.put('/:id', updateSectionContent);

module.exports = router;
