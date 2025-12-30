import React, { useState, useEffect } from 'react';
import { FaBan, FaSearch, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaPlus, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const BannedSessions = () => {
  const [loading, setLoading] = useState(true);
  const [bannedSessions, setBannedSessions] = useState([]);
  const [chatbotId, setChatbotId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedBanIds, setSelectedBanIds] = useState([]);
  const [unbanning, setUnbanning] = useState(false);
  
  // Profanity keywords state
  const [customKeywords, setCustomKeywords] = useState([]);
  const [defaultKeywordsCount, setDefaultKeywordsCount] = useState(0);
  const [newProfanityKeyword, setNewProfanityKeyword] = useState('');
  const [loadingProfanityConfig, setLoadingProfanityConfig] = useState(false);
  const [updatingKeywords, setUpdatingKeywords] = useState(false);

  // Get chatbot ID from localStorage or fetch from API
  useEffect(() => {
    const fetchChatbotId = async () => {
      // First check localStorage (set by Sidebar component)
      const storedChatbotId = localStorage.getItem('user_chatbot_id');
      if (storedChatbotId) {
        setChatbotId(storedChatbotId);
        return;
      }
      
      // Fallback: fetch from sidebar config
      try {
        const response = await authAPI.getDashboardSidebarConfig();
        const data = response?.data || response;
        const chatbotId = data?.chatbot_id;
        if (chatbotId) {
          setChatbotId(chatbotId);
          localStorage.setItem('user_chatbot_id', chatbotId);
        } else {
          // Last resort: try getCurrentUser
          const userData = await authAPI.getCurrentUser();
          const chatbotIdFromUser = userData?.data?.chatbot_id || userData?.chatbot_id;
          if (chatbotIdFromUser) {
            setChatbotId(chatbotIdFromUser);
            localStorage.setItem('user_chatbot_id', chatbotIdFromUser);
          } else {
            toast.error('Chatbot ID not found');
          }
        }
      } catch (error) {
        console.error('Error fetching chatbot ID:', error);
        toast.error('Failed to load chatbot information');
      }
    };
    fetchChatbotId();
  }, []);

  // Fetch profanity config
  useEffect(() => {
    if (chatbotId) {
      fetchProfanityConfig();
    }
  }, [chatbotId]);

  // Fetch banned sessions
  useEffect(() => {
    if (chatbotId) {
      fetchBannedSessions();
    }
  }, [chatbotId, pagination.page, search, status]);

  const fetchProfanityConfig = async () => {
    if (!chatbotId) return;
    try {
      setLoadingProfanityConfig(true);
      const response = await authAPI.getProfanityConfig(chatbotId);
      const data = response?.data || response;
      setCustomKeywords(data.custom_profanity_keywords || []);
      setDefaultKeywordsCount(data.default_profanity_keywords?.length || 0);
    } catch (error) {
      console.error('Error fetching profanity config:', error);
      // Don't show error toast, just log it
    } finally {
      setLoadingProfanityConfig(false);
    }
  };

  const fetchBannedSessions = async () => {
    if (!chatbotId) return;
    try {
      setLoading(true);
      const response = await authAPI.getBannedSessions(chatbotId, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        status,
      });
      const data = response?.data || response;
      setBannedSessions(data.banned_sessions || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error('Error fetching banned sessions:', error);
      toast.error('Failed to load banned sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (banId) => {
    if (!chatbotId) return;
    try {
      setUnbanning(true);
      await authAPI.unbanSession(chatbotId, banId);
      toast.success('Session unbanned successfully');
      setSelectedBanIds(selectedBanIds.filter(id => id !== banId));
      fetchBannedSessions();
    } catch (error) {
      console.error('Error unbanning session:', error);
      toast.error(error.response?.data?.message || 'Failed to unban session');
    } finally {
      setUnbanning(false);
    }
  };

  const handleBulkUnban = async () => {
    if (!chatbotId || selectedBanIds.length === 0) return;
    try {
      setUnbanning(true);
      await authAPI.bulkUnbanSessions(chatbotId, selectedBanIds);
      toast.success(`Successfully unbanned ${selectedBanIds.length} session(s)`);
      setSelectedBanIds([]);
      fetchBannedSessions();
    } catch (error) {
      console.error('Error bulk unbanning:', error);
      toast.error(error.response?.data?.message || 'Failed to unban sessions');
    } finally {
      setUnbanning(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newProfanityKeyword.trim()) return;
    
    if (customKeywords.includes(newProfanityKeyword.trim().toLowerCase())) {
      toast.error('Keyword already exists');
      return;
    }

    const updatedKeywords = [...customKeywords, newProfanityKeyword.trim().toLowerCase()];
    
    try {
      setUpdatingKeywords(true);
      await authAPI.updateProfanityConfig(chatbotId, true, updatedKeywords, true);
      setCustomKeywords(updatedKeywords);
      setNewProfanityKeyword('');
      toast.success('Keyword added successfully');
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error(error.response?.data?.message || 'Failed to add keyword');
    } finally {
      setUpdatingKeywords(false);
    }
  };

  const handleRemoveKeyword = async (keywordToRemove) => {
    const updatedKeywords = customKeywords.filter(k => k !== keywordToRemove);
    
    try {
      setUpdatingKeywords(true);
      await authAPI.updateProfanityConfig(chatbotId, true, updatedKeywords, true);
      setCustomKeywords(updatedKeywords);
      toast.success('Keyword removed successfully');
    } catch (error) {
      console.error('Error removing keyword:', error);
      toast.error(error.response?.data?.message || 'Failed to remove keyword');
    } finally {
      setUpdatingKeywords(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaBan className="text-red-600" />
          Banned Sessions
        </h1>
        <p className="text-gray-600 mt-1">View and manage banned chat sessions</p>
      </div>

      {/* Custom Keywords Management */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <FaExclamationTriangle className="h-6 w-6 text-orange-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Custom Keywords</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Add custom keywords to the profanity detection list. These will be combined with the default keywords.
        </p>

        {/* Add Keyword Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newProfanityKeyword}
            onChange={(e) => setNewProfanityKeyword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newProfanityKeyword.trim()) {
                handleAddKeyword();
              }
            }}
            placeholder="Enter a keyword to add"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={updatingKeywords || !chatbotId}
          />
          <button
            onClick={handleAddKeyword}
            disabled={updatingKeywords || !chatbotId || !newProfanityKeyword.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <FaPlus className="h-5 w-5" />
          </button>
        </div>

        {/* Custom Keywords List */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Custom Keywords ({customKeywords.length})</h3>
          {loadingProfanityConfig ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaSpinner className="h-4 w-4 animate-spin" />
              Loading keywords...
            </div>
          ) : customKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    disabled={updatingKeywords}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FaTimes className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No custom keywords added yet</p>
          )}
        </div>

        {/* Default Keywords Count */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Default Keywords ({defaultKeywordsCount})</h3>
          <p className="text-xs text-gray-500">These keywords are built-in and cannot be modified</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="Search by session ID, phone, email, or reason..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active Bans</option>
            <option value="unbanned">Unbanned</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedBanIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-red-800 font-medium">
            {selectedBanIds.length} session(s) selected
          </span>
          <button
            onClick={handleBulkUnban}
            disabled={unbanning}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {unbanning ? 'Unbanning...' : `Unban Selected (${selectedBanIds.length})`}
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FaSpinner className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading banned sessions...</p>
        </div>
      ) : bannedSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          No banned sessions found
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedBanIds.length === bannedSessions.filter(b => b.is_active).length && bannedSessions.filter(b => b.is_active).length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBanIds(bannedSessions.filter(b => b.is_active).map(b => b._id));
                        } else {
                          setSelectedBanIds([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Session ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Banned At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bannedSessions.map((ban) => (
                  <tr key={ban._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {ban.is_active && (
                        <input
                          type="checkbox"
                          checked={selectedBanIds.includes(ban._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBanIds([...selectedBanIds, ban._id]);
                            } else {
                              setSelectedBanIds(selectedBanIds.filter(id => id !== ban._id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ban.session_id || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ban.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ban.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ban.reason || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ban.banned_at ? new Date(ban.banned_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ban.is_active 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {ban.is_active ? 'Active' : 'Unbanned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ban.is_active && (
                        <button
                          onClick={() => handleUnban(ban._id)}
                          disabled={unbanning}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Unban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BannedSessions;

