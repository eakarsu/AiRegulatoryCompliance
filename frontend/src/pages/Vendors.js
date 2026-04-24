import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Bot, RefreshCw, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { vendorsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const Vendors = () => {
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
    name: '', contact_email: '', contact_phone: '', address: '',
    category: '', risk_rating: 'medium', compliance_status: 'pending_review',
    contract_start: '', contract_end: '', notes: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    name: ['required'],
    contact_email: ['email']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorsAPI.getAll({ search, sortBy, sortOrder, page, limit });
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching vendors', 'error');
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
      const response = await vendorsAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching details', 'error');
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '', contact_email: '', contact_phone: '', address: '',
      category: '', risk_rating: 'medium', compliance_status: 'pending_review',
      contract_start: '', contract_end: '', notes: ''
    });
    setSelectedItem(null);
    setShowFormModal(true);
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      ...item,
      contract_start: item.contract_start?.split('T')[0] || '',
      contract_end: item.contract_end?.split('T')[0] || ''
    });
    setSelectedItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await vendorsAPI.delete(item.id);
        addToast('Vendor deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting vendor', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(formData)) return;
    try {
      if (selectedItem) {
        await vendorsAPI.update(selectedItem.id, formData);
        addToast('Vendor updated successfully', 'success');
      } else {
        await vendorsAPI.create(formData);
        addToast('Vendor created successfully', 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      addToast('Error saving vendor', 'error');
    }
  };

  const handleAIAssess = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await vendorsAPI.assess(item.id);
      setAIResponse(response.data.assessment);
    } catch (error) {
      setAIResponse('Error getting AI assessment. Please check your OpenRouter API key.');
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
    if (window.confirm(`Delete ${selectedIds.length} selected vendors?`)) {
      try {
        await vendorsAPI.bulkDelete(selectedIds);
        addToast(`${selectedIds.length} vendors deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting vendors', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await vendorsAPI.bulkUpdate(selectedIds, updates);
      addToast(`${selectedIds.length} vendors updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating vendors', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('vendors');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vendors.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getComplianceBadge = (s) => ({ compliant: 'badge-success', non_compliant: 'badge-danger', pending_review: 'badge-warning' }[s] || 'badge-secondary');
  const getRiskBadge = (r) => ({ high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' }[r] || 'badge-secondary');

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Vendors</h1>
            <p className="page-subtitle">Manage third-party vendor compliance</p>
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
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manage third-party vendor compliance</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search vendors..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'compliant' })}>
                Set Compliant
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'non_compliant' })}>
                Set Non-Compliant
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
                <th className={`sortable ${sortBy === 'category' ? 'active' : ''}`} onClick={() => handleSort('category')}>
                  Category <SortIcon column="category" />
                </th>
                <th className={`sortable ${sortBy === 'risk_rating' ? 'active' : ''}`} onClick={() => handleSort('risk_rating')}>
                  Risk Rating <SortIcon column="risk_rating" />
                </th>
                <th className={`sortable ${sortBy === 'compliance_status' ? 'active' : ''}`} onClick={() => handleSort('compliance_status')}>
                  Compliance <SortIcon column="compliance_status" />
                </th>
                <th className={`sortable ${sortBy === 'contract_end' ? 'active' : ''}`} onClick={() => handleSort('contract_end')}>
                  Contract End <SortIcon column="contract_end" />
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
                  <td>{item.category}</td>
                  <td><span className={`badge ${getRiskBadge(item.risk_rating)}`}>{item.risk_rating}</span></td>
                  <td><span className={`badge ${getComplianceBadge(item.compliance_status)}`}>{item.compliance_status?.replace('_', ' ')}</span></td>
                  <td>{item.contract_end ? new Date(item.contract_end).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleEdit(item, e)} title="Edit"><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIAssess(item, e)} title="AI Assess"><Bot size={16} /></button>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.name || 'Vendor Details'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEdit(selectedItem); }}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleDelete(selectedItem); }}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn btn-ai" onClick={() => { setShowDetailModal(false); handleAIAssess(selectedItem); }}>
              <Bot size={16} /> AI Assess
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Contact Email</div><div className="detail-value">{selectedItem.contact_email || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Contact Phone</div><div className="detail-value">{selectedItem.contact_phone || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selectedItem.category}</div></div>
              <div className="detail-item"><div className="detail-label">Risk Rating</div><div className="detail-value"><span className={`badge ${getRiskBadge(selectedItem.risk_rating)}`}>{selectedItem.risk_rating}</span></div></div>
              <div className="detail-item"><div className="detail-label">Compliance</div><div className="detail-value"><span className={`badge ${getComplianceBadge(selectedItem.compliance_status)}`}>{selectedItem.compliance_status?.replace('_', ' ')}</span></div></div>
              <div className="detail-item"><div className="detail-label">Contract Period</div><div className="detail-value">{selectedItem.contract_start ? new Date(selectedItem.contract_start).toLocaleDateString() : '-'} - {selectedItem.contract_end ? new Date(selectedItem.contract_end).toLocaleDateString() : '-'}</div></div>
            </div>
            {selectedItem.address && <div className="detail-section"><h3>Address</h3><p>{selectedItem.address}</p></div>}
            {selectedItem.notes && <div className="detail-section"><h3>Notes</h3><p>{selectedItem.notes}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={selectedItem ? 'Edit Vendor' : 'Add Vendor'}
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
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              onBlur={() => touchField('name', formData.name)} />
            {touched.name && errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="detail-grid">
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input type="email" className={`form-input ${touched.contact_email && errors.contact_email ? 'error' : ''}`} value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                onBlur={() => touchField('contact_email', formData.contact_email)} />
              {touched.contact_email && errors.contact_email && <div className="form-error">{errors.contact_email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input type="text" className="form-input" value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input type="text" className="form-input" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Risk Rating</label>
              <select className="form-select" value={formData.risk_rating} onChange={(e) => setFormData({...formData, risk_rating: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Compliance Status</label>
              <select className="form-select" value={formData.compliance_status} onChange={(e) => setFormData({...formData, compliance_status: e.target.value})}>
                <option value="pending_review">Pending Review</option>
                <option value="compliant">Compliant</option>
                <option value="non_compliant">Non-Compliant</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contract Start</label>
              <input type="date" className="form-input" value={formData.contract_start} onChange={(e) => setFormData({...formData, contract_start: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Contract End</label>
              <input type="date" className="form-input" value={formData.contract_end} onChange={(e) => setFormData({...formData, contract_end: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title={`AI Assessment: ${selectedItem?.name || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => handleAIAssess(selectedItem)} disabled={aiLoading}>
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

export default Vendors;
