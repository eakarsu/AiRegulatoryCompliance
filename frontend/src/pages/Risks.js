import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, RefreshCw, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { risksAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Risks = () => {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);
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

  const [formData, setFormData] = useState({
    title: '', description: '', risk_category: '', likelihood: 'possible',
    impact: 'moderate', risk_score: 50, mitigation_strategy: '', status: 'identified', assigned_to: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, usersRes] = await Promise.all([
        risksAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      setItems(itemsRes.data.data || itemsRes.data);
      setTotal(itemsRes.data.total || itemsRes.data.length);
      setTotalPages(itemsRes.data.totalPages || Math.ceil((itemsRes.data.total || itemsRes.data.length) / limit));
      setUsers(usersRes.data.data || usersRes.data);
    } catch (error) {
      addToast('Error fetching risk assessments', 'error');
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

  const handleRowClick = async (item) => {
    try {
      const response = await risksAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '', description: '', risk_category: '', likelihood: 'possible',
      impact: 'moderate', risk_score: 50, mitigation_strategy: '', status: 'identified', assigned_to: ''
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData(item);
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await risksAPI.delete(item.id);
        addToast('Risk assessment deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting risk assessment', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await risksAPI.update(selectedItem.id, formData);
        addToast('Risk assessment updated successfully', 'success');
      } else {
        await risksAPI.create(formData);
        addToast('Risk assessment created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving risk assessment', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await risksAPI.analyze(item.id);
      setAIResponse(response.data.analysis);
    } catch (error) {
      setAIResponse('Error with AI analysis. Please check your OpenRouter API key.');
    } finally {
      setAILoading(false);
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected risk assessments?`)) {
      try {
        await risksAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} risk assessments deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting risk assessments', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await risksAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} risk assessments updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating risk assessments', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('risks');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'risks.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getRiskColor = (score) => score >= 70 ? 'risk-critical' : score >= 50 ? 'risk-high' : score >= 30 ? 'risk-medium' : 'risk-low';
  const getStatusBadge = (status) => ({ mitigating: 'badge-success', monitoring: 'badge-info', identified: 'badge-warning', accepted: 'badge-secondary' }[status] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Risk Assessments</h1>
            <p className="page-subtitle">Identify and manage compliance risks</p>
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
          <h1 className="page-title">Risk Assessments</h1>
          <p className="page-subtitle">Identify and manage compliance risks</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> New Risk
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search risk assessments..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'mitigating' })}>
                Set Mitigating
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'accepted' })}>
                Set Accepted
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="bulk-checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'title' ? 'active' : ''}`} onClick={() => handleSort('title')}>
                  Title <SortIcon column="title" />
                </th>
                <th className={`sortable ${sortBy === 'risk_category' ? 'active' : ''}`} onClick={() => handleSort('risk_category')}>
                  Category <SortIcon column="risk_category" />
                </th>
                <th className={`sortable ${sortBy === 'risk_score' ? 'active' : ''}`} onClick={() => handleSort('risk_score')}>
                  Risk Score <SortIcon column="risk_score" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'assigned_to_name' ? 'active' : ''}`} onClick={() => handleSort('assigned_to_name')}>
                  Assigned To <SortIcon column="assigned_to_name" />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e)} />
                  </td>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.risk_category}</td>
                  <td><span className={getRiskColor(item.risk_score)} style={{ fontWeight: '600' }}>{item.risk_score}%</span></td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{item.assigned_to_name || '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIAnalyze(item, e)} title="AI Analyze"><Bot size={16} /></button>
                      <button className="icon-btn danger" onClick={(e) => handleDelete(item, e)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Risk Assessment Details'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEdit(selectedItem); }}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn btn-ai" onClick={() => { setShowDetailModal(false); handleAIAnalyze(selectedItem); }}>
              <Bot size={16} /> AI Analyze
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.risk_category}</div></div>
              <div className="detail-item"><div className="detail-label">Risk Score</div><div className="detail-value"><span className={getRiskColor(selectedItem.risk_score)} style={{ fontSize: '1.5rem', fontWeight: '700' }}>{selectedItem.risk_score}%</span></div></div>
              <div className="detail-item"><div className="detail-label">Likelihood</div><div className="detail-value">{selectedItem.likelihood}</div></div>
              <div className="detail-item"><div className="detail-label">Impact</div><div className="detail-value">{selectedItem.impact}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selectedItem.assigned_to_name || '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.mitigation_strategy && <div className="detail-section"><h3>Mitigation Strategy</h3><p>{selectedItem.mitigation_strategy}</p></div>}
            {selectedItem.ai_analysis && <div className="detail-section"><h3>AI Analysis</h3><p style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.ai_analysis}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Risk' : 'New Risk'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input type="text" className={`form-input ${touched.title && errors.title ? 'error' : ''}`} value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              onBlur={() => touchField('title', formData.title)} />
            {touched.title && errors.title && <div className="form-error">{errors.title}</div>}
          </div>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input type="text" className="form-input" value={formData.risk_category} onChange={(e) => setFormData({ ...formData, risk_category: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Risk Score</label>
              <input type="number" className="form-input" min="0" max="100" value={formData.risk_score} onChange={(e) => setFormData({ ...formData, risk_score: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Likelihood</label>
              <select className="form-select" value={formData.likelihood} onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })}>
                <option value="rare">Rare</option>
                <option value="unlikely">Unlikely</option>
                <option value="possible">Possible</option>
                <option value="likely">Likely</option>
                <option value="almost_certain">Almost Certain</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Impact</label>
              <select className="form-select" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })}>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="identified">Identified</option>
                <option value="mitigating">Mitigating</option>
                <option value="monitoring">Monitoring</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-select" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}>
                <option value="">Select...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Mitigation Strategy</label>
            <textarea className="form-textarea" value={formData.mitigation_strategy} onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Risk Analysis: ${selectedItem?.title || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => handleAIAnalyze(selectedItem)} disabled={aiLoading}>
              <RefreshCw size={16} className={aiLoading ? 'spinning' : ''} /> Regenerate
            </button>
          </>
        }
      >
        {aiLoading ? (<div className="loading"><div className="spinner"></div></div>) : (<div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiResponse}</div>)}
      </Modal>
    </div>
  );
};

export default Risks;
