import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI, patientAPI, patientMedicineAPI } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('medicines');
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'medicines') {
        const response = await medicineAPI.getAll();
        setMedicines(response.data);
        const cats = [...new Set(response.data.map(m => m.category))];
        setCategories(cats);
      } else if (activeTab === 'patients') {
        const response = await patientAPI.getAll();
        setPatients(response.data);
      } else if (activeTab === 'assigned') {
        // Fetch all assigned medicines
        const response = await patientMedicineAPI.getAll();
        setAssignedMedicines(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
      if (editingMedicine) {
        await medicineAPI.update(editingMedicine.medicine_id, formData);
      } else {
        await medicineAPI.create(formData);
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
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_id');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || medicine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                className="btn-primary px-6 py-2 rounded-lg"
              >
                + Add Medicine
              </button>
            )}
            {activeTab === 'patients' && (
              <button
                onClick={() => {
                  setShowAssignForm(true);
                }}
                className="btn-primary px-6 py-2 rounded-lg"
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💊 Medicines
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Patients
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assigned'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Assigned Medicines
            </button>
          </nav>
        </div>

        {/* Medicines Tab - Same as before */}
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
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Medicine List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading patients...</p>
              </div>
            ) : patients.length === 0 ? (
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
                    {patients.map((patient) => (
                      <tr key={patient.patient_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient.patient_id}</td>
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
                              setSelectedPatient(patient.patient_id);
                              setAssignData({
                                ...assignData,
                                patient_id: patient.patient_id
                              });
                              setShowAssignForm(true);
                            }}
                            className="text-primary-600 hover:text-primary-800"
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
            <p className="text-gray-600">View all medicines assigned to patients</p>
            {/* You can add a table here to show all assigned medicines */}
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
                <label className="form-label">Select Patient *</label>
                <select
                  name="patient_id"
                  value={assignData.patient_id}
                  onChange={handleAssignChange}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.patient_id} value={patient.patient_id}>
                      {patient.full_name} ({patient.patient_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Medicine */}
              <div>
                <label className="form-label">Select Medicine *</label>
                <select
                  name="medicine_id"
                  value={assignData.medicine_id}
                  onChange={handleMedicineSelect}
                  className="input-field w-full"
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

              {/* Medicine Details (Auto-filled) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Medicine Name</label>
                  <input
                    type="text"
                    name="medicine_name"
                    value={assignData.medicine_name}
                    className="input-field w-full bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={assignData.category}
                    className="input-field w-full bg-gray-50"
                    disabled
                  />
                </div>
              </div>

              {/* Prescription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Dosage *</label>
                  <input
                    type="text"
                    name="dosage"
                    value={assignData.dosage}
                    onChange={handleAssignChange}
                    placeholder="e.g., 1 tablet twice daily"
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={assignData.quantity}
                    onChange={handleAssignChange}
                    className="input-field w-full"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={assignData.price}
                    onChange={handleAssignChange}
                    className="input-field w-full"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="form-label">Prescribed By</label>
                  <input
                    type="text"
                    name="prescribed_by"
                    value={assignData.prescribed_by}
                    onChange={handleAssignChange}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={assignData.expiry_date}
                  onChange={handleAssignChange}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  value={assignData.notes}
                  onChange={handleAssignChange}
                  className="input-field w-full"
                  rows="2"
                  placeholder="Additional instructions or notes..."
                />
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-lg">
                Assign Medicine to Patient
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Medicine Modal (Keep existing) */}
      {/* ... */}
    </div>
  );
};

export default AdminDashboard;