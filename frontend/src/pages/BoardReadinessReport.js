import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const BoardReadinessReport = () => {
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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reporting period</label>
            <input
              type="text"
              className="form-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. Q3 2025, FY24, Jan-Jun 2025"
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
              style={{ fontFamily: 'monospace', fontSize: 13 }}
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

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Board Briefing — {result.period || period}</h2>
          {result.posture_rating && (
            <p style={{ marginTop: 0 }}>
              Posture: <strong style={{ textTransform: 'capitalize' }}>{result.posture_rating}</strong>
            </p>
          )}
          {result.executive_summary && <p>{result.executive_summary}</p>}

          {Array.isArray(result.key_metrics) && result.key_metrics.length > 0 && (
            <Section title="Key Metrics">
              {result.key_metrics.map((m, i) => (
                <div key={i} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 6 }}>
                  <strong>{m.name || `Metric ${i + 1}`}:</strong> {String(m.value ?? '-')}
                  {m.trend && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>(trend: {m.trend})</span>}
                  {m.commentary && <p style={{ marginTop: 4, color: '#4b5563', fontSize: 13 }}>{m.commentary}</p>}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.top_risks) && result.top_risks.length > 0 && (
            <Section title="Top Risks">
              {result.top_risks.map((r, i) => (
                <div key={i} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 6 }}>
                  <strong>{r.risk || `Risk ${i + 1}`}</strong>
                  {(r.impact || r.likelihood) && (
                    <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                      Impact: {r.impact || '-'} · Likelihood: {r.likelihood || '-'}
                    </p>
                  )}
                  {r.owner && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Owner: {r.owner}</p>}
                  {r.trend && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Trend: {r.trend}</p>}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.regulatory_exposure) && result.regulatory_exposure.length > 0 && (
            <Section title="Regulatory Exposure">
              {result.regulatory_exposure.map((r, i) => (
                <div key={i} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 6 }}>
                  <strong>{r.regulation || `Item ${i + 1}`}</strong>
                  {r.status && <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8' }}>{r.status}</span>}
                  {r.deadline && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Deadline: {r.deadline}</p>}
                  {r.blockers && <p style={{ marginTop: 4, fontSize: 13, color: '#b91c1c' }}>Blockers: {typeof r.blockers === 'string' ? r.blockers : JSON.stringify(r.blockers)}</p>}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.decisions_required) && result.decisions_required.length > 0 && (
            <Section title="Decisions Required">
              {result.decisions_required.map((d, i) => (
                <div key={i} style={{ padding: 8, border: '1px solid #fcd34d', background: '#fffbeb', borderRadius: 6, marginBottom: 6 }}>
                  <strong>{d.topic || `Decision ${i + 1}`}</strong>
                  {d.recommendation && <p style={{ marginTop: 4, color: '#92400e', fontSize: 13 }}>Recommendation: {d.recommendation}</p>}
                  {d.deadline && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Deadline: {d.deadline}</p>}
                </div>
              ))}
            </Section>
          )}

          {result.summary && (
            <div style={{ marginTop: 12, padding: 10, background: '#f9fafb', borderRadius: 6 }}>
              <strong>Summary:</strong> {result.summary}
            </div>
          )}
        </div>
      )}
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
