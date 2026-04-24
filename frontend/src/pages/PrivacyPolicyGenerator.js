import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, RefreshCw, Sparkles, Copy, Download, ChevronRight, Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import { privacyPolicyGeneratorAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/SkeletonLoader';
import useFormValidation from '../hooks/useFormValidation';
import DetailModal from '../components/DetailModal';
import AIResultDisplay from '../components/AIResultDisplay';

// Component to display policy content beautifully
const PolicyContentDisplay = ({ content }) => {
  // Helper to safely get string from any value
  const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
      if (val.every(item => typeof item === 'string' || typeof item === 'number')) {
        return val.join(', ');
      }
      return val.map(v => safeStr(v)).join('\n');
    }
    if (typeof val === 'object') {
      for (const k of ['content', 'text', 'description', 'title', 'name', 'value', 'message']) {
        if (val[k] && typeof val[k] === 'string') return val[k];
      }
      const entries = Object.entries(val).filter(([_, v]) => v != null);
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${formatLabel(k)}: ${safeStr(v)}`).join('; ');
      }
      return '';
    }
    return String(val);
  };

  // Format camelCase/snake_case to readable labels
  const formatLabel = (key) => {
    if (!key) return '';
    return String(key)
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Render any value beautifully (recursive)
  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) return <span className="policy-empty">-</span>;
    if (typeof value === 'string') {
      if (value.includes('\n\n') || value.length > 200) {
        return (
          <div className="policy-multiline">
            {value.split('\n').map((line, i) => (
              line.trim() ? <p key={i}>{line}</p> : <br key={i} />
            ))}
          </div>
        );
      }
      return <span>{value}</span>;
    }
    if (typeof value === 'number') return <span className="policy-number">{value}</span>;
    if (typeof value === 'boolean') return <span className={`policy-bool ${value}`}>{value ? 'Yes' : 'No'}</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="policy-empty">None</span>;
      if (value.every(item => typeof item === 'string' && item.length < 50)) {
        return (
          <div className="policy-tags">
            {value.map((item, i) => (
              <span key={i} className="policy-tag">{item}</span>
            ))}
          </div>
        );
      }
      return (
        <div className="policy-array-list">
          {value.map((item, i) => (
            <div key={i} className="policy-array-item">
              <span className="policy-array-num">{i + 1}</span>
              <div className="policy-array-content">
                {typeof item === 'object' ? renderObject(item, depth + 1) : safeStr(item)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return renderObject(value, depth);
    }

    return <span>{String(value)}</span>;
  };

  // Render object with its properties
  const renderObject = (obj, depth = 0) => {
    if (!obj) return null;
    const entries = Object.entries(obj).filter(([_, v]) => v != null && v !== '');
    if (entries.length === 0) return <span className="policy-empty">-</span>;

    return (
      <div className={`policy-object ${depth > 0 ? 'nested' : ''}`}>
        {entries.map(([key, value]) => (
          <div key={key} className="policy-object-row">
            <span className="policy-object-key">{formatLabel(key)}</span>
            <div className="policy-object-value">{renderValue(value, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  };

  // Parse content - handle both string and object
  let parsed = content;

  // If content is already an object, use it directly
  if (typeof content === 'object' && content !== null) {
    parsed = content;
  } else if (typeof content === 'string') {
    let cleaned = content.trim();

    // Remove ALL markdown code block markers
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Try to parse as JSON
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      try {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
          parsed = JSON.parse(jsonStr);
        } else {
          parsed = cleaned;
        }
      } catch {
        parsed = cleaned;
      }
    }
  }

  // If still a string after parsing attempts, render as formatted text
  if (typeof parsed === 'string') {
    return renderFormattedText(parsed);
  }

  // Render formatted text (markdown-like)
  function renderFormattedText(text) {
    return (
      <div className="policy-content">
        <div className="policy-text-content">
          {text.split('\n').map((line, index) => {
            if (line.startsWith('###')) {
              return <h5 key={index} className="policy-h5">{line.replace(/^#+\s*/, '')}</h5>;
            }
            if (line.startsWith('##')) {
              return <h4 key={index} className="policy-h4">{line.replace(/^#+\s*/, '')}</h4>;
            }
            if (line.startsWith('#')) {
              return <h3 key={index} className="policy-h3">{line.replace(/^#+\s*/, '')}</h3>;
            }
            if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
              return (
                <div key={index} className="policy-bullet">
                  <ChevronRight size={14} />
                  <span>{line.replace(/^[\s]*[-*]\s*/, '')}</span>
                </div>
              );
            }
            if (/^\d+\./.test(line.trim())) {
              return (
                <div key={index} className="policy-numbered">
                  <span className="policy-num">{line.match(/^\d+/)[0]}</span>
                  <span>{line.replace(/^\d+\.\s*/, '')}</span>
                </div>
              );
            }
            if (!line.trim()) {
              return <div key={index} className="policy-spacer"></div>;
            }
            return <p key={index} className="policy-para">{line}</p>;
          })}
        </div>
      </div>
    );
  }

  // Display parsed JSON beautifully
  if (typeof parsed === 'object' && parsed !== null) {
    const title = parsed.title || parsed.policyTitle || parsed.name;
    const summary = parsed.summary || parsed.executiveSummary || parsed.overview || parsed.description;
    const sections = parsed.sections || parsed.policySections || parsed.content;
    const effectiveDate = parsed.effectiveDate || parsed.effective_date || parsed.date;
    const version = parsed.version;
    const frameworks = parsed.complianceFrameworks || parsed.frameworks || parsed.regulations;
    const recommendations = parsed.recommendations || parsed.actions || parsed.nextSteps;

    const knownKeys = new Set(['title', 'policyTitle', 'name', 'summary', 'executiveSummary', 'overview',
      'description', 'sections', 'policySections', 'content', 'effectiveDate', 'effective_date', 'date',
      'version', 'complianceFrameworks', 'frameworks', 'regulations', 'recommendations', 'actions', 'nextSteps']);
    const otherFields = Object.entries(parsed).filter(([key]) => !knownKeys.has(key) && parsed[key] != null);

    return (
      <div className="policy-content policy-structured">
        {title && (
          <div className="policy-header">
            <h2 className="policy-title">{safeStr(title)}</h2>
            <div className="policy-header-meta">
              {version && <span className="policy-version">Version {safeStr(version)}</span>}
              {effectiveDate && <span className="policy-date">Effective: {safeStr(effectiveDate)}</span>}
            </div>
          </div>
        )}

        {frameworks && Array.isArray(frameworks) && frameworks.length > 0 && (
          <div className="policy-frameworks">
            {frameworks.map((fw, i) => (
              <span key={i} className="policy-framework-badge">{safeStr(fw)}</span>
            ))}
          </div>
        )}

        {summary && (
          <div className="policy-summary">
            <h4>Summary</h4>
            <div className="policy-summary-content">{renderValue(summary)}</div>
          </div>
        )}

        {sections && Array.isArray(sections) && sections.length > 0 && (
          <div className="policy-sections">
            <h3 className="policy-sections-title">Policy Sections</h3>
            {sections.map((section, index) => {
              const sectionTitle = section.title || section.heading || section.name || section.section || `Section ${index + 1}`;
              const sectionContent = section.content || section.text || section.body || section.description || section.details;
              const sectionItems = section.items || section.points || section.list;

              return (
                <div key={index} className="policy-section">
                  <div className="policy-section-header">
                    <span className="policy-section-number">{index + 1}</span>
                    <h4 className="policy-section-title">{safeStr(sectionTitle)}</h4>
                  </div>
                  <div className="policy-section-content">
                    {sectionContent && <div className="policy-section-text">{renderValue(sectionContent)}</div>}
                    {sectionItems && Array.isArray(sectionItems) && (
                      <ul className="policy-section-list">
                        {sectionItems.map((item, i) => (
                          <li key={i}>{safeStr(item)}</li>
                        ))}
                      </ul>
                    )}
                    {Object.entries(section)
                      .filter(([k]) => !['title', 'heading', 'name', 'section', 'content', 'text', 'body', 'description', 'details', 'items', 'points', 'list'].includes(k))
                      .filter(([_, v]) => v != null)
                      .map(([k, v]) => (
                        <div key={k} className="policy-section-extra">
                          <strong>{formatLabel(k)}:</strong> {renderValue(v)}
                        </div>
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {recommendations && (Array.isArray(recommendations) ? recommendations.length > 0 : true) && (
          <div className="policy-recommendations">
            <h4>Recommendations</h4>
            {renderValue(recommendations)}
          </div>
        )}

        {otherFields.length > 0 && (
          <div className="policy-additional">
            <h4>Additional Information</h4>
            <div className="policy-additional-grid">
              {otherFields.map(([key, value]) => (
                <div key={key} className="policy-additional-item">
                  <div className="policy-additional-label">{formatLabel(key)}</div>
                  <div className="policy-additional-value">{renderValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback for any other type
  return (
    <div className="policy-content">
      <div className="policy-fallback">{renderValue(content)}</div>
    </div>
  );
};

const PrivacyPolicyGenerator = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
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

  const [newPolicy, setNewPolicy] = useState({
    policy_name: '',
    policy_type: 'general',
    jurisdiction: 'Global',
    target_audience: '',
    data_collected: [],
    legal_bases: [],
    version: '1.0'
  });

  // Form validation
  const { errors, validate, touchField, touched } = useFormValidation({
    policy_name: ['required']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privacyPolicyGeneratorAPI.getAll({ search, sortBy, sortOrder, page, limit });
      const resData = response.data;
      setPolicies(resData.data || resData);
      setTotal(resData.total || (Array.isArray(resData) ? resData.length : 0));
      setTotalPages(resData.totalPages || Math.ceil((resData.total || (Array.isArray(resData) ? resData.length : 0)) / limit));
    } catch (error) {
      addToast('Error fetching privacy policies', 'error');
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

  const handleRowClick = (policy) => {
    setSelectedPolicy(policy);
    setGeneratedContent(policy.content || null);
    setShowModal(true);
  };

  const handleGenerateAI = async (id) => {
    setAiLoading(true);
    setGeneratedContent(null);
    try {
      const response = await privacyPolicyGeneratorAPI.generateAI(id);
      setGeneratedContent(response.data.generatedContent);
      setSelectedPolicy(response.data.policy);
      addToast('Privacy policy generated successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Error generating policy:', error);
      setGeneratedContent('Failed to generate policy. Please try again.');
      addToast('Error generating privacy policy', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateNew = async () => {
    if (!validate(newPolicy)) return;
    setAiLoading(true);
    try {
      const response = await privacyPolicyGeneratorAPI.generateNew(newPolicy);
      setShowGenerateModal(false);
      setSelectedPolicy(response.data.policy);
      setGeneratedContent(response.data.generatedContent);
      setShowModal(true);
      setNewPolicy({
        policy_name: '',
        policy_type: 'general',
        jurisdiction: 'Global',
        target_audience: '',
        data_collected: [],
        legal_bases: [],
        version: '1.0'
      });
      addToast('Privacy policy generated with AI successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Error generating policy:', error);
      addToast('Error generating privacy policy with AI', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate(newPolicy)) return;
    try {
      await privacyPolicyGeneratorAPI.create(newPolicy);
      setShowCreateModal(false);
      setNewPolicy({
        policy_name: '',
        policy_type: 'general',
        jurisdiction: 'Global',
        target_audience: '',
        data_collected: [],
        legal_bases: [],
        version: '1.0'
      });
      addToast('Privacy policy created successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error creating privacy policy', 'error');
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await privacyPolicyGeneratorAPI.update(updatedData.id, updatedData);
      addToast('Privacy policy updated successfully', 'success');
      fetchData();
      setShowModal(false);
    } catch (error) {
      addToast('Error updating privacy policy', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this privacy policy?')) {
      try {
        await privacyPolicyGeneratorAPI.delete(id);
        addToast('Privacy policy deleted successfully', 'success');
        setShowModal(false);
        setGeneratedContent(null);
        fetchData();
      } catch (error) {
        addToast('Error deleting privacy policy', 'error');
      }
    }
  };

  const handleCopyContent = () => {
    if (generatedContent) {
      let cleanContent = generatedContent;
      if (typeof generatedContent === 'string') {
        cleanContent = generatedContent
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        try {
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            cleanContent = JSON.stringify(parsed, null, 2);
          }
        } catch {
          // Keep as is if parse fails
        }
      } else if (typeof generatedContent === 'object') {
        cleanContent = JSON.stringify(generatedContent, null, 2);
      }
      navigator.clipboard.writeText(cleanContent);
      addToast('Content copied to clipboard', 'success');
    }
  };

  // Bulk operations
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === policies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(policies.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected privacy policies?`)) {
      try {
        for (const id of selectedIds) {
          await privacyPolicyGeneratorAPI.delete(id);
        }
        addToast(`${selectedIds.length} privacy policies deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting privacy policies', 'error');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      for (const id of selectedIds) {
        await privacyPolicyGeneratorAPI.update(id, updates);
      }
      addToast(`${selectedIds.length} privacy policies updated`, 'success');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      addToast('Error updating privacy policies', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('privacy-policy-generator');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'privacy-policies.pdf');
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
      active: 'badge-success',
      draft: 'badge-warning',
      archived: 'badge-secondary',
      review: 'badge-info'
    };
    return map[status] || 'badge-secondary';
  };

  const detailFields = [
    { key: 'policy_name', label: 'Policy Name', type: 'text' },
    { key: 'policy_type', label: 'Policy Type', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'target_audience', label: 'Target Audience', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { active: 'badge-success', draft: 'badge-warning', archived: 'badge-secondary' } },
    { key: 'version', label: 'Version', type: 'text' },
    { key: 'ai_generated', label: 'AI Generated', type: 'badge', badgeMap: { true: 'badge-purple', false: 'badge-secondary' } },
    { key: 'effective_date', label: 'Effective Date', type: 'date' },
    { key: 'review_date', label: 'Review Date', type: 'date' },
    { key: 'data_collected', label: 'Data Collected', type: 'array' },
    { key: 'legal_bases', label: 'Legal Bases', type: 'array' }
  ];

  if (loading && policies.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Privacy Policy Generator</h1>
            <p className="page-subtitle">Generate and manage privacy policies using AI</p>
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
          <h1 className="page-title">AI Privacy Policy Generator</h1>
          <p className="page-subtitle">Generate and manage privacy policies using AI</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-ai" onClick={() => setShowGenerateModal(true)}>
            <Sparkles size={18} />
            Generate with AI
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Policy
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search privacy policies..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'active' })}>
                Set Active
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleBulkUpdate({ status: 'draft' })}>
                Set Draft
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="bulk-checkbox" checked={policies.length > 0 && selectedIds.length === policies.length} onChange={toggleSelectAll} />
                </th>
                <th className={`sortable ${sortBy === 'policy_name' ? 'active' : ''}`} onClick={() => handleSort('policy_name')}>
                  Policy Name <SortIcon column="policy_name" />
                </th>
                <th className={`sortable ${sortBy === 'policy_type' ? 'active' : ''}`} onClick={() => handleSort('policy_type')}>
                  Type <SortIcon column="policy_type" />
                </th>
                <th className={`sortable ${sortBy === 'jurisdiction' ? 'active' : ''}`} onClick={() => handleSort('jurisdiction')}>
                  Jurisdiction <SortIcon column="jurisdiction" />
                </th>
                <th className={`sortable ${sortBy === 'target_audience' ? 'active' : ''}`} onClick={() => handleSort('target_audience')}>
                  Target Audience <SortIcon column="target_audience" />
                </th>
                <th className={`sortable ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th>AI Generated</th>
                <th className={`sortable ${sortBy === 'version' ? 'active' : ''}`} onClick={() => handleSort('version')}>
                  Version <SortIcon column="version" />
                </th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} onClick={() => handleRowClick(policy)} className="clickable-row">
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(policy.id)} onChange={(e) => toggleSelect(policy.id, e)} />
                  </td>
                  <td className="font-medium">{policy.policy_name}</td>
                  <td>{policy.policy_type}</td>
                  <td>{policy.jurisdiction}</td>
                  <td>{policy.target_audience}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(policy.status)}`}>
                      {policy.status}
                    </span>
                  </td>
                  <td>
                    {policy.ai_generated ? (
                      <span className="badge badge-purple">AI</span>
                    ) : (
                      <span className="badge badge-secondary">Manual</span>
                    )}
                  </td>
                  <td>{policy.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Modal with Policy Content */}
      {showModal && selectedPolicy && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setGeneratedContent(null); }}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPolicy.policy_name}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setGeneratedContent(null); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-fields">
                {detailFields.slice(0, 7).map((field) => (
                  <div key={field.key} className="detail-field">
                    <label className="detail-label">{field.label}</label>
                    <div className="detail-value">
                      {field.type === 'badge' ? (
                        <span className={`badge ${field.badgeMap[selectedPolicy[field.key]] || 'badge-secondary'}`}>
                          {String(selectedPolicy[field.key])}
                        </span>
                      ) : field.type === 'array' && Array.isArray(selectedPolicy[field.key]) ? (
                        <div className="detail-tags">
                          {selectedPolicy[field.key].map((item, index) => (
                            <span key={index} className="detail-tag">{item}</span>
                          ))}
                        </div>
                      ) : field.type === 'date' ? (
                        selectedPolicy[field.key] ? new Date(selectedPolicy[field.key]).toLocaleDateString() : '-'
                      ) : (
                        selectedPolicy[field.key] || '-'
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="policy-content-section">
                <div className="policy-content-header">
                  <h3>Policy Content</h3>
                  <div className="policy-content-actions">
                    <button className="btn btn-sm btn-secondary" onClick={handleCopyContent}>
                      <Copy size={16} />
                      Copy
                    </button>
                    <button
                      className="btn btn-sm btn-ai"
                      onClick={() => handleGenerateAI(selectedPolicy.id)}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {aiLoading ? (
                  <div className="ai-loading-container">
                    <div className="spinner"></div>
                    <p>AI is generating your privacy policy...</p>
                  </div>
                ) : generatedContent ? (
                  <AIResultDisplay
                    result={generatedContent}
                    title="Generated Privacy Policy"
                    loading={false}
                  />
                ) : (
                  <div className="policy-content-empty">
                    <FileText size={48} />
                    <p>No content generated yet. Click "Regenerate" to generate policy content with AI.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setGeneratedContent(null); }}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                const editData = { ...selectedPolicy };
                setShowModal(false);
                setGeneratedContent(null);
                handleEdit(editData);
              }}>
                <Edit2 size={16} /> Edit
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedPolicy.id)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Privacy Policy</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Policy Name *</label>
                <input
                  type="text"
                  className={`form-input ${touched.policy_name && errors.policy_name ? 'error' : ''}`}
                  value={newPolicy.policy_name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_name: e.target.value })}
                  onBlur={() => touchField('policy_name', newPolicy.policy_name)}
                  placeholder="e.g., Website Privacy Policy"
                />
                {touched.policy_name && errors.policy_name && <div className="form-error">{errors.policy_name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Policy Type</label>
                  <select
                    className="form-input"
                    value={newPolicy.policy_type}
                    onChange={(e) => setNewPolicy({ ...newPolicy, policy_type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="app">Mobile App</option>
                    <option value="employee">Employee</option>
                    <option value="customer">Customer</option>
                    <option value="marketing">Marketing</option>
                    <option value="cookies">Cookies</option>
                    <option value="gdpr">GDPR Specific</option>
                    <option value="ccpa">CCPA Specific</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jurisdiction</label>
                  <select
                    className="form-input"
                    value={newPolicy.jurisdiction}
                    onChange={(e) => setNewPolicy({ ...newPolicy, jurisdiction: e.target.value })}
                  >
                    <option value="Global">Global</option>
                    <option value="European Union">European Union</option>
                    <option value="United States">United States</option>
                    <option value="California">California</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.target_audience}
                  onChange={(e) => setNewPolicy({ ...newPolicy, target_audience: e.target.value })}
                  placeholder="e.g., Website Visitors, App Users"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Data Collected (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.data_collected?.join(', ') || ''}
                  onChange={(e) => setNewPolicy({ ...newPolicy, data_collected: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Personal Information, Contact Details, Usage Data"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Legal Bases (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.legal_bases?.join(', ') || ''}
                  onChange={(e) => setNewPolicy({ ...newPolicy, legal_bases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Consent, Contract, Legitimate Interest"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newPolicy.policy_name}
              >
                <FileText size={18} />
                Create Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate New Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Sparkles size={24} />
                Generate Privacy Policy with AI
              </h2>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Fill in the details below and AI will generate a comprehensive, legally-compliant privacy policy for you.
              </p>
              <div className="form-group">
                <label className="form-label">Policy Name *</label>
                <input
                  type="text"
                  className={`form-input ${touched.policy_name && errors.policy_name ? 'error' : ''}`}
                  value={newPolicy.policy_name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_name: e.target.value })}
                  onBlur={() => touchField('policy_name', newPolicy.policy_name)}
                  placeholder="e.g., Website Privacy Policy"
                />
                {touched.policy_name && errors.policy_name && <div className="form-error">{errors.policy_name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Policy Type</label>
                  <select
                    className="form-input"
                    value={newPolicy.policy_type}
                    onChange={(e) => setNewPolicy({ ...newPolicy, policy_type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="app">Mobile App</option>
                    <option value="employee">Employee</option>
                    <option value="customer">Customer</option>
                    <option value="marketing">Marketing</option>
                    <option value="cookies">Cookies</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jurisdiction</label>
                  <select
                    className="form-input"
                    value={newPolicy.jurisdiction}
                    onChange={(e) => setNewPolicy({ ...newPolicy, jurisdiction: e.target.value })}
                  >
                    <option value="Global">Global</option>
                    <option value="European Union">European Union</option>
                    <option value="United States">United States</option>
                    <option value="California">California</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.target_audience}
                  onChange={(e) => setNewPolicy({ ...newPolicy, target_audience: e.target.value })}
                  placeholder="e.g., Website Visitors"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Data Collected (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.data_collected?.join(', ') || ''}
                  onChange={(e) => setNewPolicy({ ...newPolicy, data_collected: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Personal Information, Contact Details"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Legal Bases (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPolicy.legal_bases?.join(', ') || ''}
                  onChange={(e) => setNewPolicy({ ...newPolicy, legal_bases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Consent, Contract"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>Cancel</button>
              <button
                className="btn btn-ai"
                onClick={handleGenerateNew}
                disabled={!newPolicy.policy_name || aiLoading}
              >
                {aiLoading ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Policy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicyGenerator;
