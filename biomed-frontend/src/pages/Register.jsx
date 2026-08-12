import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    date_of_birth: '',
    gender: 'male',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });

  // Validate form before submission
  const validateForm = () => {
    // Check password length (bcrypt limitation: max 72 bytes)
    const passwordBytes = new TextEncoder().encode(formData.password).length;
    if (passwordBytes > 72) {
      setError('Password is too long. Maximum 72 characters allowed.');
      return false;
    }
    
    // Check minimum length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    
    // Check if password contains only valid characters
    if (!/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(formData.password)) {
      setError('Password contains invalid characters.');
      return false;
    }
    
    // Validate phone number
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError('Phone number must be between 10 and 15 digits.');
      return false;
    }
    
    // Validate email
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address.');
      return false;
    }
    
    // Validate name
    if (formData.full_name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { access_token, patient_id } = response.data;
      
      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('patient_id', patient_id);
      localStorage.setItem('registration_complete', 'false');
      
      // Navigate to biometric registration (MANDATORY)
      navigate('/biometric-register', { 
        state: { 
          email: formData.email,
          patient_id: patient_id,
          isMandatory: true  // Flag to indicate mandatory biometric
        } 
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({...formData, [name]: value});
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      address: {...formData.address, [name]: value}
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-center text-gray-600 mb-6">
          🔐 Biometric authentication is mandatory for registration
        </p>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">Biometric Required</p>
              <p className="text-sm text-yellow-700">
                You must set up fingerprint or Face ID authentication to complete registration.
                This is mandatory for security purposes.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="full_name"
                className="input-field"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="input-field"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label className="form-label">Phone *</label>
              <input
                type="tel"
                name="phone"
                className="input-field"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Enter 10-15 digit phone number</p>
            </div>
            
            <div>
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                name="date_of_birth"
                className="input-field"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="form-label">Gender *</label>
              <select
                name="gender"
                className="input-field"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Password *</label>
              <input
                type="password"
                name="password"
                className="input-field"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                maxLength="72"
                placeholder="Minimum 6 characters"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 characters, maximum 72 characters
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Street *</label>
                <input
                  type="text"
                  name="street"
                  className="input-field"
                  value={formData.address.street}
                  onChange={handleAddressChange}
                  required
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  className="input-field"
                  value={formData.address.city}
                  onChange={handleAddressChange}
                  required
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="state"
                  className="input-field"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                  required
                  placeholder="Maharashtra"
                />
              </div>
              <div>
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  className="input-field"
                  value={formData.address.pincode}
                  onChange={handleAddressChange}
                  required
                  placeholder="400001"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full text-lg py-3"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account & Set Up Biometrics'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;