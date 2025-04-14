'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getUserDetails } from "../../../../server/index";
import { ethers } from "ethers";

type Property = {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  totalValue: number;
  totalShares: number;
  sharesIssued: number;
  availableTokens: number;
  tokenValue: number;
  userTokens: number;
  expectedReturn: number;
  description: string;
};

export default function SellTokensPage({ params }: { params: { id: string } }) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [tokens, setTokens] = useState('');
  const [pricePerToken, setPricePerToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/properties/${params.id}?user_id=${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch property');
        }

        if (data.success && data.property) {
          setProperty(data.property);
          // Set initial price per token to current token value
          setPricePerToken(data.property.tokenValue.toFixed(2));
        } else {
          throw new Error(data.error || 'Property not found');
        }
      } catch (error: any) {
        console.error('Error fetching property:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [params.id, user?.id]);

  const handleSell = async () => {
    if (!property || !tokens || !pricePerToken || !user) return;

    try {
      setSelling(true);
      setError('');

      // Validate inputs
      const tokensNumber = parseInt(tokens);
      const priceNumber = parseFloat(pricePerToken);

      if (isNaN(tokensNumber) || tokensNumber <= 0) {
        throw new Error('Please enter a valid number of tokens');
      }

      if (isNaN(priceNumber) || priceNumber <= 0) {
        throw new Error('Please enter a valid price per token');
      }

      if (tokensNumber > property.userTokens) {
        throw new Error('You cannot sell more tokens than you own');
      }

      // Create sell order
      const response = await fetch('/api/sell-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          property_id: property.id,
          tokens: tokensNumber,
          price_per_token: priceNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sell order');
      }

      console.log('Sell order created successfully');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      setError(error.message);
      console.error(error.message);
    } finally {
      setSelling(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please sign in to sell your tokens.</p>
          <Link 
            href="/login" 
            className="block w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link 
            href="/sell"
            className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Property Not Found</h2>
          <p className="text-gray-300 mb-6">The property you're looking for doesn't exist or you don't have access to it.</p>
          <Link 
            href="/sell"
            className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/sell"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Property Details */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50">
              <div className="h-64 relative">
                <img 
                  src={property.imageUrl} 
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl font-bold text-white mb-1">{property.name}</h1>
                  <p className="text-gray-300">{property.location}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold text-white mb-4">Property Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Value</p>
                  <p className="text-white font-medium">${property.totalValue?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Expected Return</p>
                  <p className="text-green-400 font-medium">{property.expectedReturn || 0}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Tokens</p>
                  <p className="text-white font-medium">{property.totalShares?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Token Value</p>
                  <p className="text-white font-medium">${property.tokenValue?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Your Tokens</p>
                  <p className="text-white font-medium">{property.userTokens?.toLocaleString() || '0'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <p className="text-white">{property.description}</p>
              </div>
            </div>
          </div>

          {/* Sell Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-fit sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6">Sell Your Tokens</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Number of Tokens to Sell
                </label>
                <input
                  type="number"
                  value={tokens}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow whole numbers
                    if (value === '' || /^\d+$/.test(value)) {
                      setTokens(value);
                    }
                  }}
                  min="1"
                  max={property.userTokens}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Available tokens: {property.userTokens?.toLocaleString() || '0'}
                </p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Price Per Token (USD)
                </label>
                <input
                  type="number"
                  value={pricePerToken}
                  onChange={(e) => setPricePerToken(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Current token value: ${property.tokenValue?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h3 className="text-white font-medium mb-2">Sell Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens to Sell</span>
                    <span className="text-white">{tokens || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price Per Token</span>
                    <span className="text-white">${pricePerToken || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Value</span>
                    <span className="text-white">
                      ${(Number(tokens || 0) * Number(pricePerToken || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSell}
                disabled={selling || !tokens || !pricePerToken || parseInt(tokens) > property.userTokens}
                className={`w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                  selling || !tokens || !pricePerToken || parseInt(tokens) > property.userTokens
                    ? 'bg-red-500/50 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {selling ? 'Creating Sell Order...' : 'Create Sell Order'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                By creating a sell order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 