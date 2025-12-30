import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDownload, FaSearch, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { campaignAPI } from '../services/api';

const DeliveryReports = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entriesPerPage, setEntriesPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignAPI.list();
      // Ensure we always set an array
      const campaignsData = response.data;
      if (Array.isArray(campaignsData)) {
        setCampaigns(campaignsData);
      } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
        setCampaigns(campaignsData.campaigns);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server (node server.js).');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load campaigns');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getCreditsUsed = (campaign) => {
    return campaign?.stats?.completed ?? campaign?.completedCalls ?? 0;
  };

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((campaign) => {
        const idMatch = campaign._id?.toLowerCase().includes(query);
        const nameMatch = campaign.name?.toLowerCase().includes(query);
        return idMatch || nameMatch;
      });
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal;
        let bVal;

        switch (sortColumn) {
          case 'uniqueId':
            aVal = a._id || '';
            bVal = b._id || '';
            break;
          case 'campaignName':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'totalNos':
            aVal = a.totalCalls ?? 0;
            bVal = b.totalCalls ?? 0;
            break;
          case 'usedCredit':
            aVal = getCreditsUsed(a);
            bVal = getCreditsUsed(b);
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return filtered;
  }, [campaigns, search, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <span className="inline-flex flex-col">
          <FaChevronUp className="text-zinc-400 text-[10px]" />
          <FaChevronDown className="text-zinc-400 text-[10px] -mt-1" />
        </span>
      );
    }

    return sortDirection === 'asc' ? (
      <FaChevronUp className="text-emerald-600 text-[10px]" />
    ) : (
      <FaChevronDown className="text-emerald-600 text-[10px]" />
    );
  };

  const viewReport = (campaign) => {
    navigate(`/campaign-report/${campaign._id}`);
  };

  const totalPages = Math.ceil(filteredCampaigns.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);
  const startEntry = filteredCampaigns.length > 0 ? startIndex + 1 : 0;
  const endEntryValue = Math.min(endIndex, filteredCampaigns.length);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaDownload className="h-3 w-3" />
          <span>Reports</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Delivery Reports
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          View and download detailed reports for your campaigns
        </p>
      </div>

      <div className="glass-panel p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-zinc-600 whitespace-nowrap">Show</label>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs font-medium text-zinc-600 whitespace-nowrap">entries</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-zinc-600 whitespace-nowrap">Search:</label>
            <div className="relative flex-1 sm:flex-initial">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">#</th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer"
                  onClick={() => handleSort('uniqueId')}
                >
                  <span className="flex items-center gap-1">
                    UNIQUE ID
                    <SortIcon column="uniqueId" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer"
                  onClick={() => handleSort('campaignName')}
                >
                  <span className="flex items-center gap-1">
                    CAMPAIGN NAME
                    <SortIcon column="campaignName" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer"
                  onClick={() => handleSort('totalNos')}
                >
                  <span className="flex items-center gap-1">
                    TOTAL NO'S
                    <SortIcon column="totalNos" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer"
                  onClick={() => handleSort('usedCredit')}
                >
                  <span className="flex items-center gap-1">
                    USED CREDIT
                    <SortIcon column="usedCredit" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <span className="flex items-center gap-1">
                    STATUS
                    <SortIcon column="status" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    Loading delivery reports...
                  </td>
                </tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((campaign, index) => (
                  <tr key={campaign._id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-zinc-900">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-700">{campaign._id}</td>
                    <td className="px-4 py-3 text-xs text-zinc-700">{campaign.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-700">{campaign.totalCalls ?? 0}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-600">{getCreditsUsed(campaign)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          campaign.status === 'active' || campaign.status === 'running'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : campaign.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : campaign.status === 'paused'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                        {campaign.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => viewReport(campaign)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[11px] font-medium transition-colors"
                      >
                        <FaDownload size={12} />
                        <span>View Report</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
            Showing <span className="text-emerald-600">{startEntry}</span> to <span className="text-emerald-600">{endEntryValue}</span> of <span className="text-zinc-900">{filteredCampaigns.length}</span> entries
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              «
            </button>
            <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
              Page <span className="text-emerald-600">{currentPage}</span> of <span className="text-zinc-900">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              »
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReports;

