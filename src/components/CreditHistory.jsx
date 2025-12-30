import React, { useEffect, useMemo, useState } from 'react';
import { FaDownload, FaSearch, FaSyncAlt, FaArrowUp, FaArrowDown, FaCoins, FaSortUp, FaSortDown, FaChartLine, FaExternalLinkAlt, FaRobot, FaUserShield, FaGift, FaRedo, FaComments } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { authAPI } from '../services/api';

const CreditHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [dateSortOrder, setDateSortOrder] = useState('desc');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both summary and transactions in parallel
      const [summaryRes, transactionsRes] = await Promise.all([
        authAPI.getCreditSummary(),
        authAPI.getCreditTransactions({
          page: pagination.page,
          limit: pagination.limit,
          type: typeFilter,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
        }),
      ]);

      setSummary(summaryRes.data);
      setTransactions(transactionsRes.data.transactions || []);
      setPagination(prev => ({
        ...prev,
        total: transactionsRes.data.total || 0,
        pages: transactionsRes.data.totalPages || 0,
      }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching credit data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load credit history');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, typeFilter, dateFrom, dateTo]);

  // Filter transactions by search (client-side)
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    
    const query = search.trim().toLowerCase();
    return transactions.filter((txn) => {
      const reasonMatch = txn.reason?.toLowerCase().includes(query);
      const idMatch = txn.id?.toLowerCase().includes(query);
      const sessionMatch = txn.session_id?.toLowerCase().includes(query);
      return reasonMatch || idMatch || sessionMatch;
    });
  }, [transactions, search]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredTransactions, dateSortOrder]);

  const buildCsv = (rows) => {
    return rows
      .map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return '""';
          const safe = String(cell).replace(/"/g, '""');
          return `"${safe}"`;
        }).join(',')
      ).join('\n');
  };

  const downloadCSV = () => {
    if (sortedTransactions.length === 0) return;

    const rows = [
      ['Date & Time', 'Type', 'Amount', 'Balance After', 'Reason', 'Session ID', 'Admin'],
    ];

    sortedTransactions.forEach((txn) => {
      rows.push([
        new Date(txn.created_at).toLocaleString(),
        getTypeLabel(txn.type),
        txn.amount,
        txn.balance_after,
        txn.reason,
        txn.session_id || '-',
        txn.admin?.name || '-',
      ]);
    });

    const csvContent = buildCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credit-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'message_deduction':
        return <FaComments className="text-red-500" />;
      case 'admin_add':
        return <FaUserShield className="text-emerald-500" />;
      case 'admin_remove':
        return <FaUserShield className="text-red-500" />;
      case 'reset':
        return <FaRedo className="text-blue-500" />;
      case 'renewal_bonus':
        return <FaGift className="text-purple-500" />;
      case 'initial_allocation':
        return <FaRobot className="text-teal-500" />;
      default:
        return <FaCoins className="text-zinc-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'message_deduction': return 'Message Usage';
      case 'admin_add': return 'Admin Added';
      case 'admin_remove': return 'Admin Removed';
      case 'reset': return 'Reset';
      case 'renewal_bonus': return 'Renewal Bonus';
      case 'initial_allocation': return 'Initial Allocation';
      default: return type;
    }
  };

  const getTypeColor = (type, amount) => {
    if (amount > 0) return 'text-emerald-600';
    if (amount < 0) return 'text-red-600';
    return 'text-zinc-600';
  };

  const handleSessionClick = async (sessionId) => {
    if (!sessionId) return;
    
    try {
      setSessionLoading(true);
      setSelectedSession(sessionId);
      setSessionModalOpen(true);
      
      const response = await authAPI.getMessages({ session_id: sessionId, limit: 100 });
      setSessionMessages(response.data?.messages || []);
    } catch (err) {
      console.error('Error fetching session messages:', err);
      setSessionMessages([]);
    } finally {
      setSessionLoading(false);
    }
  };

  // Calculate usage percentage - use backend value if available, otherwise calculate
  const usagePercentage = summary?.usagePercentage ?? (summary ? Math.round((summary.totalUsed / (summary.totalAllocated || 1)) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaCoins className="h-3 w-3" />
            <span>Credit Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Credit History</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track your credit usage, additions, and transaction history.
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-400 mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-6 sm:mt-4">
          <button
            onClick={fetchData}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={downloadCSV}
            disabled={sortedTransactions.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
          >
            <FaDownload />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">Current Balance</p>
                <div className={`text-lg sm:text-xl font-semibold tabular-nums ${summary?.currentBalance === null ? 'text-emerald-600' : (summary?.currentBalance || 0) <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {summary?.currentBalance === null ? '∞ Unlimited' : (summary?.currentBalance || 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-400 hidden sm:block">{summary?.subscriptionType === 'unlimited' ? 'Unlimited plan' : 'Available credits'}</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 flex-shrink-0">
                <FaCoins className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">Total Allocated</p>
                <div className="text-lg sm:text-xl font-semibold tabular-nums text-zinc-900">
                  {summary?.totalAllocated === null ? '∞ Unlimited' : (summary?.totalAllocated || 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-400 hidden sm:block">{summary?.subscriptionType === 'unlimited' ? 'No limit' : 'From plan & admin'}</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex-shrink-0">
                <FaGift className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">{summary?.subscriptionType === 'unlimited' || summary?.subscriptionType === 'time' ? 'Messages Used' : 'Credits Used'}</p>
                <div className="text-lg sm:text-xl font-semibold tabular-nums text-orange-600">
                  {(summary?.totalUsed || 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-400 hidden sm:block">{summary?.subscriptionType === 'unlimited' || summary?.subscriptionType === 'time' ? 'Total messages' : 'Total consumed'}</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 flex-shrink-0">
                <FaArrowDown className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 truncate">
                  {summary?.subscriptionType === 'unlimited' || summary?.subscriptionType === 'time' ? 'Plan Status' : 'Usage'}
                </p>
                <div className="text-lg sm:text-xl font-semibold tabular-nums text-purple-600">
                  {summary?.subscriptionType === 'unlimited' || summary?.subscriptionType === 'time' ? 'Active' : `${usagePercentage}%`}
                </div>
                <p className="text-[10px] text-zinc-400 hidden sm:block">
                  {summary?.subscriptionType === 'unlimited' ? 'Unlimited plan' : summary?.subscriptionType === 'time' ? 'Time-based plan' : 'Of total credits'}
                </p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 flex-shrink-0">
                <FaChartLine className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            {/* Progress bar - only show for credits-based plans */}
            {summary?.subscriptionType !== 'unlimited' && summary?.subscriptionType !== 'time' && (
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Trend Chart */}
      {summary?.daily_usage && summary.daily_usage.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <FaChartLine className="text-emerald-500" />
            Credit Usage Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={summary.daily_usage}>
              <defs>
                <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Area
                type="monotone"
                dataKey="credits_used"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCredits)"
                name="Credits Used"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by reason, ID, or session..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              >
                <option value="all">All</option>
                <option value="addition">Additions</option>
                <option value="deduction">Deductions</option>
                <option value="message_deduction">Message Usage</option>
                <option value="admin_add">Admin Added</option>
                <option value="admin_remove">Admin Removed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4 rounded-xl">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="glass-panel overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors"
                    onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}
                  >
                    <span>Date & Time</span>
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Balance After</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Reason</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Session</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Admin</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    Loading credit history...
                  </td>
                </tr>
              ) : sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-700">
                      {new Date(txn.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(txn.type)}
                        <span className={`text-xs font-medium ${getTypeColor(txn.type, txn.amount)}`}>
                          {getTypeLabel(txn.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${getTypeColor(txn.type, txn.amount)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${txn.balance_after <= 0 ? 'text-red-600' : 'text-zinc-700'}`}>
                        {txn.balance_after?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-600 max-w-[200px] truncate block" title={txn.reason}>
                        {txn.reason || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {txn.session_id ? (
                        <button
                          onClick={() => handleSessionClick(txn.session_id)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                        >
                          <span className="truncate max-w-[80px]">{txn.session_id.slice(-8)}</span>
                          <FaExternalLinkAlt size={10} />
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {txn.admin ? (
                        <span className="text-xs text-zinc-600">{txn.admin.name}</span>
                      ) : (
                        <span className="text-xs text-zinc-400">System</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> transactions
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Modal */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSessionModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-zinc-900">Session Messages</h3>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {sessionLoading ? (
                <div className="text-center py-8 text-zinc-500">Loading messages...</div>
              ) : sessionMessages.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No messages found for this session.</div>
              ) : (
                <div className="space-y-3">
                  {sessionMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.sender === 'bot' 
                          ? 'bg-emerald-50 border border-emerald-100' 
                          : 'bg-zinc-50 border border-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${msg.sender === 'bot' ? 'text-emerald-600' : 'text-zinc-600'}`}>
                          {msg.sender === 'bot' ? 'AI Agent' : msg.contact_name || 'User'}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditHistory;
