// Custom Views - AI Regulatory Compliance
// 4 endpoints (2 VIZ + 2 NON-VIZ):
//   1. VIZ:     GET  /api/custom-views/compliance-score-trend       - Compliance score trend chart data
//   2. VIZ:     GET  /api/custom-views/regulation-bu-heatmap        - Regulation x Business Unit heatmap
//   3. NON-VIZ: POST /api/custom-views/attestation-pdf              - Compliance attestation PDF
//   4. NON-VIZ: GET/POST/PUT/DELETE /api/custom-views/controls      - Control library rules editor (CRUD)

const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// ─── Helpers ────────────────────────────────────────────────────────────────
function seededRand(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── 1. VIZ: Compliance Score Trend ─────────────────────────────────────────
// GET /api/custom-views/compliance-score-trend?days=30&framework=GDPR
router.get('/compliance-score-trend', (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 180);
  const framework = (req.query.framework || 'GDPR').toString();
  const seed = Array.from(framework).reduce((a, c) => a + c.charCodeAt(0), 0) + days;
  const rand = seededRand(seed);

  const targetScore = 90.0;
  const series = [];
  let baseScore = 72 + rand() * 8;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    // gradual improvement with noise
    baseScore = Math.min(100, Math.max(50, baseScore + (rand() - 0.4) * 1.2));
    const score = +baseScore.toFixed(2);
    const openFindings = Math.max(0, Math.round(40 - (score - 60) * 0.6 + rand() * 6));
    const closedFindings = Math.round(rand() * 6);
    const controlsTested = 20 + Math.floor(rand() * 30);
    const controlsPassed = Math.floor(controlsTested * (score / 100));

    series.push({
      date: d.toISOString().substring(0, 10),
      compliance_score: score,
      open_findings: openFindings,
      closed_findings: closedFindings,
      controls_tested: controlsTested,
      controls_passed: controlsPassed,
      pass_rate_pct: +((controlsPassed / controlsTested) * 100).toFixed(2),
      meets_target: score >= targetScore,
    });
  }

  const avgScore = +(series.reduce((a, s) => a + s.compliance_score, 0) / series.length).toFixed(2);
  const aboveTarget = series.filter((s) => s.meets_target).length;
  const first = series[0].compliance_score;
  const last = series[series.length - 1].compliance_score;

  res.json({
    framework,
    days,
    target_score: targetScore,
    average_score: avgScore,
    current_score: last,
    starting_score: first,
    delta_pts: +(last - first).toFixed(2),
    days_above_target: aboveTarget,
    days_below_target: series.length - aboveTarget,
    series,
    best_day: series.reduce((a, s) => (s.compliance_score > a.compliance_score ? s : a), series[0]),
    worst_day: series.reduce((a, s) => (s.compliance_score < a.compliance_score ? s : a), series[0]),
    generated_at: new Date().toISOString(),
  });
});

// ─── 2. VIZ: Regulation x Business Unit Heatmap ─────────────────────────────
// GET /api/custom-views/regulation-bu-heatmap?org=Acme
router.get('/regulation-bu-heatmap', (req, res) => {
  const org = (req.query.org || 'Acme').toString();
  const seed = Array.from(org).reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRand(seed);

  const regulations = [
    { id: 'GDPR',     name: 'GDPR',           region: 'EU' },
    { id: 'HIPAA',    name: 'HIPAA',          region: 'US' },
    { id: 'SOX',      name: 'SOX',            region: 'US' },
    { id: 'PCI-DSS',  name: 'PCI-DSS',        region: 'Global' },
    { id: 'CCPA',     name: 'CCPA',           region: 'US-CA' },
    { id: 'ISO27001', name: 'ISO 27001',      region: 'Global' },
    { id: 'NIST-CSF', name: 'NIST CSF',       region: 'US' },
  ];
  const businessUnits = [
    'Finance',
    'HR',
    'Engineering',
    'Sales',
    'Operations',
    'Customer Support',
  ];

  // matrix[regIdx][buIdx] = compliance score 0-100
  const matrix = regulations.map((r) =>
    businessUnits.map((bu) => {
      const base = 60 + rand() * 38;
      return +base.toFixed(1);
    })
  );

  const cells = [];
  regulations.forEach((r, ri) => {
    businessUnits.forEach((bu, bi) => {
      const score = matrix[ri][bi];
      cells.push({
        regulation_id: r.id,
        regulation_name: r.name,
        region: r.region,
        business_unit: bu,
        regulation_index: ri,
        bu_index: bi,
        score_pct: score,
        status: score >= 90 ? 'Compliant' : score >= 75 ? 'Partial' : score >= 60 ? 'At Risk' : 'Non-Compliant',
      });
    });
  });

  const avgScore = +(cells.reduce((a, c) => a + c.score_pct, 0) / cells.length).toFixed(2);
  const worstCell = cells.reduce((a, c) => (c.score_pct < a.score_pct ? c : a), cells[0]);
  const bestCell = cells.reduce((a, c) => (c.score_pct > a.score_pct ? c : a), cells[0]);

  res.json({
    organization: org,
    regulations,
    business_units: businessUnits,
    matrix,
    cells,
    summary: {
      total_cells: cells.length,
      avg_score_pct: avgScore,
      compliant_cells: cells.filter((c) => c.status === 'Compliant').length,
      at_risk_cells: cells.filter((c) => c.status === 'At Risk').length,
      non_compliant_cells: cells.filter((c) => c.status === 'Non-Compliant').length,
      worst: worstCell,
      best: bestCell,
    },
    generated_at: new Date().toISOString(),
  });
});

// ─── 3. NON-VIZ: Compliance Attestation PDF ─────────────────────────────────
// POST /api/custom-views/attestation-pdf
router.post('/attestation-pdf', (req, res) => {
  const {
    attestation_id = 'ATT-' + new Date().getFullYear() + '-0001',
    framework = 'GDPR',
    period = 'Q2 ' + new Date().getFullYear(),
    organization = 'Acme Corporation',
    attestor = req.user?.email || 'admin@compliance.com',
    business_unit = 'Enterprise',
    score = 92,
  } = req.body || {};

  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch (e) {
    return res.status(500).json({ error: 'pdfkit not installed' });
  }

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.json({
      attestation_id,
      framework,
      period,
      organization,
      attestor,
      business_unit,
      score,
      generated_at: new Date().toISOString(),
      pdf_base64: buf.toString('base64'),
      size_bytes: buf.length,
      filename: `attestation_${attestation_id}.pdf`,
      mime: 'application/pdf',
      signed: true,
    });
  });

  // Header
  doc.fontSize(18).fillColor('#0b3d91').text('COMPLIANCE ATTESTATION CERTIFICATE', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#444').text('Issued under AI Regulatory Compliance Management', { align: 'center' });
  doc.moveDown(1);

  // Attestation block
  doc.fillColor('#000').fontSize(11);
  doc.text(`Attestation ID:     ${attestation_id}`);
  doc.text(`Framework:          ${framework}`);
  doc.text(`Reporting Period:   ${period}`);
  doc.text(`Organization:       ${organization}`);
  doc.text(`Business Unit:      ${business_unit}`);
  doc.text(`Attestor:           ${attestor}`);
  doc.text(`Compliance Score:   ${score} / 100`);
  doc.text(`Issue Date:         ${new Date().toISOString().substring(0, 10)}`);
  doc.moveDown(0.5);

  // 1. Scope
  doc.fontSize(13).fillColor('#0b3d91').text('1. Scope of Attestation');
  doc.fontSize(10).fillColor('#000');
  doc.text(
    `This attestation confirms that the controls applicable to ${framework} have been reviewed for the ` +
    `period stated above across the ${business_unit} business unit of ${organization}.`,
    { align: 'justify' }
  );
  doc.moveDown(0.5);

  // 2. Control Coverage
  doc.fontSize(13).fillColor('#0b3d91').text('2. Control Coverage');
  doc.fontSize(10).fillColor('#000');
  const controls = [
    ['Access Control',          'AC-01', 'Implemented', 'PASS'],
    ['Encryption at Rest',      'EN-02', 'Implemented', 'PASS'],
    ['Audit Logging',           'AU-03', 'Implemented', 'PASS'],
    ['Incident Response Plan',  'IR-04', 'Documented',  'PASS'],
    ['Vendor Risk Review',      'VR-05', 'Implemented', 'PASS'],
    ['Data Subject Rights',     'DS-06', 'Implemented', 'PASS'],
    ['Privacy Impact Assess.',  'PI-07', 'Implemented', 'PASS'],
  ];
  controls.forEach((c) => {
    doc.text(`  - ${c[0].padEnd(28, ' ')} ${c[1].padEnd(8, ' ')} ${c[2].padEnd(14, ' ')} [${c[3]}]`);
  });
  doc.moveDown(0.5);

  // 3. Findings
  doc.fontSize(13).fillColor('#0b3d91').text('3. Findings & Remediation');
  doc.fontSize(10).fillColor('#000');
  doc.text(`  - Open findings: ${Math.max(0, 100 - score)}`);
  doc.text('  - Critical findings: 0');
  doc.text('  - Target remediation date: 30 days from issuance');
  doc.moveDown(0.5);

  // 4. Sign-off
  doc.fontSize(13).fillColor('#0b3d91').text('4. Attestor Sign-Off');
  doc.fontSize(10).fillColor('#000');
  doc.text(`Attestor:        ${attestor}  ___________________  Date: ____________`);
  doc.text('Compliance Officer:  ____________________________  Date: ____________');
  doc.text('Executive Sponsor:   ____________________________  Date: ____________');
  doc.moveDown(1);
  doc.fontSize(8).fillColor('gray').text(
    'This electronic attestation forms part of the organization compliance record and is signed under the ' +
    'authority of the named attestor. Retain for the regulatory retention period.',
    { align: 'center' }
  );

  doc.end();
});

// ─── 4. NON-VIZ: Control Library Rules Editor (CRUD) ────────────────────────
// In-memory store seeded with 4 controls. Frequency drives next test date.
//   GET    /api/custom-views/controls
//   GET    /api/custom-views/controls/:id
//   POST   /api/custom-views/controls
//   PUT    /api/custom-views/controls/:id
//   DELETE /api/custom-views/controls/:id

const VALID_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annually', 'Annually'];

let __controlSeq = 5;
const __controls = [
  {
    id: 1,
    control_id: 'AC-01',
    name: 'Access Control Review',
    category: 'Identity & Access Management',
    framework: 'ISO 27001',
    description: 'Quarterly review of user access rights across critical systems.',
    frequency: 'Quarterly',
    owner: 'IT Security',
    status: 'Active',
    last_tested: '2026-03-15',
    next_test: '2026-06-15',
    updated_at: new Date().toISOString(),
    updated_by: 'admin@compliance.com',
  },
  {
    id: 2,
    control_id: 'EN-02',
    name: 'Encryption at Rest Verification',
    category: 'Cryptography',
    framework: 'PCI-DSS',
    description: 'Verify that all databases storing cardholder data use AES-256 at rest.',
    frequency: 'Monthly',
    owner: 'Platform Engineering',
    status: 'Active',
    last_tested: '2026-04-30',
    next_test: '2026-05-30',
    updated_at: new Date().toISOString(),
    updated_by: 'admin@compliance.com',
  },
  {
    id: 3,
    control_id: 'AU-03',
    name: 'Audit Log Integrity Check',
    category: 'Logging & Monitoring',
    framework: 'SOX',
    description: 'Daily hash verification of audit log tamper-evident chain.',
    frequency: 'Daily',
    owner: 'SOC',
    status: 'Active',
    last_tested: '2026-05-17',
    next_test: '2026-05-18',
    updated_at: new Date().toISOString(),
    updated_by: 'admin@compliance.com',
  },
  {
    id: 4,
    control_id: 'IR-04',
    name: 'Incident Response Tabletop',
    category: 'Incident Management',
    framework: 'NIST CSF',
    description: 'Semi-annual cross-functional tabletop exercise simulating a breach.',
    frequency: 'Semi-Annually',
    owner: 'CISO Office',
    status: 'Active',
    last_tested: '2026-01-10',
    next_test: '2026-07-10',
    updated_at: new Date().toISOString(),
    updated_by: 'admin@compliance.com',
  },
];

// LIST + GET-ONE
router.get('/controls', (req, res) => {
  const { framework, status, frequency } = req.query;
  let list = __controls;
  if (framework) list = list.filter((c) => c.framework === framework);
  if (status) list = list.filter((c) => c.status === status);
  if (frequency) list = list.filter((c) => c.frequency === frequency);
  res.json({
    data: list,
    total: list.length,
    valid_frequencies: VALID_FREQUENCIES,
    generated_at: new Date().toISOString(),
  });
});

router.get('/controls/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const c = __controls.find((x) => x.id === id);
  if (!c) return res.status(404).json({ error: 'Control not found' });
  res.json(c);
});

// CREATE
router.post('/controls', (req, res) => {
  const {
    control_id = 'CTL-' + Date.now(),
    name = 'New Control',
    category = 'General',
    framework = 'GDPR',
    description = '',
    frequency = 'Quarterly',
    owner = 'Compliance Team',
    status = 'Active',
    last_tested = new Date().toISOString().substring(0, 10),
  } = req.body || {};

  if (!VALID_FREQUENCIES.includes(frequency)) {
    return res.status(400).json({
      error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
    });
  }

  const control = {
    id: __controlSeq++,
    control_id,
    name,
    category,
    framework,
    description,
    frequency,
    owner,
    status,
    last_tested,
    next_test: computeNextTest(last_tested, frequency),
    updated_at: new Date().toISOString(),
    updated_by: req.user?.email || 'unknown',
  };
  __controls.push(control);
  res.status(201).json(control);
});

// UPDATE
router.put('/controls/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = __controls.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Control not found' });

  const next = { ...__controls[idx], ...req.body, id };
  if (next.frequency && !VALID_FREQUENCIES.includes(next.frequency)) {
    return res.status(400).json({
      error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
    });
  }
  if (next.last_tested && next.frequency) {
    next.next_test = computeNextTest(next.last_tested, next.frequency);
  }
  next.updated_at = new Date().toISOString();
  next.updated_by = req.user?.email || 'unknown';
  __controls[idx] = next;
  res.json(next);
});

// DELETE
router.delete('/controls/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = __controls.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Control not found' });
  const removed = __controls.splice(idx, 1)[0];
  res.json({ deleted: true, control: removed });
});

function computeNextTest(lastTestedIso, frequency) {
  const d = new Date(lastTestedIso);
  if (isNaN(d.getTime())) return null;
  const addDays = (n) => new Date(d.getTime() + n * 86400000).toISOString().substring(0, 10);
  switch (frequency) {
    case 'Daily': return addDays(1);
    case 'Weekly': return addDays(7);
    case 'Monthly': return addDays(30);
    case 'Quarterly': return addDays(90);
    case 'Semi-Annually': return addDays(182);
    case 'Annually': return addDays(365);
    default: return addDays(90);
  }
}

module.exports = router;
