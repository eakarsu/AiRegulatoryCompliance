import AIReport from '../components/AIReport';

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const ComplianceGapFinder = () => {
  const fullAIExamples = useFullAIExamples();

  const [framework, setFramework] = useState('SOC 2');
  const [currentControls, setCurrentControls] = useState('');
  const [orgContext, setOrgContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!framework.trim() || !currentControls.trim()) {
      setError('Framework and current controls are required.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/compliance-gap-finder', {
        framework,
        currentControls,
        orgContext: orgContext || undefined,
      });
      setResult(res.data?.report || res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Gap analysis failed.';
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
          <h1 className="page-title">Compliance Gap Finder</h1>
          <p className="page-subtitle">Map current controls to a target framework and surface gaps</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit} data-full-ai-workspace="ComplianceGapFinder"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div className="form-group">
            <label>Target framework</label>
            <input
              type="text"
              className="form-input"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="e.g. SOC 2, ISO 27001, HIPAA, GDPR"
              required data-full-ai-field={fullAIExamples.bind({ current: framework, change: (e) => setFramework(e.target.value), label: "framework", manual: false, json: false, sample: 'SOC 2' }, "p1-1715", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Current controls (free text)</label>
            <textarea
              className="form-input"
              rows={6}
              value={currentControls}
              onChange={(e) => setCurrentControls(e.target.value)}
              placeholder="Describe controls already in place..."
              required data-full-ai-field={fullAIExamples.bind({ current: currentControls, change: (e) => setCurrentControls(e.target.value), label: "currentControls", manual: false, json: false, sample: '' }, "p1-2103", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Org context (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={orgContext}
              onChange={(e) => setOrgContext(e.target.value)}
              placeholder="Industry, size, data types, customers..." data-full-ai-field={fullAIExamples.bind({ current: orgContext, change: (e) => setOrgContext(e.target.value), label: "orgContext", manual: false, json: false, sample: '' }, "p1-2500", undefined)}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Analyzing...</> : <><Sparkles size={16} /> Find Gaps</>}
          </button>
        </form>
      </div>

      {result !== null && result !== undefined && <AIReport response={result} title="Compliance Gap Finder" />}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    {children}
  </div>
);

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

export default ComplianceGapFinder;
