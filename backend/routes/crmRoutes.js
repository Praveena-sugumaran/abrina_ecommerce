const express = require('express');
const router = express.Router();
const {
    getLeads,
    updateLead,
    deleteLead,
    getAutoReplySettings,
    updateAutoReplySettings
} = require('../controllers/crmController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // all CRM routes require authentication

router.route('/leads')
    .get(getLeads);

router.route('/leads/:id')
    .put(updateLead)
    .delete(deleteLead);

router.route('/auto-reply')
    .get(getAutoReplySettings)
    .put(updateAutoReplySettings);

module.exports = router;
