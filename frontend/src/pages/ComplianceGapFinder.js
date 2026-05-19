import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const ComplianceGapFinder = () => {
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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Target framework</label>
            <input
              type="text"
              className="form-input"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="e.g. SOC 2, ISO 27001, HIPAA, GDPR"
              required
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
              required
            />
          </div>
          <div className="form-group">
            <label>Org context (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={orgContext}
              onChange={(e) => setOrgContext(e.target.value)}
              placeholder="Industry, size, data types, customers..."
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

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Gap Report</h2>
          {result.summary && <p>{result.summary}</p>}

          {Array.isArray(result.gaps) && result.gaps.length > 0 && (
            <Section title="Gaps">
              {result.gaps.map((g, i) => (
                <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{g.control || g.requirement || g.name || `Gap ${i + 1}`}</strong>
                    {g.severity && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#92400e' }}>{g.severity}</span>}
                  </div>
                  {g.description && <p style={{ marginTop: 4, color: '#4b5563' }}>{g.description}</p>}
                  {g.recommendation && <p style={{ marginTop: 4, color: '#1d4ed8', fontSize: 13 }}>Suggestion: {g.recommendation}</p>}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.in_place) && result.in_place.length > 0 && (
            <SimpleList title="Controls In Place" items={result.in_place} />
          )}
          {Array.isArray(result.partial) && result.partial.length > 0 && (
            <SimpleList title="Partial Coverage" items={result.partial} />
          )}
          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <SimpleList title="Recommendations" items={result.recommendations} />
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

export default ComplianceGapFinder;
