const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { buildPaginatedQuery, bulkDelete } = require('../utils/queryHelper');

const router = express.Router();

// Get all settings (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT s.*, u.first_name || ' ' || u.last_name as updated_by_name
      FROM settings s
      LEFT JOIN users u ON s.updated_by = u.id`,
      table: 'settings',
      searchColumns: ['s.key', 's.value', 's.category', 's.description'],
      allowedSortColumns: ['key', 'category', 'created_at'],
      defaultSort: 's.category ASC, s.key ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('settings', ids, req.user.id, 'setting');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get settings by category
router.get('/category/:category', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE category = $1 ORDER BY key', [req.params.category]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single setting by key
router.get('/key/:key', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE key = $1', [req.params.key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update setting
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { key, value, category, description } = req.body;

    const result = await pool.query(
      `INSERT INTO settings (key, value, category, description, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET value = $2, category = $3, description = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, category, description, req.user.id]
    );

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'setting', result.rows[0].id, req.user.id, JSON.stringify({ key, value }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update setting
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { key, value, category, description } = req.body;

    const result = await pool.query(
      `UPDATE settings SET key = $1, value = $2, category = $3, description = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [key, value, category, description, req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'setting', req.params.id, req.user.id, JSON.stringify({ key, value }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete setting
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM settings WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'setting', req.params.id, req.user.id, JSON.stringify({ key: result.rows[0].key }), req.ip]
    );

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
