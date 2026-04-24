const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all privacy policies (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT pp.*, u.first_name, u.last_name
      FROM privacy_policies pp
      LEFT JOIN users u ON pp.created_by = u.id`,
      table: 'privacy_policies',
      searchColumns: ['pp.policy_name', 'pp.policy_type', 'pp.jurisdiction', 'pp.status'],
      allowedSortColumns: ['policy_name', 'policy_type', 'jurisdiction', 'status', 'effective_date', 'created_at'],
      defaultSort: 'pp.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching privacy policies:', error);
    res.status(500).json({ error: 'Failed to fetch privacy policies' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('privacy_policies', ids, req.user?.id || 1, 'privacy_policy');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('privacy_policies', ids, updates, req.user?.id || 1, 'privacy_policy');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single privacy policy
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT pp.*, u.first_name, u.last_name
      FROM privacy_policies pp
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Privacy policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    res.status(500).json({ error: 'Failed to fetch privacy policy' });
  }
});

// Create new privacy policy
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { policy_name, policy_type, jurisdiction, target_audience, data_collected, legal_bases, version } = req.body;
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      INSERT INTO privacy_policies (policy_name, policy_type, jurisdiction, target_audience, data_collected, legal_bases, version, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
      RETURNING *
    `, [policy_name, policy_type, jurisdiction, target_audience, data_collected, legal_bases, version || '1.0', userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating privacy policy:', error);
    res.status(500).json({ error: 'Failed to create privacy policy' });
  }
});

// Update privacy policy
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { policy_name, policy_type, jurisdiction, target_audience, content, data_collected, legal_bases, retention_periods, third_party_sharing, user_rights, status, version, effective_date, review_date } = req.body;

    const result = await pool.query(`
      UPDATE privacy_policies
      SET policy_name = COALESCE($1, policy_name),
          policy_type = COALESCE($2, policy_type),
          jurisdiction = COALESCE($3, jurisdiction),
          target_audience = COALESCE($4, target_audience),
          content = COALESCE($5, content),
          data_collected = COALESCE($6, data_collected),
          legal_bases = COALESCE($7, legal_bases),
          retention_periods = COALESCE($8, retention_periods),
          third_party_sharing = COALESCE($9, third_party_sharing),
          user_rights = COALESCE($10, user_rights),
          status = COALESCE($11, status),
          version = COALESCE($12, version),
          effective_date = COALESCE($13, effective_date),
          review_date = COALESCE($14, review_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [policy_name, policy_type, jurisdiction, target_audience, content, data_collected, legal_bases, retention_periods, third_party_sharing, user_rights, status, version, effective_date, review_date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Privacy policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating privacy policy:', error);
    res.status(500).json({ error: 'Failed to update privacy policy' });
  }
});

// Delete privacy policy
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM privacy_policies WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Privacy policy not found' });
    }

    res.json({ message: 'Privacy policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting privacy policy:', error);
    res.status(500).json({ error: 'Failed to delete privacy policy' });
  }
});

// AI Generate Privacy Policy
router.post('/:id/ai-generate', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get policy details
    const policyResult = await pool.query('SELECT * FROM privacy_policies WHERE id = $1', [id]);
    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Privacy policy not found' });
    }

    const policy = policyResult.rows[0];

    // Run AI generation
    const aiContent = await aiService.generatePrivacyPolicy({
      policyName: policy.policy_name,
      policyType: policy.policy_type,
      jurisdiction: policy.jurisdiction,
      targetAudience: policy.target_audience,
      dataCollected: policy.data_collected,
      legalBases: policy.legal_bases
    });

    // Parse the AI content to ensure it's valid JSON, then store as JSON string
    let parsedContent;
    let contentToStore = aiContent;
    try {
      parsedContent = JSON.parse(aiContent);
      contentToStore = JSON.stringify(parsedContent); // Compact JSON without extra whitespace
    } catch {
      // If not valid JSON, store as-is
      parsedContent = aiContent;
    }

    // Update policy with AI-generated content
    const updateResult = await pool.query(`
      UPDATE privacy_policies
      SET content = $1,
          ai_generated = true,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [contentToStore, id]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('privacy_policy_generation', $1, $2, $3, $4)
    `, [JSON.stringify(policy), contentToStore, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      policy: updateResult.rows[0],
      generatedContent: parsedContent // Return parsed object directly
    });
  } catch (error) {
    console.error('Error generating privacy policy:', error);
    res.status(500).json({ error: 'Failed to generate privacy policy' });
  }
});

// AI Generate New Policy from Scratch
router.post('/ai-generate-new', optionalAuth, async (req, res) => {
  try {
    const { policy_name, policy_type, jurisdiction, target_audience, data_collected, legal_bases } = req.body;
    const userId = req.user?.id || 1;

    // Run AI generation
    const aiContent = await aiService.generatePrivacyPolicy({
      policyName: policy_name,
      policyType: policy_type,
      jurisdiction: jurisdiction,
      targetAudience: target_audience,
      dataCollected: data_collected,
      legalBases: legal_bases
    });

    // Parse the AI content to ensure it's valid JSON, then store as JSON string
    let parsedContent;
    let contentToStore = aiContent;
    try {
      parsedContent = JSON.parse(aiContent);
      contentToStore = JSON.stringify(parsedContent); // Compact JSON without extra whitespace
    } catch {
      // If not valid JSON, store as-is
      parsedContent = aiContent;
    }

    // Create new policy with AI-generated content
    const result = await pool.query(`
      INSERT INTO privacy_policies (policy_name, policy_type, jurisdiction, target_audience, content, data_collected, legal_bases, status, ai_generated, version, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', true, '1.0', $8)
      RETURNING *
    `, [policy_name, policy_type, jurisdiction, target_audience, contentToStore, data_collected, legal_bases, userId]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('privacy_policy_generation', $1, $2, $3, $4)
    `, [JSON.stringify(req.body), contentToStore, process.env.OPENROUTER_MODEL, userId]);

    res.status(201).json({
      policy: result.rows[0],
      generatedContent: parsedContent // Return parsed object directly
    });
  } catch (error) {
    console.error('Error generating privacy policy:', error);
    res.status(500).json({ error: 'Failed to generate privacy policy' });
  }
});

// Get statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
        COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_generated
      FROM privacy_policies
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
