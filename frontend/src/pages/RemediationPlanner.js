import AIReport from '../components/AIReport';

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const RemediationPlanner = () => {
  const fullAIExamples = useFullAIExamples();

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
        <form onSubmit={handleSubmit} data-full-ai-workspace="RemediationPlanner"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div className="form-group">
            <label>Violation / finding</label>
            <textarea
              className="form-input"
              rows={5}
              value={violation}
              onChange={(e) => setViolation(e.target.value)}
              placeholder="Describe the violation, who detected it, and the affected systems..."
              required data-full-ai-field={fullAIExamples.bind({ current: violation, change: (e) => setViolation(e.target.value), label: "violation", manual: false, json: false, sample: '' }, "p1-1740", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Framework / standard (optional)</label>
            <input
              type="text"
              className="form-input"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="e.g. SOC 2, GDPR Art. 32, ISO 27001 A.12" data-full-ai-field={fullAIExamples.bind({ current: framework, change: (e) => setFramework(e.target.value), label: "framework", manual: false, json: false, sample: '' }, "p1-2165", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select
              className="form-input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)} data-full-ai-field={fullAIExamples.bind({ current: severity, change: (e) => setSeverity(e.target.value), label: "severity", manual: false, json: false, sample: 'high' }, "p1-2516", undefined)}
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
              placeholder="Industry, size, available resources..." data-full-ai-field={fullAIExamples.bind({ current: orgContext, change: (e) => setOrgContext(e.target.value), label: "orgContext", manual: false, json: false, sample: '' }, "p1-3012", undefined)}
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

      {result !== null && result !== undefined && <AIReport response={result} title="Remediation Planner" />}
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
