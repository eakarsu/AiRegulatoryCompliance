import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification')
};

export const exportAPI = {
  pdf: (entity) => api.get(`/export/pdf/${entity}`, { responseType: 'blob' })
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getComplianceTrends: () => api.get('/dashboard/trends/compliance'),
  getRiskTrends: () => api.get('/dashboard/trends/risks'),
  getDeadlines: () => api.get('/dashboard/deadlines')
};

export const regulationsAPI = {
  getAll: (params) => api.get('/regulations', { params }),
  getOne: (id) => api.get(`/regulations/${id}`),
  create: (data) => api.post('/regulations', data),
  update: (id, data) => api.put(`/regulations/${id}`, data),
  delete: (id) => api.delete(`/regulations/${id}`),
  bulkDelete: (ids) => api.delete('/regulations/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/regulations/bulk', { ids, updates }),
  explain: (id) => api.post(`/regulations/${id}/explain`),
  analyzeRisk: (id, context) => api.post(`/regulations/${id}/analyze-risk`, { companyContext: context })
};

export const complianceAPI = {
  getAll: (params) => api.get('/compliance', { params }),
  getOne: (id) => api.get(`/compliance/${id}`),
  create: (data) => api.post('/compliance', data),
  update: (id, data) => api.put(`/compliance/${id}`, data),
  delete: (id) => api.delete(`/compliance/${id}`),
  bulkDelete: (ids) => api.delete('/compliance/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/compliance/bulk', { ids, updates }),
  analyze: (id) => api.post(`/compliance/${id}/ai-analyze`),
  getStats: () => api.get('/compliance/stats/summary')
};

export const risksAPI = {
  getAll: (params) => api.get('/risks', { params }),
  getOne: (id) => api.get(`/risks/${id}`),
  create: (data) => api.post('/risks', data),
  update: (id, data) => api.put(`/risks/${id}`, data),
  delete: (id) => api.delete(`/risks/${id}`),
  bulkDelete: (ids) => api.delete('/risks/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/risks/bulk', { ids, updates }),
  generate: (context) => api.post('/risks/ai-generate', { context }),
  analyze: (id) => api.post(`/risks/${id}/ai-analyze`),
  getStats: () => api.get('/risks/stats/summary')
};

export const policiesAPI = {
  getAll: (params) => api.get('/policies', { params }),
  getOne: (id) => api.get(`/policies/${id}`),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  delete: (id) => api.delete(`/policies/${id}`),
  bulkDelete: (ids) => api.delete('/policies/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/policies/bulk', { ids, updates }),
  generate: (policyType, requirements) => api.post('/policies/ai-generate', { policyType, requirements }),
  review: (id) => api.post(`/policies/${id}/ai-review`)
};

export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getOne: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  bulkDelete: (ids) => api.delete('/documents/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/documents/bulk', { ids, updates }),
  analyze: (id, context) => api.post(`/documents/${id}/ai-analyze`, { regulationContext: context }),
  approve: (id) => api.post(`/documents/${id}/approve`)
};

export const incidentsAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  getOne: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  delete: (id) => api.delete(`/incidents/${id}`),
  bulkDelete: (ids) => api.delete('/incidents/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/incidents/bulk', { ids, updates }),
  analyze: (id) => api.post(`/incidents/${id}/ai-analyze`),
  getStats: () => api.get('/incidents/stats/summary')
};

export const vendorsAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getOne: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  bulkDelete: (ids) => api.delete('/vendors/bulk', { data: { ids } }),
  bulkUpdate: (ids, updates) => api.put('/vendors/bulk', { ids, updates }),
  assess: (id) => api.post(`/vendors/${id}/ai-assess`),
  getStats: () => api.get('/vendors/stats/summary')
};

export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
  getOne: (id) => api.get(`/audit/${id}`),
  getByEntity: (type, id) => api.get(`/audit/entity/${type}/${id}`),
  getStats: () => api.get('/audit/stats/summary'),
  export: (params) => api.get('/audit/export/csv', { params })
};

export const reportsAPI = {
  getAll: (params) => api.get('/reports', { params }),
  getOne: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  generate: (reportType, periodStart, periodEnd) => api.post('/reports/ai-generate', { reportType, periodStart, periodEnd }),
  publish: (id) => api.post(`/reports/${id}/publish`)
};

export const trainingAPI = {
  getAll: () => api.get('/training'),
  getOne: (id) => api.get(`/training/${id}`),
  create: (data) => api.post('/training', data),
  update: (id, data) => api.put(`/training/${id}`, data),
  delete: (id) => api.delete(`/training/${id}`),
  generateContent: (topic, audience) => api.post('/training/ai-generate-content', { topic, audience }),
  getStats: () => api.get('/training/stats/summary')
};

export const alertsAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  getOne: (id) => api.get(`/alerts/${id}`),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  delete: (id) => api.delete(`/alerts/${id}`),
  markRead: (id) => api.post(`/alerts/${id}/read`),
  markAllRead: () => api.post('/alerts/mark-all-read'),
  getStats: () => api.get('/alerts/stats/summary')
};

export const frameworksAPI = {
  getAll: (params) => api.get('/frameworks', { params }),
  getOne: (id) => api.get(`/frameworks/${id}`),
  create: (data) => api.post('/frameworks', data),
  update: (id, data) => api.put(`/frameworks/${id}`, data),
  delete: (id) => api.delete(`/frameworks/${id}`)
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByCategory: (category) => api.get(`/settings/category/${category}`),
  getByKey: (key) => api.get(`/settings/key/${key}`),
  update: (data) => api.post('/settings', data),
  delete: (id) => api.delete(`/settings/${id}`)
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updatePassword: (id, password) => api.put(`/users/${id}/password`, { password }),
  delete: (id) => api.delete(`/users/${id}`)
};

export const aiAPI = {
  chat: (message, history) => api.post('/ai/chat', { message, conversationHistory: history }),
  analyzeRisk: (data, context) => api.post('/ai/analyze-risk', { regulationData: data, companyContext: context }),
  generatePolicy: (type, requirements) => api.post('/ai/generate-policy', { policyType: type, requirements }),
  analyzeDocument: (content, context) => api.post('/ai/analyze-document', { documentContent: content, regulationContext: context }),
  assessVendor: (data) => api.post('/ai/assess-vendor', { vendorData: data }),
  analyzeIncident: (data) => api.post('/ai/analyze-incident', { incidentData: data }),
  generateRisk: (context) => api.post('/ai/generate-risk', { context }),
  explainRegulation: (name) => api.post('/ai/explain-regulation', { regulationName: name }),
  generateTraining: (topic, audience) => api.post('/ai/generate-training', { topic, audience }),
  getHistory: (params) => api.get('/ai/history', { params })
};

// =====================================================
// NEW AI FEATURE APIs
// =====================================================

// AI GDPR Scanner
export const gdprScannerAPI = {
  getAll: (params) => api.get('/gdpr-scanner', { params }),
  getOne: (id) => api.get(`/gdpr-scanner/${id}`),
  create: (data) => api.post('/gdpr-scanner', data),
  update: (id, data) => api.put(`/gdpr-scanner/${id}`, data),
  delete: (id) => api.delete(`/gdpr-scanner/${id}`),
  runAIScan: (id) => api.post(`/gdpr-scanner/${id}/ai-scan`),
  getStats: () => api.get('/gdpr-scanner/stats/summary')
};

// AI Audit Scheduler
export const auditSchedulerAPI = {
  getAll: (params) => api.get('/audit-scheduler', { params }),
  getOne: (id) => api.get(`/audit-scheduler/${id}`),
  create: (data) => api.post('/audit-scheduler', data),
  update: (id, data) => api.put(`/audit-scheduler/${id}`, data),
  delete: (id) => api.delete(`/audit-scheduler/${id}`),
  getAIRecommendations: (id) => api.post(`/audit-scheduler/${id}/ai-recommend`),
  getStats: () => api.get('/audit-scheduler/stats/summary')
};

// AI Violation Predictor
export const violationPredictorAPI = {
  getAll: () => api.get('/violation-predictor'),
  getOne: (id) => api.get(`/violation-predictor/${id}`),
  create: (data) => api.post('/violation-predictor', data),
  update: (id, data) => api.put(`/violation-predictor/${id}`, data),
  delete: (id) => api.delete(`/violation-predictor/${id}`),
  runAIPrediction: (id, context) => api.post(`/violation-predictor/${id}/ai-predict`, { companyContext: context }),
  getStats: () => api.get('/violation-predictor/stats/summary')
};

// AI Training Tracker
export const trainingTrackerAPI = {
  getAll: () => api.get('/training-tracker'),
  getOne: (id) => api.get(`/training-tracker/${id}`),
  create: (data) => api.post('/training-tracker', data),
  update: (id, data) => api.put(`/training-tracker/${id}`, data),
  delete: (id) => api.delete(`/training-tracker/${id}`),
  runAIAnalysis: (id) => api.post(`/training-tracker/${id}/ai-analyze`),
  getStats: () => api.get('/training-tracker/stats/summary')
};

// AI Privacy Policy Generator
export const privacyPolicyGeneratorAPI = {
  getAll: () => api.get('/privacy-policy-generator'),
  getOne: (id) => api.get(`/privacy-policy-generator/${id}`),
  create: (data) => api.post('/privacy-policy-generator', data),
  update: (id, data) => api.put(`/privacy-policy-generator/${id}`, data),
  delete: (id) => api.delete(`/privacy-policy-generator/${id}`),
  generateAI: (id) => api.post(`/privacy-policy-generator/${id}/ai-generate`),
  generateNew: (data) => api.post('/privacy-policy-generator/ai-generate-new', data),
  getStats: () => api.get('/privacy-policy-generator/stats/summary')
};

// AI Compliance Checker (Legal)
export const complianceCheckerAPI = {
  getAll: () => api.get('/compliance-checker'),
  getOne: (id) => api.get(`/compliance-checker/${id}`),
  create: (data) => api.post('/compliance-checker', data),
  update: (id, data) => api.put(`/compliance-checker/${id}`, data),
  delete: (id) => api.delete(`/compliance-checker/${id}`),
  runAICheck: (id) => api.post(`/compliance-checker/${id}/ai-check`),
  getStats: () => api.get('/compliance-checker/stats/summary')
};

export default api;
