import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicineAPI.getAll();
      setMedicines(response.data);
      const cats = [...new Set(response.data.map(m => m.category))];
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching medicines:', error);
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
      fetchMedicines();
    } catch (error) {
      console.error('Error saving medicine:', error);
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      category: medicine.category,
      description: medicine.description || '',
      quantity: medicine.quantity,
      price: medicine.price,
      manufacturer: medicine.manufacturer,
      batch_number: medicine.batch_number,
      expiry_date: medicine.expiry_date?.split('T')[0] || '',
      requires_prescription: medicine.requires_prescription || false
    });
    setShowAddForm(true);
  };

  const handleDelete = async (medicineId) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await medicineAPI.delete(medicineId);
        fetchMedicines();
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
            <p className="text-gray-600">Manage your medicine inventory</p>
          </div>
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
        </div>

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

        {/* Add/Edit Modal */}
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
                    <label className="form-label">Medicine Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Manufacturer *</label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Batch Number *</label>
                    <input
                      type="text"
                      name="batch_number"
                      value={formData.batch_number}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="form-label">Expiry Date *</label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="requires_prescription"
                      checked={formData.requires_prescription}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded mr-2"
                    />
                    <label className="form-label mb-0">Requires Prescription</label>
                  </div>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    rows="3"
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-3 rounded-lg">
                  {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </form>
            </div>
          </div>
        )}

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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Medicines</p>
            <p className="text-2xl font-bold">{medicines.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-2xl font-bold text-red-600">
              {medicines.filter(m => m.quantity <= 50).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-bold">
              ₹{medicines.reduce((sum, m) => sum + (m.price * m.quantity), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;