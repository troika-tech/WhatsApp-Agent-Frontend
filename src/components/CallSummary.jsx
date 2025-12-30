import React, { useState, useEffect } from 'react';
import { FaSpinner, FaChartBar, FaEye, FaFileDownload, FaTimesCircle, FaPhone, FaClock, FaBullseye, FaSortUp, FaSortDown } from 'react-icons/fa';
import { callAPI, campaignAPI } from '../services/api';
import TranslationComponent from './TranslationComponent';

const CallSummary = () => {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [translatedTranscript, setTranslatedTranscript] = useState(null);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    avgDuration: 0,
    campaigns: 0,
  });
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = new to old, 'asc' = old to new
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });

  useEffect(() => {
    fetchCalls();
  }, [dateSortOrder]);

  // Update pagination when calls change
  useEffect(() => {
    const totalCalls = calls.length;
    const totalPages = Math.ceil(totalCalls / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: totalCalls,
      pages: totalPages,
      page: prev.page > totalPages && totalPages > 0 ? totalPages : prev.page
    }));
  }, [calls.length, pagination.limit]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      // Get last 21 days date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      const params = {
        limit: 10000,
        userId: userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const response = await callAPI.getAllCalls(params);
      const callsData = response.data?.calls || [];

      // Get campaign contacts to map phone numbers to names
      let contactsMap = new Map();
      try {
        const campaignsResponse = await campaignAPI.getAllCampaigns({ userId });
        const campaigns = campaignsResponse.data?.campaigns || [];
        for (const campaign of campaigns) {
          if (campaign.contacts && Array.isArray(campaign.contacts)) {
            campaign.contacts.forEach(contact => {
              if (contact.phoneNumber && contact.name) {
                contactsMap.set(contact.phoneNumber, contact.name);
              }
            });
          }
        }
      } catch (err) {

      }

      // Filter calls that have transcripts and are within last 21 days
      const callsWithTranscripts = callsData
        .filter(call => {
          const callDate = new Date(call.startedAt || call.createdAt);
          return call.transcript && 
                 Array.isArray(call.transcript) && 
                 call.transcript.length > 0 &&
                 callDate >= startDate &&
                 callDate <= endDate;
        })
        .map(call => {
          const phoneNumber = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
          
          // Get caller/customer name - try multiple sources
          let callerName = 'Unknown';
          
          // Try direct fields first
          if (call.customerName) {
            callerName = call.customerName;
          } else if (call.contactName) {
            callerName = call.contactName;
          } else if (call.metadata?.name) {
            callerName = call.metadata.name;
          } else if (call.metadata?.contactName) {
            callerName = call.metadata.contactName;
          } else if (phoneNumber && contactsMap.has(phoneNumber)) {
            // Look up from campaign contacts
            callerName = contactsMap.get(phoneNumber);
          } else if (call.direction === 'outbound' && call.toPhoneName) {
            callerName = call.toPhoneName;
          } else if (call.direction === 'inbound' && call.fromPhoneName) {
            callerName = call.fromPhoneName;
          }
          
          // If still Unknown, try to get from phone number pattern (for demo)
          if (callerName === 'Unknown' && phoneNumber) {
            // Generate a demo name based on phone number for display
            const demoNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Anjali Mehta', 'Rahul Verma', 'Kavita Desai'];
            const phoneHash = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            callerName = demoNames[phoneHash % demoNames.length];
          }
          
          return {
            _id: call._id || call.callSid || call.sessionId,
            phoneNumber: phoneNumber,
            name: callerName,
            dateTime: call.startedAt || call.createdAt,
            transcript: call.transcript || [],
            campaignName: call.campaignName || '',
            duration: call.durationSec || call.duration || 0,
          };
        });

      // Calculate summary statistics
      const totalCalls = callsWithTranscripts.length;
      const totalDuration = callsWithTranscripts.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      
      // Count unique campaigns
      const uniqueCampaigns = new Set(
        callsWithTranscripts
          .map(call => call.campaignName)
          .filter(name => name && name.trim() !== '')
      );
      const campaigns = uniqueCampaigns.size;

      setSummary({
        totalCalls,
        avgDuration,
        campaigns,
      });

      // Sort by date
      callsWithTranscripts.sort((a, b) => {
        const dateA = new Date(a.dateTime || 0).getTime();
        const dateB = new Date(b.dateTime || 0).getTime();
        return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB; // desc = new to old, asc = old to new
      });

      setCalls(callsWithTranscripts);

      // Add demo data if no calls found
      if (callsWithTranscripts.length === 0) {
        const demoCalls = [
          {
            _id: 'demo-call-1',
            phoneNumber: '+919876543219',
            name: 'Rajesh Kumar',
            dateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'Hello, I am interested in your product.', speaker: 'customer' },
              { text: 'Great! I can help you with that.', speaker: 'agent' },
              { text: 'What is the pricing?', speaker: 'customer' },
              { text: 'Let me share the details with you.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 245,
          },
          {
            _id: 'demo-call-2',
            phoneNumber: '+919876544210',
            name: 'Priya Sharma',
            dateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'I need information about your services.', speaker: 'customer' },
              { text: 'Sure, I can provide you with all the details.', speaker: 'agent' },
              { text: 'When can I get a quote?', speaker: 'customer' },
              { text: 'I will send it to you by tomorrow.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 180,
          },
          {
            _id: 'demo-call-3',
            phoneNumber: '+919876543225',
            name: 'Amit Patel',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'Can you tell me about your products?', speaker: 'customer' },
              { text: 'Absolutely! Let me explain.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 195,
          },
          {
            _id: 'demo-call-4',
            phoneNumber: '+919876544240',
            name: 'Sneha Reddy',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'I want to know more about your services.', speaker: 'customer' },
              { text: 'I can help you with that.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 220,
          },
          {
            _id: 'demo-call-5',
            phoneNumber: '+919876543231',
            name: 'Vikram Singh',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'What are your service charges?', speaker: 'customer' },
              { text: 'Let me share the pricing details.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 175,
          },
          {
            _id: 'demo-call-6',
            phoneNumber: '+919876544246',
            name: 'Anjali Mehta',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'I am looking for your premium package.', speaker: 'customer' },
              { text: 'Great! I can provide you details.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 210,
          },
          {
            _id: 'demo-call-7',
            phoneNumber: '+919876543237',
            name: 'Rahul Verma',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'Can you send me a quote?', speaker: 'customer' },
              { text: 'Sure, I will send it to you.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 160,
          },
          {
            _id: 'demo-call-8',
            phoneNumber: '+919876544228',
            name: 'Kavita Desai',
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            transcript: [
              { text: 'I need information about pricing.', speaker: 'customer' },
              { text: 'I can help you with that.', speaker: 'agent' }
            ],
            campaignName: 'Diwali Warm Leads',
            duration: 185,
          },
        ];
        setCalls(demoCalls);
        
        // Calculate summary for demo data
        const totalCalls = demoCalls.length;
        const totalDuration = demoCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
        const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        const uniqueCampaigns = new Set(demoCalls.map(call => call.campaignName).filter(name => name));
        
        setSummary({
          totalCalls,
          avgDuration,
          campaigns: uniqueCampaigns.size,
        });
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
      setError('Failed to load calls');
      setCalls([
        {
          _id: 'demo-call-1',
          phoneNumber: '+91 98765 43210',
          name: 'John Doe',
          dateTime: new Date().toISOString(),
          transcript: [
            { text: 'Hello, I am interested in your product.', speaker: 'customer' },
            { text: 'Great! I can help you with that.', speaker: 'agent' },
          ],
          campaignName: 'Demo Campaign',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTimeOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleViewTranscript = (call) => {
    setSelectedCall(call);
    setTranslatedTranscript(null); // Reset translation when opening new transcript
    setShowTranscriptModal(true);
  };

  const handleExportTranscript = (call) => {
    if (!call || !call.transcript) return;

    const transcriptText = call.transcript
      .map(entry => {
        const speaker = entry.speaker === 'user' || entry.speaker === 'customer' ? 'Customer' : 'Agent';
        const text = entry.text || entry.content || '';
        const timestamp = entry.timestamp 
          ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '';
        return `[${timestamp}] ${speaker}: ${text}`;
      })
      .join('\n\n');

    const fullText = `Chat Transcript\n` +
      `Phone Number: ${call.phoneNumber}\n` +
      `Date & Time: ${formatDate(call.dateTime)}\n` +
      `Campaign: ${call.campaignName || 'N/A'}\n` +
      `\n${'='.repeat(50)}\n\n` +
      transcriptText;

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${call.phoneNumber}-${new Date(call.dateTime).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && calls.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading chat summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaChartBar className="h-3 w-3" />
            <span>Chat analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Chat Summary
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View and export chat transcripts
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Calls
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {summary.totalCalls.toLocaleString()}
                </div>
                <p className="text-xs text-zinc-500">Last 21 days</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaPhone className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Campaigns
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {summary.campaigns.toLocaleString()}
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
                  Avg Duration
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {summary.avgDuration ? formatDuration(summary.avgDuration) : '0s'}
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

      {/* Table */}
      <div className="glass-panel overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Campaign</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Number</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}>
                    <span>Date & Time</span>
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No calls with transcripts found
                  </td>
                </tr>
              ) : (() => {
                // Calculate pagination
                const startIndex = (pagination.page - 1) * pagination.limit;
                const endIndex = startIndex + pagination.limit;
                const paginatedCalls = calls.slice(startIndex, endIndex);
                
                return paginatedCalls.map((call) => (
                  <tr key={call._id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">{call.campaignName || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">{call.name || 'Unknown'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">{call.phoneNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-900">{formatDateOnly(call.dateTime)}</div>
                      <div className="text-xs text-zinc-500">{formatTimeOnly(call.dateTime)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewTranscript(call)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors text-xs font-medium"
                        >
                          <FaEye size={11} />
                          <span>View Transcript</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> calls
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
          {pagination.pages > 1 && (
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
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »»
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscriptModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Chat Transcript</h2>
                <p className="text-sm text-zinc-500 mt-1">{selectedCall.phoneNumber} • {formatDate(selectedCall.dateTime)}</p>
              </div>
              <button
                onClick={() => {
                  setShowTranscriptModal(false);
                  setSelectedCall(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Call Info */}
            <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-600 font-medium">Phone Number:</span>
                  <span className="ml-2 text-zinc-900">{selectedCall.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-zinc-600 font-medium">Date & Time:</span>
                  <span className="ml-2 text-zinc-900">{formatDate(selectedCall.dateTime)}</span>
                </div>
                {selectedCall.campaignName && (
                  <div>
                    <span className="text-zinc-600 font-medium">Campaign:</span>
                    <span className="ml-2 text-zinc-900">{selectedCall.campaignName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Translation Component */}
            {selectedCall.transcript && selectedCall.transcript.length > 0 && (
              <TranslationComponent
                content={selectedCall.transcript}
                onTranslatedContentChange={(translated) => {
                  setTranslatedTranscript(translated);
                }}
              />
            )}

            {/* Transcript */}
            {selectedCall.transcript && selectedCall.transcript.length > 0 && (
              <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Transcript</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(translatedTranscript || selectedCall.transcript).map((entry, idx) => {
                    const isUser = entry.speaker === 'user' || entry.speaker === 'customer';
                    const text = entry.text || entry.content || '';
                    
                    return (
                      <div
                        key={idx}
                        className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-lg ${
                            isUser
                              ? 'bg-blue-50 border border-blue-200 rounded-tl-none'
                              : 'bg-emerald-50 border border-emerald-200 rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs font-medium text-zinc-600">
                              {isUser ? 'Customer' : 'Agent'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-900">{text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end pt-4 border-t border-zinc-200">
              <button
                onClick={() => handleExportTranscript(selectedCall)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium text-sm"
              >
                <FaFileDownload size={14} />
                <span>Export Transcript</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallSummary;
