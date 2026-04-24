const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all users (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: 'SELECT id, email, first_name, last_name, role, department, phone, created_at, updated_at FROM users',
      table: 'users',
      searchColumns: ['email', 'first_name', 'last_name', 'role', 'department'],
      allowedSortColumns: ['email', 'first_name', 'last_name', 'role', 'created_at'],
      defaultSort: 'first_name ASC, last_name ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('users', ids, req.user.id, 'user');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('users', ids, updates, req.user.id, 'user');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single user
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, first_name, last_name, role || 'user']
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'user', result.rows[0].id, req.user.id, JSON.stringify({ email }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { email, first_name, last_name, role } = req.body;

    const result = await pool.query(
      `UPDATE users SET email = $1, first_name = $2, last_name = $3, role = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, first_name, last_name, role, created_at, updated_at`,
      [email, first_name, last_name, role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'user', req.params.id, req.user.id, JSON.stringify({ email, role }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/:id/password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [hashedPassword, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the password change
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'user', req.params.id, req.user.id, JSON.stringify({ action: 'password_change' }), req.ip]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'user', req.params.id, req.user.id, JSON.stringify({ email: result.rows[0].email }), req.ip]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
