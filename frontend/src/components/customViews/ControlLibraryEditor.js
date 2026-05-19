import React, { useEffect, useState } from 'react';

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annually', 'Annually'];
const FRAMEWORKS = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'CCPA', 'ISO 27001', 'NIST CSF'];

const blankForm = () => ({
  control_id: 'CTL-' + Date.now(),
  name: '',
  category: 'General',
  framework: 'GDPR',
  description: '',
  frequency: 'Quarterly',
  owner: 'Compliance Team',
  status: 'Active',
  last_tested: new Date().toISOString().substring(0, 10),
});

export default function ControlLibraryEditor() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/custom-views/controls',
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setControls(json.data || []);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      control_id: c.control_id, name: c.name, category: c.category, framework: c.framework,
      description: c.description, frequency: c.frequency, owner: c.owner, status: c.status,
      last_tested: c.last_tested,
    });
  }

  function cancelEdit() { setEditingId(null); setForm(blankForm()); }

  async function save() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const url = editingId
        ? `/api/custom-views/controls/${editingId}`
        : '/api/custom-views/controls';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this control?')) return;
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/custom-views/controls/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      await load();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Control Library Rules Editor</h3>
      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>
        CRUD controls with test frequency. Next-test dates are derived from the frequency.
      </p>

      {error && (
        <div style={{ padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* Editor */}
      <div style={{ background: '#f9fafb', padding: 14, borderRadius: 6, marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          {editingId ? `Edit Control #${editingId}` : 'New Control'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
          <Field label="Control ID">
            <input value={form.control_id} onChange={(e) => update('control_id', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Category">
            <input value={form.category} onChange={(e) => update('category', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Framework">
            <select value={form.framework} onChange={(e) => update('framework', e.target.value)} style={inputStyle}>
              {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Frequency">
            <select value={form.frequency} onChange={(e) => update('frequency', e.target.value)} style={inputStyle}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Owner">
            <input value={form.owner} onChange={(e) => update('owner', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => update('status', e.target.value)} style={inputStyle}>
              {['Active', 'Inactive', 'Retired'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Last Tested">
            <input type="date" value={form.last_tested} onChange={(e) => update('last_tested', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => update('description', e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={save} disabled={loading}
            style={{ padding: '6px 16px', background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Save Changes' : 'Create Control'}
          </button>
          {editingId && (
            <button onClick={cancelEdit}
              style={{ padding: '6px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>Framework</th>
              <th style={th}>Category</th>
              <th style={th}>Frequency</th>
              <th style={th}>Owner</th>
              <th style={th}>Last Tested</th>
              <th style={th}>Next Test</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{c.control_id}</td>
                <td style={td}>{c.name}</td>
                <td style={td}>{c.framework}</td>
                <td style={td}>{c.category}</td>
                <td style={td}>{c.frequency}</td>
                <td style={td}>{c.owner}</td>
                <td style={td}>{c.last_tested}</td>
                <td style={td}>{c.next_test}</td>
                <td style={td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    background: c.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: c.status === 'Active' ? '#166534' : '#991b1b',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={td}>
                  <button onClick={() => startEdit(c)}
                    style={{ padding: '4px 10px', marginRight: 4, background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => remove(c.id)}
                    style={{ padding: '4px 10px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {controls.length === 0 && !loading && (
              <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>No controls.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
};
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' };
const td = { padding: '8px 10px' };

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
