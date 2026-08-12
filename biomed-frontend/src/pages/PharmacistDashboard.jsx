import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineAPI, patientAPI } from '../services/api';
import { isAuthenticated } from '../services/auth';

const PharmacistDashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medicinesResponse, patientsResponse] = await Promise.all([
        medicineAPI.getAll(),
        patientAPI.getAll(),
      ]);
      setInventory(medicinesResponse.data);
      setPatients(patientsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = inventory.filter(item => item.quantity < 50);
  const expiringItems = inventory.filter(item => {
    const expiry = new Date(item.expiry_date);
    const now = new Date();
    const diff = (expiry - now) / (1000 * 60 * 60 * 24);
    return diff < 90 && diff > 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center">
        <h1 className="text-3xl font-bold">👨‍⚕️ Pharmacist Dashboard</h1>
        <div className="flex gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
            🟢 Online
          </span>
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              navigate('/login');
            }}
            className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm hover:bg-red-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: '👤' },
          { label: 'Total Medicines', value: inventory.length, icon: '💊' },
          { label: 'Low Stock', value: lowStockItems.length, icon: '⚠️', alert: true },
          { label: 'Expiring Soon', value: expiringItems.length, icon: '⏰', alert: true }
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <span className={`text-3xl ${stat.alert && stat.value > 0 ? 'animate-pulse' : ''}`}>
                {stat.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Search */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🔍 Find Patient</h2>
        <div className="flex gap-4">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="Search by name, phone, or patient ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-primary">Search</button>
        </div>
        
        {/* QR Code Pairing */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-center text-gray-600">
            📱 Generate QR Code for customer pairing
          </p>
          <button className="btn-primary mt-2 w-full">
            Generate Pairing QR Code
          </button>
        </div>
      </div>

      {/* Inventory Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {lowStockItems.length > 0 && (
            <div className="card border-l-4 border-red-500">
              <h3 className="font-bold text-red-600 mb-2">⚠️ Low Stock Alert</h3>
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.medicine_id} className="flex justify-between py-1 border-b text-sm">
                  <span>{item.name}</span>
                  <span className="text-red-600 font-medium">{item.quantity} units</span>
                </div>
              ))}
            </div>
          )}
          
          {expiringItems.length > 0 && (
            <div className="card border-l-4 border-yellow-500">
              <h3 className="font-bold text-yellow-600 mb-2">⏰ Expiring Soon</h3>
              {expiringItems.slice(0, 5).map(item => (
                <div key={item.medicine_id} className="flex justify-between py-1 border-b text-sm">
                  <span>{item.name}</span>
                  <span className="text-yellow-600">Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inventory Summary */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">💊 Inventory Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2">Medicine</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.slice(0, 5).map((item) => (
                <tr key={item.medicine_id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{item.name}</td>
                  <td className={item.quantity < 50 ? 'text-red-600 font-bold' : ''}>
                    {item.quantity}
                  </td>
                  <td>₹{item.price}</td>
                  <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.quantity < 50 ? 'bg-red-100 text-red-700' :
                      new Date(item.expiry_date) < new Date(Date.now() + 7776000000) ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.quantity < 50 ? 'Low Stock' :
                       new Date(item.expiry_date) < new Date(Date.now() + 7776000000) ? 'Expiring' :
                       'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;