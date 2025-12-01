import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaCoins, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { creditsAPI, authAPI } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    billing: {
      plan: 'Professional',
      billingCycle: 'monthly',
      planPrice: '$99',
      nextBillingDate: '2024-02-15',
    },
    credits: {
      currentBalance: 0,
      totalUsed: 0,
      totalAdded: 0,
    },
  });
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    fetchCreditData();
    fetchBillingData();
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoadingCredits(true);

      // Fetch current balance and transaction history (no userId needed - gets current user's data)
      const [balanceResponse, transactionsResponse] = await Promise.all([
        creditsAPI.getBalance(),
        creditsAPI.getTransactions({ limit: 1000 })
      ]);

      const currentBalance = balanceResponse.data.credits || 0;
      const transactions = transactionsResponse.data.transactions || [];

      // Calculate total used and total added from transactions
      const totalUsed = transactions
        .filter(txn => txn.type === 'deduction')
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      const totalAdded = transactions
        .filter(txn => txn.type === 'addition')
        .reduce((sum, txn) => sum + txn.amount, 0);

      setSettings(prev => ({
        ...prev,
        credits: {
          currentBalance,
          totalUsed,
          totalAdded,
        }
      }));
    } catch (err) {
      console.error('Error fetching credit data:', err);
    } finally {
      setLoadingCredits(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      setLoadingBilling(true);
      
      // Fetch current user data from API
      const response = await authAPI.getCurrentUser();
      const user = response.data?.user || response.user;
      
      if (user) {
        // Map plan to display name
        const planMap = {
          'free': 'Free',
          'basic': 'Basic',
          'professional': 'Professional',
          'enterprise': 'Enterprise'
        };
        
        const planName = planMap[user.plan] || 'Free';
        
        // Calculate billing cycle and dates from expiryDate
        let billingCycle = 'monthly'; // default
        let nextBillingDate = null;
        
        if (user.expiryDate) {
          nextBillingDate = new Date(user.expiryDate);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((nextBillingDate - today) / (1000 * 60 * 60 * 24));
          
          // If expiry is more than 90 days away, likely yearly
          if (daysUntilExpiry > 90) {
            billingCycle = 'yearly';
          }
        } else {
          // Default to 30 days from now if no expiry date
          nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);
        }
        
        setSettings(prev => ({
          ...prev,
          billing: {
            plan: planName,
            billingCycle: billingCycle,
            planPrice: user.planPrice || '$0',
            nextBillingDate: nextBillingDate ? nextBillingDate.toISOString().split('T')[0] : null,
            createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : null,
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoadingBilling(false);
    }
  };

  // Calculate usage percentage based on total available credits
  // Total available = current balance + total used (what they had access to)
  // Usage = (total used / total available) * 100
  const totalAvailable = settings.credits.currentBalance + settings.credits.totalUsed;
  const rawCreditUsagePercentage = totalAvailable > 0
    ? (settings.credits.totalUsed / totalAvailable) * 100
    : 0;
  const creditUsagePercentage = Math.min(rawCreditUsagePercentage, 100);

  // Get expiry date and created date from user data
  const expiryDate = settings.billing.nextBillingDate ? new Date(settings.billing.nextBillingDate) : null;
  const createdAt = settings.billing.createdAt ? new Date(settings.billing.createdAt) : null;
  const today = new Date();
  
  // Calculate days left: expiryDate - createdAt (total cycle length)
  const daysLeft = expiryDate && createdAt 
    ? Math.max(0, Math.ceil((expiryDate - createdAt) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Calculate cycle length: expiryDate - createdAt
  const cycleLengthDays = expiryDate && createdAt
    ? Math.ceil((expiryDate - createdAt) / (1000 * 60 * 60 * 24))
    : 30;
  
  // Calculate days used: today - createdAt
  const daysUsed = createdAt 
    ? Math.max(0, Math.floor((today - createdAt) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Calculate usage percentage
  const planUsagePercent = cycleLengthDays > 0 ? (daysUsed / cycleLengthDays) * 100 : 0;
  
  // Format dates to ISO date only (YYYY-MM-DD)
  const formatISODate = (date) => {
    if (!date) return 'N/A';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaCreditCard className="h-3 w-3" />
          <span>Account settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your account and application settings
        </p>
      </div>

      {/* Billing & Subscription */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FaCreditCard className="text-emerald-500" size={20} />
          <h2 className="text-lg font-semibold text-zinc-900">
            Billing & Subscription
          </h2>
        </div>

        <div className="space-y-6">
          {/* Credits Section */}
          <div className="glass-card bg-gradient-to-r from-white to-emerald-50/60 p-6 border border-emerald-100/70 shadow-[0_15px_30px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <FaCoins className="text-yellow-500" size={20} />
                <h3 className="text-base font-semibold text-zinc-900">
                  Credits Usage
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full border border-emerald-200 text-xs font-medium text-emerald-700">
                Balance overview
              </span>
            </div>

            {loadingCredits ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Current Balance</p>
                    <p className={`text-2xl font-semibold ${settings.credits.currentBalance <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {settings.credits.currentBalance.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.currentBalance / 60)} minutes
                    </p>
                  </div>
                  <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Used</p>
                    <p className="text-2xl font-semibold text-red-500">
                      {settings.credits.totalUsed.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.totalUsed / 60)} minutes
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Added</p>
                    <p className="text-2xl font-semibold text-blue-500">
                      {settings.credits.totalAdded.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {Math.floor(settings.credits.totalAdded / 60)} minutes
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-600 mb-2">
                    <span>Usage</span>
                    <span className="font-semibold text-emerald-600">
                      {creditUsagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-emerald-100/70 rounded-full overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 transition-all"
                      style={{ width: `${creditUsagePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Plan usage */}
          <div className="glass-card bg-gradient-to-r from-white to-emerald-50/60 p-6 border border-emerald-100/70 shadow-[0_15px_30px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <FaCreditCard className="text-emerald-500" size={18} />
                <h3 className="text-base font-semibold text-zinc-900">
                  Plan Usage
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full border border-emerald-200 text-xs font-medium text-emerald-700">
                {settings.billing.plan}
              </span>
            </div>

            {loadingBilling ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Expiry Date</p>
                    <p className="text-2xl font-semibold text-zinc-900">{formatISODate(expiryDate)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Billing expiry</p>
                  </div>
                  <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Created At</p>
                    <p className="text-2xl font-semibold text-emerald-600">{formatISODate(createdAt)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Account created</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Days Left</p>
                    <p className="text-2xl font-semibold text-sky-600">{daysLeft}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-600 mb-2">
                    <span>Cycle Progress</span>
                    <span className="font-semibold text-emerald-600">{planUsagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-4 bg-emerald-100/70 rounded-full overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 transition-all"
                      style={{ width: `${Math.min(planUsagePercent, 100)}%` }}
                    ></div>
                  </div>
                  {expiryDate && (
                    <p className="text-xs text-zinc-500 mt-3">
                      Next billing on <span className="font-medium text-zinc-700">{expiryDate.toLocaleDateString()}</span>
                      {` (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
