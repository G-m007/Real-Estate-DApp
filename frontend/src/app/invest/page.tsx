'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { motion } from 'framer-motion';

type Property = {
  id: number;
  name: string;
  location: string;
  imageUrl: string;
  totalValue: number;
  totalShares: number;
  sharesIssued: number;
  active: boolean;
  minInvestment: string;
  sharePrice: string;
  description: string;
  expectedReturn: number;
  tokenAddress: string;
  propertyType: string;
};

export default function InvestmentPage() {
  const { isSignedIn } = useUser();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSignedIn) {
      setLoading(true);
      
      fetch('/api/properties')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch properties: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.properties) {
            setProperties(data.properties);
          }
        })
        .catch(error => {
          console.error('Error fetching properties:', error);
          setError(error.message || 'Failed to fetch properties');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Available Properties</h1>
          <p className="text-gray-400">Invest in fractional real estate properties</p>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse">
                <div className="h-48 bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-red-200">
            {error}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 text-center">
            <h2 className="text-xl font-bold text-white mb-4">No Properties Available</h2>
            <p className="text-gray-300">There are currently no properties available for investment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
              >
                <Link href={`/invest/${property.id}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={property.imageUrl} 
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-900/80 text-white">
                      {property.propertyType}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-white font-semibold mb-1">{property.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{property.location}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Total Value</p>
                        <p className="text-white font-medium">${property.totalValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Expected Return</p>
                        <p className="text-green-400 font-medium">{property.expectedReturn}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Min Investment</p>
                        <p className="text-white font-medium">${property.minInvestment}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Share Price</p>
                        <p className="text-white font-medium">${property.sharePrice}</p>
                      </div>
                    </div>

                    <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                      View Details
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 