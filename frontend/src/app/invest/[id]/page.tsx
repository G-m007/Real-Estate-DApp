'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

// Local Hardhat network contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const PropertyInvestmentABI = [
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
      }
    ],
    "name": "invest",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "investmentId",
        "type": "uint256"
      }
    ],
    "name": "getInvestment",
    "outputs": [
      {
        "internalType": "address",
        "name": "investor",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokens",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "investor",
        "type": "address"
      }
    ],
    "name": "getInvestorProperties",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "investmentId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "investor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokens",
        "type": "uint256"
      }
    ],
    "name": "InvestmentMade",
    "type": "event"
  }
];

type Property = {
  id: number;
  name: string;
  location: string;
  imageUrl: string;
  images: string[];
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
  availableTokens: number;
};

// Transaction confirmation modal component
const TransactionConfirmation = ({ 
  isOpen, 
  isPending, 
  isSuccess, 
  error, 
  txHash, 
  onClose 
}: { 
  isOpen: boolean;
  isPending: boolean;
  isSuccess: boolean;
  error: string;
  txHash: string;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">
          {isPending ? "Transaction Pending" : isSuccess ? "Transaction Successful" : "Transaction Failed"}
        </h3>
        
        {isPending && (
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {isSuccess && txHash && (
          <div className="mb-4">
            <p className="text-green-400 mb-2">Your investment has been confirmed!</p>
            <p className="text-gray-400 text-sm break-all">
              Transaction Hash: {txHash}
            </p>
          </div>
        )}
        
        {error && (
          <p className="text-red-400 mb-4">{error}</p>
        )}
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {isSuccess ? "Done" : "Close"}
        </button>
      </div>
    </div>
  );
};

// Add ethereum window type
declare global {
  interface Window {
    ethereum: any;
  }
}

export default function PropertyInvestmentPage({ params }: { params: { id: string } }) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);
  const [tokens, setTokens] = useState('');
  const [error, setError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [transactionPending, setTransactionPending] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Remove the environment variable and use the constant
  const contractAddress = CONTRACT_ADDRESS;

  useEffect(() => {
    if (!params.id) return;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/properties/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch property');
        }

        if (data.success && data.property) {
          setProperty(data.property);
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
  }, [params.id]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask to invest');
      return;
    }

    try {
      // Request account access and get all accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts',
        params: [{ eth_accounts: {} }]
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // If multiple accounts are available, let the user choose
      if (accounts.length > 1) {
        // You can implement a modal or dropdown here to let users choose
        // For now, we'll just use the first account
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(accounts[0]);
      }

      setWalletConnected(true);
      toast.success('Wallet connected successfully');

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setWalletConnected(false);
          setWalletAddress('');
          toast.success('Wallet disconnected');
        } else {
          setWalletAddress(newAccounts[0]);
          toast.success('Account changed');
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error: any) {
      toast.error('Failed to connect wallet');
      console.error('Error connecting wallet:', error);
    }
  };

  const handleInvest = async () => {
    if (!property || !tokens || !user) return;

    try {
      setInvesting(true);
      setError('');
      setShowTransactionModal(true);
      setTransactionPending(true);

      // Request account access
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to invest');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        contractAddress,
        PropertyInvestmentABI,
        signer
      );

      // Convert tokens to number and validate
      const tokensNumber = parseInt(tokens);
      if (isNaN(tokensNumber) || tokensNumber <= 0) {
        throw new Error('Please enter a valid number of tokens');
      }

      // Convert property ID to number
      const propertyId = parseInt(params.id);
      if (isNaN(propertyId)) {
        throw new Error('Invalid property ID');
      }

      // Calculate investment amount based on token price
      const tokenPrice = ethers.parseEther('0.01'); // Example: 0.01 ETH per token
      const tokensBigInt = BigInt(tokensNumber); // Convert whole number to BigInt
      const investmentAmount = tokenPrice * tokensBigInt;

      // Make the investment
      const tx = await contract.invest(propertyId, tokensBigInt, {
        value: investmentAmount,
        gasLimit: 3000000 // Add explicit gas limit
      });

      // Show transaction pending toast
      toast.loading('Transaction pending...', { id: 'tx-pending' });

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found. Please check the transaction hash on the blockchain explorer.');
      }

      // Log the full receipt for debugging
      console.log('Full transaction receipt:', receipt);

      if (receipt.status === 1) {
        // Verify the contract address matches
        if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
          throw new Error(`Transaction was sent to wrong contract address. Expected: ${contractAddress}, Got: ${receipt.to}`);
        }

        // Get the investment ID from the event
        const event = receipt.logs.find((log: any) => {
          try {
            // Get the event signature
            const eventSignature = contract.interface.getEvent('InvestmentMade');
            if (!eventSignature) {
              console.error('Event signature not found');
              return false;
            }
            // Check if this log matches our event signature
            return log.topics[0] === eventSignature.topicHash;
          } catch (e) {
            console.error('Error parsing log:', e);
            return false;
          }
        });

        // Transaction successful, proceed with database update even if event not found
        setTransactionHash(tx.hash);
        setTransactionPending(false);
        setTransactionSuccess(true);
        toast.success('Investment successful!', { id: 'tx-pending' });

        // Record the investment in your backend
        try {
          const investmentData = {
            property_id: property.id,
            user_id: user.id,
            amount: ethers.formatEther(investmentAmount),
            tokens: tokensNumber,
            tx_hash: tx.hash,
            wallet_address: await signer.getAddress(),
          };

          console.log('Sending investment data to API:', investmentData);

          const response = await fetch('/api/investments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(investmentData),
          });

          const responseData = await response.json();
          console.log('API Response:', responseData);

          if (!response.ok) {
            throw new Error(responseData.error || 'Failed to record investment in database');
          }

          if (!responseData.success) {
            throw new Error(responseData.error || 'Failed to record investment');
          }

          // Update the property's available tokens
          try {
            const updateResponse = await fetch(`/api/properties/${propertyId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                available_tokens: property.availableTokens - tokensNumber,
              }),
            });

            const updateData = await updateResponse.json();
            console.log('Property update response:', updateData);

            if (!updateResponse.ok) {
              throw new Error(updateData.error || 'Failed to update property tokens');
            }

            if (!updateData.success) {
              throw new Error(updateData.error || 'Failed to update property');
            }

            // Update the local property state
            setProperty(prev => prev ? {
              ...prev,
              availableTokens: prev.availableTokens - tokensNumber
            } : null);

          } catch (err) {
            console.error('Property update error:', err);
            toast.error('Investment recorded but property update failed. Please contact support.');
          }

          // Show success modal
          setShowSuccessModal(true);
        } catch (err) {
          console.error('Database update error:', err);
          toast.error('Investment recorded on blockchain but database update failed. Please contact support.');
        }
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to make investment');
      setTransactionPending(false);
      setTransactionSuccess(false);
      console.error(err);
      toast.error(err.message || 'Investment failed', { id: 'tx-pending' });
    } finally {
      setInvesting(false);
    }
  };

  const resetTransaction = () => {
    setShowTransactionModal(false);
    setTransactionPending(false);
    setTransactionSuccess(false);
    setTransactionHash('');
    setError('');
  };

  // Transaction Success Modal
  const SuccessModal = () => {
    if (!showSuccessModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800/90 rounded-xl p-8 max-w-md w-full mx-4 border border-green-500/20">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Investment Successful!</h3>
            <p className="text-gray-300 mb-4">
              You have successfully invested in {property?.name}
            </p>
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash:</p>
              <p className="text-sm text-white break-all">{transactionHash}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/dashboard');
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/invest/${params.id}`);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please sign in to view property details and invest.</p>
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
            href="/invest"
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
          href="/invest"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </Link>

        {property && (
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
                    <p className="text-white font-medium">${property?.totalValue?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Expected Return</p>
                    <p className="text-green-400 font-medium">{property?.expectedReturn || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Available Tokens</p>
                    <p className="text-white font-medium">{property?.availableTokens?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Share Price</p>
                    <p className="text-white font-medium">${property?.sharePrice || '0'}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Description</p>
                  <p className="text-white">{property.description}</p>
                </div>
              </div>
            </div>

            {/* Investment Form */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-fit sticky top-6">
              <h2 className="text-xl font-bold text-white mb-6">Invest in Property</h2>
              
              {!walletConnected ? (
                <div>
                  <p className="text-gray-300 mb-6">Connect your wallet to invest in this property.</p>
                  <button
                    onClick={connectWallet}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Investment Amount (ETH)
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
                      max={property.availableTokens}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Minimum investment: {property.minInvestment} ETH
                    </p>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Investment Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount</span>
                        <span className="text-white">{tokens || '0'} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shares to Receive</span>
                        <span className="text-white">
                          {Math.floor(Number(tokens || 0) / Number(property?.sharePrice || 1)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Expected Annual Return</span>
                        <span className="text-green-400">{property?.expectedReturn || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleInvest}
                    disabled={investing || !tokens || parseInt(tokens) > (property?.availableTokens || 0)}
                    className={`w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                      investing || !tokens || parseInt(tokens) > (property?.availableTokens || 0)
                        ? 'bg-blue-500/50 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {investing ? 'Processing...' : 'Invest Now'}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    By investing, you agree to our terms and conditions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionConfirmation
        isOpen={showTransactionModal}
        isPending={transactionPending}
        isSuccess={transactionSuccess}
        error={error}
        txHash={transactionHash}
        onClose={resetTransaction}
      />

      <SuccessModal />

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