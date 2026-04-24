const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all compliance checks (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT cc.*, r.name as regulation_name, r.code as regulation_code,
             u.first_name || ' ' || u.last_name as checked_by_name
      FROM compliance_checks cc
      LEFT JOIN regulations r ON cc.regulation_id = r.id
      LEFT JOIN users u ON cc.checked_by = u.id`,
      table: 'compliance_checks',
      searchColumns: ['cc.title', 'cc.description', 'cc.status', 'cc.risk_level', 'cc.findings'],
      allowedSortColumns: ['title', 'status', 'risk_level', 'due_date', 'created_at'],
      defaultSort: 'cc.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get compliance checks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete
router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('compliance_checks', ids, req.user.id, 'compliance_check');
    res.json({ message: `${count} deleted`, count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update
router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('compliance_checks', ids, updates, req.user.id, 'compliance_check');
    res.json({ message: `${count} updated`, count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single compliance check
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cc.*, r.name as regulation_name, r.code as regulation_code, r.requirements,
             u.first_name || ' ' || u.last_name as checked_by_name
      FROM compliance_checks cc
      LEFT JOIN regulations r ON cc.regulation_id = r.id
      LEFT JOIN users u ON cc.checked_by = u.id
      WHERE cc.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get compliance check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create compliance check
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { regulation_id, title, description, status, risk_level, findings, recommendations, due_date } = req.body;

    const result = await pool.query(
      `INSERT INTO compliance_checks (regulation_id, title, description, status, risk_level, findings, recommendations, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [regulation_id, title, description, status || 'pending', risk_level, findings, recommendations, due_date]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'compliance_check', result.rows[0].id, req.user.id, JSON.stringify({ title }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create compliance check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update compliance check
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { regulation_id, title, description, status, risk_level, findings, recommendations, due_date } = req.body;

    const checkedAt = status === 'completed' ? new Date() : null;
    const checkedBy = status === 'completed' ? req.user.id : null;

    const result = await pool.query(
      `UPDATE compliance_checks SET regulation_id = $1, title = $2, description = $3, status = $4,
       risk_level = $5, findings = $6, recommendations = $7, due_date = $8, checked_at = COALESCE($9, checked_at),
       checked_by = COALESCE($10, checked_by), updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [regulation_id, title, description, status, risk_level, findings, recommendations, due_date, checkedAt, checkedBy, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'compliance_check', req.params.id, req.user.id, JSON.stringify({ title, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update compliance check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete compliance check
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_checks WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'compliance_check', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Compliance check deleted successfully' });
  } catch (error) {
    console.error('Delete compliance check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Analyze compliance check
router.post('/:id/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const checkResult = await pool.query(`
      SELECT cc.*, r.name as regulation_name, r.requirements
      FROM compliance_checks cc
      LEFT JOIN regulations r ON cc.regulation_id = r.id
      WHERE cc.id = $1
    `, [req.params.id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    const check = checkResult.rows[0];
    const analysis = await aiService.analyzeComplianceRisk(
      { name: check.regulation_name, requirements: check.requirements },
      `Compliance check: ${check.title}. Description: ${check.description}. Current findings: ${check.findings}`
    );

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['compliance_analysis', JSON.stringify(check), analysis, 'openai/gpt-4o-mini', 1100, req.user.id]
    );

    res.json({ check, analysis });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get compliance summary stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
      FROM compliance_checks
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
