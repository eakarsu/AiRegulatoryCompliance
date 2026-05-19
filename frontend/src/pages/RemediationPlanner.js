import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const RemediationPlanner = () => {
  const [violation, setViolation] = useState('');
  const [framework, setFramework] = useState('');
  const [severity, setSeverity] = useState('high');
  const [orgContext, setOrgContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!violation.trim()) {
      setError('Please describe the violation.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/remediation-planner', {
        violation,
        framework,
        severity,
        orgContext: orgContext || undefined,
      });
      setResult(res.data?.plan || res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Plan generation failed.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Remediation Planner</h1>
          <p className="page-subtitle">Owner-tagged remediation steps with deadlines, mitigations, and success metrics</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Violation / finding</label>
            <textarea
              className="form-input"
              rows={5}
              value={violation}
              onChange={(e) => setViolation(e.target.value)}
              placeholder="Describe the violation, who detected it, and the affected systems..."
              required
            />
          </div>
          <div className="form-group">
            <label>Framework / standard (optional)</label>
            <input
              type="text"
              className="form-input"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="e.g. SOC 2, GDPR Art. 32, ISO 27001 A.12"
            />
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select
              className="form-input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label>Org context (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={orgContext}
              onChange={(e) => setOrgContext(e.target.value)}
              placeholder="Industry, size, available resources..."
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Planning...</> : <><Sparkles size={16} /> Generate Plan</>}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Remediation Plan</h2>
          {result.summary && <p>{result.summary}</p>}

          {Array.isArray(result.steps) && result.steps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h3>Steps</h3>
              {result.steps.map((s, i) => (
                <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{i + 1}. {s.title || s.action || s.step || `Step ${i + 1}`}</strong>
                    {s.deadline && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8' }}>by {s.deadline}</span>}
                  </div>
                  {s.description && <p style={{ marginTop: 4, color: '#4b5563' }}>{s.description}</p>}
                  {s.owner && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Owner: {s.owner}</p>}
                  {s.priority && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Priority: {s.priority}</p>}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(result.mitigations) && result.mitigations.length > 0 && (
            <SimpleList title="Interim Mitigations" items={result.mitigations} />
          )}

          {Array.isArray(result.success_metrics) && result.success_metrics.length > 0 && (
            <SimpleList title="Success Metrics" items={result.success_metrics} />
          )}

          {Array.isArray(result.risks) && result.risks.length > 0 && (
            <SimpleList title="Risks if Unaddressed" items={result.risks} />
          )}
        </div>
      )}
    </div>
  );
};

const SimpleList = ({ title, items }) => (
  <div style={{ marginBottom: 12 }}>
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    <ul style={{ paddingLeft: 20 }}>
      {items.map((it, i) => (
        <li key={i}>{typeof it === 'string' ? it : (it.text || it.description || JSON.stringify(it))}</li>
      ))}
    </ul>
  </div>
);

export default RemediationPlanner;
