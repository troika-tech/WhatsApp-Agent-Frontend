import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  FaWhatsapp,
  FaArrowLeft,
  FaQrcode,
  FaCheckCircle,
  FaSpinner,
  FaSync,
  FaPaperPlane,
  FaSearch,
  FaPlus,
  FaTimes,
} from 'react-icons/fa';
import { API_BASE_URL } from '../config/api.config';

const WhatsAppQR = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId] = useState('default');

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const messagesEndRef = useRef(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [numberCheckStatus, setNumberCheckStatus] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  const getBackendUrl = () => API_BASE_URL;

  const getWebSocketUrl = () => {
    const backendUrl = getBackendUrl();
    let wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    let wsHost = backendUrl.replace(/^https?:\/\//, '');

    if (window.location.protocol === 'https:' && !backendUrl.startsWith('https')) {
      wsProtocol = wsHost.includes('localhost') ? 'ws' : 'wss';
    }

    return `${wsProtocol}://${wsHost}/ws/whatsapp-session?sessionId=${sessionId}`;
  };

  const initializeWebSocket = () => {
    try {
      const wsUrl = getWebSocketUrl();
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        setWsConnected(true);
        websocket.send(JSON.stringify({ type: 'subscribe' }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      websocket.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setWsConnected(false);
      };

      websocket.onclose = () => {
        setWsConnected(false);
        setTimeout(() => {
          if (status === 'ready' || status === 'qr') {
            initializeWebSocket();
          }
        }, 3000);
      };

      wsRef.current = websocket;
    } catch (err) {
      console.error('[WebSocket] Failed to initialize:', err);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'status_update':
        if (data.status) {
          setStatus(data.status);
          if (data.status === 'ready') {
            setLoading(false);
            setQrCode(null);
            loadChats();
          } else if (data.status === 'qr' && data.qrCode) {
            setQrCode(data.qrCode);
            setLoading(false);
          }
        }
        break;
      case 'qr_code':
        if (data.qrCode) {
          setQrCode(data.qrCode);
          setStatus('qr');
          setLoading(false);
        }
        break;
      case 'chat_list_update':
        if (data.chats) {
          setChats(data.chats);
        }
        break;
      case 'new_message':
        if (data.message && data.chatId) {
          if (selectedChat && selectedChat.id === data.chatId) {
            setMessages((prev) => {
              const exists = prev.find((m) => m.id === data.message.id);
              if (exists) return prev;
              return [...prev, data.message];
            });
          }

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === data.chatId) {
                return {
                  ...chat,
                  lastMessage: {
                    body: data.message.body,
                    timestamp: data.message.timestamp,
                    fromMe: data.message.fromMe,
                  },
                  unreadCount: chat.id === selectedChat?.id ? chat.unreadCount : (chat.unreadCount || 0) + 1,
                };
              }
              return chat;
            })
          );
        }
        break;
      default:
        break;
    }
  };

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/init?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        setQrCode(data.qrCode);

        if (data.status === 'ready') {
          setLoading(false);
          loadChats();
        }
      } else {
        setError(data.message || 'Failed to initialize session');
        setStatus('error');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to server');
      setStatus('error');
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/chats?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setChats(data.chats || []);
      } else {
        console.error('Failed to load chats:', data.message);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/whatsapp-session/chats/${encodeURIComponent(chatId)}/messages?sessionId=${sessionId}&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const checkNumber = async (number) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/check-number?sessionId=${sessionId}&number=${encodeURIComponent(number)}`);
      const data = await response.json();

      if (data.success) {
        if (data.isRegistered === null) {
          setNumberCheckStatus('unknown');
          return null;
        }
        setNumberCheckStatus(data.isRegistered ? 'registered' : 'not_registered');
        return data.isRegistered;
      } else {
        setNumberCheckStatus('error');
        return false;
      }
    } catch (err) {
      console.error('Error checking number:', err);
      setNumberCheckStatus('unknown');
      return null;
    }
  };

  const handleStartNewChat = async (e) => {
    e.preventDefault();
    if (!newChatNumber.trim() || startingChat) return;

    try {
      setStartingChat(true);
      setNumberCheckStatus(null);

      const cleanNumber = newChatNumber.replace(/[^\d+]/g, '');
      const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/start-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          number: formattedNumber,
          initialMessage: newChatMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChats((prev) => {
          const exists = prev.find((c) => c.id === data.chat.id);
          if (exists) return prev;
          return [data.chat, ...prev];
        });

        setSelectedChat(data.chat);
        loadMessages(data.chat.id);

        setShowNewChatModal(false);
        setNewChatNumber('');
        setNewChatMessage('');
        setNumberCheckStatus(null);
      } else {
        let errorMsg = data.message || 'Unknown error';
        if (errorMsg.includes('not registered')) {
          errorMsg = 'This phone number is not registered on WhatsApp.';
        } else if (errorMsg.includes('timeout')) {
          errorMsg = 'Request timed out. Please try again.';
        }
        toast.error('Failed to start chat: ' + errorMsg);
        setNumberCheckStatus('error');
      }
    } catch (err) {
      toast.error('Error starting chat: ' + err.message);
      setNumberCheckStatus('error');
    } finally {
      setStartingChat(false);
    }
  };

  const handleNumberInputChange = (value) => {
    setNewChatNumber(value);
    setNumberCheckStatus(null);
  };

  useEffect(() => {
    if (!newChatNumber.trim()) {
      setNumberCheckStatus(null);
      return;
    }

    const cleanNumber = newChatNumber.replace(/[^\d+]/g, '');
    if (cleanNumber.length >= 10) {
      const timeoutId = setTimeout(async () => {
        if (newChatNumber.replace(/[^\d+]/g, '') === cleanNumber) {
          await checkNumber(cleanNumber);
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [newChatNumber]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || sendingMessage) return;

    try {
      setSendingMessage(true);
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          chatId: selectedChat.id,
          message: messageInput.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessageInput('');
        setTimeout(() => {
          loadMessages(selectedChat.id);
        }, 500);
      } else {
        toast.error('Failed to send message: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Error sending message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const pollStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/status?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        const prevStatus = status;
        setStatus(data.status);

        if (data.qrCode && data.status === 'qr') {
          setQrCode(data.qrCode);
        }

        if (data.status === 'ready') {
          setLoading(false);
          setQrCode(null);
          if (prevStatus !== 'ready') {
            loadChats();
          }
        } else if (data.status === 'qr') {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  };

  const handleLogout = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/whatsapp-session/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('WhatsApp session logged out successfully');
        setStatus('disconnected');
        setQrCode(null);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        await initializeSession();
      } else {
        toast.error(data.message || 'Failed to logout WhatsApp session');
      }
    } catch (err) {
      console.error('Logout error:', err);
      toast.error(err.message || 'Failed to logout WhatsApp session');
      setError(err.message || 'Failed to logout');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return chat.name.toLowerCase().includes(query) || chat.number.includes(query);
  });

  useEffect(() => {
    initializeSession();
    initializeWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if ((status === 'ready' || status === 'qr') && !wsConnected && wsRef.current?.readyState !== WebSocket.OPEN) {
      setTimeout(() => {
        if (!wsConnected) {
          initializeWebSocket();
        }
      }, 1000);
    }
  }, [status, wsConnected]);

  useEffect(() => {
    if (!wsConnected && status !== 'ready' && status !== 'error') {
      const interval = setInterval(pollStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status, wsConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    document.title = 'WhatsApp QR Scan - Connect Your WhatsApp';
  }, []);

  if (status !== 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-white/80 transition-colors border border-zinc-200"
              title="Go Back"
            >
              <FaArrowLeft className="h-5 w-5 text-zinc-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <FaQrcode className="text-emerald-500" />
                WhatsApp QR Scan
              </h1>
              <p className="text-sm text-zinc-600 mt-1">Scan the QR code to connect your WhatsApp number</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-8">
            <div className="mb-6">
              {status === 'qr' && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <FaQrcode className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Ready to Scan</p>
                    <p className="text-xs text-blue-700">Scan the QR code below with your WhatsApp</p>
                  </div>
                </div>
              )}

              {status === 'initializing' && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <FaSpinner className="h-5 w-5 text-amber-600 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Initializing</p>
                    <p className="text-xs text-amber-700">Preparing QR code...</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-red-900">Error</p>
                    <p className="text-xs text-red-700">{error || 'An error occurred'}</p>
                  </div>
                </div>
              )}
            </div>

            {status === 'qr' && qrCode && (
              <div className="flex flex-col items-center gap-6">
                <div className="p-6 bg-white rounded-xl border-2 border-zinc-200 shadow-inner relative">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                    onError={(e) => {
                      console.error('QR code failed to load');
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="bg-white rounded-full p-2.5 shadow-md"
                      style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FaWhatsapp className="h-10 w-10" style={{ color: '#25D366' }} />
                    </div>
                  </div>
                </div>

                <div className="text-center max-w-md">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-3">How to connect:</h3>
                  <ol className="text-sm text-zinc-600 space-y-2 text-left list-decimal list-inside">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap Menu (three dots) or Settings</li>
                    <li>Tap Linked Devices</li>
                    <li>Tap Link a Device</li>
                    <li>Point your camera at this QR code</li>
                  </ol>
                </div>
              </div>
            )}

            {loading && status === 'initializing' && (
              <div className="flex flex-col items-center gap-4 py-12">
                <FaSpinner className="h-12 w-12 text-emerald-500 animate-spin" />
                <p className="text-sm text-zinc-600">Initializing WhatsApp session...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-semibold mb-2">Connection Error</p>
                  <p className="text-xs text-red-600">{error || 'Failed to initialize WhatsApp session'}</p>
                </div>
                <button
                  onClick={initializeSession}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  <FaSync className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}

            {status === 'qr' && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={initializeSession}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <FaSync className="h-4 w-4" />
                  Refresh QR Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
            title="Go Back"
          >
            <FaArrowLeft className="h-5 w-5 text-zinc-600" />
          </button>
          <div className="flex items-center gap-3">
            <FaWhatsapp className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">WhatsApp</h2>
              <p className="text-xs text-zinc-600">Connected</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Chats</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={loadChats}
                disabled={loadingChats}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Chats"
              >
                <FaSync className={`h-4 w-4 text-zinc-600 ${loadingChats ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                title="New Chat"
              >
                <FaPlus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-zinc-200">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <FaWhatsapp className="h-12 w-12 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm mb-2">No chats found</p>
                <p className="text-xs text-zinc-400 mb-4">Your WhatsApp chats will appear here once loaded</p>
                <button
                  onClick={loadChats}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <FaSync className="h-3 w-3" />
                  Refresh Chats
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`p-3 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${chat.isGroup ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                      <FaWhatsapp className={`h-6 w-6 ${chat.isGroup ? 'text-blue-600' : 'text-emerald-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-900 truncate">{chat.name}</h3>
                          {chat.isGroup && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Group</span>}
                        </div>
                        {chat.lastMessage && (
                          <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">{formatTime(chat.lastMessage.timestamp)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-zinc-600 truncate flex-1">
                          {chat.lastMessage?.fromMe ? 'You: ' : ''}
                          {chat.lastMessage?.body || 'No messages'}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-zinc-50">
          {selectedChat ? (
            <>
              <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FaWhatsapp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{selectedChat.name}</h3>
                    <p className="text-xs text-zinc-600">{selectedChat.number}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8">
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.fromMe ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-900 border border-zinc-200'
                        }`}
                      >
                        {!msg.fromMe && <p className="text-xs font-semibold mb-1 opacity-80">{msg.author}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={`text-xs mt-1 ${msg.fromMe ? 'text-emerald-100' : 'text-zinc-500'}`}>{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white border-t border-zinc-200 px-4 py-3 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sendingMessage}
                    className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? <FaSpinner className="h-5 w-5 animate-spin" /> : <FaPaperPlane className="h-5 w-5" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <FaWhatsapp className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
                <p className="text-sm">Select a chat to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900">Start New Chat</h3>
                <button
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatNumber('');
                    setNewChatMessage('');
                    setNumberCheckStatus(null);
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <FaTimes className="h-5 w-5 text-zinc-600" />
                </button>
              </div>

              <form onSubmit={handleStartNewChat} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={newChatNumber}
                    onChange={(e) => handleNumberInputChange(e.target.value)}
                    placeholder="+919836767975"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                  <p className="mt-1 text-xs text-zinc-500">Enter phone number with country code (e.g., +919836767975)</p>

                  {numberCheckStatus === 'registered' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                      <FaCheckCircle className="h-4 w-4" />
                      <span>Number is registered on WhatsApp</span>
                    </div>
                  )}
                  {numberCheckStatus === 'not_registered' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                      <FaTimes className="h-4 w-4" />
                      <span>Number is not registered on WhatsApp</span>
                    </div>
                  )}
                  {(numberCheckStatus === 'unknown' || numberCheckStatus === 'error') && (
                    <div className="mt-2 text-xs text-amber-600">
                      Could not verify number registration. You can still try to start a chat.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Initial Message (Optional)</label>
                  <textarea
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Type your first message..."
                    rows={3}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewChatModal(false);
                      setNewChatNumber('');
                      setNewChatMessage('');
                      setNumberCheckStatus(null);
                    }}
                    className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newChatNumber.trim() || startingChat}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {startingChat ? (
                      <>
                        <FaSpinner className="h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <FaWhatsapp className="h-4 w-4" />
                        Start Chat
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppQR;





