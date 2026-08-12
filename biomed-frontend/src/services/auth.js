// src/services/auth.js
import api from './api';

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

// Get current user token
export const getToken = () => {
  return localStorage.getItem('access_token');
};

// Get current patient ID
export const getPatientId = () => {
  return localStorage.getItem('patient_id');
};

// Get current user (you can expand this)
export const getCurrentUser = () => {
  const patientId = localStorage.getItem('patient_id');
  if (!patientId) return null;
  return { patientId };
};

// Logout user
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('patient_id');
  window.location.href = '/login';
};

// Auth functions with API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: logout,
  isAuthenticated: isAuthenticated,
  getToken: getToken,
  getPatientId: getPatientId,
  getCurrentUser: getCurrentUser,
};

// Default export
export default authAPI;