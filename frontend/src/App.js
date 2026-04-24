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

// Components
import Layout from './components/Layout';
import Profile from './pages/Profile';

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
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
