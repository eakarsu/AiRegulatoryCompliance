import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Download, Filter, Bot, ArrowUp, ArrowDown } from 'lucide-react';
import { auditAPI, aiAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';

const AuditTrail = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [filters, setFilters] = useState({ action: '', entity_type: '' });
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, sortBy, sortOrder, page, limit };
      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      const response = await auditAPI.getAll(params);
      setItems(response.data.data || response.data);
      setTotal(response.data.total || response.data.length);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / limit));
    } catch (error) {
      addToast('Error fetching audit trail', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, page, limit, filters, addToast]);

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
      const response = await auditAPI.getOne(item.id);
      setSelectedItem(response.data);
      setShowDetailModal(true);
    } catch (error) {
      addToast('Error fetching audit entry details', 'error');
    }
  };

  const handleAIAnalyze = async (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowAIModal(true);
    setAILoading(true);
    setAIResponse('');
    try {
      const response = await aiAPI.chat(`Analyze this audit log entry for security and compliance insights:\n\nAction: ${item.action}\nEntity Type: ${item.entity_type}\nEntity ID: ${item.entity_id}\nUser: ${item.user_name || item.user_email}\nIP Address: ${item.ip_address}\nTimestamp: ${item.created_at}\nDetails: ${JSON.stringify(item.details)}\n\nProvide:\n1. Security assessment\n2. Compliance implications\n3. Any anomalies or concerns\n4. Recommended follow-up actions`, []);
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

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('audit');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit-trail.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getActionBadge = (action) => {
    const badges = { CREATE: 'badge-success', UPDATE: 'badge-info', DELETE: 'badge-danger', VIEW: 'badge-secondary', LOGIN: 'badge-purple', LOGOUT: 'badge-secondary', EXPORT: 'badge-warning', APPROVE: 'badge-success' };
    return badges[action] || 'badge-secondary';
  };

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Audit Trail</h1>
            <p className="page-subtitle">Track all system activities and changes</p>
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
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Track all system activities and changes</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Filter size={18} />
          <select className="form-select" style={{ width: '200px' }} value={filters.action} onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="VIEW">View</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
          <select className="form-select" style={{ width: '200px' }} value={filters.entity_type} onChange={(e) => { setFilters({ ...filters, entity_type: e.target.value }); setPage(1); }}>
            <option value="">All Entity Types</option>
            <option value="user">User</option>
            <option value="regulation">Regulation</option>
            <option value="compliance_check">Compliance Check</option>
            <option value="risk_assessment">Risk Assessment</option>
            <option value="policy">Policy</option>
            <option value="document">Document</option>
            <option value="incident">Incident</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search audit trail..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
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
                <th className={`sortable ${sortBy === 'created_at' ? 'active' : ''}`} onClick={() => handleSort('created_at')}>
                  Time <SortIcon column="created_at" />
                </th>
                <th className={`sortable ${sortBy === 'action' ? 'active' : ''}`} onClick={() => handleSort('action')}>
                  Action <SortIcon column="action" />
                </th>
                <th className={`sortable ${sortBy === 'entity_type' ? 'active' : ''}`} onClick={() => handleSort('entity_type')}>
                  Entity Type <SortIcon column="entity_type" />
                </th>
                <th className={`sortable ${sortBy === 'entity_id' ? 'active' : ''}`} onClick={() => handleSort('entity_id')}>
                  Entity ID <SortIcon column="entity_id" />
                </th>
                <th className={`sortable ${sortBy === 'user_name' ? 'active' : ''}`} onClick={() => handleSort('user_name')}>
                  User <SortIcon column="user_name" />
                </th>
                <th className={`sortable ${sortBy === 'ip_address' ? 'active' : ''}`} onClick={() => handleSort('ip_address')}>
                  IP Address <SortIcon column="ip_address" />
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
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td><span className={`badge ${getActionBadge(item.action)}`}>{item.action}</span></td>
                  <td>{item.entity_type}</td>
                  <td>{item.entity_id || '-'}</td>
                  <td>{item.user_name || item.user_email}</td>
                  <td>{item.ip_address}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => handleRowClick(item)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn" onClick={(e) => handleAIAnalyze(item, e)} title="AI Analyze"><Bot size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Modal - View Only */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Audit Entry Details"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleAIAnalyze(selectedItem); }}>
              <Bot size={16} /> AI Analyze
            </button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Action</div><div className="detail-value"><span className={`badge ${getActionBadge(selectedItem.action)}`}>{selectedItem.action}</span></div></div>
              <div className="detail-item"><div className="detail-label">Entity Type</div><div className="detail-value">{selectedItem.entity_type}</div></div>
              <div className="detail-item"><div className="detail-label">Entity ID</div><div className="detail-value">{selectedItem.entity_id || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">User</div><div className="detail-value">{selectedItem.user_name}<br /><small>{selectedItem.user_email}</small></div></div>
              <div className="detail-item"><div className="detail-label">IP Address</div><div className="detail-value">{selectedItem.ip_address}</div></div>
              <div className="detail-item"><div className="detail-label">Timestamp</div><div className="detail-value">{new Date(selectedItem.created_at).toLocaleString()}</div></div>
            </div>
            {selectedItem.details && (
              <div className="detail-section">
                <h3>Details</h3>
                <pre style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', overflow: 'auto' }}>
                  {JSON.stringify(selectedItem.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* AI Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI Audit Analysis">
        {aiLoading ? (<div className="loading"><div className="spinner"></div></div>) : (<div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiResponse}</div>)}
      </Modal>
    </div>
  );
};

export default AuditTrail;
