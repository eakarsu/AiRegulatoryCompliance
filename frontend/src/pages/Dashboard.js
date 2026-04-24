import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ClipboardCheck,
  AlertTriangle,
  AlertCircle,
  Building2,
  Bell,
  BookOpen,
  FolderOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Scan,
  Calendar,
  BookMarked,
  FileCheck,
  Scale,
  Sparkles
} from 'lucide-react';
import { dashboardAPI } from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getSummary();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Regulations',
      value: data?.regulations?.total || 0,
      icon: FileText,
      color: 'blue',
      path: '/regulations',
      footer: 'Active regulatory frameworks'
    },
    {
      title: 'Compliance Checks',
      value: data?.compliance?.total || 0,
      icon: ClipboardCheck,
      color: 'green',
      path: '/compliance',
      footer: `${data?.compliance?.completed || 0} completed, ${data?.compliance?.overdue || 0} overdue`
    },
    {
      title: 'Risk Assessments',
      value: data?.risks?.total || 0,
      icon: AlertTriangle,
      color: 'yellow',
      path: '/risks',
      footer: `Avg score: ${data?.risks?.average_score || 0}%`
    },
    {
      title: 'Open Incidents',
      value: data?.incidents?.open || 0,
      icon: AlertCircle,
      color: 'red',
      path: '/incidents',
      footer: `${data?.incidents?.critical_high || 0} critical/high severity`
    },
    {
      title: 'Vendors',
      value: data?.vendors?.total || 0,
      icon: Building2,
      color: 'purple',
      path: '/vendors',
      footer: `${data?.vendors?.compliant || 0} compliant, ${data?.vendors?.high_risk || 0} high risk`
    },
    {
      title: 'Active Alerts',
      value: data?.alerts?.active || 0,
      icon: Bell,
      color: 'indigo',
      path: '/alerts',
      footer: `${data?.alerts?.critical || 0} critical`
    },
    {
      title: 'Policies',
      value: data?.policies?.total || 0,
      icon: BookOpen,
      color: 'blue',
      path: '/policies',
      footer: `${data?.policies?.needs_review || 0} need review`
    },
    {
      title: 'Documents',
      value: data?.documents?.total || 0,
      icon: FolderOpen,
      color: 'green',
      path: '/documents',
      footer: `${data?.documents?.pending || 0} pending review`
    },
    {
      title: 'Training',
      value: `${data?.training?.average_score || 0}%`,
      icon: GraduationCap,
      color: 'yellow',
      path: '/training',
      footer: `${data?.training?.completed || 0}/${data?.training?.total || 0} completed`
    }
  ];

  const aiFeatureCards = [
    {
      title: 'AI GDPR Scanner',
      description: 'Scan systems for GDPR compliance',
      icon: Scan,
      path: '/gdpr-scanner',
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      title: 'AI Audit Scheduler',
      description: 'Schedule audits with AI recommendations',
      icon: Calendar,
      path: '/audit-scheduler',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'AI Violation Predictor',
      description: 'Predict potential compliance violations',
      icon: TrendingUp,
      path: '/violation-predictor',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      title: 'AI Training Tracker',
      description: 'Track employee training progress',
      icon: BookMarked,
      path: '/training-tracker',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'AI Privacy Policy Generator',
      description: 'Generate privacy policies with AI',
      icon: FileCheck,
      path: '/privacy-policy-generator',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      title: 'AI Compliance Checker',
      description: 'Legal compliance checks with AI',
      icon: Scale,
      path: '/compliance-checker',
      gradient: 'from-indigo-500 to-blue-500'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Dashboard</h1>
          <p className="page-subtitle">Overview of your regulatory compliance status</p>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '8px' }}>Overall Compliance Score</h3>
            <div style={{ fontSize: '3rem', fontWeight: '700', color: data?.compliance?.score >= 70 ? '#10b981' : '#f59e0b' }}>
              {data?.compliance?.score || 0}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={32} color="#10b981" />
              <div style={{ marginTop: '4px', fontSize: '1.5rem', fontWeight: '600' }}>{data?.compliance?.completed || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Clock size={32} color="#f59e0b" />
              <div style={{ marginTop: '4px', fontSize: '1.5rem', fontWeight: '600' }}>{data?.compliance?.in_progress || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>In Progress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <TrendingUp size={32} color="#3b82f6" />
              <div style={{ marginTop: '4px', fontSize: '1.5rem', fontWeight: '600' }}>{data?.compliance?.pending || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="card-header" style={{ borderBottom: 'none', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} style={{ color: '#8b5cf6' }} />
            <h2 className="card-title" style={{ margin: 0 }}>AI-Powered Features</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {aiFeatureCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <card.icon size={24} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="dashboard-grid">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card ${card.color}`}
            onClick={() => navigate(card.path)}
          >
            <div className="stat-card-header">
              <div className={`stat-card-icon ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-label">{card.title}</div>
            <div className="stat-card-footer">{card.footer}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Activity</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentActivity?.map((activity, index) => (
                <tr key={index}>
                  <td>
                    <span className={`badge ${
                      activity.action === 'CREATE' ? 'badge-success' :
                      activity.action === 'UPDATE' ? 'badge-info' :
                      activity.action === 'DELETE' ? 'badge-danger' :
                      activity.action === 'LOGIN' ? 'badge-purple' :
                      activity.action === 'AI_ANALYSIS' ? 'badge-purple' :
                      'badge-secondary'
                    }`}>
                      {activity.action}
                    </span>
                  </td>
                  <td>{activity.entity_type}</td>
                  <td>{activity.user_name}</td>
                  <td>{new Date(activity.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
