const express = require('express');
const router = express.Router();
const { subscribeToStock } = require('../controllers/stockNotificationController');
const { softProtect } = require('../middlewares/authMiddleware');

router.post('/subscribe', softProtect, subscribeToStock);

module.exports = router;
