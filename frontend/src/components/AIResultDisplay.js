import React from 'react';
import {
  Bot, CheckCircle, AlertTriangle, XCircle, Info, Sparkles, ChevronRight,
  Shield, Clock, Target, FileText, Users, AlertCircle,
  BookOpen, Calendar, Zap, Award, Lock, Eye, Scale
} from 'lucide-react';

// Safe string conversion - NEVER returns [object Object]
const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(v => safeString(v)).join(', ');
  }
  if (typeof value === 'object') {
    // Try common text fields first
    const textFields = ['description', 'text', 'message', 'content', 'details', 'summary', 'name', 'title', 'action', 'finding', 'recommendation'];
    for (const field of textFields) {
      if (value[field] && typeof value[field] === 'string') {
        return value[field];
      }
    }
    // Fallback to formatted JSON (but pretty)
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Data]';
    }
  }
  return String(value);
};

const AIResultDisplay = ({ result, title, loading }) => {
  if (loading) {
    return (
      <div className="ai-result-container loading">
        <div className="ai-result-header">
          <div className="ai-icon spinning">
            <Bot size={24} />
          </div>
          <div>
            <h3>AI Analysis in Progress</h3>
            <p>Please wait while AI processes your request...</p>
          </div>
        </div>
        <div className="ai-loading-bar">
          <div className="ai-loading-progress"></div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Handle error results
  if (result.error) {
    return (
      <div className="ai-result-container ai-result-error">
        <div className="ai-result-header error">
          <div className="ai-icon">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3>Analysis Error</h3>
            <p>Unable to complete AI analysis</p>
          </div>
        </div>
        <div className="ai-result-content">
          <div className="ai-error-message">
            <AlertCircle size={20} />
            <span>{safeString(result.error)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Try to parse JSON if it's a string
  let parsedResult = result;
  if (typeof result === 'string') {
    let cleanedResult = result.trim();

    // Log for debugging
    console.log('AIResultDisplay received string, length:', cleanedResult.length);
    console.log('First 200 chars:', cleanedResult.substring(0, 200));

    // Aggressively remove ALL markdown code block markers
    cleanedResult = cleanedResult
      .replace(/^```json\s*/gi, '')
      .replace(/^```\s*/gi, '')
      .replace(/\s*```\s*$/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Try to extract JSON object
    const firstBrace = cleanedResult.indexOf('{');
    const lastBrace = cleanedResult.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResult = cleanedResult.substring(firstBrace, lastBrace + 1);
    }

    console.log('After cleaning, first 200 chars:', cleanedResult.substring(0, 200));

    try {
      parsedResult = JSON.parse(cleanedResult);
      console.log('JSON parse successful');
    } catch (e) {
      console.error('JSON parse failed:', e.message);
      // Try one more time - remove any control characters
      try {
        const sanitized = cleanedResult
          .replace(/[\x00-\x1F\x7F]/g, ' ')  // Replace control chars with space
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
        parsedResult = JSON.parse(sanitized);
        console.log('Sanitized JSON parse successful');
      } catch (e2) {
        console.error('Sanitized parse also failed:', e2.message);
        // Last resort: try to build object manually from the content
        // For now, create a simple display object
        parsedResult = {
          rawContent: cleanedResult,
          parseError: true
        };
      }
    }
  }

  // Handle parse error - display content in readable format
  if (parsedResult && parsedResult.parseError && parsedResult.rawContent) {
    // Try to extract readable content from the raw text
    const lines = parsedResult.rawContent.split('\n').filter(l => l.trim());
    const extractedData = {};

    lines.forEach(line => {
      const trimmed = line.trim();
      // Match "key": "value" or "key": value patterns
      const kvMatch = trimmed.match(/^"?([^":{]+)"?\s*:\s*"?([^"{}[\]]*)"?,?$/);
      if (kvMatch && kvMatch[1] && kvMatch[2]) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        if (key && value && !key.includes('{') && !key.includes('[')) {
          extractedData[key] = value;
        }
      }
    });

    return (
      <div className="ai-result-container">
        <div className="ai-result-header">
          <div className="ai-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h3>{extractedData.title || title || 'AI Analysis Result'}</h3>
            <p>Powered by Claude AI</p>
          </div>
        </div>
        <div className="ai-result-content">
          {extractedData.summary && (
            <div className="ai-section ai-summary-section">
              <h4><FileText size={18} /> Summary</h4>
              <div className="ai-summary-box">{extractedData.summary}</div>
            </div>
          )}
          <div className="ai-section">
            <h4><Info size={18} /> Policy Details</h4>
            <div className="ai-additional-grid">
              {Object.entries(extractedData)
                .filter(([k]) => k !== 'title' && k !== 'summary')
                .map(([key, value]) => (
                  <div key={key} className="ai-additional-item">
                    <span className="ai-additional-label">{formatLabel(key)}</span>
                    <span className="ai-additional-value">{value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error response from backend
  if (parsedResult && parsedResult.error) {
    return (
      <div className="ai-result-container">
        <div className="ai-result-header">
          <div className="ai-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h3>{parsedResult.title || title || 'AI Analysis Result'}</h3>
            <p>Powered by Claude AI</p>
          </div>
        </div>
        <div className="ai-result-content">
          <div className="ai-parse-error">
            <p>{parsedResult.summary || 'An error occurred. Please try regenerating.'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get score information
  const score = parsedResult.complianceScore ?? parsedResult.riskScore ??
                parsedResult.overallScore ?? parsedResult.score;

  const status = parsedResult.complianceStatus || parsedResult.riskLevel ||
                 parsedResult.status || parsedResult.overallStatus;

  const summary = parsedResult.summary || parsedResult.executiveSummary ||
                  parsedResult.analysis || parsedResult.overview;

  return (
    <div className="ai-result-container">
      <div className="ai-result-header">
        <div className="ai-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <h3>{title || 'AI Analysis Result'}</h3>
          <p>Powered by Claude AI</p>
        </div>
      </div>

      <div className="ai-result-content">
        {/* Score Display */}
        {score !== undefined && score !== null && (
          <div className="ai-score-section">
            <div className={`ai-score-circle ${getScoreColor(score)}`}>
              <span className="ai-score-value">{score}%</span>
              <span className="ai-score-label">Score</span>
            </div>
            {status && (
              <div className="ai-status-badge">
                {getRiskIcon(status)}
                <span>{formatLabel(status)}</span>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="ai-section ai-summary-section">
            <h4><FileText size={18} /> Executive Summary</h4>
            <div className="ai-summary-box">
              {safeString(summary)}
            </div>
          </div>
        )}

        {/* Findings */}
        <RenderArraySection
          items={parsedResult.findings}
          title="Key Findings"
          icon={AlertTriangle}
          colorClass="warning"
        />

        {/* Gaps */}
        <RenderGapsSection gaps={parsedResult.gaps || parsedResult.dataProtectionGaps} />

        {/* Recommendations */}
        <RenderRecommendations items={parsedResult.recommendations} />

        {/* Required Actions */}
        <RenderArraySection
          items={parsedResult.requiredActions || parsedResult.actions || parsedResult.actionItems}
          title="Required Actions"
          icon={CheckCircle}
          colorClass="info"
        />

        {/* Legal Risks */}
        <RenderArraySection
          items={parsedResult.legalRisks}
          title="Legal Risks"
          icon={Scale}
          colorClass="danger"
        />

        {/* Contributing Factors */}
        <RenderArraySection
          items={parsedResult.contributingFactors}
          title="Contributing Factors"
          icon={Info}
          colorClass="info"
        />

        {/* Preventive Measures */}
        <RenderArraySection
          items={parsedResult.preventiveMeasures}
          title="Preventive Measures"
          icon={Shield}
          colorClass="success"
        />

        {/* Skill Gaps */}
        <RenderTags items={parsedResult.skillGaps} title="Skill Gaps" />

        {/* Priority Trainings */}
        <RenderTags items={parsedResult.priorityTrainings} title="Priority Trainings" />

        {/* Next Steps */}
        <RenderArraySection
          items={parsedResult.nextSteps}
          title="Next Steps"
          icon={ChevronRight}
          colorClass="info"
        />

        {/* Timeline */}
        <RenderTimeline timeline={parsedResult.timeline || parsedResult.suggestedTimeline} />

        {/* Compliance Areas */}
        <RenderComplianceAreas areas={parsedResult.complianceAreas || parsedResult.complianceBreakdown} />

        {/* All Other Fields */}
        <RenderRemainingFields data={parsedResult} />
      </div>
    </div>
  );
};

// Helper functions
const getScoreColor = (score) => {
  const num = typeof score === 'number' ? score : parseInt(score) || 0;
  if (num >= 80) return 'success';
  if (num >= 60) return 'warning';
  return 'danger';
};

const getRiskIcon = (level) => {
  const normalizedLevel = safeString(level).toLowerCase();
  if (normalizedLevel.includes('low') || normalizedLevel.includes('compliant') || normalizedLevel.includes('complete')) {
    return <CheckCircle size={20} className="icon-success" />;
  }
  if (normalizedLevel.includes('medium') || normalizedLevel.includes('moderate') || normalizedLevel.includes('partial')) {
    return <AlertTriangle size={20} className="icon-warning" />;
  }
  if (normalizedLevel.includes('high') || normalizedLevel.includes('critical') || normalizedLevel.includes('non')) {
    return <XCircle size={20} className="icon-danger" />;
  }
  return <Info size={20} className="icon-info" />;
};

const formatLabel = (text) => {
  const str = safeString(text);
  return str
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Component to render array sections
const RenderArraySection = ({ items, title, icon: Icon, colorClass }) => {
  if (!items) return null;

  const itemArray = Array.isArray(items) ? items : [items];
  if (itemArray.length === 0) return null;

  return (
    <div className={`ai-section ${colorClass}`}>
      <h4><Icon size={18} /> {title}</h4>
      <ul className={`ai-list ai-list-${colorClass}`}>
        {itemArray.map((item, index) => (
          <li key={index}>
            <RenderItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
};

// Component to render a single item (handles objects properly)
const RenderItem = ({ item }) => {
  // Helper to safely convert any value to string
  const toStr = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return val.map(v => toStr(v)).join(', ');
    if (typeof val === 'object') {
      for (const k of ['description', 'text', 'name', 'title', 'value', 'content']) {
        if (val[k] && typeof val[k] === 'string') return val[k];
      }
      try { return JSON.stringify(val); } catch { return '[Data]'; }
    }
    return String(val);
  };

  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (!item) return '-';

  // For objects, extract meaningful content
  if (typeof item === 'object') {
    // Find the main text - check each field and ensure it's a string
    let mainText = '';
    const textFields = ['description', 'details', 'text', 'content', 'finding', 'issue',
                       'action', 'recommendation', 'measure', 'step', 'name', 'title', 'area'];
    for (const field of textFields) {
      if (item[field]) {
        mainText = toStr(item[field]);
        break;
      }
    }

    const severity = item.severity || item.priority || item.status || item.level;
    const category = item.category || item.type;

    if (mainText) {
      return (
        <div className="ai-item-card">
          {category && <div className="ai-item-category">{toStr(category)}</div>}
          <div className="ai-item-main">{mainText}</div>
          {severity && (
            <span className={`ai-item-badge ${toStr(severity).toLowerCase()}`}>
              {toStr(severity)}
            </span>
          )}
          {item.timeline && <div className="ai-item-meta">Timeline: {toStr(item.timeline)}</div>}
          {item.gdprArticles && Array.isArray(item.gdprArticles) && (
            <div className="ai-item-articles">
              {item.gdprArticles.map((art, i) => (
                <span key={i} className="ai-article-tag">{toStr(art)}</span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Fallback: render all key-value pairs
    return (
      <div className="ai-item-object">
        {Object.entries(item).map(([key, value]) => (
          <div key={key} className="ai-item-row">
            <span className="ai-item-key">{formatLabel(key)}:</span>
            <span className="ai-item-value">{toStr(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return toStr(item);
};

// Render gaps section with cards
const RenderGapsSection = ({ gaps }) => {
  if (!gaps) return null;

  const gapArray = Array.isArray(gaps) ? gaps : Object.entries(gaps).map(([key, val]) => ({
    area: key,
    description: typeof val === 'string' ? val : safeString(val)
  }));

  if (gapArray.length === 0) return null;

  return (
    <div className="ai-section">
      <h4><XCircle size={18} /> Identified Gaps</h4>
      <div className="ai-gaps-grid">
        {gapArray.map((gap, index) => {
          const isString = typeof gap === 'string';
          const title = isString ? `Gap ${index + 1}` : (gap.area || gap.name || gap.title || `Gap ${index + 1}`);
          const description = isString ? gap : (gap.description || gap.details || gap.text || '');
          const severity = isString ? 'medium' : (gap.severity || gap.priority || 'medium');

          return (
            <div key={index} className={`ai-gap-card ${safeString(severity).toLowerCase()}`}>
              <div className="ai-gap-header">
                <span className="ai-gap-area">{safeString(title)}</span>
                <span className={`ai-gap-severity ${safeString(severity).toLowerCase()}`}>
                  {safeString(severity)}
                </span>
              </div>
              {description && <p>{safeString(description)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Render recommendations with numbers
const RenderRecommendations = ({ items }) => {
  if (!items) return null;

  const itemArray = Array.isArray(items) ? items : [items];
  if (itemArray.length === 0) return null;

  // Helper to safely get string from any value
  const getString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      // Try to find a text field
      for (const key of ['action', 'recommendation', 'description', 'text', 'details', 'content', 'name', 'title']) {
        if (val[key] && typeof val[key] === 'string') {
          return val[key];
        }
      }
      // Stringify as fallback
      try {
        return JSON.stringify(val);
      } catch {
        return '[Data]';
      }
    }
    return String(val);
  };

  return (
    <div className="ai-section ai-recommendations-section">
      <h4><Zap size={18} /> Recommendations</h4>
      <div className="ai-recommendations-list">
        {itemArray.map((item, index) => {
          // Extract all fields safely
          let text = '';
          let priority = '';
          let timeline = '';
          let area = '';

          if (typeof item === 'string') {
            text = item;
          } else if (item && typeof item === 'object') {
            // Get text from the first available field
            const textFields = ['action', 'recommendation', 'description', 'text', 'details', 'content'];
            for (const field of textFields) {
              if (item[field]) {
                text = getString(item[field]);
                break;
              }
            }
            // If still no text, stringify the whole object
            if (!text) {
              text = JSON.stringify(item);
            }
            // Get other fields
            priority = item.priority ? getString(item.priority) : '';
            timeline = item.timeline ? getString(item.timeline) : '';
            area = item.area ? getString(item.area) : '';
          }

          return (
            <div key={index} className="ai-recommendation-item">
              <span className="ai-recommendation-number">{index + 1}</span>
              <div className="ai-recommendation-content">
                {area && <div className="ai-recommendation-area">{area}</div>}
                <div className="ai-recommendation-text">{text}</div>
                {(priority || timeline) && (
                  <div className="ai-recommendation-meta">
                    {priority && (
                      <span className={`ai-priority-badge ${priority.toLowerCase()}`}>
                        {priority}
                      </span>
                    )}
                    {timeline && (
                      <span className="ai-timeline-badge">
                        <Clock size={14} /> {timeline}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Render tags (for skill gaps, trainings, etc.)
const RenderTags = ({ items, title }) => {
  if (!items) return null;

  const itemArray = Array.isArray(items) ? items : [items];
  if (itemArray.length === 0) return null;

  // Helper to get tag text safely
  const getTagText = (item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return String(item);
    if (item && typeof item === 'object') {
      // Try common name fields
      for (const key of ['name', 'title', 'skill', 'text', 'label', 'value']) {
        if (item[key] && typeof item[key] === 'string') {
          return item[key];
        }
      }
      // Stringify as fallback
      try {
        return JSON.stringify(item);
      } catch {
        return '[Item]';
      }
    }
    return String(item || '');
  };

  return (
    <div className="ai-section">
      <h4><BookOpen size={18} /> {title}</h4>
      <div className="ai-tags">
        {itemArray.map((item, index) => (
          <span key={index} className="ai-tag">
            {getTagText(item)}
          </span>
        ))}
      </div>
    </div>
  );
};

// Render timeline
const RenderTimeline = ({ timeline }) => {
  if (!timeline) return null;

  if (typeof timeline === 'string') {
    return (
      <div className="ai-section">
        <h4><Calendar size={18} /> Timeline</h4>
        <p>{timeline}</p>
      </div>
    );
  }

  const items = Array.isArray(timeline) ? timeline : Object.entries(timeline).map(([phase, details]) => ({
    phase,
    ...( typeof details === 'string' ? { description: details } : details)
  }));

  if (items.length === 0) return null;

  return (
    <div className="ai-section">
      <h4><Calendar size={18} /> Timeline</h4>
      <div className="ai-timeline">
        {items.map((item, index) => (
          <div key={index} className="ai-timeline-item">
            <div className="ai-timeline-marker">
              <span className="ai-timeline-number">{index + 1}</span>
            </div>
            <div className="ai-timeline-content">
              <h5>{safeString(item.phase || item.stage || item.name || `Phase ${index + 1}`)}</h5>
              {item.duration && (
                <span className="ai-timeline-duration">
                  <Clock size={14} /> {safeString(item.duration)}
                </span>
              )}
              {item.description && <p>{safeString(item.description)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Render compliance areas/breakdown
const RenderComplianceAreas = ({ areas }) => {
  if (!areas) return null;

  // Handle both array and object format
  let areaArray;
  if (Array.isArray(areas)) {
    areaArray = areas;
  } else if (typeof areas === 'object') {
    areaArray = Object.entries(areas).map(([name, score]) => ({
      name: formatLabel(name),
      score: typeof score === 'number' ? score : parseInt(score) || 0
    }));
  } else {
    return null;
  }

  if (areaArray.length === 0) return null;

  return (
    <div className="ai-section">
      <h4><Target size={18} /> Compliance Areas</h4>
      <div className="ai-compliance-areas">
        {areaArray.map((area, index) => {
          const name = area.name || area.area || area.title || `Area ${index + 1}`;
          const score = area.score || area.complianceScore || 0;
          const status = area.status || area.complianceStatus;

          return (
            <div key={index} className="ai-compliance-area-card">
              <div className="ai-compliance-area-header">
                <span className="ai-compliance-area-name">{safeString(name)}</span>
                {status && (
                  <span className={`ai-compliance-area-status ${getScoreColor(score)}`}>
                    {safeString(status)}
                  </span>
                )}
              </div>
              <div className="ai-compliance-area-progress">
                <div className="ai-progress-bar">
                  <div
                    className={`ai-progress-fill ${getScoreColor(score)}`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <span className="ai-progress-label">{score}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Render any remaining fields not covered above
const RenderRemainingFields = ({ data }) => {
  const handledKeys = new Set([
    'complianceScore', 'riskScore', 'overallScore', 'score', 'probability', 'completionRate',
    'complianceStatus', 'riskLevel', 'status', 'overallStatus', 'violationType',
    'executiveSummary', 'summary', 'analysis', 'overview',
    'findings', 'issues', 'violations', 'gaps', 'dataProtectionGaps', 'skillGaps',
    'contributingFactors', 'riskFactors', 'legalRisks',
    'complianceAreas', 'areas', 'complianceBreakdown',
    'timeline', 'suggestedTimeline',
    'recommendations', 'requiredActions', 'actions', 'actionItems',
    'preventiveMeasures', 'nextSteps', 'priorityTrainings'
  ]);

  const remainingEntries = Object.entries(data).filter(([key, value]) =>
    !handledKeys.has(key) &&
    value !== null &&
    value !== undefined &&
    !key.startsWith('_')
  );

  if (remainingEntries.length === 0) return null;

  return (
    <div className="ai-section ai-additional-info">
      <h4><Info size={18} /> Additional Information</h4>
      <div className="ai-additional-grid">
        {remainingEntries.map(([key, value]) => (
          <div key={key} className="ai-additional-item">
            <span className="ai-additional-label">{formatLabel(key)}</span>
            <div className="ai-additional-value">
              {typeof value === 'object' && !Array.isArray(value) ? (
                <div className="ai-nested-object">
                  {Object.entries(value).map(([k, v]) => (
                    <div key={k} className="ai-nested-row">
                      <span className="ai-nested-key">{formatLabel(k)}:</span>
                      <span className="ai-nested-value">{safeString(v)}</span>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(value) ? (
                <div className="ai-value-list">
                  {value.map((item, i) => (
                    <div key={i} className="ai-value-item">{safeString(item)}</div>
                  ))}
                </div>
              ) : (
                <span>{safeString(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIResultDisplay;
