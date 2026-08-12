import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await authAPI.login(formData);
    const { access_token, patient_id, registration_complete } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('patient_id', patient_id);
    
    // Check if registration is complete
    const statusResponse = await authAPI.checkRegistrationStatus(patient_id);
    
    if (!statusResponse.data.registration_complete) {
      // User hasn't completed biometric setup - redirect to biometric registration
      navigate('/biometric-register', { 
        state: { 
          email: formData.email,
          patient_id: patient_id,
          isMandatory: true
        } 
      });
    } else {
      // Normal login flow
      navigate('/customer-dashboard');
    }
  } catch (err) {
    setError(err.response?.data?.detail || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/biometric-login" className="text-primary-600 hover:underline">
            🔐 Or login with Biometrics
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-primary-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login