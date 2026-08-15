const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('./config/database');
const { generalLimiter, authLimiter } = require('./middleware/rateLimit');
const governanceRouter = require('../governance');

// Import existing routes
const authRoutes = require('./routes/auth');
const regulationsRoutes = require('./routes/regulations');
const complianceRoutes = require('./routes/compliance');
const risksRoutes = require('./routes/risks');
const policiesRoutes = require('./routes/policies');
const documentsRoutes = require('./routes/documents');
const incidentsRoutes = require('./routes/incidents');
const vendorsRoutes = require('./routes/vendors');
const auditRoutes = require('./routes/audit');
const reportsRoutes = require('./routes/reports');
const trainingRoutes = require('./routes/training');
const alertsRoutes = require('./routes/alerts');
const frameworksRoutes = require('./routes/frameworks');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

// Import NEW AI feature routes
const gdprScannerRoutes = require('./routes/gdprScanner');
const auditSchedulerRoutes = require('./routes/auditScheduler');
const violationPredictorRoutes = require('./routes/violationPredictor');
const trainingTrackerRoutes = require('./routes/trainingTracker');
const privacyPolicyGeneratorRoutes = require('./routes/privacyPolicyGenerator');
const complianceCheckerRoutes = require('./routes/complianceChecker');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5001;
const signedAccess = (req, res, next) => {
  const secret = process.env.JWT_SECRET || '';
  const token = req.headers.authorization && req.headers.authorization.match(/^Bearer (.+)$/)?.[1];
  if (secret.length < 32) return res.status(503).json({ error: 'secure JWT configuration required' });
  try {
    const claims = jwt.verify(token || '', secret, { algorithms: ['HS256'] });
    if (!claims.tenantId || !claims.role || !Array.isArray(claims.subjectIds)) throw new Error('claims');
    req.user = claims;
    return next();
  } catch (_) { return res.status(401).json({ error: 'signed tenant, role, and subject scope required' }); }
};

// Security & Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Existing API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/governance', governanceRouter);
app.use('/api', signedAccess);
app.use('/api/regulations', regulationsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/risks', risksRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/frameworks', frameworksRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);

// NEW AI Feature Routes
app.use('/api/gdpr-scanner', gdprScannerRoutes);
app.use('/api/audit-scheduler', auditSchedulerRoutes);
app.use('/api/violation-predictor', violationPredictorRoutes);
app.use('/api/training-tracker', trainingTrackerRoutes);
app.use('/api/privacy-policy-generator', privacyPolicyGeneratorRoutes);
app.use('/api/compliance-checker', complianceCheckerRoutes);
app.use('/api/export', exportRoutes);

if (process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production') {
  app.use('/api/generated/custom-views', require('./routes/customViews'));
  app.use('/api/generated/continuous-monitor', require('./routes/ai-continuous-monitor'));
  app.use('/api/generated/evidence-exception-tracker', require('./routes/evidenceExceptionTracker'));
}

app.use('/api', require('./routes/generatedFeatures').router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const ensureConfiguredAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email && !password) return;
  if (!email || password.length < 8) {
    throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters are required together');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password, first_name, last_name, role, email_verified)
     VALUES ($1, $2, 'Runtime', 'Administrator', 'admin', true)
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       role = 'admin',
       email_verified = true,
       updated_at = CURRENT_TIMESTAMP`,
    [email, passwordHash]
  );
};

// Test database connection and start server
const startServer = async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    await ensureConfiguredAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to connect to database');
    process.exitCode = 1;
  }
};

startServer();
