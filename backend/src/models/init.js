const pool = require('../config/database');

const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        phone VARCHAR(50),
        department VARCHAR(100),
        avatar_url VARCHAR(500),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        email_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Regulations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS regulations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(100),
        jurisdiction VARCHAR(100),
        effective_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        requirements TEXT[],
        penalties TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Compliance Checks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_checks (
        id SERIAL PRIMARY KEY,
        regulation_id INTEGER REFERENCES regulations(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        risk_level VARCHAR(50),
        findings TEXT,
        recommendations TEXT,
        checked_by INTEGER REFERENCES users(id),
        checked_at TIMESTAMP,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit Trail table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        category VARCHAR(100),
        version VARCHAR(20),
        status VARCHAR(50) DEFAULT 'draft',
        effective_date DATE,
        review_date DATE,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Risk Assessments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        risk_category VARCHAR(100),
        likelihood VARCHAR(50),
        impact VARCHAR(50),
        risk_score INTEGER,
        mitigation_strategy TEXT,
        status VARCHAR(50) DEFAULT 'identified',
        assigned_to INTEGER REFERENCES users(id),
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500),
        file_type VARCHAR(50),
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending_review',
        ai_summary TEXT,
        ai_compliance_score INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        severity VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        related_entity_type VARCHAR(100),
        related_entity_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        report_type VARCHAR(100),
        content JSONB,
        status VARCHAR(50) DEFAULT 'draft',
        generated_by INTEGER REFERENCES users(id),
        period_start DATE,
        period_end DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Training Records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        course_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        completion_status VARCHAR(50) DEFAULT 'not_started',
        score INTEGER,
        completed_at TIMESTAMP,
        certificate_url VARCHAR(500),
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Incidents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        incident_type VARCHAR(100),
        severity VARCHAR(50),
        status VARCHAR(50) DEFAULT 'open',
        reported_by INTEGER REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        resolution TEXT,
        ai_recommendation TEXT,
        occurred_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vendors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        category VARCHAR(100),
        risk_rating VARCHAR(50),
        compliance_status VARCHAR(50) DEFAULT 'pending_review',
        contract_start DATE,
        contract_end DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Analysis History table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_analysis_history (
        id SERIAL PRIMARY KEY,
        analysis_type VARCHAR(100),
        input_data TEXT,
        output_data TEXT,
        model_used VARCHAR(100),
        tokens_used INTEGER,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Control Frameworks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS control_frameworks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        framework_type VARCHAR(100),
        version VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        controls JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        category VARCHAR(100),
        description TEXT,
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =====================================================
    // NEW TABLES FOR AI FEATURES
    // =====================================================

    // GDPR Scans table - AI GDPR Scanner
    await client.query(`
      CREATE TABLE IF NOT EXISTS gdpr_scans (
        id SERIAL PRIMARY KEY,
        scan_name VARCHAR(255) NOT NULL,
        scan_type VARCHAR(100),
        target_system VARCHAR(255),
        data_categories TEXT[],
        status VARCHAR(50) DEFAULT 'pending',
        compliance_score INTEGER,
        findings JSONB,
        recommendations TEXT,
        ai_analysis TEXT,
        scanned_by INTEGER REFERENCES users(id),
        scanned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit Schedules table - AI Audit Scheduler
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_schedules (
        id SERIAL PRIMARY KEY,
        audit_name VARCHAR(255) NOT NULL,
        audit_type VARCHAR(100),
        frequency VARCHAR(50),
        department VARCHAR(100),
        assigned_auditor INTEGER REFERENCES users(id),
        next_audit_date DATE,
        last_audit_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        priority VARCHAR(50),
        scope TEXT,
        ai_recommendations TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Violation Predictions table - AI Violation Predictor
    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_predictions (
        id SERIAL PRIMARY KEY,
        prediction_name VARCHAR(255) NOT NULL,
        regulation_id INTEGER REFERENCES regulations(id),
        risk_area VARCHAR(100),
        predicted_violation_type VARCHAR(100),
        probability_score INTEGER,
        impact_level VARCHAR(50),
        contributing_factors JSONB,
        preventive_measures TEXT,
        ai_analysis TEXT,
        status VARCHAR(50) DEFAULT 'active',
        predicted_by INTEGER REFERENCES users(id),
        prediction_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Training Progress table - AI Training Tracker
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_progress (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id),
        training_program VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        required_courses INTEGER,
        completed_courses INTEGER,
        overall_score INTEGER,
        compliance_status VARCHAR(50),
        due_date DATE,
        ai_recommendations TEXT,
        skill_gaps JSONB,
        next_training TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Privacy Policies table - AI Privacy Policy Generator
    await client.query(`
      CREATE TABLE IF NOT EXISTS privacy_policies (
        id SERIAL PRIMARY KEY,
        policy_name VARCHAR(255) NOT NULL,
        policy_type VARCHAR(100),
        jurisdiction VARCHAR(100),
        target_audience VARCHAR(100),
        content TEXT,
        data_collected TEXT[],
        legal_bases TEXT[],
        retention_periods TEXT,
        third_party_sharing TEXT,
        user_rights TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        ai_generated BOOLEAN DEFAULT false,
        version VARCHAR(20),
        effective_date DATE,
        review_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Compliance Checks Legal table - AI Compliance Checker
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_checks_legal (
        id SERIAL PRIMARY KEY,
        check_name VARCHAR(255) NOT NULL,
        check_type VARCHAR(100),
        regulation_id INTEGER REFERENCES regulations(id),
        jurisdiction VARCHAR(100),
        department VARCHAR(100),
        compliance_status VARCHAR(50) DEFAULT 'pending',
        compliance_score INTEGER,
        gaps_identified JSONB,
        legal_risks TEXT,
        recommendations TEXT,
        ai_analysis TEXT,
        evidence_collected TEXT,
        checked_by INTEGER REFERENCES users(id),
        check_date DATE,
        next_review_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Database tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating database tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = initializeDatabase;
