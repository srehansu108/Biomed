import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI, prescriptionAPI, salesAPI } from '../services/api';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    totalPurchases: 0,
    activePrescriptions: 0,
    totalSpent: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const patientId = localStorage.getItem('patient_id');
      
      if (!patientId) {
        navigate('/login');
        return;
      }

      // Fetch patient data
      const patientResponse = await patientAPI.getById(patientId);
      setPatient(patientResponse.data);

      // Fetch prescriptions
      const prescriptionsResponse = await prescriptionAPI.getByPatient(patientId);
      const allPrescriptions = prescriptionsResponse.data || [];
      setPrescriptions(allPrescriptions);

      // Fetch purchase history
      const purchasesResponse = await salesAPI.getByPatient(patientId);
      const allPurchases = purchasesResponse.data || [];
      setPurchases(allPurchases);

      // Calculate stats
      const activePrescriptions = allPrescriptions.filter(p => p.status === 'active');
      const totalSpent = allPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

      setStats({
        totalPrescriptions: allPrescriptions.length,
        totalPurchases: allPurchases.length,
        activePrescriptions: activePrescriptions.length,
        totalSpent: totalSpent
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_id');
    localStorage.removeItem('registration_complete');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'dispensed':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">🏥 BioMed</span>
              <span className="ml-2 text-sm text-gray-500">Patient Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {patient?.full_name?.split(' ')[0] || 'User'}!
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {patient?.full_name?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-primary-100 mt-1">
                Patient ID: {patient?.patient_id || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {patient?.has_biometric && (
                <span className="bg-green-500 bg-opacity-30 px-4 py-2 rounded-lg text-sm flex items-center">
                  ✅ Biometric Enabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Prescriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPrescriptions}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <span className="text-2xl">💊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Prescriptions</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePrescriptions}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <span className="text-2xl">🛒</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-primary-600">₹{stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Information Card */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{patient?.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{patient?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{patient?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{formatDate(patient?.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium capitalize">{patient?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{patient?.address?.city || 'N/A'}, {patient?.address?.state || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Prescriptions and Purchases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prescriptions */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">💊 Recent Prescriptions</h2>
              <button
                onClick={() => navigate('/prescriptions')}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View All →
              </button>
            </div>
            
            {prescriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No prescriptions found</p>
            ) : (
              <div className="space-y-4">
                {prescriptions.slice(0, 3).map((prescription, index) => (
                  <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {prescription.prescription_id || `PR-${String(index + 1).padStart(5, '0')}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {prescription.doctor_name || 'Dr. Unknown'} • {formatDate(prescription.created_at)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                        {prescription.status || 'Active'}
                      </span>
                    </div>
                    {prescription.medicines && prescription.medicines.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {prescription.medicines.map(m => m.medicine_name).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purchase History */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">🛒 Recent Purchases</h2>
              <button
                onClick={() => navigate('/purchases')}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View All →
              </button>
            </div>
            
            {purchases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No purchase history</p>
            ) : (
              <div className="space-y-4">
                {purchases.slice(0, 3).map((purchase, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">
                        {purchase.invoice_id || `SALE-${String(index + 1).padStart(3, '0')}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(purchase.created_at)} • {purchase.items_count || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">₹{purchase.total_amount?.toFixed(2) || '0.00'}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${purchase.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {purchase.status || 'Completed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <button
            onClick={() => navigate('/medicines')}
            className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-medium text-gray-900">Browse Medicines</p>
            <p className="text-sm text-gray-500">Search & order</p>
          </button>
          
          <button
            onClick={() => navigate('/prescriptions')}
            className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">💊</div>
            <p className="font-medium text-gray-900">My Prescriptions</p>
            <p className="text-sm text-gray-500">View all</p>
          </button>
          
          <button
            onClick={() => navigate('/qr-code')}
            className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">📱</div>
            <p className="font-medium text-gray-900">QR Code</p>
            <p className="text-sm text-gray-500">Quick access</p>
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">👤</div>
            <p className="font-medium text-gray-900">Profile</p>
            <p className="text-sm text-gray-500">Update details</p>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2026 BioMed Pharmacy. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;