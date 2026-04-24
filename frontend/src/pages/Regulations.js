import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, RefreshCw, Download, ArrowUp, ArrowDown, CheckSquare } from 'lucide-react';
import { regulationsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Regulations = () => {
  const [regulations, setRegulations] = useState([]);
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
    name: '', code: '', description: '', category: '', jurisdiction: '',
    effective_date: '', status: 'active', requirements: '', penalties: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    name: ['required'],
    code: ['required'],
    category: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await regulationsAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setRegulations(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching regulations', 'error');
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
      const response = await regulationsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '', code: '', description: '', category: '', jurisdiction: '',
      effective_date: '', status: 'active', requirements: '', penalties: ''
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      effective_date: item.effective_date?.split('T')[0] || '',
      requirements: Array.isArray(item.requirements) ? item.requirements.join('\n') : ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await regulationsAPI.delete(item.id);
        addToast('Regulation deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting regulation', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      const submitData = {
        ...formData,
        requirements: formData.requirements.split('\n').filter(r => r.trim())
      };
      if (selectedItem) {
        await regulationsAPI.update(selectedItem.id, submitData);
        addToast('Regulation updated successfully', 'success');
      } else {
        await regulationsAPI.create(submitData);
        addToast('Regulation created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving regulation', 'error');
    }
  };

  const handleAIExplain = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await regulationsAPI.explain(item.id);
      setAIResponse(response.data.explanation);
    } catch (error) {
      setAIResponse('Error getting AI explanation. Please check your OpenRouter API key.');
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
    if (selectedIds.length === regulations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(regulations.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected regulations?`)) {
      try {
        await regulationsAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} regulations deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting regulations', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await regulationsAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} regulations updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating regulations', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('regulations');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'regulations.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = { active: 'badge-success', inactive: 'badge-secondary', pending: 'badge-warning' };
    return badges[status] || 'badge-secondary';
  };

  if (loading && regulations.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Regulations</h1>
            <p className="page-subtitle">Manage regulatory frameworks and requirements</p>
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
          <h1 className="page-title">Regulations</h1>
          <p className="page-subtitle">Manage regulatory frameworks and requirements</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add Regulation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search regulations..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'active' })}>
                Set Active
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'inactive' })}>
                Set Inactive
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="bulk-checkbox" checked={regulations.length > 0 && selectedIds.length === regulations.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'code' ? 'active' : ''}`} onClick={() => handleSort('code')}>
                  Code <SortIcon column="code" />
                </th>
                <th className={`sortable ${sortBy === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}>
                  Name <SortIcon column="name" />
                </th>
                <th className={`sortable ${sortBy === 'category' ? 'active' : ''}`} onClick={() => handleSort('category')}>
                  Category <SortIcon column="category" />
                </th>
                <th className={`sortable ${sortBy === 'jurisdiction' ? 'active' : ''}`} onClick={() => handleSort('jurisdiction')}>
                  Jurisdiction <SortIcon column="jurisdiction" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'effective_date' ? 'active' : ''}`} onClick={() => handleSort('effective_date')}>
                  Effective Date <SortIcon column="effective_date" />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {regulations.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e)} />
                  </td>
                  <td><strong>{item.code}</strong></td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.jurisdiction}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>{item.effective_date ? new Date(item.effective_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIExplain(item, e)} title="AI Explain"><Bot size={16} /></button>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.name || 'Regulation Details'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEdit(selectedItem); }}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn btn-ai" onClick={() => { setShowDetailModal(false); handleAIExplain(selectedItem); }}>
              <Bot size={16} /> AI Explain
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Code</div><div className="detail-value">{selectedItem.code}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
              <div className="detail-item"><div className="detail-label">Jurisdiction</div><div className="detail-value">{selectedItem.jurisdiction}</div></div>
              <div className="detail-item"><div className="detail-label">Effective Date</div><div className="detail-value">{selectedItem.effective_date ? new Date(selectedItem.effective_date).toLocaleDateString() : '-'}</div></div>
            </div>
            <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>
            {selectedItem.requirements?.length > 0 && (
              <div className="detail-section"><h3>Requirements</h3>
                <ul style={{ paddingLeft: '20px' }}>{selectedItem.requirements.map((req, idx) => (<li key={idx} style={{ marginBottom: '4px' }}>{req}</li>))}</ul>
              </div>
            )}
            {selectedItem.penalties && (<div className="detail-section"><h3>Penalties</h3><p>{selectedItem.penalties}</p></div>)}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Regulation' : 'Add New Regulation'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input type="text" className={`form-input ${touched.name && errors.name ? 'error' : ''}`} value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => touchField('name', formData.name)} />
              {touched.name && errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input type="text" className={`form-input ${touched.code && errors.code ? 'error' : ''}`} value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                onBlur={() => touchField('code', formData.code)} />
              {touched.code && errors.code && <div className="form-error">{errors.code}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <input type="text" className={`form-input ${touched.category && errors.category ? 'error' : ''}`} value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                onBlur={() => touchField('category', formData.category)} />
              {touched.category && errors.category && <div className="form-error">{errors.category}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Jurisdiction</label>
              <input type="text" className="form-input" value={formData.jurisdiction} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input type="date" className="form-input" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Requirements (one per line)</label>
            <textarea className="form-textarea" value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} placeholder="Enter each requirement on a new line" />
          </div>
          <div className="form-group">
            <label className="form-label">Penalties</label>
            <textarea className="form-textarea" value={formData.penalties} onChange={(e) => setFormData({ ...formData, penalties: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Analysis: ${selectedItem?.name || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => handleAIExplain(selectedItem)} disabled={aiLoading}>
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

export default Regulations;
