const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all training records (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT tr.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM training_records tr
      LEFT JOIN users u ON tr.user_id = u.id`,
      table: 'training_records',
      searchColumns: ['tr.course_name', 'tr.description', 'tr.category', 'tr.completion_status'],
      allowedSortColumns: ['course_name', 'category', 'completion_status', 'score', 'expiry_date', 'created_at'],
      defaultSort: 'tr.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get training records error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('training_records', ids, req.user.id, 'training');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('training_records', ids, updates, req.user.id, 'training');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single training record
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tr.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM training_records tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get training record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create training record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, course_name, description, category, completion_status, score, expiry_date } = req.body;

    const completedAt = completion_status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO training_records (user_id, course_name, description, category, completion_status, score, completed_at, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_id || req.user.id, course_name, description, category, completion_status || 'not_started', score, completedAt, expiry_date]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'training_record', result.rows[0].id, req.user.id, JSON.stringify({ course_name }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create training record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update training record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { user_id, course_name, description, category, completion_status, score, certificate_url, expiry_date } = req.body;

    const completedAt = completion_status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `UPDATE training_records SET user_id = $1, course_name = $2, description = $3, category = $4,
       completion_status = $5, score = $6, completed_at = COALESCE($7, completed_at), certificate_url = $8,
       expiry_date = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *`,
      [user_id, course_name, description, category, completion_status, score, completedAt, certificate_url, expiry_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'training_record', req.params.id, req.user.id, JSON.stringify({ course_name, completion_status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update training record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete training record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM training_records WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'training_record', req.params.id, req.user.id, JSON.stringify({ course_name: result.rows[0].course_name }), req.ip]
    );

    res.json({ message: 'Training record deleted successfully' });
  } catch (error) {
    console.error('Delete training record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Generate training content
router.post('/ai-generate-content', authMiddleware, async (req, res) => {
  try {
    const { topic, audience } = req.body;
    const content = await aiService.generateTrainingContent(topic, audience);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['training_content', JSON.stringify({ topic, audience }), content, 'openai/gpt-4o-mini', 1500, req.user.id]
    );

    res.json({ content });
  } catch (error) {
    console.error('AI generate training error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get training stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completion_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE completion_status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE completion_status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired,
        AVG(score) FILTER (WHERE score IS NOT NULL) as average_score
      FROM training_records
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get training stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
