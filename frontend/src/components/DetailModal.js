import React, { useState } from 'react';
import { X, Edit2, Trash2, Save, XCircle, Bot, Sparkles, ChevronRight } from 'lucide-react';
import AIResultDisplay from './AIResultDisplay';

// Helper function to render JSON values beautifully
const renderJsonValue = (value, depth = 0) => {
  if (value === null || value === undefined) return <span className="json-null">-</span>;
  if (typeof value === 'string') return <span className="json-string">{value}</span>;
  if (typeof value === 'number') return <span className="json-number">{value}</span>;
  if (typeof value === 'boolean') return <span className={`json-boolean ${value ? 'true' : 'false'}`}>{value ? 'Yes' : 'No'}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="json-empty">No items</span>;
    // For simple arrays of strings/numbers, show as tags
    if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
      return (
        <div className="json-array-tags">
          {value.map((item, index) => (
            <span key={index} className="json-tag">{item}</span>
          ))}
        </div>
      );
    }
    // For complex arrays, show as list
    return (
      <div className="json-array-list">
        {value.map((item, index) => (
          <div key={index} className="json-array-item">
            <span className="json-array-index">{index + 1}</span>
            <div className="json-array-content">{renderJsonValue(item, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return <span className="json-empty">No data</span>;

    return (
      <div className={`json-object ${depth > 0 ? 'nested' : ''}`}>
        {entries.map(([key, val]) => (
          <div key={key} className="json-property">
            <span className="json-key">{formatKey(key)}</span>
            <div className="json-value">{renderJsonValue(val, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

// Format camelCase or snake_case keys to readable labels
const formatKey = (key) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const DetailModal = ({
  isOpen,
  onClose,
  title,
  data,
  fields,
  onEdit,
  onDelete,
  onAIAction,
  aiActionLabel,
  aiResult,
  aiLoading,
  editableFields
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !data) return null;

  const handleEditClick = () => {
    setEditData({ ...data });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editData);
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(data.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to safely convert any value to displayable string
  const safeDisplay = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
      // For simple arrays, join them
      if (val.every(item => typeof item === 'string' || typeof item === 'number')) {
        return val.join(', ');
      }
      // For arrays of objects, extract text from each
      return val.map(v => safeDisplay(v)).filter(Boolean).join('; ');
    }
    if (typeof val === 'object') {
      // Try to extract meaningful text from object - check more fields
      const textFields = ['description', 'text', 'name', 'title', 'action', 'recommendation',
                          'content', 'details', 'value', 'message', 'finding', 'issue',
                          'summary', 'explanation', 'reason', 'category', 'item', 'point'];
      for (const f of textFields) {
        if (val[f] !== null && val[f] !== undefined) {
          if (typeof val[f] === 'string') {
            return val[f];
          }
          // Recursively get display value if nested
          const nested = safeDisplay(val[f]);
          if (nested && nested !== '-' && nested !== '[Data]') {
            return nested;
          }
        }
      }
      // Try to construct readable text from all string values in object
      const stringValues = Object.entries(val)
        .filter(([_, v]) => typeof v === 'string' && v.length > 0)
        .map(([k, v]) => v);
      if (stringValues.length > 0) {
        return stringValues.join(' - ');
      }
      // Last resort: format as key-value pairs
      const entries = Object.entries(val).filter(([_, v]) => v !== null && v !== undefined);
      if (entries.length > 0) {
        return entries.map(([k, v]) => {
          const label = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
          const valStr = typeof v === 'object' ? safeDisplay(v) : String(v);
          return `${label}: ${valStr}`;
        }).join('; ');
      }
      return '-';
    }
    return String(val);
  };

  // Render complex values like recommendations as structured elements
  const renderComplexValue = (val) => {
    if (val === null || val === undefined) return <span className="detail-empty">-</span>;
    if (typeof val === 'string') return <span>{val}</span>;
    if (typeof val === 'number' || typeof val === 'boolean') return <span>{String(val)}</span>;

    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="detail-empty">No items</span>;
      return (
        <div className="detail-complex-list">
          {val.map((item, index) => (
            <div key={index} className="detail-complex-item">
              <span className="detail-complex-number">{index + 1}</span>
              <div className="detail-complex-content">
                {typeof item === 'object' ? renderObjectCard(item) : safeDisplay(item)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof val === 'object') {
      return renderObjectCard(val);
    }

    return <span>{String(val)}</span>;
  };

  // Render an object as a card with its properties
  const renderObjectCard = (obj) => {
    if (!obj) return null;
    const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length === 0) return <span className="detail-empty">-</span>;

    // Check for common title/description pattern
    const titleFields = ['title', 'name', 'recommendation', 'action', 'issue', 'finding', 'category'];
    const descFields = ['description', 'text', 'content', 'details', 'explanation', 'reason', 'message'];

    let title = null;
    let desc = null;
    const otherEntries = [];

    for (const [key, value] of entries) {
      if (!title && titleFields.includes(key.toLowerCase()) && typeof value === 'string') {
        title = value;
      } else if (!desc && descFields.includes(key.toLowerCase()) && typeof value === 'string') {
        desc = value;
      } else {
        otherEntries.push([key, value]);
      }
    }

    // Simple card if we have title/description
    if (title || desc) {
      return (
        <div className="detail-object-card">
          {title && <div className="detail-object-title">{title}</div>}
          {desc && <div className="detail-object-desc">{desc}</div>}
          {otherEntries.length > 0 && (
            <div className="detail-object-meta">
              {otherEntries.map(([k, v]) => (
                <span key={k} className="detail-object-meta-item">
                  <strong>{formatKey(k)}:</strong> {typeof v === 'object' ? safeDisplay(v) : String(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Generic object display
    return (
      <div className="detail-object-simple">
        {entries.map(([key, value]) => (
          <div key={key} className="detail-object-row">
            <span className="detail-object-key">{formatKey(key)}:</span>
            <span className="detail-object-value">
              {typeof value === 'object' ? safeDisplay(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderFieldValue = (field, value) => {
    if (value === null || value === undefined) return '-';

    if (field.type === 'date') {
      return new Date(value).toLocaleDateString();
    }
    if (field.type === 'datetime') {
      return new Date(value).toLocaleString();
    }
    if (field.type === 'badge') {
      const badgeClass = field.badgeMap?.[value] || 'badge-secondary';
      return <span className={`badge ${badgeClass}`}>{safeDisplay(value)}</span>;
    }
    if (field.type === 'score') {
      const scoreClass = value >= 80 ? 'success' : value >= 60 ? 'warning' : 'danger';
      return <span className={`score-badge ${scoreClass}`}>{value}%</span>;
    }
    if (field.type === 'array' && Array.isArray(value)) {
      return (
        <div className="detail-tags">
          {value.map((item, index) => (
            <span key={index} className="detail-tag">{safeDisplay(item)}</span>
          ))}
        </div>
      );
    }
    if (field.type === 'json' && typeof value === 'object') {
      return <div className="detail-json-formatted">{renderJsonValue(value)}</div>;
    }
    if (field.type === 'longtext') {
      // Try to parse JSON strings from database
      let parsedValue = value;
      if (typeof value === 'string') {
        // Check for legacy [object Object] data - show helpful message
        if (value.includes('[object Object]')) {
          return (
            <div className="detail-longtext">
              <span className="detail-legacy-data">Data needs to be regenerated with AI</span>
            </div>
          );
        }
        // Try to parse as JSON
        try {
          const trimmed = value.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            parsedValue = JSON.parse(trimmed);
          }
        } catch {
          // Not JSON, keep as string
        }
      }
      // Handle arrays and objects using renderComplexValue for better display
      if (Array.isArray(parsedValue) || typeof parsedValue === 'object') {
        return <div className="detail-longtext">{renderComplexValue(parsedValue)}</div>;
      }
      return <div className="detail-longtext">{parsedValue}</div>;
    }
    // Default: safely convert to string
    return safeDisplay(value);
  };

  const renderEditField = (field) => {
    const value = editData[field.key] || '';

    if (field.type === 'select' && field.options) {
      return (
        <select
          className="form-input"
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
        >
          <option value="">Select...</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    if (field.type === 'date') {
      return (
        <input
          type="date"
          className="form-input"
          value={value ? value.split('T')[0] : ''}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
        />
      );
    }
    if (field.type === 'longtext') {
      return (
        <textarea
          className="form-input"
          rows={4}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
        />
      );
    }
    if (field.type === 'number') {
      return (
        <input
          type="number"
          className="form-input"
          value={value}
          onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value) || 0)}
        />
      );
    }
    return (
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
      />
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <div className="delete-confirm-icon">
                <Trash2 size={48} />
              </div>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this item? This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleConfirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-fields">
                {fields.map((field) => (
                  <div key={field.key} className={`detail-field ${field.fullWidth ? 'full-width' : ''}`}>
                    <label className="detail-label">{field.label}</label>
                    {isEditing && editableFields?.includes(field.key) ? (
                      renderEditField(field)
                    ) : (
                      <div className="detail-value">
                        {renderFieldValue(field, data[field.key])}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {onAIAction && (
                <div className="detail-ai-section">
                  <button
                    className="btn btn-ai"
                    onClick={() => onAIAction(data.id)}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <>
                        <Bot size={18} className="spinning" />
                        Running AI Analysis...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        {aiActionLabel || 'Run AI Analysis'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {(aiResult || aiLoading) && (
                <AIResultDisplay
                  result={aiResult}
                  loading={aiLoading}
                  title="AI Analysis Results"
                />
              )}
            </>
          )}
        </div>

        {!showDeleteConfirm && (
          <div className="modal-footer">
            {isEditing ? (
              <>
                <button className="btn btn-secondary" onClick={handleCancelEdit}>
                  <XCircle size={18} />
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveEdit}>
                  <Save size={18} />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {onDelete && (
                  <button className="btn btn-danger" onClick={handleDeleteClick}>
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
                {onEdit && editableFields && editableFields.length > 0 && (
                  <button className="btn btn-secondary" onClick={handleEditClick}>
                    <Edit2 size={18} />
                    Edit
                  </button>
                )}
                <button className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailModal;
