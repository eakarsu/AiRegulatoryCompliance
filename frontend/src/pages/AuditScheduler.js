import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, RefreshCw, Download, ArrowUp, ArrowDown, Trash2, Edit2 } from 'lucide-react';
import { auditSchedulerAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const AuditScheduler = () => {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
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

  const [newSchedule, setNewSchedule] = useState({
    audit_name: '',
    audit_type: 'compliance',
    frequency: 'annual',
    department: '',
    assigned_auditor: '',
    next_audit_date: '',
    priority: 'medium',
    scope: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    audit_name: ['required'],
    department: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, usersRes] = await Promise.all([
        auditSchedulerAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      const resData = schedulesRes.data;
      setSchedules(resData.data || resData);
      setTotal(resData.total || (Array.isArray(resData) ? resData.length : 0));
      setTotalPages(resData.totalPages || Math.ceil((resData.total || (Array.isArray(resData) ? resData.length : 0)) / limit));
      setUsers(usersRes.data);
    } catch (error) {
      addToast('Error fetching audit schedules', 'error');
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

  const handleRowClick = (schedule) => {
    setSelectedSchedule(schedule);
    setAiResult(schedule.ai_recommendations || null);
    setShowModal(true);
  };

  const handleGetAIRecommendations = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await auditSchedulerAPI.getAIRecommendations(id);
      setAiResult(response.data.aiAnalysis);
      setSelectedSchedule(response.data.schedule);
      addToast('AI recommendations generated successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error getting AI recommendations', 'error');
      setAiResult({ error: 'Failed to get AI recommendations. Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newSchedule)) return;
    try {
      await auditSchedulerAPI.create(newSchedule);
      setShowCreateModal(false);
      setNewSchedule({
        audit_name: '',
        audit_type: 'compliance',
        frequency: 'annual',
        department: '',
        assigned_auditor: '',
        next_audit_date: '',
        priority: 'medium',
        scope: ''
      });
      addToast('Audit schedule created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating schedule', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await auditSchedulerAPI.update(updatedData.id, updatedData);
      addToast('Schedule updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating schedule', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await auditSchedulerAPI.delete(id);
      addToast('Schedule deleted successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error deleting schedule', 'error');
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === schedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(schedules.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected schedules?`)) {
      try {
        for (const id of selectedIds) {
          await auditSchedulerAPI.delete(id);
        }
        addToast(`${selectedIds.length} schedules deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting schedules', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await auditSchedulerAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} schedules updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating schedules', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('audit-scheduler');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit-scheduler.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getPriorityBadge = (priority) => {
    const map = {
      critical: 'badge-danger',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-success'
    };
    return map[priority] || 'badge-secondary';
  };

  const getStatusBadge = (status) => {
    const map = {
      scheduled: 'badge-info',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      overdue: 'badge-danger'
    };
    return map[status] || 'badge-secondary';
  };

  const detailFields = [
    { key: 'audit_name', label: 'Audit Name', type: 'text' },
    { key: 'audit_type', label: 'Audit Type', type: 'text' },
    { key: 'frequency', label: 'Frequency', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { scheduled: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success' } },
    { key: 'priority', label: 'Priority', type: 'badge', badgeMap: { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' } },
    { key: 'next_audit_date', label: 'Next Audit Date', type: 'date' },
    { key: 'last_audit_date', label: 'Last Audit Date', type: 'date' },
    { key: 'scope', label: 'Scope', type: 'longtext', fullWidth: true },
    { key: 'auditor_first_name', label: 'Assigned Auditor', type: 'text' }
  ];

  if (loading && schedules.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Audit Scheduler</h1>
            <p className="page-subtitle">Schedule and manage audits with AI-powered recommendations</p>
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
          <h1 className="page-title">AI Audit Scheduler</h1>
          <p className="page-subtitle">Schedule and manage audits with AI-powered recommendations</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Schedule
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search audits..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'completed' })}>
                Set Completed
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ priority: 'high' })}>
                Set High Priority
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="bulk-checkbox" checked={schedules.length > 0 && selectedIds.length === schedules.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'audit_name' ? 'active' : ''}`} onClick={() => handleSort('audit_name')}>
                  Audit Name <SortIcon column="audit_name" />
                </th>
                <th className={`sortable ${sortBy === 'audit_type' ? 'active' : ''}`} onClick={() => handleSort('audit_type')}>
                  Type <SortIcon column="audit_type" />
                </th>
                <th className={`sortable ${sortBy === 'department' ? 'active' : ''}`} onClick={() => handleSort('department')}>
                  Department <SortIcon column="department" />
                </th>
                <th className={`sortable ${sortBy === 'frequency' ? 'active' : ''}`} onClick={() => handleSort('frequency')}>
                  Frequency <SortIcon column="frequency" />
                </th>
                <th className={`sortable ${sortBy === 'priority' ? 'active' : ''}`} onClick={() => handleSort('priority')}>
                  Priority <SortIcon column="priority" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className={`sortable ${sortBy === 'next_audit_date' ? 'active' : ''}`} onClick={() => handleSort('next_audit_date')}>
                  Next Audit <SortIcon column="next_audit_date" />
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} onClick={() => handleRowClick(schedule)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(schedule.id)} onChange={(e) => toggleSelect(schedule.id, e)} />
                  </td>
                  <td className="font-medium">{schedule.audit_name}</td>
                  <td>{schedule.audit_type}</td>
                  <td>{schedule.department}</td>
                  <td>{schedule.frequency}</td>
                  <td>
                    <span className={`badge ${getPriorityBadge(schedule.priority)}`}>
                      {schedule.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(schedule.status)}`}>
                      {schedule.status}
                    </span>
                  </td>
                  <td>{schedule.next_audit_date ? new Date(schedule.next_audit_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setAiResult(null); }}
        title="Audit Schedule Details"
        data={selectedSchedule}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAIAction={handleGetAIRecommendations}
        aiActionLabel="Get AI Recommendations"
        aiResult={aiResult}
        aiLoading={aiLoading}
        editableFields={['audit_name', 'audit_type', 'frequency', 'department', 'priority', 'status', 'next_audit_date', 'scope']}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Audit Schedule</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Audit Name *</label>
                  <input
                    type="text"
                    className={`form-input ${touched.audit_name && errors.audit_name ? 'error' : ''}`}
                    value={newSchedule.audit_name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, audit_name: e.target.value })}
                    onBlur={() => touchField('audit_name', newSchedule.audit_name)}
                    placeholder="Enter audit name"
                  />
                  {touched.audit_name && errors.audit_name && <div className="form-error">{errors.audit_name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Audit Type</label>
                  <select
                    className="form-input"
                    value={newSchedule.audit_type}
                    onChange={(e) => setNewSchedule({ ...newSchedule, audit_type: e.target.value })}
                  >
                    <option value="compliance">Compliance</option>
                    <option value="security">Security</option>
                    <option value="financial">Financial</option>
                    <option value="privacy">Privacy</option>
                    <option value="vendor">Vendor</option>
                    <option value="process">Process</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-input"
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    className={`form-input ${touched.department && errors.department ? 'error' : ''}`}
                    value={newSchedule.department}
                    onChange={(e) => setNewSchedule({ ...newSchedule, department: e.target.value })}
                    onBlur={() => touchField('department', newSchedule.department)}
                    placeholder="e.g., Finance, IT Security"
                  />
                  {touched.department && errors.department && <div className="form-error">{errors.department}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={newSchedule.priority}
                    onChange={(e) => setNewSchedule({ ...newSchedule, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Next Audit Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newSchedule.next_audit_date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, next_audit_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Auditor</label>
                <select
                  className="form-input"
                  value={newSchedule.assigned_auditor}
                  onChange={(e) => setNewSchedule({ ...newSchedule, assigned_auditor: e.target.value })}
                >
                  <option value="">Select Auditor...</option>
                  {users.filter(u => u.role === 'auditor' || u.role === 'admin').map(user => (
                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Scope</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={newSchedule.scope}
                  onChange={(e) => setNewSchedule({ ...newSchedule, scope: e.target.value })}
                  placeholder="Describe the audit scope..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
              >
                <Calendar size={18} />
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditScheduler;
