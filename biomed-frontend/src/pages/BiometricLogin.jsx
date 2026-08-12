import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BiometricLogin = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleBiometricLogin = async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      // TODO: Implement WebAuthn login
      // 1. Get authentication options from backend
      // 2. Use navigator.credentials.get()
      // 3. Verify with backend
      
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (Math.random() > 0.3) {
        setStatus('success')
        setTimeout(() => navigate('/customer-dashboard'), 1500)
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <h2 className="text-2xl font-bold mb-2">🔐 Biometric Login</h2>
        <p className="text-gray-600 mb-6">
          Use your fingerprint or Face ID to sign in
        </p>

        {status === 'idle' && (
          <>
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl mb-6">
              <div className="text-6xl mb-3">👆</div>
              <p className="text-gray-700">
                Tap the button below and authenticate using your device
              </p>
            </div>

            <button
              onClick={handleBiometricLogin}
              className="btn-primary w-full text-lg py-3"
            >
              Authenticate with Biometrics
            </button>

            <button
              onClick={() => navigate('/login')}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Use email & password instead
            </button>
          </>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-pulse">
              <div className="text-6xl mb-4">📱</div>
            </div>
            <p className="text-gray-600">Waiting for biometric verification...</p>
            <p className="text-sm text-gray-400 mt-2">Please authenticate on your device</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-600">Welcome Back!</h3>
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

export default BiometricLogin