import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { frameworksAPI, aiAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Frameworks = () => {
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
    name: '', description: '', framework_type: '', version: '', status: 'active'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    name: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await frameworksAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching frameworks', 'error');
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
      const response = await frameworksAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching framework details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', framework_type: '', version: '', status: 'active' });
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
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await frameworksAPI.delete(item.id);
        addToast('Framework deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting framework', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await frameworksAPI.update(selectedItem.id, formData);
        addToast('Framework updated successfully', 'success');
      } else {
        await frameworksAPI.create(formData);
        addToast('Framework created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving framework', 'error');
    }
  };

  const handleAIExplain = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await aiAPI.chat(`Explain the ${item.name} control framework in detail:\n\nType: ${item.framework_type}\nVersion: ${item.version}\nDescription: ${item.description}\n\nProvide:\n1. Overview and purpose\n2. Key control domains\n3. Implementation requirements\n4. Certification process\n5. Benefits and best practices`, []);
      setAIResponse(response.data.response);
    } catch (error) {
      setAIResponse('Error with AI explanation.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected frameworks?`)) {
      try {
        for (const id of selectedIds) {
          await frameworksAPI.delete(id);
        }
        addToast(`${selectedIds.length} frameworks deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting frameworks', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await frameworksAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} frameworks updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating frameworks', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('frameworks');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'frameworks.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (s) => ({ active: 'badge-success', inactive: 'badge-secondary' }[s] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Control Frameworks</h1>
            <p className="page-subtitle">Manage compliance control frameworks</p>
          </div>
        </div>
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control Frameworks</h1>
          <p className="page-subtitle">Manage compliance control frameworks</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add Framework
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search frameworks..." />
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
                  <input type="checkbox" className="bulk-checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}>
                  Name <SortIcon column="name" />
                </th>
                <th className={`sortable ${sortBy === 'framework_type' ? 'active' : ''}`} onClick={() => handleSort('framework_type')}>
                  Type <SortIcon column="framework_type" />
                </th>
                <th className={`sortable ${sortBy === 'version' ? 'active' : ''}`} onClick={() => handleSort('version')}>
                  Version <SortIcon column="version" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
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
                  <td><strong>{item.name}</strong></td>
                  <td>{item.framework_type}</td>
                  <td>{item.version}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.name || 'Framework Details'}
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
              <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selectedItem.framework_type}</div></div>
              <div className="detail-item"><div className="detail-label">Version</div><div className="detail-value">{selectedItem.version}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
            {selectedItem.controls && (
              <div className="detail-section">
                <h3>Controls</h3>
                <pre style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '300px' }}>
                  {JSON.stringify(selectedItem.controls, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Framework' : 'Add Framework'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input type="text" className={`form-input ${touched.name && errors.name ? 'error' : ''}`} value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={() => touchField('name', formData.name)} />
            {touched.name && errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={formData.framework_type} onChange={(e) => setFormData({ ...formData, framework_type: e.target.value })}>
                <option value="">Select...</option>
                <option value="security">Security</option>
                <option value="privacy">Privacy</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="governance">Governance</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
                <option value="ai">AI</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Version</label>
              <input type="text" className="form-input" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Explanation: ${selectedItem?.name || ''}`}>
        {aiLoading ? (<div className="loading"><div className="spinner"></div></div>) : (<div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiResponse}</div>)}
      </Modal>
    </div>
  );
};

export default Frameworks;
