import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    gender: 'male',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      // TODO: Implement actual registration API call
      console.log('Registration data:', formData)
      
      // Navigate to biometric registration
      navigate('/biometric-register', { state: { email: formData.email } })
    } catch (err) {
      setError('Registration failed. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        <p className="text-center text-gray-600 mb-6">
          Register to use biometric authentication
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="input-field"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="input-field"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="form-label">Gender</label>
              <select
                className="input-field"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Street</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, street: e.target.value}
                  })}
                />
              </div>
              <div>
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, city: e.target.value}
                  })}
                />
              </div>
              <div>
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, state: e.target.value}
                  })}
                />
              </div>
              <div>
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address.pincode}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, pincode: e.target.value}
                  })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Continue to Biometric Setup
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register