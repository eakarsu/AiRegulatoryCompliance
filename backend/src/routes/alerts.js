const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all alerts (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT a.*, u.first_name || ' ' || u.last_name as user_name
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id`,
      table: 'alerts',
      searchColumns: ['a.title', 'a.message', 'a.type', 'a.severity', 'a.status'],
      allowedSortColumns: ['title', 'type', 'severity', 'status', 'created_at'],
      defaultSort: 'a.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('alerts', ids, req.user.id, 'alert');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('alerts', ids, updates, req.user.id, 'alert');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single alert
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.first_name || ' ' || u.last_name as user_name
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create alert
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, message, type, severity, status, related_entity_type, related_entity_id, user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO alerts (title, message, type, severity, status, related_entity_type, related_entity_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, message, type, severity, status || 'active', related_entity_type, related_entity_id, user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update alert
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, message, type, severity, status } = req.body;

    const readAt = status === 'read' ? new Date() : null;

    const result = await pool.query(
      `UPDATE alerts SET title = $1, message = $2, type = $3, severity = $4, status = $5,
       read_at = COALESCE($6, read_at) WHERE id = $7 RETURNING *`,
      [title, message, type, severity, status, readAt, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark alert as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE alerts SET status = 'read', read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete alert
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'alert', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE alerts SET status = 'read', read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get alert stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'read') as read,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high
      FROM alerts
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
