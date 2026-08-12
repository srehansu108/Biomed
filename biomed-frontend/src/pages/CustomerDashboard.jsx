import React, { useState } from 'react'

const CustomerDashboard = () => {
  const [user] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    patientId: 'PAT-2026-001'
  })

  // Mock data
  const prescriptions = [
    {
      id: 'PR-10025',
      doctor: 'Dr. Sharma',
      date: '09-Aug-2026',
      medicines: [
        { name: 'Paracetamol 500mg', quantity: 10, dosage: '1 tablet twice daily' },
        { name: 'Pantoprazole 40mg', quantity: 5, dosage: '1 tablet once daily' }
      ]
    }
  ]

  const purchaseHistory = [
    { id: 'SALE-001', date: '08-Aug-2026', amount: 450, medicines: 3 },
    { id: 'SALE-002', date: '01-Aug-2026', amount: 320, medicines: 2 }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {user.name}! 👋</h1>
        <p className="opacity-90">Patient ID: {user.patientId}</p>
        <div className="mt-4 flex gap-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✅ Biometric Enabled</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '💊', label: 'My Prescriptions', count: prescriptions.length },
          { icon: '🛒', label: 'Purchase History', count: purchaseHistory.length },
          { icon: '📱', label: 'QR Code', action: true },
          { icon: '👤', label: 'Profile', action: true }
        ].map((item, i) => (
          <div key={i} className="card cursor-pointer hover:scale-105 transition-transform">
            <div className="text-3xl">{item.icon}</div>
            <p className="font-semibold mt-2">{item.label}</p>
            {item.count !== undefined && (
              <p className="text-sm text-gray-500">{item.count} items</p>
            )}
          </div>
        ))}
      </div>

      {/* Prescriptions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">💊 Active Prescriptions</h2>
        {prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <div key={prescription.id} className="border rounded-lg p-4 mb-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{prescription.id}</p>
                  <p className="text-sm text-gray-600">{prescription.doctor}</p>
                  <p className="text-sm text-gray-500">{prescription.date}</p>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  Active
                </span>
              </div>
              <div className="mt-2">
                {prescription.medicines.map((med, idx) => (
                  <div key={idx} className="text-sm text-gray-600">
                    • {med.name} - {med.dosage}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No active prescriptions</p>
        )}
      </div>

      {/* Purchase History */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🛒 Recent Purchases</h2>
        {purchaseHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2">Invoice</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseHistory.map((purchase) => (
                  <tr key={purchase.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{purchase.id}</td>
                    <td>{purchase.date}</td>
                    <td>{purchase.medicines} medicines</td>
                    <td className="text-right font-semibold">₹{purchase.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No purchase history</p>
        )}
      </div>
    </div>
  )
}

export default CustomerDashboard