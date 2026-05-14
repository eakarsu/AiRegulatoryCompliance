import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Regulations from './pages/Regulations';
import Compliance from './pages/Compliance';
import Risks from './pages/Risks';
import Policies from './pages/Policies';
import Documents from './pages/Documents';
import Incidents from './pages/Incidents';
import Vendors from './pages/Vendors';
import AuditTrail from './pages/AuditTrail';
import Reports from './pages/Reports';
import Training from './pages/Training';
import Alerts from './pages/Alerts';
import Frameworks from './pages/Frameworks';
import Settings from './pages/Settings';
import Users from './pages/Users';
import AIAssistant from './pages/AIAssistant';

// NEW AI Feature Pages
import GDPRScanner from './pages/GDPRScanner';
import AuditScheduler from './pages/AuditScheduler';
import ViolationPredictor from './pages/ViolationPredictor';
import TrainingTracker from './pages/TrainingTracker';
import PrivacyPolicyGenerator from './pages/PrivacyPolicyGenerator';
import ComplianceChecker from './pages/ComplianceChecker';
import ComplianceGapFinder from './pages/ComplianceGapFinder';
import VendorRiskScorer from './pages/VendorRiskScorer';
import RemediationPlanner from './pages/RemediationPlanner';
import PolicyConflictDetector from './pages/PolicyConflictDetector';
import ControlEffectivenessAssessment from './pages/ControlEffectivenessAssessment';
import BoardReadinessReport from './pages/BoardReadinessReport';

// Components
import Layout from './components/Layout';
import Profile from './pages/Profile';

// === Batch 07 Gaps & Frontend Mounts ===
import CfContinuousComplianceMonitoring from './pages/CfContinuousComplianceMonitoring';
import CfRemediationWorkflowAutomation from './pages/CfRemediationWorkflowAutomation';
import CfAigeneratedAuditDocumentation from './pages/CfAigeneratedAuditDocumentation';
import CfPolicytocontrolMapping from './pages/CfPolicytocontrolMapping';
import CfThirdpartyComplianceExchange from './pages/CfThirdpartyComplianceExchange';
import CfBoardreadyExecutiveDashboards from './pages/CfBoardreadyExecutiveDashboards';
import GapNoCompliancegapfinderAgainstSelectedFram from './pages/GapNoCompliancegapfinderAgainstSelectedFram';
import GapNoVendorriskscorerThirdpartyRiskAi from './pages/GapNoVendorriskscorerThirdpartyRiskAi';
import GapNoPolicyconflictdetectorCrosspolicyContra from './pages/GapNoPolicyconflictdetectorCrosspolicyContra';
import GapNoControleffectivenessassessment from './pages/GapNoControleffectivenessassessment';
import GapNoRemediationplannerAi from './pages/GapNoRemediationplannerAi';
import GapNoBoardreadinessreportExecSummary from './pages/GapNoBoardreadinessreportExecSummary';
import GapLimitedWorkflowAutomationActionAssignmen from './pages/GapLimitedWorkflowAutomationActionAssignmen';
import GapNoDlpcasbIntegrations from './pages/GapNoDlpcasbIntegrations';
import GapNoPolicyVersionControlApprovalWorkflow from './pages/GapNoPolicyVersionControlApprovalWorkflow';
import GapNoComplianceCalendarAutotrackRegulatory from './pages/GapNoComplianceCalendarAutotrackRegulatory';
import GapNoIncidentResponsePlaybooks from './pages/GapNoIncidentResponsePlaybooks';
import GapNoPublicWebhookForSiemIngestion from './pages/GapNoPublicWebhookForSiemIngestion';
import GapNoEsignatureIntegrationForAttestations from './pages/GapNoEsignatureIntegrationForAttestations';
// === End Batch 07 ===


const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/regulations" element={<Regulations />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/risks" element={<Risks />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/training" element={<Training />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/frameworks" element={<Frameworks />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />

                {/* AI Feature Routes */}
                <Route path="/gdpr-scanner" element={<GDPRScanner />} />
                <Route path="/audit-scheduler" element={<AuditScheduler />} />
                <Route path="/violation-predictor" element={<ViolationPredictor />} />
                <Route path="/training-tracker" element={<TrainingTracker />} />
                <Route path="/privacy-policy-generator" element={<PrivacyPolicyGenerator />} />
                <Route path="/compliance-checker" element={<ComplianceChecker />} />
                <Route path="/compliance-gap-finder" element={<ComplianceGapFinder />} />
                <Route path="/vendor-risk-scorer" element={<VendorRiskScorer />} />
                <Route path="/remediation-planner" element={<RemediationPlanner />} />
                <Route path="/policy-conflict-detector" element={<PolicyConflictDetector />} />
                <Route path="/control-effectiveness-assessment" element={<ControlEffectivenessAssessment />} />
                <Route path="/board-readiness-report" element={<BoardReadinessReport />} />
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-continuous-compliance-monitoring' element={<CfContinuousComplianceMonitoring />} />
          <Route path='/cf-remediation-workflow-automation' element={<CfRemediationWorkflowAutomation />} />
          <Route path='/cf-aigenerated-audit-documentation' element={<CfAigeneratedAuditDocumentation />} />
          <Route path='/cf-policytocontrol-mapping' element={<CfPolicytocontrolMapping />} />
          <Route path='/cf-thirdparty-compliance-exchange' element={<CfThirdpartyComplianceExchange />} />
          <Route path='/cf-boardready-executive-dashboards' element={<CfBoardreadyExecutiveDashboards />} />
          <Route path='/gap-no-compliancegapfinder-against-selected-fram' element={<GapNoCompliancegapfinderAgainstSelectedFram />} />
          <Route path='/gap-no-vendorriskscorer-thirdparty-risk-ai' element={<GapNoVendorriskscorerThirdpartyRiskAi />} />
          <Route path='/gap-no-policyconflictdetector-crosspolicy-contra' element={<GapNoPolicyconflictdetectorCrosspolicyContra />} />
          <Route path='/gap-no-controleffectivenessassessment' element={<GapNoControleffectivenessassessment />} />
          <Route path='/gap-no-remediationplanner-ai' element={<GapNoRemediationplannerAi />} />
          <Route path='/gap-no-boardreadinessreport-exec-summary' element={<GapNoBoardreadinessreportExecSummary />} />
          <Route path='/gap-limited-workflow-automation-action-assignmen' element={<GapLimitedWorkflowAutomationActionAssignmen />} />
          <Route path='/gap-no-dlpcasb-integrations' element={<GapNoDlpcasbIntegrations />} />
          <Route path='/gap-no-policy-version-control-approval-workflow' element={<GapNoPolicyVersionControlApprovalWorkflow />} />
          <Route path='/gap-no-compliance-calendar-autotrack-regulatory' element={<GapNoComplianceCalendarAutotrackRegulatory />} />
          <Route path='/gap-no-incident-response-playbooks' element={<GapNoIncidentResponsePlaybooks />} />
          <Route path='/gap-no-public-webhook-for-siem-ingestion' element={<GapNoPublicWebhookForSiemIngestion />} />
          <Route path='/gap-no-esignature-integration-for-attestations' element={<GapNoEsignatureIntegrationForAttestations />} />
          // === End Batch 07 ===
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
