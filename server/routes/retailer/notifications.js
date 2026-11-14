import express from 'express';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

router.get('/', (req, res) => {
  try {
    const notifications = queryAll(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = queryOne(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [req.user.id]).count || 0;

    return res.json({ success: true, unreadCount, notifications });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

router.patch('/:id/read', (req, res) => {
  try {
    run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

router.post('/read-all', (req, res) => {
  try {
    run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

