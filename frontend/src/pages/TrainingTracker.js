import React, { useState, useEffect, useCallback } from 'react';
import { Plus, GraduationCap, RefreshCw, BookOpen, Download, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { trainingTrackerAPI, usersAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const TrainingTracker = () => {
  const [progress, setProgress] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgress, setSelectedProgress] = useState(null);
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

  const [newProgress, setNewProgress] = useState({
    employee_id: '',
    training_program: '',
    department: '',
    required_courses: 5,
    due_date: ''
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    employee_id: ['required'],
    training_program: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [progressRes, usersRes] = await Promise.all([
        trainingTrackerAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        usersAPI.getAll()
      ]);
      setProgress(progressRes.data.data || progressRes.data);
      setTotal(progressRes.data.total || progressRes.data.length);
      setTotalPages(progressRes.data.totalPages || Math.ceil((progressRes.data.total || progressRes.data.length) / limit));
      setUsers(usersRes.data.data || usersRes.data);
    } catch (error) {
      addToast('Error fetching training progress', 'error');
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

  const handleRowClick = (item) => {
    setSelectedProgress(item);
    setAiResult(item.ai_recommendations || null);
    setShowModal(true);
  };

  const handleRunAIAnalysis = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await trainingTrackerAPI.runAIAnalysis(id);
      setAiResult(response.data.aiAnalysis);
      setSelectedProgress(response.data.progress);
      addToast('AI training analysis completed', 'success');
      fetchData();
    } catch (error) {
      console.error('Error running AI analysis:', error);
      setAiResult({ error: 'Failed to run AI analysis. Please try again.' });
      addToast('Error running AI analysis', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newProgress)) return;
    try {
      await trainingTrackerAPI.create(newProgress);
      setShowCreateModal(false);
      setNewProgress({
        employee_id: '',
        training_program: '',
        department: '',
        required_courses: 5,
        due_date: ''
      });
      addToast('Training program created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating training program', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await trainingTrackerAPI.update(updatedData.id, updatedData);
      addToast('Training progress updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating training progress', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await trainingTrackerAPI.delete(id);
      addToast('Training progress deleted successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error deleting training progress', 'error');
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === progress.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(progress.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected training records?`)) {
      try {
        for (const id of selectedIds) {
          await trainingTrackerAPI.delete(id);
        }
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
      for (const id of selectedIds) {
        await trainingTrackerAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} training records updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating training records', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('training-tracker');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'training-tracker.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Compliant': 'badge-success',
      'In Progress': 'badge-info',
      'At Risk': 'badge-warning',
      'Non-Compliant': 'badge-danger',
      'Not Started': 'badge-secondary'
    };
    return map[status] || 'badge-secondary';
  };

  const getCompletionRate = (completed, required) => {
    if (!required) return 0;
    return Math.round((completed / required) * 100);
  };

  const detailFields = [
    { key: 'training_program', label: 'Training Program', type: 'text' },
    { key: 'first_name', label: 'Employee', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'compliance_status', label: 'Status', type: 'badge', badgeMap: { 'Compliant': 'badge-success', 'In Progress': 'badge-info', 'At Risk': 'badge-warning', 'Non-Compliant': 'badge-danger' } },
    { key: 'overall_score', label: 'Overall Score', type: 'score' },
    { key: 'required_courses', label: 'Required Courses', type: 'number' },
    { key: 'completed_courses', label: 'Completed Courses', type: 'number' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'next_training', label: 'Next Training', type: 'text' },
    { key: 'skill_gaps', label: 'Skill Gaps', type: 'json', fullWidth: true }
  ];

  if (loading && progress.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Training Tracker</h1>
            <p className="page-subtitle">Track employee training progress with AI-powered recommendations</p>
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
          <h1 className="page-title">AI Training Tracker</h1>
          <p className="page-subtitle">Track employee training progress with AI-powered recommendations</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Training Program
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search training..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'Compliant' })}>
                Set Compliant
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ compliance_status: 'Non-Compliant' })}>
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
                  <input type="checkbox" className="bulk-checkbox" checked={progress.length > 0 && selectedIds.length === progress.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'first_name' ? 'active' : ''}`} onClick={() => handleSort('first_name')}>
                  Employee <SortIcon column="first_name" />
                </th>
                <th className={`sortable ${sortBy === 'training_program' ? 'active' : ''}`} onClick={() => handleSort('training_program')}>
                  Training Program <SortIcon column="training_program" />
                </th>
                <th className={`sortable ${sortBy === 'department' ? 'active' : ''}`} onClick={() => handleSort('department')}>
                  Department <SortIcon column="department" />
                </th>
                <th>Progress</th>
                <th className={`sortable ${sortBy === 'overall_score' ? 'active' : ''}`} onClick={() => handleSort('overall_score')}>
                  Score <SortIcon column="overall_score" />
                </th>
                <th className={`sortable ${sortBy === 'compliance_status' ? 'active' : ''}`} onClick={() => handleSort('compliance_status')}>
                  Status <SortIcon column="compliance_status" />
                </th>
                <th className={`sortable ${sortBy === 'due_date' ? 'active' : ''}`} onClick={() => handleSort('due_date')}>
                  Due Date <SortIcon column="due_date" />
                </th>
              </tr>
            </thead>
            <tbody>
              {progress.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e)} />
                  </td>
                  <td className="font-medium">{item.first_name} {item.last_name}</td>
                  <td>{item.training_program}</td>
                  <td>{item.department}</td>
                  <td>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{ width: `${getCompletionRate(item.completed_courses, item.required_courses)}%` }}
                      ></div>
                      <span className="progress-text">
                        {item.completed_courses}/{item.required_courses}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.overall_score ? (
                      <span className={`score-badge ${item.overall_score >= 80 ? 'score-success' : item.overall_score >= 60 ? 'score-warning' : 'score-danger'}`}>
                        {item.overall_score}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(item.compliance_status)}`}>
                      {item.compliance_status}
                    </span>
                  </td>
                  <td>{item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}</td>
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
        title="Training Progress Details"
        data={selectedProgress}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAIAction={handleRunAIAnalysis}
        aiActionLabel="Analyze Training Progress"
        aiResult={aiResult}
        aiLoading={aiLoading}
        editableFields={['training_program', 'department', 'required_courses', 'completed_courses', 'overall_score', 'compliance_status', 'due_date', 'next_training']}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Training Program</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select
                  className={`form-input ${touched.employee_id && errors.employee_id ? 'error' : ''}`}
                  value={newProgress.employee_id}
                  onChange={(e) => setNewProgress({ ...newProgress, employee_id: e.target.value })}
                  onBlur={() => touchField('employee_id', newProgress.employee_id)}
                >
                  <option value="">Select Employee...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>
                  ))}
                </select>
                {touched.employee_id && errors.employee_id && <div className="form-error">{errors.employee_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Training Program *</label>
                <input
                  type="text"
                  className={`form-input ${touched.training_program && errors.training_program ? 'error' : ''}`}
                  value={newProgress.training_program}
                  onChange={(e) => setNewProgress({ ...newProgress, training_program: e.target.value })}
                  onBlur={() => touchField('training_program', newProgress.training_program)}
                  placeholder="e.g., Annual Compliance Certification"
                />
                {touched.training_program && errors.training_program && <div className="form-error">{errors.training_program}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newProgress.department}
                    onChange={(e) => setNewProgress({ ...newProgress, department: e.target.value })}
                    placeholder="e.g., Compliance, IT Security"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Courses</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newProgress.required_courses}
                    onChange={(e) => setNewProgress({ ...newProgress, required_courses: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newProgress.due_date}
                  onChange={(e) => setNewProgress({ ...newProgress, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
              >
                <BookOpen size={18} />
                Create Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingTracker;
