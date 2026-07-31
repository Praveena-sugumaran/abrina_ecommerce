const express = require('express');
const router = express.Router();
const { getProductQas, createQuestion, createAnswer } = require('../controllers/productQaController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/:productId', getProductQas);
router.post('/question', protect, createQuestion);
router.post('/answer', protect, createAnswer);

module.exports = router;
