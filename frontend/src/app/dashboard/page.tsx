'use client';
import { UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);

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

    fetchProfile();
    fetchInvestments();
  }, [user]);

  // Calculate total value properly
  const totalValue = investments.reduce((sum, inv) => {
    // Convert propertyValue to number if it's a string
    const value = typeof inv.propertyValue === 'string' 
      ? parseFloat(inv.propertyValue) 
      : inv.propertyValue;
    return sum + (value || 0);
  }, 0);

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
            { title: "Total Value", value: `$${totalValue.toLocaleString()}`, icon: "💰" },
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
            <Link 
              href="/invest"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              New Investment
            </Link>
          </div>
          {investmentsLoading ? (
            <div className="text-gray-400">Loading investments...</div>
          ) : investments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investments.map((investment) => (
                <motion.div
                  key={investment.id}
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
                        <p className="text-gray-400 text-sm">Investment Amount</p>
                        <p className="text-white font-medium">{investment.amount} ETH</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Tokens Owned</p>
                        <p className="text-white font-medium">{investment.tokens.toLocaleString()}</p>
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
                      <p className="text-gray-400 text-sm mb-1">Transaction Hash</p>
                      <p className="text-gray-300 text-sm break-all">
                        {investment.txHash.slice(0, 6)}...{investment.txHash.slice(-4)}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
                        Invested on {new Date(investment.createdAt).toLocaleDateString()}
                      </p>
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
      </div>
    </div>
  );
} 