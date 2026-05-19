import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  BookOpen,
  FolderOpen,
  AlertCircle,
  Building2,
  History,
  BarChart3,
  GraduationCap,
  Bell,
  Shield,
  Settings,
  Users,
  Bot,
  LogOut,
  Scan,
  Calendar,
  TrendingUp,
  BookMarked,
  FileCheck,
  Scale,
  Sparkles,
  LineChart
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const mainNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/regulations', icon: FileText, label: 'Regulations' },
    { to: '/compliance', icon: ClipboardCheck, label: 'Compliance' },
    { to: '/risks', icon: AlertTriangle, label: 'Risk Assessment' },
    { to: '/policies', icon: BookOpen, label: 'Policies' },
    { to: '/documents', icon: FolderOpen, label: 'Documents' },
    { to: '/incidents', icon: AlertCircle, label: 'Incidents' },
    { to: '/vendors', icon: Building2, label: 'Vendors' },
  ];

  const aiFeatureNavItems = [
    { to: '/gdpr-scanner', icon: Scan, label: 'AI GDPR Scanner' },
    { to: '/audit-scheduler', icon: Calendar, label: 'AI Audit Scheduler' },
    { to: '/violation-predictor', icon: TrendingUp, label: 'AI Violation Predictor' },
    { to: '/training-tracker', icon: BookMarked, label: 'AI Training Tracker' },
    { to: '/privacy-policy-generator', icon: FileCheck, label: 'AI Privacy Policy' },
    { to: '/compliance-checker', icon: Scale, label: 'AI Compliance Checker' },
    { to: '/policy-conflict-detector', icon: Scale, label: 'AI Policy Conflict Detector' },
    { to: '/control-effectiveness-assessment', icon: ClipboardCheck, label: 'AI Control Effectiveness' },
    { to: '/board-readiness-report', icon: BarChart3, label: 'AI Board Readiness' },
    { to: '/custom-views', icon: LineChart, label: 'Compliance Views' },
  ];

  const secondaryNavItems = [
    { to: '/audit', icon: History, label: 'Audit Trail' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/training', icon: GraduationCap, label: 'Training' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/frameworks', icon: Shield, label: 'Frameworks' },
  ];

  const adminNavItems = [
    { to: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Compliance AI</h1>
          <p>Regulatory Management</p>
        </div>

        <nav>
          <ul className="sidebar-nav">
            {mainNavItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <Sparkles size={14} />
              AI Features
            </div>
            <ul className="sidebar-nav ai-features">
              {aiFeatureNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Operations</div>
            <ul className="sidebar-nav">
              {secondaryNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Administration</div>
            <ul className="sidebar-nav">
              {adminNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <ul className="sidebar-nav">
              <li>
                <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                  <LogOut size={20} />
                  <span>Logout</span>
                </a>
              </li>
            </ul>
            <div style={{ padding: '0 20px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
