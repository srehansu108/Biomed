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
  const [isMobile, setIsMobile] = useState(false);
  const [deviceType, setDeviceType] = useState('unknown');
  const [showFingerprintGuide, setShowFingerprintGuide] = useState(false);
  
  const email = location.state?.email || localStorage.getItem('email');
  const patientId = location.state?.patient_id || localStorage.getItem('patient_id');
  const isMandatory = location.state?.isMandatory !== false;

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    const mobile = /android|iphone|ipad|ipod/i.test(userAgent)
    setIsMobile(mobile)
    
    if (/android/i.test(userAgent)) {
      setDeviceType('android')
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      setDeviceType('ios')
    } else {
      setDeviceType('desktop')
    }

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
    setShowFingerprintGuide(true);

    try {
      const response = await registerBiometric(email);
      
      if (response.success) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('patient_id', response.patient_id);
        localStorage.setItem('registration_complete', 'true');
        
        setStatus('success');
        setShowFingerprintGuide(false);
        setTimeout(() => navigate('/customer-dashboard'), 2000);
      } else {
        throw new Error('Registration failed');
      }
    } catch (err) {
      setStatus('error');
      setShowFingerprintGuide(false);
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

  // Get device-specific registration instructions
  const getRegistrationInstructions = () => {
    if (deviceType === 'android') {
      return {
        title: 'Register Your Fingerprint',
        steps: [
          '📍 Place your finger on the fingerprint sensor',
          '📍 For on-screen sensor: Tap and hold your finger on the screen',
          '📍 For side sensor: Touch the power button gently',
          '📍 Lift and place your finger multiple times for complete scan',
          '📍 Wait for the confirmation vibration/sound'
        ],
        tips: '💡 Use the finger you normally use to unlock your phone'
      }
    } else if (deviceType === 'ios') {
      return {
        title: 'Set Up Face ID or Touch ID',
        steps: [
          '📍 For Face ID: Look directly at your phone screen',
          '📍 For Touch ID: Place your finger on the Home button',
          '📍 Move your head slowly for Face ID setup',
          '📍 Keep your device at eye level for best results'
        ],
        tips: '💡 Ensure good lighting for Face ID or clean finger for Touch ID'
      }
    } else {
      return {
        title: 'Set Up Biometric Authentication',
        steps: [
          '📍 Use Windows Hello for fingerprint/face recognition',
          '📍 Or use a physical security key (YubiKey)',
          '📍 Follow your device\'s biometric setup prompt'
        ],
        tips: '💡 For desktop, use Windows Hello or a security key'
      }
    }
  }

  const instructions = getRegistrationInstructions()

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="card text-center bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-2">🔐 {isMandatory ? 'Mandatory' : 'Optional'} Biometric Setup</h2>
        <p className="text-gray-600 mb-6">
          {isMandatory 
            ? `${isMobile ? '📱' : '🖥️'} You must set up biometric authentication to complete your registration`
            : 'Secure your account with biometric authentication'}
        </p>

        {isMandatory && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm font-medium">
              ⚠️ This step is mandatory for security purposes
            </p>
          </div>
        )}

        {isMobile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">
                {deviceType === 'android' ? '🤖' : '🍎'}
              </span>
              <span className="font-medium text-gray-700">
                {deviceType === 'android' ? 'Android' : 'iOS'} Device
              </span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                Mobile Ready
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your device supports biometric authentication
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
              <div className="text-6xl mb-3">
                {isMobile ? '📱' : '🖥️'}
              </div>
              <p className="text-gray-700 font-medium">
                {isMobile 
                  ? 'Your device will prompt you to use fingerprint or Face ID'
                  : 'Your browser will prompt you for biometric authentication'}
              </p>
              <ul className="text-left text-sm text-gray-600 mt-4 space-y-2">
                <li>✅ No fingerprint data is stored on our servers</li>
                <li>✅ All verification happens on your device</li>
                <li>✅ Your biometric data stays private</li>
                {isMobile && (
                  <li className="text-blue-600">
                    📱 {deviceType === 'android' ? 'Fingerprint' : 'Face ID/Touch ID'} ready
                  </li>
                )}
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleBiometricRegister}
              className="btn-primary w-full text-lg py-4 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isMobile ? '📱' : '🔐'} Register with Biometrics
                </>
              )}
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
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">
              {deviceType === 'android' 
                ? 'Please place your finger on the sensor...' 
                : 'Please authenticate using your device...'}
            </p>
            
            {/* Fingerprint guide */}
            {showFingerprintGuide && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-left animate-fade-in">
                <h4 className="font-medium text-blue-800 mb-2">
                  {instructions.title}
                </h4>
                <ul className="text-sm text-blue-700 space-y-1.5">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">
                  {instructions.tips}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-400 mt-2">
              {attempts > 1 ? `Attempt ${attempts}: Looking for biometric` : 'Looking for biometric'}
            </p>
            
            <button
              onClick={() => {
                setStatus('idle')
                setShowFingerprintGuide(false)
                setMessage('Setup cancelled')
              }}
              className="mt-4 text-sm text-red-500 hover:text-red-700"
            >
              Cancel Setup
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 animate-fade-in">
            <div className="text-6xl mb-4 animate-bounce">✅</div>
            <h3 className="text-2xl font-semibold text-green-600">Registration Complete!</h3>
            <p className="text-gray-600 mt-2">Your account is now secured with biometrics.</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4 max-w-xs mx-auto">
              <div className="bg-green-500 h-2 rounded-full animate-progress"></div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-600">❌ {message || 'Registration failed'}</p>
              {isMobile && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Make sure your fingerprint/Face ID is set up in your device settings
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setStatus('idle')
                setShowFingerprintGuide(true)
              }}
              className="btn-primary mt-4 w-full py-3 rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-progress {
          animation: progress 1.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BiometricRegistration;