import React, { useEffect, useState, useRef } from 'react';
import {
  FaSpinner,
  FaCircle,
  FaUser,
  FaRobot,
  FaClock,
  FaComments,
  FaSyncAlt,
  FaSearch,
  FaChevronDown,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaWhatsapp,
  FaTimes,
  FaCheckCircle,
} from 'react-icons/fa';
import { handoffAPI, authAPI } from '../services/api';
import { API_BASE_URL } from '../config/api.config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const OnlineSession = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactInfoOpen, setContactInfoOpen] = useState(true);
  const [sendingWhatsAppMessage, setSendingWhatsAppMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState('Hi');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const companyIdRef = useRef(null);
  const pendingAlertedRef = useRef(new Set());
  const userHasInteractedRef = useRef(false);
  const pendingSoundQueuedRef = useRef(false);
  const audioContextRef = useRef(null);
  const navigate = useNavigate();

  const getBackendUrl = () => API_BASE_URL;
  const PENDING_STALE_MINUTES = 5;

  const playNotificationTone = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.04;

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (err) {

    }
  };

  const isPendingStale = (session) => {
    if (!session || session.status !== 'pending') return false;
    const last = session.last_activity || session.created_at;
    if (!last) return false;
    const minutes = (Date.now() - new Date(last)) / (1000 * 60);
    return minutes > PENDING_STALE_MINUTES;
  };

  const handlePendingNotifications = (incomingSessions = []) => {
    const pendingSessions = incomingSessions.filter(
      (session) => session.status === 'pending' && session.session_id && !isPendingStale(session)
    );
    const currentPendingIds = new Set(pendingSessions.map((session) => session.session_id));
    const newPendingSessions = pendingSessions.filter((session) => !pendingAlertedRef.current.has(session.session_id));

    if (newPendingSessions.length > 0) {
      newPendingSessions.forEach((session) => {
        pendingAlertedRef.current.add(session.session_id);
        toast.info(
          `New chat needs approval${session.user_name ? `: ${session.user_name}` : ''}`,
          {
            autoClose: 6000,
            onClick: () => setSelectedSession(session),
          }
        );
      });

      if (userHasInteractedRef.current) {
        playNotificationTone();
      } else {
        pendingSoundQueuedRef.current = true;
      }
    }

    pendingAlertedRef.current.forEach((sessionId) => {
      if (!currentPendingIds.has(sessionId)) {
        pendingAlertedRef.current.delete(sessionId);
      }
    });
  };

  const checkWhatsAppStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/status?sessionId=default`);
      const data = await response.json();
      return data.success && data.status === 'ready';
    } catch (err) {
      return false;
    }
  };

  const handleChatNow = async () => {
    if (!selectedSession?.user_phone) {
      toast.error('Phone number not available');
      return;
    }

    try {
      setSendingWhatsAppMessage(true);
      const isConnected = await checkWhatsAppStatus();
      if (!isConnected) {
        toast.error('WhatsApp is not connected. Please go to "WhatsApp QR Scan" to connect first.');
        setSendingWhatsAppMessage(false);
        return;
      }

      const cleanNumber = selectedSession.user_phone.replace(/[^\d]/g, '');
      const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'default',
          number: formattedNumber,
          message: customMessage.trim() || 'Hi',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const sentMessage = customMessage.trim() || 'Hi';
        toast.success(`Message "${sentMessage}" sent to ${formattedNumber} via WhatsApp`);
      } else {
        let errorMsg = data.message || 'Failed to send WhatsApp message';
        if (errorMsg.includes('not ready') || errorMsg.includes('not initialized')) {
          errorMsg = 'WhatsApp is not connected. Please connect your WhatsApp in the QR tab first.';
        }
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      toast.error('Error sending WhatsApp message: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingWhatsAppMessage(false);
    }
  };

  const fetchHandoffSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Ensure we scope sessions to the logged-in company
      if (!companyIdRef.current) {
        const companyRes = await authAPI.getCurrentUser().catch(() => null);
        companyIdRef.current = companyRes?.data?.id || companyRes?.data?._id || null;
      }

      const response = await handoffAPI.getActiveHandoffs(
        companyIdRef.current ? { companyId: companyIdRef.current } : {}
      );
      const incomingSessions = response.data || [];
      setSessions(incomingSessions);
      handlePendingNotifications(incomingSessions);
    } catch (err) {
      console.error('Error fetching handoff sessions:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load handoff sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionMessages = async (sessionId) => {
    if (!sessionId) return;

    try {
      setLoadingMessages(true);
      const response = await authAPI.getMessages({ session_id: sessionId });
      const messages = response.data?.messages || [];

      const uniqueMessages = [];
      const seenMessages = new Set();

      messages.forEach((msg) => {
        const msgId = msg.id || `${msg.content}_${msg.timestamp || msg.created_at}`;
        if (!seenMessages.has(msgId)) {
          seenMessages.add(msgId);
          uniqueMessages.push(msg);
        }
      });

      const sortedMessages = uniqueMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });

      setChatMessages(sortedMessages);
    } catch (err) {
      console.error('[User Dashboard] Error fetching messages:', err);
      if (!err.response || err.response.status !== 404) {
        console.error('Failed to load messages:', err.message);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    const markInteraction = () => {
      userHasInteractedRef.current = true;
      if (pendingSoundQueuedRef.current) {
        pendingSoundQueuedRef.current = false;
        playNotificationTone();
      }
    };

    window.addEventListener('pointerdown', markInteraction);
    window.addEventListener('keydown', markInteraction);

    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  useEffect(() => {
    fetchHandoffSessions();

    if (autoRefresh) {
      const interval = setInterval(fetchHandoffSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (selectedSession && selectedSession.session_id) {
      const sessionId = selectedSession.session_id;
      const sessionStatus = selectedSession.status;
      fetchSessionMessages(sessionId);

      if (sessionStatus === 'active' && autoRefresh) {
        const interval = setInterval(() => {
          if (selectedSession && selectedSession.status === 'active') {
            fetchSessionMessages(sessionId);
          }
        }, 2000);

        return () => clearInterval(interval);
      }
    } else {
      setChatMessages([]);
    }
  }, [selectedSession?.session_id, selectedSession?.status, autoRefresh]);

  const isSessionInactive = (session) => {
    if (!session) return true;
    if (session.status === 'inactive' || session.status === 'closed' || session.status === 'resolved') {
      return true;
    }
    if (isPendingStale(session)) return true;

    if (session.status === 'active' && session.last_activity) {
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
      if (minutesSinceActivity > 30) {
        return true;
      }
    }
    return false;
  };

  const filteredSessions = sessions
    .map((session) => {
      const isInactive = isSessionInactive(session);
      return {
        ...session,
        displayStatus: isInactive ? 'inactive' : session.status,
      };
    })
    .filter((session) => {
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      const sessionId = session.session_id?.toLowerCase() || '';
      const userName = session.user_name?.toLowerCase() || '';
      const phone = session.user_phone?.toLowerCase() || '';
      return sessionId.includes(query) || userName.includes(query) || phone.includes(query);
    });

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedSession || sendingMessage) return;

    const messageText = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    try {
      await handoffAPI.sendMessage(selectedSession.session_id, messageText);

      const newMessage = {
        sender: 'bot',
        content: messageText,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, newMessage]);

      setTimeout(() => {
        fetchSessionMessages(selectedSession.session_id);
      }, 300);
      setTimeout(() => {
        fetchSessionMessages(selectedSession.session_id);
      }, 1000);

      toast.success('Message sent successfully');
    } catch (err) {
      console.error('[User Dashboard] Error sending message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
      setMessageInput(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApproveSession = async (sessionId) => {
    try {
      await handoffAPI.approve(sessionId);
      toast.success('Handoff approved! Chat is now active.');
      await fetchHandoffSessions();
      if (selectedSession?.session_id === sessionId) {
        const updatedSession = sessions.find((s) => s.session_id === sessionId);
        if (updatedSession) {
          setSelectedSession({ ...updatedSession, status: 'active' });
        }
        fetchSessionMessages(sessionId);
      }
    } catch (err) {
      console.error('Error approving session:', err);
      toast.error(err.response?.data?.message || 'Failed to approve session');
    }
  };

  const handleResolveSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to resolve this handoff session?')) return;

    try {
      await handoffAPI.resolve(sessionId);
      toast.success('Session resolved successfully');
      if (selectedSession?.session_id === sessionId) {
        setSelectedSession(null);
        setChatMessages([]);
      }
      fetchHandoffSessions();
    } catch (err) {
      console.error('Error resolving session:', err);
      toast.error(err.response?.data?.message || 'Failed to resolve session');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      resolved: 'bg-blue-50 text-blue-700 border border-blue-200',
      closed: 'bg-zinc-50 text-zinc-700 border border-zinc-200',
      inactive: 'bg-gray-50 text-gray-700 border border-gray-200',
    };

    return (
      <span className={`px-2 py-0.5 inline-flex text-[11px] font-medium rounded-full ${styles[status] || styles.pending}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </span>
    );
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading handoff sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex min-h-0 border-t border-zinc-200">
        {/* Conversation list */}
        <div className="w-80 border-r border-zinc-200 flex flex-col bg-white">
          <div className="p-4 border-b border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-zinc-900">Team Inbox</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="p-1.5 rounded hover:bg-zinc-100 transition-colors"
                  title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                >
                  <FaSyncAlt className={`h-4 w-4 text-zinc-600 ${autoRefresh ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 px-3 py-1.5 bg-blue-50 rounded-lg text-sm font-medium text-blue-700">
                My open conversations{' '}
                {filteredSessions.filter((s) => s.status === 'active').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-200 rounded text-xs">
                    {filteredSessions.filter((s) => s.status === 'active').length}
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by session ID, name, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 p-3 border-l-4 border-red-500 bg-red-50 rounded">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center">
                <FaCircle className="text-zinc-400 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  {search ? 'No sessions found' : 'No Active Handoffs'}
                </h3>
                <p className="text-sm text-zinc-500">
                  {search ? 'Try adjusting your search criteria.' : 'There are currently no active handoff sessions.'}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session._id || session.session_id}
                  onClick={() => setSelectedSession(session)}
                  className={`px-4 py-3 border-b border-zinc-100 cursor-pointer transition-colors ${
                    selectedSession?.session_id === session.session_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-emerald-600" />
                      </div>
                      <FaCircle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-emerald-500 bg-white rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-zinc-900 truncate">{session.user_name || session.user_phone || 'Guest User'}</h3>
                        <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">
                          {session.last_activity ? getTimeAgo(session.last_activity) : 'Unknown'}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-600 line-clamp-2 mb-2">
                        {session.last_message || session.handoff_message || 'No messages yet'}
                      </p>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium ${
                            session.displayStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : session.displayStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : session.displayStatus === 'inactive' || session.displayStatus === 'closed' || session.displayStatus === 'resolved'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {session.displayStatus === 'active'
                            ? 'Active'
                            : session.displayStatus === 'pending'
                            ? 'Pending'
                            : session.displayStatus === 'inactive'
                            ? 'Inactive'
                            : session.displayStatus
                            ? session.displayStatus.charAt(0).toUpperCase() + session.displayStatus.slice(1)
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {selectedSession ? (
            <>
              <div className="px-4 py-3 border-b border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">
                          Web Chat - {selectedSession.user_name || selectedSession.user_phone || 'Guest User'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {selectedSession.handoff_message ? 'Order status and tracking' : 'Session'} • {selectedSession.session_id?.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded hover:bg-zinc-100 transition-colors">
                      <FaTimes className="h-4 w-4 text-zinc-600" />
                    </button>
                    <button
                      onClick={() => navigate(`/chat-history?session_id=${selectedSession.session_id}`)}
                      className="px-3 py-1.5 rounded bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      Open
                      <FaChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-zinc-50 scrollbar-hide">
                <div className="p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <FaSpinner className="animate-spin text-blue-500" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-500 mb-4">Connect Web Chat widget to start supporting your customers.</p>
                      <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                        Know your customer
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 border-t border-zinc-200"></div>
                        <span className="text-xs font-medium text-zinc-500 px-2">Today</span>
                        <div className="flex-1 border-t border-zinc-200"></div>
                      </div>

                      <div className="flex justify-center mb-4">
                        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                          Know your customer
                        </button>
                      </div>

                      {chatMessages.map((msg, idx) => {
                        const messageKey = msg.id || `${msg.timestamp || idx}_${idx}`;
                        const isBot = msg.sender === 'bot';
                        return (
                          <div key={messageKey} className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                                isBot ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm' : 'bg-blue-50 text-zinc-900 border border-blue-100'
                              }`}
                            >
                              {!isBot && (
                                <p className="text-xs font-semibold text-zinc-700 mb-1">
                                  {selectedSession.user_name || selectedSession.user_phone || 'Guest User'}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p className={`text-xs mt-1.5 ${isBot ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {msg.timestamp
                                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Unknown time'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>

              {selectedSession.status === 'active' && !isSessionInactive(selectedSession) ? (
                <div className="p-4 border-t border-zinc-200 bg-white">
                  <div className="mb-2">
                    <button className="text-xs text-zinc-500 hover:text-zinc-700">Private Note</button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 border border-zinc-200 rounded-lg bg-white">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Reply"
                        rows={1}
                        className="w-full px-4 py-2 border-0 rounded-lg bg-transparent text-zinc-900 focus:ring-0 focus:outline-none text-sm resize-none"
                        disabled={sendingMessage}
                      />
                      <div className="px-4 pb-2">
                        <p className="text-xs text-zinc-400">Shift + Enter to add a new line; Start with '/' to select a Canned Response</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendingMessage}
                      className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {sendingMessage ? <FaSpinner className="animate-spin" /> : <span>Send</span>}
                    </button>
                  </div>
                </div>
              ) : selectedSession.status === 'pending' && !isPendingStale(selectedSession) ? (
                <div className="p-4 border-t border-zinc-200 bg-yellow-50">
                  <div className="text-center py-2">
                    <p className="text-sm text-yellow-800 font-medium">⏳ Waiting for approval. Click "Approve" to start chatting.</p>
                    <button
                      onClick={() => handleApproveSession(selectedSession.session_id)}
                      className="mt-3 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm font-medium"
                    >
                      Approve Session
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-zinc-200 bg-gray-50">
                  <div className="mb-2">
                    <button className="text-xs text-gray-400 cursor-not-allowed" disabled>
                      Private Note
                    </button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 border border-gray-200 rounded-lg bg-gray-100">
                      <textarea
                        value=""
                        onChange={() => {}}
                        placeholder="Session is over. Chat is closed."
                        rows={1}
                        className="w-full px-4 py-2 border-0 rounded-lg bg-transparent text-gray-400 focus:ring-0 focus:outline-none text-sm resize-none cursor-not-allowed"
                        disabled
                      />
                      <div className="px-4 pb-2">
                        <p className="text-xs text-gray-400">This session has ended. No further messages can be sent.</p>
                      </div>
                    </div>
                    <button disabled className="px-4 py-2 rounded-lg bg-gray-300 text-gray-500 cursor-not-allowed transition-colors flex items-center gap-2">
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50">
              <div className="text-center">
                <FaComments className="text-zinc-400 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Select a Session</h3>
                <p className="text-sm text-zinc-500">Choose a handoff session from the list to start chatting with the user.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l border-zinc-200 flex flex-col bg-white">
          {selectedSession ? (
            <>
              <div className="border-b border-zinc-200">
                <button
                  onClick={() => setContactInfoOpen(!contactInfoOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-zinc-900">Contact info</h3>
                  <FaChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${contactInfoOpen ? 'rotate-180' : ''}`} />
                </button>

                {contactInfoOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                        <FaUser className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 truncate">{selectedSession.user_name || selectedSession.user_phone || 'Guest User'}</h4>
                        <div className="text-xs truncate text-left w-full">
                          {selectedSession.user_phone ? (
                            <span className="text-zinc-900">
                              {selectedSession.user_phone.startsWith('+') ? selectedSession.user_phone : `+${selectedSession.user_phone}`}
                            </span>
                          ) : (
                            <span className="text-zinc-500">No phone number</span>
                          )}
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors">Edit</button>
                    </div>

                    <div className="space-y-2">
                      {selectedSession.user_phone && (
                        <div className="flex items-center gap-2 text-sm text-zinc-700 w-full">
                          <FaPhone className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-900">
                            {selectedSession.user_phone.startsWith('+') ? selectedSession.user_phone : `+${selectedSession.user_phone}`}
                          </span>
                        </div>
                      )}
                      {selectedSession.user_email && (
                        <div className="flex items-center gap-2 text-sm text-zinc-700">
                          <FaEnvelope className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-900">{selectedSession.user_email}</span>
                        </div>
                      )}
                      {selectedSession.user_ip && (
                        <div className="flex items-center gap-2 text-sm text-zinc-700">
                          <FaMapMarkerAlt className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-900 font-mono text-xs">
                            <span className="text-zinc-600">IP Address:</span> {selectedSession.user_ip}
                          </span>
                        </div>
                      )}
                      {selectedSession.session_id && (
                        <div className="flex items-center gap-2 text-sm text-zinc-700">
                          <span className="text-zinc-500 text-xs">Session ID:</span>
                          <span className="text-zinc-900 font-mono text-xs">{selectedSession.session_id}</span>
                        </div>
                      )}
                    </div>

                    {selectedSession.user_phone && (
                      <div className="pt-2 border-t border-zinc-200 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1.5">Custom Message</label>
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Enter your message here..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                            disabled={sendingWhatsAppMessage}
                          />
                          <p className="mt-1 text-xs text-zinc-400">{customMessage.trim().length} characters</p>
                        </div>

                        <button
                          onClick={handleChatNow}
                          disabled={sendingWhatsAppMessage || !customMessage.trim()}
                          className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingWhatsAppMessage ? (
                            <>
                              <FaSpinner className="h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <FaWhatsapp className="h-4 w-4" />
                              <span>Chat Now</span>
                            </>
                          )}
                        </button>
                        <p className="text-xs text-zinc-500 text-center">Send custom message via WhatsApp</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Session Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status</span>
                      <span className="font-medium text-zinc-900">{isSessionInactive(selectedSession) ? 'Inactive' : selectedSession.status || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Messages</span>
                      <span className="font-medium text-zinc-900">{selectedSession.message_count || 0}</span>
                    </div>
                    {selectedSession.last_activity && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Last Activity</span>
                        <span className="font-medium text-zinc-900">{getTimeAgo(selectedSession.last_activity)}</span>
                      </div>
                    )}
                    {selectedSession.user_phone && (
                      <div className="flex justify-between items-start pt-2 border-t border-zinc-200">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <FaPhone className="h-3 w-3" />
                          WhatsApp
                        </span>
                        <div className="text-right break-all">
                          <span className="font-medium text-zinc-900">
                            {selectedSession.user_phone.startsWith('+') ? selectedSession.user_phone : `+${selectedSession.user_phone}`}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedSession.user_name && (
                      <div className="flex justify-between items-start">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <FaUser className="h-3 w-3" />
                          Name
                        </span>
                        <span className="font-medium text-zinc-900 text-right break-words">{selectedSession.user_name}</span>
                      </div>
                    )}
                    {selectedSession.user_email && (
                      <div className="flex justify-between items-start">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <FaEnvelope className="h-3 w-3" />
                          Email
                        </span>
                        <span className="font-medium text-zinc-900 text-right break-all text-xs">{selectedSession.user_email}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <FaMapMarkerAlt className="h-3 w-3" />
                        IP Address
                      </span>
                      <span className="font-medium text-zinc-900 text-right break-all font-mono text-xs">{selectedSession.user_ip || 'Not available'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-500 flex items-center gap-1 text-xs">Visit URL</span>
                      {selectedSession.visit_url ? (
                        <a
                          href={selectedSession.visit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline text-right break-all text-xs max-w-[200px] truncate"
                          title={selectedSession.visit_url}
                        >
                          {selectedSession.visit_url.length > 30 ? `${selectedSession.visit_url.substring(0, 30)}...` : selectedSession.visit_url}
                        </a>
                      ) : (
                        <span className="font-medium text-zinc-400 text-right text-xs">Not available</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedSession.status === 'active' && !isSessionInactive(selectedSession) && (
                  <div className="pt-4 border-t border-zinc-200">
                    <button
                      onClick={() => handleResolveSession(selectedSession.session_id)}
                      className="w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FaCheckCircle />
                      <span>Resolve Session</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm text-zinc-500">Select a session to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineSession;


