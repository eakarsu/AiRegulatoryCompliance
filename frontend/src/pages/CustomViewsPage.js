import React, { useState } from 'react';
import ComplianceScoreTrendChart from '../components/customViews/ComplianceScoreTrendChart';
import RegulationBuHeatmap from '../components/customViews/RegulationBuHeatmap';
import AttestationPdfGenerator from '../components/customViews/AttestationPdfGenerator';
import ControlLibraryEditor from '../components/customViews/ControlLibraryEditor';

const TABS = [
  { id: 'score', label: 'Score Trend' },
  { id: 'heatmap', label: 'Regulation x BU Heatmap' },
  { id: 'attestation', label: 'Attestation PDF' },
  { id: 'controls', label: 'Control Library' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('score');

  return (
    <div data-testid="custom-views-page" style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Compliance Views</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
          Custom analytical views: score trend, regulation x business unit heatmap, attestation PDF, and the control library editor.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e5e7eb', marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              border: 0,
              background: tab === t.id ? '#1e3a5f' : 'transparent',
              color: tab === t.id ? '#fff' : '#374151',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'score' && <ComplianceScoreTrendChart />}
      {tab === 'heatmap' && <RegulationBuHeatmap />}
      {tab === 'attestation' && <AttestationPdfGenerator />}
      {tab === 'controls' && <ControlLibraryEditor />}
    </div>
  );
}
