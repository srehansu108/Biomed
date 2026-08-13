import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI } from '../services/api';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showPrescriptionOnly, setShowPrescriptionOnly] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicineAPI.getAvailable();
      setMedicines(response.data);
      const cats = [...new Set(response.data.map(m => m.category))];
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || medicine.category === selectedCategory;
    const matchesPrescription = !showPrescriptionOnly || medicine.requires_prescription;
    return matchesSearch && matchesCategory && matchesPrescription;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏥 Medicine Store</h1>
              <p className="text-gray-600 mt-1">Browse our available medicines</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm">
                ✅ {medicines.length} Medicines Available
              </span>
              <button
                onClick={() => navigate('/orders')}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                My Orders
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
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
        </div>

        {/* Medicine Grid */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading medicines...</p>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700">No medicines found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedicines.map((medicine) => (
              <div key={medicine.medicine_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{medicine.name}</h3>
                      <p className="text-sm text-gray-600">{medicine.manufacturer}</p>
                    </div>
                    {medicine.requires_prescription && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Rx Required
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium text-gray-900">{medicine.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-bold text-primary-600">₹{medicine.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stock:</span>
                      <span className={`font-medium ${
                        medicine.quantity > 50 ? 'text-green-600' : 
                        medicine.quantity > 10 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {medicine.quantity} units
                        {medicine.quantity <= 10 && ' ⚠️ Low Stock'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Navigate to order page or show medicine details
                      alert(`Order for ${medicine.name} will be processed!`);
                    }}
                    className="w-full btn-primary mt-4 py-2 rounded-lg"
                    disabled={medicine.quantity === 0}
                  >
                    {medicine.quantity === 0 ? 'Out of Stock' : 'Order Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;