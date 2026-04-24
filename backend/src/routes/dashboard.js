const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get dashboard summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    // Get all stats in parallel
    const [
      regulations,
      compliance,
      risks,
      incidents,
      vendors,
      alerts,
      policies,
      documents,
      training,
      recentActivity
    ] = await Promise.all([
      // Regulations count
      pool.query('SELECT COUNT(*) as total FROM regulations WHERE status = $1', ['active']),

      // Compliance stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE risk_level = 'critical' OR risk_level = 'high') as high_risk,
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
        FROM compliance_checks
      `),

      // Risk stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          AVG(risk_score) as average_score,
          COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk,
          COUNT(*) FILTER (WHERE status = 'identified') as needs_attention
        FROM risk_assessments
      `),

      // Incident stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high') as critical_high
        FROM incidents
      `),

      // Vendor stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant,
          COUNT(*) FILTER (WHERE compliance_status = 'non_compliant') as non_compliant,
          COUNT(*) FILTER (WHERE risk_rating = 'high') as high_risk
        FROM vendors
      `),

      // Alert stats
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical
        FROM alerts
      `),

      // Policy stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE review_date < CURRENT_DATE) as needs_review
        FROM policies
      `),

      // Document stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'pending_review') as pending
        FROM documents
      `),

      // Training stats
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completion_status = 'completed') as completed,
          ROUND(AVG(score) FILTER (WHERE score IS NOT NULL)) as average_score
        FROM training_records
      `),

      // Recent activity
      pool.query(`
        SELECT at.*, u.first_name || ' ' || u.last_name as user_name
        FROM audit_trail at
        LEFT JOIN users u ON at.user_id = u.id
        ORDER BY at.created_at DESC
        LIMIT 10
      `)
    ]);

    // Calculate compliance score
    const complianceTotal = parseInt(compliance.rows[0].total) || 1;
    const complianceCompleted = parseInt(compliance.rows[0].completed) || 0;
    const complianceScore = Math.round((complianceCompleted / complianceTotal) * 100);

    res.json({
      regulations: {
        total: parseInt(regulations.rows[0].total)
      },
      compliance: {
        ...compliance.rows[0],
        score: complianceScore
      },
      risks: {
        ...risks.rows[0],
        average_score: Math.round(parseFloat(risks.rows[0].average_score) || 0)
      },
      incidents: incidents.rows[0],
      vendors: vendors.rows[0],
      alerts: alerts.rows[0],
      policies: policies.rows[0],
      documents: documents.rows[0],
      training: training.rows[0],
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get compliance trends (last 6 months)
router.get('/trends/compliance', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM compliance_checks
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get compliance trends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get risk trends
router.get('/trends/risks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        ROUND(AVG(risk_score)) as average_score,
        COUNT(*) as total
      FROM risk_assessments
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get risk trends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get incident trends
router.get('/trends/incidents', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high') as critical_high
      FROM incidents
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get incident trends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming deadlines
router.get('/deadlines', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      (SELECT 'compliance_check' as type, id, title, due_date as deadline, status, risk_level as priority
       FROM compliance_checks
       WHERE due_date >= CURRENT_DATE AND status != 'completed'
       ORDER BY due_date
       LIMIT 5)
      UNION ALL
      (SELECT 'policy_review' as type, id, title, review_date as deadline, status, 'medium' as priority
       FROM policies
       WHERE review_date >= CURRENT_DATE
       ORDER BY review_date
       LIMIT 5)
      UNION ALL
      (SELECT 'vendor_contract' as type, id, name as title, contract_end as deadline, compliance_status as status, risk_rating as priority
       FROM vendors
       WHERE contract_end >= CURRENT_DATE
       ORDER BY contract_end
       LIMIT 5)
      ORDER BY deadline
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
