import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI, patientAPI, prescriptionAPI, salesAPI, patientMedicineAPI } from '../services/api';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [patientMedicines, setPatientMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showPrescriptionOnly, setShowPrescriptionOnly] = useState(false);
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    totalPurchases: 0,
    activePrescriptions: 0,
    totalSpent: 0,
    assignedMedicines: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
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

      // Fetch available medicines
      const medicinesResponse = await medicineAPI.getAvailable();
      setMedicines(medicinesResponse.data);
      const cats = [...new Set(medicinesResponse.data.map(m => m.category))];
      setCategories(cats);

      // ✅ Fetch patient's assigned medicines
      try {
        const patientMedicinesResponse = await patientMedicineAPI.getByPatient(patientId);
        const assignedMedicines = patientMedicinesResponse.data || [];
        setPatientMedicines(assignedMedicines);
      } catch (error) {
        console.log('No assigned medicines found');
        setPatientMedicines([]);
      }

      // Fetch prescriptions
      try {
        const prescriptionsResponse = await prescriptionAPI.getByPatient(patientId);
        const allPrescriptions = prescriptionsResponse.data || [];
        setPrescriptions(allPrescriptions);
      } catch (error) {
        setPrescriptions([]);
      }

      // Fetch purchase history
      try {
        const purchasesResponse = await salesAPI.getByPatient(patientId);
        const allPurchases = purchasesResponse.data || [];
        setPurchases(allPurchases);
      } catch (error) {
        setPurchases([]);
      }

      // Calculate stats
      const activePrescriptions = prescriptions.filter(p => p.status === 'active');
      const totalSpent = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

      setStats({
        totalPrescriptions: prescriptions.length,
        totalPurchases: purchases.length,
        activePrescriptions: activePrescriptions.length,
        totalSpent: totalSpent,
        assignedMedicines: patientMedicines.filter(m => m.status === 'active' && m.remaining_quantity > 0).length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_id');
    localStorage.removeItem('registration_complete');
    localStorage.removeItem('user_role');
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

  const handleTakeMedicine = async (id) => {
    if (window.confirm('Mark this medicine as taken?')) {
      try {
        await patientMedicineAPI.consume(id, 1);
        await fetchAllData();
        alert('✅ Medicine marked as taken!');
      } catch (error) {
        alert('❌ Failed to update. Please try again.');
      }
    }
  };

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || medicine.category === selectedCategory;
    const matchesPrescription = !showPrescriptionOnly || medicine.requires_prescription;
    return matchesSearch && matchesCategory && matchesPrescription;
  });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Prescriptions</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalPrescriptions}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-2">
                <span className="text-xl">💊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Prescriptions</p>
                <p className="text-xl font-bold text-green-600">{stats.activePrescriptions}</p>
              </div>
              <div className="bg-green-100 rounded-full p-2">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Assigned Medicines</p>
                <p className="text-xl font-bold text-purple-600">{stats.assignedMedicines}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-2">
                <span className="text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Purchases</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-2">
                <span className="text-xl">🛒</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Spent</p>
                <p className="text-xl font-bold text-primary-600">₹{stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-2">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Assigned Medicines Section - NEW */}
        {patientMedicines.filter(m => m.status === 'active' && m.remaining_quantity > 0).length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">💊 Your Prescribed Medicines</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientMedicines
                .filter(m => m.status === 'active' && m.remaining_quantity > 0)
                .map((item) => (
                  <div key={item._id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.medicine_name}</h3>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Active
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dosage:</span>
                        <span className="font-medium">{item.dosage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium">
                          {item.remaining_quantity} / {item.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prescribed by:</span>
                        <span className="font-medium">{item.prescribed_by}</span>
                      </div>
                      {item.notes && (
                        <div className="text-gray-600 text-xs mt-2 bg-gray-50 p-2 rounded">
                          📝 {item.notes}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleTakeMedicine(item._id)}
                      className="w-full btn-primary mt-3 py-2 rounded-lg text-sm"
                      disabled={item.remaining_quantity === 0}
                    >
                      {item.remaining_quantity === 0 ? '✅ Completed' : 'Take Medicine'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Patient Info Card */}
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

        {/* Medicine Store Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💊 Available Medicines</h2>
          
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field w-full"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="prescriptionOnly"
                checked={showPrescriptionOnly}
                onChange={(e) => setShowPrescriptionOnly(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded mr-2"
              />
              <label htmlFor="prescriptionOnly" className="text-sm text-gray-700">
                Prescription Only
              </label>
            </div>
          </div>

          {/* Medicine Grid */}
          {filteredMedicines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No medicines available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMedicines.map((medicine) => (
                <div key={medicine.medicine_id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
                      <p className="text-sm text-gray-600">{medicine.manufacturer}</p>
                    </div>
                    {medicine.requires_prescription && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Rx
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-bold text-primary-600">₹{medicine.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className={`font-medium ${
                        medicine.quantity > 50 ? 'text-green-600' : 
                        medicine.quantity > 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {medicine.quantity} units
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      alert(`Order for ${medicine.name} will be processed!`);
                    }}
                    className="w-full btn-primary mt-3 py-2 rounded-lg text-sm"
                    disabled={medicine.quantity === 0}
                  >
                    {medicine.quantity === 0 ? 'Out of Stock' : 'Order Now'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Prescriptions */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">💊 Recent Prescriptions</h2>
            <button className="text-sm text-primary-600 hover:text-primary-800">
              View All →
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No prescriptions found</p>
          ) : (
            <div className="space-y-3">
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prescription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prescription.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-medium text-gray-900">Browse Medicines</p>
            <p className="text-sm text-gray-500">Search & order</p>
          </button>
          
          <button className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">💊</div>
            <p className="font-medium text-gray-900">My Prescriptions</p>
            <p className="text-sm text-gray-500">View all</p>
          </button>
          
          <button className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">📱</div>
            <p className="font-medium text-gray-900">QR Code</p>
            <p className="text-sm text-gray-500">Quick access</p>
          </button>
          
          <button className="bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">👤</div>
            <p className="font-medium text-gray-900">Profile</p>
            <p className="text-sm text-gray-500">Update details</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;