import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, RefreshCw, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { incidentsAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Incidents = () => {
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
    title: '', description: '', incident_type: '', severity: 'medium',
    status: 'open', assigned_to: '', resolution: '', occurred_at: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required'],
    incident_type: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [response, usersRes] = await Promise.all([
        incidentsAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
      setUsers(usersRes.data.data || usersRes.data);
    } catch (error) {
      addToast('Error fetching incidents', 'error');
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
      const response = await incidentsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '', description: '', incident_type: '', severity: 'medium',
      status: 'open', assigned_to: '', resolution: '',
      occurred_at: new Date().toISOString().slice(0, 16)
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      occurred_at: item.occurred_at?.slice(0, 16) || ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await incidentsAPI.delete(item.id);
        addToast('Incident deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting incident', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await incidentsAPI.update(selectedItem.id, formData);
        addToast('Incident updated successfully', 'success');
      } else {
        await incidentsAPI.create(formData);
        addToast('Incident created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving incident', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await incidentsAPI.analyze(item.id);
      setAIResponse(response.data.analysis);
    } catch (error) {
      setAIResponse('Error getting AI analysis. Please check your OpenRouter API key.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected incidents?`)) {
      try {
        await incidentsAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} incidents deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting incidents', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await incidentsAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} incidents updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating incidents', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('incidents');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'incidents.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (s) => ({ open: 'badge-danger', investigating: 'badge-warning', resolved: 'badge-success' }[s] || 'badge-secondary');
  const getSeverityBadge = (s) => ({ critical: 'badge-danger', high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' }[s] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Incidents</h1>
            <p className="page-subtitle">Track and manage security incidents</p>
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
          <h1 className="page-title">Incidents</h1>
          <p className="page-subtitle">Track and manage security incidents</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Report Incident
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search incidents..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'open' })}>
                Set Open
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'resolved' })}>
                Set Resolved
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
                <th className={`sortable ${sortBy === 'incident_type' ? 'active' : ''}`} onClick={() => handleSort('incident_type')}>
                  Type <SortIcon column="incident_type" />
                </th>
                <th className={`sortable ${sortBy === 'severity' ? 'active' : ''}`} onClick={() => handleSort('severity')}>
                  Severity <SortIcon column="severity" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'assigned_to' ? 'active' : ''}`} onClick={() => handleSort('assigned_to')}>
                  Assigned To <SortIcon column="assigned_to" />
                </th>
                <th className={`sortable ${sortBy === 'occurred_at' ? 'active' : ''}`} onClick={() => handleSort('occurred_at')}>
                  Occurred <SortIcon column="occurred_at" />
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
                  <td>{item.incident_type}</td>
                  <td><span className={`badge ${getSeverityBadge(item.severity)}`}>{item.severity}</span></td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{item.assigned_to_name || '-'}</td>
                  <td>{item.occurred_at ? new Date(item.occurred_at).toLocaleString() : '-'}</td>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Incident Details'}
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
              <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selectedItem.incident_type}</div></div>
              <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value"><span className={`badge ${getSeverityBadge(selectedItem.severity)}`}>{selectedItem.severity}</span></div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selectedItem.assigned_to_name || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Occurred At</div><div className="detail-value">{selectedItem.occurred_at ? new Date(selectedItem.occurred_at).toLocaleString() : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Resolved At</div><div className="detail-value">{selectedItem.resolved_at ? new Date(selectedItem.resolved_at).toLocaleString() : '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.resolution && <div className="detail-section"><h3>Resolution</h3><p>{selectedItem.resolution}</p></div>}
            {selectedItem.ai_recommendation && <div className="detail-section"><h3>AI Recommendation</h3><p style={{whiteSpace: 'pre-wrap'}}>{selectedItem.ai_recommendation}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Incident' : 'Report Incident'}
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
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              onBlur={() => touchField('title', formData.title)} />
            {touched.title && errors.title && <div className="form-error">{errors.title}</div>}
          </div>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className={`form-select ${touched.incident_type && errors.incident_type ? 'error' : ''}`} value={formData.incident_type}
                onChange={(e) => setFormData({...formData, incident_type: e.target.value})}
                onBlur={() => touchField('incident_type', formData.incident_type)}>
                <option value="">Select...</option>
                <option value="phishing">Phishing</option>
                <option value="malware">Malware</option>
                <option value="data_breach">Data Breach</option>
                <option value="unauthorized_access">Unauthorized Access</option>
                <option value="policy_violation">Policy Violation</option>
                <option value="other">Other</option>
              </select>
              {touched.incident_type && errors.incident_type && <div className="form-error">{errors.incident_type}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select className="form-select" value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-select" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}>
                <option value="">Select...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Occurred At</label>
              <input type="datetime-local" className="form-input" value={formData.occurred_at} onChange={(e) => setFormData({...formData, occurred_at: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Resolution</label>
            <textarea className="form-textarea" value={formData.resolution} onChange={(e) => setFormData({...formData, resolution: e.target.value})} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Analysis: ${selectedItem?.title || ''}`}
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

export default Incidents;
