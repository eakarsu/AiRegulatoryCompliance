const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all control frameworks (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: 'SELECT * FROM control_frameworks',
      table: 'control_frameworks',
      searchColumns: ['name', 'description', 'framework_type', 'status'],
      allowedSortColumns: ['name', 'framework_type', 'version', 'status', 'created_at'],
      defaultSort: 'name ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get frameworks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('control_frameworks', ids, req.user.id, 'framework');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('control_frameworks', ids, updates, req.user.id, 'framework');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single framework
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM control_frameworks WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get framework error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create framework
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, framework_type, version, status, controls } = req.body;

    const result = await pool.query(
      `INSERT INTO control_frameworks (name, description, framework_type, version, status, controls)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, framework_type, version, status || 'active', JSON.stringify(controls)]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'control_framework', result.rows[0].id, req.user.id, JSON.stringify({ name }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create framework error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update framework
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, framework_type, version, status, controls } = req.body;

    const result = await pool.query(
      `UPDATE control_frameworks SET name = $1, description = $2, framework_type = $3, version = $4,
       status = $5, controls = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *`,
      [name, description, framework_type, version, status, JSON.stringify(controls), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'control_framework', req.params.id, req.user.id, JSON.stringify({ name, version }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update framework error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete framework
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM control_frameworks WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'control_framework', req.params.id, req.user.id, JSON.stringify({ name: result.rows[0].name }), req.ip]
    );

    res.json({ message: 'Framework deleted successfully' });
  } catch (error) {
    console.error('Delete framework error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
