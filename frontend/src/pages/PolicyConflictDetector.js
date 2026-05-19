import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const PolicyConflictDetector = () => {
  const [scope, setScope] = useState('organization-wide');
  const [policiesText, setPoliciesText] = useState(
    'Acceptable Use Policy: All employees must use multi-factor authentication on company systems.\n---\nRemote Work Policy: Remote employees may use personal devices without MFA when accessing internal portals.'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const parsePolicies = () => {
    return policiesText
      .split(/\n---\n|\n###\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, i) => {
        const firstColon = text.indexOf(':');
        if (firstColon > 0 && firstColon < 80) {
          return { name: text.slice(0, firstColon).trim(), content: text.slice(firstColon + 1).trim() };
        }
        return { name: `Policy ${i + 1}`, content: text };
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const policies = parsePolicies();
    if (policies.length < 2) {
      setError('Provide at least 2 policies separated by a line containing only ---');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/policy-conflict-detector', {
        policies,
        scope: scope || undefined,
      });
      setResult(res.data?.result || res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 503
        ? 'AI service unavailable: OPENROUTER_API_KEY not configured.'
        : (err.response?.data?.error || err.message || 'Conflict detection failed.');
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
          <h1 className="page-title">Policy Conflict Detector</h1>
          <p className="page-subtitle">Surface contradictions, redundancies, and gaps across organizational policies</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Scope</label>
            <input
              type="text"
              className="form-input"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. organization-wide, EU operations, security policies"
            />
          </div>
          <div className="form-group">
            <label>Policies (separate each with a line containing only ---)</label>
            <textarea
              className="form-input"
              rows={12}
              value={policiesText}
              onChange={(e) => setPoliciesText(e.target.value)}
              placeholder={'Policy Name: full text...\n---\nAnother Policy: full text...'}
              required
            />
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Tip: prefix each block with "Policy Name:" — the first line up to the colon is used as the policy name.
            </p>
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Analyzing...</> : <><Sparkles size={16} /> Detect Conflicts</>}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Conflict Report</h2>
          {result.summary && <p>{result.summary}</p>}
          {typeof result.conflict_count === 'number' && (
            <p style={{ color: '#374151', fontWeight: 600 }}>{result.conflict_count} conflict(s) detected</p>
          )}

          {Array.isArray(result.conflicts) && result.conflicts.length > 0 && (
            <Section title="Conflicts">
              {result.conflicts.map((c, i) => (
                <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{c.topic || c.type || `Conflict ${i + 1}`}</strong>
                    {c.severity && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#991b1b' }}>{c.severity}</span>}
                  </div>
                  {c.type && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Type: {c.type}</p>}
                  {Array.isArray(c.policies_involved) && c.policies_involved.length > 0 && (
                    <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Policies: {c.policies_involved.join(', ')}</p>
                  )}
                  {c.conflict_description && <p style={{ marginTop: 4, color: '#4b5563' }}>{c.conflict_description}</p>}
                  {c.recommended_resolution && <p style={{ marginTop: 4, color: '#1d4ed8', fontSize: 13 }}>Resolution: {c.recommended_resolution}</p>}
                  {c.suggested_owner_role && <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Owner: {c.suggested_owner_role}</p>}
                </div>
              ))}
            </Section>
          )}

          {Array.isArray(result.priority_resolutions) && result.priority_resolutions.length > 0 && (
            <SimpleList title="Priority Resolutions" items={result.priority_resolutions} />
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

export default PolicyConflictDetector;
