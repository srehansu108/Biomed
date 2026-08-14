import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI, patientAPI, patientMedicineAPI } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('medicines');
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [assignedMedicines, setAssignedMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    quantity: 0,
    price: 0,
    manufacturer: '',
    batch_number: '',
    expiry_date: '',
    requires_prescription: false
  });
  const [assignData, setAssignData] = useState({
    patient_id: '',
    medicine_id: '',
    medicine_name: '',
    category: '',
    dosage: '',
    quantity: 1,
    price: 0,
    prescribed_by: 'Admin',
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // ✅ FIXED: Updated fetchData function
  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'medicines') {
        const response = await medicineAPI.getAll();
        
        // ✅ Handle the response structure correctly
        let medicinesData = [];
        
        // Check if response.data.data exists (new structure)
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          medicinesData = response.data.data;
          console.log('✅ Found medicines in data.data:', medicinesData.length);
        } 
        // Check if response.data is an array (old structure)
        else if (Array.isArray(response.data)) {
          medicinesData = response.data;
          console.log('✅ Found medicines in data array:', medicinesData.length);
        } 
        // Check if response.data.medicines exists
        else if (response.data && response.data.medicines && Array.isArray(response.data.medicines)) {
          medicinesData = response.data.medicines;
          console.log('✅ Found medicines in data.medicines:', medicinesData.length);
        } 
        // Fallback
        else {
          console.warn('⚠️ Unexpected response structure:', response.data);
          medicinesData = [];
        }
        
        setMedicines(medicinesData);
        
        // Extract categories
        const cats = [...new Set(medicinesData.map(m => m.category).filter(Boolean))];
        setCategories(cats);
        
        console.log('📦 Final medicines state:', medicinesData.length, 'medicines');
        
      } else if (activeTab === 'patients') {
        const response = await patientAPI.getAll();
        let patientsData = [];
        if (Array.isArray(response.data)) {
          patientsData = response.data;
        } else if (response.data && Array.isArray(response.data.patients)) {
          patientsData = response.data.patients;
        } else if (response.data && typeof response.data === 'object') {
          patientsData = [response.data];
        }
        setPatients(patientsData);
      } else if (activeTab === 'assigned') {
        const response = await patientMedicineAPI.getAll();
        const assignedData = Array.isArray(response.data) ? response.data : [];
        setAssignedMedicines(assignedData);
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      if (activeTab === 'patients') setPatients([]);
      if (activeTab === 'medicines') setMedicines([]);
      if (activeTab === 'assigned') setAssignedMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAssignChange = (e) => {
    const { name, value } = e.target;
    setAssignData({
      ...assignData,
      [name]: value
    });
  };

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    setSelectedPatient(patientId);
    setAssignData({
      ...assignData,
      patient_id: patientId
    });
  };

  const handleMedicineSelect = (e) => {
    const medicineId = e.target.value;
    const medicine = medicines.find(m => m.medicine_id === medicineId);
    if (medicine) {
      setAssignData({
        ...assignData,
        medicine_id: medicineId,
        medicine_name: medicine.name,
        category: medicine.category,
        price: medicine.price
      });
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // ✅ Format data before sending
    const submitData = {
      name: formData.name,
      category: formData.category,
      description: formData.description || null,
      quantity: Number(formData.quantity),  // Convert to number
      price: Number(formData.price),        // Convert to number
      manufacturer: formData.manufacturer,
      batch_number: formData.batch_number,
      expiry_date: formData.expiry_date || null,  // Send null if empty
      requires_prescription: formData.requires_prescription
    };
    
    console.log('📦 Submitting medicine:', submitData); // ✅ Debug log
    
    if (editingMedicine) {
      await medicineAPI.update(editingMedicine.medicine_id, submitData);
    } else {
      await medicineAPI.create(submitData);
    }
    
    setShowAddForm(false);
    setEditingMedicine(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      quantity: 0,
      price: 0,
      manufacturer: '',
      batch_number: '',
      expiry_date: '',
      requires_prescription: false
    });
    fetchData();
  } catch (error) {
    console.error('Error saving medicine:', error);
    if (error.response) {
      console.error('Error details:', error.response.data);
      alert(`❌ Failed to save medicine: ${error.response.data.detail || 'Please try again.'}`);
    } else {
      alert('❌ Failed to save medicine. Please try again.');
    }
  }
};

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await patientMedicineAPI.assign(assignData);
      setShowAssignForm(false);
      setAssignData({
        patient_id: '',
        medicine_id: '',
        medicine_name: '',
        category: '',
        dosage: '',
        quantity: 1,
        price: 0,
        prescribed_by: 'Admin',
        expiry_date: '',
        notes: ''
      });
      fetchData();
      alert('✅ Medicine assigned to patient successfully!');
    } catch (error) {
      console.error('Error assigning medicine:', error);
      alert('❌ Failed to assign medicine. Please try again.');
    }
  };

  const handleDelete = async (medicineId) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await medicineAPI.delete(medicineId);
        fetchData();
      } catch (error) {
        console.error('Error deleting medicine:', error);
        alert('❌ Failed to delete medicine. Please try again.');
      }
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || '',
      category: medicine.category || '',
      description: medicine.description || '',
      quantity: medicine.quantity || 0,
      price: medicine.price || 0,
      manufacturer: medicine.manufacturer || '',
      batch_number: medicine.batch_number || '',
      expiry_date: medicine.expiry_date || '',
      requires_prescription: medicine.requires_prescription || false
    });
    setShowAddForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_id');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const filteredMedicines = Array.isArray(medicines) ? medicines.filter(medicine => {
    const matchesSearch = medicine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || medicine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  const patientsList = Array.isArray(patients) ? patients : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">🏥 BioMed</span>
              <span className="ml-2 text-sm text-gray-500">Admin Panel</span>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage medicines, patients, and prescriptions</p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'medicines' && (
              <button
                onClick={() => {
                  setEditingMedicine(null);
                  setFormData({
                    name: '',
                    category: '',
                    description: '',
                    quantity: 0,
                    price: 0,
                    manufacturer: '',
                    batch_number: '',
                    expiry_date: '',
                    requires_prescription: false
                  });
                  setShowAddForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                + Add Medicine
              </button>
            )}
            {activeTab === 'patients' && (
              <button
                onClick={() => {
                  setShowAssignForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                + Assign Medicine
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('medicines')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'medicines'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💊 Medicines
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Patients
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assigned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Assigned Medicines
            </button>
          </nav>
        </div>

        {/* Medicines Tab */}
        {activeTab === 'medicines' && (
          <>
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="min-w-[150px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Medicine List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading medicines...</p>
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">No medicines found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredMedicines.map((medicine) => (
                        <tr key={medicine.medicine_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{medicine.name}</div>
                            <div className="text-xs text-gray-500">{medicine.manufacturer}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{medicine.category}</td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-medium ${
                              medicine.quantity <= 50 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {medicine.quantity}
                              {medicine.quantity <= 50 && ' ⚠️'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">₹{medicine.price?.toFixed(2) || '0.00'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{medicine.batch_number}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleEdit(medicine)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(medicine.medicine_id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading patients...</p>
              </div>
            ) : patientsList.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No patients registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biometric</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patientsList.map((patient) => (
                      <tr key={patient.patient_id || patient._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {patient.patient_id || patient._id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{patient.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{patient.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{patient.phone}</td>
                        <td className="px-6 py-4 text-sm">
                          {patient.has_biometric ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-red-600">❌</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {patient.registration_complete ? (
                            <span className="text-green-600">✅ Complete</span>
                          ) : (
                            <span className="text-yellow-600">⏳ Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              const patientId = patient.patient_id || patient._id;
                              setSelectedPatient(patientId);
                              setAssignData({
                                ...assignData,
                                patient_id: patientId
                              });
                              setShowAssignForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Assign Medicine
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Assigned Medicines Tab */}
        {activeTab === 'assigned' && (
          <div className="bg-white rounded-lg shadow overflow-hidden p-6">
            <h3 className="text-lg font-semibold mb-4">📋 All Assigned Medicines</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading assigned medicines...</p>
              </div>
            ) : assignedMedicines.length === 0 ? (
              <p className="text-gray-600">No medicines assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescribed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignedMedicines.map((item, index) => (
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{item.patient_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.medicine_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.dosage}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.remaining_quantity || item.quantity}/{item.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'active' ? 'bg-green-100 text-green-800' :
                            item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.prescribed_date ? new Date(item.prescribed_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign Medicine Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Assign Medicine to Patient</h2>
              <button
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedPatient('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAssign} className="space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                <select
                  name="patient_id"
                  value={assignData.patient_id}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a patient</option>
                  {patientsList.map(patient => (
                    <option key={patient.patient_id || patient._id} value={patient.patient_id || patient._id}>
                      {patient.full_name} ({patient.patient_id || patient._id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Medicine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine *</label>
                <select
                  name="medicine_id"
                  value={assignData.medicine_id}
                  onChange={handleMedicineSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a medicine</option>
                  {medicines.map(medicine => (
                    <option key={medicine.medicine_id} value={medicine.medicine_id}>
                      {medicine.name} - ₹{medicine.price} (Stock: {medicine.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                  <input
                    type="text"
                    name="medicine_name"
                    value={assignData.medicine_name}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={assignData.category}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
              </div>

              {/* Prescription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
                  <input
                    type="text"
                    name="dosage"
                    value={assignData.dosage}
                    onChange={handleAssignChange}
                    placeholder="e.g., 1 tablet twice daily"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={assignData.quantity}
                    onChange={handleAssignChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={assignData.price}
                    onChange={handleAssignChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prescribed By</label>
                  <input
                    type="text"
                    name="prescribed_by"
                    value={assignData.prescribed_by}
                    onChange={handleAssignChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={assignData.expiry_date}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={assignData.notes}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Additional instructions or notes..."
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors">
                Assign Medicine to Patient
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMedicine(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requires_prescription"
                  checked={formData.requires_prescription}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Requires Prescription
                </label>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors">
                {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;