const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all incidents (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT i.*,
             r.first_name || ' ' || r.last_name as reported_by_name,
             a.first_name || ' ' || a.last_name as assigned_to_name
      FROM incidents i
      LEFT JOIN users r ON i.reported_by = r.id
      LEFT JOIN users a ON i.assigned_to = a.id`,
      table: 'incidents',
      searchColumns: ['i.title', 'i.description', 'i.incident_type', 'i.severity', 'i.status'],
      allowedSortColumns: ['title', 'incident_type', 'severity', 'status', 'occurred_at', 'created_at'],
      defaultSort: 'i.created_at DESC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('incidents', ids, req.user.id, 'incident');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('incidents', ids, updates, req.user.id, 'incident');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single incident
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*,
             r.first_name || ' ' || r.last_name as reported_by_name,
             a.first_name || ' ' || a.last_name as assigned_to_name
      FROM incidents i
      LEFT JOIN users r ON i.reported_by = r.id
      LEFT JOIN users a ON i.assigned_to = a.id
      WHERE i.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create incident
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, incident_type, severity, status, assigned_to, occurred_at } = req.body;

    const result = await pool.query(
      `INSERT INTO incidents (title, description, incident_type, severity, status, reported_by, assigned_to, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, incident_type, severity, status || 'open', req.user.id, assigned_to, occurred_at || new Date()]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'incident', result.rows[0].id, req.user.id, JSON.stringify({ title, severity }), req.ip]
    );

    // Create alert for high/critical incidents
    if (severity === 'critical' || severity === 'high') {
      await pool.query(
        `INSERT INTO alerts (title, message, type, severity, related_entity_type, related_entity_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`New ${severity} incident: ${title}`, description, 'incident', severity, 'incident', result.rows[0].id, assigned_to]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update incident
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, incident_type, severity, status, assigned_to, resolution } = req.body;

    const resolvedAt = status === 'resolved' ? new Date() : null;

    const result = await pool.query(
      `UPDATE incidents SET title = $1, description = $2, incident_type = $3, severity = $4,
       status = $5, assigned_to = $6, resolution = $7, resolved_at = COALESCE($8, resolved_at),
       updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
      [title, description, incident_type, severity, status, assigned_to, resolution, resolvedAt, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'incident', req.params.id, req.user.id, JSON.stringify({ title, status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete incident
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM incidents WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'incident', req.params.id, req.user.id, JSON.stringify({ title: result.rows[0].title }), req.ip]
    );

    res.json({ message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Analyze incident
router.post('/:id/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const incidentResult = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);

    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const incident = incidentResult.rows[0];
    const analysis = await aiService.analyzeIncident(incident);

    // Update incident with AI recommendation
    await pool.query(
      'UPDATE incidents SET ai_recommendation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, req.params.id]
    );

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['incident_analysis', JSON.stringify(incident), analysis, 'openai/gpt-4o-mini', 1000, req.user.id]
    );

    res.json({ incident, analysis });
  } catch (error) {
    console.error('AI analyze incident error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get incident stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'investigating') as investigating,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high
      FROM incidents
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get incident stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
