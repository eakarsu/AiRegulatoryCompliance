import React, { useState, useEffect, useCallback } from 'react';
import { Save, Edit2, Bot, Search, Trash2, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { settingsAPI, aiAPI, exportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { TableSkeleton } from '../components/SkeletonLoader';

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const { addToast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getAll();
      setSettings(res.data.data || res.data || []);
    } catch (e) {
      addToast('Error fetching settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((value) => {
    setSearch(value);
  }, []);

  const handleEdit = (setting) => { setEditingKey(setting.key); setEditValue(setting.value); };

  const handleSave = async (setting) => {
    try {
      await settingsAPI.update({ ...setting, value: editValue });
      setEditingKey(null);
      addToast('Setting updated successfully', 'success');
      fetchData();
    } catch (error) {
      addToast('Error updating setting', 'error');
    }
  };

  const handleDelete = async (setting) => {
    if (window.confirm(`Delete setting "${setting.key}"?`)) {
      try {
        await settingsAPI.delete(setting.id);
        addToast('Setting deleted successfully', 'success');
        fetchData();
      } catch (error) {
        addToast('Error deleting setting', 'error');
      }
    }
  };

  const handleAIRecommend = async (setting) => {
    setShowAIModal(true);
    setAILoading(true);
    try {
      const response = await aiAPI.chat(`Analyze this compliance system setting and provide recommendations:\n\nSetting: ${setting.key}\nCurrent Value: ${setting.value}\nCategory: ${setting.category}\nDescription: ${setting.description}\n\nProvide:\n1. Is the current value appropriate for compliance?\n2. Recommended value and why\n3. Security implications\n4. Best practices`, []);
      setAIResponse(response.data.response);
    } catch (error) { setAIResponse('Error with AI recommendation.'); }
    finally { setAILoading(false); }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected settings?`)) {
      try {
        for (const id of selectedIds) {
          await settingsAPI.delete(id);
        }
        addToast(`${selectedIds.length} settings deleted`, 'success');
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        addToast('Error deleting settings', 'error');
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.pdf('settings');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'settings.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      addToast('Error exporting PDF', 'error');
    }
  };

  const filteredSettings = settings.filter(s =>
    !search || s.key?.toLowerCase().includes(search.toLowerCase()) ||
    s.value?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedSettings = filteredSettings.reduce((acc, setting) => {
    const cat = setting.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(setting);
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Configure application settings</p></div>
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Configure application settings</p></div>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="table-toolbar">
          <SearchBar onSearch={handleSearch} placeholder="Search settings..." />
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">{selectedIds.length} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {Object.entries(groupedSettings).map(([category, items]) => (
        <div className="card" key={category} style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', textTransform: 'capitalize' }}>{category.replace('_', ' ')} Settings</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" className="bulk-checkbox"
                      checked={items.length > 0 && items.every(i => selectedIds.includes(i.id))}
                      onChange={() => {
                        const itemIds = items.map(i => i.id);
                        if (items.every(i => selectedIds.includes(i.id))) {
                          setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
                        } else {
                          setSelectedIds(prev => [...new Set([...prev, ...itemIds])]);
                        }
                      }}
                    />
                  </th>
                  <th>Setting</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((setting) => (
                  <tr key={setting.id}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="bulk-checkbox" checked={selectedIds.includes(setting.id)} onChange={(e) => toggleSelect(setting.id, e)} />
                    </td>
                    <td><strong>{setting.key}</strong></td>
                    <td>
                      {editingKey === setting.key ? (
                        <input type="text" className="form-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: '200px' }} autoFocus />
                      ) : (
                        <span>{setting.value}</span>
                      )}
                    </td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{setting.description}</td>
                    <td>
                      <div className="action-buttons">
                        {editingKey === setting.key ? (
                          <button className="btn btn-sm btn-primary" onClick={() => handleSave(setting)}><Save size={14} /> Save</button>
                        ) : (
                          <>
                            <button className="icon-btn" onClick={() => handleEdit(setting)} title="Edit"><Edit2 size={16} /></button>
                            <button className="icon-btn" onClick={() => handleAIRecommend(setting)} title="AI Recommend"><Bot size={16} /></button>
                            <button className="icon-btn danger" onClick={() => handleDelete(setting)} title="Delete"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="AI Setting Recommendation">
        {aiLoading ? <div className="loading"><div className="spinner"></div></div> : <div style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</div>}
      </Modal>
    </div>
  );
};

export default Settings;
