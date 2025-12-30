import React, { useEffect, useState } from 'react';
import { FaSpinner, FaPlay, FaPause, FaCheckCircle, FaTimesCircle, FaPhone, FaClock, FaUsers, FaSyncAlt } from 'react-icons/fa';
import { campaignAPI, callAPI, wsAPI } from '../services/api';
import { API_BASE_URL } from '../config/api.config';

const LiveStatus = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      setError(null);

      // Fetch system stats for real-time metrics
      try {
        const statsResponse = await wsAPI.getStats();
        setSystemStats(statsResponse.data);
      } catch (err) {

      }

      // Get all campaigns
      const campaignsResponse = await campaignAPI.list();
      // Ensure we always get an array
      const campaignsData = campaignsResponse.data;
      let allCampaigns = [];
      if (Array.isArray(campaignsData)) {
        allCampaigns = campaignsData;
      } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
        allCampaigns = campaignsData.campaigns;
      }

      // Filter only active/running campaigns
      const activeCampaigns = allCampaigns.filter(
        campaign => campaign.status === 'active' || campaign.status === 'running'
      );
      
      // Fetch detailed stats for each active campaign
      const campaignsWithStats = await Promise.all(
        activeCampaigns.map(async (campaign) => {
          try {
            // Get debug info for detailed stats
            const debugResponse = await fetch(
              `${API_BASE_URL}/api/campaigns/${campaign._id}/debug`
            );
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              return {
                ...campaign,
                liveStats: {
                  activeCalls: debugData.debugInfo?.stats?.activeCallsCount || 0,
                  queueLength: debugData.debugInfo?.stats?.queueLength || 0,
                  completed: debugData.debugInfo?.stats?.completedCalls || campaign.completedCalls || 0,
                  failed: debugData.debugInfo?.stats?.failedCalls || campaign.failedCalls || 0,
                  processed: debugData.debugInfo?.stats?.processedNumbers || 0,
                  remaining: debugData.debugInfo?.stats?.remainingNumbers || 0,
                  totalNumbers: debugData.debugInfo?.stats?.totalNumbers || campaign.phoneNumbers?.length || 0,
                }
              };
            }
          } catch (err) {

          }
          
          // Fallback to basic campaign data
          return {
            ...campaign,
            liveStats: {
              activeCalls: 0,
              queueLength: 0,
              completed: campaign.completedCalls || 0,
              failed: campaign.failedCalls || 0,
              processed: (campaign.completedCalls || 0) + (campaign.failedCalls || 0),
              remaining: (campaign.phoneNumbers?.length || 0) - ((campaign.completedCalls || 0) + (campaign.failedCalls || 0)),
              totalNumbers: campaign.phoneNumbers?.length || 0,
            }
          };
        })
      );
      
      setCampaigns(campaignsWithStats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching live status:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server (node server.js).');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load live status');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLiveStatus, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const getProgressPercentage = (campaign) => {
    const { processed, totalNumbers } = campaign.liveStats || {};
    if (!totalNumbers || totalNumbers === 0) return 0;
    return Math.round((processed / totalNumbers) * 100);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'active': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'running': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'paused': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'completed': 'bg-blue-50 text-blue-700 border border-blue-200',
      'stopped': 'bg-red-50 text-red-700 border border-red-200',
    };
    
    return (
      <span
        className={`px-2 py-0.5 inline-flex text-[11px] font-medium rounded-full whitespace-nowrap w-fit self-start ${
          styles[status] || styles.stopped
        }`}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading live status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaPlay className="h-3 w-3" />
            <span>Live monitoring</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
            Live Campaign Status
          </h1>
          <p className="text-sm text-zinc-500">
            Real-time monitoring of active campaigns and call progress
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-400 mt-1">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-full border transition-colors text-xs font-medium ${
              autoRefresh
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <FaSyncAlt className={autoRefresh ? 'animate-spin' : ''} />
            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>
          <button
            onClick={fetchLiveStatus}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
          >
            <FaSyncAlt />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-sm text-red-800 font-medium">Error loading live status</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchLiveStatus}
            className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* System Stats Card */}
      {systemStats && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <FaPhone className="text-blue-600" size={16} />
                <span className="text-xs font-medium text-blue-700">Active Calls</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {systemStats.activeCalls || 0}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex items-center space-x-2 mb-2">
                <FaClock className="text-emerald-600" size={16} />
                <span className="text-xs font-medium text-emerald-700">Uptime</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">
                {systemStats.uptime ? Math.floor(systemStats.uptime / 3600) + 'h' : 'N/A'}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <FaUsers className="text-purple-600" size={16} />
                <span className="text-xs font-medium text-purple-700">Memory</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {systemStats.memory?.used || 0}MB
              </p>
            </div>
            <div className={`rounded-lg p-4 border ${
              systemStats.deepgramPool?.status === 'healthy'
                ? 'bg-emerald-50 border-emerald-200'
                : systemStats.deepgramPool?.status === 'critical'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <FaSyncAlt className={
                  systemStats.deepgramPool?.status === 'healthy'
                    ? 'text-emerald-600'
                    : systemStats.deepgramPool?.status === 'critical'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                } size={16} />
                <span className={`text-xs font-medium ${
                  systemStats.deepgramPool?.status === 'healthy'
                    ? 'text-emerald-700'
                    : systemStats.deepgramPool?.status === 'critical'
                    ? 'text-red-700'
                    : 'text-yellow-700'
                }`}>Pool Status</span>
              </div>
              <p className={`text-2xl font-bold ${
                systemStats.deepgramPool?.status === 'healthy'
                  ? 'text-emerald-900'
                  : systemStats.deepgramPool?.status === 'critical'
                  ? 'text-red-900'
                  : 'text-yellow-900'
              }`}>
                {systemStats.deepgramPool?.utilization
                  ? Math.round(systemStats.deepgramPool.utilization) + '%'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FaPhone className="text-zinc-400 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            No Active Campaigns
          </h3>
          <p className="text-sm text-zinc-500">
            There are currently no campaigns running. Start a campaign to see live status here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((campaign) => {
            const stats = campaign.liveStats || {};
            const progress = getProgressPercentage(campaign);
            
            return (
              <div
                key={campaign._id}
                className="glass-card overflow-hidden"
              >
                {/* Campaign Header */}
                <div className="p-6 border-b border-zinc-200 bg-gradient-to-r from-emerald-50 to-purple-50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-zinc-900 break-words pr-2">
                          {campaign.name}
                        </h2>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-xs text-zinc-600 font-mono break-all">
                        ID: {campaign._id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-zinc-700">
                        Campaign Progress
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-3">
                      <div
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-1 mt-2 text-xs text-zinc-500">
                      <span>
                        Processed: {stats.processed || 0} / {stats.totalNumbers || 0}
                      </span>
                      <span>Remaining: {stats.remaining || 0}</span>
                    </div>
                  </div>

                  {/* Live Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {/* Active Calls */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaPhone className="text-blue-600" size={16} />
                        <span className="text-xs font-medium text-blue-700">
                          Active Calls
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {stats.activeCalls || 0}
                      </p>
                    </div>

                    {/* Queue Length */}
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaClock className="text-yellow-600" size={16} />
                        <span className="text-xs font-medium text-yellow-700">
                          Queue
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {stats.queueLength || 0}
                      </p>
                    </div>

                    {/* Completed */}
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaCheckCircle className="text-emerald-600" size={16} />
                        <span className="text-xs font-medium text-emerald-700">
                          Completed
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {stats.completed || 0}
                      </p>
                    </div>

                    {/* Failed */}
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaTimesCircle className="text-red-600" size={16} />
                        <span className="text-xs font-medium text-red-700">
                          Failed
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-red-900">
                        {stats.failed || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveStatus;

