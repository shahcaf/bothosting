const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: 'Not logged in' });
    }
});

module.exports = router;
