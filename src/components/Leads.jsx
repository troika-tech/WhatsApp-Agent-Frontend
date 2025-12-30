import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaPhone, FaEnvelope, FaUser, FaSpinner, FaComments, FaTimesCircle, FaSortUp, FaSortDown, FaFire, FaCalendar, FaFileDownload, FaChevronDown, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { DEMO_MODE } from '../config/api.config';
import TranslationComponent from './TranslationComponent';

const Leads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [hotWords, setHotWords] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
  });
  const [dateSortOrder, setDateSortOrder] = useState('desc');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [translatedMessages, setTranslatedMessages] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [fullChatMessages, setFullChatMessages] = useState([]);
  const [connectedStatuses, setConnectedStatuses] = useState({});
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingKeyword, setExportingKeyword] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [keywordsWithData, setKeywordsWithData] = useState([]);
  const [keywordCounts, setKeywordCounts] = useState({});
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);

  useEffect(() => {
    fetchHotLeads();
  }, [pagination.page, filters.dateRange, filters.customStartDate, filters.customEndDate, selectedKeywords]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchHotLeads();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHotLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestParams = {
        page: pagination.page,
        limit: pagination.limit,
        searchTerm: filters.search,
        dateRange: filters.dateRange,
      };

      // Add custom date range if selected
      if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
        requestParams.startDate = filters.customStartDate;
        requestParams.endDate = filters.customEndDate;
      }

      const response = await authAPI.getHotLeads(requestParams);

      if (response.success) {
        let leadsList = response.data?.leads || [];
        setHotWords(response.data?.hotWords || []);

        // Filter by selected keywords if any (AND logic - all selected keywords must be present)
        if (selectedKeywords.length > 0) {
          leadsList = leadsList.filter(lead => {
            const leadKeywords = (lead.matchedKeywords || []).map(kw => kw.toLowerCase());
            // Check that ALL selected keywords are present in the lead's keywords
            return selectedKeywords.every(selectedKw => 
              leadKeywords.includes(selectedKw.toLowerCase())
            );
          });
        }

        // Sort by date
        leadsList.sort((a, b) => {
          const dateA = new Date(a.lastDetectedAt || 0).getTime();
          const dateB = new Date(b.lastDetectedAt || 0).getTime();
          return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // Initialize connected statuses from API response
        const initialStatuses = {};
        leadsList.forEach(lead => {
          initialStatuses[lead.id] = lead.isContacted || false;
        });
        setConnectedStatuses(initialStatuses);

        setLeads(leadsList);
        setPagination(prev => ({
          ...prev,
          total: selectedKeywords.length > 0 ? leadsList.length : (response.data?.total || 0),
          pages: selectedKeywords.length > 0 ? 1 : (response.data?.totalPages || 1),
        }));
      }
    } catch (err) {
      console.error('Error fetching hot leads:', err);
      setError('Failed to load hot leads');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
    return `${day} ${month} at ${time}`;
  };

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

  // Display messages from lead object (messages are stored in the lead itself)
  const displayLeadMessages = (lead) => {
    setLoadingChat(true);

    // Lead messages are already stored in the lead.messages array
    if (lead.messages && Array.isArray(lead.messages) && lead.messages.length > 0) {
      const messages = lead.messages.map(msg => ({
        sender: msg.role === 'assistant' ? 'agent' : 'user',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      // Sort by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setFullChatMessages(messages);
    } else {
      setFullChatMessages([]);
    }

    setLoadingChat(false);
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

  // Fetch all leads for export (respects current filters)
  const fetchAllLeadsForExport = async (keywordFilter = null, keywordFilters = null) => {
    const allLeads = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 100; // Fetch 100 at a time for efficiency

    while (hasMore) {
      try {
        const requestParams = {
          page: currentPage,
          limit: limit,
          searchTerm: filters.search,
          dateRange: filters.dateRange,
        };

        // Add custom date range if selected
        if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
          requestParams.startDate = filters.customStartDate;
          requestParams.endDate = filters.customEndDate;
        }

        const response = await authAPI.getHotLeads(requestParams);

        if (response.success && response.data?.leads) {
          let leadsList = response.data.leads;

          // Filter by keyword(s) if specified
          if (keywordFilters && keywordFilters.length > 0) {
            // Multiple keywords filter (AND logic - lead must have ALL selected keywords)
            leadsList = leadsList.filter(lead => {
              const leadKeywords = (lead.matchedKeywords || []).map(kw => kw.toLowerCase());
              // Check that ALL selected keywords are present in the lead's keywords
              return keywordFilters.every(filterKw => 
                leadKeywords.includes(filterKw.toLowerCase())
              );
            });
          } else if (keywordFilter) {
            // Single keyword filter (backward compatibility)
            leadsList = leadsList.filter(lead => 
              (lead.matchedKeywords || []).some(kw => 
                kw.toLowerCase() === keywordFilter.toLowerCase()
              )
            );
          }

          allLeads.push(...leadsList);

          // Check if there are more pages
          const totalPages = response.data?.totalPages || 1;
          hasMore = currentPage < totalPages;
          currentPage++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error('Error fetching leads for export:', err);
        hasMore = false;
      }
    }

    return allLeads;
  };

  // Export all leads
  const handleExportAll = async () => {
    if (pagination.total === 0) {
      toast.warning('No leads to export');
      return;
    }

    try {
      setExportingAll(true);

      // Fetch all leads respecting current filters (including selected keywords)
      const allLeads = await fetchAllLeadsForExport(null, selectedKeywords.length > 0 ? selectedKeywords : null);

      if (allLeads.length === 0) {
        toast.warning('No leads found to export');
        setExportingAll(false);
        return;
      }

      // Build CSV rows
      const rows = [
        ['Name', 'Phone', 'Email', 'Keywords Detected', 'First Detected At', 'Last Detected At', 'Contacted Status', 'Session ID'],
      ];

      allLeads.forEach((lead) => {
        rows.push([
          lead.name || 'Anonymous',
          lead.phone || '',
          lead.email || '',
          (lead.matchedKeywords || []).join('; '),
          formatDateForCSV(lead.firstDetectedAt),
          formatDateForCSV(lead.lastDetectedAt),
          lead.isContacted ? 'Yes' : 'No',
          lead.session_id || '',
        ]);
      });

      // Generate CSV
      const csvContent = buildCSV(rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `hot-leads-all-${dateStr}.csv`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting leads:', err);
      toast.error('Failed to export leads. Please try again.');
    } finally {
      setExportingAll(false);
    }
  };

  // Check which keywords have data available
  const checkKeywordsWithData = async () => {
    if (hotWords.length === 0) {
      setKeywordsWithData([]);
      return;
    }

    try {
      setLoadingKeywords(true);
      
      // Fetch all leads to check which keywords have data (respecting current filters)
      const allLeads = await fetchAllLeadsForExport(null, selectedKeywords.length > 0 ? selectedKeywords : null);
      
      // Create a set of keywords that appear in at least one lead
      // Count unique leads per keyword (not occurrences)
      const keywordsSet = new Set();
      const keywordCounts = {};
      
      allLeads.forEach(lead => {
        (lead.matchedKeywords || []).forEach(keyword => {
          keywordsSet.add(keyword);
          // Count unique leads, not keyword occurrences
          if (!keywordCounts[keyword]) {
            keywordCounts[keyword] = new Set();
          }
          keywordCounts[keyword].add(lead.session_id);
        });
      });
      
      // Convert Sets to counts
      Object.keys(keywordCounts).forEach(keyword => {
        keywordCounts[keyword] = keywordCounts[keyword].size;
      });
      
      // Filter hotWords to only include keywords that have data
      // Sort by count (descending) so most common keywords appear first
      const availableKeywords = hotWords
        .filter(keyword => keywordsSet.has(keyword))
        .map(keyword => ({
          keyword,
          count: keywordCounts[keyword] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .map(item => item.keyword);
      
      setKeywordsWithData(availableKeywords);
      setKeywordCounts(keywordCounts);
    } catch (err) {
      console.error('Error checking keywords with data:', err);
      // Fallback to showing all keywords if check fails
      setKeywordsWithData(hotWords);
    } finally {
      setLoadingKeywords(false);
    }
  };

  // Handle export modal open
  const handleOpenExportModal = () => {
    setShowExportModal(true);
    checkKeywordsWithData();
  };

  // Export leads by specific keyword
  const handleExportByKeyword = async (keyword) => {
    if (!keyword) return;

    try {
      setExportingKeyword(keyword);

      // Fetch all leads and filter by keyword
      const allLeads = await fetchAllLeadsForExport(keyword);

      if (allLeads.length === 0) {
        toast.warning(`No leads found for keyword "${keyword}"`);
        setExportingKeyword(null);
        return;
      }

      // Build CSV rows
      const rows = [
        ['Name', 'Phone', 'Email', 'Keywords Detected', 'First Detected At', 'Last Detected At', 'Contacted Status', 'Session ID'],
      ];

      allLeads.forEach((lead) => {
        rows.push([
          lead.name || 'Anonymous',
          lead.phone || '',
          lead.email || '',
          (lead.matchedKeywords || []).join('; '),
          formatDateForCSV(lead.firstDetectedAt),
          formatDateForCSV(lead.lastDetectedAt),
          lead.isContacted ? 'Yes' : 'No',
          lead.session_id || '',
        ]);
      });

      // Generate CSV
      const csvContent = buildCSV(rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with keyword and date
      const dateStr = new Date().toISOString().split('T')[0];
      const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `hot-leads-keyword-${safeKeyword}-${dateStr}.csv`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting leads by keyword:', err);
      toast.error(`Failed to export leads for keyword "${keyword}". Please try again.`);
    } finally {
      setExportingKeyword(null);
    }
  };

  const handleSortToggle = () => {
    const newOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';
    setDateSortOrder(newOrder);

    setLeads(prev => [...prev].sort((a, b) => {
      const dateA = new Date(a.lastDetectedAt || 0).getTime();
      const dateB = new Date(b.lastDetectedAt || 0).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }));
  };

  const getDateRangeLabel = () => {
    if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      return `${new Date(filters.customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(filters.customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    switch (filters.dateRange) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '90days': return 'Last 90 days';
      case 'custom': return 'Custom';
      default: return 'All time';
    }
  };

  const handleDateRangeSelect = (range) => {
    setFilters({ ...filters, dateRange: range });
    if (range !== 'custom') {
      setShowDateDropdown(false);
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading hot leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-700 mb-3">
            <FaFire size={10} />
            <span>HOT LEADS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Hot Leads
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Users who showed buying intent in their chat messages
          </p>
        </div>
      </div>

      {/* Selected Keywords Filter */}
      {selectedKeywords.length > 0 && (
        <div className="glass-panel p-3 bg-orange-50 border border-orange-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <FaFire className="text-orange-500" size={14} />
              <span className="text-xs font-medium text-orange-700">
                Filtered by {selectedKeywords.length > 1 ? 'all' : ''}:
              </span>
              {selectedKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-medium"
                >
                  {keyword}
                  <button
                    onClick={() => {
                      const newKeywords = selectedKeywords.filter(kw => kw !== keyword);
                      setSelectedKeywords(newKeywords);
                      if (pagination.page !== 1) {
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }
                    }}
                    className="hover:bg-orange-600 rounded-full p-0.5 transition-colors"
                    title="Remove this filter"
                  >
                    <FaTimesCircle size={12} />
                  </button>
                </span>
              ))}
              {selectedKeywords.length > 1 && (
                <button
                  onClick={() => {
                    setSelectedKeywords([]);
                    if (pagination.page !== 1) {
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 underline"
                  title="Clear all filters"
                >
                  Clear all
                </button>
              )}
            </div>
            <span className="text-xs text-orange-600">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>
      )}

      {/* Hot Words Display */}
      {hotWords.length > 0 && (
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaFire className="text-orange-500" size={14} />
            <span className="text-xs font-medium text-zinc-700">Detecting keywords:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotWords.map((word, idx) => {
              const isSelected = selectedKeywords.some(kw => kw.toLowerCase() === word.toLowerCase());
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      // Remove keyword from selection
                      const newKeywords = selectedKeywords.filter(kw => kw.toLowerCase() !== word.toLowerCase());
                      setSelectedKeywords(newKeywords);
                    } else {
                      // Add keyword to selection
                      setSelectedKeywords([...selectedKeywords, word]);
                    }
                    if (pagination.page !== 1) {
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }
                  }}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white font-medium shadow-md ring-2 ring-orange-300'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer'
                  }`}
                  title={isSelected ? 'Click to remove filter' : 'Click to add filter'}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search by phone, email, or name"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>

          {/* Custom Date Dropdown */}
          <div className="relative z-30" ref={dateDropdownRef}>
            <FaCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 z-10 pointer-events-none" size={14} />
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="w-full pl-10 pr-10 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 hover:border-zinc-300 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs text-left transition-colors"
            >
              {getDateRangeLabel()}
            </button>
            <FaChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 pointer-events-none transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} size={12} />

            {showDateDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-xl z-[100] overflow-hidden">
                {/* Quick Select Options */}
                <div className="p-2">
                  {[
                    { value: '7days', label: 'Last 7 days' },
                    { value: '30days', label: 'Last 30 days' },
                    { value: '90days', label: 'Last 90 days' },
                    { value: 'all', label: 'All time' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleDateRangeSelect(option.value)}
                      className={`w-full px-3 py-2 text-left text-xs rounded-md hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                        filters.dateRange === option.value && !(filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate)
                          ? 'bg-orange-50 text-orange-700 font-medium'
                          : 'text-zinc-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {filters.dateRange === option.value && !(filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) && (
                        <FaCheck className="text-orange-500" size={10} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-200"></div>

                {/* Custom Date Range */}
                <div className="p-3 bg-zinc-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-700">Custom Range</span>
                    {filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate && (
                      <FaCheck className="text-orange-500" size={10} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filters.customStartDate}
                        onChange={(e) => {
                          setFilters({ ...filters, dateRange: 'custom', customStartDate: e.target.value });
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-200 rounded-md bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filters.customEndDate}
                        onChange={(e) => {
                          setFilters({ ...filters, dateRange: 'custom', customEndDate: e.target.value });
                        }}
                        min={filters.customStartDate}
                        className="w-full px-2 py-1.5 border border-zinc-200 rounded-md bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                      />
                    </div>
                    {filters.customStartDate && filters.customEndDate && (
                      <button
                        onClick={() => setShowDateDropdown(false)}
                        className="w-full mt-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={handleOpenExportModal}
              disabled={pagination.total === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export leads"
            >
              <FaFileDownload size={12} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Leads Table */}
      <div className="glass-panel overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Contact</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Keywords Detected</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={handleSortToggle}>
                    <span>Detected At</span>
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Contacted</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">View Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-zinc-500 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <FaFire className="text-zinc-300" size={32} />
                      <span>No hot leads found</span>
                      <span className="text-xs text-zinc-400">Users who use keywords like "pricing", "buy", "demo" will appear here</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {lead.name && (
                          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                            <FaUser className="text-zinc-400" size={12} />
                            {lead.name}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-zinc-700">
                            <FaPhone className="text-emerald-500" size={12} />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <FaEnvelope className="text-blue-500" size={12} />
                            {lead.email}
                          </div>
                        )}
                        {!lead.phone && !lead.email && (
                          <div className="text-sm text-zinc-400 italic">Anonymous user</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(lead.matchedKeywords || []).slice(0, 4).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                        {(lead.matchedKeywords || []).length > 4 && (
                          <span className="text-[10px] text-zinc-500">
                            +{lead.matchedKeywords.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-900">{formatDate(lead.lastDetectedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={connectedStatuses[lead.id] || false}
                          onChange={async (e) => {
                            const newStatus = e.target.checked;
                            // Optimistically update the UI
                            setConnectedStatuses(prev => ({
                              ...prev,
                              [lead.id]: newStatus
                            }));
                            try {
                              // Persist to backend
                              await authAPI.markHotLeadContacted(lead.session_id, newStatus);
                            } catch (err) {
                              console.error('Error updating contacted status:', err);
                              // Revert on error
                              setConnectedStatuses(prev => ({
                                ...prev,
                                [lead.id]: !newStatus
                              }));
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowChatModal(true);
                          setTranslatedMessages(null);
                          displayLeadMessages(lead);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors text-xs font-medium"
                        title="View Chat"
                      >
                        <FaComments size={11} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-4 border-t border-zinc-200 flex items-center justify-between">
            <div className="text-xs text-zinc-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat View Modal */}
      {showChatModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Chat Messages</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedLead.name || selectedLead.phone || selectedLead.email || 'Anonymous user'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setSelectedLead(null);
                  setTranslatedMessages(null);
                  setFullChatMessages([]);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Matched Keywords */}
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <FaFire className="text-orange-500" size={14} />
                <span className="text-xs font-medium text-orange-700">Matched Keywords:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedLead.matchedKeywords || []).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-full bg-orange-200 text-orange-800 text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Translation Component */}
            {fullChatMessages.length > 0 && (
              <TranslationComponent
                content={fullChatMessages.map(msg => ({
                  speaker: msg.sender === 'agent' ? 'agent' : 'user',
                  text: msg.content,
                  content: msg.content,
                  timestamp: msg.timestamp,
                }))}
                onTranslatedContentChange={(translated) => {
                  setTranslatedMessages(translated);
                }}
              />
            )}

            {/* Full Chat Messages */}
            <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Full Conversation</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingChat ? (
                  <div className="text-center text-zinc-500 text-sm py-8">
                    <FaSpinner className="animate-spin mx-auto mb-2" size={24} />
                    <p>Loading chat...</p>
                  </div>
                ) : fullChatMessages.length > 0 ? (
                  (translatedMessages || fullChatMessages).map((msg, idx) => {
                    // Handle both original message format and translated transcript format
                    const isUser = msg.sender === 'user' || msg.speaker === 'user';
                    const messageContent = msg.content || msg.text || '';
                    const messageTimestamp = msg.timestamp;

                    return (
                      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${
                          isUser
                            ? 'bg-emerald-500 text-white rounded-tr-none'
                            : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
                          {messageTimestamp && (
                            <p className={`text-xs mt-1 ${isUser ? 'text-emerald-100' : 'text-zinc-400'}`}>
                              {new Date(messageTimestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                                day: 'numeric',
                                month: 'short'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-zinc-500 text-sm py-4">
                    No messages found
                  </div>
                )}
              </div>
            </div>

            {/* Lead Info */}
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Lead Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-500">First Detected:</span>
                  <p className="text-zinc-900">{formatDate(selectedLead.firstDetectedAt)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Last Detected:</span>
                  <p className="text-zinc-900">{formatDate(selectedLead.lastDetectedAt)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Keywords Used:</span>
                  <p className="text-zinc-900">{selectedLead.hotWordCount || 0} times</p>
                </div>
                <div>
                  <span className="text-zinc-500">Session ID:</span>
                  <p className="text-zinc-900 text-xs truncate">{selectedLead.session_id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full p-6 space-y-6 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Export Hot Leads</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Export leads matching your current filters: {filters.search ? `"${filters.search}"` : 'All'} • {filters.dateRange === 'all' ? 'All time' : filters.dateRange.replace('days', ' days')}
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Export All Section */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <FaFileDownload className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Export All Leads</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Export all {pagination.total} lead{pagination.total !== 1 ? 's' : ''} matching current filters
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExportAll}
                  disabled={exportingAll || pagination.total === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingAll ? (
                    <>
                      <FaSpinner className="animate-spin" size={12} />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FaFileDownload size={12} />
                      <span>Export All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Export by Keyword Section */}
            {loadingKeywords ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaFire className="text-orange-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Keyword</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-orange-500" size={24} />
                  <span className="ml-3 text-sm text-zinc-600">Checking available keywords...</span>
                </div>
              </div>
            ) : keywordsWithData.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaFire className="text-orange-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Keyword</h3>
                  <span className="text-xs text-zinc-500">({keywordsWithData.length} keyword{keywordsWithData.length !== 1 ? 's' : ''} with data)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                  {keywordsWithData.map((word, idx) => {
                    const count = keywordCounts[word] || 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                            {word}
                          </span>
                          <span className="text-xs text-zinc-500">
                            ({count} lead{count !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <button
                          onClick={() => handleExportByKeyword(word)}
                          disabled={exportingKeyword === word}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {exportingKeyword === word ? (
                            <>
                              <FaSpinner className="animate-spin" size={10} />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <FaFileDownload size={10} />
                              <span>Export</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : hotWords.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaFire className="text-orange-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Keyword</h3>
                </div>
                <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-50 rounded-lg border border-zinc-200">
                  <FaFire className="text-zinc-300 mx-auto mb-2" size={32} />
                  <p>No keywords have data matching current filters</p>
                  <p className="text-xs text-zinc-400 mt-1">Try adjusting your search or date range</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <FaFire className="text-zinc-300 mx-auto mb-2" size={32} />
                <p>No keywords available for export</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-200">
              <p className="text-xs text-zinc-500 text-center">
                Exported files will be in CSV format and include: Name, Phone, Email, Keywords, Detection Dates, Contact Status, and Session ID
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;

