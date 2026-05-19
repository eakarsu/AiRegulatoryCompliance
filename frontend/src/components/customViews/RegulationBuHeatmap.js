import React, { useEffect, useState } from 'react';

function colorFor(score) {
  if (score >= 90) return '#059669';      // green
  if (score >= 75) return '#10b981';      // light green
  if (score >= 60) return '#f59e0b';      // amber
  if (score >= 40) return '#f97316';      // orange
  return '#dc2626';                       // red
}

export default function RegulationBuHeatmap() {
  const [org, setOrg] = useState('Acme');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/custom-views/regulation-bu-heatmap?org=${encodeURIComponent(org)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
          <h3 style={{ margin: 0, fontSize: 18 }}>Regulation x Business Unit Heatmap</h3>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
            Per-regulation compliance score across business units
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organization"
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
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
            <Stat label="Average Score" value={`${data.summary.avg_score_pct}`} suffix="%" />
            <Stat label="Compliant Cells" value={`${data.summary.compliant_cells}`} suffix={`/${data.summary.total_cells}`} />
            <Stat label="At Risk" value={`${data.summary.at_risk_cells}`} color="#f59e0b" />
            <Stat label="Non-Compliant" value={`${data.summary.non_compliant_cells}`} color="#dc2626" />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 12 }}>
                    Regulation
                  </th>
                  {data.business_units.map((bu) => (
                    <th key={bu} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: 12 }}>
                      {bu}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.regulations.map((r, ri) => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }}>
                      <div>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{r.region}</div>
                    </td>
                    {data.business_units.map((bu, bi) => {
                      const score = data.matrix[ri][bi];
                      const bg = colorFor(score);
                      return (
                        <td key={bu} style={{
                          padding: 0, borderBottom: '1px solid #f3f4f6',
                        }}>
                          <div title={`${r.name} x ${bu}: ${score}%`}
                            style={{
                              background: bg, color: '#fff', textAlign: 'center',
                              padding: '14px 8px', fontWeight: 600, fontSize: 13,
                            }}>
                            {score.toFixed(1)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 12 }}>
            <LegendChip color="#059669" label=">=90 Compliant" />
            <LegendChip color="#10b981" label="75-89 Strong" />
            <LegendChip color="#f59e0b" label="60-74 At Risk" />
            <LegendChip color="#f97316" label="40-59 Weak" />
            <LegendChip color="#dc2626" label="<40 Non-Compliant" />
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

function LegendChip({ color, label }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 14, background: color, borderRadius: 3, display: 'inline-block' }} />
      <span>{label}</span>
    </div>
  );
}
