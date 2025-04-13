'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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
  }
];

type SellOrder = {
  id: string;
  property_id: string;
  user_id: string;
  tokens: number;
  price_per_token: number;
  wallet_address: string;
  tx_hash: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  property_name: string;
  location: string;
  imageUrl: string;
  buyer_id?: string;
};

export default function MarketplacePage() {
  const { isSignedIn, user } = useUser();
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [loadingSellOrders, setLoadingSellOrders] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    fetchSellOrders();
  }, []);

  const fetchSellOrders = async () => {
    try {
      setLoadingSellOrders(true);
      const response = await fetch('/api/sell-orders');
      const data = await response.json();
      
      if (data.success) {
        console.log('All sell orders from API:', data.sellOrders);
        
        // Filter only PENDING sell orders and exclude user's own orders
        const filteredOrders = data.sellOrders.filter((order: SellOrder) => {
          const isPending = order.status === 'PENDING';
          const isNotOwnOrder = order.user_id !== user?.id;
          console.log(`Order ${order.id}: isPending=${isPending}, isNotOwnOrder=${isNotOwnOrder}, status=${order.status}`);
          return isPending && isNotOwnOrder;
        });
        
        console.log('Filtered orders:', filteredOrders);
        setSellOrders(filteredOrders);
      } else {
        console.error('API returned error:', data.error);
        throw new Error(data.error || 'Failed to fetch sell orders');
      }
    } catch (error) {
      console.error('Error fetching sell orders:', error);
      toast.error('Failed to fetch marketplace listings');
    } finally {
      setLoadingSellOrders(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask to invest');
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

  const handleBuyTokens = async (sellOrder: SellOrder) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isSignedIn) {
      toast.error('Please sign in to buy tokens');
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

      const totalPrice = sellOrder.tokens * sellOrder.price_per_token;
      
      // Buy tokens from the sell order
      const tx = await contract.buyTokens(sellOrder.id, {
        value: ethers.parseEther(totalPrice.toString())
      });

      toast.loading('Processing purchase...', { id: 'buy-tokens' });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success('Purchase successful!', { id: 'buy-tokens' });
        
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
      toast.error(error.message || 'Failed to buy tokens', { id: 'buy-tokens' });
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Property Marketplace</h1>
              <p className="text-gray-400">Buy property tokens from other investors</p>
            </div>
            <div className="flex gap-4">
              <Link 
                href="/invest"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                View Properties
              </Link>
              {!walletConnected && (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace Listings */}
        <div className="space-y-4">
          {loadingSellOrders ? (
            <div className="text-gray-400">Loading marketplace listings...</div>
          ) : sellOrders.length > 0 ? (
            sellOrders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400">Sell</span>
                      <span className="text-gray-400 text-sm">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-400 text-sm">
                        Property: {order.property_name} ({order.location})
                      </div>
                      <div className="text-gray-400 text-sm">
                        Unit price: {order.price_per_token.toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Available tokens: {order.tokens.toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Seller: {order.wallet_address ? 
                          `${order.wallet_address.slice(0, 6)}...${order.wallet_address.slice(-4)}` :
                          'Unknown'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium mb-2">
                      Total: {(order.tokens * order.price_per_token).toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleBuyTokens(order)}
                      disabled={!walletConnected || !order.wallet_address || order.wallet_address.toLowerCase() === walletAddress.toLowerCase()}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!order.wallet_address ? 'Invalid Listing' :
                       order.wallet_address.toLowerCase() === walletAddress.toLowerCase() ? 
                       'Your Listing' : 
                       'Buy Tokens'}
                    </button>
                  </div>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-gray-400">No active listings in the marketplace</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 