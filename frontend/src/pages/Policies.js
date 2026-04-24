import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, RefreshCw, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { policiesAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Policies = () => {
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
    title: '', description: '', content: '', category: '', version: '1.0',
    status: 'draft', effective_date: '', review_date: '', owner_id: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    title: ['required'],
    category: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, usersRes] = await Promise.all([
        policiesAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      setItems(itemsRes.data.data || itemsRes.data);
      setTotal(itemsRes.data.total || itemsRes.data.length);
      setTotalPages(itemsRes.data.totalPages || Math.ceil((itemsRes.data.total || itemsRes.data.length) / limit));
      setUsers(usersRes.data.data || usersRes.data);
    } catch (error) {
      addToast('Error fetching policies', 'error');
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
      const response = await policiesAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '', description: '', content: '', category: '', version: '1.0',
      status: 'draft', effective_date: '', review_date: '', owner_id: ''
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      effective_date: item.effective_date?.split('T')[0] || '',
      review_date: item.review_date?.split('T')[0] || ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await policiesAPI.delete(item.id);
        addToast('Policy deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting policy', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await policiesAPI.update(selectedItem.id, formData);
        addToast('Policy updated successfully', 'success');
      } else {
        await policiesAPI.create(formData);
        addToast('Policy created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving policy', 'error');
    }
  };

  const handleAIReview = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await policiesAPI.review(item.id);
      setAIResponse(response.data.review);
    } catch (error) {
      setAIResponse('Error getting AI review. Please check your OpenRouter API key.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected policies?`)) {
      try {
        await policiesAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} policies deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting policies', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await policiesAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} policies updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating policies', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('policies');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'policies.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = { active: 'badge-success', draft: 'badge-warning', archived: 'badge-secondary' };
    return badges[status] || 'badge-secondary';
  };

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Policies</h1>
            <p className="page-subtitle">Manage compliance policies and procedures</p>
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
          <h1 className="page-title">Policies</h1>
          <p className="page-subtitle">Manage compliance policies and procedures</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> New Policy
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search policies..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'active' })}>
                Set Active
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'draft' })}>
                Set Draft
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'archived' })}>
                Set Archived
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
                <th className={`sortable ${sortBy === 'version' ? 'active' : ''}`} onClick={() => handleSort('version')}>
                  Version <SortIcon column="version" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'review_date' ? 'active' : ''}`} onClick={() => handleSort('review_date')}>
                  Review Date <SortIcon column="review_date" />
                </th>
                <th className={`sortable ${sortBy === 'owner_name' ? 'active' : ''}`} onClick={() => handleSort('owner_name')}>
                  Owner <SortIcon column="owner_name" />
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
                  <td>{item.version}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{item.review_date ? new Date(item.review_date).toLocaleDateString() : '-'}</td>
                  <td>{item.owner_name || '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIReview(item, e)} title="AI Review"><Bot size={16} /></button>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.title || 'Policy Details'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEdit(selectedItem); }}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn btn-ai" onClick={() => { setShowDetailModal(false); handleAIReview(selectedItem); }}>
              <Bot size={16} /> AI Review
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
              <div className="detail-item"><div className="detail-label">Version</div><div className="detail-value">{selectedItem.version}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Owner</div><div className="detail-value">{selectedItem.owner_name || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Effective Date</div><div className="detail-value">{selectedItem.effective_date ? new Date(selectedItem.effective_date).toLocaleDateString() : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Review Date</div><div className="detail-value">{selectedItem.review_date ? new Date(selectedItem.review_date).toLocaleDateString() : '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.content && <div className="detail-section"><h3>Content</h3><p style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.content}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Policy' : 'New Policy'}
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
              <label className="form-label">Version</label>
              <input type="text" className="form-input" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Owner</label>
              <select className="form-select" value={formData.owner_id} onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}>
                <option value="">Select...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input type="date" className="form-input" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Review Date</label>
              <input type="date" className="form-input" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-textarea" style={{ minHeight: '200px' }} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Policy Review: ${selectedItem?.title || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => handleAIReview(selectedItem)} disabled={aiLoading}>
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

export default Policies;
