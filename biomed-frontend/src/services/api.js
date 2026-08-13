// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'https://biomed-2nq9.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  checkRegistrationStatus: (patientId) => api.post('/auth/check-registration-status', { patient_id: patientId }),
  completeRegistration: (patientId) => api.post('/auth/complete-registration', { patient_id: patientId }),
};

// WebAuthn APIs
export const webauthnAPI = {
  getRegistrationOptions: (email) => api.post('/webauthn/register/options', { email }),
  verifyRegistration: (data) => api.post('/webauthn/register/verify', {
    credential: data.credential,
    email: data.email
  }),
  getLoginOptions: (email) => api.post('/webauthn/login/options', { email }),
  verifyLogin: (data) => api.post('/webauthn/login/verify', {
    credential: data.credential,
    email: data.email
  }),
};

// Medicine APIs
export const medicineAPI = {
  getAll: () => api.get('/medicines'),
  getAvailable: () => api.get('/medicines/available'),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
  updateStock: (id, quantity) => api.patch(`/medicines/${id}/stock`, { quantity }),
  getLowStock: (threshold = 50) => api.get(`/medicines/low-stock/${threshold}`),
};

// Patient APIs
export const patientAPI = {
  getAll: () => api.get('/patients'),
  getById: (id) => api.get(`/patients/${id}`),
  getPrescriptions: (id) => api.get(`/patients/${id}/prescriptions`),
};

// Prescription APIs
export const prescriptionAPI = {
  getAll: () => api.get('/prescriptions'),
  getById: (id) => api.get(`/prescriptions/${id}`),
  create: (data) => api.post('/prescriptions', data),
  updateStatus: (id, status) => api.patch(`/prescriptions/${id}/status?status=${status}`),
  dispense: (id) => api.post(`/prescriptions/${id}/dispense`),
};

// Sales APIs
export const salesAPI = {
  getAll: () => api.get('/sales'),
  create: (data) => api.post('/sales', data),
  getToday: () => api.get('/sales/today'),
};

// Add these to your existing api.js

// Patient APIs - Add getAll for admin
export const patientAPI = {
  getAll: () => api.get('/patients'),
  getById: (id) => api.get(`/patients/${id}`),
  getPrescriptions: (id) => api.get(`/patients/${id}/prescriptions`),
  getStats: () => api.get('/patients/stats/overview'),
};

// Medicine APIs - Add categories
export const medicineAPI = {
  getAll: () => api.get('/medicines'),
  getAvailable: () => api.get('/medicines/available'),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
  updateStock: (id, quantity) => api.patch(`/medicines/${id}/stock`, { quantity }),
  getLowStock: (threshold = 50) => api.get(`/medicines/low-stock/${threshold}`),
  getCategories: () => api.get('/medicines/categories'),
};

export default api;