import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaChevronDown, FaSpinner, FaWhatsapp, FaCheckCircle, FaTimesCircle, FaCalendar, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const WhatsAppProposalHistory = () => {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
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
    fetchProposalHistory();
  }, [pagination.page, pagination.limit, filters.status, filters.dateRange]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchProposalHistory();
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

  const fetchProposalHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined,
        dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
      };

      const response = await authAPI.getWhatsAppProposalHistory(params);
      
      if (response?.success) {
        let proposalList = response.data?.proposals || [];
        
        // Log for debugging
        console.log(`WhatsAppProposalHistory: Received ${proposalList.length} proposals from API`);

        // Apply search filter if query exists (client-side filtering after pagination)
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          proposalList = proposalList.filter(proposal => 
            proposal.recipient_phone?.toLowerCase().includes(query) ||
            proposal.template_name?.toLowerCase().includes(query)
          );
        }
        
        setProposals(proposalList);
        setPagination(prev => ({
          ...prev,
          total: response.data?.totalProposals || 0,
          pages: response.data?.totalPages || 0,
        }));
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to fetch WhatsApp proposal history';
        setError(errorMsg);
        console.error('Error fetching WhatsApp proposal history:', response);
        setProposals([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          pages: 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching WhatsApp proposal history:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to fetch WhatsApp proposal history';
      setError(errorMessage);
      setProposals([]);
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

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    // Format phone number: +91XXXXXXXXXX -> +91 XXXXX XXXXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
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

  // Fetch all proposals for export (respects current filters)
  const fetchAllProposalsForExport = async () => {
    const allProposals = [];
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

        const response = await authAPI.getWhatsAppProposalHistory(params);
        
        if (response?.success && response.data?.proposals) {
          let proposalList = response.data.proposals;
          
          // Apply search filter if query exists
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            proposalList = proposalList.filter(proposal => 
              proposal.recipient_phone?.toLowerCase().includes(query) ||
              proposal.template_name?.toLowerCase().includes(query)
            );
          }
          
          allProposals.push(...proposalList);
          
          // Check if there are more pages
          hasMore = currentPage < (response.data?.totalPages || 0);
          currentPage++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error('Error fetching proposals for export:', err);
        hasMore = false;
      }
    }

    return allProposals;
  };

  // Handle export to CSV
  const handleExport = async () => {
    if (pagination.total === 0) {
      toast.warning('No proposals to export');
      return;
    }

    try {
      setExporting(true);

      // Fetch all proposals respecting current filters
      const allProposals = await fetchAllProposalsForExport();

      if (allProposals.length === 0) {
        toast.warning('No proposals found to export');
        return;
      }

      // Build CSV content
      const headers = ['Phone Number', 'Template Name', 'Date & Time', 'Status', 'Error Message', 'Message ID'];
      const rows = allProposals.map(proposal => [
        proposal.recipient_phone || '',
        proposal.template_name || '',
        formatDateForCSV(proposal.sent_at),
        proposal.status || '',
        proposal.error_message || '',
        proposal.message_id || '',
      ]);

      const csvContent = buildCSV([headers, ...rows]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `whatsapp-proposal-history-${dateStr}.csv`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting proposals:', err);
      toast.error('Failed to export proposals. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">WhatsApp Proposal History</h1>
          <p className="text-sm text-zinc-600 mt-1">View all WhatsApp proposals sent from your chatbots</p>
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
            placeholder="Search by phone number or template name..."
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
            <span className="ml-3 text-zinc-600">Loading proposal history...</span>
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <FaWhatsapp className="w-12 h-12 mb-3 text-zinc-400" />
            <p className="text-lg font-medium">No proposals found</p>
            <p className="text-sm mt-1">No WhatsApp proposal history available for the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Phone Number
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
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900">{formatPhoneNumber(proposal.recipient_phone)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-700">{proposal.template_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600">{formatDate(proposal.sent_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(proposal.status)}
                        {proposal.error_message && proposal.status === 'failed' && (
                          <div className="text-xs text-red-600 mt-1">{proposal.error_message}</div>
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} proposals
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

export default WhatsAppProposalHistory;

