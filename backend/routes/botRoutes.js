const express = require('express');
const router = express.Router();
const { createBot, getBots, startBotAction, stopBotAction, getBotLogs, deleteBot } = require('../controllers/botController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getBots).post(protect, createBot);
router.route('/:id').delete(protect, deleteBot);
router.post('/:id/start', protect, startBotAction);
router.post('/:id/stop', protect, stopBotAction);
router.get('/:id/logs', protect, getBotLogs);

module.exports = router;
