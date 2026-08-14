import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebAuthn } from '../hooks/useWebAuthn'

const BiometricLogin = () => {
  const navigate = useNavigate()
  const { loginBiometric, loading: authLoading, error: authError } = useWebAuthn()
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [deviceType, setDeviceType] = useState('unknown')
  const [showBiometricGuide, setShowBiometricGuide] = useState(false)

  // Detect mobile device and biometric capability
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      
      const mobile = /android|iphone|ipad|ipod/i.test(userAgent)
      setIsMobile(mobile)
      
      if (/android/i.test(userAgent)) {
        setDeviceType('android')
      } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        setDeviceType('ios')
      } else if (/windows phone/i.test(userAgent)) {
        setDeviceType('windows')
      } else {
        setDeviceType('desktop')
      }
      
      const isWebAuthnSupported = 'PublicKeyCredential' in window
      if (!isWebAuthnSupported) {
        setErrorMessage('Your browser does not support biometric authentication. Please use a modern browser.')
      }
      
      if (isWebAuthnSupported && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then(available => {
            if (!available) {
              setErrorMessage('Your device does not have biometric hardware (fingerprint/Face ID).')
            }
          })
          .catch(() => {})
      }
    }
    
    detectDevice()
  }, [])

  // Get device-specific instructions
  const getBiometricInstructions = () => {
    if (deviceType === 'android') {
      return {
        icon: '📱',
        title: 'Use your Fingerprint',
        steps: [
          '📍 Place your registered finger on the fingerprint sensor',
          '📍 For on-screen sensors: Tap and hold your finger on the screen',
          '📍 For side-mounted sensors: Touch the power button',
          '📍 Keep your finger still until verification completes'
        ],
        tips: '💡 Make sure your finger is clean and dry for best results'
      }
    } else if (deviceType === 'ios') {
      return {
        icon: '📱',
        title: 'Use Face ID or Touch ID',
        steps: [
          '📍 For Face ID: Look at your phone screen',
          '📍 For Touch ID: Place your finger on the Home button',
          '📍 Keep your face/finger in position until verification completes',
          '📍 You may need to enter your passcode as a fallback'
        ],
        tips: '💡 Ensure good lighting for Face ID or clean finger for Touch ID'
      }
    } else {
      return {
        icon: '🖥️',
        title: 'Use Windows Hello or Security Key',
        steps: [
          '📍 Use Windows Hello with fingerprint or face recognition',
          '📍 Or use a physical security key (YubiKey)',
          '📍 Follow your device\'s biometric prompt'
        ],
        tips: '💡 For desktop, you may need a security key if no biometrics available'
      }
    }
  }

  const handleBiometricLogin = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setErrorMessage('')
    setShowBiometricGuide(true)

    try {
      const response = await loginBiometric(email)
      
      if (response.success) {
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('patient_id', response.patient_id)
        
        if (rememberEmail) {
          localStorage.setItem('saved_email', email)
        } else {
          localStorage.removeItem('saved_email')
        }

        setStatus('success')
        setShowBiometricGuide(false)
        setTimeout(() => navigate('/customer-dashboard'), 1500)
      } else {
        throw new Error(response.message || 'Authentication failed')
      }
    } catch (error) {
      console.error('Biometric login error:', error)
      setStatus('error')
      setShowBiometricGuide(false)
      
      let userMessage = error.message || 'Login failed. Please try again.'
      
      if (error.name === 'NotAllowedError') {
        userMessage = 'Authentication cancelled or denied. Please try again.'
      } else if (error.name === 'SecurityError') {
        userMessage = 'Security error. Please ensure you are using HTTPS.'
      } else if (error.name === 'NotSupportedError') {
        userMessage = 'Your browser does not support biometric authentication.'
      } else if (error.message?.includes('No credentials')) {
        userMessage = 'No biometric credentials found for this email. Please register first.'
      } else if (error.message?.includes('challenge')) {
        userMessage = 'Authentication session expired. Please try again.'
      }
      
      setErrorMessage(userMessage)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBiometricLogin()
    }
  }

  const navigateToEmailLogin = () => {
    if (email) {
      localStorage.setItem('login_email', email)
    }
    navigate('/login')
  }

  const instructions = getBiometricInstructions()

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="card text-center bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-2">🔐 Biometric Login</h2>
        <p className="text-gray-600 mb-6">
          {isMobile ? 'Use your fingerprint or Face ID to sign in securely' : 'Sign in securely with biometrics'}
        </p>

        {status === 'idle' && (
          <>
            {isMobile && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-6 border border-blue-100">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{instructions.icon}</span>
                  <span className="font-medium text-gray-700">
                    {deviceType === 'android' ? '🤖 Android' : '🍎 iOS'} Device Detected
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Biometric authentication is supported on your device
                </p>
              </div>
            )}

            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl mb-6">
              <div className="text-6xl mb-3">
                {isMobile ? '👆' : '🔑'}
              </div>
              <p className="text-gray-700 font-medium mb-2">
                {isMobile ? 'Tap to authenticate with biometrics' : 'Click to authenticate'}
              </p>
              <p className="text-gray-600 text-sm">
                Your biometric data stays on your device and is never shared with us
              </p>
              {isMobile && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                  📱 Mobile optimized
                </div>
              )}
            </div>

            <div className="mb-4 text-left">
              <label className="form-label text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMessage('')
                }}
                onKeyPress={handleKeyPress}
                className="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="your@email.com"
                autoFocus
                inputMode="email"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email you used for registration
              </p>
            </div>

            <div className="flex items-center mb-4 text-left">
              <input
                type="checkbox"
                id="rememberEmail"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-600">
                Remember my email
              </label>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 animate-shake">
                <p className="text-red-600 text-sm flex items-start gap-2">
                  <span>❌</span>
                  <span>{errorMessage}</span>
                </p>
              </div>
            )}

            {authError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-700 text-sm flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{authError}</span>
                </p>
              </div>
            )}

            <button
              onClick={handleBiometricLogin}
              disabled={authLoading || !email}
              className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 rounded-xl ${
                authLoading || !email 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-primary-700 transform hover:scale-[1.02] transition-all'
              }`}
            >
              {authLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Waiting for Biometric...
                </>
              ) : (
                <>
                  <span>{isMobile ? '📱' : '🔐'}</span>
                  {isMobile ? 'Authenticate with Biometrics' : 'Authenticate with Biometrics'}
                </>
              )}
            </button>

            <button
              onClick={navigateToEmailLogin}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Use email & password instead
            </button>

            {isMobile && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                  <span>🔒</span>
                  <span>Biometric authentication uses WebAuthn standard</span>
                  <span>🔒</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-400">
                  <span>✅ Face ID</span>
                  <span>•</span>
                  <span>✅ Touch ID</span>
                  <span>•</span>
                  <span>✅ Fingerprint</span>
                </div>
              </div>
            )}
          </>
        )}

        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-pulse">
              <div className="text-7xl mb-4">
                {deviceType === 'android' ? '👆' : '📱'}
              </div>
              <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            </div>
            <p className="text-gray-700 font-medium text-lg">
              {deviceType === 'android' ? 'Waiting for fingerprint...' : 'Waiting for biometric...'}
            </p>
            
            {showBiometricGuide && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-left animate-fade-in">
                <h4 className="font-medium text-blue-800 mb-2">
                  {instructions.icon} {instructions.title}
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

            <p className="text-sm text-gray-500 mt-4">
              {authLoading ? 'Processing your request...' : 'Please authenticate on your device'}
            </p>
            
            <button
              onClick={() => {
                setStatus('idle')
                setErrorMessage('Authentication cancelled')
                setShowBiometricGuide(false)
              }}
              className="mt-6 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 animate-fade-in">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-2xl font-semibold text-green-600">Welcome Back!</h3>
            <p className="text-gray-600 mt-2">Successfully authenticated with biometrics</p>
            <p className="text-sm text-gray-400 mt-2">
              Redirecting to dashboard...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4 max-w-xs mx-auto">
              <div className="bg-green-500 h-2 rounded-full animate-progress"></div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-4xl mb-3">❌</div>
              <p className="text-red-600 font-medium mb-2">Authentication Failed</p>
              <p className="text-sm text-red-500">{errorMessage}</p>
              
              {isMobile && (
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                  💡 Tip: Make sure your finger is clean and properly positioned on the sensor
                </div>
              )}
            </div>
            
            <div className="mt-4 space-y-3">
              <button
                onClick={() => {
                  setStatus('idle')
                  setErrorMessage('')
                  setShowBiometricGuide(true)
                }}
                className="btn-primary w-full py-3 rounded-xl"
              >
                Try Again
              </button>
              
              <button
                onClick={navigateToEmailLogin}
                className="btn-secondary w-full py-3 rounded-xl"
              >
                Use Email & Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ FIX: Removed 'jsx' attribute */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-progress {
          animation: progress 1.5s ease-in-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default BiometricLogin