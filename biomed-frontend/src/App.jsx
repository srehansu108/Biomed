import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BiometricRegistration from './pages/BiometricRegistration';
import BiometricLogin from './pages/BiometricLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/biometric-register" element={<BiometricRegistration />} />
            <Route path="/biometric-login" element={<BiometricLogin />} />
            
            {/* Protected Routes - Biometric MANDATORY */}
            <Route path="/customer-dashboard" element={
              <ProtectedRoute requireBiometric={true}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/pharmacist-dashboard" element={
              <ProtectedRoute requireBiometric={true}>
                <PharmacistDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;