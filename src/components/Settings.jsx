import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaCoins, FaCheckCircle, FaSpinner, FaSyncAlt } from 'react-icons/fa';
import { authAPI } from '../services/api';

const Settings = () => {
  const [plan, setPlan] = useState(null);
  const [creditSummary, setCreditSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch plan info and credit summary in parallel
      const [planResponse, creditResponse] = await Promise.all([
        authAPI.getUserPlan(),
        authAPI.getCreditSummary()
      ]);

      setPlan(planResponse.data);
      setCreditSummary(creditResponse.data);
    } catch (err) {
      console.error('Error fetching settings data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate values from API data
  // Backend returns: totalAllocated, totalUsed, currentBalance, subscriptionType
  const creditsTotal = creditSummary?.totalAllocated || creditSummary?.credits_total || plan?.credits_total || 0;
  const creditsUsed = creditSummary?.totalUsed || creditSummary?.credits_used || plan?.credits_used || 0;
  const creditsRemaining = creditSummary?.currentBalance || creditSummary?.credits_remaining || plan?.credits_remaining || plan?.tokens || 0;
  const creditUsagePercentage = creditsTotal > 0 ? (creditsUsed / creditsTotal) * 100 : 0;

  // Plan data
  const planName = plan?.name || 'No Plan';
  const subscriptionType = creditSummary?.subscription_type || plan?.subscription_type || 'credits';
  const durationDays = plan?.duration_days || 30;
  const daysRemaining = plan?.days_remaining || 0;
  const daysUsed = Math.max(0, durationDays - daysRemaining);
  const planUsagePercent = durationDays > 0 ? (daysUsed / durationDays) * 100 : 0;
  const expiryDate = plan?.expiry_date ? new Date(plan.expiry_date) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaCreditCard className="h-3 w-3" />
            <span>Account settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your account and subscription details
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium mt-6 sm:mt-4"
        >
          <FaSyncAlt className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card p-6 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-3 text-xs text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="glass-card p-12 flex justify-center items-center">
          <FaSpinner className="animate-spin text-emerald-500" size={32} />
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
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
                  {subscriptionType === 'credits' ? 'Credit-based' : 'Time-based'} • {planName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Current Balance</p>
                  <p className={`text-2xl font-semibold ${creditsRemaining <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {creditsRemaining.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">credits remaining</p>
                </div>
                <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Used</p>
                  <p className="text-2xl font-semibold text-red-500">
                    {creditsUsed.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">consumed</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Total Allocated</p>
                  <p className="text-2xl font-semibold text-blue-500">
                    {creditsTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">total credits</p>
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
                    style={{ width: `${Math.min(creditUsagePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Plan usage */}
            <div className="glass-card bg-gradient-to-r from-white to-emerald-50/60 p-6 border border-emerald-100/70 shadow-[0_15px_30px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-3">
                  <FaCreditCard className="text-emerald-500" size={18} />
                  <h3 className="text-base font-semibold text-zinc-900">
                    Subscription Duration
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full border border-emerald-200 text-xs font-medium text-emerald-700">
                  {planName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Duration</p>
                  <p className="text-2xl font-semibold text-zinc-900">{durationDays} days</p>
                  <p className="text-xs text-zinc-500 mt-1">Subscription length</p>
                </div>
                <div className="text-center sm:text-left border-x border-emerald-100 px-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Days Used</p>
                  <p className="text-2xl font-semibold text-emerald-600">{daysUsed}</p>
                  <p className="text-xs text-zinc-500 mt-1">Consumed</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Days Left</p>
                  <p className="text-2xl font-semibold text-sky-600">{daysRemaining}</p>
                  <p className="text-xs text-zinc-500 mt-1">{daysRemaining > 0 ? 'Time remaining' : 'Expired'}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-600 mb-2">
                  <span>Duration Progress</span>
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
                    Expires on <span className="font-medium text-zinc-700">{expiryDate.toLocaleDateString()}</span>
                    {` (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left)`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
