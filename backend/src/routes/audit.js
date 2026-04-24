const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all audit trail entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, entity_type, user_id, start_date, end_date } = req.query;

    let query = `
      SELECT at.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      query += ` AND at.action = $${paramCount}`;
      params.push(action);
    }

    if (entity_type) {
      paramCount++;
      query += ` AND at.entity_type = $${paramCount}`;
      params.push(entity_type);
    }

    if (user_id) {
      paramCount++;
      query += ` AND at.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND at.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND at.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY at.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single audit entry
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT at.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE at.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get audit entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get audit stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE action = 'LOGIN') as logins,
        COUNT(*) FILTER (WHERE action = 'CREATE') as creates,
        COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
        COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
        COUNT(*) FILTER (WHERE action = 'VIEW') as views,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_trail
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get audit by entity
router.get('/entity/:type/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT at.*, u.first_name || ' ' || u.last_name as user_name
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE at.entity_type = $1 AND at.entity_id = $2
      ORDER BY at.created_at DESC
    `, [req.params.type, req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get entity audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export audit trail
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT at.id, at.action, at.entity_type, at.entity_id,
             u.email as user_email, at.ip_address, at.created_at, at.details
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND at.created_at >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND at.created_at <= $${params.length}`;
    }

    query += ' ORDER BY at.created_at DESC';

    const result = await pool.query(query, params);

    // Log the export
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['EXPORT', 'audit_trail', null, req.user.id, JSON.stringify({ format: 'csv', records: result.rows.length }), req.ip]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Export audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
