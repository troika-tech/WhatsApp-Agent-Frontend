import React, { useState, useEffect } from 'react';
import { FaSpinner, FaCalendarAlt, FaComments, FaUsers, FaTags, FaChevronLeft, FaChevronRight, FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authAPI } from '../services/api';
import TranslationComponent from './TranslationComponent';

const DailySummary = () => {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);
  const [error, setError] = useState(null);
  const [translatedSummaries, setTranslatedSummaries] = useState({}); // Object to store translated summaries by ID
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchSummaries();
  }, [pagination.page]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.getDailySummaries({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response?.success) {
        setSummaries(response.data?.summaries || []);
        setPagination(prev => ({
          ...prev,
          total: response.data?.total || 0,
          totalPages: response.data?.totalPages || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching daily summaries:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && summaries.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading daily summaries...</p>
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
            <FaRobot className="h-3 w-3" />
            <span>AI Insights</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Daily Chat Summaries
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            AI-powered summaries of daily user conversations
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <FaCalendarAlt className="text-emerald-600" size={16} />
          <span className="text-emerald-700 font-semibold">{pagination.total}</span>
          <span className="text-emerald-600 text-sm">Summaries</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && summaries.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <FaRobot className="mx-auto mb-4 text-zinc-300" size={48} />
          <h3 className="text-lg font-medium text-zinc-700 mb-2">No Summaries Yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Daily summaries are generated at 11:59 PM IST. Once your chatbot has conversations, 
            you'll see AI-generated insights here.
          </p>
        </div>
      )}

      {/* Summaries List */}
      <div className="space-y-4">
        {summaries.map((summary) => (
          <div
            key={summary._id}
            className="glass-panel overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <FaCalendarAlt className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {formatDate(summary.date)}
                    </h3>
                    <p className="text-teal-100 text-xs">
                      Daily conversation summary
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                    <FaComments className="text-white" size={14} />
                    <span className="text-white text-sm font-medium">
                      {summary.messageCount} messages
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                    <FaUsers className="text-white" size={14} />
                    <span className="text-white text-sm font-medium">
                      {summary.sessionCount} sessions
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Content */}
            <div className="p-6">
              {/* Topics Tags */}
              {summary.topTopics && summary.topTopics.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <FaTags className="text-zinc-400" size={14} />
                  {summary.topTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Translation Component */}
              {summary.summary && (
                <div className="mb-4">
                  <TranslationComponent
                    summary={summary.summary}
                    onTranslationComplete={(result) => {
                      if (result.translatedSummary) {
                        setTranslatedSummaries(prev => ({
                          ...prev,
                          [summary._id]: result.translatedSummary
                        }));
                      }
                    }}
                    onTranslatedContentChange={(translated) => {
                      if (translated === null) {
                        // Reset translation for this summary
                        setTranslatedSummaries(prev => {
                          const updated = { ...prev };
                          delete updated[summary._id];
                          return updated;
                        });
                      } else if (typeof translated === 'string') {
                        // Handle string translation (from summary prop)
                        setTranslatedSummaries(prev => ({
                          ...prev,
                          [summary._id]: translated
                        }));
                      }
                    }}
                  />
                </div>
              )}

              {/* Summary Text */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {translatedSummaries[summary._id] || summary.summary || 'No summary available.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 glass-panel">
          <div className="text-sm text-zinc-600">
            Showing page <span className="font-medium">{pagination.page}</span> of{' '}
            <span className="font-medium">{pagination.totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <FaChevronLeft size={12} />
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
              <FaChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySummary;
