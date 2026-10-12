import AIReport from '../components/AIReport';

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const BoardReadinessReport = () => {
  const fullAIExamples = useFullAIExamples();

  const [period, setPeriod] = useState('Q3 2025');
  const [orgData, setOrgData] = useState(
    JSON.stringify(
      {
        company: 'Acme Health Inc.',
        industry: 'Healthcare SaaS',
        regulations: ['HIPAA', 'SOC 2', 'GDPR'],
        active_initiatives: ['SOC 2 Type II readiness', 'GDPR DPA renewal'],
        recent_incidents: 1,
        open_high_risks: 4,
        controls_total: 142,
        controls_failing: 7
      },
      null,
      2
    )
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let parsed;
    try {
      parsed = JSON.parse(orgData);
    } catch (err) {
      setError('Organization data must be valid JSON.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/board-readiness-report', {
        organizationData: parsed,
        period: period || undefined,
      });
      setResult(res.data?.result || res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 503
        ? 'AI service unavailable: OPENROUTER_API_KEY not configured.'
        : (err.response?.data?.error || err.message || 'Report generation failed.');
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
          <h1 className="page-title">Board Readiness Report</h1>
          <p className="page-subtitle">Executive-level compliance posture briefing for the board</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit} data-full-ai-workspace="BoardReadinessReport"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div className="form-group">
            <label>Reporting period</label>
            <input
              type="text"
              className="form-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. Q3 2025, FY24, Jan-Jun 2025" data-full-ai-field={fullAIExamples.bind({ current: period, change: (e) => setPeriod(e.target.value), label: "period", manual: false, json: false, sample: 'Q3 2025' }, "p1-2169", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Organization data (JSON)</label>
            <textarea
              className="form-input"
              rows={12}
              value={orgData}
              onChange={(e) => setOrgData(e.target.value)}
              placeholder={'{ "company": "...", "regulations": ["..."], "open_high_risks": 0 }'}
              required
              style={{ fontFamily: 'monospace', fontSize: 13 }} data-full-ai-field={fullAIExamples.bind({ current: orgData, change: (e) => setOrgData(e.target.value), label: "orgData", manual: false, json: false, sample: JSON.stringify(
      {
        company: 'Acme Health Inc.',
        industry: 'Healthcare SaaS',
        regulations: ['HIPAA', 'SOC 2', 'GDPR'],
        active_initiatives: ['SOC 2 Type II readiness', 'GDPR DPA renewal'],
        recent_incidents: 1,
        open_high_risks: 4,
        controls_total: 142,
        controls_failing: 7
      },
      null,
      2
    ) }, "p1-2522", undefined)}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate Briefing</>}
          </button>
        </form>
      </div>

      {result !== null && result !== undefined && <AIReport response={result} title="Board Readiness Report" />}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    {children}
  </div>
);

export default BoardReadinessReport;
