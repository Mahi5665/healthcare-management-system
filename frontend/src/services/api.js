import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://172.190.189.124:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  deleteAccount: () => api.delete('/auth/delete-account'),
};

// Patient APIs
export const patientAPI = {
  // Profile
  updateProfile: (data) => api.put('/patient/update-profile', data),

  // Health Data Files
  downloadHealthDataFile: (fileId) => api.get(`/patient/health-data-files/${fileId}/download`, { 
    responseType: 'blob' 
  }),
  viewHealthDataFile: (fileId) => api.get(`/patient/health-data-files/${fileId}/view`),
  deleteHealthDataFile: (fileId) => api.delete(`/patient/health-data-files/${fileId}`),

  // Health Metrics
  getHealthMetrics: (type = null, limit = 10000) => {
    const params = {};
    if (type) params.type = type;
    if (limit) params.limit = limit;
    return api.get('/patient/health-metrics', { params });
  },
  addHealthMetric: (data) => api.post('/patient/health-metrics', data),
  
  // Medical Records
  getMedicalRecords: () => api.get('/patient/medical-records'),
  uploadMedicalRecord: (formData) => api.post('/patient/medical-records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Doctors
  getAssignedDoctors: () => api.get('/patient/doctors'),
  searchDoctors: (query = '', specialization = '') => {
    const params = {};
    if (query) params.q = query;
    if (specialization) params.specialization = specialization;
    return api.get('/patient/search-doctors', { params });
  },
  
  // Doctor Requests
  sendDoctorRequest: (data) => api.post('/patient/send-doctor-request', data),
  getMyDoctorRequests: () => api.get('/patient/doctor-requests'),
  
  // Remove Doctor Assignment
  removeDoctorAssignment: (assignmentId) => api.delete(`/patient/remove-doctor/${assignmentId}`),
  
  // Health Data Upload
  uploadHealthData: (formData) => api.post('/patient/upload-health-data', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getHealthDataFiles: () => api.get('/patient/health-data-files'),
  
  // Appointments
  getAppointments: () => api.get('/patient/appointments'),
  bookAppointment: (data) => api.post('/appointments', data),
  cancelAppointment: (appointmentId) => api.put(`/patient/appointments/${appointmentId}/cancel`),
  
  // Notifications
  getNotifications: () => api.get('/patient/notifications'),
  
  // Dashboard
  getDashboardSummary: () => api.get('/patient/dashboard-summary'),

  // Auto-Generated Metrics
  getAutoMetricsSummary: () => api.get('/patient/auto-metrics-summary'),
  getAutoMetricsChartData: (metricType = 'heartbeat', days = 7) => {
    const params = {};
    if (metricType) params.type = metricType;
    if (days) params.days = days;
    return api.get('/patient/auto-metrics-chart-data', { params });
  },
};

// Doctor APIs
export const doctorAPI = {
  // Profile
  updateProfile: (data) => api.put('/doctor/update-profile', data),
  
  // Patients
  getAssignedPatients: () => api.get('/doctor/patients'),
  getPatientDetails: (patientId) => api.get(`/doctor/patients/${patientId}`),
  getPatientHealthMetrics: (patientId, type = null, limit = 10000) => {
    const params = {};
    if (type) params.type = type;
    if (limit) params.limit = limit;
    return api.get(`/doctor/patients/${patientId}/metrics`, { params });
  },
  uploadPatientRecord: (patientId, formData) => 
    api.post(`/doctor/patients/${patientId}/records`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  assignPatient: (patientId) => api.post(`/doctor/patients/${patientId}/assign`),
  searchPatients: (query = '') => {
    const params = {};
    if (query) params.q = query;
    return api.get('/doctor/search-patients', { params });
  },
  
  // Patient Health Data Files
  getPatientHealthFiles: (patientId) => api.get(`/doctor/patients/${patientId}/health-data-files`),
  
  viewHealthFile: (patientId, fileId) => 
    api.get(`/doctor/patients/${patientId}/health-data-files/${fileId}/view`),
  
  downloadHealthFile: (patientId, fileId) => 
    api.get(`/doctor/patients/${patientId}/health-data-files/${fileId}/download`, {
      responseType: 'blob'
    }),

  // Patient Requests
  getPendingRequests: () => api.get('/doctor/patient-requests'),
  acceptPatientRequest: (requestId) => api.post(`/doctor/patient-requests/${requestId}/accept`),
  rejectPatientRequest: (requestId) => api.post(`/doctor/patient-requests/${requestId}/reject`),
  
  // Remove Patient Assignment
  removePatientAssignment: (assignmentId) => api.delete(`/doctor/remove-patient/${assignmentId}`),
  
  // Appointments
  getAppointments: () => api.get('/doctor/appointments'),
  bookAppointment: (data) => api.post('/appointments', data),
  updateAppointmentStatus: (appointmentId, status, notes = '') => 
    api.put(`/appointments/${appointmentId}`, { status, notes }),
  
  // Pending Appointments Management
  getPendingAppointments: () => api.get('/appointments/pending'),
  approveAppointment: (appointmentId) => api.put(`/appointments/${appointmentId}/approve`),
  rejectAppointment: (appointmentId, notes = '') => 
    api.put(`/appointments/${appointmentId}/reject`, { notes }),
  
  // Notifications
  getNotifications: () => api.get('/doctor/notifications'),
  
  // Dashboard
  getDashboardSummary: () => api.get('/doctor/dashboard-summary'),

  // Patient Auto-Metrics
  getPatientAutoMetrics: (patientId) => 
    api.get(`/doctor/patients/${patientId}/auto-metrics`),
  getPatientAutoMetricsChartData: (patientId, metricType = 'heartbeat', days = 7) => {
    const params = {};
    if (metricType) params.type = metricType;
    if (days) params.days = days;
    return api.get(`/doctor/patients/${patientId}/auto-metrics-chart-data`, { params });
  },
};

// Appointment APIs (Generic - backward compatibility)
export const appointmentAPI = {
  getAppointments: () => api.get('/appointments'),
  createAppointment: (data) => api.post('/appointments', data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/appointments/${id}`),
  getUpcomingAppointments: () => api.get('/appointments/upcoming'),
  
  // Approve/Reject functionality
  getPending: () => api.get('/appointments/pending'),
  approve: (id) => api.put(`/appointments/${id}/approve`),
  reject: (id, notes = '') => api.put(`/appointments/${id}/reject`, { notes }),
};

// Chat APIs
export const chatAPI = {
  sendMessage: (message, patientId = null) => {
    const data = { message };
    if (patientId) data.patient_id = patientId;
    return api.post('/chat', data);
  },
  getChatHistory: (patientId = null) => {
    const params = {};
    if (patientId) params.patient_id = patientId;
    return api.get('/chat/history', { params });
  },
  analyzePatient: (patientId) => api.post(`/chat/analyze-patient/${patientId}`),
  clearHistory: (patientId = null) => {
    const params = {};
    if (patientId) params.patient_id = patientId;
    return api.delete('/chat/clear', { params });
  },
};

// Utility function for error handling
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error || error.response.data?.message || 'An error occurred';
    return {
      status: error.response.status,
      message,
      data: error.response.data
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
      data: null
    };
  } else {
    // Error in request setup
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      data: null
    };
  }
};

export { api };
export default api;