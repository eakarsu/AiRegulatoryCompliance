import React, { useState } from 'react';

const FRAMEWORKS = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'CCPA', 'ISO 27001', 'NIST CSF'];

export default function AttestationPdfGenerator() {
  const [form, setForm] = useState({
    attestation_id: 'ATT-' + new Date().getFullYear() + '-0042',
    framework: 'GDPR',
    period: 'Q2 ' + new Date().getFullYear(),
    organization: 'Acme Corporation',
    attestor: 'admin@compliance.com',
    business_unit: 'Enterprise',
    score: 92,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/custom-views/attestation-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setResult(json);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result?.pdf_base64) return;
    const byteChars = atob(result.pdf_base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = result.filename || 'attestation.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Compliance Attestation PDF</h3>
      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>
        Generate a signed attestation certificate for the selected framework and period.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
        <Field label="Attestation ID">
          <input value={form.attestation_id} onChange={(e) => update('attestation_id', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Framework">
          <select value={form.framework} onChange={(e) => update('framework', e.target.value)} style={inputStyle}>
            {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Period">
          <input value={form.period} onChange={(e) => update('period', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Organization">
          <input value={form.organization} onChange={(e) => update('organization', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Business Unit">
          <input value={form.business_unit} onChange={(e) => update('business_unit', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Attestor (email)">
          <input value={form.attestor} onChange={(e) => update('attestor', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Compliance Score (0-100)">
          <input type="number" min="0" max="100" value={form.score}
            onChange={(e) => update('score', parseInt(e.target.value, 10) || 0)} style={inputStyle} />
        </Field>
      </div>

      <button onClick={generate} disabled={loading}
        style={{ padding: '8px 18px', background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
        {loading ? 'Generating...' : 'Generate Attestation PDF'}
      </button>

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            <strong>PDF generated:</strong> {result.filename} ({Math.round(result.size_bytes / 1024)} KB)
          </div>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
            Attestor: {result.attestor} | Score: {result.score}/100 | Issued: {result.generated_at}
          </div>
          <button onClick={download}
            style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
};

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
