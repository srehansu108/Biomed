import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-r from-primary-500 to-primary-700 rounded-3xl text-white">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">
            🏥 Smart Pharmacy Management
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Secure your prescriptions with biometric authentication
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
              Get Started
            </Link>
            <Link to="/login" className="bg-primary-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-900 transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          { icon: '🔐', title: 'Biometric Security', desc: 'Fingerprint & Face ID authentication' },
          { icon: '💊', title: 'Smart Prescriptions', desc: 'Digital prescription management' },
          { icon: '📊', title: 'Inventory Control', desc: 'Real-time medicine tracking' },
        ].map((feature, i) => (
          <div key={i} className="card text-center">
            <div className="text-4xl mb-3">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default Home