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
