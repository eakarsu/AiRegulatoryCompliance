import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Scale, RefreshCw, Download, Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import { complianceCheckerAPI, regulationsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';
import DetailModal from '../components/DetailModal';

const ComplianceChecker = () => {
  const [checks, setChecks] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState(null);
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

  const [newCheck, setNewCheck] = useState({
    check_name: '',
    check_type: 'documentation',
    regulation_id: '',
    jurisdiction: '',
    department: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    check_name: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [checksRes, regulationsRes] = await Promise.all([
        complianceCheckerAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        regulationsAPI.getAll()
      ]);
      const checksData = checksRes.data;
      setChecks(checksData.data || checksData);
      setTotal(checksData.total || (Array.isArray(checksData) ? checksData.length : 0));
      setTotalPages(checksData.totalPages || Math.ceil((checksData.total || (Array.isArray(checksData) ? checksData.length : 0)) / limit));
      setRegulations(regulationsRes.data.data || regulationsRes.data);
    } catch (error) {
      addToast('Error fetching compliance checks', 'error');
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

  const handleRowClick = (check) => {
    setSelectedCheck(check);
    setAiResult(check.ai_analysis || null);
    setShowModal(true);
  };

  const handleRunAICheck = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await complianceCheckerAPI.runAICheck(id);
      setAiResult(response.data.aiAnalysis);
      setSelectedCheck(response.data.check);
      addToast('AI compliance check completed successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Error running AI check:', error);
      setAiResult({ error: 'Failed to run AI check. Please try again.' });
      addToast('Error running AI compliance check', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newCheck)) return;
    try {
      await complianceCheckerAPI.create(newCheck);
      setShowCreateModal(false);
      setNewCheck({
        check_name: '',
        check_type: 'documentation',
        regulation_id: '',
        jurisdiction: '',
        department: ''
      });
      addToast('Compliance check created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating compliance check', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await complianceCheckerAPI.update(updatedData.id, updatedData);
      addToast('Compliance check updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating compliance check', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this compliance check?')) {
      try {
        await complianceCheckerAPI.delete(id);
        addToast('Compliance check deleted successfully', 'success');
        setShowModal(false);
        setAiResult(null);
        fetchData();
      } catch (error) {
        addToast('Error deleting compliance check', 'error');
      }
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === checks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(checks.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected compliance checks?`)) {
      try {
        for (const id of selectedIds) {
          await complianceCheckerAPI.delete(id);
        }
        addToast(`${selectedIds.length} compliance checks deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting compliance checks', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await complianceCheckerAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} compliance checks updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating compliance checks', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('compliance-checker');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'compliance-checks.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Compliant': 'badge-success',
      'Partially Compliant': 'badge-warning',
      'Non-Compliant': 'badge-danger',
      'pending': 'badge-info'
    };
    return map[status] || 'badge-secondary';
  };

  const getScoreClass = (score) => {
    if (!score) return '';
    if (score >= 80) return 'score-success';
    if (score >= 60) return 'score-warning';
    return 'score-danger';
  };

  const detailFields = [
    { key: 'check_name', label: 'Check Name', type: 'text' },
    { key: 'check_type', label: 'Check Type', type: 'text' },
    { key: 'regulation_name', label: 'Regulation', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'compliance_status', label: 'Status', type: 'badge', badgeMap: { 'Compliant': 'badge-success', 'Partially Compliant': 'badge-warning', 'Non-Compliant': 'badge-danger', 'pending': 'badge-info' } },
    { key: 'compliance_score', label: 'Compliance Score', type: 'score' },
    { key: 'check_date', label: 'Check Date', type: 'date' },
    { key: 'next_review_date', label: 'Next Review', type: 'date' },
    { key: 'legal_risks', label: 'Legal Risks', type: 'longtext', fullWidth: true },
    { key: 'recommendations', label: 'Recommendations', type: 'longtext', fullWidth: true },
    { key: 'evidence_collected', label: 'Evidence Collected', type: 'longtext', fullWidth: true }
  ];

  if (loading && checks.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Compliance Checker (Legal)</h1>
            <p className="page-subtitle">Perform legal compliance checks with AI-powered analysis</p>
          </div>
        </div>
        <TableSkeleton rows={8} cols={8} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Compliance Checker (Legal)</h1>
          <p className="page-subtitle">Perform legal compliance checks with AI-powered analysis</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Compliance Check
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search compliance checks..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'Compliant' })}>
                Set Compliant
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'pending' })}>
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
                  <input type="checkbox" className="bulk-checkbox" checked={checks.length > 0 && selectedIds.length === checks.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'check_name' ? 'active' : ''}`} onClick={() => handleSort('check_name')}>
                  Check Name <SortIcon column="check_name" />
                </th>
                <th className={`sortable ${sortBy === 'regulation_name' ? 'active' : ''}`} onClick={() => handleSort('regulation_name')}>
                  Regulation <SortIcon column="regulation_name" />
                </th>
                <th className={`sortable ${sortBy === 'department' ? 'active' : ''}`} onClick={() => handleSort('department')}>
                  Department <SortIcon column="department" />
                </th>
                <th className={`sortable ${sortBy === 'jurisdiction' ? 'active' : ''}`} onClick={() => handleSort('jurisdiction')}>
                  Jurisdiction <SortIcon column="jurisdiction" />
                </th>
                <th className={`sortable ${sortBy === 'compliance_score' ? 'active' : ''}`} onClick={() => handleSort('compliance_score')}>
                  Score <SortIcon column="compliance_score" />
                </th>
                <th className={`sortable ${sortBy === 'compliance_status' ? 'active' : ''}`} onClick={() => handleSort('compliance_status')}>
                  Status <SortIcon column="compliance_status" />
                </th>
                <th className={`sortable ${sortBy === 'check_date' ? 'active' : ''}`} onClick={() => handleSort('check_date')}>
                  Check Date <SortIcon column="check_date" />
                </th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id} onClick={() => handleRowClick(check)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(check.id)} onChange={(e) => toggleSelect(check.id, e)} />
                  </td>
                  <td className="font-medium">{check.check_name}</td>
                  <td>{check.regulation_name || '-'}</td>
                  <td>{check.department}</td>
                  <td>{check.jurisdiction}</td>
                  <td>
                    {check.compliance_score ? (
                      <span className={`score-badge ${getScoreClass(check.compliance_score)}`}>
                        {check.compliance_score}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(check.compliance_status)}`}>
                      {check.compliance_status}
                    </span>
                  </td>
                  <td>{check.check_date ? new Date(check.check_date).toLocaleDateString() : '-'}</td>
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
        title="Legal Compliance Check Details"
        data={selectedCheck}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAIAction={handleRunAICheck}
        aiActionLabel="Run AI Compliance Check"
        aiResult={aiResult}
        aiLoading={aiLoading}
        editableFields={['check_name', 'check_type', 'jurisdiction', 'department', 'compliance_status', 'legal_risks', 'recommendations', 'evidence_collected', 'next_review_date']}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Compliance Check</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Check Name *</label>
                <input
                  type="text"
                  className={`form-input ${touched.check_name && errors.check_name ? 'error' : ''}`}
                  value={newCheck.check_name}
                  onChange={(e) => setNewCheck({ ...newCheck, check_name: e.target.value })}
                  onBlur={() => touchField('check_name', newCheck.check_name)}
                  placeholder="e.g., GDPR Article 30 Records Assessment"
                />
                {touched.check_name && errors.check_name && <div className="form-error">{errors.check_name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Check Type</label>
                  <select
                    className="form-input"
                    value={newCheck.check_type}
                    onChange={(e) => setNewCheck({ ...newCheck, check_type: e.target.value })}
                  >
                    <option value="documentation">Documentation</option>
                    <option value="consumer_rights">Consumer Rights</option>
                    <option value="contracts">Contracts</option>
                    <option value="internal_controls">Internal Controls</option>
                    <option value="security">Security</option>
                    <option value="privacy">Privacy</option>
                    <option value="ai_compliance">AI Compliance</option>
                    <option value="data_governance">Data Governance</option>
                    <option value="vendor">Vendor</option>
                    <option value="incident">Incident</option>
                    <option value="transfers">Data Transfers</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Regulation</label>
                  <select
                    className="form-input"
                    value={newCheck.regulation_id}
                    onChange={(e) => setNewCheck({ ...newCheck, regulation_id: e.target.value })}
                  >
                    <option value="">Select Regulation...</option>
                    {regulations.map(reg => (
                      <option key={reg.id} value={reg.id}>{reg.name} ({reg.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jurisdiction</label>
                  <select
                    className="form-input"
                    value={newCheck.jurisdiction}
                    onChange={(e) => setNewCheck({ ...newCheck, jurisdiction: e.target.value })}
                  >
                    <option value="">Select Jurisdiction...</option>
                    <option value="Global">Global</option>
                    <option value="European Union">European Union</option>
                    <option value="United States">United States</option>
                    <option value="California">California</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCheck.department}
                    onChange={(e) => setNewCheck({ ...newCheck, department: e.target.value })}
                    placeholder="e.g., Legal, Data Protection, IT Security"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newCheck.check_name}
              >
                <Scale size={18} />
                Create Check
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceChecker;
