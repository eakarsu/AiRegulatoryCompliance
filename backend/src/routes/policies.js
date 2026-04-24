const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all policies (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT p.*, u.first_name || ' ' || u.last_name as owner_name
      FROM policies p
      LEFT JOIN users u ON p.owner_id = u.id`,
      table: 'policies',
      searchColumns: ['p.title', 'p.description', 'p.category', 'p.status'],
      allowedSortColumns: ['title', 'category', 'version', 'status', 'effective_date', 'created_at'],
      defaultSort: 'p.title ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('policies', ids, req.user.id, 'policy');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('policies', ids, updates, req.user.id, 'policy');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single policy
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name as owner_name
      FROM policies p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create policy
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, content, category, version, status, effective_date, review_date, owner_id } = req.body;

    const result = await pool.query(
      `INSERT INTO policies (title, description, content, category, version, status, effective_date, review_date, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, content, category, version || '1.0', status || 'draft', effective_date, review_date, owner_id || req.user.id]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'policy', result.rows[0].id, req.user.id, JSON.stringify({ title }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update policy
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, content, category, version, status, effective_date, review_date, owner_id } = req.body;

    const result = await pool.query(
      `UPDATE policies SET title = $1, description = $2, content = $3, category = $4, version = $5,
       status = $6, effective_date = $7, review_date = $8, owner_id = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [title, description, content, category, version, status, effective_date, review_date, owner_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'policy', req.params.id, req.user.id, JSON.stringify({ title, version }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete policy
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM policies WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'policy', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Generate policy
router.post('/ai-generate', authMiddleware, async (req, res) => {
  try {
    const { policyType, requirements } = req.body;
    const generatedPolicy = await aiService.generatePolicy(policyType, requirements);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['policy_generation', JSON.stringify({ policyType, requirements }), generatedPolicy, 'openai/gpt-4o-mini', 2000, req.user.id]
    );

    res.json({ generatedPolicy });
  } catch (error) {
    console.error('AI generate policy error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// AI: Review policy
router.post('/:id/ai-review', authMiddleware, async (req, res) => {
  try {
    const policyResult = await pool.query('SELECT * FROM policies WHERE id = $1', [req.params.id]);

    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const policy = policyResult.rows[0];
    const review = await aiService.analyzeDocument(policy.content, `Policy review for ${policy.category}`);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['policy_review', policy.title, review, 'openai/gpt-4o-mini', 1500, req.user.id]
    );

    res.json({ policy, review });
  } catch (error) {
    console.error('AI review policy error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

module.exports = router;
