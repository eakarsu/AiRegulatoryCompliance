import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const ControlEffectivenessAssessment = () => {
  const [controlsText, setControlsText] = useState(
    'C-001 | Multi-factor authentication required for all admin accounts | implemented 2023-09 | last tested 2024-08\nC-002 | Encryption at rest for production databases (AES-256) | implemented 2022-04 | last tested 2024-06\nC-003 | Quarterly access reviews | implemented 2021-01 | last review skipped Q1 2024'
  );
  const [evidenceContext, setEvidenceContext] = useState('SOC 2 Type II audit period: last 12 months. 2 incidents related to dormant credentials.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const parseControls = () =>
    controlsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length >= 2) {
          const [id, name, ...rest] = parts;
          return { control_id: id, control_name: name, notes: rest.join(' | ') };
        }
        return { control_id: `C-${i + 1}`, control_name: line, notes: '' };
      });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const controls = parseControls();
    if (controls.length === 0) {
      setError('Provide at least one control.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/control-effectiveness-assessment', {
        controls,
        evidenceContext: evidenceContext || undefined,
      });
      setResult(res.data?.result || res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 503
        ? 'AI service unavailable: OPENROUTER_API_KEY not configured.'
        : (err.response?.data?.error || err.message || 'Assessment failed.');
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
          <h1 className="page-title">Control Effectiveness Assessment</h1>
          <p className="page-subtitle">Score design and operational effectiveness for each implemented control</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Controls (one per line: ID | Name | Notes)</label>
            <textarea
              className="form-input"
              rows={10}
              value={controlsText}
              onChange={(e) => setControlsText(e.target.value)}
              placeholder={'C-001 | MFA on admin accounts | implemented 2023-09\nC-002 | Encryption at rest | implemented 2022-04'}
              required
            />
          </div>
          <div className="form-group">
            <label>Evidence / operational context (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={evidenceContext}
              onChange={(e) => setEvidenceContext(e.target.value)}
              placeholder="Recent audit period, incidents, ticket trends..."
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Assessing...</> : <><Sparkles size={16} /> Assess Effectiveness</>}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Effectiveness Report</h2>
          {result.summary && <p>{result.summary}</p>}
          {typeof result.overall_effectiveness_score === 'number' && (
            <p style={{ color: '#374151', fontWeight: 600 }}>
              Overall effectiveness: {result.overall_effectiveness_score}/100
            </p>
          )}

          {Array.isArray(result.control_assessments) && result.control_assessments.length > 0 && (
            <Section title="Per-Control Assessment">
              {result.control_assessments.map((c, i) => (
                <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{c.control_id || `C-${i + 1}`}: {c.control_name || ''}</strong>
                    {c.residual_risk && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#92400e' }}>{c.residual_risk}</span>}
                  </div>
                  {(typeof c.design_effectiveness === 'number' || typeof c.operational_effectiveness === 'number') && (
                    <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                      Design: {c.design_effectiveness ?? '-'} / Operational: {c.operational_effectiveness ?? '-'}
                    </p>
                  )}
                  {c.evidence_quality && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Evidence quality: {c.evidence_quality}</p>}
                  {c.gaps && <p style={{ marginTop: 4, color: '#4b5563' }}>Gaps: {typeof c.gaps === 'string' ? c.gaps : JSON.stringify(c.gaps)}</p>}
                  {Array.isArray(c.improvement_recommendations) && c.improvement_recommendations.length > 0 && (
                    <ul style={{ marginTop: 6, paddingLeft: 20, color: '#1d4ed8', fontSize: 13 }}>
                      {c.improvement_recommendations.map((r, j) => (
                        <li key={j}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.top_weaknesses) && result.top_weaknesses.length > 0 && (
            <SimpleList title="Top Weaknesses" items={result.top_weaknesses} />
          )}
          {Array.isArray(result.strongest_controls) && result.strongest_controls.length > 0 && (
            <SimpleList title="Strongest Controls" items={result.strongest_controls} />
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

export default ControlEffectivenessAssessment;
