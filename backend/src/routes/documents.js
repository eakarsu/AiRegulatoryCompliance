const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all documents (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id`,
      table: 'documents',
      searchColumns: ['d.title', 'd.description', 'd.category', 'd.file_type', 'd.status'],
      allowedSortColumns: ['title', 'file_type', 'category', 'status', 'ai_compliance_score', 'created_at'],
      defaultSort: 'd.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('documents', ids, req.user.id, 'document');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('documents', ids, updates, req.user.id, 'document');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single document
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log the view
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['VIEW', 'document', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create document
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, file_path, file_type, category, status } = req.body;

    const result = await pool.query(
      `INSERT INTO documents (title, description, file_path, file_type, category, status, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, file_path, file_type, category, status || 'pending_review', req.user.id]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'document', result.rows[0].id, req.user.id, JSON.stringify({ title }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update document
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, file_path, file_type, category, status, ai_summary, ai_compliance_score } = req.body;

    const result = await pool.query(
      `UPDATE documents SET title = $1, description = $2, file_path = $3, file_type = $4, category = $5,
       status = $6, ai_summary = COALESCE($7, ai_summary), ai_compliance_score = COALESCE($8, ai_compliance_score),
       updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
      [title, description, file_path, file_type, category, status, ai_summary, ai_compliance_score, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'document', req.params.id, req.user.id, JSON.stringify({ title, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete document
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'document', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Analyze document
router.post('/:id/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const { regulationContext } = req.body;
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    const analysis = await aiService.analyzeDocument(
      `Document: ${doc.title}. Description: ${doc.description}. Category: ${doc.category}`,
      regulationContext || doc.category
    );

    // Extract compliance score from analysis (simplified)
    const scoreMatch = analysis.match(/(\d+)/);
    const complianceScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    // Update document with AI analysis
    await pool.query(
      'UPDATE documents SET ai_summary = $1, ai_compliance_score = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [analysis, Math.min(complianceScore, 100), req.params.id]
    );

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['document_analysis', doc.title, analysis, 'openai/gpt-4o-mini', 1100, req.user.id]
    );

    res.json({ document: doc, analysis, complianceScore: Math.min(complianceScore, 100) });
  } catch (error) {
    console.error('AI analyze document error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Approve document
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE documents SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log the approval
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['APPROVE', 'document', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
