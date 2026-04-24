const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all reports (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT r.*, u.first_name || ' ' || u.last_name as generated_by_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.id`,
      table: 'reports',
      searchColumns: ['r.title', 'r.description', 'r.report_type', 'r.status'],
      allowedSortColumns: ['title', 'report_type', 'status', 'period_start', 'created_at'],
      defaultSort: 'r.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('reports', ids, req.user.id, 'report');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('reports', ids, updates, req.user.id, 'report');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single report
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.first_name || ' ' || u.last_name as generated_by_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.id
      WHERE r.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, report_type, content, status, period_start, period_end } = req.body;

    const result = await pool.query(
      `INSERT INTO reports (title, description, report_type, content, status, generated_by, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, report_type, JSON.stringify(content), status || 'draft', req.user.id, period_start, period_end]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'report', result.rows[0].id, req.user.id, JSON.stringify({ title, report_type }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update report
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, report_type, content, status, period_start, period_end } = req.body;

    const result = await pool.query(
      `UPDATE reports SET title = $1, description = $2, report_type = $3, content = $4,
       status = $5, period_start = $6, period_end = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [title, description, report_type, JSON.stringify(content), status, period_start, period_end, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'report', req.params.id, req.user.id, JSON.stringify({ title, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete report
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'report', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Generate report
router.post('/ai-generate', authMiddleware, async (req, res) => {
  try {
    const { reportType, periodStart, periodEnd } = req.body;

    // Gather data for the report
    const [compliance, risks, incidents, vendors] = await Promise.all([
      pool.query('SELECT * FROM compliance_checks WHERE created_at BETWEEN $1 AND $2', [periodStart, periodEnd]),
      pool.query('SELECT * FROM risk_assessments WHERE created_at BETWEEN $1 AND $2', [periodStart, periodEnd]),
      pool.query('SELECT * FROM incidents WHERE created_at BETWEEN $1 AND $2', [periodStart, periodEnd]),
      pool.query('SELECT * FROM vendors')
    ]);

    const complianceData = {
      checks: compliance.rows,
      risks: risks.rows,
      incidents: incidents.rows,
      vendors: vendors.rows,
      period: { start: periodStart, end: periodEnd }
    };

    const generatedReport = await aiService.generateComplianceReport(complianceData, reportType);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['report_generation', JSON.stringify({ reportType, periodStart, periodEnd }), generatedReport, 'openai/gpt-4o-mini', 1800, req.user.id]
    );

    res.json({ generatedReport });
  } catch (error) {
    console.error('AI generate report error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Publish report
router.post('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE reports SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Log the publish
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['PUBLISH', 'report', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Publish report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
