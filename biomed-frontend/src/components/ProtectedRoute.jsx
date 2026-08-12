import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getPatientId } from '../services/auth';
import { authAPI } from '../services/api';

const ProtectedRoute = ({ children, requireBiometric = true }) => {
  const [loading, setLoading] = useState(true);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const checkRegistration = async () => {
      const token = localStorage.getItem('access_token');
      const patientId = getPatientId();

      if (!token || !patientId) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.checkRegistrationStatus(patientId);
        setHasBiometric(response.data.has_biometric);
        setIsComplete(response.data.registration_complete);
      } catch (error) {
        console.error('Error checking registration:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRegistration();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // If biometric is required and not set, redirect to biometric registration
  if (requireBiometric && !hasBiometric) {
    return <Navigate to="/biometric-register" replace />;
  }

  // If registration not complete, redirect to biometric registration
  if (requireBiometric && !isComplete) {
    return <Navigate to="/biometric-register" replace />;
  }

  return children;
};

export default ProtectedRoute;