import AIReport from '../components/AIReport';

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const VendorRiskScorer = () => {
  const fullAIExamples = useFullAIExamples();

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
        <form onSubmit={handleSubmit} data-full-ai-workspace="VendorRiskScorer"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div className="form-group">
            <label>Vendor name</label>
            <input
              type="text"
              className="form-input"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required data-full-ai-field={fullAIExamples.bind({ current: vendorName, change: (e) => setVendorName(e.target.value), label: "vendorName", manual: false, json: false, sample: '' }, "p1-2021", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Services provided</label>
            <textarea
              className="form-input"
              rows={3}
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder="e.g. cloud hosting, payment processing, customer support outsourcing..." data-full-ai-field={fullAIExamples.bind({ current: services, change: (e) => setServices(e.target.value), label: "services", manual: false, json: false, sample: '' }, "p1-2337", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Data access scope</label>
            <textarea
              className="form-input"
              rows={2}
              value={dataAccess}
              onChange={(e) => setDataAccess(e.target.value)}
              placeholder="e.g. PII, PHI, financial data, anonymized analytics only..." data-full-ai-field={fullAIExamples.bind({ current: dataAccess, change: (e) => setDataAccess(e.target.value), label: "dataAccess", manual: false, json: false, sample: '' }, "p1-2726", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Certifications</label>
            <input
              type="text"
              className="form-input"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="e.g. SOC 2 Type II, ISO 27001" data-full-ai-field={fullAIExamples.bind({ current: certifications, change: (e) => setCertifications(e.target.value), label: "certifications", manual: false, json: false, sample: '' }, "p1-3104", undefined)}
            />
          </div>
          <div className="form-group">
            <label>Region / jurisdiction</label>
            <input
              type="text"
              className="form-input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. EU, US, India" data-full-ai-field={fullAIExamples.bind({ current: region, change: (e) => setRegion(e.target.value), label: "region", manual: false, json: false, sample: '' }, "p1-3467", undefined)}
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

      {result !== null && result !== undefined && <AIReport response={result} title="Vendor Risk Scorer" />}
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
