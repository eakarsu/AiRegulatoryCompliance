import React from 'react';

const SkeletonLine = ({ width = '100%', height = '16px' }) => (
  <div className="skeleton-line" style={{ width, height }} />
);

export const TableSkeleton = ({ rows = 8, cols = 6 }) => (
  <div className="card">
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><SkeletonLine width="80%" height="14px" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><SkeletonLine width={`${60 + Math.random() * 30}%`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const CardSkeleton = ({ count = 4 }) => (
  <div className="dashboard-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="stat-card">
        <SkeletonLine width="60%" height="14px" />
        <div style={{ marginTop: '12px' }}><SkeletonLine width="40%" height="32px" /></div>
        <div style={{ marginTop: '8px' }}><SkeletonLine width="80%" height="12px" /></div>
      </div>
    ))}
  </div>
);

export const FormSkeleton = ({ fields = 6 }) => (
  <div>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="form-group">
        <SkeletonLine width="30%" height="14px" />
        <div style={{ marginTop: '6px' }}><SkeletonLine width="100%" height="38px" /></div>
      </div>
    ))}
  </div>
);

export default TableSkeleton;
