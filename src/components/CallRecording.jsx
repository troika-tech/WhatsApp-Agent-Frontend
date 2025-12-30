import React, { useState, useEffect } from 'react';
import { 
  FaMicrophone, 
  FaPlay, 
  FaPause, 
  FaDownload, 
  FaSearch, 
  FaPhone,
  FaClock,
  FaSpinner,
  FaTimesCircle,
  FaCheckCircle,
  FaSortUp,
  FaSortDown,
  FaBullseye
} from 'react-icons/fa';

const CallRecording = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = new to old, 'asc' = old to new

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchRecordings = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        // Generate dates within last 21 days
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 21; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date);
        }

        const allRecordings = [
          {
            id: 1,
            callId: 'CALL-2024-001',
            phoneNumber: '+91 98765 43210',
            campaign: 'Product Launch',
            duration: '02:45',
            date: dates[0].toISOString().split('T')[0],
            time: '14:30',
            status: 'completed',
            recordingUrl: '/recordings/call-001.mp3',
            dateTime: dates[0]
          },
          {
            id: 2,
            callId: 'CALL-2024-002',
            phoneNumber: '+91 98765 43211',
            campaign: 'Customer Support',
            duration: '05:12',
            date: dates[1].toISOString().split('T')[0],
            time: '15:45',
            status: 'completed',
            recordingUrl: '/recordings/call-002.mp3',
            dateTime: dates[1]
          },
          {
            id: 3,
            callId: 'CALL-2024-003',
            phoneNumber: '+91 98765 43212',
            campaign: 'Sales Outreach',
            duration: '03:28',
            date: dates[2].toISOString().split('T')[0],
            time: '11:20',
            status: 'completed',
            recordingUrl: '/recordings/call-003.mp3',
            dateTime: dates[2]
          },
          {
            id: 4,
            callId: 'CALL-2024-004',
            phoneNumber: '+91 98765 43213',
            campaign: 'Follow Up',
            duration: '01:55',
            date: dates[3].toISOString().split('T')[0],
            time: '16:10',
            status: 'failed',
            recordingUrl: null,
            dateTime: dates[3]
          },
          {
            id: 5,
            callId: 'CALL-2024-005',
            phoneNumber: '+91 98765 43214',
            campaign: 'Product Launch',
            duration: '04:30',
            date: dates[5].toISOString().split('T')[0],
            time: '10:15',
            status: 'completed',
            recordingUrl: '/recordings/call-005.mp3',
            dateTime: dates[5]
          }
        ];

        // Filter recordings for last 21 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 21);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const filteredRecordings = allRecordings.filter(recording => {
          const recordingDate = new Date(recording.dateTime);
          return recordingDate >= startDate && recordingDate <= endDate;
        });

        setRecordings(filteredRecordings);
        setLoading(false);
      }, 1000);
    };

    fetchRecordings();
  }, []);

  // Filter recordings for last 21 days and apply search/filter
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const filteredRecordings = recordings.filter(recording => {
    // Only show completed recordings
    if (recording.status !== 'completed') return false;
    
    // Filter by last 21 days
    const recordingDate = new Date(recording.dateTime || recording.date);
    if (recordingDate < startDate || recordingDate > endDate) return false;
    
    const matchesSearch = 
      recording.callId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.phoneNumber.includes(searchQuery) ||
      recording.campaign.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.dateTime || a.date).getTime();
    const dateB = new Date(b.dateTime || b.date).getTime();
    return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB; // desc = new to old, asc = old to new
  });

  // Calculate pagination
  const totalRecordings = filteredRecordings.length;
  const totalPages = Math.ceil(totalRecordings / pagination.limit);
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedRecordings = filteredRecordings.slice(startIndex, endIndex);

  // Update pagination when filtered results change
  useEffect(() => {
    const newTotalPages = Math.ceil(totalRecordings / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: totalRecordings,
      pages: newTotalPages,
      page: prev.page > newTotalPages && newTotalPages > 0 ? newTotalPages : prev.page
    }));
  }, [totalRecordings, pagination.limit]);

  const handlePlay = (id) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  const handleDownload = (recording) => {
    // Implement download functionality

  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-current flex-shrink-0" />
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        <span className="h-2 w-2 rounded-full bg-current flex-shrink-0" />
        Failed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaMicrophone className="h-3 w-3" />
          <span>Call Management</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Call Recording
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Listen, download, and manage your call recordings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Recordings
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {filteredRecordings.length}
                </div>
                <p className="text-xs text-zinc-500">Last 21 days</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaMicrophone className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Campaign
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {new Set(filteredRecordings.map(r => r.campaign)).size}
                </div>
                <p className="text-xs text-zinc-500">Last 21 days</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaBullseye className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Duration
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {filteredRecordings.reduce((sum, r) => {
                    const [min, sec] = r.duration.split(':').map(Number);
                    return sum + min * 60 + sec;
                  }, 0) > 3600 
                    ? `${Math.floor(filteredRecordings.reduce((sum, r) => {
                        const [min, sec] = r.duration.split(':').map(Number);
                        return sum + min * 60 + sec;
                      }, 0) / 3600)}h`
                    : `${Math.floor(filteredRecordings.reduce((sum, r) => {
                        const [min, sec] = r.duration.split(':').map(Number);
                        return sum + min * 60 + sec;
                      }, 0) / 60)}m`}
                </div>
                <p className="text-xs text-zinc-500">Last 21 days</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaClock className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by call ID, phone number, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 outline-none"
          />
        </div>
      </div>

      {/* Recordings List */}
      <div className="glass-panel overflow-hidden relative" style={{ zIndex: 1 }}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-emerald-500" size={24} />
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="text-center py-12">
            <FaMicrophone className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
            <p className="text-zinc-500 text-sm">No recordings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    Phone Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}>
                      Date & Time
                      {dateSortOrder === 'desc' ? (
                        <FaSortDown size={14} className="text-zinc-400" />
                      ) : (
                        <FaSortUp size={14} className="text-zinc-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 uppercase tracking-[0.16em]">
                    Recordings
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedRecordings.map((recording) => (
                  <tr key={recording.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900">
                        {recording.phoneNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                      {recording.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                      <div className="flex items-center gap-2">
                        <FaClock className="h-4 w-4" />
                        {recording.duration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-900">{recording.date}</div>
                      <div className="text-xs text-zinc-500">{recording.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center">
                        {getStatusBadge(recording.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {recording.recordingUrl && (
                          <>
                            <button
                              onClick={() => handlePlay(recording.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                              style={{ borderRadius: '9999px' }}
                            >
                              {playingId === recording.id ? (
                                <>
                                  <FaPause size={12} />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <FaPlay size={12} />
                                  <span>Play</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(recording)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                              style={{ borderRadius: '9999px' }}
                            >
                              <FaDownload size={12} />
                              <span>Download</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{startIndex + 1}</span> to <span className="text-emerald-600">{Math.min(endIndex, totalRecordings)}</span> of <span className="text-zinc-900">{totalRecordings}</span> recordings
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600">Show:</label>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 });
                }}
                className="px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{totalPages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(totalPages, pagination.page + 1) })}
                disabled={pagination.page >= totalPages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: totalPages })}
                disabled={pagination.page >= totalPages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »»
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallRecording;

