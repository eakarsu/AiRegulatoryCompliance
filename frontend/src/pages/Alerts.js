import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, CheckCircle, Bell, Bot, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { alertsAPI, aiAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Alerts = () => {
  const [items, setItems] = useState([]);
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
    title: '', message: '', type: 'warning', severity: 'medium', status: 'active'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required'],
    message: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await alertsAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching alerts', 'error');
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
      const response = await alertsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({ title: '', message: '', type: 'warning', severity: 'medium', status: 'active' });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({ ...item });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete "${item.title}"?`)) {
      try {
        await alertsAPI.delete(item.id);
        addToast('Alert deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting alert', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await alertsAPI.update(selectedItem.id, formData);
        addToast('Alert updated successfully', 'success');
      } else {
        await alertsAPI.create(formData);
        addToast('Alert created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving alert', 'error');
    }
  };

  const handleMarkRead = async (item, e) => {
    e.stopPropagation();
    try {
      await alertsAPI.markRead(item.id);
      addToast('Alert marked as read', 'success');
      fetchData();
    } catch (error) {
      addToast('Error marking alert as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsAPI.markAllRead();
      addToast('All alerts marked as read', 'success');
      fetchData();
    } catch (error) {
      addToast('Error marking all alerts as read', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await aiAPI.chat(`Analyze this compliance alert and provide recommendations:\n\nTitle: ${item.title}\nType: ${item.type}\nSeverity: ${item.severity}\nMessage: ${item.message}\n\nProvide:\n1. Risk assessment\n2. Immediate actions needed\n3. Long-term recommendations\n4. Escalation requirements`, []);
      setAIResponse(response.data.response);
      addToast('AI analysis completed', 'success');
    } catch (error) {
      setAIResponse('Error with AI analysis.');
      addToast('Error with AI analysis', 'error');
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
    if (window.confirm(`Delete ${selectedIds.length} selected alerts?`)) {
      try {
        // alertsAPI does not have bulkDelete, so delete individually
        await Promise.all(selectedIds.map(id => alertsAPI.delete(id)));
        addToast(`${selectedIds.length} alerts deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting alerts', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      // alertsAPI does not have bulkUpdate, so update individually
      await Promise.all(selectedIds.map(id => alertsAPI.update(id, updates)));
      addToast(`${selectedIds.length} alerts updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating alerts', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('alerts');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'alerts.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getSeverityBadge = (s) => ({ critical: 'badge-danger', high: 'badge-danger', medium: 'badge-warning', low: 'badge-info' }[s] || 'badge-secondary');
  const getStatusBadge = (s) => ({ active: 'badge-warning', read: 'badge-secondary' }[s] || 'badge-secondary');
  const getTypeIcon = (type) => { const colors = { security: '#ef4444', warning: '#f59e0b', deadline: '#3b82f6', incident: '#dc2626', review: '#8b5cf6' }; return colors[type] || '#6b7280'; };

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">Monitor compliance alerts and notifications</p>
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
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Monitor compliance alerts and notifications</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            <CheckCircle size={18} /> Mark All Read
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> New Alert
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search alerts..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'read' })}>
                Mark Read
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ severity: 'low' })}>
                Set Low Severity
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
                  Alert <SortIcon column="title" />
                </th>
                <th className={`sortable ${sortBy === 'type' ? 'active' : ''}`} onClick={() => handleSort('type')}>
                  Type <SortIcon column="type" />
                </th>
                <th className={`sortable ${sortBy === 'severity' ? 'active' : ''}`} onClick={() => handleSort('severity')}>
                  Severity <SortIcon column="severity" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'created_at' ? 'active' : ''}`} onClick={() => handleSort('created_at')}>
                  Created <SortIcon column="created_at" />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} style={{opacity: item.status === 'read' ? 0.6 : 1}}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e)} />
                  </td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <Bell size={18} color={getTypeIcon(item.type)} />
                      <div>
                        <strong>{item.title}</strong>
                        <div style={{fontSize: '0.8rem', color: '#6b7280'}}>{item.message?.substring(0, 60)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>{item.type}</td>
                  <td><span className={`badge ${getSeverityBadge(item.severity)}`}>{item.severity}</span></td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIAnalyze(item, e)} title="AI Analyze"><Bot size={16} /></button>
                      {item.status === 'active' && <button className="icon-btn" onClick={(e) => handleMarkRead(item, e)} title="Mark Read"><CheckCircle size={16} /></button>}
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Alert Details'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEdit(selectedItem); }}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selectedItem.type}</div></div>
              <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value"><span className={`badge ${getSeverityBadge(selectedItem.severity)}`}>{selectedItem.severity}</span></div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{new Date(selectedItem.created_at).toLocaleString()}</div></div>
              {selectedItem.related_entity_type && <div className="detail-item"><div className="detail-label">Related To</div><div className="detail-value">{selectedItem.related_entity_type} #{selectedItem.related_entity_id}</div></div>}
            </div>
            <div className="detail-section"><h3>Message</h3><p>{selectedItem.message}</p></div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Alert' : 'New Alert'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{selectedItem ? 'Save' : 'Create'}</button>
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
              <label className="form-label">Type</label>
              <select className="form-select" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                <option value="warning">Warning</option>
                <option value="security">Security</option>
                <option value="deadline">Deadline</option>
                <option value="incident">Incident</option>
                <option value="review">Review</option>
              </select>
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
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className={`form-textarea ${touched.message && errors.message ? 'error' : ''}`} value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              onBlur={() => touchField('message', formData.message)} />
            {touched.message && errors.message && <div className="form-error">{errors.message}</div>}
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI Alert Analysis">
        {aiLoading ? <div className="loading"><div className="spinner"></div></div> : <div style={{whiteSpace: 'pre-wrap'}}>{aiResponse}</div>}
      </Modal>
    </div>
  );
};

export default Alerts;
