import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { authAPI } from '../services/api';

const BiometricRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { registerBiometric, loading, error } = useWebAuthn();
  const [status, setStatus] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('');
  
  const email = location.state?.email || localStorage.getItem('email');
  const patientId = location.state?.patient_id || localStorage.getItem('patient_id');
  const isMandatory = location.state?.isMandatory !== false;

  useEffect(() => {
    // Check if we have necessary data
    if (!email || !patientId) {
      navigate('/register');
      return;
    }

    // Check if user already has biometric
    const checkStatus = async () => {
      try {
        const response = await authAPI.checkRegistrationStatus(patientId);
        if (response.data.registration_complete) {
          // Already registered, redirect to dashboard
          navigate('/customer-dashboard');
          return;
        }
        setStatus('idle');
      } catch (err) {
        console.error('Error checking registration status:', err);
      }
    };
    checkStatus();
  }, [email, patientId, navigate]);

  const handleBiometricRegister = async () => {
    setStatus('loading');
    setMessage('');
    setAttempts(prev => prev + 1);

    try {
      const response = await registerBiometric(email);
      
      if (response.success) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('patient_id', response.patient_id);
        localStorage.setItem('registration_complete', 'true');
        
        setStatus('success');
        setTimeout(() => navigate('/customer-dashboard'), 2000);
      } else {
        throw new Error('Registration failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Biometric registration failed. Please try again.');
    }
  };

  const handleSkip = () => {
    if (isMandatory) {
      setMessage('⚠️ Biometric authentication is mandatory to complete registration.');
      return;
    }
    navigate('/customer-dashboard');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <h2 className="text-2xl font-bold mb-2">🔐 Mandatory Biometric Setup</h2>
        <p className="text-gray-600 mb-6">
          {isMandatory 
            ? 'You must set up biometric authentication to complete your registration' 
            : 'Secure your account with biometric authentication'}
        </p>

        {isMandatory && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm font-medium">
              ⚠️ This step is mandatory for security purposes
            </p>
          </div>
        )}

        {email && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-gray-700">
            Setting up for: <span className="font-medium">{email}</span>
            <br />
            <span className="text-xs text-gray-500">Patient ID: {patientId}</span>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            status === 'error' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
          }`}>
            {message}
          </div>
        )}

        {status === 'idle' && (
          <>
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl mb-6">
              <div className="text-6xl mb-3">📱</div>
              <p className="text-gray-700 font-medium">
                Your device will prompt you to use your fingerprint or Face ID
              </p>
              <ul className="text-left text-sm text-gray-600 mt-4 space-y-2">
                <li>✅ No fingerprint data is stored on our servers</li>
                <li>✅ All verification happens on your device</li>
                <li>✅ Your biometric data stays private</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleBiometricRegister}
              className="btn-primary w-full text-lg py-3"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Register with Biometrics'}
            </button>

            <button
              onClick={handleSkip}
              className={`mt-4 text-sm ${
                isMandatory 
                  ? 'text-red-500 hover:text-red-700 font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {isMandatory 
                ? '⚠️ Biometric setup is mandatory - cannot skip' 
                : 'Skip for now'}
            </button>
          </>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Please authenticate using your device...</p>
            <p className="text-sm text-gray-400 mt-2">
              {attempts > 1 ? `Attempt ${attempts}: Looking for fingerprint/Face ID` : 'Looking for fingerprint/Face ID'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-green-600">Registration Complete!</h3>
            <p className="text-gray-600 mt-2">Your account is now secured with biometrics.</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">❌ {message || 'Registration failed'}</p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="btn-primary mt-4 w-full"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricRegistration;