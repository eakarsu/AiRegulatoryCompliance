const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { buildPaginatedQuery, bulkDelete, bulkUpdate } = require('../utils/queryHelper');

const router = express.Router();

// Get all vendors (with search, sort, pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await buildPaginatedQuery({
      baseQuery: 'SELECT * FROM vendors',
      table: 'vendors',
      searchColumns: ['name', 'contact_email', 'category', 'risk_rating', 'compliance_status'],
      allowedSortColumns: ['name', 'category', 'risk_rating', 'compliance_status', 'contract_start', 'created_at'],
      defaultSort: 'name ASC'
    }, req);
    res.json(result);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });
    const count = await bulkDelete('vendors', ids, req.user.id, 'vendor');
    res.json({ message: `${count} deleted`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/bulk', authMiddleware, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !updates) return res.status(400).json({ error: 'IDs and updates required' });
    const count = await bulkUpdate('vendors', ids, updates, req.user.id, 'vendor');
    res.json({ message: `${count} updated`, count });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Get single vendor
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vendor
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, contact_email, contact_phone, address, category, risk_rating, compliance_status, contract_start, contract_end, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO vendors (name, contact_email, contact_phone, address, category, risk_rating, compliance_status, contract_start, contract_end, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, contact_email, contact_phone, address, category, risk_rating || 'medium', compliance_status || 'pending_review', contract_start, contract_end, notes]
    );

    // Log the creation
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['CREATE', 'vendor', result.rows[0].id, req.user.id, JSON.stringify({ name }), req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, contact_email, contact_phone, address, category, risk_rating, compliance_status, contract_start, contract_end, notes } = req.body;

    const result = await pool.query(
      `UPDATE vendors SET name = $1, contact_email = $2, contact_phone = $3, address = $4, category = $5,
       risk_rating = $6, compliance_status = $7, contract_start = $8, contract_end = $9, notes = $10,
       updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *`,
      [name, contact_email, contact_phone, address, category, risk_rating, compliance_status, contract_start, contract_end, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Log the update
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['UPDATE', 'vendor', req.params.id, req.user.id, JSON.stringify({ name, compliance_status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vendor
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Log the deletion
    await pool.query(
      'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'vendor', req.params.id, req.user.id, JSON.stringify({ name: result.rows[0].name }), req.ip]
    );

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Assess vendor risk
router.post('/:id/ai-assess', authMiddleware, async (req, res) => {
  try {
    const vendorResult = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendorResult.rows[0];
    const assessment = await aiService.assessVendorRisk(vendor);

    // Log the AI analysis
    await pool.query(
      'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['vendor_assessment', JSON.stringify(vendor), assessment, 'openai/gpt-4o-mini', 900, req.user.id]
    );

    res.json({ vendor, assessment });
  } catch (error) {
    console.error('AI assess vendor error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Get vendor stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant,
        COUNT(*) FILTER (WHERE compliance_status = 'non_compliant') as non_compliant,
        COUNT(*) FILTER (WHERE compliance_status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE risk_rating = 'high') as high_risk,
        COUNT(*) FILTER (WHERE contract_end < CURRENT_DATE + INTERVAL '90 days') as expiring_soon
      FROM vendors
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
