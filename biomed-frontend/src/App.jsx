import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import BiometricRegistration from './components/BiometricRegistration';
import BiometricLogin from './components/BiometricLogin';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';

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
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/biometric-register" element={<BiometricRegistration />} />
        <Route path="/biometric-login" element={<BiometricLogin />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <CustomerDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;