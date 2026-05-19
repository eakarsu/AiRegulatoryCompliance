import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const VendorRiskScorer = () => {
  const [vendorName, setVendorName] = useState('');
  const [services, setServices] = useState('');
  const [dataAccess, setDataAccess] = useState('');
  const [certifications, setCertifications] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setError('Vendor name is required.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/vendor-risk-scorer', {
        vendorName,
        services,
        dataAccess,
        certifications,
        region,
      });
      setResult(res.data?.score || res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Vendor risk scoring failed.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level) => {
    const s = String(level || '').toLowerCase();
    if (s.includes('critical') || s.includes('high')) return '#b91c1c';
    if (s.includes('medium') || s.includes('moderate')) return '#b45309';
    return '#15803d';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Risk Scorer</h1>
          <p className="page-subtitle">Multi-dimension numeric vendor risk score with reassessment cadence</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Vendor name</label>
            <input
              type="text"
              className="form-input"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Services provided</label>
            <textarea
              className="form-input"
              rows={3}
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder="e.g. cloud hosting, payment processing, customer support outsourcing..."
            />
          </div>
          <div className="form-group">
            <label>Data access scope</label>
            <textarea
              className="form-input"
              rows={2}
              value={dataAccess}
              onChange={(e) => setDataAccess(e.target.value)}
              placeholder="e.g. PII, PHI, financial data, anonymized analytics only..."
            />
          </div>
          <div className="form-group">
            <label>Certifications</label>
            <input
              type="text"
              className="form-input"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="e.g. SOC 2 Type II, ISO 27001"
            />
          </div>
          <div className="form-group">
            <label>Region / jurisdiction</label>
            <input
              type="text"
              className="form-input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. EU, US, India"
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Scoring...</> : <><Sparkles size={16} /> Score Vendor</>}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Risk Score</h2>

          {(result.overallScore != null || result.overall_score != null || result.riskLevel) && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12, background: '#f9fafb', borderRadius: 8, marginBottom: 12 }}>
              {(result.overallScore != null || result.overall_score != null) && (
                <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2ff', border: '4px solid #c7d2fe' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#4338ca' }}>{result.overallScore ?? result.overall_score}</span>
                </div>
              )}
              <div>
                {(result.riskLevel || result.risk_level) && (
                  <p style={{ fontSize: 18, fontWeight: 600, color: riskColor(result.riskLevel || result.risk_level), margin: 0 }}>
                    Risk: {result.riskLevel || result.risk_level}
                  </p>
                )}
                {result.reassessment_cadence && (
                  <p style={{ margin: '4px 0', color: '#6b7280' }}>Reassessment: {result.reassessment_cadence}</p>
                )}
              </div>
            </div>
          )}

          {result.summary && <p>{result.summary}</p>}

          {result.dimensions && typeof result.dimensions === 'object' && (
            <div style={{ marginBottom: 12 }}>
              <h3>Dimensions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {Object.entries(result.dimensions).map(([k, v]) => (
                  <div key={k} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{typeof v === 'object' ? (v.score ?? JSON.stringify(v)) : String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(result.findings) && result.findings.length > 0 && (
            <SimpleList title="Findings" items={result.findings} />
          )}
          {Array.isArray(result.mitigations) && result.mitigations.length > 0 && (
            <SimpleList title="Mitigations" items={result.mitigations} />
          )}
          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <SimpleList title="Recommendations" items={result.recommendations} />
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

export default VendorRiskScorer;
