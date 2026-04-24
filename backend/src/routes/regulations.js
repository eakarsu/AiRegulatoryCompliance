const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all regulations (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: 'SELECT * FROM regulations',
      table: 'regulations',
      searchColumns: ['name', 'code', 'description', 'category', 'jurisdiction'],
      allowedSortColumns: ['name', 'code', 'category', 'jurisdiction', 'status', 'effective_date', 'created_at'],
      defaultSort: 'name ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get regulations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete
router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('regulations', ids, req.user.id, 'regulation');
    res.json({ message: `${count} deleted`, count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update
router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('regulations', ids, updates, req.user.id, 'regulation');
    res.json({ message: `${count} updated`, count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single regulation
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM regulations WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    // Log the view
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['VIEW', 'regulation', req.params.id, req.user.id, JSON.stringify({ name: result.rows[0].name }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get regulation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create regulation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, code, description, category, jurisdiction, effective_date, status, requirements, penalties } = req.body;

    const result = await pool.query(
      `INSERT INTO regulations (name, code, description, category, jurisdiction, effective_date, status, requirements, penalties)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, code, description, category, jurisdiction, effective_date, status || 'active', requirements, penalties]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'regulation', result.rows[0].id, req.user.id, JSON.stringify({ name, code }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create regulation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update regulation
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, code, description, category, jurisdiction, effective_date, status, requirements, penalties } = req.body;

    const result = await pool.query(
      `UPDATE regulations SET name = $1, code = $2, description = $3, category = $4, jurisdiction = $5,
       effective_date = $6, status = $7, requirements = $8, penalties = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [name, code, description, category, jurisdiction, effective_date, status, requirements, penalties, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'regulation', req.params.id, req.user.id, JSON.stringify({ name, code }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update regulation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete regulation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM regulations WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'regulation', req.params.id, req.user.id, JSON.stringify({ name: result.rows[0].name }), req.ip]
    );

    res.json({ message: 'Regulation deleted successfully' });
  } catch (error) {
    console.error('Delete regulation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Explain regulation
router.post('/:id/explain', authMiddleware, async (req, res) => {
  try {
    const regResult = await pool.query('SELECT * FROM regulations WHERE id = $1', [req.params.id]);

    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    const regulation = regResult.rows[0];
    const explanation = await aiService.explainRegulation(regulation.name);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['regulation_explanation', regulation.name, explanation, 'openai/gpt-4o-mini', 1000, req.user.id]
    );

    res.json({ regulation, explanation });
  } catch (error) {
    console.error('Explain regulation error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// AI: Analyze compliance risk
router.post('/:id/analyze-risk', authMiddleware, async (req, res) => {
  try {
    const { companyContext } = req.body;
    const regResult = await pool.query('SELECT * FROM regulations WHERE id = $1', [req.params.id]);

    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    const regulation = regResult.rows[0];
    const analysis = await aiService.analyzeComplianceRisk(regulation, companyContext);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['compliance_risk', JSON.stringify({ regulation: regulation.name, context: companyContext }), analysis, 'openai/gpt-4o-mini', 1200, req.user.id]
    );

    res.json({ regulation, analysis });
  } catch (error) {
    console.error('Analyze risk error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

module.exports = router;
