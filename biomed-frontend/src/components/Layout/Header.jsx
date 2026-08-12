import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getPatientId, logout } from '../../services/auth';

const Header = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setAuthenticated(auth);
      if (auth) {
        setPatientId(getPatientId());
      }
    };
    
    checkAuth();
    
    // Optional: Listen for storage changes (if auth changes in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl">💊</span>
          </div>
          <span className="text-2xl font-bold text-primary-700">BioMed</span>
        </Link>
        
        <nav className="flex items-center gap-4">
          {authenticated ? (
            <>
              <Link to="/customer-dashboard" className="text-gray-700 hover:text-primary-600">
                Dashboard
              </Link>
              <Link to="/pharmacist-dashboard" className="text-gray-700 hover:text-primary-600">
                Pharmacy
              </Link>
              {patientId && (
                <span className="text-sm text-gray-500 hidden md:inline">
                  ID: {patientId}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-primary text-sm">Login</Link>
              <Link to="/register" className="btn-secondary text-sm">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;