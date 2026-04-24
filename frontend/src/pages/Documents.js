import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, CheckCircle, RefreshCw, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { documentsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Documents = () => {
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
    title: '', description: '', file_path: '', file_type: '', category: '', status: 'pending_review'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required'],
    category: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentsAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching documents', 'error');
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
      const response = await documentsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '', description: '', file_path: '', file_type: '', category: '', status: 'pending_review'
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
        await documentsAPI.delete(item.id);
        addToast('Document deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting document', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await documentsAPI.update(selectedItem.id, formData);
        addToast('Document updated successfully', 'success');
      } else {
        await documentsAPI.create(formData);
        addToast('Document created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving document', 'error');
    }
  };

  const handleApprove = async (item, e) => {
    if (e) e.stopPropagation();
    try {
      await documentsAPI.approve(item.id);
      addToast('Document approved successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error approving document', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await documentsAPI.analyze(item.id);
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
    if (window.confirm(`Delete ${selectedIds.length} selected documents?`)) {
      try {
        await documentsAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} documents deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting documents', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await documentsAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} documents updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating documents', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('documents');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'documents.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = { approved: 'badge-success', pending_review: 'badge-warning', draft: 'badge-secondary', rejected: 'badge-danger' };
    return badges[status] || 'badge-secondary';
  };

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Documents</h1>
            <p className="page-subtitle">Manage compliance documents</p>
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
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Manage compliance documents</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add Document
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search documents..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'approved' })}>
                Set Approved
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'pending_review' })}>
                Set Pending
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'draft' })}>
                Set Draft
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
                <th className={`sortable ${sortBy === 'category' ? 'active' : ''}`} onClick={() => handleSort('category')}>
                  Category <SortIcon column="category" />
                </th>
                <th className={`sortable ${sortBy === 'file_type' ? 'active' : ''}`} onClick={() => handleSort('file_type')}>
                  Type <SortIcon column="file_type" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'ai_compliance_score' ? 'active' : ''}`} onClick={() => handleSort('ai_compliance_score')}>
                  AI Score <SortIcon column="ai_compliance_score" />
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
                  <td>{item.category}</td>
                  <td>{item.file_type}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status?.replace('_', ' ')}</span></td>
                  <td>{item.ai_compliance_score ? `${item.ai_compliance_score}%` : '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIAnalyze(item, e)} title="AI Analyze"><Bot size={16} /></button>
                      {item.status === 'pending_review' && <button className="icon-btn" onClick={(e) => handleApprove(item, e)} title="Approve"><CheckCircle size={16} /></button>}
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Document Details'}
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
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
              <div className="detail-item"><div className="detail-label">File Type</div><div className="detail-value">{selectedItem.file_type}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status?.replace('_', ' ')}</span></div></div>
              <div className="detail-item"><div className="detail-label">AI Compliance Score</div><div className="detail-value" style={{ fontSize: '1.5rem', fontWeight: '600', color: selectedItem.ai_compliance_score >= 80 ? '#10b981' : '#f59e0b' }}>{selectedItem.ai_compliance_score ? `${selectedItem.ai_compliance_score}%` : '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.ai_summary && <div className="detail-section"><h3>AI Summary</h3><p style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.ai_summary}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Document' : 'Add Document'}
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
              <label className="form-label">Category *</label>
              <input type="text" className={`form-input ${touched.category && errors.category ? 'error' : ''}`} value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                onBlur={() => touchField('category', formData.category)} />
              {touched.category && errors.category && <div className="form-error">{errors.category}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">File Type</label>
              <input type="text" className="form-input" placeholder="pdf, docx, etc." value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">File Path</label>
              <input type="text" className="form-input" value={formData.file_path} onChange={(e) => setFormData({ ...formData, file_path: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Document Analysis: ${selectedItem?.title || ''}`}
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

export default Documents;
