import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BiometricRegistration = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const email = location.state?.email || ''

  // Simulate WebAuthn registration
  const handleBiometricRegister = async () => {
    setStatus('loading')
    setErrorMessage('')
    
    try {
      // TODO: Implement actual WebAuthn registration
      // 1. Get registration options from backend
      // 2. Use navigator.credentials.create()
      // 3. Verify with backend
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Random success/failure for demo
      if (Math.random() > 0.2) {
        setStatus('success')
        setTimeout(() => navigate('/customer-dashboard'), 2000)
      } else {
        throw new Error('Biometric registration failed')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <h2 className="text-2xl font-bold mb-2">🔐 Biometric Setup</h2>
        <p className="text-gray-600 mb-6">
          Secure your account with fingerprint or Face ID
        </p>

        {email && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-gray-700">
            Setting up for: <span className="font-medium">{email}</span>
          </div>
        )}

        {status === 'idle' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="text-5xl mb-3">📱</div>
              <p className="text-gray-700">
                Your device will prompt you to use your fingerprint or Face ID
              </p>
              <ul className="text-left text-sm text-gray-600 mt-4 space-y-2">
                <li>✅ No fingerprint data is stored on our servers</li>
                <li>✅ All verification happens on your device</li>
                <li>✅ Your biometric data stays private</li>
              </ul>
            </div>

            <button
              onClick={handleBiometricRegister}
              className="btn-primary w-full text-lg py-3"
            >
              Register with Biometrics
            </button>

            <button
              onClick={() => navigate('/login')}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Please authenticate using your device...</p>
            <p className="text-sm text-gray-400 mt-2">Looking for fingerprint/Face ID</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-green-600">Biometric Registered!</h3>
            <p className="text-gray-600 mt-2">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">❌ {errorMessage}</p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="btn-secondary mt-4"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BiometricRegistration