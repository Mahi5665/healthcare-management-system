import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
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

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
};

// Patient APIs
export const patientAPI = {
  getHealthMetrics: (type) => api.get('/patient/health-metrics', { params: { type } }),
  addHealthMetric: (data) => api.post('/patient/health-metrics', data),
  getMedicalRecords: () => api.get('/patient/medical-records'),
  uploadMedicalRecord: (formData) => api.post('/patient/medical-records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAssignedDoctors: () => api.get('/patient/doctors'),
  getDashboardSummary: () => api.get('/patient/dashboard-summary'),
};

// Doctor APIs
export const doctorAPI = {
  getAssignedPatients: () => api.get('/doctor/patients'),
  getPatientDetails: (patientId) => api.get(`/doctor/patients/${patientId}`),
  uploadPatientRecord: (patientId, formData) => 
    api.post(`/doctor/patients/${patientId}/records`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  assignPatient: (patientId) => api.post(`/doctor/patients/${patientId}/assign`),
  getDashboardSummary: () => api.get('/doctor/dashboard-summary'),
  searchPatients: (query) => api.get('/doctor/search-patients', { params: { q: query } }),
};

// Appointment APIs
export const appointmentAPI = {
  getAppointments: () => api.get('/appointments'),
  createAppointment: (data) => api.post('/appointments', data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/appointments/${id}`),
  getUpcomingAppointments: () => api.get('/appointments/upcoming'),
};

// Chat APIs
export const chatAPI = {
  sendMessage: (message, patientId = null) => 
    api.post('/chat', { message, patient_id: patientId }),
  getChatHistory: (patientId = null) => 
    api.get('/chat/history', { params: { patient_id: patientId } }),
  analyzePatient: (patientId) => api.post(`/chat/analyze-patient/${patientId}`),
  clearHistory: (patientId = null) => 
    api.delete('/chat/clear', { params: { patient_id: patientId } }),
};

export default api;