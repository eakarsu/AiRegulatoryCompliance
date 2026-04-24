const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const initializeDatabase = require('./models/init');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedDatabase = async () => {
  console.log('Starting database seeding...');

  try {
    // Initialize tables
    await initializeDatabase();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Clear existing data
      await client.query(`
        TRUNCATE TABLE ai_analysis_history, alerts, audit_trail, compliance_checks, documents,
        incidents, policies, reports, risk_assessments, training_records, vendors, control_frameworks,
        settings, regulations, gdpr_scans, audit_schedules, violation_predictions, training_progress,
        privacy_policies, compliance_checks_legal, users RESTART IDENTITY CASCADE
      `);

      // Seed Users (15 items)
      const hashedPassword = await bcrypt.hash('password123', 10);
      const users = [
        ['admin@compliance.com', hashedPassword, 'Admin', 'User', 'admin'],
        ['john.smith@compliance.com', hashedPassword, 'John', 'Smith', 'compliance_officer'],
        ['jane.doe@compliance.com', hashedPassword, 'Jane', 'Doe', 'analyst'],
        ['mike.johnson@compliance.com', hashedPassword, 'Mike', 'Johnson', 'auditor'],
        ['sarah.williams@compliance.com', hashedPassword, 'Sarah', 'Williams', 'manager'],
        ['david.brown@compliance.com', hashedPassword, 'David', 'Brown', 'user'],
        ['emily.davis@compliance.com', hashedPassword, 'Emily', 'Davis', 'analyst'],
        ['robert.wilson@compliance.com', hashedPassword, 'Robert', 'Wilson', 'compliance_officer'],
        ['lisa.anderson@compliance.com', hashedPassword, 'Lisa', 'Anderson', 'auditor'],
        ['james.taylor@compliance.com', hashedPassword, 'James', 'Taylor', 'manager'],
        ['patricia.thomas@compliance.com', hashedPassword, 'Patricia', 'Thomas', 'user'],
        ['michael.jackson@compliance.com', hashedPassword, 'Michael', 'Jackson', 'analyst'],
        ['jennifer.white@compliance.com', hashedPassword, 'Jennifer', 'White', 'compliance_officer'],
        ['william.harris@compliance.com', hashedPassword, 'William', 'Harris', 'auditor'],
        ['elizabeth.martin@compliance.com', hashedPassword, 'Elizabeth', 'Martin', 'manager']
      ];

      for (const user of users) {
        await client.query(
          'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
          user
        );
      }
      console.log('Seeded 15 users');

      // Seed Regulations (15 items)
      const regulations = [
        ['GDPR', 'GDPR-2018', 'General Data Protection Regulation - EU data privacy law', 'Data Privacy', 'European Union', '2018-05-25', 'active', '{Data subject rights,Consent management,Data breach notification,Privacy by design}', 'Up to 4% of annual global turnover or €20 million'],
        ['CCPA', 'CCPA-2020', 'California Consumer Privacy Act', 'Data Privacy', 'California, USA', '2020-01-01', 'active', '{Consumer rights,Opt-out mechanisms,Privacy notices,Data sale restrictions}', 'Up to $7,500 per intentional violation'],
        ['HIPAA', 'HIPAA-1996', 'Health Insurance Portability and Accountability Act', 'Healthcare', 'United States', '1996-08-21', 'active', '{PHI protection,Access controls,Audit trails,Encryption requirements}', 'Up to $1.5 million per violation category per year'],
        ['SOX', 'SOX-2002', 'Sarbanes-Oxley Act', 'Financial', 'United States', '2002-07-30', 'active', '{Financial reporting,Internal controls,Audit requirements,Management assessment}', 'Up to $5 million fine and 20 years imprisonment'],
        ['PCI-DSS', 'PCI-DSS-4.0', 'Payment Card Industry Data Security Standard', 'Financial', 'Global', '2022-03-31', 'active', '{Network security,Cardholder data protection,Vulnerability management,Access control}', 'Fines from $5,000 to $100,000 per month'],
        ['ISO 27001', 'ISO-27001-2022', 'Information Security Management Systems', 'Information Security', 'Global', '2022-10-25', 'active', '{Risk assessment,Security controls,Continuous improvement,Documentation}', 'Loss of certification and business impact'],
        ['NIST CSF', 'NIST-CSF-2.0', 'NIST Cybersecurity Framework', 'Cybersecurity', 'United States', '2024-02-26', 'active', '{Identify,Protect,Detect,Respond,Recover}', 'Varies by implementing organization'],
        ['GLBA', 'GLBA-1999', 'Gramm-Leach-Bliley Act', 'Financial', 'United States', '1999-11-12', 'active', '{Privacy notices,Safeguards rule,Pretexting provisions}', 'Up to $100,000 per violation'],
        ['FERPA', 'FERPA-1974', 'Family Educational Rights and Privacy Act', 'Education', 'United States', '1974-08-21', 'active', '{Student records protection,Parental access rights,Disclosure restrictions}', 'Loss of federal funding'],
        ['COPPA', 'COPPA-1998', 'Children Online Privacy Protection Act', 'Data Privacy', 'United States', '1998-10-21', 'active', '{Parental consent,Privacy notices,Data minimization,Security requirements}', 'Up to $50,120 per violation'],
        ['DORA', 'DORA-2022', 'Digital Operational Resilience Act', 'Financial', 'European Union', '2025-01-17', 'active', '{ICT risk management,Incident reporting,Resilience testing,Third-party risk}', 'Up to 1% of average daily worldwide turnover'],
        ['NIS2', 'NIS2-2022', 'Network and Information Security Directive 2', 'Cybersecurity', 'European Union', '2024-10-17', 'active', '{Risk management,Incident reporting,Supply chain security,Business continuity}', 'Up to €10 million or 2% of turnover'],
        ['AI Act', 'AI-ACT-2024', 'EU Artificial Intelligence Act', 'Artificial Intelligence', 'European Union', '2024-08-01', 'active', '{Risk classification,Transparency,Human oversight,Documentation}', 'Up to €35 million or 7% of turnover'],
        ['CPRA', 'CPRA-2023', 'California Privacy Rights Act', 'Data Privacy', 'California, USA', '2023-01-01', 'active', '{Sensitive data,Automated decision-making,Data minimization,Correction rights}', 'Up to $7,500 per intentional violation'],
        ['LGPD', 'LGPD-2020', 'Lei Geral de Proteção de Dados', 'Data Privacy', 'Brazil', '2020-09-18', 'active', '{Consent,Data subject rights,International transfers,DPO requirement}', 'Up to 2% of revenue or R$50 million']
      ];

      for (const reg of regulations) {
        await client.query(
          'INSERT INTO regulations (name, code, description, category, jurisdiction, effective_date, status, requirements, penalties) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          reg
        );
      }
      console.log('Seeded 15 regulations');

      // Seed Compliance Checks (15 items)
      const complianceChecks = [
        [1, 'GDPR Data Mapping Review', 'Review of data processing activities and data flow mapping', 'completed', 'medium', 'Data inventory complete, minor gaps in third-party data flows', 'Update vendor data processing agreements', 2, '2024-01-15', '2024-02-01'],
        [2, 'CCPA Consumer Rights Audit', 'Audit of consumer rights request handling processes', 'in_progress', 'high', 'Response time exceeding 45-day requirement', 'Implement automated request tracking system', 3, null, '2024-02-15'],
        [3, 'HIPAA Security Assessment', 'Annual security risk assessment for PHI', 'pending', 'critical', null, null, null, null, '2024-03-01'],
        [4, 'SOX Internal Controls Review', 'Quarterly review of financial reporting controls', 'completed', 'medium', 'All controls operating effectively', 'Continue monitoring', 4, '2024-01-20', '2024-01-31'],
        [5, 'PCI-DSS Network Scan', 'Quarterly external vulnerability scan', 'completed', 'low', 'No critical vulnerabilities found', 'Address 3 medium findings within 30 days', 2, '2024-01-25', '2024-01-31'],
        [6, 'ISO 27001 ISMS Audit', 'Internal audit of information security management system', 'in_progress', 'medium', 'Documentation gaps in asset management', 'Update asset inventory procedures', 5, null, '2024-02-28'],
        [7, 'NIST CSF Gap Analysis', 'Assessment against NIST Cybersecurity Framework', 'pending', 'high', null, null, null, null, '2024-03-15'],
        [8, 'GLBA Safeguards Review', 'Review of customer information security program', 'completed', 'medium', 'Encryption standards met', 'Enhance monitoring capabilities', 3, '2024-01-10', '2024-01-20'],
        [1, 'GDPR Consent Management Audit', 'Review of consent collection and management practices', 'in_progress', 'high', 'Cookie consent mechanism needs updates', 'Implement granular consent options', 2, null, '2024-02-10'],
        [9, 'FERPA Compliance Check', 'Annual review of student data protection measures', 'completed', 'low', 'All requirements met', 'Annual refresher training recommended', 4, '2024-01-05', '2024-01-15'],
        [10, 'COPPA Parental Consent Audit', 'Review of parental consent mechanisms', 'pending', 'critical', null, null, null, null, '2024-02-20'],
        [11, 'DORA ICT Risk Assessment', 'Assessment of ICT risk management framework', 'in_progress', 'high', 'Third-party risk management gaps identified', 'Enhance vendor due diligence process', 5, null, '2024-03-01'],
        [12, 'NIS2 Incident Response Review', 'Review of incident response procedures', 'pending', 'medium', null, null, null, null, '2024-02-25'],
        [13, 'AI Act Risk Classification', 'Classification of AI systems by risk level', 'in_progress', 'critical', 'High-risk AI systems identified', 'Implement required documentation', 3, null, '2024-03-10'],
        [14, 'CPRA Sensitive Data Audit', 'Audit of sensitive personal information handling', 'pending', 'high', null, null, null, null, '2024-02-28']
      ];

      for (const check of complianceChecks) {
        await client.query(
          'INSERT INTO compliance_checks (regulation_id, title, description, status, risk_level, findings, recommendations, checked_by, checked_at, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          check
        );
      }
      console.log('Seeded 15 compliance checks');

      // Seed Audit Trail (15 items)
      const auditTrail = [
        ['LOGIN', 'user', 1, 1, '{"browser": "Chrome", "os": "Windows"}', '192.168.1.100'],
        ['CREATE', 'regulation', 1, 1, '{"name": "GDPR", "code": "GDPR-2018"}', '192.168.1.100'],
        ['UPDATE', 'compliance_check', 1, 2, '{"status": "in_progress", "previous_status": "pending"}', '192.168.1.101'],
        ['VIEW', 'document', 5, 3, '{"document_title": "Privacy Policy v2.0"}', '192.168.1.102'],
        ['EXPORT', 'report', 2, 4, '{"format": "PDF", "report_type": "quarterly_compliance"}', '192.168.1.103'],
        ['DELETE', 'alert', 10, 2, '{"alert_title": "Expired Certificate", "reason": "resolved"}', '192.168.1.101'],
        ['UPDATE', 'policy', 3, 5, '{"version": "2.1", "previous_version": "2.0"}', '192.168.1.104'],
        ['CREATE', 'risk_assessment', 5, 3, '{"title": "Third Party Risk", "risk_level": "high"}', '192.168.1.102'],
        ['LOGIN', 'user', 5, 5, '{"browser": "Firefox", "os": "MacOS"}', '192.168.1.104'],
        ['APPROVE', 'document', 8, 4, '{"document_title": "Security Guidelines"}', '192.168.1.103'],
        ['UPDATE', 'incident', 2, 2, '{"status": "resolved", "previous_status": "investigating"}', '192.168.1.101'],
        ['CREATE', 'vendor', 12, 5, '{"vendor_name": "CloudSecure Inc"}', '192.168.1.104'],
        ['VIEW', 'regulation', 3, 1, '{"regulation_name": "HIPAA"}', '192.168.1.100'],
        ['LOGOUT', 'user', 1, 1, '{"session_duration": "2h 15m"}', '192.168.1.100'],
        ['AI_ANALYSIS', 'document', 7, 3, '{"analysis_type": "compliance_check", "model": "claude-haiku"}', '192.168.1.102']
      ];

      for (const audit of auditTrail) {
        await client.query(
          'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          audit
        );
      }
      console.log('Seeded 15 audit trail entries');

      // Seed Policies (15 items)
      const policies = [
        ['Data Protection Policy', 'Comprehensive policy for protecting personal and sensitive data', 'This policy establishes guidelines for the collection, use, storage, and disposal of personal data...', 'Data Privacy', '3.0', 'active', '2024-01-01', '2025-01-01', 1],
        ['Information Security Policy', 'Policy governing information security practices', 'This policy defines the security controls and practices required to protect company information assets...', 'Security', '2.5', 'active', '2023-06-01', '2024-06-01', 2],
        ['Acceptable Use Policy', 'Guidelines for acceptable use of company IT resources', 'This policy outlines the acceptable use of computer equipment, networks, and data...', 'IT Governance', '2.0', 'active', '2023-09-01', '2024-09-01', 1],
        ['Incident Response Policy', 'Procedures for responding to security incidents', 'This policy establishes the incident response team structure and procedures...', 'Security', '1.5', 'active', '2023-12-01', '2024-12-01', 3],
        ['Access Control Policy', 'Policy for managing access to systems and data', 'This policy defines the principles and requirements for controlling access to information systems...', 'Security', '2.2', 'active', '2023-08-01', '2024-08-01', 2],
        ['Business Continuity Policy', 'Policy for ensuring business continuity', 'This policy establishes the framework for maintaining business operations during disruptions...', 'Operations', '1.8', 'active', '2023-10-01', '2024-10-01', 4],
        ['Vendor Management Policy', 'Policy for managing third-party vendors', 'This policy defines requirements for selecting, onboarding, and monitoring vendors...', 'Risk Management', '2.0', 'active', '2023-11-01', '2024-11-01', 5],
        ['Data Retention Policy', 'Guidelines for data retention and disposal', 'This policy specifies how long different types of data should be retained...', 'Data Privacy', '1.5', 'active', '2023-07-01', '2024-07-01', 1],
        ['Password Policy', 'Requirements for password management', 'This policy establishes minimum requirements for passwords and authentication...', 'Security', '3.0', 'active', '2024-01-15', '2025-01-15', 2],
        ['Remote Work Policy', 'Guidelines for remote work security', 'This policy defines security requirements for employees working remotely...', 'Security', '2.0', 'active', '2023-05-01', '2024-05-01', 3],
        ['Email Security Policy', 'Policy for secure email communications', 'This policy establishes guidelines for secure use of email systems...', 'Security', '1.8', 'active', '2023-09-15', '2024-09-15', 2],
        ['Mobile Device Policy', 'Guidelines for mobile device usage', 'This policy defines requirements for using mobile devices for work purposes...', 'IT Governance', '2.1', 'active', '2023-08-15', '2024-08-15', 4],
        ['Change Management Policy', 'Procedures for managing system changes', 'This policy establishes the change management process for IT systems...', 'IT Governance', '1.5', 'draft', '2024-02-01', '2025-02-01', 5],
        ['Physical Security Policy', 'Policy for physical security of premises', 'This policy defines physical security controls for office locations and data centers...', 'Security', '2.0', 'active', '2023-06-15', '2024-06-15', 1],
        ['AI Ethics Policy', 'Guidelines for ethical AI use', 'This policy establishes principles for the ethical development and use of AI systems...', 'AI Governance', '1.0', 'draft', '2024-03-01', '2025-03-01', 3]
      ];

      for (const policy of policies) {
        await client.query(
          'INSERT INTO policies (title, description, content, category, version, status, effective_date, review_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          policy
        );
      }
      console.log('Seeded 15 policies');

      // Seed Risk Assessments (15 items)
      const riskAssessments = [
        ['Third-Party Data Breach Risk', 'Risk of data breach through third-party vendors', 'Third Party', 'likely', 'severe', 85, 'Implement vendor security assessments and contractual controls', 'mitigating', 2, 'AI analysis indicates high correlation between vendor access levels and breach likelihood.'],
        ['Ransomware Attack Risk', 'Risk of ransomware attack on critical systems', 'Cybersecurity', 'possible', 'critical', 90, 'Implement endpoint detection and response, regular backups', 'identified', 3, 'Pattern analysis shows increased targeting of organizations in our sector.'],
        ['Regulatory Non-Compliance', 'Risk of failing to meet GDPR requirements', 'Compliance', 'likely', 'major', 75, 'Enhance data protection program and conduct regular audits', 'mitigating', 2, 'Gap analysis reveals 3 high-priority areas requiring attention.'],
        ['Insider Threat Risk', 'Risk of malicious or negligent insider actions', 'Security', 'possible', 'severe', 70, 'Implement DLP and user behavior analytics', 'monitoring', 4, 'Behavioral analysis suggests implementing additional monitoring.'],
        ['Cloud Service Outage', 'Risk of critical cloud service unavailability', 'Operational', 'unlikely', 'major', 45, 'Implement multi-cloud strategy and disaster recovery', 'accepted', 5, 'SLA analysis indicates 99.9% availability meets requirements.'],
        ['Phishing Attack Success', 'Risk of successful phishing attack', 'Cybersecurity', 'almost_certain', 'moderate', 65, 'Enhanced security awareness training and email filtering', 'mitigating', 3, 'Simulation data shows 15% click rate.'],
        ['Data Loss Prevention Failure', 'Risk of sensitive data exfiltration', 'Data Security', 'possible', 'severe', 72, 'Implement comprehensive DLP solution', 'identified', 2, 'Content inspection identifies gaps in cloud monitoring.'],
        ['API Security Vulnerability', 'Risk of API exploitation', 'Application Security', 'likely', 'major', 68, 'Implement API gateway with security controls', 'mitigating', 4, 'Vulnerability scan reveals 5 APIs requiring remediation.'],
        ['Privacy Violation Incident', 'Risk of privacy regulation violation', 'Privacy', 'possible', 'severe', 74, 'Enhance privacy impact assessment process', 'monitoring', 2, 'Data flow analysis identifies potential issues.'],
        ['Business Email Compromise', 'Risk of BEC fraud', 'Fraud', 'likely', 'major', 70, 'Implement email authentication and financial controls', 'mitigating', 5, 'Pattern matching indicates executive accounts as targets.'],
        ['Supply Chain Attack', 'Risk of compromise through software supply chain', 'Cybersecurity', 'possible', 'critical', 82, 'Implement software composition analysis', 'identified', 3, 'Dependency analysis reveals 12 high-risk components.'],
        ['Mobile Device Compromise', 'Risk of corporate data exposure via mobile', 'Device Security', 'likely', 'moderate', 55, 'Implement MDM solution with containerization', 'mitigating', 4, 'Device inventory shows 30% lack required controls.'],
        ['Social Engineering Attack', 'Risk of successful social engineering', 'Human Factor', 'almost_certain', 'moderate', 60, 'Enhanced security awareness and verification procedures', 'monitoring', 2, 'Call analysis indicates help desk as primary vector.'],
        ['Cryptographic Weakness', 'Risk of cryptographic control failure', 'Technical', 'unlikely', 'severe', 48, 'Upgrade to current cryptographic standards', 'identified', 3, 'Algorithm analysis identifies 2 legacy systems.'],
        ['AI Model Bias', 'Risk of discriminatory AI decisions', 'AI Governance', 'possible', 'major', 62, 'Implement AI fairness testing and monitoring', 'identified', 5, 'Model audit suggests potential demographic disparities.']
      ];

      for (const risk of riskAssessments) {
        await client.query(
          'INSERT INTO risk_assessments (title, description, risk_category, likelihood, impact, risk_score, mitigation_strategy, status, assigned_to, ai_analysis) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          risk
        );
      }
      console.log('Seeded 15 risk assessments');

      // Seed Documents (15 items)
      const documents = [
        ['Privacy Policy v3.0', 'Current privacy policy for website and services', '/documents/privacy-policy-v3.pdf', 'pdf', 'Legal', 'approved', 'Comprehensive privacy policy covering GDPR, CCPA, and other regulations.', 92],
        ['Security Incident Response Plan', 'Detailed incident response procedures', '/documents/incident-response-plan.pdf', 'pdf', 'Security', 'approved', 'Well-structured IRP with clear escalation paths.', 88],
        ['Vendor Security Questionnaire', 'Standard vendor security assessment template', '/documents/vendor-questionnaire.docx', 'docx', 'Procurement', 'pending_review', 'Covers major security domains.', 75],
        ['GDPR Compliance Report Q4', 'Quarterly GDPR compliance status report', '/documents/gdpr-q4-report.pdf', 'pdf', 'Compliance', 'approved', 'Thorough report showing 94% compliance.', 85],
        ['Employee Handbook - Security Section', 'Security policies for employees', '/documents/employee-security-handbook.pdf', 'pdf', 'HR', 'pending_review', 'Good coverage of basic security practices.', 78],
        ['SOC 2 Type II Report', 'Annual SOC 2 audit report', '/documents/soc2-report-2024.pdf', 'pdf', 'Audit', 'approved', 'Clean report with no exceptions noted.', 95],
        ['Data Processing Agreement Template', 'Standard DPA for vendors', '/documents/dpa-template.docx', 'docx', 'Legal', 'approved', 'Compliant with GDPR Article 28 requirements.', 90],
        ['Risk Assessment Methodology', 'Documentation of risk assessment approach', '/documents/risk-methodology.pdf', 'pdf', 'Risk Management', 'approved', 'Aligns with ISO 27005 and NIST frameworks.', 87],
        ['Business Continuity Plan', 'Organization BCP documentation', '/documents/bcp-2024.pdf', 'pdf', 'Operations', 'pending_review', 'Comprehensive plan but needs cloud service review.', 72],
        ['Penetration Test Report', 'Annual external penetration test results', '/documents/pentest-2024.pdf', 'pdf', 'Security', 'approved', 'No critical findings. 3 medium findings noted.', 82],
        ['Data Classification Guide', 'Guide for classifying data sensitivity', '/documents/data-classification.pdf', 'pdf', 'Data Governance', 'approved', 'Clear classification levels with handling requirements.', 89],
        ['Access Control Matrix', 'Role-based access control documentation', '/documents/rbac-matrix.xlsx', 'xlsx', 'Security', 'pending_review', 'Detailed RBAC model.', 76],
        ['Compliance Training Materials', 'Annual compliance training content', '/documents/compliance-training.pptx', 'pptx', 'Training', 'approved', 'Engaging content covering key regulations.', 84],
        ['Audit Finding Tracker', 'Tracking of open audit findings', '/documents/audit-tracker.xlsx', 'xlsx', 'Audit', 'pending_review', '12 open findings tracked.', 68],
        ['AI System Documentation', 'Documentation of AI/ML systems in use', '/documents/ai-systems-doc.pdf', 'pdf', 'AI Governance', 'draft', 'Initial documentation of AI systems.', 65]
      ];

      for (const doc of documents) {
        await client.query(
          'INSERT INTO documents (title, description, file_path, file_type, category, status, ai_summary, ai_compliance_score, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)',
          doc
        );
      }
      console.log('Seeded 15 documents');

      // Seed Alerts (15 items)
      const alerts = [
        ['GDPR Consent Expiry Warning', 'Customer consent records expiring in 30 days', 'warning', 'medium', 'active', 'regulation', 1, 1],
        ['Critical Vulnerability Detected', 'CVE-2024-1234 affects production systems', 'security', 'critical', 'active', 'risk_assessment', 2, 2],
        ['Compliance Deadline Approaching', 'SOX quarterly report due in 7 days', 'deadline', 'high', 'active', 'compliance_check', 4, 3],
        ['Policy Review Required', 'Information Security Policy due for review', 'review', 'medium', 'active', 'policy', 2, 4],
        ['Vendor Contract Expiring', 'CloudSecure Inc contract expires in 60 days', 'contract', 'low', 'active', 'vendor', 12, 5],
        ['Training Completion Overdue', '5 employees have overdue compliance training', 'training', 'medium', 'active', 'training_record', null, 2],
        ['Incident Escalation', 'Security incident requires management attention', 'incident', 'high', 'read', 'incident', 5, 3],
        ['Audit Finding Due', 'Finding remediation deadline tomorrow', 'deadline', 'high', 'active', 'compliance_check', 3, 4],
        ['New Regulation Published', 'EU Digital Services Act enforcement begins', 'regulatory', 'medium', 'active', 'regulation', null, 1],
        ['Risk Score Increased', 'Third-party risk score above threshold', 'risk', 'high', 'active', 'risk_assessment', 1, 2],
        ['Access Review Required', 'Quarterly access certification due', 'review', 'medium', 'active', 'policy', 5, 3],
        ['Document Approval Pending', '3 documents awaiting compliance review', 'approval', 'low', 'active', 'document', null, 4],
        ['Encryption Certificate Expiring', 'SSL certificate expires in 30 days', 'security', 'high', 'active', null, null, 2],
        ['Privacy Request SLA Warning', 'DSAR response approaching limit', 'deadline', 'high', 'active', 'compliance_check', 2, 1],
        ['Control Testing Due', 'SOX control testing scheduled', 'testing', 'medium', 'active', 'control_framework', 1, 5]
      ];

      for (const alert of alerts) {
        await client.query(
          'INSERT INTO alerts (title, message, type, severity, status, related_entity_type, related_entity_id, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          alert
        );
      }
      console.log('Seeded 15 alerts');

      // Seed Reports (15 items)
      const reports = [
        ['Q4 2024 Compliance Summary', 'Quarterly compliance status', 'quarterly_compliance', '{"total_regulations": 15, "compliant": 12, "partial": 2, "non_compliant": 1}', 'published', 1, '2024-10-01', '2024-12-31'],
        ['Annual Risk Assessment Report', 'Comprehensive annual risk assessment', 'annual_risk', '{"total_risks": 45, "critical": 3, "high": 12, "medium": 20, "low": 10}', 'published', 2, '2024-01-01', '2024-12-31'],
        ['GDPR Compliance Report', 'Detailed GDPR compliance status', 'regulatory', '{"compliance_score": 92, "findings": 5, "remediated": 3}', 'published', 2, '2024-01-01', '2024-12-31'],
        ['Incident Response Report', 'Monthly security incident summary', 'monthly_incident', '{"total_incidents": 8, "critical": 0, "resolved": 7, "open": 1}', 'published', 3, '2024-01-01', '2024-01-31'],
        ['Vendor Risk Summary Q4', 'Quarterly third-party risk assessment', 'vendor_risk', '{"vendors_assessed": 25, "high_risk": 2, "medium_risk": 8, "low_risk": 15}', 'published', 4, '2024-10-01', '2024-12-31'],
        ['Policy Compliance Dashboard', 'Policy adherence metrics', 'policy_compliance', '{"policies_active": 15, "compliance_rate": 94, "exceptions": 3}', 'draft', 5, '2024-01-01', '2024-12-31'],
        ['Training Completion Report', 'Employee compliance training status', 'training', '{"total_employees": 150, "completed": 142, "in_progress": 5, "not_started": 3}', 'published', 2, '2024-01-01', '2024-12-31'],
        ['Audit Finding Status Report', 'Open audit findings', 'audit', '{"total_findings": 23, "closed": 18, "in_progress": 4, "overdue": 1}', 'draft', 4, '2024-01-01', '2024-12-31'],
        ['Data Privacy Impact Report', 'DPIA summary for new initiatives', 'privacy', '{"dpias_completed": 12, "high_risk": 2, "approved": 10}', 'published', 1, '2024-01-01', '2024-12-31'],
        ['SOX Controls Testing Report', 'Annual SOX controls effectiveness', 'sox', '{"controls_tested": 85, "effective": 82, "deficient": 3}', 'draft', 4, '2024-01-01', '2024-12-31'],
        ['Cybersecurity Metrics Report', 'Monthly cybersecurity KPIs', 'security_metrics', '{"vulnerabilities_patched": 145, "mean_time_to_patch": 12, "incidents": 3}', 'published', 3, '2024-01-01', '2024-01-31'],
        ['Access Review Summary', 'Quarterly user access certification', 'access_review', '{"users_reviewed": 180, "access_revoked": 15, "exceptions": 3}', 'published', 5, '2024-10-01', '2024-12-31'],
        ['AI Systems Compliance Report', 'AI/ML systems regulatory compliance', 'ai_compliance', '{"ai_systems": 8, "high_risk": 2, "compliant": 5, "pending": 1}', 'draft', 3, '2024-01-01', '2024-12-31'],
        ['Executive Compliance Summary', 'Board-level compliance overview', 'executive', '{"overall_score": 87, "key_risks": 3, "budget_utilization": 92}', 'published', 1, '2024-01-01', '2024-12-31'],
        ['Regulatory Change Impact', 'Impact assessment of new regulations', 'regulatory_change', '{"new_regulations": 5, "high_impact": 2, "action_items": 15}', 'draft', 2, '2024-01-01', '2024-12-31']
      ];

      for (const report of reports) {
        await client.query(
          'INSERT INTO reports (title, description, report_type, content, status, generated_by, period_start, period_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          report
        );
      }
      console.log('Seeded 15 reports');

      // Seed Training Records (15 items)
      const trainingRecords = [
        [1, 'GDPR Fundamentals', 'Basic GDPR compliance training', 'Privacy', 'completed', 95, '2024-01-15', '/certs/gdpr-cert-1.pdf', '2025-01-15'],
        [2, 'Information Security Awareness', 'Annual security awareness training', 'Security', 'completed', 88, '2024-01-10', '/certs/security-cert-2.pdf', '2025-01-10'],
        [3, 'HIPAA Compliance', 'Healthcare data protection training', 'Healthcare', 'completed', 92, '2024-01-20', '/certs/hipaa-cert-3.pdf', '2025-01-20'],
        [4, 'SOX Compliance for Finance', 'Financial controls and reporting', 'Finance', 'in_progress', null, null, null, null],
        [5, 'Anti-Money Laundering', 'AML awareness and detection', 'Finance', 'completed', 90, '2024-01-05', '/certs/aml-cert-5.pdf', '2025-01-05'],
        [6, 'Phishing Awareness', 'Recognizing and reporting phishing', 'Security', 'completed', 85, '2024-01-12', null, '2025-01-12'],
        [7, 'Data Classification', 'Proper data handling', 'Data Governance', 'completed', 94, '2024-01-08', '/certs/data-cert-7.pdf', '2025-01-08'],
        [8, 'Incident Response Procedures', 'Security incident handling', 'Security', 'not_started', null, null, null, null],
        [9, 'CCPA Consumer Rights', 'California privacy law training', 'Privacy', 'completed', 87, '2024-01-18', '/certs/ccpa-cert-9.pdf', '2025-01-18'],
        [10, 'Third-Party Risk Management', 'Vendor risk assessment', 'Risk Management', 'in_progress', null, null, null, null],
        [11, 'Business Continuity Planning', 'BCP awareness', 'Operations', 'completed', 91, '2024-01-22', '/certs/bcp-cert-11.pdf', '2025-01-22'],
        [12, 'Code of Conduct', 'Annual ethics training', 'Ethics', 'completed', 100, '2024-01-03', '/certs/ethics-cert-12.pdf', '2025-01-03'],
        [13, 'Insider Threat Awareness', 'Recognizing insider threats', 'Security', 'completed', 83, '2024-01-25', '/certs/insider-cert-13.pdf', '2025-01-25'],
        [14, 'Privacy by Design', 'Implementing privacy in development', 'Privacy', 'not_started', null, null, null, null],
        [15, 'AI Ethics and Governance', 'Responsible AI use training', 'AI Governance', 'in_progress', null, null, null, null]
      ];

      for (const training of trainingRecords) {
        await client.query(
          'INSERT INTO training_records (user_id, course_name, description, category, completion_status, score, completed_at, certificate_url, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          training
        );
      }
      console.log('Seeded 15 training records');

      // Seed Incidents (15 items)
      const incidents = [
        ['Phishing Email Campaign Detected', 'Multiple employees received sophisticated phishing emails', 'phishing', 'high', 'resolved', 2, 3, 'Blocked sender domain, reset affected credentials', 'AI analysis indicates targeted spear-phishing campaign.', '2024-01-15 09:30:00', '2024-01-15 14:45:00'],
        ['Unauthorized Access Attempt', 'Multiple failed login attempts from foreign IP', 'unauthorized_access', 'medium', 'resolved', 3, 4, 'IP addresses blocked, MFA verified', 'Pattern suggests automated credential stuffing.', '2024-01-18 22:15:00', '2024-01-19 02:30:00'],
        ['Data Leak Investigation', 'Sensitive document found on public file sharing', 'data_breach', 'critical', 'investigating', 4, 2, null, 'Document classification indicates confidential data.', '2024-01-20 11:00:00', null],
        ['Malware Detection on Endpoint', 'Antivirus detected malicious software', 'malware', 'high', 'resolved', 3, 4, 'System isolated, malware removed', 'Trojan variant detected. No data exfiltration.', '2024-01-10 14:20:00', '2024-01-10 17:45:00'],
        ['SSL Certificate Expiry', 'Production SSL certificate expired', 'configuration', 'high', 'resolved', 5, 5, 'Certificate renewed and deployed', 'Recommend automated certificate management.', '2024-01-05 08:00:00', '2024-01-05 10:30:00'],
        ['DSAR Response Delay', 'Data subject access request exceeded 30-day limit', 'compliance', 'medium', 'resolved', 1, 2, 'Request completed, process review initiated', 'Process bottleneck identified in legal review.', '2024-01-08 09:00:00', '2024-01-12 16:00:00'],
        ['Vendor Data Breach Notification', 'Third-party vendor reported potential breach', 'third_party', 'critical', 'investigating', 5, 3, null, 'Vendor handles customer payment data.', '2024-01-22 15:30:00', null],
        ['Unauthorized Software Installation', 'Employee installed unapproved cloud storage', 'policy_violation', 'low', 'resolved', 2, 4, 'Application removed, policy reminder sent', 'Shadow IT detection.', '2024-01-12 11:15:00', '2024-01-12 14:00:00'],
        ['Network Intrusion Detected', 'IDS triggered on suspicious network traffic', 'intrusion', 'high', 'resolved', 3, 3, 'Traffic analyzed, false positive confirmed', 'Legitimate scanning tool triggered alert.', '2024-01-14 03:45:00', '2024-01-14 08:30:00'],
        ['Privacy Complaint Received', 'Customer complained about marketing emails after opt-out', 'privacy', 'medium', 'open', 1, 2, null, 'Consent management system delay identified.', '2024-01-21 10:00:00', null],
        ['Backup Failure', 'Nightly backup job failed for critical database', 'operational', 'high', 'resolved', 5, 5, 'Storage issue resolved, backup verified', 'Storage capacity planning needed.', '2024-01-16 06:00:00', '2024-01-16 09:15:00'],
        ['Access Rights Violation', 'User accessed files outside department scope', 'access_control', 'medium', 'investigating', 4, 4, null, 'Access pattern unusual.', '2024-01-19 14:30:00', null],
        ['DDoS Attack Mitigated', 'Distributed denial of service attack on website', 'ddos', 'high', 'resolved', 3, 3, 'CDN mitigation activated', 'Attack volume: 50Gbps.', '2024-01-11 16:00:00', '2024-01-11 18:30:00'],
        ['Mobile Device Lost', 'Employee reported company mobile phone lost', 'device_loss', 'medium', 'resolved', 6, 4, 'Device remotely wiped', 'MDM wipe confirmed successful.', '2024-01-17 19:00:00', '2024-01-17 19:45:00'],
        ['API Key Exposed', 'API key found in public code repository', 'credential_exposure', 'critical', 'resolved', 7, 2, 'Key rotated, commit history cleaned', 'Implement pre-commit hooks and secret scanning.', '2024-01-23 08:30:00', '2024-01-23 11:00:00']
      ];

      for (const incident of incidents) {
        await client.query(
          'INSERT INTO incidents (title, description, incident_type, severity, status, reported_by, assigned_to, resolution, ai_recommendation, occurred_at, resolved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          incident
        );
      }
      console.log('Seeded 15 incidents');

      // Seed Vendors (15 items)
      const vendors = [
        ['CloudSecure Inc', 'security@cloudsecure.com', '+1-555-0101', '123 Tech Park, San Francisco, CA', 'Cloud Security', 'low', 'compliant', '2023-01-01', '2025-12-31', 'Primary cloud security provider. SOC 2 certified.'],
        ['DataGuard Solutions', 'contact@dataguard.io', '+1-555-0102', '456 Privacy Lane, New York, NY', 'Data Protection', 'medium', 'compliant', '2022-06-15', '2024-06-14', 'Data backup and encryption services.'],
        ['ComplianceFirst Ltd', 'info@compliancefirst.com', '+44-20-1234-5678', '789 Regent St, London, UK', 'Compliance Software', 'low', 'compliant', '2023-03-01', '2026-02-28', 'GRC platform provider. ISO 27001 certified.'],
        ['SecureHost Pro', 'enterprise@securehost.net', '+1-555-0103', '321 Data Center Rd, Dallas, TX', 'Hosting', 'medium', 'pending_review', '2021-09-01', '2024-08-31', 'Colocation and managed hosting.'],
        ['IdentityShield', 'support@identityshield.com', '+1-555-0104', '654 Auth Avenue, Seattle, WA', 'Identity Management', 'low', 'compliant', '2023-07-01', '2026-06-30', 'SSO and MFA provider.'],
        ['PaymentPro Systems', 'compliance@paymentpro.com', '+1-555-0105', '987 Commerce Blvd, Chicago, IL', 'Payment Processing', 'high', 'compliant', '2022-01-15', '2025-01-14', 'PCI DSS Level 1 certified.'],
        ['ThreatWatch Analytics', 'sales@threatwatch.io', '+1-555-0106', '147 Security Way, Boston, MA', 'Threat Intelligence', 'low', 'compliant', '2023-11-01', '2025-10-31', 'SIEM and threat detection.'],
        ['DocuSign Enterprise', 'legal@docusign.com', '+1-555-0107', '258 Signature Dr, San Francisco, CA', 'Document Management', 'medium', 'compliant', '2022-04-01', '2025-03-31', 'E-signature. HIPAA compliant.'],
        ['CloudBackup Plus', 'support@cloudbackupplus.com', '+1-555-0108', '369 Storage Lane, Denver, CO', 'Backup Services', 'medium', 'non_compliant', '2021-08-01', '2024-07-31', 'CRITICAL: Security assessment overdue.'],
        ['NetworkSentry', 'info@networksentry.net', '+1-555-0109', '741 Firewall Rd, Austin, TX', 'Network Security', 'low', 'compliant', '2023-02-15', '2026-02-14', 'Firewall and network monitoring.'],
        ['AIAnalytics Corp', 'enterprise@aianalytics.ai', '+1-555-0110', '852 ML Boulevard, Palo Alto, CA', 'AI/ML Services', 'high', 'pending_review', '2023-09-01', '2025-08-31', 'AI model hosting.'],
        ['HRSecure Systems', 'privacy@hrsecure.com', '+1-555-0111', '963 Employee Way, Atlanta, GA', 'HR Software', 'medium', 'compliant', '2022-11-01', '2025-10-31', 'HRIS provider. Handles employee PII.'],
        ['AuditTrail Pro', 'compliance@audittrailpro.com', '+1-555-0112', '159 Log Street, Phoenix, AZ', 'Audit Software', 'low', 'compliant', '2023-05-01', '2026-04-30', 'Audit management platform.'],
        ['CyberInsure Ltd', 'claims@cyberinsure.com', '+44-20-9876-5432', '357 Risk Road, London, UK', 'Cyber Insurance', 'low', 'compliant', '2023-01-01', '2024-12-31', 'Cyber liability insurance provider.'],
        ['TrainingHub Online', 'enterprise@traininghub.com', '+1-555-0113', '468 Learning Lane, Miami, FL', 'Training Platform', 'low', 'compliant', '2022-08-01', '2025-07-31', 'Compliance training LMS.']
      ];

      for (const vendor of vendors) {
        await client.query(
          'INSERT INTO vendors (name, contact_email, contact_phone, address, category, risk_rating, compliance_status, contract_start, contract_end, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          vendor
        );
      }
      console.log('Seeded 15 vendors');

      // Seed Control Frameworks (15 items)
      const controlFrameworks = [
        ['NIST Cybersecurity Framework', 'Framework for improving critical infrastructure cybersecurity', 'cybersecurity', '2.0', 'active', '{"identify": ["ID.AM", "ID.BE"], "protect": ["PR.AC", "PR.AT"], "detect": ["DE.AE", "DE.CM"], "respond": ["RS.RP", "RS.CO"], "recover": ["RC.RP", "RC.IM"]}'],
        ['ISO 27001:2022', 'Information security management system standard', 'security', '2022', 'active', '{"organizational": ["A.5.1-A.5.37"], "people": ["A.6.1-A.6.8"], "physical": ["A.7.1-A.7.14"], "technological": ["A.8.1-A.8.34"]}'],
        ['SOC 2 Trust Services', 'Service organization control criteria', 'audit', '2017', 'active', '{"security": ["CC1-CC9"], "availability": ["A1"], "processing_integrity": ["PI1"], "confidentiality": ["C1"], "privacy": ["P1-P8"]}'],
        ['PCI DSS v4.0', 'Payment card industry data security standard', 'payment', '4.0', 'active', '{"requirements": ["1-12"], "sub_requirements": 400, "testing_procedures": 250}'],
        ['HIPAA Security Rule', 'Healthcare information security requirements', 'healthcare', '2013', 'active', '{"administrative": ["164.308"], "physical": ["164.310"], "technical": ["164.312"], "organizational": ["164.314-164.316"]}'],
        ['GDPR Requirements', 'EU data protection regulation requirements', 'privacy', '2018', 'active', '{"principles": ["Art.5"], "lawfulness": ["Art.6"], "rights": ["Art.12-23"], "controller": ["Art.24-31"]}'],
        ['CIS Controls v8', 'Center for Internet Security critical controls', 'security', '8.0', 'active', '{"implementation_groups": ["IG1", "IG2", "IG3"], "controls": 18, "safeguards": 153}'],
        ['COBIT 2019', 'IT governance and management framework', 'governance', '2019', 'active', '{"domains": ["EDM", "APO", "BAI", "DSS", "MEA"], "objectives": 40, "components": 7}'],
        ['ISO 27701', 'Privacy information management extension', 'privacy', '2019', 'active', '{"pii_controller": ["7.2-7.5", "8.2-8.5"], "pii_processor": ["8.2-8.5"], "additional": ["A.7", "A.8"]}'],
        ['NIST Privacy Framework', 'Privacy risk management framework', 'privacy', '1.0', 'active', '{"identify_p": ["ID.IM-P", "ID.BE-P"], "govern_p": ["GV.PO-P", "GV.RM-P"], "control_p": ["CT.DM-P", "CT.DP-P"]}'],
        ['SOX ITGC', 'IT general controls for SOX compliance', 'financial', '2024', 'active', '{"access_controls": ["Logical access", "Physical access"], "change_management": ["Program changes"], "operations": ["Backup", "Job scheduling"]}'],
        ['DORA Framework', 'Digital operational resilience requirements', 'financial', '2025', 'active', '{"ict_risk": ["Art.5-15"], "incident": ["Art.17-23"], "testing": ["Art.24-27"], "third_party": ["Art.28-44"]}'],
        ['EU AI Act Requirements', 'AI system compliance requirements', 'ai', '2024', 'active', '{"prohibited": ["Art.5"], "high_risk": ["Art.6-51"], "transparency": ["Art.52"], "general_purpose": ["Art.53-56"]}'],
        ['CCPA/CPRA Controls', 'California privacy law requirements', 'privacy', '2023', 'active', '{"consumer_rights": ["1798.100-1798.125"], "business_obligations": ["1798.130-1798.145"], "enforcement": ["1798.155-1798.199"]}'],
        ['ISO 22301', 'Business continuity management system', 'resilience', '2019', 'active', '{"context": ["4.1-4.4"], "leadership": ["5.1-5.3"], "planning": ["6.1-6.3"], "support": ["7.1-7.5"]}']
      ];

      for (const framework of controlFrameworks) {
        await client.query(
          'INSERT INTO control_frameworks (name, description, framework_type, version, status, controls) VALUES ($1, $2, $3, $4, $5, $6)',
          framework
        );
      }
      console.log('Seeded 15 control frameworks');

      // Seed Settings (15 items)
      const settings = [
        ['company_name', 'Acme Corporation', 'general', 'Company name displayed in reports'],
        ['default_risk_threshold', '70', 'risk', 'Default risk score threshold for alerts'],
        ['audit_retention_days', '2555', 'audit', 'Number of days to retain audit logs'],
        ['password_min_length', '12', 'security', 'Minimum password length requirement'],
        ['session_timeout_minutes', '30', 'security', 'Session timeout in minutes'],
        ['email_notifications', 'true', 'notifications', 'Enable email notifications'],
        ['slack_webhook_url', '', 'integrations', 'Slack webhook URL for alerts'],
        ['default_compliance_owner', '2', 'compliance', 'Default user ID for compliance assignments'],
        ['risk_assessment_frequency', '90', 'risk', 'Days between risk assessments'],
        ['vendor_review_frequency', '365', 'vendor', 'Days between vendor reviews'],
        ['training_reminder_days', '30', 'training', 'Days before training expiry to send reminder'],
        ['report_logo_url', '/assets/logo.png', 'reports', 'Logo URL for generated reports'],
        ['timezone', 'America/New_York', 'general', 'Default timezone for the application'],
        ['ai_model_preference', 'claude-haiku', 'ai', 'Preferred AI model for analysis'],
        ['data_retention_policy', '2555', 'compliance', 'Default data retention period in days']
      ];

      for (const setting of settings) {
        await client.query(
          'INSERT INTO settings (key, value, category, description, updated_by) VALUES ($1, $2, $3, $4, 1)',
          setting
        );
      }
      console.log('Seeded 15 settings');

      // =====================================================
      // SEED NEW AI FEATURE TABLES
      // =====================================================

      // Seed GDPR Scans (15 items)
      const gdprScans = [
        ['Customer Database GDPR Scan', 'full_scan', 'Customer CRM System', '{Personal Data,Contact Information,Transaction History}', 'completed', 87, '{"findings": ["Consent mechanisms adequate", "Data retention policy needs update"], "recommendations": ["Update retention schedules", "Add granular consent options"]}', 'Update data retention policies and enhance consent management.', 'Comprehensive GDPR scan shows 87% compliance. Key areas for improvement include data retention and cross-border transfers.', 2, '2024-01-15'],
        ['HR System Privacy Audit', 'privacy_audit', 'HRIS Platform', '{Employee PII,Payroll Data,Performance Reviews}', 'completed', 92, '{"findings": ["Strong access controls", "Good data minimization"], "recommendations": ["Enhance encryption for payroll data"]}', 'Enhance encryption for sensitive payroll information.', 'HR systems show strong privacy controls. Minor improvements needed for payroll data encryption.', 3, '2024-01-10'],
        ['Marketing Automation Scan', 'consent_audit', 'Marketing Platform', '{Email Addresses,Behavioral Data,Preferences}', 'in_progress', null, null, null, null, 4, null],
        ['Website Cookie Compliance', 'cookie_scan', 'Corporate Website', '{Cookies,Tracking Data,Analytics}', 'completed', 78, '{"findings": ["Cookie banner needs update", "Third-party trackers not declared"], "recommendations": ["Update cookie policy", "Add tracker disclosures"]}', 'Update cookie banner and disclose all third-party trackers.', 'Cookie compliance at 78%. Cookie banner and third-party tracker declarations need improvement.', 2, '2024-01-20'],
        ['Mobile App Privacy Scan', 'app_scan', 'iOS and Android Apps', '{Device Data,Location,Usage Analytics}', 'pending', null, null, null, null, 5, null],
        ['Partner Data Sharing Review', 'data_sharing', 'Partner Integration API', '{Shared Customer Data,Transaction Data}', 'completed', 81, '{"findings": ["DPA in place", "Data minimization could improve"], "recommendations": ["Review shared data fields", "Update DPA terms"]}', 'Review and minimize shared data fields.', 'Partner data sharing at 81% compliance. Data minimization opportunities identified.', 3, '2024-01-08'],
        ['Cloud Storage Audit', 'storage_scan', 'AWS S3 Buckets', '{Documents,Backups,Archives}', 'completed', 85, '{"findings": ["Encryption enabled", "Access logging active"], "recommendations": ["Implement lifecycle policies"]}', 'Implement data lifecycle policies for archived data.', 'Cloud storage shows good security controls. Lifecycle policies recommended.', 4, '2024-01-12'],
        ['Email System Privacy Check', 'email_scan', 'Microsoft 365', '{Email Content,Attachments,Contacts}', 'in_progress', null, null, null, null, 2, null],
        ['Customer Support Data Audit', 'support_scan', 'Zendesk Platform', '{Support Tickets,Customer Communications,Feedback}', 'completed', 79, '{"findings": ["Ticket data retention excessive", "PII in tickets not redacted"], "recommendations": ["Implement auto-redaction", "Set retention limits"]}', 'Implement auto-redaction and retention limits.', 'Support data needs attention on retention and PII handling.', 5, '2024-01-18'],
        ['Analytics Platform Review', 'analytics_scan', 'Google Analytics', '{User Behavior,Demographics,Conversions}', 'completed', 83, '{"findings": ["IP anonymization enabled", "Data sharing settings need review"], "recommendations": ["Review data sharing", "Update privacy policy"]}', 'Review and restrict data sharing settings.', 'Analytics platform mostly compliant. Data sharing configurations need review.', 3, '2024-01-05'],
        ['Payment Processing Scan', 'payment_scan', 'Stripe Integration', '{Card Details,Transaction Records,Customer IDs}', 'completed', 95, '{"findings": ["Strong PCI compliance", "Tokenization implemented"], "recommendations": ["Continue monitoring"]}', 'Continue regular monitoring and compliance reviews.', 'Payment processing highly compliant at 95%. Continue regular monitoring.', 2, '2024-01-22'],
        ['IoT Device Data Audit', 'iot_scan', 'Smart Office Devices', '{Sensor Data,Usage Patterns,Employee Movement}', 'pending', null, null, null, null, 4, null],
        ['Third-Party Script Audit', 'script_scan', 'Website Third-Party JS', '{Tracking Scripts,Ad Networks,Social Widgets}', 'completed', 72, '{"findings": ["Multiple undeclared scripts", "Some scripts collecting excess data"], "recommendations": ["Audit all scripts", "Remove unnecessary trackers"]}', 'Audit and remove unnecessary third-party scripts.', 'Third-party scripts need significant cleanup. Multiple undeclared trackers found.', 5, '2024-01-25'],
        ['Data Subject Rights Portal', 'rights_scan', 'Privacy Portal', '{DSAR Requests,Deletion Logs,Access Reports}', 'completed', 88, '{"findings": ["Response times within limits", "Tracking system adequate"], "recommendations": ["Add automated responses", "Improve self-service"]}', 'Add automated responses for common requests.', 'Rights portal performing well. Automation opportunities identified.', 2, '2024-01-14'],
        ['Vendor Data Flow Mapping', 'flow_scan', 'All Vendor Integrations', '{Vendor Data Transfers,API Data Sharing,Cross-border Flows}', 'in_progress', null, null, null, null, 3, null]
      ];

      for (const scan of gdprScans) {
        await client.query(
          'INSERT INTO gdpr_scans (scan_name, scan_type, target_system, data_categories, status, compliance_score, findings, recommendations, ai_analysis, scanned_by, scanned_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          scan
        );
      }
      console.log('Seeded 15 GDPR scans');

      // Seed Audit Schedules (15 items)
      const auditSchedules = [
        ['Annual SOX Compliance Audit', 'financial', 'annual', 'Finance', 4, '2024-06-01', '2023-06-15', 'scheduled', 'high', 'Financial reporting controls, internal controls, management certification', 'Focus on new revenue recognition controls. Consider automated testing for recurring items.', 1],
        ['Quarterly Security Assessment', 'security', 'quarterly', 'IT Security', 3, '2024-04-01', '2024-01-15', 'scheduled', 'high', 'Access controls, vulnerability management, incident response', 'Recommend adding cloud security controls to scope.', 2],
        ['Monthly Access Review', 'access', 'monthly', 'All Departments', 2, '2024-02-15', '2024-01-15', 'scheduled', 'medium', 'User access rights, privileged accounts, terminated users', 'Automate access certification for efficiency.', 3],
        ['GDPR Annual Assessment', 'privacy', 'annual', 'Legal', 5, '2024-05-25', '2023-05-25', 'scheduled', 'critical', 'Data processing activities, consent management, data subject rights', 'Include AI processing activities in scope per EU AI Act.', 1],
        ['Vendor Security Audit', 'vendor', 'semi-annual', 'Procurement', 4, '2024-03-15', '2023-09-20', 'scheduled', 'high', 'Critical vendor security assessments, SLA compliance, data handling', 'Add cloud service providers to critical vendor list.', 2],
        ['Business Continuity Test', 'resilience', 'annual', 'Operations', 5, '2024-07-01', '2023-07-10', 'scheduled', 'high', 'DR procedures, backup restoration, communication plans', 'Include ransomware scenario in testing.', 3],
        ['PCI DSS Quarterly Scan', 'compliance', 'quarterly', 'IT Infrastructure', 3, '2024-03-31', '2023-12-31', 'scheduled', 'critical', 'External vulnerability scans, ASV requirements', 'Ensure all new systems in scope.', 4],
        ['HR Policy Compliance Review', 'hr', 'annual', 'Human Resources', 2, '2024-08-01', '2023-08-15', 'scheduled', 'medium', 'Employee policies, training compliance, background checks', 'Add remote work policy compliance checks.', 5],
        ['Data Retention Audit', 'data', 'semi-annual', 'All Departments', 4, '2024-04-15', '2023-10-20', 'scheduled', 'medium', 'Retention schedules, disposal procedures, archive management', 'Review cloud storage retention settings.', 1],
        ['Incident Response Drill', 'security', 'quarterly', 'IT Security', 3, '2024-03-01', '2023-12-15', 'scheduled', 'high', 'Response procedures, communication, containment strategies', 'Include supply chain compromise scenario.', 2],
        ['Physical Security Assessment', 'physical', 'annual', 'Facilities', 4, '2024-09-01', '2023-09-10', 'scheduled', 'medium', 'Access controls, surveillance, visitor management', 'Add data center physical security review.', 3],
        ['API Security Review', 'security', 'quarterly', 'Development', 3, '2024-02-28', '2023-11-30', 'scheduled', 'high', 'API authentication, rate limiting, input validation', 'Include new mobile app APIs.', 4],
        ['Privacy Impact Assessment', 'privacy', 'as-needed', 'Legal', 2, '2024-02-15', '2024-01-10', 'in_progress', 'high', 'New processing activities, system changes, vendor integrations', 'AI system DPIAs taking priority.', 5],
        ['Cloud Security Audit', 'cloud', 'semi-annual', 'Cloud Operations', 4, '2024-05-01', '2023-11-15', 'scheduled', 'high', 'Cloud configurations, IAM policies, encryption', 'Add multi-cloud coverage.', 1],
        ['Change Management Review', 'process', 'quarterly', 'IT Operations', 3, '2024-03-15', '2023-12-20', 'scheduled', 'medium', 'Change processes, approvals, emergency changes', 'Review automated deployment pipelines.', 2]
      ];

      for (const schedule of auditSchedules) {
        await client.query(
          'INSERT INTO audit_schedules (audit_name, audit_type, frequency, department, assigned_auditor, next_audit_date, last_audit_date, status, priority, scope, ai_recommendations, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          schedule
        );
      }
      console.log('Seeded 15 audit schedules');

      // Seed Violation Predictions (15 items)
      const violationPredictions = [
        ['GDPR Consent Violation Risk', 1, 'Data Privacy', 'consent_violation', 78, 'high', '{"factors": ["Outdated consent mechanisms", "Third-party data sharing", "Cross-border transfers"]}', 'Update consent management platform, review data sharing agreements', 'High probability of consent-related violations due to complex data sharing arrangements.', 'active', 2, '2024-01-15'],
        ['CCPA Consumer Rights Delay', 2, 'Consumer Rights', 'response_delay', 65, 'medium', '{"factors": ["Manual processing", "High request volume", "Complex data systems"]}', 'Implement automated DSAR processing, improve data mapping', 'Moderate risk of exceeding 45-day response requirement.', 'active', 3, '2024-01-10'],
        ['HIPAA PHI Disclosure Risk', 3, 'Healthcare Data', 'unauthorized_disclosure', 82, 'critical', '{"factors": ["Remote work access", "Shared devices", "Email PHI"]}', 'Enhance endpoint security, implement DLP, restrict PHI email', 'Critical risk due to increased remote work and device sharing.', 'active', 4, '2024-01-20'],
        ['SOX Control Deficiency', 4, 'Financial Controls', 'control_failure', 55, 'medium', '{"factors": ["Manual processes", "Staff turnover", "System changes"]}', 'Automate key controls, enhance documentation, cross-train staff', 'Moderate risk of control deficiencies during system migration.', 'active', 5, '2024-01-08'],
        ['PCI DSS Scope Creep', 5, 'Payment Security', 'scope_violation', 70, 'high', '{"factors": ["New payment methods", "Cloud migration", "Third-party processors"]}', 'Update network segmentation, reassess scope quarterly', 'High risk of uncontrolled scope expansion with new payment channels.', 'active', 2, '2024-01-18'],
        ['AI Act High-Risk Classification', 13, 'AI Governance', 'classification_violation', 88, 'critical', '{"factors": ["Credit scoring AI", "HR screening tools", "Customer profiling"]}', 'Conduct AI system inventory, implement risk assessments', 'Critical risk with multiple high-risk AI systems requiring compliance.', 'active', 3, '2024-01-25'],
        ['Data Retention Violation', 1, 'Data Governance', 'retention_violation', 62, 'medium', '{"factors": ["Legacy systems", "Backup retention", "Archive policies"]}', 'Implement automated deletion, update retention policies', 'Moderate risk of retaining data beyond permitted periods.', 'active', 4, '2024-01-12'],
        ['Cross-Border Transfer Risk', 1, 'International Transfers', 'transfer_violation', 75, 'high', '{"factors": ["US cloud services", "Third-party processors", "Schrems II impact"]}', 'Implement SCCs, assess transfer mechanisms, consider data localization', 'High risk due to evolving international transfer requirements.', 'active', 5, '2024-01-05'],
        ['Breach Notification Failure', 1, 'Incident Response', 'notification_violation', 45, 'medium', '{"factors": ["Detection delays", "Assessment complexity", "Notification process"]}', 'Improve detection capabilities, streamline assessment process', 'Moderate risk of missing 72-hour notification window.', 'active', 2, '2024-01-22'],
        ['Training Compliance Gap', 3, 'Training', 'training_violation', 58, 'medium', '{"factors": ["New hires", "Role changes", "Annual renewals"]}', 'Automate training assignments, implement reminders', 'Moderate risk of training compliance gaps in growing workforce.', 'active', 3, '2024-01-14'],
        ['Vendor Due Diligence Gap', 1, 'Third Party Risk', 'vendor_violation', 72, 'high', '{"factors": ["New vendors", "Contract renewals", "Risk reassessment"]}', 'Enhance vendor vetting, implement continuous monitoring', 'High risk due to rapid vendor onboarding.', 'active', 4, '2024-01-28'],
        ['Access Control Violation', 6, 'Access Management', 'access_violation', 68, 'high', '{"factors": ["Orphan accounts", "Excessive privileges", "Review delays"]}', 'Implement automated provisioning, enhance access reviews', 'High risk of unauthorized access due to access management gaps.', 'active', 5, '2024-01-16'],
        ['Cookie Compliance Violation', 1, 'Cookie/Tracking', 'cookie_violation', 80, 'high', '{"factors": ["Third-party scripts", "Consent implementation", "Technical tracking"]}', 'Audit tracking technologies, update consent mechanism', 'High risk of cookie compliance violations.', 'active', 2, '2024-01-30'],
        ['Documentation Deficiency', 1, 'Documentation', 'documentation_violation', 52, 'low', '{"factors": ["Policy updates", "Process changes", "Staff turnover"]}', 'Implement documentation management, regular reviews', 'Low-moderate risk of documentation deficiencies.', 'active', 3, '2024-01-07'],
        ['Privacy Notice Violation', 2, 'Transparency', 'notice_violation', 63, 'medium', '{"factors": ["New processing", "Third-party sharing", "Policy updates"]}', 'Review and update privacy notices, add new disclosures', 'Moderate risk of outdated or incomplete privacy notices.', 'active', 4, '2024-01-19']
      ];

      for (const prediction of violationPredictions) {
        await client.query(
          'INSERT INTO violation_predictions (prediction_name, regulation_id, risk_area, predicted_violation_type, probability_score, impact_level, contributing_factors, preventive_measures, ai_analysis, status, predicted_by, prediction_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          prediction
        );
      }
      console.log('Seeded 15 violation predictions');

      // Seed Training Progress (15 items)
      const trainingProgress = [
        [1, 'Annual Compliance Certification', 'Executive', 5, 5, 95, 'Compliant', '2024-12-31', 'Excellent completion rate. Consider advanced leadership compliance training.', '{"gaps": []}', 'Executive Communication Training'],
        [2, 'GDPR Specialist Program', 'Compliance', 8, 7, 88, 'In Progress', '2024-06-30', 'On track. Focus on cross-border transfer module next.', '{"gaps": ["International Transfers", "SCCs"]}', 'GDPR Advanced: International Transfers'],
        [3, 'Security Analyst Certification', 'IT Security', 10, 6, 72, 'At Risk', '2024-03-31', 'Behind schedule. Prioritize cloud security and incident response modules.', '{"gaps": ["Cloud Security", "Incident Response", "Threat Hunting"]}', 'Cloud Security Fundamentals'],
        [4, 'SOX Compliance Training', 'Finance', 6, 6, 90, 'Compliant', '2024-09-30', 'Completed ahead of schedule. Ready for advanced internal controls.', '{"gaps": []}', 'Advanced Internal Controls'],
        [5, 'Risk Management Professional', 'Risk Management', 7, 4, 65, 'At Risk', '2024-04-30', 'Needs attention. Focus on quantitative risk assessment.', '{"gaps": ["Quantitative Analysis", "Risk Modeling", "Scenario Planning"]}', 'Quantitative Risk Assessment'],
        [6, 'Privacy Professional Certification', 'Legal', 9, 8, 85, 'In Progress', '2024-07-31', 'Good progress. AI privacy module recommended.', '{"gaps": ["AI Privacy"]}', 'AI and Privacy Fundamentals'],
        [7, 'Information Security Basics', 'All Staff', 4, 3, 75, 'In Progress', '2024-02-28', 'Average progress. Phishing awareness needs reinforcement.', '{"gaps": ["Phishing Prevention"]}', 'Advanced Phishing Awareness'],
        [8, 'HIPAA Compliance Program', 'Healthcare Operations', 6, 5, 82, 'In Progress', '2024-05-31', 'On track. PHI handling module next.', '{"gaps": ["PHI Handling"]}', 'PHI Security Best Practices'],
        [9, 'Audit Professional Development', 'Internal Audit', 8, 8, 92, 'Compliant', '2024-08-31', 'Excellent progress. Ready for advanced audit techniques.', '{"gaps": []}', 'Data Analytics for Auditors'],
        [10, 'Vendor Management Training', 'Procurement', 5, 2, 40, 'Non-Compliant', '2024-01-31', 'Significantly behind. Immediate focus required.', '{"gaps": ["Vendor Assessment", "Contract Review", "Risk Monitoring"]}', 'Vendor Security Assessment'],
        [11, 'Data Protection Basics', 'Customer Service', 4, 4, 88, 'Compliant', '2024-03-31', 'Completed. Consider advanced customer data handling.', '{"gaps": []}', 'Advanced Customer Data Handling'],
        [12, 'Cloud Security Training', 'DevOps', 7, 5, 70, 'At Risk', '2024-04-15', 'Behind schedule. Prioritize container security.', '{"gaps": ["Container Security", "Kubernetes Security"]}', 'Container Security Essentials'],
        [13, 'Incident Response Training', 'IT Operations', 6, 4, 68, 'At Risk', '2024-03-15', 'Needs improvement. Focus on forensics and communication.', '{"gaps": ["Digital Forensics", "Crisis Communication"]}', 'Digital Forensics Fundamentals'],
        [14, 'AI Ethics and Compliance', 'Data Science', 5, 3, 60, 'At Risk', '2024-05-31', 'New program. Prioritize bias detection and transparency.', '{"gaps": ["Bias Detection", "Model Transparency"]}', 'AI Bias Detection and Mitigation'],
        [15, 'Business Continuity Training', 'All Managers', 4, 2, 50, 'At Risk', '2024-02-28', 'Behind schedule. Focus on crisis management.', '{"gaps": ["Crisis Management", "Communication Plans"]}', 'Crisis Management Fundamentals']
      ];

      for (const progress of trainingProgress) {
        await client.query(
          'INSERT INTO training_progress (employee_id, training_program, department, required_courses, completed_courses, overall_score, compliance_status, due_date, ai_recommendations, skill_gaps, next_training) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          progress
        );
      }
      console.log('Seeded 15 training progress records');

      // Seed Privacy Policies (15 items)
      const privacyPolicies = [
        ['Website Privacy Policy', 'general', 'Global', 'Website Visitors', 'Comprehensive privacy policy covering all website data collection...', '{Personal Information,Contact Details,Usage Data,Cookies}', '{Consent,Contract,Legitimate Interest}', '3 years for users, 1 year for visitors', 'Analytics providers, advertising partners, payment processors', 'Access, rectification, erasure, portability, objection', 'active', true, '3.0', '2024-01-01', '2025-01-01', 1],
        ['Mobile App Privacy Policy', 'app', 'Global', 'App Users', 'Privacy policy for iOS and Android applications...', '{Device Data,Location,Usage Analytics,Account Information}', '{Consent,Contract}', '2 years after account deletion', 'Push notification services, analytics, crash reporting', 'Access, deletion, data portability, opt-out', 'active', true, '2.5', '2024-01-15', '2025-01-15', 2],
        ['Employee Privacy Notice', 'employee', 'US/EU', 'Employees', 'Privacy notice for employee data processing...', '{Employment Data,Payroll,Benefits,Performance}', '{Contract,Legal Obligation,Legitimate Interest}', 'Duration of employment + 7 years', 'Payroll providers, benefits administrators, background check services', 'Access, rectification, data portability', 'active', false, '2.0', '2023-06-01', '2024-06-01', 3],
        ['Customer Privacy Policy', 'customer', 'Global', 'Customers', 'Privacy policy for customer relationship management...', '{Contact Information,Purchase History,Preferences,Support Tickets}', '{Contract,Consent,Legitimate Interest}', '5 years after last purchase', 'CRM providers, email services, support platforms', 'Access, rectification, erasure, restriction, portability', 'active', true, '2.8', '2024-02-01', '2025-02-01', 1],
        ['B2B Partner Privacy Policy', 'b2b', 'Global', 'Business Partners', 'Privacy policy for business partner data...', '{Business Contact Information,Contract Details,Communication Records}', '{Contract,Legitimate Interest}', 'Duration of partnership + 3 years', 'Contract management, communication tools', 'Access, rectification, restriction', 'active', false, '1.5', '2023-09-01', '2024-09-01', 4],
        ['Marketing Privacy Policy', 'marketing', 'Global', 'Marketing Contacts', 'Privacy policy for marketing activities...', '{Email Addresses,Preferences,Engagement Data,Demographics}', '{Consent}', 'Until consent withdrawal + 30 days', 'Email platforms, advertising networks, analytics', 'Unsubscribe, access, deletion, objection', 'active', true, '2.2', '2024-01-20', '2025-01-20', 2],
        ['Recruitment Privacy Notice', 'recruitment', 'US/EU', 'Job Applicants', 'Privacy notice for recruitment process...', '{CV Data,Interview Notes,References,Background Checks}', '{Consent,Legitimate Interest}', '1 year for unsuccessful, duration of employment for hired', 'ATS providers, background check services', 'Access, rectification, erasure, restriction', 'active', true, '1.8', '2023-11-01', '2024-11-01', 5],
        ['Children Privacy Policy', 'coppa', 'US', 'Children Under 13', 'COPPA-compliant privacy policy for children...', '{Account Information,Usage Data}', '{Parental Consent}', 'Until parental deletion request', 'None without parental consent', 'Parental access, deletion, restriction', 'active', true, '1.5', '2024-01-10', '2025-01-10', 3],
        ['California Privacy Notice', 'ccpa', 'California', 'California Residents', 'CCPA/CPRA-specific privacy disclosures...', '{All personal information categories}', '{Contract,Consent,Legal Obligation}', 'As specified in main policy', 'As disclosed in main policy', 'Know, delete, opt-out, correct, limit', 'active', true, '2.0', '2024-01-01', '2025-01-01', 1],
        ['EU Privacy Policy', 'gdpr', 'European Union', 'EU Residents', 'GDPR-compliant privacy policy for EU...', '{All personal data categories}', '{Art. 6 bases as applicable}', 'As per retention schedule', 'List of processors with safeguards', 'All GDPR rights', 'active', true, '3.0', '2024-02-15', '2025-02-15', 4],
        ['Cookie Policy', 'cookies', 'Global', 'Website Visitors', 'Detailed cookie and tracking policy...', '{Cookie Data,Device Identifiers,Browsing Behavior}', '{Consent for non-essential}', 'As per cookie expiration', 'Analytics, advertising, social media', 'Consent management, deletion', 'active', true, '2.5', '2024-01-25', '2025-01-25', 2],
        ['IoT Device Privacy Policy', 'iot', 'Global', 'Device Users', 'Privacy policy for IoT devices...', '{Device Data,Usage Patterns,Environmental Data}', '{Consent,Contract}', '2 years after device deactivation', 'Cloud services, analytics', 'Access, deletion, data portability', 'draft', true, '1.0', '2024-03-01', '2025-03-01', 5],
        ['AI/ML Data Processing Notice', 'ai', 'Global', 'AI System Users', 'Notice for AI/ML data processing...', '{Training Data,Model Inputs,Inference Data}', '{Consent,Legitimate Interest}', 'Model lifecycle + 2 years', 'AI service providers', 'Explanation, human review, objection', 'draft', true, '1.0', '2024-02-01', '2025-02-01', 3],
        ['Healthcare Privacy Policy', 'hipaa', 'US', 'Patients', 'HIPAA-compliant privacy practices...', '{PHI,Medical Records,Insurance Data}', '{Treatment,Payment,Operations}', '6 years from creation', 'Healthcare providers, insurers, as required by law', 'Access, amendment, accounting of disclosures', 'active', false, '2.0', '2023-08-01', '2024-08-01', 1],
        ['Financial Services Privacy Policy', 'financial', 'US', 'Financial Customers', 'GLBA-compliant privacy notice...', '{Financial Data,Account Information,Transaction History}', '{Contract,Legal Obligation}', '7 years per regulations', 'As required for services', 'Opt-out of sharing, access', 'active', false, '1.8', '2023-10-01', '2024-10-01', 4]
      ];

      for (const policy of privacyPolicies) {
        await client.query(
          'INSERT INTO privacy_policies (policy_name, policy_type, jurisdiction, target_audience, content, data_collected, legal_bases, retention_periods, third_party_sharing, user_rights, status, ai_generated, version, effective_date, review_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
          policy
        );
      }
      console.log('Seeded 15 privacy policies');

      // Seed Compliance Checks Legal (15 items)
      const complianceChecksLegal = [
        ['GDPR Article 30 Records Assessment', 'documentation', 1, 'European Union', 'Data Protection', 'Compliant', 88, '{"gaps": [{"area": "Processor records", "severity": "medium", "description": "Some processor agreements missing from records"}]}', 'Minor documentation gaps. Low legal risk.', 'Update processor records, implement automated tracking', 'Comprehensive assessment shows strong compliance with minor gaps.', 'Data processing inventory reviewed', 2, '2024-01-15', '2024-07-15'],
        ['CCPA Opt-Out Mechanism Review', 'consumer_rights', 2, 'California', 'Marketing', 'Partially Compliant', 72, '{"gaps": [{"area": "Do Not Sell link", "severity": "high", "description": "Link not prominent on all pages"}]}', 'Potential enforcement action risk. Address promptly.', 'Add prominent opt-out link to all pages, update footer', 'Opt-out mechanism needs visibility improvements.', 'Website and app reviewed', 3, '2024-01-10', '2024-04-10'],
        ['HIPAA Business Associate Agreements', 'contracts', 3, 'United States', 'Legal', 'Compliant', 95, '{"gaps": []}', 'Low risk. All BAAs current and compliant.', 'Continue annual review process', 'All business associate agreements compliant.', '15 BAAs reviewed', 4, '2024-01-20', '2025-01-20'],
        ['SOX Section 404 Control Assessment', 'internal_controls', 4, 'United States', 'Finance', 'Compliant', 90, '{"gaps": [{"area": "Segregation of duties", "severity": "low", "description": "Minor SoD conflicts in test environment"}]}', 'Minimal risk. Test environment controls noted.', 'Address test environment SoD, document compensating controls', 'Strong internal control environment.', 'All key controls tested', 5, '2024-01-08', '2024-07-08'],
        ['PCI DSS Self-Assessment', 'security', 5, 'Global', 'IT Security', 'Compliant', 92, '{"gaps": [{"area": "Encryption key management", "severity": "medium", "description": "Key rotation schedule needs formalization"}]}', 'Low risk. Formalize key management procedures.', 'Document key rotation procedures, implement automation', 'Strong PCI compliance with minor procedural gaps.', 'SAQ-D completed', 2, '2024-01-18', '2024-04-18'],
        ['GDPR Data Subject Rights Process', 'consumer_rights', 1, 'European Union', 'Customer Service', 'Partially Compliant', 78, '{"gaps": [{"area": "Response time", "severity": "high", "description": "Some requests exceeding 30-day limit"}]}', 'Risk of complaints. Improve process efficiency.', 'Implement automated tracking, add resources', 'Data subject rights process needs efficiency improvements.', '50 DSARs reviewed', 3, '2024-01-25', '2024-04-25'],
        ['AI Act High-Risk Assessment', 'ai_compliance', 13, 'European Union', 'Data Science', 'Non-Compliant', 45, '{"gaps": [{"area": "Risk assessment", "severity": "critical", "description": "No formal AI risk assessments conducted"}, {"area": "Documentation", "severity": "high", "description": "AI system documentation incomplete"}]}', 'High risk. Immediate action required for AI compliance.', 'Conduct AI system inventory, implement risk assessments, create documentation', 'Significant gaps in AI Act compliance preparation.', 'Initial assessment', 4, '2024-01-30', '2024-03-30'],
        ['GLBA Privacy Notice Review', 'privacy', 8, 'United States', 'Compliance', 'Compliant', 85, '{"gaps": [{"area": "Annual notice", "severity": "low", "description": "Consider adding opt-out reminder"}]}', 'Low risk. Minor enhancement opportunity.', 'Add opt-out reminder to annual notice', 'Privacy notices compliant with minor enhancement opportunity.', 'All notices reviewed', 5, '2024-01-12', '2025-01-12'],
        ['FERPA Directory Information Compliance', 'education', 9, 'United States', 'Academic Affairs', 'Compliant', 91, '{"gaps": []}', 'Low risk. Strong compliance with FERPA requirements.', 'Continue current practices, annual review', 'Directory information handling fully compliant.', 'Policies and procedures reviewed', 2, '2024-01-05', '2025-01-05'],
        ['COPPA Parental Consent Mechanism', 'children', 10, 'United States', 'Product', 'Partially Compliant', 75, '{"gaps": [{"area": "Consent verification", "severity": "high", "description": "Verification method needs strengthening"}]}', 'Moderate risk. FTC focus area. Strengthen verification.', 'Implement enhanced parental verification', 'Parental consent mechanism needs strengthening.', 'App consent flow reviewed', 3, '2024-01-22', '2024-04-22'],
        ['DORA ICT Third-Party Review', 'vendor', 11, 'European Union', 'IT Operations', 'Partially Compliant', 68, '{"gaps": [{"area": "Critical provider register", "severity": "high", "description": "Register incomplete"}, {"area": "Exit strategies", "severity": "medium", "description": "Exit plans not documented"}]}', 'Moderate risk. Key DORA requirements not met.', 'Complete critical provider register, document exit strategies', 'Gaps in DORA ICT third-party requirements.', 'Vendor contracts reviewed', 4, '2024-01-28', '2024-04-28'],
        ['NIS2 Incident Reporting Assessment', 'incident', 12, 'European Union', 'IT Security', 'Partially Compliant', 70, '{"gaps": [{"area": "24-hour notification", "severity": "high", "description": "Process may not meet 24-hour requirement"}]}', 'Moderate risk. Incident reporting process needs improvement.', 'Streamline incident assessment, automate notifications', 'Incident reporting process may not meet NIS2 timelines.', 'Incident response procedures reviewed', 5, '2024-01-16', '2024-04-16'],
        ['CPRA Sensitive Data Classification', 'data_governance', 14, 'California', 'Data Governance', 'Partially Compliant', 73, '{"gaps": [{"area": "Sensitive data inventory", "severity": "high", "description": "Incomplete sensitive data mapping"}]}', 'Moderate risk. Complete sensitive data inventory.', 'Map all sensitive data categories, implement controls', 'Sensitive data classification needs completion.', 'Data inventory reviewed', 2, '2024-01-14', '2024-04-14'],
        ['ISO 27001 Gap Assessment', 'security', 6, 'Global', 'IT Security', 'Partially Compliant', 82, '{"gaps": [{"area": "Annex A.8", "severity": "medium", "description": "Some technological controls need enhancement"}]}', 'Low-moderate risk. Address before certification audit.', 'Enhance technological controls per Annex A.8', 'Good progress toward ISO 27001 certification.', 'Full controls review', 3, '2024-01-19', '2024-07-19'],
        ['Cross-Border Transfer Assessment', 'transfers', 1, 'Global', 'Legal', 'Partially Compliant', 76, '{"gaps": [{"area": "TIA documentation", "severity": "high", "description": "Transfer impact assessments incomplete"}]}', 'Moderate risk. Complete TIAs for US transfers.', 'Complete transfer impact assessments, review SCCs', 'Transfer mechanisms need strengthening.', 'All transfers mapped', 4, '2024-01-07', '2024-04-07']
      ];

      for (const check of complianceChecksLegal) {
        await client.query(
          'INSERT INTO compliance_checks_legal (check_name, check_type, regulation_id, jurisdiction, department, compliance_status, compliance_score, gaps_identified, legal_risks, recommendations, ai_analysis, evidence_collected, checked_by, check_date, next_review_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
          check
        );
      }
      console.log('Seeded 15 legal compliance checks');

      // Seed AI Analysis History (15 items)
      const aiAnalysisHistory = [
        ['gdpr_scan', 'Customer Database GDPR Scan', 'Compliance Score: 87%. Strong data protection controls with minor improvements needed.', 'anthropic/claude-haiku-4.5', 1250, 2],
        ['violation_prediction', 'GDPR Consent Violation Risk Analysis', 'High probability (78%) of consent-related violations. Immediate action recommended.', 'anthropic/claude-haiku-4.5', 890, 3],
        ['privacy_policy_generation', 'Website Privacy Policy Generation', 'Generated comprehensive privacy policy covering GDPR, CCPA, and global requirements.', 'anthropic/claude-haiku-4.5', 2100, 1],
        ['training_analysis', 'Security Analyst Training Progress', 'At risk status. Prioritize cloud security and incident response training modules.', 'anthropic/claude-haiku-4.5', 750, 4],
        ['audit_schedule', 'Annual SOX Compliance Audit Planning', 'Recommended focus on new revenue recognition controls and automated testing.', 'anthropic/claude-haiku-4.5', 820, 5],
        ['legal_compliance_check', 'AI Act High-Risk Assessment', 'Non-compliant status. Critical gaps in AI system documentation and risk assessments.', 'anthropic/claude-haiku-4.5', 1100, 2],
        ['policy_generation', 'Data Protection Policy Update', 'Generated updated policy incorporating AI processing and cross-border requirements.', 'anthropic/claude-haiku-4.5', 1800, 3],
        ['risk_assessment', 'Third-Party Data Breach Risk Analysis', 'Risk Score: 85. High correlation between vendor access and breach likelihood.', 'anthropic/claude-haiku-4.5', 950, 4],
        ['gdpr_scan', 'Marketing Automation Privacy Scan', 'In progress. Initial findings indicate consent mechanism updates needed.', 'anthropic/claude-haiku-4.5', 680, 5],
        ['compliance_report', 'Q4 Executive Compliance Summary', 'Generated board-level report with risk trends and recommended actions.', 'anthropic/claude-haiku-4.5', 1500, 1],
        ['incident_analysis', 'Data Leak Investigation Analysis', 'Critical severity. Document contained confidential data. Containment recommended.', 'anthropic/claude-haiku-4.5', 720, 2],
        ['vendor_assessment', 'Payment Processor Security Assessment', 'Low risk rating. Strong PCI DSS compliance and security controls.', 'anthropic/claude-haiku-4.5', 850, 3],
        ['training_content', 'GDPR Advanced Training Module', 'Generated training content on international transfers and SCCs.', 'anthropic/claude-haiku-4.5', 1650, 4],
        ['regulation_explanation', 'EU AI Act Requirements Summary', 'Comprehensive explanation of high-risk AI system requirements.', 'anthropic/claude-haiku-4.5', 920, 5],
        ['compliance_gap', 'NIS2 Incident Reporting Gap Analysis', 'Gap analysis showing 24-hour notification process needs improvement.', 'anthropic/claude-haiku-4.5', 780, 2]
      ];

      for (const analysis of aiAnalysisHistory) {
        await client.query(
          'INSERT INTO ai_analysis_history (analysis_type, input_data, output_data, model_used, tokens_used, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
          analysis
        );
      }
      console.log('Seeded 15 AI analysis history entries');

      await client.query('COMMIT');
      console.log('\n========================================');
      console.log('Database seeding completed successfully!');
      console.log('========================================');
      console.log('\nLogin credentials:');
      console.log('  Email:    admin@compliance.com');
      console.log('  Password: password123');
      console.log('\nSeeded data summary:');
      console.log('  - 15 Users');
      console.log('  - 15 Regulations');
      console.log('  - 15 Compliance Checks');
      console.log('  - 15 Audit Trail entries');
      console.log('  - 15 Policies');
      console.log('  - 15 Risk Assessments');
      console.log('  - 15 Documents');
      console.log('  - 15 Alerts');
      console.log('  - 15 Reports');
      console.log('  - 15 Training Records');
      console.log('  - 15 Incidents');
      console.log('  - 15 Vendors');
      console.log('  - 15 Control Frameworks');
      console.log('  - 15 Settings');
      console.log('  - 15 GDPR Scans (NEW)');
      console.log('  - 15 Audit Schedules (NEW)');
      console.log('  - 15 Violation Predictions (NEW)');
      console.log('  - 15 Training Progress (NEW)');
      console.log('  - 15 Privacy Policies (NEW)');
      console.log('  - 15 Legal Compliance Checks (NEW)');
      console.log('  - 15 AI Analysis History');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seedDatabase();
