'use client';
import { UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getUserDetails } from "../../../server/index";

type Investment = {
  id: string;
  propertyId: string;
  propertyName: string;
  location: string;
  imageUrl: string;
  amount: string;
  tokens: number;
  txHash: string;
  walletAddress: string;
  createdAt: string;
  expectedReturn: number;
  propertyValue: number;
};

type GroupedInvestment = {
  propertyId: string;
  propertyName: string;
  location: string;
  imageUrl: string;
  totalAmount: number;
  totalTokens: number;
  propertyTotalTokens: number;
  transactions: {
    amount: string;
    tokens: number;
    txHash: string;
    createdAt: string;
  }[];
  expectedReturn: number;
  propertyValue: number;
};

type Transaction = {
  id: string;
  amount: string;
  tokens: number;
  txHash: string;
  walletAddress: string;
  createdAt: string;
  propertyName: string;
  location: string;
  imageUrl: string;
  expectedReturn: number;
  propertyValue: number;
};

type SellOrder = {
  id: string;
  property_id: string;
  tokens: number;
  price_per_token: number;
  status: string;
  order_status: string;
  created_at: string;
  property_name: string;
  location: string;
  image_url: string;
  buyer_id: string | null;
};

export default function Dashboard() {
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<GroupedInvestment | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [loadingSellOrders, setLoadingSellOrders] = useState(true);

  // Group investments by property
  const groupedInvestments = useMemo(() => {
    const grouped = new Map<string, GroupedInvestment>();
    
    investments.forEach(investment => {
      if (!grouped.has(investment.propertyId)) {
        grouped.set(investment.propertyId, {
          propertyId: investment.propertyId,
          propertyName: investment.propertyName,
          location: investment.location,
          imageUrl: investment.imageUrl,
          totalAmount: 0,
          totalTokens: 0,
          propertyTotalTokens: 0,
          transactions: [],
          expectedReturn: investment.expectedReturn,
          propertyValue: investment.propertyValue
        });
      }
      
      const group = grouped.get(investment.propertyId)!;
      group.totalAmount += parseFloat(investment.amount);
      group.totalTokens += investment.tokens;
      group.propertyTotalTokens += investment.tokens;
      group.transactions.push({
        amount: investment.amount,
        tokens: investment.tokens,
        txHash: investment.txHash,
        createdAt: investment.createdAt
      });
    });
    
    return Array.from(grouped.values());
  }, [investments]);

  // Calculate total value properly
  const totalValue = groupedInvestments.reduce((sum, inv) => {
    // Calculate the value of one token for this property
    const tokenValue = inv.propertyValue / inv.propertyTotalTokens;
    // Calculate the total value of the user's tokens
    const investmentValue = tokenValue * inv.totalTokens;
    return sum + investmentValue;
  }, 0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.emailAddresses[0]) {
        try {
          const userProfile = await getUserDetails(user.emailAddresses[0].emailAddress);
          setProfile(userProfile[0]);
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    const fetchInvestments = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/investments?user_id=${user.id}`);
          const data = await response.json();
          
          if (data.success) {
            setInvestments(data.investments);
          }
        } catch (error) {
          console.error("Error fetching investments:", error);
        } finally {
          setInvestmentsLoading(false);
        }
      }
    };

    const fetchSellOrders = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/sell-orders?user_id=${user.id}`);
          const data = await response.json();
          
          if (data.success) {
            setSellOrders(data.sellOrders);
          }
        } catch (error) {
          console.error("Error fetching sell orders:", error);
        } finally {
          setLoadingSellOrders(false);
        }
      }
    };

    fetchProfile();
    fetchInvestments();
    fetchSellOrders();
  }, [user]);

  const fetchTransactions = async (propertyId: string) => {
    if (!user?.id) return;
    
    try {
      setLoadingTransactions(true);
      const response = await fetch(`/api/investments/transactions?property_id=${propertyId}&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setShowTransactions(true);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Dashboard Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to PropChain</h1>
              <p className="text-gray-400">Manage your real estate investments</p>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-white">Profile Details</h2>
            <Link 
              href="/profile/complete" 
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Edit Profile
            </Link>
          </div>

          {loading ? (
            <div className="text-gray-400">Loading profile...</div>
          ) : profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 mb-1">Username</p>
                <p className="text-white">{profile.username || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Email</p>
                <p className="text-white">{profile.email}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Phone</p>
                <p className="text-white">{profile.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Wallet Address</p>
                <p className="text-white font-mono text-sm">
                  {profile.wallet_address ? (
                    <>
                      {profile.wallet_address.slice(0, 6)}...
                      {profile.wallet_address.slice(-4)}
                    </>
                  ) : (
                    'Not connected'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">
              No profile found. Please complete your profile.
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { title: "Total Investments", value: investments.length.toString(), icon: "📊" },
            { title: "Total Investment Value", value: `$${totalValue.toLocaleString()}`, icon: "💰" },
            { title: "Average ROI", value: `${investments.length > 0 ? (investments.reduce((sum, inv) => sum + inv.expectedReturn, 0) / investments.length).toFixed(1) : '0'}%`, icon: "📈" },
            { title: "Total Tokens", value: investments.reduce((sum, inv) => sum + inv.tokens, 0).toLocaleString(), icon: "🔑" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="text-3xl mb-3">{stat.icon}</div>
              <p className="text-gray-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* My Investments Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">My Investments</h2>
            <div className="flex gap-4">
              <Link 
                href="/invest"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                New Investment
              </Link>
              {groupedInvestments.length > 0 && (
                <Link 
                  href="/sell"
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sell Tokens
                </Link>
              )}
            </div>
          </div>
          {investmentsLoading ? (
            <div className="text-gray-400">Loading investments...</div>
          ) : groupedInvestments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedInvestments.map((investment) => (
                <motion.div
                  key={investment.propertyId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50"
                >
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={investment.imageUrl} 
                      alt={investment.propertyName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold text-lg">{investment.propertyName}</h3>
                      <p className="text-gray-300 text-sm">{investment.location}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Total Investment Value</p>
                        <p className="text-white font-medium">
                          ${((investment.propertyValue / investment.propertyTotalTokens) * investment.totalTokens).toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs">
                          (${(investment.propertyValue / investment.propertyTotalTokens).toFixed(2)} per token)
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Your Tokens</p>
                        <p className="text-white font-medium">{investment.totalTokens.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs">
                          of {investment.propertyTotalTokens.toLocaleString()} total tokens
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Expected Return</p>
                        <p className="text-green-400">{investment.expectedReturn}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Property Value</p>
                        <p className="text-white">${investment.propertyValue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-gray-400 text-sm">Transaction History</p>
                        <button
                          onClick={() => {
                            setSelectedProperty(investment);
                            fetchTransactions(investment.propertyId);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                      <div className="space-y-2">
                        {investment.transactions.map((tx, index) => (
                          <div key={index} className="text-sm">
                            <p className="text-gray-300">
                              {tx.amount} ETH ({tx.tokens.toLocaleString()} tokens)
                            </p>
                            <p className="text-gray-400 text-xs">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-gray-400 mb-4">You haven't made any investments yet.</p>
              <Link 
                href="/invest"
                className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Investing
              </Link>
            </div>
          )}
        </div>

        {/* Sell Orders Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">My Sell Orders</h2>
            {investments.length > 0 && (
              <Link 
                href="/sell"
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Create Sell Order
              </Link>
            )}
          </div>
          {loadingSellOrders ? (
            <div className="text-gray-400">Loading sell orders...</div>
          ) : sellOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border ${
                    order.order_status === 'OPEN' ? 'border-yellow-500/50' :
                    order.order_status === 'COMPLETED' ? 'border-green-500/50' :
                    'border-red-500/50'
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={order.image_url} 
                      alt={order.property_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold text-lg">{order.property_name}</h3>
                      <p className="text-gray-300 text-sm">{order.location}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Tokens for Sale</p>
                        <p className="text-white font-medium">{order.tokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Price Per Token</p>
                        <p className="text-white font-medium">${order.price_per_token.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Value</p>
                        <p className="text-white font-medium">
                          ${(order.tokens * order.price_per_token).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className={`font-medium ${
                          order.order_status === 'OPEN' ? 'text-yellow-400' :
                          order.order_status === 'COMPLETED' ? 'text-green-400' :
                          'text-red-400'
                        }`}>
                          {order.order_status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-sm">Created</p>
                      <p className="text-white text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      {order.buyer_id && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-sm">Buyer</p>
                          <p className="text-white text-sm">
                            {order.buyer_id.slice(0, 6)}...{order.buyer_id.slice(-4)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-gray-400 mb-4">You haven't created any sell orders yet.</p>
              {investments.length > 0 && (
                <Link 
                  href="/sell"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Sell Order
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactions && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Transaction Details</h3>
              <button
                onClick={() => {
                  setShowTransactions(false);
                  setSelectedProperty(null);
                  setTransactions([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-2">{selectedProperty.propertyName}</h4>
              <p className="text-gray-400">{selectedProperty.location}</p>
            </div>

            {loadingTransactions ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-gray-400 text-sm">Amount</p>
                        <p className="text-white">{tx.amount} ETH</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Tokens</p>
                        <p className="text-white">{tx.tokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Date</p>
                        <p className="text-white">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Transaction Hash</p>
                        <p className="text-white font-mono text-sm break-all">
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-gray-400 text-sm">Wallet Address</p>
                      <p className="text-white font-mono text-sm">
                        {tx.walletAddress.slice(0, 6)}...{tx.walletAddress.slice(-4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No transaction details found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 