'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getUserDetails } from "../../../server/index";

const PROPERTY_INVESTMENT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PROPERTY_SELL_ORDER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const PropertySellOrderABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "sellOrderId",
        "type": "uint256"
      }
    ],
    "name": "buyTokens",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      }
    ],
    "name": "getPropertySellOrders",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "sellOrderId",
        "type": "uint256"
      }
    ],
    "name": "getSellOrder",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
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
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

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

type SellOrder = {
  id: string;
  seller: string;
  propertyId: string;
  tokens: number;
  pricePerToken: number;
  isActive: boolean;
  createdAt: string;
  property_name?: string;
  location?: string;
};

export default function InvestmentPage() {
  const { isSignedIn, user } = useUser();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [loadingSellOrders, setLoadingSellOrders] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

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

  useEffect(() => {
    fetchSellOrders();
  }, []);

  const fetchSellOrders = async () => {
    try {
      setLoadingSellOrders(true);
      const response = await fetch('/api/sell-orders');
      const data = await response.json();
      
      if (data.success) {
        setSellOrders(data.sellOrders.filter((order: SellOrder) => order.isActive));
      }
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      console.error('Failed to fetch marketplace listings');
    } finally {
      setLoadingSellOrders(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      console.error('Please install MetaMask to invest');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      console.log('Wallet connected successfully');

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
      console.error('Failed to connect wallet');
    }
  };

  const handleBuyTokens = async (sellOrder: SellOrder) => {
    if (!walletConnected) {
      console.error('Please connect your wallet first');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        PROPERTY_SELL_ORDER_ADDRESS,
        PropertySellOrderABI,
        signer
      );

      const totalPrice = sellOrder.tokens * sellOrder.pricePerToken;
      
      // Buy tokens from the sell order
      const tx = await contract.buyTokens(sellOrder.id, {
        value: ethers.parseEther(totalPrice.toString())
      });

      console.log('Processing purchase...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('Purchase successful!');
        
        // Update database
        const response = await fetch(`/api/sell-orders/${sellOrder.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'COMPLETED',
            buyer_id: user?.id,
          }),
        });

        if (!response.ok) {
          console.error('Failed to update sell order status in database');
        }

        // Refresh sell orders
        fetchSellOrders();
      }
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      console.error(error.message || 'Failed to buy tokens');
    }
  };

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
          <h1 className="text-3xl font-bold text-white mb-2">Invest in Properties</h1>
          <div className="flex justify-between items-center">
            <p className="text-gray-400">Browse available properties for investment</p>
            <Link 
              href="/marketplace"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              View Marketplace
            </Link>
          </div>
        </div>

        

        {/* Properties Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Available Properties</h2>
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
    </div>
  );
} 