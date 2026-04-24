const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all audit schedules (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT as_sch.*,
             u1.first_name as auditor_first_name, u1.last_name as auditor_last_name,
             u2.first_name as creator_first_name, u2.last_name as creator_last_name
      FROM audit_schedules as_sch
      LEFT JOIN users u1 ON as_sch.assigned_auditor = u1.id
      LEFT JOIN users u2 ON as_sch.created_by = u2.id`,
      table: 'audit_schedules',
      searchColumns: ['as_sch.audit_name', 'as_sch.audit_type', 'as_sch.department', 'as_sch.status'],
      allowedSortColumns: ['audit_name', 'audit_type', 'frequency', 'department', 'status', 'next_audit_date', 'created_at'],
      defaultSort: 'as_sch.next_audit_date ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching audit schedules:', error);
    res.status(500).json({ error: 'Failed to fetch audit schedules' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('audit_schedules', ids, req.user?.id || 1, 'audit_schedule');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('audit_schedules', ids, updates, req.user?.id || 1, 'audit_schedule');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single audit schedule
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT as_sch.*,
             u1.first_name as auditor_first_name, u1.last_name as auditor_last_name,
             u2.first_name as creator_first_name, u2.last_name as creator_last_name
      FROM audit_schedules as_sch
      LEFT JOIN users u1 ON as_sch.assigned_auditor = u1.id
      LEFT JOIN users u2 ON as_sch.created_by = u2.id
      WHERE as_sch.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching audit schedule:', error);
    res.status(500).json({ error: 'Failed to fetch audit schedule' });
  }
});

// Create new audit schedule
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, priority, scope } = req.body;
    const userId = req.user?.id || 1;

    const result = await pool.query(`
      INSERT INTO audit_schedules (audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, priority, scope, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9)
      RETURNING *
    `, [audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, priority, scope, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit schedule:', error);
    res.status(500).json({ error: 'Failed to create audit schedule' });
  }
});

// Update audit schedule
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, last_audit_date, status, priority, scope, ai_recommendations } = req.body;

    const result = await pool.query(`
      UPDATE audit_schedules
      SET audit_name = COALESCE($1, audit_name),
          audit_type = COALESCE($2, audit_type),
          frequency = COALESCE($3, frequency),
          department = COALESCE($4, department),
          assigned_auditor = COALESCE($5, assigned_auditor),
          next_audit_date = COALESCE($6, next_audit_date),
          last_audit_date = COALESCE($7, last_audit_date),
          status = COALESCE($8, status),
          priority = COALESCE($9, priority),
          scope = COALESCE($10, scope),
          ai_recommendations = COALESCE($11, ai_recommendations),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, last_audit_date, status, priority, scope, ai_recommendations, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating audit schedule:', error);
    res.status(500).json({ error: 'Failed to update audit schedule' });
  }
});

// Delete audit schedule
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM audit_schedules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit schedule not found' });
    }

    res.json({ message: 'Audit schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit schedule:', error);
    res.status(500).json({ error: 'Failed to delete audit schedule' });
  }
});

// AI Generate Audit Recommendations
router.post('/:id/ai-recommend', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get audit schedule details
    const scheduleResult = await pool.query('SELECT * FROM audit_schedules WHERE id = $1', [id]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Audit schedule not found' });
    }

    const schedule = scheduleResult.rows[0];

    // Run AI analysis
    const aiAnalysis = await aiService.generateAuditSchedule({
      name: schedule.audit_name,
      type: schedule.audit_type,
      department: schedule.department,
      currentFrequency: schedule.frequency,
      priority: schedule.priority,
      scope: schedule.scope
    });

    // Parse AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch {
      parsedAnalysis = { recommendations: [aiAnalysis] };
    }

    // Update schedule with AI recommendations
    const updateResult = await pool.query(`
      UPDATE audit_schedules
      SET ai_recommendations = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [aiAnalysis, id]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('audit_schedule', $1, $2, $3, $4)
    `, [JSON.stringify(schedule), aiAnalysis, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      schedule: updateResult.rows[0],
      aiAnalysis: parsedAnalysis
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ error: 'Failed to generate AI recommendations' });
  }
});

// Get statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN next_audit_date < CURRENT_DATE THEN 1 END) as overdue
      FROM audit_schedules
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
