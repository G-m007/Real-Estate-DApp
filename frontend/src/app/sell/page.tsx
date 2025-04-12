'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

// Contract addresses
const PROPERTY_INVESTMENT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PROPERTY_SELL_ORDER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const PropertySellOrderABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokens",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "pricePerToken",
        "type": "uint256"
      }
    ],
    "name": "createSellOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

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
};

export default function SellPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [tokensToSell, setTokensToSell] = useState('');
  const [pricePerToken, setPricePerToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    const fetchUserProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/investments/properties?user_id=${user.id}`);
        const data = await response.json();
        
        if (data.success) {
          setProperties(data.properties);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to fetch your properties');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProperties();
  }, [user?.id]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask to sell tokens');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      toast.success('Wallet connected successfully');

      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setWalletConnected(false);
          setWalletAddress('');
        } else {
          setWalletAddress(newAccounts[0]);
        }
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const handleCreateSellOrder = async () => {
    if (!selectedProperty || !tokensToSell || !pricePerToken || !user) return;

    try {
      setCreating(true);

      if (!window.ethereum) {
        throw new Error('Please install MetaMask to sell tokens');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        PROPERTY_SELL_ORDER_ADDRESS,
        PropertySellOrderABI,
        signer
      );

      const tokensNumber = parseInt(tokensToSell);
      const priceInWei = ethers.parseEther(pricePerToken);
      const propertyIdBigInt = BigInt('0x' + selectedProperty.id.replace(/-/g, ''));

      // Create the sell order
      const tx = await contract.createSellOrder(
        propertyIdBigInt,
        tokensNumber,
        priceInWei,
        { gasLimit: 3000000 }
      );

      toast.loading('Creating sell order...', { id: 'tx-pending' });

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Record the sell order in the database
        const sellOrderData = {
          property_id: selectedProperty.id,
          user_id: user.id,
          tokens: tokensNumber,
          price_per_token: parseFloat(pricePerToken),
          wallet_address: await signer.getAddress(),
          tx_hash: tx.hash
        };

        const response = await fetch('/api/sell-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sellOrderData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to record sell order');
        }

        toast.success('Sell order created successfully!', { id: 'tx-pending' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      toast.error(error.message || 'Failed to create sell order', { id: 'tx-pending' });
    } finally {
      setCreating(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please sign in to sell your property tokens.</p>
          <Link 
            href="/login" 
            className="block w-full px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Sell Property Tokens</h1>
          <p className="text-gray-400">Create a sell order for your property tokens</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Property Selection */}
            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Select Property</h2>
                <div className="grid gap-4">
                  {properties.map((property) => (
                    <motion.button
                      key={property.id}
                      onClick={() => setSelectedProperty(property)}
                      className={`relative flex items-center p-4 rounded-lg border transition-all ${
                        selectedProperty?.id === property.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-gray-700 hover:border-orange-500/50'
                      }`}
                    >
                      <img
                        src={property.imageUrl}
                        alt={property.name}
                        className="w-16 h-16 rounded object-cover mr-4"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{property.name}</h3>
                        <p className="text-gray-400 text-sm">{property.location}</p>
                        <p className="text-orange-400 text-sm mt-1">
                          Your tokens: {property.userTokens.toLocaleString()}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sell Order Form */}
            {selectedProperty && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-fit lg:sticky lg:top-6">
                <h2 className="text-xl font-bold text-white mb-6">Create Sell Order</h2>
                
                {!walletConnected ? (
                  <div>
                    <p className="text-gray-300 mb-6">Connect your wallet to create a sell order.</p>
                    <button
                      onClick={connectWallet}
                      className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Number of Tokens to Sell
                      </label>
                      <input
                        type="number"
                        value={tokensToSell}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setTokensToSell(value);
                          }
                        }}
                        min="1"
                        max={selectedProperty.userTokens}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                      <p className="mt-2 text-sm text-gray-400">
                        Available tokens: {selectedProperty.userTokens.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Price per Token (ETH)
                      </label>
                      <input
                        type="number"
                        value={pricePerToken}
                        onChange={(e) => setPricePerToken(e.target.value)}
                        step="0.000000000000000001"
                        min="0"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                      <p className="mt-2 text-sm text-gray-400">
                        Current token value: ${selectedProperty.tokenValue.toFixed(2)}
                      </p>
                    </div>

                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tokens to Sell</span>
                          <span className="text-white">{tokensToSell || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price per Token</span>
                          <span className="text-white">
                            {pricePerToken ? `${pricePerToken} ETH` : '0 ETH'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Value</span>
                          <span className="text-white">
                            {tokensToSell && pricePerToken
                              ? `${(parseFloat(tokensToSell) * parseFloat(pricePerToken)).toFixed(8)} ETH`
                              : '0 ETH'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateSellOrder}
                      disabled={
                        creating ||
                        !tokensToSell ||
                        !pricePerToken ||
                        parseInt(tokensToSell) > selectedProperty.userTokens
                      }
                      className={`w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {creating ? 'Creating Sell Order...' : 'Create Sell Order'}
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      By creating a sell order, you agree to our terms and conditions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 text-center">
            <p className="text-gray-400 mb-4">You don't have any property tokens to sell.</p>
            <Link 
              href="/invest"
              className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Invest in Properties
            </Link>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151'
          }
        }}
      />
    </div>
  );
} 