const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all compliance checks legal (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT ccl.*, r.name as regulation_name, r.code as regulation_code,
             u.first_name, u.last_name
      FROM compliance_checks_legal ccl
      LEFT JOIN regulations r ON ccl.regulation_id = r.id
      LEFT JOIN users u ON ccl.checked_by = u.id`,
      table: 'compliance_checks_legal',
      searchColumns: ['ccl.check_name', 'ccl.check_type', 'ccl.jurisdiction', 'ccl.department', 'ccl.compliance_status'],
      allowedSortColumns: ['check_name', 'check_type', 'jurisdiction', 'compliance_status', 'compliance_score', 'created_at'],
      defaultSort: 'ccl.compliance_score ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching compliance checks:', error);
    res.status(500).json({ error: 'Failed to fetch compliance checks' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('compliance_checks_legal', ids, req.user?.id || 1, 'compliance_check_legal');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('compliance_checks_legal', ids, updates, req.user?.id || 1, 'compliance_check_legal');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single compliance check
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ccl.*, r.name as regulation_name, r.code as regulation_code,
             r.requirements, r.penalties,
             u.first_name, u.last_name
      FROM compliance_checks_legal ccl
      LEFT JOIN regulations r ON ccl.regulation_id = r.id
      LEFT JOIN users u ON ccl.checked_by = u.id
      WHERE ccl.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance check:', error);
    res.status(500).json({ error: 'Failed to fetch compliance check' });
  }
});

// Create new compliance check
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { check_name, check_type, regulation_id, jurisdiction, department } = req.body;
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      INSERT INTO compliance_checks_legal (check_name, check_type, regulation_id, jurisdiction, department, compliance_status, checked_by, check_date)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_DATE)
      RETURNING *
    `, [check_name, check_type, regulation_id, jurisdiction, department, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating compliance check:', error);
    res.status(500).json({ error: 'Failed to create compliance check' });
  }
});

// Update compliance check
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { check_name, check_type, regulation_id, jurisdiction, department, compliance_status, compliance_score, gaps_identified, legal_risks, recommendations, evidence_collected, next_review_date } = req.body;

    const result = await pool.query(`
      UPDATE compliance_checks_legal
      SET check_name = COALESCE($1, check_name),
          check_type = COALESCE($2, check_type),
          regulation_id = COALESCE($3, regulation_id),
          jurisdiction = COALESCE($4, jurisdiction),
          department = COALESCE($5, department),
          compliance_status = COALESCE($6, compliance_status),
          compliance_score = COALESCE($7, compliance_score),
          gaps_identified = COALESCE($8, gaps_identified),
          legal_risks = COALESCE($9, legal_risks),
          recommendations = COALESCE($10, recommendations),
          evidence_collected = COALESCE($11, evidence_collected),
          next_review_date = COALESCE($12, next_review_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [check_name, check_type, regulation_id, jurisdiction, department, compliance_status, compliance_score, gaps_identified, legal_risks, recommendations, evidence_collected, next_review_date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating compliance check:', error);
    res.status(500).json({ error: 'Failed to update compliance check' });
  }
});

// Delete compliance check
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM compliance_checks_legal WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    res.json({ message: 'Compliance check deleted successfully' });
  } catch (error) {
    console.error('Error deleting compliance check:', error);
    res.status(500).json({ error: 'Failed to delete compliance check' });
  }
});

// AI Run Compliance Check
router.post('/:id/ai-check', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get compliance check details
    const checkResult = await pool.query(`
      SELECT ccl.*, r.name as regulation_name, r.code, r.requirements, r.penalties, r.jurisdiction as reg_jurisdiction
      FROM compliance_checks_legal ccl
      LEFT JOIN regulations r ON ccl.regulation_id = r.id
      WHERE ccl.id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance check not found' });
    }

    const check = checkResult.rows[0];

    // Run AI analysis
    const aiAnalysis = await aiService.checkLegalCompliance({
      checkName: check.check_name,
      checkType: check.check_type,
      regulation: check.regulation_name,
      regulationCode: check.code,
      requirements: check.requirements,
      jurisdiction: check.jurisdiction,
      department: check.department,
      penalties: check.penalties
    });

    // Parse AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch {
      parsedAnalysis = { analysis: aiAnalysis, complianceScore: 70 };
    }

    // Update check with AI results
    const updateResult = await pool.query(`
      UPDATE compliance_checks_legal
      SET compliance_score = $1,
          compliance_status = $2,
          gaps_identified = $3,
          legal_risks = $4,
          recommendations = $5,
          ai_analysis = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      parsedAnalysis.complianceScore || 70,
      parsedAnalysis.complianceStatus || 'Partially Compliant',
      JSON.stringify(parsedAnalysis.gaps || []),
      JSON.stringify(parsedAnalysis.legalRisks || []),
      JSON.stringify(parsedAnalysis.recommendations || []),
      aiAnalysis,
      id
    ]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('legal_compliance_check', $1, $2, $3, $4)
    `, [JSON.stringify(check), aiAnalysis, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      check: updateResult.rows[0],
      aiAnalysis: parsedAnalysis
    });
  } catch (error) {
    console.error('Error running AI compliance check:', error);
    res.status(500).json({ error: 'Failed to run AI compliance check' });
  }
});

// Get statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END) as compliant,
        COUNT(CASE WHEN compliance_status = 'Partially Compliant' THEN 1 END) as partial,
        COUNT(CASE WHEN compliance_status = 'Non-Compliant' THEN 1 END) as non_compliant,
        COUNT(CASE WHEN compliance_status = 'pending' THEN 1 END) as pending,
        AVG(compliance_score) as average_score
      FROM compliance_checks_legal
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
