import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import BiometricRegistration from './pages/BiometricRegistration';
import BiometricLogin from './pages/BiometricLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && userRole !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/biometric-register" element={<BiometricRegistration />} />
        <Route path="/biometric-login" element={<BiometricLogin />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customer-dashboard" 
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
              <AdminDashboard />
          } 
        />
        <Route 
          path="/admin-dashboard" 
          element={
              <AdminDashboard />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;