const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const entityConfig = {
  regulations: { table: 'regulations', title: 'Regulations Report', columns: ['name', 'code', 'category', 'jurisdiction', 'status'] },
  compliance: { table: 'compliance_checks', title: 'Compliance Checks Report', columns: ['title', 'status', 'risk_level', 'findings'] },
  risks: { table: 'risk_assessments', title: 'Risk Assessments Report', columns: ['title', 'risk_category', 'likelihood', 'impact', 'status'] },
  policies: { table: 'policies', title: 'Policies Report', columns: ['title', 'category', 'version', 'status'] },
  documents: { table: 'documents', title: 'Documents Report', columns: ['title', 'file_type', 'category', 'status'] },
  incidents: { table: 'incidents', title: 'Incidents Report', columns: ['title', 'incident_type', 'severity', 'status'] },
  vendors: { table: 'vendors', title: 'Vendors Report', columns: ['name', 'category', 'risk_rating', 'compliance_status'] },
  audit: { table: 'audit_trail', title: 'Audit Trail Report', columns: ['action', 'entity_type', 'entity_id', 'ip_address'] },
  reports: { table: 'reports', title: 'Reports Summary', columns: ['title', 'report_type', 'status'] },
  training: { table: 'training_records', title: 'Training Records Report', columns: ['course_name', 'category', 'completion_status', 'score'] },
  alerts: { table: 'alerts', title: 'Alerts Report', columns: ['title', 'type', 'severity', 'status'] },
  frameworks: { table: 'control_frameworks', title: 'Frameworks Report', columns: ['name', 'framework_type', 'version', 'status'] },
  'gdpr-scanner': { table: 'gdpr_scans', title: 'GDPR Scans Report', columns: ['scan_name', 'scan_type', 'target_system', 'status', 'compliance_score'] },
  'audit-scheduler': { table: 'audit_schedules', title: 'Audit Schedules Report', columns: ['audit_name', 'audit_type', 'frequency', 'department', 'status'] },
  'violation-predictor': { table: 'violation_predictions', title: 'Violation Predictions Report', columns: ['prediction_name', 'risk_area', 'probability_score', 'impact_level', 'status'] },
  'training-tracker': { table: 'training_progress', title: 'Training Progress Report', columns: ['training_program', 'department', 'completed_courses', 'overall_score', 'compliance_status'] },
  'privacy-policy-generator': { table: 'privacy_policies', title: 'Privacy Policies Report', columns: ['policy_name', 'policy_type', 'jurisdiction', 'status'] },
  'compliance-checker': { table: 'compliance_checks_legal', title: 'Legal Compliance Checks Report', columns: ['check_name', 'check_type', 'jurisdiction', 'compliance_status', 'compliance_score'] }
};

router.get('/pdf/:entity', authMiddleware, async (req, res) => {
  try {
    const { entity } = req.params;
    const config = entityConfig[entity];

    if (!config) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const result = await pool.query(`SELECT * FROM ${config.table} ORDER BY created_at DESC LIMIT 500`);
    const rows = result.rows;

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}-report.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(config.title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    const colWidth = (doc.page.width - 100) / config.columns.length;
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    config.columns.forEach((col, i) => {
      doc.text(col.replace(/_/g, ' ').toUpperCase(), 50 + i * colWidth, y, { width: colWidth - 5, continued: false });
    });
    y += 20;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
    y += 5;

    // Table rows
    doc.font('Helvetica').fontSize(8);
    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }

      config.columns.forEach((col, i) => {
        const val = row[col] != null ? String(row[col]).substring(0, 40) : '-';
        doc.text(val, 50 + i * colWidth, y, { width: colWidth - 5, continued: false });
      });
      y += 18;
    }

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
