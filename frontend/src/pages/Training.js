import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { trainingAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Training = () => {
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
    user_id: '', course_name: '', description: '', category: '',
    completion_status: 'not_started', score: '', expiry_date: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    course_name: ['required'],
    category: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, usersRes] = await Promise.all([
        trainingAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      setItems(itemsRes.data.data || itemsRes.data);
      setTotal(itemsRes.data.total || itemsRes.data.length);
      setTotalPages(itemsRes.data.totalPages || Math.ceil((itemsRes.data.total || itemsRes.data.length) / limit));
      setUsers(usersRes.data.data || usersRes.data);
    } catch (error) {
      addToast('Error fetching training records', 'error');
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
      const response = await trainingAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      user_id: '', course_name: '', description: '', category: '',
      completion_status: 'not_started', score: '', expiry_date: ''
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      expiry_date: item.expiry_date?.split('T')[0] || ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete "${item.course_name}"?`)) {
      try {
        await trainingAPI.delete(item.id);
        addToast('Training record deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting training record', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await trainingAPI.update(selectedItem.id, formData);
        addToast('Training record updated successfully', 'success');
      } else {
        await trainingAPI.create(formData);
        addToast('Training record created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving training record', 'error');
    }
  };

  const handleAIGenerate = async (topic) => {
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const res = await trainingAPI.generateContent(topic || 'GDPR Compliance', 'All Employees');
      setAIResponse(res.data.content);
      addToast('AI content generated successfully', 'success');
    } catch (error) {
      setAIResponse('Error generating content.');
      addToast('Error generating AI content', 'error');
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
    if (window.confirm(`Delete ${selectedIds.length} selected training records?`)) {
      try {
        // trainingAPI does not have bulkDelete, so delete individually
        await Promise.all(selectedIds.map(id => trainingAPI.delete(id)));
        addToast(`${selectedIds.length} training records deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting training records', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      // trainingAPI does not have bulkUpdate, so update individually
      await Promise.all(selectedIds.map(id => trainingAPI.update(id, updates)));
      addToast(`${selectedIds.length} training records updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating training records', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('training');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'training.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (s) => ({
    completed: 'badge-success', in_progress: 'badge-warning', not_started: 'badge-secondary'
  }[s] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Training Records</h1>
            <p className="page-subtitle">Track compliance training completion</p>
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
          <h1 className="page-title">Training Records</h1>
          <p className="page-subtitle">Track compliance training completion</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={() => handleAIGenerate()}>
            <Bot size={18} /> AI Training Content
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search training records..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ completion_status: 'completed' })}>
                Set Completed
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ completion_status: 'in_progress' })}>
                Set In Progress
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
                <th className={`sortable ${sortBy === 'course_name' ? 'active' : ''}`} onClick={() => handleSort('course_name')}>
                  Course <SortIcon column="course_name" />
                </th>
                <th className={`sortable ${sortBy === 'user_name' ? 'active' : ''}`} onClick={() => handleSort('user_name')}>
                  User <SortIcon column="user_name" />
                </th>
                <th className={`sortable ${sortBy === 'category' ? 'active' : ''}`} onClick={() => handleSort('category')}>
                  Category <SortIcon column="category" />
                </th>
                <th className={`sortable ${sortBy === 'completion_status' ? 'active' : ''}`} onClick={() => handleSort('completion_status')}>
                  Status <SortIcon column="completion_status" />
                </th>
                <th className={`sortable ${sortBy === 'score' ? 'active' : ''}`} onClick={() => handleSort('score')}>
                  Score <SortIcon column="score" />
                </th>
                <th className={`sortable ${sortBy === 'expiry_date' ? 'active' : ''}`} onClick={() => handleSort('expiry_date')}>
                  Expiry <SortIcon column="expiry_date" />
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
                  <td><strong>{item.course_name}</strong></td>
                  <td>{item.user_name || '-'}</td>
                  <td>{item.category}</td>
                  <td><span className={`badge ${getStatusBadge(item.completion_status)}`}>{item.completion_status?.replace('_', ' ')}</span></td>
                  <td>{item.score ? `${item.score}%` : '-'}</td>
                  <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleAIGenerate(item.course_name); }} title="AI Generate Content"><Bot size={16} /></button>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.course_name || 'Training Details'}
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
              <div className="detail-item"><div className="detail-label">User</div><div className="detail-value">{selectedItem.user_name}<br/><small>{selectedItem.user_email}</small></div></div>
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${getStatusBadge(selectedItem.completion_status)}`}>{selectedItem.completion_status?.replace('_', ' ')}</span></div></div>
              <div className="detail-item"><div className="detail-label">Score</div><div className="detail-value" style={{fontSize: '1.5rem', fontWeight: '600', color: selectedItem.score >= 80 ? '#10b981' : '#f59e0b'}}>{selectedItem.score ? `${selectedItem.score}%` : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Completed At</div><div className="detail-value">{selectedItem.completed_at ? new Date(selectedItem.completed_at).toLocaleString() : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Expiry Date</div><div className="detail-value">{selectedItem.expiry_date ? new Date(selectedItem.expiry_date).toLocaleDateString() : '-'}</div></div>
            </div>
            {selectedItem.description && <div className="detail-section"><h3>Description</h3><p>{selectedItem.description}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Record' : 'Add Record'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Course Name *</label>
            <input type="text" className={`form-input ${touched.course_name && errors.course_name ? 'error' : ''}`} value={formData.course_name}
              onChange={(e) => setFormData({...formData, course_name: e.target.value})}
              onBlur={() => touchField('course_name', formData.course_name)} />
            {touched.course_name && errors.course_name && <div className="form-error">{errors.course_name}</div>}
          </div>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">User</label>
              <select className="form-select" value={formData.user_id} onChange={(e) => setFormData({...formData, user_id: e.target.value})}>
                <option value="">Select...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <input type="text" className={`form-input ${touched.category && errors.category ? 'error' : ''}`} value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                onBlur={() => touchField('category', formData.category)} />
              {touched.category && errors.category && <div className="form-error">{errors.category}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.completion_status} onChange={(e) => setFormData({...formData, completion_status: e.target.value})}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Score (%)</label>
              <input type="number" className="form-input" min="0" max="100" value={formData.score} onChange={(e) => setFormData({...formData, score: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI Generated Training Content">
        {aiLoading ? <div className="loading"><div className="spinner"></div></div> : <div style={{whiteSpace: 'pre-wrap'}}>{aiResponse}</div>}
      </Modal>
    </div>
  );
};

export default Training;
