import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, Download, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { usersAPI, aiAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Users = () => {
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
    email: '', password: '', first_name: '', last_name: '', role: 'user'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    first_name: ['required'],
    last_name: ['required'],
    email: ['required', 'email']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching users', 'error');
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
      const response = await usersAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching user details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'user' });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({ ...item, password: '' });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete user "${item.email}"?`)) {
      try {
        await usersAPI.delete(item.id);
        addToast('User deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast(error.response?.data?.error || 'Error deleting user', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await usersAPI.update(selectedItem.id, formData);
        if (formData.password) await usersAPI.updatePassword(selectedItem.id, formData.password);
        addToast('User updated successfully', 'success');
      } else {
        await usersAPI.create(formData);
        addToast('User created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error saving user', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await aiAPI.chat(`Analyze this user's role and provide access recommendations for a compliance management system:\n\nUser: ${item.first_name} ${item.last_name}\nEmail: ${item.email}\nCurrent Role: ${item.role}\n\nProvide:\n1. Is the current role appropriate?\n2. Recommended permissions for this role\n3. Separation of duties considerations\n4. Access review recommendations\n5. Compliance implications`, []);
      setAIResponse(response.data.response);
    } catch (error) {
      setAIResponse('Error with AI analysis.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected users?`)) {
      try {
        for (const id of selectedIds) {
          await usersAPI.delete(id);
        }
        addToast(`${selectedIds.length} users deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting users', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await usersAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} users updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating users', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('users');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getRoleBadge = (role) => ({ admin: 'badge-danger', manager: 'badge-purple', compliance_officer: 'badge-info', auditor: 'badge-warning', analyst: 'badge-success', user: 'badge-secondary' }[role] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="page-subtitle">Manage system users and access</p>
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
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage system users and access</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search users..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ role: 'user' })}>
                Set User
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ role: 'analyst' })}>
                Set Analyst
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
                <th className={`sortable ${sortBy === 'first_name' ? 'active' : ''}`} onClick={() => handleSort('first_name')}>
                  Name <SortIcon column="first_name" />
                </th>
                <th className={`sortable ${sortBy === 'email' ? 'active' : ''}`} onClick={() => handleSort('email')}>
                  Email <SortIcon column="email" />
                </th>
                <th className={`sortable ${sortBy === 'role' ? 'active' : ''}`} onClick={() => handleSort('role')}>
                  Role <SortIcon column="role" />
                </th>
                <th className={`sortable ${sortBy === 'created_at' ? 'active' : ''}`} onClick={() => handleSort('created_at')}>
                  Created <SortIcon column="created_at" />
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
                  <td><strong>{item.first_name} {item.last_name}</strong></td>
                  <td>{item.email}</td>
                  <td><span className={`badge ${getRoleBadge(item.role)}`}>{item.role?.replace('_', ' ')}</span></td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem ? `${selectedItem.first_name} ${selectedItem.last_name}` : 'User Details'}
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
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selectedItem.email}</div></div>
            <div className="detail-item"><div className="detail-label">Role</div><div className="detail-value"><span className={`badge ${getRoleBadge(selectedItem.role)}`}>{selectedItem.role?.replace('_', ' ')}</span></div></div>
            <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{new Date(selectedItem.created_at).toLocaleString()}</div></div>
            <div className="detail-item"><div className="detail-label">Updated</div><div className="detail-value">{selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : '-'}</div></div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit User' : 'Add User'}
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
              <label className="form-label">First Name *</label>
              <input type="text" className={`form-input ${touched.first_name && errors.first_name ? 'error' : ''}`} value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                onBlur={() => touchField('first_name', formData.first_name)} />
              {touched.first_name && errors.first_name && <div className="form-error">{errors.first_name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input type="text" className={`form-input ${touched.last_name && errors.last_name ? 'error' : ''}`} value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                onBlur={() => touchField('last_name', formData.last_name)} />
              {touched.last_name && errors.last_name && <div className="form-error">{errors.last_name}</div>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" className={`form-input ${touched.email && errors.email ? 'error' : ''}`} value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onBlur={() => touchField('email', formData.email)} />
            {touched.email && errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">{selectedItem ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <input type="password" className="form-input" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!selectedItem} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
              <option value="user">User</option>
              <option value="analyst">Analyst</option>
              <option value="auditor">Auditor</option>
              <option value="compliance_officer">Compliance Officer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI User Analysis"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => handleAIAnalyze(selectedItem)} disabled={aiLoading}>
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

export default Users;
