const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all risk assessments (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT ra.*, u.first_name || ' ' || u.last_name as assigned_to_name
      FROM risk_assessments ra
      LEFT JOIN users u ON ra.assigned_to = u.id`,
      table: 'risk_assessments',
      searchColumns: ['ra.title', 'ra.description', 'ra.risk_category', 'ra.status'],
      allowedSortColumns: ['title', 'risk_category', 'likelihood', 'impact', 'risk_score', 'status', 'created_at'],
      defaultSort: 'ra.risk_score DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get risks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete
router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('risk_assessments', ids, req.user.id, 'risk_assessment');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Bulk update
router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('risk_assessments', ids, updates, req.user.id, 'risk_assessment');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single risk assessment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ra.*, u.first_name || ' ' || u.last_name as assigned_to_name
      FROM risk_assessments ra
      LEFT JOIN users u ON ra.assigned_to = u.id
      WHERE ra.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get risk error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create risk assessment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status, assigned_to } = req.body;

    const result = await pool.query(
      `INSERT INTO risk_assessments (title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status || 'identified', assigned_to]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'risk_assessment', result.rows[0].id, req.user.id, JSON.stringify({ title, risk_score }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create risk error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update risk assessment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status, assigned_to, ai_analysis } = req.body;

    const result = await pool.query(
      `UPDATE risk_assessments SET title = $1, description = $2, risk_category = $3, likelihood = $4,
       impact = $5, risk_score = $6, mitigation_strategy = $7, status = $8, assigned_to = $9,
       ai_analysis = COALESCE($10, ai_analysis), updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status, assigned_to, ai_analysis, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'risk_assessment', req.params.id, req.user.id, JSON.stringify({ title, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update risk error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete risk assessment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM risk_assessments WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'risk_assessment', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (error) {
    console.error('Delete risk error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Generate risk assessment
router.post('/ai-generate', authMiddleware, async (req, res) => {
  try {
    const { context } = req.body;
    const analysis = await aiService.generateRiskAssessment(context);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['risk_generation', context, analysis, 'openai/gpt-4o-mini', 1300, req.user.id]
    );

    res.json({ analysis });
  } catch (error) {
    console.error('AI generate risk error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// AI: Analyze existing risk
router.post('/:id/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const riskResult = await pool.query('SELECT * FROM risk_assessments WHERE id = $1', [req.params.id]);

    if (riskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    const risk = riskResult.rows[0];
    const analysis = await aiService.generateRiskAssessment(
      `Title: ${risk.title}. Description: ${risk.description}. Category: ${risk.risk_category}. Current mitigation: ${risk.mitigation_strategy}`
    );

    // Update the risk with AI analysis
    await pool.query(
      'UPDATE risk_assessments SET ai_analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, req.params.id]
    );

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['risk_analysis', JSON.stringify(risk), analysis, 'openai/gpt-4o-mini', 1200, req.user.id]
    );

    res.json({ risk, analysis });
  } catch (error) {
    console.error('AI analyze risk error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get risk stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE risk_score >= 80) as critical,
        COUNT(*) FILTER (WHERE risk_score >= 60 AND risk_score < 80) as high,
        COUNT(*) FILTER (WHERE risk_score >= 40 AND risk_score < 60) as medium,
        COUNT(*) FILTER (WHERE risk_score < 40) as low,
        AVG(risk_score) as average_score
      FROM risk_assessments
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get risk stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
