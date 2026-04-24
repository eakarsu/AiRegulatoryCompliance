const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

// Get all training progress (with search, sort, pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: `SELECT tp.*, u.first_name, u.last_name, u.email, u.role as user_role
      FROM training_progress tp
      LEFT JOIN users u ON tp.employee_id = u.id`,
      table: 'training_progress',
      searchColumns: ['tp.training_program', 'tp.department', 'tp.compliance_status'],
      allowedSortColumns: ['training_program', 'department', 'overall_score', 'compliance_status', 'due_date', 'created_at'],
      defaultSort: 'tp.due_date ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({ error: 'Failed to fetch training progress' });
  }
});

router.delete('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('training_progress', ids, req.user?.id || 1, 'training_progress');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', optionalAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('training_progress', ids, updates, req.user?.id || 1, 'training_progress');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single training progress
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT tp.*, u.first_name, u.last_name, u.email, u.role as user_role
      FROM training_progress tp
      LEFT JOIN users u ON tp.employee_id = u.id
      WHERE tp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({ error: 'Failed to fetch training progress' });
  }
});

// Create new training progress
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { employee_id, training_program, department, required_courses, due_date } = req.body;

    const result = await pool.query(`
      INSERT INTO training_progress (employee_id, training_program, department, required_courses, completed_courses, compliance_status, due_date)
      VALUES ($1, $2, $3, $4, 0, 'Not Started', $5)
      RETURNING *
    `, [employee_id, training_program, department, required_courses, due_date]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating training progress:', error);
    res.status(500).json({ error: 'Failed to create training progress' });
  }
});

// Update training progress
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { training_program, department, required_courses, completed_courses, overall_score, compliance_status, due_date, next_training } = req.body;

    const result = await pool.query(`
      UPDATE training_progress
      SET training_program = COALESCE($1, training_program),
          department = COALESCE($2, department),
          required_courses = COALESCE($3, required_courses),
          completed_courses = COALESCE($4, completed_courses),
          overall_score = COALESCE($5, overall_score),
          compliance_status = COALESCE($6, compliance_status),
          due_date = COALESCE($7, due_date),
          next_training = COALESCE($8, next_training),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [training_program, department, required_courses, completed_courses, overall_score, compliance_status, due_date, next_training, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating training progress:', error);
    res.status(500).json({ error: 'Failed to update training progress' });
  }
});

// Delete training progress
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM training_progress WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    res.json({ message: 'Training progress deleted successfully' });
  } catch (error) {
    console.error('Error deleting training progress:', error);
    res.status(500).json({ error: 'Failed to delete training progress' });
  }
});

// AI Analyze Training Progress
router.post('/:id/ai-analyze', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get training progress details
    const progressResult = await pool.query(`
      SELECT tp.*, u.first_name, u.last_name, u.role
      FROM training_progress tp
      LEFT JOIN users u ON tp.employee_id = u.id
      WHERE tp.id = $1
    `, [id]);

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    const progress = progressResult.rows[0];

    // Run AI analysis
    const aiAnalysis = await aiService.analyzeTrainingProgress(
      {
        employeeName: `${progress.first_name} ${progress.last_name}`,
        role: progress.role,
        department: progress.department,
        program: progress.training_program,
        completedCourses: progress.completed_courses,
        requiredCourses: progress.required_courses,
        currentScore: progress.overall_score
      },
      {
        program: progress.training_program,
        requiredCourses: progress.required_courses,
        dueDate: progress.due_date
      }
    );

    // Parse AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch {
      parsedAnalysis = { analysis: aiAnalysis, overallScore: progress.overall_score || 0 };
    }

    // Determine compliance status based on progress
    let complianceStatus = 'Not Started';
    const completionRate = (progress.completed_courses / progress.required_courses) * 100;
    if (completionRate >= 100) {
      complianceStatus = 'Compliant';
    } else if (completionRate >= 50) {
      complianceStatus = 'In Progress';
    } else if (completionRate > 0) {
      complianceStatus = 'At Risk';
    }

    // Update progress with AI results
    const updateResult = await pool.query(`
      UPDATE training_progress
      SET ai_recommendations = $1,
          skill_gaps = $2,
          compliance_status = $3,
          next_training = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      aiAnalysis,
      JSON.stringify(parsedAnalysis.skillGaps || []),
      parsedAnalysis.complianceStatus || complianceStatus,
      parsedAnalysis.priorityTrainings?.[0] || '',
      id
    ]);

    // Log to AI history
    await pool.query(`
      INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, user_id)
      VALUES ('training_analysis', $1, $2, $3, $4)
    `, [JSON.stringify(progress), aiAnalysis, process.env.OPENROUTER_MODEL, req.user?.id || 1]);

    res.json({
      progress: updateResult.rows[0],
      aiAnalysis: parsedAnalysis
    });
  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({ error: 'Failed to run AI analysis' });
  }
});

// Get statistics
router.get('/stats/summary', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END) as compliant,
        COUNT(CASE WHEN compliance_status = 'At Risk' THEN 1 END) as at_risk,
        COUNT(CASE WHEN compliance_status = 'Non-Compliant' THEN 1 END) as non_compliant,
        AVG(overall_score) as average_score,
        AVG(CASE WHEN required_courses > 0 THEN (completed_courses::float / required_courses) * 100 ELSE 0 END) as average_completion_rate
      FROM training_progress
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
