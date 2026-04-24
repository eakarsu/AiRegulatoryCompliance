const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all GDPR scans (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT gs.*, u.first_name, u.last_name, u.email as scanned_by_email
      FROM gdpr_scans gs
      LEFT JOIN users u ON gs.scanned_by = u.id`,
      table: 'gdpr_scans',
      searchColumns: ['gs.scan_name', 'gs.scan_type', 'gs.target_system', 'gs.status'],
      allowedSortColumns: ['scan_name', 'scan_type', 'target_system', 'status', 'compliance_score', 'created_at'],
      defaultSort: 'gs.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching GDPR scans:', error);
    res.status(500).json({ error: 'Failed to fetch GDPR scans' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('gdpr_scans', ids, req.user?.id || 1, 'gdpr_scan');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('gdpr_scans', ids, updates, req.user?.id || 1, 'gdpr_scan');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single GDPR scan
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT gs.*, u.first_name, u.last_name, u.email as scanned_by_email
      FROM gdpr_scans gs
      LEFT JOIN users u ON gs.scanned_by = u.id
      WHERE gs.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GDPR scan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching GDPR scan:', error);
    res.status(500).json({ error: 'Failed to fetch GDPR scan' });
  }
});

// Create new GDPR scan
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { scan_name, scan_type, target_system, data_categories } = req.body;
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      INSERT INTO gdpr_scans (scan_name, scan_type, target_system, data_categories, scanned_by, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [scan_name, scan_type, target_system, data_categories, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating GDPR scan:', error);
    res.status(500).json({ error: 'Failed to create GDPR scan' });
  }
});

// Update GDPR scan
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { scan_name, scan_type, target_system, data_categories, status, findings, recommendations } = req.body;

    const result = await pool.query(`
      UPDATE gdpr_scans
      SET scan_name = COALESCE($1, scan_name),
          scan_type = COALESCE($2, scan_type),
          target_system = COALESCE($3, target_system),
          data_categories = COALESCE($4, data_categories),
          status = COALESCE($5, status),
          findings = COALESCE($6, findings),
          recommendations = COALESCE($7, recommendations),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [scan_name, scan_type, target_system, data_categories, status, findings, recommendations, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GDPR scan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating GDPR scan:', error);
    res.status(500).json({ error: 'Failed to update GDPR scan' });
  }
});

// Delete GDPR scan
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM gdpr_scans WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GDPR scan not found' });
    }

    res.json({ message: 'GDPR scan deleted successfully' });
  } catch (error) {
    console.error('Error deleting GDPR scan:', error);
    res.status(500).json({ error: 'Failed to delete GDPR scan' });
  }
});

// Run AI GDPR scan
router.post('/:id/ai-scan', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get scan details
    const scanResult = await pool.query('SELECT * FROM gdpr_scans WHERE id = $1', [id]);
    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: 'GDPR scan not found' });
    }

    const scan = scanResult.rows[0];

    // Run AI analysis
    const aiAnalysis = await aiService.scanGDPRCompliance(
      { name: scan.scan_name, system: scan.target_system, type: scan.scan_type },
      scan.data_categories
    );

    // Parse AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch {
      parsedAnalysis = { analysis: aiAnalysis, complianceScore: 75 };
    }

    // Update scan with AI results
    const updateResult = await pool.query(`
      UPDATE gdpr_scans
      SET status = 'completed',
          compliance_score = $1,
          findings = $2,
          ai_analysis = $3,
          recommendations = $4,
          scanned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      parsedAnalysis.complianceScore || 75,
      JSON.stringify(parsedAnalysis.findings || parsedAnalysis),
      aiAnalysis,
      JSON.stringify(parsedAnalysis.recommendations || []),
      id
    ]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('gdpr_scan', $1, $2, $3, $4)
    `, [JSON.stringify(scan), aiAnalysis, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      scan: updateResult.rows[0],
      aiAnalysis: parsedAnalysis
    });
  } catch (error) {
    console.error('Error running AI GDPR scan:', error);
    res.status(500).json({ error: 'Failed to run AI GDPR scan' });
  }
});

// Get scan statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        AVG(compliance_score) as average_score
      FROM gdpr_scans
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching scan statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
