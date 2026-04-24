import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, RefreshCw, TrendingUp, Download, ArrowUp, ArrowDown, Trash2, Edit2, Eye } from 'lucide-react';
import { violationPredictorAPI, regulationsAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import DetailModal from '../components/DetailModal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';

const ViolationPredictor = () => {
  const [predictions, setPredictions] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
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

  const [newPrediction, setNewPrediction] = useState({
    prediction_name: '',
    regulation_id: '',
    risk_area: '',
    predicted_violation_type: '',
    impact_level: 'medium'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    prediction_name: ['required'],
    risk_area: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [predictionsRes, regulationsRes] = await Promise.all([
        violationPredictorAPI.getAll({ search, sortBy, sortOrder, page, limit }),
        regulationsAPI.getAll()
      ]);
      setPredictions(predictionsRes.data.data || predictionsRes.data);
      setTotal(predictionsRes.data.total || predictionsRes.data.length);
      setTotalPages(predictionsRes.data.totalPages || Math.ceil((predictionsRes.data.total || predictionsRes.data.length) / limit));
      setRegulations(regulationsRes.data.data || regulationsRes.data);
    } catch (error) {
      addToast('Error fetching violation predictions', 'error');
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

  const handleRowClick = (prediction) => {
    setSelectedPrediction(prediction);
    setAiResult(prediction.ai_analysis || null);
    setShowModal(true);
  };

  const handleRunAIPrediction = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await violationPredictorAPI.runAIPrediction(id);
      setAiResult(response.data.aiAnalysis);
      setSelectedPrediction(response.data.prediction);
      addToast('AI prediction analysis completed', 'success');
      fetchData();
    } catch (error) {
      console.error('Error running AI prediction:', error);
      setAiResult({ error: 'Failed to run AI prediction. Please try again.' });
      addToast('Error running AI prediction', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newPrediction)) return;
    try {
      await violationPredictorAPI.create(newPrediction);
      setShowCreateModal(false);
      setNewPrediction({
        prediction_name: '',
        regulation_id: '',
        risk_area: '',
        predicted_violation_type: '',
        impact_level: 'medium'
      });
      addToast('Violation prediction created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating violation prediction', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await violationPredictorAPI.update(updatedData.id, updatedData);
      addToast('Violation prediction updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating violation prediction', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await violationPredictorAPI.delete(id);
      addToast('Violation prediction deleted successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error deleting violation prediction', 'error');
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === predictions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(predictions.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected violation predictions?`)) {
      try {
        for (const id of selectedIds) {
          await violationPredictorAPI.delete(id);
        }
        addToast(`${selectedIds.length} violation predictions deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting violation predictions', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await violationPredictorAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} violation predictions updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating violation predictions', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('violation-predictor');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'violation-predictor.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const getImpactBadge = (impact) => {
    const map = {
      critical: 'badge-danger',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-success'
    };
    return map[impact] || 'badge-secondary';
  };

  const getProbabilityClass = (score) => {
    if (!score) return '';
    if (score >= 70) return 'score-danger';
    if (score >= 50) return 'score-warning';
    return 'score-success';
  };

  const detailFields = [
    { key: 'prediction_name', label: 'Prediction Name', type: 'text' },
    { key: 'regulation_name', label: 'Regulation', type: 'text' },
    { key: 'risk_area', label: 'Risk Area', type: 'text' },
    { key: 'predicted_violation_type', label: 'Violation Type', type: 'text' },
    { key: 'probability_score', label: 'Probability Score', type: 'score' },
    { key: 'impact_level', label: 'Impact Level', type: 'badge', badgeMap: { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' } },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { active: 'badge-info', mitigated: 'badge-success', archived: 'badge-secondary' } },
    { key: 'preventive_measures', label: 'Preventive Measures', type: 'longtext', fullWidth: true },
    { key: 'prediction_date', label: 'Prediction Date', type: 'date' }
  ];

  if (loading && predictions.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Violation Predictor</h1>
            <p className="page-subtitle">Predict potential compliance violations using AI analysis</p>
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
          <h1 className="page-title">AI Violation Predictor</h1>
          <p className="page-subtitle">Predict potential compliance violations using AI analysis</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Prediction
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search predictions..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'mitigated' })}>
                Set Mitigated
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
                  <input type="checkbox" className="bulk-checkbox" checked={predictions.length > 0 && selectedIds.length === predictions.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'prediction_name' ? 'active' : ''}`} onClick={() => handleSort('prediction_name')}>
                  Prediction Name <SortIcon column="prediction_name" />
                </th>
                <th className={`sortable ${sortBy === 'regulation_name' ? 'active' : ''}`} onClick={() => handleSort('regulation_name')}>
                  Regulation <SortIcon column="regulation_name" />
                </th>
                <th className={`sortable ${sortBy === 'risk_area' ? 'active' : ''}`} onClick={() => handleSort('risk_area')}>
                  Risk Area <SortIcon column="risk_area" />
                </th>
                <th className={`sortable ${sortBy === 'probability_score' ? 'active' : ''}`} onClick={() => handleSort('probability_score')}>
                  Probability <SortIcon column="probability_score" />
                </th>
                <th className={`sortable ${sortBy === 'impact_level' ? 'active' : ''}`} onClick={() => handleSort('impact_level')}>
                  Impact <SortIcon column="impact_level" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((prediction) => (
                <tr key={prediction.id} onClick={() => handleRowClick(prediction)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(prediction.id)} onChange={(e) => toggleSelect(prediction.id, e)} />
                  </td>
                  <td className="font-medium">{prediction.prediction_name}</td>
                  <td>{prediction.regulation_name || '-'}</td>
                  <td>{prediction.risk_area}</td>
                  <td>
                    {prediction.probability_score ? (
                      <span className={`score-badge ${getProbabilityClass(prediction.probability_score)}`}>
                        {prediction.probability_score}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${getImpactBadge(prediction.impact_level)}`}>
                      {prediction.impact_level}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${prediction.status === 'active' ? 'badge-info' : prediction.status === 'mitigated' ? 'badge-success' : 'badge-secondary'}`}>
                      {prediction.status}
                    </span>
                  </td>
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
        title="Violation Prediction Details"
        data={selectedPrediction}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAIAction={handleRunAIPrediction}
        aiActionLabel="Run AI Prediction Analysis"
        aiResult={aiResult}
        aiLoading={aiLoading}
        editableFields={['prediction_name', 'risk_area', 'predicted_violation_type', 'impact_level', 'status', 'preventive_measures']}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Violation Prediction</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Prediction Name *</label>
                <input
                  type="text"
                  className={`form-input ${touched.prediction_name && errors.prediction_name ? 'error' : ''}`}
                  value={newPrediction.prediction_name}
                  onChange={(e) => setNewPrediction({ ...newPrediction, prediction_name: e.target.value })}
                  onBlur={() => touchField('prediction_name', newPrediction.prediction_name)}
                  placeholder="Enter prediction name"
                />
                {touched.prediction_name && errors.prediction_name && <div className="form-error">{errors.prediction_name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Regulation</label>
                  <select
                    className="form-input"
                    value={newPrediction.regulation_id}
                    onChange={(e) => setNewPrediction({ ...newPrediction, regulation_id: e.target.value })}
                  >
                    <option value="">Select Regulation...</option>
                    {regulations.map(reg => (
                      <option key={reg.id} value={reg.id}>{reg.name} ({reg.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Area *</label>
                  <input
                    type="text"
                    className={`form-input ${touched.risk_area && errors.risk_area ? 'error' : ''}`}
                    value={newPrediction.risk_area}
                    onChange={(e) => setNewPrediction({ ...newPrediction, risk_area: e.target.value })}
                    onBlur={() => touchField('risk_area', newPrediction.risk_area)}
                    placeholder="e.g., Data Privacy, Consumer Rights"
                  />
                  {touched.risk_area && errors.risk_area && <div className="form-error">{errors.risk_area}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Violation Type</label>
                  <select
                    className="form-input"
                    value={newPrediction.predicted_violation_type}
                    onChange={(e) => setNewPrediction({ ...newPrediction, predicted_violation_type: e.target.value })}
                  >
                    <option value="">Select Type...</option>
                    <option value="consent_violation">Consent Violation</option>
                    <option value="response_delay">Response Delay</option>
                    <option value="unauthorized_disclosure">Unauthorized Disclosure</option>
                    <option value="control_failure">Control Failure</option>
                    <option value="scope_violation">Scope Violation</option>
                    <option value="retention_violation">Retention Violation</option>
                    <option value="transfer_violation">Transfer Violation</option>
                    <option value="documentation_violation">Documentation Violation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Impact Level</label>
                  <select
                    className="form-input"
                    value={newPrediction.impact_level}
                    onChange={(e) => setNewPrediction({ ...newPrediction, impact_level: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
              >
                <TrendingUp size={18} />
                Create Prediction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationPredictor;
