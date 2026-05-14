const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

// Chat with AI assistant
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    const response = await aiService.chatWithAssistant(message, conversationHistory);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['chat', message, response, 'openai/gpt-4o-mini', 500, req.user.id]
    );

    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Analyze compliance risk
router.post('/analyze-risk', authMiddleware, async (req, res) => {
  try {
    const { regulationData, companyContext } = req.body;

    const analysis = await aiService.analyzeComplianceRisk(regulationData, companyContext);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['risk_analysis', JSON.stringify({ regulationData, companyContext }), analysis, 'openai/gpt-4o-mini', 1200, req.user.id]
    );

    res.json({ analysis });
  } catch (error) {
    console.error('AI risk analysis error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Generate policy
router.post('/generate-policy', authMiddleware, async (req, res) => {
  try {
    const { policyType, requirements } = req.body;

    const policy = await aiService.generatePolicy(policyType, requirements);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['policy_generation', JSON.stringify({ policyType, requirements }), policy, 'openai/gpt-4o-mini', 2000, req.user.id]
    );

    res.json({ policy });
  } catch (error) {
    console.error('AI policy generation error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Analyze document
router.post('/analyze-document', authMiddleware, async (req, res) => {
  try {
    const { documentContent, regulationContext } = req.body;

    const analysis = await aiService.analyzeDocument(documentContent, regulationContext);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['document_analysis', JSON.stringify({ documentContent: documentContent.substring(0, 500), regulationContext }), analysis, 'openai/gpt-4o-mini', 1100, req.user.id]
    );

    res.json({ analysis });
  } catch (error) {
    console.error('AI document analysis error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Assess vendor risk
router.post('/assess-vendor', authMiddleware, async (req, res) => {
  try {
    const { vendorData } = req.body;

    const assessment = await aiService.assessVendorRisk(vendorData);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['vendor_assessment', JSON.stringify(vendorData), assessment, 'openai/gpt-4o-mini', 900, req.user.id]
    );

    res.json({ assessment });
  } catch (error) {
    console.error('AI vendor assessment error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Analyze incident
router.post('/analyze-incident', authMiddleware, async (req, res) => {
  try {
    const { incidentData } = req.body;

    const analysis = await aiService.analyzeIncident(incidentData);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['incident_analysis', JSON.stringify(incidentData), analysis, 'openai/gpt-4o-mini', 1000, req.user.id]
    );

    res.json({ analysis });
  } catch (error) {
    console.error('AI incident analysis error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Generate risk assessment
router.post('/generate-risk', authMiddleware, async (req, res) => {
  try {
    const { context } = req.body;

    const assessment = await aiService.generateRiskAssessment(context);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['risk_generation', context, assessment, 'openai/gpt-4o-mini', 1300, req.user.id]
    );

    res.json({ assessment });
  } catch (error) {
    console.error('AI risk generation error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Explain regulation
router.post('/explain-regulation', authMiddleware, async (req, res) => {
  try {
    const { regulationName } = req.body;

    const explanation = await aiService.explainRegulation(regulationName);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['regulation_explanation', regulationName, explanation, 'openai/gpt-4o-mini', 1000, req.user.id]
    );

    res.json({ explanation });
  } catch (error) {
    console.error('AI regulation explanation error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Generate training content
router.post('/generate-training', authMiddleware, async (req, res) => {
  try {
    const { topic, audience } = req.body;

    const content = await aiService.generateTrainingContent(topic, audience);

    // Log the AI interaction
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['training_content', JSON.stringify({ topic, audience }), content, 'openai/gpt-4o-mini', 1500, req.user.id]
    );

    res.json({ content });
  } catch (error) {
    console.error('AI training content error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Compliance gap finder
router.post('/compliance-gap-finder', authMiddleware, async (req, res) => {
  try {
    const { frameworkName, currentControls, scope } = req.body;
    if (!frameworkName) return res.status(400).json({ error: 'frameworkName is required' });
    const result = await aiService.complianceGapFinder(frameworkName, currentControls || [], scope || '');
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['compliance_gap', JSON.stringify({ frameworkName, scope }), JSON.stringify(result), 'openai/gpt-4o-mini', 2000, req.user.id]
    );
    res.json({ result });
  } catch (error) {
    console.error('AI compliance gap error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Vendor risk scorer
router.post('/vendor-risk-scorer', authMiddleware, async (req, res) => {
  try {
    const { vendorData } = req.body;
    if (!vendorData) return res.status(400).json({ error: 'vendorData is required' });
    const result = await aiService.vendorRiskScorer(vendorData);
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['vendor_risk_score', JSON.stringify(vendorData), JSON.stringify(result), 'openai/gpt-4o-mini', 1200, req.user.id]
    );
    res.json({ result });
  } catch (error) {
    console.error('AI vendor risk score error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Remediation planner
router.post('/remediation-planner', authMiddleware, async (req, res) => {
  try {
    const { violationData, constraints } = req.body;
    if (!violationData) return res.status(400).json({ error: 'violationData is required' });
    const result = await aiService.remediationPlanner(violationData, constraints || {});
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['remediation_plan', JSON.stringify({ violationData, constraints }), JSON.stringify(result), 'openai/gpt-4o-mini', 1500, req.user.id]
    );
    res.json({ result });
  } catch (error) {
    console.error('AI remediation planner error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Policy conflict detector
router.post('/policy-conflict-detector', authMiddleware, async (req, res) => {
  try {
    const { policies, scope } = req.body;
    if (!policies || !Array.isArray(policies) || policies.length < 2) {
      return res.status(400).json({ error: 'policies must be an array of at least 2 entries' });
    }
    const result = await aiService.policyConflictDetector(policies, scope || '');
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['policy_conflict_detection', JSON.stringify({ scope, policy_count: policies.length }), JSON.stringify(result), 'openai/gpt-4o-mini', 1800, req.user.id]
    ).catch(() => null);
    res.json({ result });
  } catch (error) {
    if (error && error.code === 'NO_AI_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI policy conflict detector error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Control effectiveness assessment
router.post('/control-effectiveness-assessment', authMiddleware, async (req, res) => {
  try {
    const { controls, evidenceContext } = req.body;
    if (!controls || !Array.isArray(controls) || controls.length === 0) {
      return res.status(400).json({ error: 'controls must be a non-empty array' });
    }
    const result = await aiService.controlEffectivenessAssessment(controls, evidenceContext || '');
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['control_effectiveness', JSON.stringify({ control_count: controls.length }), JSON.stringify(result), 'openai/gpt-4o-mini', 1800, req.user.id]
    ).catch(() => null);
    res.json({ result });
  } catch (error) {
    if (error && error.code === 'NO_AI_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI control effectiveness error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Board readiness report
router.post('/board-readiness-report', authMiddleware, async (req, res) => {
  try {
    const { organizationData, period } = req.body;
    if (!organizationData) {
      return res.status(400).json({ error: 'organizationData is required' });
    }
    const result = await aiService.boardReadinessReport(organizationData, period || '');
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['board_readiness_report', JSON.stringify({ period }), JSON.stringify(result), 'openai/gpt-4o-mini', 2200, req.user.id]
    ).catch(() => null);
    res.json({ result });
  } catch (error) {
    if (error && error.code === 'NO_AI_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI board readiness report error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get AI analysis history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT ah.*, u.first_name || ' ' || u.last_name as user_name
      FROM ai_analysis_history ah
      LEFT JOIN users u ON ah.user_id = u.id
      ORDER BY ah.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
