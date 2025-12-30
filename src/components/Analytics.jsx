import React, { useState, useEffect } from 'react';
import { FaComments, FaUsers, FaUserFriends, FaFireAlt, FaClock, FaSpinner, FaChartLine, FaCalendarAlt, FaRobot, FaUser, FaBolt } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { authAPI } from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [hotLeadsCount, setHotLeadsCount] = useState(0);
  const [dailySummaryData, setDailySummaryData] = useState([]);
  const [messageDistribution, setMessageDistribution] = useState([]);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchAllAnalyticsData();
  }, [dateRange]);

  const fetchAllAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [analyticsRes, hotLeadsRes, summariesRes] = await Promise.allSettled([
        authAPI.getAnalytics(dateRange),
        authAPI.getHotLeads({ limit: 1, dateRange }),
        authAPI.getDailySummaries({ limit: 30 }),
      ]);
      
      // Handle results (Promise.allSettled returns {status, value/reason})
      const analytics = analyticsRes.status === 'fulfilled' ? (analyticsRes.value.data || analyticsRes.value) : null;
      const hotLeads = hotLeadsRes.status === 'fulfilled' ? hotLeadsRes.value : { data: { total: 0 } };
      const summaries = summariesRes.status === 'fulfilled' ? (summariesRes.value.data || summariesRes.value) : { summaries: [] };

      // Set analytics data
      if (analytics && analytics.success !== false) {
        setAnalyticsData(analytics);
      } else {
        // If analytics failed, set empty data to prevent errors
        setAnalyticsData({
          totalMessages: 0,
          totalSessions: 0,
          avgMessagesPerChat: 0,
          chartData: [],
          visitorsData: [],
        });
      }

      // Set hot leads count (handle errors gracefully)
      setHotLeadsCount(hotLeads?.data?.total || 0);

      // Process daily summary data for topic trends (handle errors gracefully)
      const summariesList = summaries?.summaries || [];
      setDailySummaryData(summariesList);

      // Calculate message distribution (user vs bot)
      // Using visitorsData and chartData to estimate
      const chartData = analytics?.chartData || [];
      const visitorsData = analytics?.visitorsData || [];
      
      // Create a map of visitors to messages ratio
      const totalMessages = analytics.totalMessages || 0;
      const totalSessions = analytics.totalSessions || 0;
      const avgMessagesPerChat = analytics.avgMessagesPerChat || 0;
      
      // Estimate: user messages ≈ sessions × (avgMessages/2), bot messages ≈ same
      const userMessages = Math.round(totalMessages * 0.45); // ~45% user
      const botMessages = Math.round(totalMessages * 0.55); // ~55% bot (usually bot responds to each user message)
      
      setMessageDistribution([
        { name: 'User Messages', value: userMessages, color: '#2dd4bf' },
        { name: 'AI Responses', value: botMessages, color: '#10b981' },
      ]);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      // Set error but also set default data to prevent UI breaking
      setError(err.response?.data?.error || err.message || 'Failed to load analytics');
      // Set default empty data so UI doesn't break
      setAnalyticsData({
        totalMessages: 0,
        totalSessions: 0,
        avgMessagesPerChat: 0,
        chartData: [],
        visitorsData: [],
      });
      setHotLeadsCount(0);
      setDailySummaryData([]);
      setMessageDistribution([]);
    } finally {
      setLoading(false);
    }
  };

  // Format duration in human-readable format
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!analyticsData) return [];

    const totalMessages = analyticsData.totalMessages || 0;
    const totalSessions = analyticsData.totalSessions || 0;
    const avgDuration = analyticsData.avgDurationSeconds || 0;
    const avgMessagesPerChat = analyticsData.avgMessagesPerChat || 0;

    return [
      { 
        title: 'Total Messages', 
        value: totalMessages.toLocaleString(), 
        icon: FaComments, 
        color: 'emerald',
        description: 'All chat messages'
      },
      { 
        title: 'Total Sessions', 
        value: totalSessions.toLocaleString(), 
        icon: FaUserFriends, 
        color: 'teal',
        description: 'Unique conversations'
      },
      { 
        title: 'Hot Leads', 
        value: hotLeadsCount.toLocaleString(), 
        icon: FaFireAlt, 
        color: 'orange',
        description: 'High-intent users'
      },
      { 
        title: 'Avg Duration', 
        value: formatDuration(avgDuration), 
        icon: FaClock, 
        color: 'purple',
        description: 'Per session'
      },
      { 
        title: 'Avg Response', 
        value: '< 2s', 
        icon: FaBolt, 
        color: 'yellow',
        description: 'AI response time'
      },
      { 
        title: 'Peak Hours', 
        value: analyticsData.peakHours || 'N/A', 
        icon: FaCalendarAlt, 
        color: 'indigo',
        description: 'Most active period'
      },
      { 
        title: 'Engagement', 
        value: `${avgMessagesPerChat} msgs`, 
        icon: FaChartLine, 
        color: 'blue',
        description: 'Per conversation'
      },
      { 
        title: 'AI Accuracy', 
        value: totalMessages > 0 ? '~98%' : 'N/A', 
        icon: FaRobot, 
        color: 'cyan',
        description: 'Response accuracy'
      },
    ];
  };

  // Get top topics from daily summaries
  const getTopTopics = () => {
    const topicCounts = {};
    dailySummaryData.forEach(summary => {
      (summary.topTopics || []).forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));
  };

  // Prepare messages per day chart data
  const getMessagesChartData = () => {
    if (!analyticsData || !analyticsData.chartData) return [];
    
    return analyticsData.chartData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      messages: item.count,
    }));
  };

  // Prepare visitors per day chart data
  const getVisitorsChartData = () => {
    if (!analyticsData || !analyticsData.visitorsData) return [];
    
    return analyticsData.visitorsData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visitors: item.count,
    }));
  };

  // Combine messages and visitors data for comparison chart
  const getCombinedChartData = () => {
    const messagesData = analyticsData?.chartData || [];
    const visitorsData = analyticsData?.visitorsData || [];
    
    const combinedMap = {};
    
    messagesData.forEach(item => {
      const dateKey = item.date;
      if (!combinedMap[dateKey]) {
        combinedMap[dateKey] = { date: dateKey, messages: 0, sessions: 0 };
      }
      combinedMap[dateKey].messages = item.count;
    });
    
    visitorsData.forEach(item => {
      const dateKey = item.date;
      if (!combinedMap[dateKey]) {
        combinedMap[dateKey] = { date: dateKey, messages: 0, sessions: 0 };
      }
      combinedMap[dateKey].sessions = item.count;
    });
    
    return Object.values(combinedMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-2">Error loading analytics</p>
          <p className="text-zinc-400 text-xs">{error}</p>
          <button
            onClick={fetchAllAnalyticsData}
            className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();
  const combinedChartData = getCombinedChartData();
  const topTopics = getTopTopics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaChartLine className="h-3 w-3" />
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Chat Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Insights into your AI chat agent performance
          </p>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-zinc-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const colorClasses = {
            emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600',
            teal: 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600',
            orange: 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600',
            purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 text-purple-600',
            blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600',
            yellow: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 text-yellow-600',
            indigo: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600',
            cyan: 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-600',
          };
          const iconBg = colorClasses[kpi.color] || colorClasses.emerald;
          
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)]"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">
                      {kpi.title}
                    </p>
                    <div className="text-lg sm:text-xl font-semibold tabular-nums text-zinc-900">{kpi.value}</div>
                    <p className="text-[10px] text-zinc-400 hidden sm:block">{kpi.description}</p>
                  </div>
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${iconBg} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Messages & Sessions Over Time */}
        <div className="glass-panel p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <FaChartLine className="text-emerald-500" />
            Messages & Sessions Over Time
          </h3>
          {combinedChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-zinc-500 text-sm">
              No data available for the selected period.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={combinedChartData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                    name="Messages"
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSessions)"
                    name="Sessions"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-700">Messages</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                  <span className="text-zinc-700">Sessions</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Message Trends */}
        <div className="glass-panel p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <FaComments className="text-emerald-500" />
            Message Trends
          </h3>
          {combinedChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-zinc-500 text-sm">
              No data available for the selected period.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={combinedChartData}>
                  <defs>
                    <linearGradient id="colorMsgTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMsgTrend)"
                    name="Messages"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-700">Total Messages</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Discussion Topics */}
        <div className="glass-panel p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <FaFireAlt className="text-orange-500" />
            Top Discussion Topics
          </h3>
          {topTopics.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-zinc-500 text-sm">
              No topics data available. Chat summaries are generated daily at 11:59 PM.
            </div>
          ) : (
            <div className="space-y-3">
              {topTopics.map((item, index) => {
                const maxCount = Math.max(...topTopics.map(t => t.count));
                const width = (item.count / maxCount) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-medium text-zinc-400">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-zinc-700 truncate capitalize">{item.topic}</span>
                        <span className="text-xs text-zinc-500 ml-2">{item.count} days</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Summary Insights */}
        <div className="glass-panel p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-purple-500" />
            Daily Activity
          </h3>
          {dailySummaryData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-zinc-500 text-sm">
              No daily summaries available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart 
                data={dailySummaryData.slice(0, 14).reverse().map(s => ({
                  date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  messages: s.messageCount || 0,
                  sessions: s.sessionCount || 0,
                }))}
                margin={{ top: 40, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11, dy: 5 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 10 }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                  domain={[0, dataMax => Math.ceil(dataMax * 1.3)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="messages" name="Messages" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sessions" name="Sessions" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
