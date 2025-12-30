import React, { useState, useEffect } from 'react';
import { FaPhone, FaCalendar, FaClock, FaCheckCircle, FaSpinner, FaPlus, FaEdit, FaTrash, FaRedo, FaSearch } from 'react-icons/fa';
import { callAPI } from '../services/api';

const CallBacks = () => {
  const [loading, setLoading] = useState(true);
  const [callBacks, setCallBacks] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCallBack, setSelectedCallBack] = useState(null);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    name: '',
    scheduledTime: '',
    notes: '',
    priority: 'medium',
    status: 'pending',
  });

  useEffect(() => {
    fetchCallBacks();
  }, []);

  // Function to detect callback requests in transcript
  const detectCallbackRequest = (transcript) => {
    if (!transcript || !Array.isArray(transcript)) return null;
    
    const callbackPhrases = [
      'call me',
      'call back',
      'callback',
      'call me back',
      'call me later',
      'call me at',
      'call me on',
      'call me tomorrow',
      'call me today',
      'call me evening',
      'call me morning',
      'call me afternoon',
      'mujhe call karo',
      'mujhe call karna',
      'mujhe call kar do',
      'mujhe call kar sakte ho',
      'aap mujhe call kar sakte ho',
      'aap call kar sakte ho',
      'call kar sakte ho',
      'call kar do',
      'call karna',
      'call karo',
      'baad me call',
      'baad mein call',
      'phir call',
      'fir call',
    ];

    const timePatterns = [
      /\b(\d{1,2})\s*(?:baje|o\'?clock|pm|am|:00)\b/gi,
      /\b(\d{1,2}):(\d{2})\s*(?:pm|am)?\b/gi,
      /\b(?:evening|morning|afternoon|night|shaam|subah|dopahar|raat)\b/gi,
      /\b(?:tomorrow|today|kal|aaj|parso)\b/gi,
    ];

    const transcriptText = transcript
      .map(t => (t.text || t.content || '').toLowerCase())
      .join(' ');

    // Check if any callback phrase exists
    const hasCallbackRequest = callbackPhrases.some(phrase => 
      transcriptText.includes(phrase.toLowerCase())
    );

    if (!hasCallbackRequest) return null;

    // Try to extract time
    let extractedTime = null;
    let scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: tomorrow

    // Extract time from transcript
    for (const pattern of timePatterns) {
      const matches = transcriptText.match(pattern);
      if (matches) {
        extractedTime = matches[0];
        // Try to parse time
        const hourMatch = transcriptText.match(/\b(\d{1,2})\s*(?:baje|o\'?clock|pm|am)\b/gi);
        if (hourMatch) {
          const hourStr = hourMatch[0].match(/\d{1,2}/);
          if (hourStr) {
            let hour = parseInt(hourStr[0]);
            if (transcriptText.includes('pm') && hour < 12) hour += 12;
            if (transcriptText.includes('am') && hour === 12) hour = 0;
            scheduledTime = new Date();
            scheduledTime.setHours(hour, 0, 0, 0);
            if (scheduledTime < new Date()) {
              scheduledTime.setDate(scheduledTime.getDate() + 1);
            }
          }
        }
        break;
      }
    }

    return {
      requested: true,
      extractedTime,
      scheduledTime: scheduledTime.toISOString(),
      requestText: transcriptText,
    };
  };

  const fetchCallBacks = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      const params = {
        limit: 10000,
        userId: userId,
      };

      const response = await callAPI.getAllCalls(params);
      const calls = response.data?.calls || [];

      // Filter calls that have callback requests in transcript
      const callbackCalls = calls.filter(call => {
        const callbackInfo = detectCallbackRequest(call.transcript);
        return callbackInfo !== null && callbackInfo.requested;
      });

      let callBacksList = callbackCalls.map(call => {
        const callbackInfo = detectCallbackRequest(call.transcript);
        const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
        
        return {
          _id: `callback-${call._id || call.callSid}`,
          phoneNumber: phone,
          name: call.agentName || 'Unknown',
          originalCallId: call._id || call.callSid,
          originalCallDate: call.startedAt || call.createdAt,
          scheduledTime: callbackInfo?.scheduledTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: callbackInfo?.extractedTime 
            ? `Customer requested follow up at ${callbackInfo.extractedTime}` 
            : 'Customer requested follow up',
          priority: 'high',
          status: 'pending',
          campaignName: call.campaignName || '',
          attempts: 1,
        };
      });


      const uniqueCallBacks = [];
      const seenPhones = new Set();
      callBacksList
        .sort((a, b) => new Date(b.originalCallDate) - new Date(a.originalCallDate))
        .forEach(cb => {
          if (!seenPhones.has(cb.phoneNumber)) {
            seenPhones.add(cb.phoneNumber);
            uniqueCallBacks.push(cb);
          }
        });

      // Add demo data if no callbacks found
      if (uniqueCallBacks.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(16, 0, 0, 0);

        uniqueCallBacks.push(
          {
            _id: 'demo-callback-1',
            phoneNumber: '+91 98765 43210',
            name: 'Rajesh Kumar',
            originalCallId: 'demo-call-1',
            originalCallDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            scheduledTime: tomorrow.toISOString(),
            notes: 'Customer requested follow up at 4 PM',
            priority: 'high',
            status: 'pending',
            campaignName: 'Product Inquiry Campaign',
            attempts: 1,
          },
          {
            _id: 'demo-callback-2',
            phoneNumber: '+91 98765 43211',
            name: 'Priya Sharma',
            originalCallId: 'demo-call-2',
            originalCallDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            scheduledTime: tomorrow.toISOString(),
            notes: 'Customer requested follow up',
            priority: 'high',
            status: 'pending',
            campaignName: 'Sales Campaign',
            attempts: 1,
          }
        );
      }

      setCallBacks(uniqueCallBacks.slice(0, 100));
    } catch (err) {
      console.error('Error fetching follow ups:', err);
      setError('Failed to load follow ups');
      setCallBacks([
        {
          _id: 'callback-1',
          phoneNumber: '+919876543210',
          name: 'John Doe',
          originalCallId: 'call-1',
          originalCallDate: new Date(Date.now() - 86400000).toISOString(),
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Customer requested follow up',
          priority: 'high',
          status: 'pending',
          campaignName: 'Diwali Warm Leads',
          attempts: 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCallBack = () => {
    setFormData({
      phoneNumber: '',
      name: '',
      scheduledTime: '',
      notes: '',
      priority: 'medium',
      status: 'pending',
    });
    setShowAddModal(true);
  };

  const handleEditCallBack = (callBack) => {
    setFormData({
      phoneNumber: callBack.phoneNumber || '',
      name: callBack.name || '',
      scheduledTime: callBack.scheduledTime ? new Date(callBack.scheduledTime).toISOString().slice(0, 16) : '',
      notes: callBack.notes || '',
      priority: callBack.priority || 'medium',
      status: callBack.status || 'pending',
    });
    setSelectedCallBack(callBack);
    setShowEditModal(true);
  };

  const handleSaveCallBack = async () => {
    try {
      if (showEditModal && selectedCallBack) {
        setCallBacks(prev => prev.map(cb =>
          cb._id === selectedCallBack._id
            ? { ...cb, ...formData, scheduledTime: new Date(formData.scheduledTime).toISOString() }
            : cb
        ));
      } else {
        const newCallBack = {
          _id: `callback-${Date.now()}`,
          ...formData,
          scheduledTime: new Date(formData.scheduledTime).toISOString(),
          originalCallDate: new Date().toISOString(),
          originalCallId: '',
          campaignName: 'Manual',
          attempts: 0,
        };
        setCallBacks(prev => [newCallBack, ...prev]);
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedCallBack(null);
    } catch (err) {
      console.error('Error saving follow up:', err);
    }
  };

  const handleDeleteCallBack = (callBackId) => {
    if (window.confirm('Are you sure you want to delete this follow up?')) {
      setCallBacks(prev => prev.filter(cb => cb._id !== callBackId));
    }
  };

  const handleMarkCompleted = (callBackId) => {
    setCallBacks(prev => prev.map(cb =>
      cb._id === callBackId
        ? { ...cb, status: 'completed' }
        : cb
    ));
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusClasses[status] || statusClasses.pending}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      high: 'bg-red-50 text-red-700 border border-red-200',
      medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      low: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${priorityClasses[priority] || priorityClasses.medium}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (scheduledTime) => {
    if (!scheduledTime) return false;
    return new Date(scheduledTime) < new Date() && new Date(scheduledTime).getDate() !== new Date().getDate();
  };

  if (loading && callBacks.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading follow ups...</p>
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
            <FaRedo className="h-3 w-3" />
            <span>Follow up management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Follow Up
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Schedule and manage follow ups
          </p>
        </div>
      </div>


      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Follow Ups Table */}
      <div className="glass-panel overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Phone Number</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Scheduled</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Original Call</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Campaign</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-transparent uppercase tracking-[0.16em]">.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {callBacks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No follow ups found
                  </td>
                </tr>
              ) : (
                callBacks.map((callBack) => (
                  <tr 
                    key={callBack._id} 
                    className={`hover:bg-zinc-50/50 transition-colors ${
                      isOverdue(callBack.scheduledTime) && callBack.status === 'pending'
                        ? 'bg-red-50/30 border-l-4 border-red-500/70'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">{callBack.name || 'Unknown'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">{callBack.phoneNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-900">{formatDate(callBack.scheduledTime)}</div>
                      {isOverdue(callBack.scheduledTime) && callBack.status === 'pending' && (
                        <div className="text-xs text-red-600 font-medium mt-1">⚠️ Overdue</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">{formatDate(callBack.originalCallDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">{callBack.campaignName || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(callBack.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {callBack.status !== 'completed' && (
                          <button
                            onClick={() => handleMarkCompleted(callBack._id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-full transition-colors font-medium"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCallBack(callBack._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">
              {showEditModal ? 'Edit Follow Up' : 'Schedule New Follow Up'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  rows="3"
                  placeholder="Add notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-200">
              <button
                onClick={handleSaveCallBack}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedCallBack(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallBacks;

