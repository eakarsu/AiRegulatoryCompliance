import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const FRAMEWORKS = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'CCPA', 'ISO 27001', 'NIST CSF'];

export default function ComplianceScoreTrendChart() {
  const [framework, setFramework] = useState('GDPR');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(
        `/api/custom-views/compliance-score-trend?framework=${encodeURIComponent(framework)}&days=${days}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Compliance Score Trend</h3>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
            Daily compliance score with target line and findings overlay
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={framework} onChange={(e) => setFramework(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}>
            {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}>
            {[14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button onClick={load} disabled={loading}
            style={{ padding: '6px 14px', background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="Current" value={`${data.current_score}`} suffix="/100" />
            <Stat label="Average" value={`${data.average_score}`} suffix="/100" />
            <Stat label="Target" value={`${data.target_score}`} suffix="/100" />
            <Stat label="Delta" value={`${data.delta_pts > 0 ? '+' : ''}${data.delta_pts}`} suffix="pts"
              color={data.delta_pts >= 0 ? '#059669' : '#dc2626'} />
            <Stat label="Days Above Target" value={`${data.days_above_target}`} suffix={`/${data.days}`} />
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={data.target_score} stroke="#dc2626" strokeDasharray="4 4" label="Target" />
                <Line type="monotone" dataKey="compliance_score" stroke="#1e3a5f" strokeWidth={2} name="Score" dot={false} />
                <Line type="monotone" dataKey="pass_rate_pct" stroke="#059669" strokeWidth={1.5} name="Pass Rate %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, color = '#111' }) {
  return (
    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {value}
        {suffix && <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}
