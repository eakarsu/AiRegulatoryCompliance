import React, { useEffect, useState } from 'react';

export default function EvidenceExceptionTracker() {
  const [data, setData] = useState({ summary: {}, exceptions: [] });
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetch('/api/evidence-exception-tracker').then((res) => res.json()).then(setData);
  }, []);

  const resolvePlan = async (id) => {
    const res = await fetch('/api/evidence-exception-tracker/resolve-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPlan(await res.json());
  };

  return (
    <div className="page-container">
      <h1>Evidence Exception Tracker</h1>
      <p>Track missing, stale, and disputed control evidence before audit or board reporting.</p>
      <div className="dashboard-grid">
        {Object.entries(data.summary).map(([key, value]) => <div className="card" key={key}><span>{key}</span><strong>{value}</strong></div>)}
      </div>
      {data.exceptions.map((item) => (
        <div className="card" key={item.id}>
          <h3>{item.control} · {item.owner}</h3>
          <p>{item.evidence} · {item.ageDays} days old · {item.reason}</p>
          <button className="btn-primary" onClick={() => resolvePlan(item.id)}>Create resolve plan</button>
        </div>
      ))}
      {plan && <pre className="card">{JSON.stringify(plan, null, 2)}</pre>}
    </div>
  );
}
