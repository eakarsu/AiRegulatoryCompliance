const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all violation predictions (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT vp.*, r.name as regulation_name, r.code as regulation_code,
             u.first_name, u.last_name
      FROM violation_predictions vp
      LEFT JOIN regulations r ON vp.regulation_id = r.id
      LEFT JOIN users u ON vp.predicted_by = u.id`,
      table: 'violation_predictions',
      searchColumns: ['vp.prediction_name', 'vp.risk_area', 'vp.predicted_violation_type', 'vp.status'],
      allowedSortColumns: ['prediction_name', 'risk_area', 'probability_score', 'impact_level', 'status', 'created_at'],
      defaultSort: 'vp.probability_score DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching violation predictions:', error);
    res.status(500).json({ error: 'Failed to fetch violation predictions' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('violation_predictions', ids, req.user?.id || 1, 'violation_prediction');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('violation_predictions', ids, updates, req.user?.id || 1, 'violation_prediction');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single violation prediction
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT vp.*, r.name as regulation_name, r.code as regulation_code,
             u.first_name, u.last_name
      FROM violation_predictions vp
      LEFT JOIN regulations r ON vp.regulation_id = r.id
      LEFT JOIN users u ON vp.predicted_by = u.id
      WHERE vp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation prediction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching violation prediction:', error);
    res.status(500).json({ error: 'Failed to fetch violation prediction' });
  }
});

// Create new violation prediction
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { prediction_name, regulation_id, risk_area, predicted_violation_type, impact_level } = req.body;
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      INSERT INTO violation_predictions (prediction_name, regulation_id, risk_area, predicted_violation_type, impact_level, predicted_by, prediction_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'active')
      RETURNING *
    `, [prediction_name, regulation_id, risk_area, predicted_violation_type, impact_level, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating violation prediction:', error);
    res.status(500).json({ error: 'Failed to create violation prediction' });
  }
});

// Update violation prediction
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { prediction_name, regulation_id, risk_area, predicted_violation_type, probability_score, impact_level, contributing_factors, preventive_measures, status } = req.body;

    const result = await pool.query(`
      UPDATE violation_predictions
      SET prediction_name = COALESCE($1, prediction_name),
          regulation_id = COALESCE($2, regulation_id),
          risk_area = COALESCE($3, risk_area),
          predicted_violation_type = COALESCE($4, predicted_violation_type),
          probability_score = COALESCE($5, probability_score),
          impact_level = COALESCE($6, impact_level),
          contributing_factors = COALESCE($7, contributing_factors),
          preventive_measures = COALESCE($8, preventive_measures),
          status = COALESCE($9, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [prediction_name, regulation_id, risk_area, predicted_violation_type, probability_score, impact_level, contributing_factors, preventive_measures, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation prediction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating violation prediction:', error);
    res.status(500).json({ error: 'Failed to update violation prediction' });
  }
});

// Delete violation prediction
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM violation_predictions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation prediction not found' });
    }

    res.json({ message: 'Violation prediction deleted successfully' });
  } catch (error) {
    console.error('Error deleting violation prediction:', error);
    res.status(500).json({ error: 'Failed to delete violation prediction' });
  }
});

// AI Predict Violations
router.post('/:id/ai-predict', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyContext } = req.body;

    // Get prediction details
    const predictionResult = await pool.query(`
      SELECT vp.*, r.name as regulation_name, r.code, r.requirements, r.penalties
      FROM violation_predictions vp
      LEFT JOIN regulations r ON vp.regulation_id = r.id
      WHERE vp.id = $1
    `, [id]);

    if (predictionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Violation prediction not found' });
    }

    const prediction = predictionResult.rows[0];

    // Run AI analysis
    const aiAnalysis = await aiService.predictViolations(
      {
        name: prediction.regulation_name,
        code: prediction.code,
        requirements: prediction.requirements,
        riskArea: prediction.risk_area
      },
      companyContext || prediction.prediction_name
    );

    // Parse AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch {
      parsedAnalysis = { analysis: aiAnalysis, riskScore: 65 };
    }

    // Update prediction with AI results
    const updateResult = await pool.query(`
      UPDATE violation_predictions
      SET probability_score = $1,
          contributing_factors = $2,
          preventive_measures = $3,
          ai_analysis = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      parsedAnalysis.riskScore || parsedAnalysis.probabilityScore || 65,
      JSON.stringify(parsedAnalysis.contributingFactors || parsedAnalysis),
      parsedAnalysis.preventiveMeasures?.join('\n') || '',
      aiAnalysis,
      id
    ]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('violation_prediction', $1, $2, $3, $4)
    `, [JSON.stringify(prediction), aiAnalysis, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      prediction: updateResult.rows[0],
      aiAnalysis: parsedAnalysis
    });
  } catch (error) {
    console.error('Error running AI prediction:', error);
    res.status(500).json({ error: 'Failed to run AI prediction' });
  }
});

// Get statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN impact_level = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN impact_level = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN impact_level = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN impact_level = 'low' THEN 1 END) as low,
        AVG(probability_score) as average_probability
      FROM violation_predictions
      WHERE status = 'active'
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
