import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Scan, RefreshCw, Download, ArrowUp, ArrowDown, Trash2, Edit2 } from 'lucide-react';
import { gdprScannerAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import DetailModal from '../components/DetailModal';
import AIResultDisplay from '../components/AIResultDisplay';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const GDPRScanner = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const { addToast } = useToast();

  // Search, Sort, Pagination state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState([]);

  const [newScan, setNewScan] = useState({
    scan_name: '',
    scan_type: 'full_scan',
    target_system: '',
    data_categories: []
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    scan_name: ['required'],
    target_system: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await gdprScannerAPI.getAll({ search, sortBy, sortOrder, page, limit });
      const resData = response.data;
      setScans(resData.data || resData);
      setTotal(resData.total || (Array.isArray(resData) ? resData.length : 0));
      setTotalPages(resData.totalPages || Math.ceil((resData.total || (Array.isArray(resData) ? resData.length : 0)) / limit));
    } catch (error) {
      addToast('Error fetching GDPR scans', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, page, limit, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ column }) => (
    <span className="sort-icon">
      {sortBy === column ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : null}
    </span>
  );

  const handleRowClick = (scan) => {
    setSelectedScan(scan);
    setAiResult(scan.ai_analysis || null);
    setShowModal(true);
  };

  const handleRunAIScan = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await gdprScannerAPI.runAIScan(id);
      setAiResult(response.data.aiAnalysis);
      setSelectedScan(response.data.scan);
      addToast('AI scan completed successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error running AI scan', 'error');
      setAiResult({ error: 'Failed to run AI scan. Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newScan)) return;
    try {
      await gdprScannerAPI.create(newScan);
      setShowCreateModal(false);
      setNewScan({ scan_name: '', scan_type: 'full_scan', target_system: '', data_categories: [] });
      addToast('GDPR scan created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating scan', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await gdprScannerAPI.update(updatedData.id, updatedData);
      addToast('Scan updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating scan', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await gdprScannerAPI.delete(id);
      addToast('Scan deleted successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error deleting scan', 'error');
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === scans.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(scans.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected scans?`)) {
      try {
        for (const id of selectedIds) {
          await gdprScannerAPI.delete(id);
        }
        addToast(`${selectedIds.length} scans deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting scans', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await gdprScannerAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} scans updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating scans', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('gdpr-scanner');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'gdpr-scanner.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: 'badge-success',
      in_progress: 'badge-info',
      pending: 'badge-warning',
      failed: 'badge-danger'
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getScoreClass = (score) => {
    if (!score) return '';
    if (score >= 80) return 'score-success';
    if (score >= 60) return 'score-warning';
    return 'score-danger';
  };

  const detailFields = [
    { key: 'scan_name', label: 'Scan Name', type: 'text' },
    { key: 'scan_type', label: 'Scan Type', type: 'badge', badgeMap: { full_scan: 'badge-info', privacy_audit: 'badge-purple', consent_audit: 'badge-warning' } },
    { key: 'target_system', label: 'Target System', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { completed: 'badge-success', in_progress: 'badge-info', pending: 'badge-warning' } },
    { key: 'compliance_score', label: 'Compliance Score', type: 'score' },
    { key: 'data_categories', label: 'Data Categories', type: 'array' },
    { key: 'recommendations', label: 'Recommendations', type: 'longtext', fullWidth: true },
    { key: 'scanned_at', label: 'Scanned At', type: 'datetime' },
    { key: 'created_at', label: 'Created At', type: 'datetime' }
  ];

  if (loading && scans.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI GDPR Scanner</h1>
            <p className="page-subtitle">Scan systems for GDPR compliance using AI analysis</p>
          </div>
        </div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI GDPR Scanner</h1>
          <p className="page-subtitle">Scan systems for GDPR compliance using AI analysis</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Scan
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search scans..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'completed' })}>
                Set Completed
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'pending' })}>
                Set Pending
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="bulk-checkbox" checked={scans.length > 0 && selectedIds.length === scans.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'scan_name' ? 'active' : ''}`} onClick={() => handleSort('scan_name')}>
                  Scan Name <SortIcon column="scan_name" />
                </th>
                <th className={`sortable ${sortBy === 'target_system' ? 'active' : ''}`} onClick={() => handleSort('target_system')}>
                  Target System <SortIcon column="target_system" />
                </th>
                <th className={`sortable ${sortBy === 'scan_type' ? 'active' : ''}`} onClick={() => handleSort('scan_type')}>
                  Type <SortIcon column="scan_type" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'compliance_score' ? 'active' : ''}`} onClick={() => handleSort('compliance_score')}>
                  Compliance Score <SortIcon column="compliance_score" />
                </th>
                <th className={`sortable ${sortBy === 'scanned_at' ? 'active' : ''}`} onClick={() => handleSort('scanned_at')}>
                  Scanned <SortIcon column="scanned_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} onClick={() => handleRowClick(scan)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(scan.id)} onChange={(e) => toggleSelect(scan.id, e)} />
                  </td>
                  <td className="font-medium">{scan.scan_name}</td>
                  <td>{scan.target_system}</td>
                  <td>
                    <span className={`badge ${scan.scan_type === 'full_scan' ? 'badge-info' : 'badge-purple'}`}>
                      {scan.scan_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(scan.status)}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td>
                    {scan.compliance_score ? (
                      <span className={`score-badge ${getScoreClass(scan.compliance_score)}`}>
                        {scan.compliance_score}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>{scan.scanned_at ? new Date(scan.scanned_at).toLocaleDateString() : 'Not scanned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setAiResult(null); }}
        title="GDPR Scan Details"
        data={selectedScan}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAIAction={handleRunAIScan}
        aiActionLabel="Run AI GDPR Scan"
        aiResult={aiResult}
        aiLoading={aiLoading}
        editableFields={['scan_name', 'scan_type', 'target_system', 'status']}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New GDPR Scan</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Scan Name *</label>
                <input
                  type="text"
                  className={`form-input ${touched.scan_name && errors.scan_name ? 'error' : ''}`}
                  value={newScan.scan_name}
                  onChange={(e) => setNewScan({ ...newScan, scan_name: e.target.value })}
                  onBlur={() => touchField('scan_name', newScan.scan_name)}
                  placeholder="Enter scan name"
                />
                {touched.scan_name && errors.scan_name && <div className="form-error">{errors.scan_name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Scan Type</label>
                <select
                  className="form-input"
                  value={newScan.scan_type}
                  onChange={(e) => setNewScan({ ...newScan, scan_type: e.target.value })}
                >
                  <option value="full_scan">Full Scan</option>
                  <option value="privacy_audit">Privacy Audit</option>
                  <option value="consent_audit">Consent Audit</option>
                  <option value="cookie_scan">Cookie Scan</option>
                  <option value="data_sharing">Data Sharing Review</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target System *</label>
                <input
                  type="text"
                  className={`form-input ${touched.target_system && errors.target_system ? 'error' : ''}`}
                  value={newScan.target_system}
                  onChange={(e) => setNewScan({ ...newScan, target_system: e.target.value })}
                  onBlur={() => touchField('target_system', newScan.target_system)}
                  placeholder="e.g., Customer CRM System"
                />
                {touched.target_system && errors.target_system && <div className="form-error">{errors.target_system}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Data Categories (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newScan.data_categories?.join(', ') || ''}
                  onChange={(e) => setNewScan({ ...newScan, data_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Personal Data, Contact Information"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
              >
                <Scan size={18} />
                Create Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GDPRScanner;
