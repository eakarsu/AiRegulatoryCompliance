import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, Send, Download, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { reportsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Reports = () => {
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
    title: '', description: '', report_type: '', status: 'draft', period_start: '', period_end: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required'],
    report_type: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching reports', 'error');
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
      const response = await reportsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching report details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({ title: '', description: '', report_type: '', status: 'draft', period_start: '', period_end: '' });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      period_start: item.period_start?.split('T')[0] || '',
      period_end: item.period_end?.split('T')[0] || ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await reportsAPI.delete(item.id);
        addToast('Report deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting report', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await reportsAPI.update(selectedItem.id, formData);
        addToast('Report updated successfully', 'success');
      } else {
        await reportsAPI.create(formData);
        addToast('Report created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving report', 'error');
    }
  };

  const handlePublish = async (item, e) => {
    if (e) e.stopPropagation();
    try {
      await reportsAPI.publish(item.id);
      addToast('Report published successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error publishing report', 'error');
    }
  };

  const handleAIGenerate = async () => {
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      const res = await reportsAPI.generate('quarterly_compliance', startDate, endDate);
      setAIResponse(res.data.generatedReport);
    } catch (e) {
      setAIResponse('Error generating report.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected reports?`)) {
      try {
        for (const id of selectedIds) {
          await reportsAPI.delete(id);
        }
        addToast(`${selectedIds.length} reports deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting reports', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await reportsAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} reports updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating reports', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('reports');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (s) => ({ published: 'badge-success', draft: 'badge-warning' }[s] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Generate and manage compliance reports</p>
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
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and manage compliance reports</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={handleAIGenerate}>
            <Bot size={18} /> AI Generate
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> New Report
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search reports..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'draft' })}>
                Set Draft
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'published' })}>
                Set Published
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
                <th className={`sortable ${sortBy === 'report_type' ? 'active' : ''}`} onClick={() => handleSort('report_type')}>
                  Type <SortIcon column="report_type" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'period_start' ? 'active' : ''}`} onClick={() => handleSort('period_start')}>
                  Period <SortIcon column="period_start" />
                </th>
                <th className={`sortable ${sortBy === 'generated_by_name' ? 'active' : ''}`} onClick={() => handleSort('generated_by_name')}>
                  Generated By <SortIcon column="generated_by_name" />
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
                  <td>{item.report_type}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{item.period_start && item.period_end ? `${new Date(item.period_start).toLocaleDateString()} - ${new Date(item.period_end).toLocaleDateString()}` : '-'}</td>
                  <td>{item.generated_by_name || '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleAIGenerate(); }} title="AI Analyze"><Bot size={16} /></button>
                      {item.status === 'draft' && <button className="icon-btn" onClick={(e) => handlePublish(item, e)} title="Publish"><Send size={16} /></button>}
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Report Details'}
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
              <div className="detail-item"><div className="detail-label">Report Type</div><div className="detail-value">{selectedItem.report_type}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Period</div><div className="detail-value">{selectedItem.period_start ? new Date(selectedItem.period_start).toLocaleDateString() : '-'} - {selectedItem.period_end ? new Date(selectedItem.period_end).toLocaleDateString() : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Generated By</div><div className="detail-value">{selectedItem.generated_by_name || '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.content && <div className="detail-section"><h3>Content</h3><pre style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', overflow: 'auto' }}>{JSON.stringify(selectedItem.content, null, 2)}</pre></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Report' : 'New Report'}
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
              <label className="form-label">Report Type *</label>
              <select className={`form-select ${touched.report_type && errors.report_type ? 'error' : ''}`} value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                onBlur={() => touchField('report_type', formData.report_type)}>
                <option value="">Select...</option>
                <option value="quarterly_compliance">Quarterly Compliance</option>
                <option value="annual_risk">Annual Risk</option>
                <option value="regulatory">Regulatory</option>
                <option value="executive">Executive</option>
              </select>
              {touched.report_type && errors.report_type && <div className="form-error">{errors.report_type}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Period Start</label>
              <input type="date" className="form-input" value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Period End</label>
              <input type="date" className="form-input" value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI Generated Report"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading}>
              <RefreshCw size={16} className={aiLoading ? 'spinning' : ''} /> Regenerate
            </button>
          </>
        }
      >
        {aiLoading ? <div className="loading"><div className="spinner"></div></div> : <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiResponse}</div>}
      </Modal>
    </div>
  );
};

export default Reports;
