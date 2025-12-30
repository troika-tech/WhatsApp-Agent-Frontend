import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaChevronDown, FaSpinner, FaEnvelope, FaCheckCircle, FaTimesCircle, FaCalendar, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const SendEmailHistory = () => {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    dateRange: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // Dropdown states
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  
  const statusFilterRef = useRef(null);
  const dateFilterRef = useRef(null);

  useEffect(() => {
    fetchEmailHistory();
  }, [pagination.page, pagination.limit, filters.status, filters.dateRange]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchEmailHistory();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setStatusFilterOpen(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setDateFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined,
        dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
      };

      const response = await authAPI.getEmailHistory(params);
      
      if (response?.success) {
        let emailList = response.data?.emails || [];
        
        // Log for debugging
        console.log(`SendEmailHistory: Received ${emailList.length} emails from API`);

        // Apply search filter if query exists (client-side filtering after pagination)
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          emailList = emailList.filter(email => 
            email.recipient_email?.toLowerCase().includes(query) ||
            email.template_name?.toLowerCase().includes(query)
          );
        }
        
        setEmails(emailList);
        setPagination(prev => ({
          ...prev,
          total: response.data?.totalEmails || 0,
          pages: response.data?.totalPages || 0,
        }));
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to fetch email history';
        setError(errorMsg);
        console.error('Error fetching email history:', response);
        setEmails([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          pages: 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching email history:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to fetch email history';
      setError(errorMessage);
      setEmails([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        pages: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'sent') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <FaCheckCircle className="w-3 h-3" />
          Sent
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <FaTimesCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
  };

  // CSV building helper function
  const buildCSV = (rows) => {
    return rows
      .map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return '""';
          const safe = String(cell).replace(/"/g, '""');
          return `"${safe}"`;
        }).join(',')
      ).join('\n');
  };

  // Format date for CSV
  const formatDateForCSV = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Fetch all emails for export (respects current filters)
  const fetchAllEmailsForExport = async () => {
    const allEmails = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 100; // Fetch 100 at a time for efficiency

    while (hasMore) {
      try {
        const params = {
          page: currentPage,
          limit: limit,
          status: filters.status || undefined,
          dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
        };

        const response = await authAPI.getEmailHistory(params);
        
        if (response?.success && response.data?.emails) {
          let emailList = response.data.emails;
          
          // Apply search filter if query exists
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            emailList = emailList.filter(email => 
              email.recipient_email?.toLowerCase().includes(query) ||
              email.template_name?.toLowerCase().includes(query)
            );
          }
          
          allEmails.push(...emailList);
          
          // Check if there are more pages
          hasMore = currentPage < (response.data?.totalPages || 0);
          currentPage++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error('Error fetching emails for export:', err);
        hasMore = false;
      }
    }

    return allEmails;
  };

  // Handle export to CSV
  const handleExport = async () => {
    if (pagination.total === 0) {
      toast.warning('No emails to export');
      return;
    }

    try {
      setExporting(true);

      // Fetch all emails respecting current filters
      const allEmails = await fetchAllEmailsForExport();

      if (allEmails.length === 0) {
        toast.warning('No emails found to export');
        return;
      }

      // Build CSV content
      const headers = ['Email Address', 'Template Name', 'Date & Time', 'Status', 'Error Message'];
      const rows = allEmails.map(email => [
        email.recipient_email || '',
        email.template_name || '',
        formatDateForCSV(email.sent_at),
        email.status || '',
        email.error_message || '',
      ]);

      const csvContent = buildCSV([headers, ...rows]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `email-history-${dateStr}.csv`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting emails:', err);
      toast.error('Failed to export emails. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Send Email History</h1>
          <p className="text-sm text-zinc-600 mt-1">View all emails sent from your chatbots</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || pagination.total === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FaDownload />
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by email or template name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="relative" ref={statusFilterRef}>
          <button
            onClick={() => setStatusFilterOpen(!statusFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <FaFilter className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-medium text-zinc-700">
              {filters.status ? `Status: ${filters.status}` : 'All Status'}
            </span>
            <FaChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, status: '' }));
                  setStatusFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${!filters.status ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                All Status
              </button>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, status: 'sent' }));
                  setStatusFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                Sent
              </button>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, status: 'failed' }));
                  setStatusFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.status === 'failed' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                Failed
              </button>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="relative" ref={dateFilterRef}>
          <button
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <FaCalendar className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-medium text-zinc-700">
              {filters.dateRange === 'all' ? 'All Time' :
               filters.dateRange === 'today' ? 'Today' :
               filters.dateRange === 'week' ? 'Last 7 Days' :
               filters.dateRange === 'month' ? 'Last 30 Days' : 'All Time'}
            </span>
            <FaChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${dateFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {dateFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateRange: 'all' }));
                  setDateFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.dateRange === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateRange: 'today' }));
                  setDateFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.dateRange === 'today' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateRange: 'week' }));
                  setDateFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.dateRange === 'week' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateRange: 'month' }));
                  setDateFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 ${filters.dateRange === 'month' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700'}`}
              >
                Last 30 Days
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="w-6 h-6 text-emerald-600 animate-spin" />
            <span className="ml-3 text-zinc-600">Loading email history...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <FaEnvelope className="w-12 h-12 mb-3 text-zinc-400" />
            <p className="text-lg font-medium">No emails found</p>
            <p className="text-sm mt-1">No email history available for the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900">{email.recipient_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-700">{email.template_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600">{formatDate(email.sent_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(email.status)}
                        {email.error_message && email.status === 'failed' && (
                          <div className="text-xs text-red-600 mt-1">{email.error_message}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
                <div className="text-sm text-zinc-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} emails
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SendEmailHistory;