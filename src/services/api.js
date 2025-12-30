import axios from 'axios';
import { API_BASE_URL, DEMO_MODE } from '../config/api.config';
import { clearSession } from '../utils/sessionManager';
import { handlePendingNotifications } from '../utils/notificationHandler';

// API client is now configured via api.config.js
// To change backend URL, edit src/config/api.config.js

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout to prevent hanging
});

// Helper function to simulate API delay
const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor - Add JWT token and appType header to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Always add appType='chatbot' header for backend-worker
    config.headers['x-app-type'] = 'chatbot';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors globally and pending notifications
api.interceptors.response.use(
  (response) => {
    // Reset inactivity timer on successful API response (indicates active usage)
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('userActivity'));
    }
    
    // Check for pending notifications in the response
    if (response.data) {
      handlePendingNotifications(response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);

    // If 401 Unauthorized, clear session and redirect to login
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Session expired';
      
      // Check if it's a session invalidation (user logged in elsewhere)
      const isSessionInvalidated = errorMessage.includes('invalidated') || 
                                   errorMessage.includes('logged in on another') ||
                                   errorMessage.includes('another device') ||
                                   errorMessage.includes('another browser');
      

      // Clear session and stored auth data
      clearSession();
      localStorage.removeItem('refreshToken');

      // Store a flag to show message on login page
      if (isSessionInvalidated) {
        sessionStorage.setItem('sessionInvalidated', 'true');
        sessionStorage.setItem('sessionInvalidationMessage', 'You have been logged out because you logged in on another device or browser.');
      }

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs - Wired to backend-worker
export const authAPI = {
  // Login - POST /api/auth/login (backend-worker endpoint)
  // Backend expects: { email, password, appType: 'chatbot' }
  // Backend returns: { success: true, token, user: { id, email, name, role, appType } }
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', {
      email,
      password,
      appType: 'chatbot', // Always use chatbot appType
    });
    // Transform backend response to match frontend expectations
    return {
      success: true,
      data: {
        token: response.data.token,
        role: response.data.user.role,
        user: {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role, // Include role in user object
        }
      },
      message: 'Login successful'
    };
  },

  // Logout - No backend endpoint needed, just clear local storage
  logout: async () => {
    try {
      // Backend-worker doesn't have a logout endpoint, just clear local storage
      return { success: true };
    } catch (error) {
      return { success: true };
    }
  },

  // Validate token - GET /api/auth/me (backend-worker endpoint)
  validateToken: async () => {
    const response = await api.get('/api/auth/me');
    return {
      success: true,
      data: response.data.user
    };
  },

  // Get current user - GET /api/auth/me (backend-worker endpoint)
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return {
      success: true,
      data: response.data.user
    };
  },

  // Get user plan info - Return default (not available in backend-worker)
  getUserPlan: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          name: 'Premium Plan',
          tokens: 5420,
          days_remaining: 28,
          max_users: 'Unlimited',
          expiry_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        }
      };
    }
    // Backend-worker doesn't have plan info, return default
    return {
      success: true,
      data: {
        name: 'Standard Plan',
        tokens: 0,
        days_remaining: 365,
        max_users: 'Unlimited',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }
    };
  },

  // Get user usage stats - Calculate from chatbot conversations
  // Returns: total_messages (Total Chats), unique_users (Total Visitors), total_chatbots (Total Chatbot)
  getUserUsage: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          total_messages: 1842,
          unique_users: 624,
          total_chatbots: 3,
          total_duration: 176832,
          last_activity: new Date(Date.now() - 3600000).toISOString(),
        }
      };
    }
    try {
      // Get all chatbot accounts for the user
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      const totalChatbots = chatbotAccounts.length;
      
      if (chatbotAccounts.length === 0) {
        return {
          success: true,
          data: {
            total_messages: 0,
            unique_users: 0,
            total_chatbots: 0,
            total_duration: 0,
            last_activity: null,
          }
        };
      }

      // Aggregate data from all chatbot conversations
      let totalMessages = 0;
      let uniquePhones = new Set();
      let lastActivity = null;

      // Fetch conversations from all chatbots to get accurate totals
      for (const chatbot of chatbotAccounts) {
        try {
          // Get all conversations for this chatbot (fetch multiple pages if needed)
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
              params: { page, limit: 100 }
            });
            const conversations = convResponse.data?.conversations || [];
            const pagination = convResponse.data?.pagination || {};
            
            // Aggregate messages and unique visitors
            conversations.forEach(conv => {
              totalMessages += conv.messageCount || 0;
              
              // Add unique phone numbers (visitors)
              if (conv.exact_customerPhone) {
                uniquePhones.add(conv.exact_customerPhone);
              } else if (conv.customerPhone) {
                // Extract phone number from WhatsApp format (remove @s.whatsapp.net)
                const phone = conv.customerPhone.split('@')[0];
                uniquePhones.add(phone);
              }
              
              // Track last activity
              if (conv.lastMessageAt && (!lastActivity || new Date(conv.lastMessageAt) > new Date(lastActivity))) {
                lastActivity = conv.lastMessageAt;
              }
            });
            
            // Check if there are more pages
            hasMore = page < (pagination.totalPages || 0);
            page++;
            
            // Safety limit: don't fetch more than 10 pages per chatbot
            if (page > 10) break;
          }
        } catch (err) {
          console.error(`Error fetching conversations for chatbot ${chatbot._id}:`, err);
        }
      }

      return {
        success: true,
        data: {
          total_messages: totalMessages, // Total Chats - sum of all messages
          unique_users: uniquePhones.size, // Total Visitors - unique phone numbers
          total_chatbots: totalChatbots, // Total Chatbot - number of chatbot accounts
          total_duration: 0, // Not used for Total Chatbot display
          last_activity: lastActivity || new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('Error fetching user usage:', error);
      return {
        success: true,
        data: {
          total_messages: 0,
          unique_users: 0,
          total_chatbots: 0,
          total_duration: 0,
          last_activity: null,
        }
      };
    }
  },

  // Get user dashboard sidebar permissions - Return default (not available in backend-worker)
  getDashboardSidebarConfig: async () => {
    try {
      // Backend-worker doesn't have this endpoint, return default config
      return {
        success: true,
        sidebar_enabled: true,
        allowed_menu_keys: null, // null means all menu items are allowed
        offer_sidebar_display_text: 'Offers',
      };
    } catch (error) {
      // Return default on error
      return {
        success: true,
        sidebar_enabled: true,
        allowed_menu_keys: null,
        offer_sidebar_display_text: 'Offers',
      };
    }
  },

  // Profanity Management APIs
  getProfanityConfig: async (chatbotId) => {
    const response = await api.get(`/api/chatbot/${chatbotId}/profanity-config`);
    return response.data;
  },

  updateProfanityConfig: async (chatbotId, enabled, customKeywords, showInUserDashboard) => {
    const response = await api.put(`/api/chatbot/${chatbotId}/profanity-config`, {
      enabled,
      custom_keywords: customKeywords,
      show_in_user_dashboard: showInUserDashboard,
    });
    return response.data;
  },

  getBannedSessions: async (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const response = await api.get(`/api/chatbot/${chatbotId}/banned-sessions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  unbanSession: async (chatbotId, banId) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/${banId}/unban`);
    return response.data;
  },

  bulkUnbanSessions: async (chatbotId, banIds) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/bulk-unban`, {
      ban_ids: banIds,
    });
    return response.data;
  },

  // Get offer templates for user dashboard - Global/Universal
  getOfferTemplates: async () => {
    const response = await api.get(`/api/chatbot/offer-templates/user`);
    return response.data;
  },

  // Get user sessions (top chats) - Get from chatbot conversations
  getSessions: async (dateRange = '7days') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          sessions: [
            {
              session_id: 'session-1',
              messages: [
                { content: 'Hello, how can I help?', sender: 'bot', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { content: 'I need help with pricing', sender: 'user', timestamp: new Date(Date.now() - 3500000).toISOString() },
              ],
              duration: 1245,
            },
          ],
          avgDurationSeconds: 890,
        }
      };
    }
    
    try {
      // Get all chatbot accounts
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      
      const sessions = [];
      
      // Get conversations from all chatbots
      for (const chatbot of chatbotAccounts) {
        try {
          const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
            params: { page: 1, limit: 50 } // Get top 50 conversations
          });
          const conversations = convResponse.data?.conversations || [];
          
          conversations.forEach(conv => {
            if (conv.messages && conv.messages.length > 0) {
              // Calculate duration (time between first and last message)
              const firstMsg = conv.messages[0];
              const lastMsg = conv.messages[conv.messages.length - 1];
              const duration = new Date(lastMsg.timestamp) - new Date(firstMsg.timestamp);
              
              sessions.push({
                session_id: conv._id,
                messages: conv.messages.map(msg => ({
                  content: msg.content,
                  sender: msg.role === 'assistant' ? 'bot' : 'user',
                  timestamp: msg.timestamp,
                })),
                duration: Math.floor(duration / 1000), // Convert to seconds
              });
            }
          });
        } catch (err) {
          console.error(`Error fetching conversations for chatbot ${chatbot._id}:`, err);
        }
      }

      // Sort by duration (longest first) and take top 10
      sessions.sort((a, b) => b.duration - a.duration);
      const topSessions = sessions.slice(0, 10);
      
      // Calculate average duration
      const avgDurationSeconds = sessions.length > 0
        ? Math.floor(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length)
        : 0;

      return {
        success: true,
        data: {
          sessions: topSessions,
          avgDurationSeconds,
        }
      };
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return {
        success: true,
        data: {
          sessions: [],
          avgDurationSeconds: 0,
        }
      };
    }
  },

  // Get user analytics (chart data) - GET /api/analytics/overview (backend-worker)
  getAnalytics: async (dateRange = '7days') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      const mockChartData = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockChartData.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 100) + 50,
        });
      }
      return {
        success: true,
        data: {
          chartData: mockChartData,
          totalMessages: 1842,
          totalSessions: 624,
          avgDurationSeconds: 890,
          avgMessagesPerChat: 5,
        }
      };
    }
    try {
      // Calculate days from dateRange
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : dateRange === 'all' ? 365 : 7;
      
      // Get chatbot analytics from chatbot-specific endpoint (fetches from ChatbotConversation)
      const response = await api.get('/api/chatbot-accounts/analytics/overview', { params: { days } });
      const stats = response.data?.stats || {};
      
      // Use chart data from backend if available, otherwise create empty array
      let chartData = stats.chartData || [];
      const visitorsData = stats.visitorsData || [];
      
      // If no chart data, create empty array for the date range
      if (chartData.length === 0) {
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          chartData.push({
            date: date.toISOString().split('T')[0],
            count: 0,
          });
        }
      }

      return {
        success: true,
        data: {
          chartData,
          visitorsData,
          totalMessages: stats.totalMessages || 0,
          totalSessions: stats.totalConversations || stats.totalSessions || 0,
          avgDurationSeconds: 0, // Not available in ChatbotConversation model
          avgMessagesPerChat: stats.avgMessagesPerChat || (stats.totalMessages && stats.totalConversations 
            ? Math.round(stats.totalMessages / stats.totalConversations) 
            : 0),
        }
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return error response but with empty data to prevent UI breaking
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch analytics',
        data: {
          chartData: [],
          visitorsData: [],
          totalMessages: 0,
          totalSessions: 0,
          avgDurationSeconds: 0,
          avgMessagesPerChat: 0,
        }
      };
    }
  },

  // Get hot leads (users with buying intent keywords) - GET /api/chatbot-accounts/leads/all
  getHotLeads: async (params = {}) => {
    const { page = 1, limit = 20, searchTerm = '', dateRange = '30days', startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockLeads = [
        {
          id: 'session-1',
          session_id: 'session-1',
          phone: '+91 98765 43210',
          email: 'user1@example.com',
          name: 'Rajesh Kumar',
          matchedKeywords: ['pricing', 'quote', 'demo'],
          messageSnippets: [
            { content: 'Can you share the pricing details?', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { content: 'I would like to see a demo', timestamp: new Date(Date.now() - 3500000).toISOString() },
          ],
          hotWordCount: 3,
          firstDetectedAt: new Date(Date.now() - 86400000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'session-2',
          session_id: 'session-2',
          phone: '+91 98765 43211',
          email: 'user2@example.com',
          name: 'Priya Sharma',
          matchedKeywords: ['buy', 'order'],
          messageSnippets: [
            { content: 'I want to buy this product', timestamp: new Date(Date.now() - 7200000).toISOString() },
          ],
          hotWordCount: 2,
          firstDetectedAt: new Date(Date.now() - 172800000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      return {
        success: true,
        data: {
          leads: mockLeads,
          hotWords: ['pricing', 'price', 'cost', 'quote', 'demo', 'buy', 'purchase', 'order'],
          total: mockLeads.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    
    try {
      // Fetch all leads from all chatbot accounts
      const response = await api.get('/api/chatbot-accounts/leads/all');
      let leads = response.data?.leads || [];
      const hotWords = response.data?.hotWords || [];

      // Apply date filtering
      if (dateRange !== 'all') {
        const now = new Date();
        let startDateFilter = new Date();
        
        switch (dateRange) {
          case '7days':
            startDateFilter.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDateFilter.setDate(now.getDate() - 30);
            break;
          case '90days':
            startDateFilter.setDate(now.getDate() - 90);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateFilter = new Date(startDate);
              const endDateFilter = new Date(endDate);
              leads = leads.filter(lead => {
                const leadDate = new Date(lead.createdAt);
                return leadDate >= startDateFilter && leadDate <= endDateFilter;
              });
            }
            break;
        }
        
        if (dateRange !== 'custom') {
          leads = leads.filter(lead => new Date(lead.createdAt) >= startDateFilter);
        }
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        leads = leads.filter(lead => {
          const phone = (lead.exact_customerPhone || lead.customerPhone || '').toLowerCase();
          const name = (lead.customerName || '').toLowerCase();
          return phone.includes(searchLower) || name.includes(searchLower);
        });
      }

      // Transform leads to match frontend format
      const transformedLeads = leads.map(lead => ({
        id: lead._id,
        session_id: lead._id,
        phone: lead.exact_customerPhone || lead.customerPhone || '',
        email: '', // Not available in Lead model
        name: lead.customerName || 'Guest',
        matchedKeywords: lead.leadKeywords || [],
        messageSnippets: lead.messages?.slice(-5).map(msg => ({
          content: msg.content,
          timestamp: msg.timestamp
        })) || [],
        hotWordCount: lead.leadKeywords?.length || 0,
        firstDetectedAt: lead.createdAt,
        lastDetectedAt: lead.lastMessageAt || lead.updatedAt || lead.createdAt,
        lastMessage: lead.messages?.length > 0 ? lead.messages[lead.messages.length - 1].content : '',
        isContacted: lead.isContacted || false, // Include isContacted status from database
        messages: lead.messages || [], // Include full messages for chat view
      }));

      // Paginate
      const total = transformedLeads.length;
      const startIdx = (page - 1) * limit;
      const paginatedLeads = transformedLeads.slice(startIdx, startIdx + limit);

      return {
        success: true,
        data: {
          leads: paginatedLeads,
          hotWords,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      console.error('Error fetching hot leads:', error);
      throw error;
    }
  },

  // Mark a hot lead as contacted - PATCH /api/user/hot-leads/:session_id/contacted
  markHotLeadContacted: async (sessionId, isContacted, notes = '') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          success: true,
          lead: { session_id: sessionId, is_contacted: isContacted, notes }
        }
      };
    }
    const response = await api.patch(`/api/user/hot-leads/${sessionId}/contacted`, {
      is_contacted: isContacted,
      notes
    });
    return response.data;
  },

  // Update lead status and notes - PUT /api/chatbot-accounts/leads/:leadId
  updateLead: async (leadId, data) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        lead: { _id: leadId, ...data }
      };
    }
    const response = await api.put(`/api/chatbot-accounts/leads/${leadId}`, data);
    return response.data;
  },

  // Update follow-up status and notes - PUT /api/chatbot-accounts/followups/:followUpId
  updateFollowUp: async (followUpId, data) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        followUp: { _id: followUpId, ...data }
      };
    }
    const response = await api.put(`/api/chatbot-accounts/followups/${followUpId}`, data);
    return response.data;
  },

  // Get messages (chat history) - Aggregate from chatbot conversations
  getMessages: async (params = {}) => {
    const { page = 1, limit = 25, email, phone, session_id, is_guest, dateRange, startDate, endDate, search } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const contacts = [
        { id: 'guest-449', name: 'Guest 449', type: 'guest' },
        { id: 'guest-448', name: 'Guest 448', type: 'guest' },
        { id: 'guest-447', name: 'Guest 447', type: 'guest' },
      ];
      const mockMessages = [];
      const agentMsgs = [
        'The cost for WhatsApp marketing messages is **INR 0.60 per message**. Here are the current packages available:\n\n**Package 1:** 3 Lac Messages...',
        'The pricing for our WhatsApp marketing service is set at **₹0.60 per message**.',
      ];
      const userMsgs = ['What is the cost?', 'Pricing', 'Price?'];
      
      for (let i = 0; i < 50; i++) {
        const isAgent = i % 2 === 0;
        const contact = contacts[Math.floor(i / 2) % contacts.length];
        mockMessages.push({
          id: `msg-${i + 1}`,
          content: isAgent ? agentMsgs[i % agentMsgs.length] : userMsgs[i % userMsgs.length],
          sender: isAgent ? 'bot' : 'user',
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          session_id: `session-${Math.floor(i / 4)}`,
          email: null,
          phone: null,
          is_guest: true,
          name: contact.name,
        });
      }
      
      const total = mockMessages.length;
      const startIdx = (page - 1) * limit;
      const paginatedMessages = mockMessages.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          messages: paginatedMessages,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalMessages: total,
        }
      };
    }
    
    try {
      // Fetch all conversations with all messages from all chatbots (already filtered by userId via backend)
      const response = await api.get('/api/chatbot-accounts/conversations/all');
      
      if (!response.data) {
        console.warn('No data received from conversations endpoint');
        return {
          success: true,
          data: {
            messages: [],
            totalPages: 0,
            currentPage: page,
            totalMessages: 0,
          }
        };
      }
      
      const conversations = response.data?.conversations || [];
      
      // Log for debugging
      if (conversations.length > 0) {
        console.log(`Fetched ${conversations.length} conversations from database`);
      }

      // Extract all messages from all conversations
      let allMessages = [];
      
      conversations.forEach(conv => {
        if (conv.messages && Array.isArray(conv.messages)) {
          conv.messages.forEach((msg, idx) => {
            allMessages.push({
              id: `${conv._id}-${idx}`,
              content: msg.content,
              sender: msg.role === 'assistant' ? 'bot' : 'user',
              timestamp: msg.timestamp,
              session_id: conv._id.toString(),
              email: null,
              phone: conv.exact_customerPhone || conv.customerPhone || null,
              exact_customerPhone: conv.exact_customerPhone || null, // Store exact phone for contact display
              is_guest: !conv.exact_customerPhone && !conv.customerPhone,
              name: conv.customerName || null,
              contact_name: conv.customerName || null,
              conversation_createdAt: conv.createdAt, // Store conversation createdAt for date column
              ip_address: conv.ip_address || conv.customerIP || null, // IP address from conversation
              location: conv.location || conv.customerLocation || null, // Location from conversation
            });
          });
        }
      });

      // Apply filters
      if (phone) {
        allMessages = allMessages.filter(m => m.phone && m.phone.includes(phone));
      }
      if (session_id) {
        allMessages = allMessages.filter(m => m.session_id === session_id);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        allMessages = allMessages.filter(m => 
          m.content.toLowerCase().includes(searchLower) ||
          (m.name && m.name.toLowerCase().includes(searchLower)) ||
          (m.contact_name && m.contact_name.toLowerCase().includes(searchLower))
        );
      }

      // Apply date filtering
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDateFilter = new Date();
        
        switch (dateRange) {
          case '7days':
            startDateFilter.setDate(now.getDate() - 7);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case '30days':
            startDateFilter.setDate(now.getDate() - 30);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case '90days':
            startDateFilter.setDate(now.getDate() - 90);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateFilter = new Date(startDate);
              startDateFilter.setHours(0, 0, 0, 0);
              const endDateFilter = new Date(endDate);
              endDateFilter.setHours(23, 59, 59, 999);
              allMessages = allMessages.filter(m => {
                const msgDate = new Date(m.timestamp);
                return msgDate >= startDateFilter && msgDate <= endDateFilter;
              });
            }
            break;
        }
        
        if (dateRange !== 'custom') {
          allMessages = allMessages.filter(m => {
            const msgDate = new Date(m.timestamp);
            return msgDate >= startDateFilter;
          });
        }
      }

      // Sort by timestamp (newest first)
      allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Paginate
      const total = allMessages.length;
      const startIdx = (page - 1) * limit;
      const paginatedMessages = allMessages.slice(startIdx, startIdx + limit);

      return {
        success: true,
        data: {
          messages: paginatedMessages,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalMessages: total,
        }
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: true,
        data: {
          messages: [],
          totalPages: 0,
          currentPage: page,
          totalMessages: 0,
        }
      };
    }
  },

  // Get full chat history for a single identifier - Get from chatbot conversations
  getChatHistory: async (params = {}) => {
    const { session_id, phone, email } = params;

    if (DEMO_MODE) {
      await mockDelay(200);
      return { success: true, data: { messages: [], stats: { totalMessages: 0 } } };
    }

    try {
      // Get all chatbot accounts
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      
      let conversation = null;
      
      // Find conversation by session_id, phone, or email
      for (const chatbot of chatbotAccounts) {
        try {
          if (session_id) {
            // Get specific conversation by ID
            const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations/${session_id}`);
            if (convResponse.data?.conversation) {
              conversation = convResponse.data.conversation;
              break;
            }
          } else if (phone) {
            // Search conversations by phone
            const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
              params: { page: 1, limit: 100 }
            });
            const conversations = convResponse.data?.conversations || [];
            conversation = conversations.find(c => 
              c.exact_customerPhone === phone || c.customerPhone === phone || c.customerPhone?.includes(phone)
            );
            if (conversation) {
              // Get full conversation details
              const fullConvResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations/${conversation._id}`);
              conversation = fullConvResponse.data?.conversation;
              break;
            }
          }
        } catch (err) {
          // Continue searching other chatbots
          continue;
        }
      }

      if (!conversation || !conversation.messages) {
        return { success: true, data: { messages: [], stats: { totalMessages: 0 } } };
      }

      // Transform messages to match frontend format
      const messages = conversation.messages.map((msg, idx) => ({
        id: `${conversation._id}-${idx}`,
        content: msg.content,
        sender: msg.role === 'assistant' ? 'bot' : 'user',
        timestamp: msg.timestamp,
        session_id: conversation._id,
      }));

      return {
        success: true,
        data: {
          messages,
          stats: {
            totalMessages: messages.length,
          }
        }
      };
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return { success: true, data: { messages: [], stats: { totalMessages: 0 } } };
    }
  },

  // Get all contacts for filter dropdowns - Extract from chatbot conversations
  getAllContacts: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          contacts: ['+919876543210', '+919876543211', 'john@example.com'],
          guests: Array.from({ length: 50 }, (_, i) => ({
            session_id: `session-${i + 1}`,
            label: `Guest ${i + 1}`,
            number: i + 1,
          })),
        }
      };
    }
    
    try {
      // Fetch all conversations from all chatbots (already filtered by userId via backend)
      const response = await api.get('/api/chatbot-accounts/conversations/all');
      const conversations = response.data?.conversations || [];
      
      const contacts = new Set();
      const guests = [];
      let guestNumber = 1;

      // Collect contacts and guests from conversations
      conversations.forEach(conv => {
        if (conv.exact_customerPhone) {
          contacts.add(conv.exact_customerPhone);
        } else if (conv.customerPhone && !conv.customerPhone.includes('@')) {
          // Only add if it's not a WhatsApp ID with @ suffix
          contacts.add(conv.customerPhone);
        } else {
          // Guest session - no phone number
          guests.push({
            session_id: conv._id,
            label: conv.customerName || `Guest ${guestNumber}`,
            number: guestNumber++,
          });
        }
      });

      return {
        success: true,
        data: {
          contacts: Array.from(contacts),
          guests: guests,
        }
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return {
        success: true,
        data: {
          contacts: [],
          guests: [],
        }
      };
    }
  },

  // Get daily chat summaries - Fetch from chatsummaries collection
  getDailySummaries: async (params = {}) => {
    const { page = 1, limit = 30, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockSummaries = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockSummaries.push({
          _id: `summary-${i}`,
          date: date.toISOString(),
          summary: `On ${date.toLocaleDateString()}, users primarily discussed product pricing, feature inquiries, and support-related questions. There was significant interest in integration options and API documentation. Several users asked about subscription plans and payment methods.`,
          messageCount: Math.floor(Math.random() * 200) + 50,
          sessionCount: Math.floor(Math.random() * 30) + 10,
          topTopics: ['pricing', 'features', 'support', 'integration'].slice(0, Math.floor(Math.random() * 3) + 2),
        });
      }
      return {
        success: true,
        data: {
          summaries: mockSummaries,
          total: mockSummaries.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    
    try {
      // Fetch chat summaries from chatsummaries collection (already filtered by userId via backend)
      const response = await api.get('/api/chat-summaries', {
        params: { page, limit, startDate, endDate }
      });
      
      if (response.data?.success) {
        // Group summaries by date (multiple chatbots can have summaries for same date)
        const summariesByDate = new Map();
        
        (response.data.summaries || []).forEach(summary => {
          const dateKey = new Date(summary.summaryDate).toISOString().split('T')[0];
          
          if (!summariesByDate.has(dateKey)) {
            summariesByDate.set(dateKey, {
              _id: summary._id,
              date: dateKey,
              summary: summary.summary || '',
              messageCount: 0,
              sessionCount: 0,
              topTopics: [], // ChatSummary model doesn't have topTopics field
            });
          }
          
          const daySummary = summariesByDate.get(dateKey);
          // Aggregate totals across all chatbots for the same date
          daySummary.messageCount += summary.totalMessages || 0;
          daySummary.sessionCount += summary.totalSessions || 0;
          // Combine summaries if multiple chatbots
          if (summary.summary && daySummary.summary !== summary.summary) {
            daySummary.summary += (daySummary.summary ? ' ' : '') + summary.summary;
          }
        });
        
        // Convert to array and sort by date (newest first)
        const summaries = Array.from(summariesByDate.values())
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return {
          success: true,
          data: {
            summaries,
            total: response.data.total || response.data.count || summaries.length,
            currentPage: response.data.currentPage || page,
            totalPages: response.data.totalPages || Math.ceil((response.data.total || summaries.length) / limit),
          }
        };
      }
      
      return {
        success: true,
        data: {
          summaries: [],
          total: 0,
          currentPage: page,
          totalPages: 0,
        }
      };
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      // Return empty summaries on error to prevent breaking the UI
      return {
        success: true,
        data: {
          summaries: [],
          total: 0,
          currentPage: page,
          totalPages: 0,
        }
      };
    }
  },

  // Get credit summary - GET /api/user/credit-summary
  getCreditSummary: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          currentBalance: 95000,
          totalAllocated: 100000,
          totalUsed: 5000,
          usagePercentage: 5,
        }
      };
    }
    const response = await api.get('/api/user/credit-summary');
    return response.data;
  },

  // Get credit transactions - GET /api/user/credit-transactions
  getCreditTransactions: async (params = {}) => {
    const { page = 1, limit = 25, type, startDate, endDate, search } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const transactionTypes = ['message_deduction', 'admin_add', 'admin_remove', 'initial_allocation', 'renewal_bonus'];
      const mockTransactions = [];
      let balance = 95000;
      
      for (let i = 0; i < 50; i++) {
        const txType = i === 0 ? 'initial_allocation' : transactionTypes[Math.floor(Math.random() * 4)];
        let amount = txType === 'message_deduction' ? -2 : 
                     txType === 'admin_add' ? Math.floor(Math.random() * 10000) + 1000 :
                     txType === 'admin_remove' ? -(Math.floor(Math.random() * 5000) + 500) :
                     txType === 'renewal_bonus' ? 10000 :
                     100000;
        
        mockTransactions.push({
          _id: `tx-${i}`,
          type: txType,
          amount: amount,
          balance_after: balance,
          session_id: txType === 'message_deduction' ? `session-${Math.floor(Math.random() * 100)}` : null,
          reason: txType === 'message_deduction' ? 'Chat message exchange' :
                  txType === 'admin_add' ? 'Admin credited for support' :
                  txType === 'admin_remove' ? 'Adjustment by admin' :
                  txType === 'renewal_bonus' ? 'Monthly renewal bonus' :
                  'Initial subscription allocation',
          admin_id: ['admin_add', 'admin_remove'].includes(txType) ? { name: 'Admin User', email: 'admin@example.com' } : null,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
        balance -= amount;
      }
      
      const total = mockTransactions.length;
      const startIdx = (page - 1) * limit;
      const paginatedTransactions = mockTransactions.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          transactions: paginatedTransactions,
          total: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        }
      };
    }
    const response = await api.get('/api/user/credit-transactions', {
      params: { page, limit, type, startDate, endDate, search }
    });
    return response.data;
  },

  // Get email history - GET /api/chatbot-accounts/email-proposals/all
  getEmailHistory: async (params = {}) => {
    const { page = 1, limit = 25, chatbot_id, status, dateRange, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockEmails = [];
      const templates = ['Swaraa Ai Calling Agent', 'Ai Agent - Pricing Details', 'Product Information', 'Service Details'];
      const statuses = ['sent', 'failed'];
      
      for (let i = 0; i < 30; i++) {
        mockEmails.push({
          id: `email-${i}`,
          chatbot_id: 'chatbot-1',
          chatbot_name: 'My Chatbot',
          template_id: `template-${i % templates.length}`,
          template_name: templates[i % templates.length],
          recipient_email: `user${i}@example.com`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          error_message: Math.random() > 0.8 ? 'SMTP server error' : null,
          sent_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }
      
      const total = mockEmails.length;
      const startIdx = (page - 1) * limit;
      const paginatedEmails = mockEmails.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          emails: paginatedEmails,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalEmails: total,
        }
      };
    }
    
    try {
      // Fetch all email proposals from all chatbot accounts (already filtered by userId via backend)
      const response = await api.get('/api/chatbot-accounts/email-proposals/all');
      
      if (!response.data) {
        console.warn('No data received from email proposals endpoint');
        return {
          success: true,
          data: {
            emails: [],
            totalPages: 0,
            currentPage: page,
            totalEmails: 0,
          }
        };
      }
      
      let emailProposals = response.data?.emailProposals || [];
      
      // Log for debugging
      if (emailProposals.length > 0) {
        console.log(`Fetched ${emailProposals.length} email proposals from database`);
      }

      // Apply date filtering
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDateFilter = new Date();
        
        switch (dateRange) {
          case 'today':
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'week':
          case '7days':
            startDateFilter.setDate(now.getDate() - 7);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'month':
          case '30days':
            startDateFilter.setDate(now.getDate() - 30);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case '90days':
            startDateFilter.setDate(now.getDate() - 90);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateFilter = new Date(startDate);
              startDateFilter.setHours(0, 0, 0, 0);
              const endDateFilter = new Date(endDate);
              endDateFilter.setHours(23, 59, 59, 999);
              emailProposals = emailProposals.filter(e => {
                const eDate = new Date(e.createdAt);
                return eDate >= startDateFilter && eDate <= endDateFilter;
              });
            }
            break;
        }
        
        if (dateRange !== 'custom') {
          emailProposals = emailProposals.filter(e => {
            const eDate = new Date(e.createdAt);
            return eDate >= startDateFilter;
          });
        }
      }

      // Transform email proposals to match frontend format
      const transformedEmails = emailProposals.map(proposal => ({
        id: proposal._id,
        chatbot_id: proposal.chatbotAccountId,
        chatbot_name: 'Chatbot', // Would need to join with ChatbotAccount for name
        template_id: proposal._id,
        template_name: proposal.emailKeyword || 'Email Proposal',
        recipient_email: proposal.emailKeyword || '', // Email keyword contains the email
        status: 'sent', // EmailProposal model doesn't have status field
        error_message: null,
        sent_at: proposal.createdAt,
      }));

      // Paginate
      const total = transformedEmails.length;
      const startIdx = (page - 1) * limit;
      const paginatedEmails = transformedEmails.slice(startIdx, startIdx + limit);

      return {
        success: true,
        data: {
          emails: paginatedEmails,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalEmails: total,
        }
      };
    } catch (error) {
      console.error('Error fetching email history:', error);
      throw error;
    }
  },

  // Get WhatsApp proposal history - GET /api/chatbot-accounts/whatsapp-proposals/all
  getWhatsAppProposalHistory: async (params = {}) => {
    const { page = 1, limit = 25, chatbot_id, status, dateRange, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockProposals = [];
      const templates = ['AI Agent Proposal', 'Service Details', 'Product Information', 'Pricing Details'];
      const statuses = ['sent', 'failed'];
      
      for (let i = 0; i < 30; i++) {
        mockProposals.push({
          id: `proposal-${i}`,
          chatbot_id: 'chatbot-1',
          chatbot_name: 'My Chatbot',
          template_id: `template-${i % templates.length}`,
          template_name: templates[i % templates.length],
          recipient_phone: `+91${8261900000 + i}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          error_message: Math.random() > 0.8 ? 'WhatsApp API error' : null,
          message_id: Math.random() > 0.5 ? `msg-${i}` : null,
          sent_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }
      
      const total = mockProposals.length;
      const startIdx = (page - 1) * limit;
      const paginatedProposals = mockProposals.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          proposals: paginatedProposals,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalProposals: total,
        }
      };
    }
    
    try {
      // Fetch all WhatsApp proposals from all chatbot accounts (already filtered by userId via backend)
      const response = await api.get('/api/chatbot-accounts/whatsapp-proposals/all');
      
      if (!response.data) {
        console.warn('No data received from WhatsApp proposals endpoint');
        return {
          success: true,
          data: {
            proposals: [],
            totalPages: 0,
            currentPage: page,
            totalProposals: 0,
          }
        };
      }
      
      let proposals = response.data?.whatsappProposals || [];
      
      // Log for debugging
      if (proposals.length > 0) {
        console.log(`Fetched ${proposals.length} WhatsApp proposals from database`);
      }

      // Apply date filtering
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDateFilter = new Date();
        
        switch (dateRange) {
          case 'today':
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'week':
          case '7days':
            startDateFilter.setDate(now.getDate() - 7);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'month':
          case '30days':
            startDateFilter.setDate(now.getDate() - 30);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case '90days':
            startDateFilter.setDate(now.getDate() - 90);
            startDateFilter.setHours(0, 0, 0, 0);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateFilter = new Date(startDate);
              startDateFilter.setHours(0, 0, 0, 0);
              const endDateFilter = new Date(endDate);
              endDateFilter.setHours(23, 59, 59, 999);
              proposals = proposals.filter(p => {
                const pDate = new Date(p.createdAt);
                return pDate >= startDateFilter && pDate <= endDateFilter;
              });
            }
            break;
        }
        
        if (dateRange !== 'custom') {
          proposals = proposals.filter(p => {
            const pDate = new Date(p.createdAt);
            return pDate >= startDateFilter;
          });
        }
      }

      // Transform proposals to match frontend format
      const transformedProposals = proposals.map(proposal => ({
        id: proposal._id,
        chatbot_id: proposal.chatbotAccountId,
        chatbot_name: 'Chatbot', // Would need to join with ChatbotAccount for name
        template_id: proposal._id,
        template_name: proposal.whatsappKeyword || 'WhatsApp Proposal',
        recipient_phone: proposal.exact_customerPhone || proposal.customerPhone || '',
        status: 'sent', // WhatsAppProposal model doesn't have status field
        error_message: null,
        message_id: null,
        sent_at: proposal.createdAt,
      }));

      // Paginate
      const total = transformedProposals.length;
      const startIdx = (page - 1) * limit;
      const paginatedProposals = transformedProposals.slice(startIdx, startIdx + limit);

      return {
        success: true,
        data: {
          proposals: paginatedProposals,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalProposals: total,
        }
      };
    } catch (error) {
      console.error('Error fetching WhatsApp proposal history:', error);
      throw error;
    }
  },

  // Get follow-up leads (users who requested proposals, contact details, etc.) - GET /api/chatbot-accounts/followups/all
  getFollowUpLeads: async (params = {}) => {
    const { page = 1, limit = 20, searchTerm = '', dateRange = '30days', startDate, endDate, showContacted = 'all' } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockLeads = [
        {
          id: 'session-fu-1',
          session_id: 'session-fu-1',
          phone: '+91 98765 43210',
          email: 'lead1@example.com',
          name: 'Amit Patel',
          matchedKeywords: ['send proposal', 'schedule meeting'],
          messageSnippets: [
            { content: 'Can you send me a proposal for the enterprise plan?', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { content: 'I would like to schedule a meeting with your team', timestamp: new Date(Date.now() - 3500000).toISOString() },
          ],
          matchCount: 2,
          firstDetectedAt: new Date(Date.now() - 86400000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 3600000).toISOString(),
          isContacted: false,
          contactedAt: null,
          notes: '',
        },
        {
          id: 'session-fu-2',
          session_id: 'session-fu-2',
          phone: '+91 98765 43211',
          email: 'lead2@example.com',
          name: 'Sneha Gupta',
          matchedKeywords: ['call me', 'contact details'],
          messageSnippets: [
            { content: 'Please call me to discuss further', timestamp: new Date(Date.now() - 7200000).toISOString() },
          ],
          matchCount: 2,
          firstDetectedAt: new Date(Date.now() - 172800000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 7200000).toISOString(),
          isContacted: true,
          contactedAt: new Date(Date.now() - 3600000).toISOString(),
          notes: 'Called and discussed requirements',
        },
      ];
      return {
        success: true,
        data: {
          leads: mockLeads,
          keywords: ['send proposal', 'contact details', 'call me', 'schedule meeting', 'lets connect'],
          total: mockLeads.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    
    try {
      // Fetch all follow-ups from all chatbot accounts
      const response = await api.get('/api/chatbot-accounts/followups/all');
      let followUps = response.data?.followUps || [];
      const keywords = response.data?.keywords || [];

      // Apply date filtering
      if (dateRange !== 'all') {
        const now = new Date();
        let startDateFilter = new Date();
        
        switch (dateRange) {
          case '7days':
            startDateFilter.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDateFilter.setDate(now.getDate() - 30);
            break;
          case '90days':
            startDateFilter.setDate(now.getDate() - 90);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateFilter = new Date(startDate);
              const endDateFilter = new Date(endDate);
              followUps = followUps.filter(fu => {
                const fuDate = new Date(fu.createdAt);
                return fuDate >= startDateFilter && fuDate <= endDateFilter;
              });
            }
            break;
        }
        
        if (dateRange !== 'custom') {
          followUps = followUps.filter(fu => new Date(fu.createdAt) >= startDateFilter);
        }
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        followUps = followUps.filter(fu => {
          const phone = (fu.exact_customerPhone || fu.customerPhone || '').toLowerCase();
          const name = (fu.customerName || '').toLowerCase();
          return phone.includes(searchLower) || name.includes(searchLower);
        });
      }

      // Transform follow-ups to match frontend format
      const transformedLeads = followUps.map(fu => ({
        id: fu._id,
        session_id: fu._id,
        phone: fu.exact_customerPhone || fu.customerPhone || '',
        email: '', // Not available in FollowUp model
        name: fu.customerName || 'Guest',
        matchedKeywords: fu.followUpKeywords || [],
        messageSnippets: fu.messages?.slice(-5).map(msg => ({
          content: msg.content,
          timestamp: msg.timestamp
        })) || [],
        matchCount: fu.followUpKeywords?.length || 0,
        firstDetectedAt: fu.createdAt,
        lastDetectedAt: fu.lastMessageAt || fu.updatedAt || fu.createdAt,
        isContacted: fu.isContacted || false, // Include isContacted status from database
        contactedAt: fu.contactedAt || null,
        notes: fu.notes || '', // Include notes from database
        messages: fu.messages || [], // Include full messages for chat view
        lastMessage: fu.messages?.length > 0 ? fu.messages[fu.messages.length - 1].content : '',
      }));

      // Paginate
      const total = transformedLeads.length;
      const startIdx = (page - 1) * limit;
      const paginatedLeads = transformedLeads.slice(startIdx, startIdx + limit);

      return {
        success: true,
        data: {
          leads: paginatedLeads,
          keywords,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      console.error('Error fetching follow-up leads:', error);
      throw error;
    }
  },

  // Mark a follow-up lead as contacted - PATCH /api/user/follow-up-leads/:session_id/contacted
  markFollowUpContacted: async (sessionId, isContacted, notes = '') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          success: true,
          lead: { session_id: sessionId, is_contacted: isContacted, notes }
        }
      };
    }
    const response = await api.patch(`/api/user/follow-up-leads/${sessionId}/contacted`, {
      is_contacted: isContacted,
      notes
    });
    return response.data;
  },

  // Profanity Management APIs
  getProfanityConfig: async (chatbotId) => {
    const response = await api.get(`/api/chatbot/${chatbotId}/profanity-config`);
    return response.data;
  },

  updateProfanityConfig: async (chatbotId, enabled, customKeywords, showInUserDashboard) => {
    const response = await api.put(`/api/chatbot/${chatbotId}/profanity-config`, {
      enabled,
      custom_keywords: customKeywords,
      show_in_user_dashboard: showInUserDashboard,
    });
    return response.data;
  },

  getBannedSessions: async (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const response = await api.get(`/api/chatbot/${chatbotId}/banned-sessions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  unbanSession: async (chatbotId, banId) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/${banId}/unban`);
    return response.data;
  },

  bulkUnbanSessions: async (chatbotId, banIds) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/bulk-unban`, {
      ban_ids: banIds,
    });
    return response.data;
  },

  // Get offer templates for user dashboard - Global/Universal
  getOfferTemplates: async () => {
    const response = await api.get(`/api/chatbot/offer-templates/user`);
    return response.data;
  },
};

// Call APIs
export const callAPI = {
  // Make outbound call
  makeCall: async (phoneNumber, customParameters = {}) => {
    const response = await api.post('/api/v1/calls/outbound', {
      phoneNumber,
      customParameters,
    });
    return response.data;
  },

  // Get call details
  getCall: async (callSid) => {
    const response = await api.get(`/api/v1/calls/${callSid}`);
    return response.data;
  },

  // Get call history
  getHistory: async (phoneNumber, limit = 10) => {
    const response = await api.get(`/api/v1/calls/history/${phoneNumber}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get call statistics
  getStats: async () => {
    const response = await api.get('/api/v1/calls/outbound/stats');
    return response.data;
  },

  // Get all calls with pagination and filters
  // Using analytics/calls/logs endpoint which returns actual call logs
  getAllCalls: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      const now = Date.now();
      let mockCalls = Array.from({ length: 50 }).map((_, i) => {
        // Generate random hour between 9 AM and 4 PM for direction chart
        const hour = 9 + (i % 8);
        const startTime = new Date(now - i * 3600000);
        startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Generate transcript array for completed calls
        const hasTranscript = i % 3 === 0;
        const transcript = hasTranscript ? [
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Hello! Thank you for calling. How can I assist you today?',
            content: 'Hello! Thank you for calling. How can I assist you today?',
            timestamp: new Date(startTime.getTime() + 2000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'Hi, I wanted to know about your services.',
            content: 'Hi, I wanted to know about your services.',
            timestamp: new Date(startTime.getTime() + 5000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            content: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            timestamp: new Date(startTime.getTime() + 8000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'That sounds great. Can you send me more information?',
            content: 'That sounds great. Can you send me more information?',
            timestamp: new Date(startTime.getTime() + 12000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            content: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            timestamp: new Date(startTime.getTime() + 15000).toISOString(),
          },
        ] : null;

        return {
          _id: `call-${i + 1}`,
          callSid: `CA${Date.now()}${i}`,
          sessionId: `CA${Date.now()}${i}`,
          exotelCallSid: `CA${Date.now()}${i}`,
          fromPhone: `+91${9876543210 + i}`,
          toPhone: `+91${9876543210 + i + 1000}`,
          status: ['completed', 'failed', 'no-answer', 'busy', 'in-progress', 'initiated'][i % 6],
          duration: Math.floor(Math.random() * 300) + 30,
          durationSec: Math.floor(Math.random() * 300) + 30,
          cost: (Math.random() * 2 + 0.5).toFixed(2),
          createdAt: new Date(now - i * 3600000).toISOString(),
          startedAt: startTime.toISOString(),
          startTime: startTime.toISOString(),
          endedAt: i % 3 === 0 ? new Date(startTime.getTime() + (Math.floor(Math.random() * 300) + 30) * 1000).toISOString() : null,
          direction: i % 2 === 0 ? 'outbound' : 'inbound',
          campaignName: ['Diwali Warm Leads', 'Payment Reminder', 'Premium Upsell'][i % 3],
          agentName: `Agent ${(i % 5) + 1}`,
          recordingUrl: hasTranscript ? `https://example.com/recording-${i}.mp3` : null,
          transcript: transcript,
          creditsConsumed: Math.floor(Math.random() * 300) + 30,
        };
      });

      // Apply filters
      if (params.status) {
        mockCalls = mockCalls.filter(call => call.status === params.status);
      }
      if (params.direction) {
        mockCalls = mockCalls.filter(call => call.direction === params.direction);
      }
      if (params.phoneNumbers && Array.isArray(params.phoneNumbers) && params.phoneNumbers.length > 0) {
        mockCalls = mockCalls.filter(call => {
          const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
          return params.phoneNumbers.includes(phone);
        });
      }
      if (params.startDate) {
        const startDate = new Date(params.startDate);
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate >= startDate;
        });
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate <= endDate;
        });
      }

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const total = mockCalls.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCalls = mockCalls.slice(startIndex, endIndex);

      return {
        data: {
          calls: paginatedCalls,
          total: total,
          page: page,
          limit: limit,
          pages: Math.ceil(total / limit),
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit),
          }
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/logs', { params });
    return response.data;
  },

  // Get retriable calls (failed calls excluding voicemail)
  getRetriableCalls: async (userId, options = {}) => {
    const params = { userId, ...options };
    const response = await api.get('/api/v1/calls/retriable', { params });
    return response.data;
  },

  // Get voicemail statistics
  getVoicemailStats: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/calls/voicemail-stats', { params });
    return response.data;
  },

  // Get voicemail analysis for specific call
  getVoicemailAnalysis: async (callLogId) => {
    const response = await api.get(`/api/v1/calls/${callLogId}/voicemail-analysis`);
    return response.data;
  },

  // Mark voicemail detection as false positive
  markFalsePositive: async (callLogId, isFalsePositive) => {
    const response = await api.post(`/api/v1/calls/${callLogId}/mark-false-positive`, {
      isFalsePositive,
    });
    return response.data;
  },
};

// WebSocket/System Stats API
export const wsAPI = {
  getStats: async () => {
    // Always check DEMO_MODE first to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        activeCalls: 12,
        totalConnections: 45,
        queueLength: 8,
        uptime: 3600 * 24, // 24 hours
      };
    }
    const response = await api.get('/api/v1/stats');
    return response.data;
  },
};

// Knowledge Base APIs
export const knowledgeBaseAPI = {
  search: async (query, limit = 5, category = null) => {
    const response = await api.get('/api/v1/knowledge-base/search', {
      params: { query, limit, category },
    });
    return response.data;
  },

  list: async (params = {}) => {
    const response = await api.get('/api/v1/knowledge-base/list', { params });
    return response.data;
  },

  add: async (title, content, category = 'general', metadata = {}) => {
    const response = await api.post('/api/v1/knowledge-base/add', {
      title,
      content,
      category,
      metadata,
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/v1/knowledge-base/${id}`);
    return response.data;
  },
};

// Agent APIs
export const agentAPI = {
  // Get all agents
  list: async (params = {}) => {
    const response = await api.get('/api/v1/agents', { params });
    return response.data;
  },

  // Get agent by ID
  get: async (agentId) => {
    const response = await api.get(`/api/v1/agents/${agentId}`);
    return response.data;
  },
};

// Campaign APIs
export const campaignAPI = {
  create: async (name, agentId, phoneId, concurrentCalls = 2) => {
    const response = await api.post('/api/v1/campaigns', {
      name,
      agentId,
      phoneId,
      settings: {
        concurrentCallsLimit: concurrentCalls,
      },
    });
    return response.data;
  },

  addContacts: async (campaignId, phoneNumbers) => {
    // Convert phone numbers array to contacts format
    const contacts = phoneNumbers.map(phoneNumber => ({
      phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
      name: '',
      metadata: {}
    }));

    const response = await api.post(`/api/v1/campaigns/${campaignId}/contacts`, {
      contacts
    });
    return response.data;
  },

  start: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/start`);
    return response.data;
  },

  pause: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/pause`);
    return response.data;
  },

  resume: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/resume`);
    return response.data;
  },

  cancel: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/cancel`);
    return response.data;
  },

  update: async (campaignId, updates) => {
    const response = await api.patch(`/api/v1/campaigns/${campaignId}`, updates);
    return response.data;
  },

  list: async (params = {}) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      return {
        data: [
          {
            _id: 'campaign-1',
            name: 'Diwali Warm Leads',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            liveStats: {
              processed: 450,
              totalNumbers: 1000,
              remaining: 550,
              activeCalls: 5,
              queueLength: 12,
              completed: 420,
              failed: 30,
            }
          },
          {
            _id: 'campaign-2',
            name: 'Payment Reminder Batch',
            status: 'paused',
            agentId: 'agent-2',
            phoneId: 'phone-2',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            liveStats: {
              processed: 210,
              totalNumbers: 500,
              remaining: 290,
              activeCalls: 0,
              queueLength: 0,
              completed: 200,
              failed: 10,
            }
          },
          {
            _id: 'campaign-3',
            name: 'Premium Upsell List',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            liveStats: {
              processed: 145,
              totalNumbers: 300,
              remaining: 155,
              activeCalls: 3,
              queueLength: 8,
              completed: 140,
              failed: 5,
            }
          },
        ]
      };
    }
    const response = await api.get('/api/v1/campaigns', { params });
    return response.data;
  },

  get: async (campaignId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      // Return mock campaign data based on campaignId
      const mockCampaigns = {
        'campaign-1': {
          _id: 'campaign-1',
          name: 'Diwali Warm Leads',
          status: 'active',
          agentId: 'agent-1',
          phoneId: { number: '+91-9876543210' },
          userId: { name: 'John Doe', email: 'john@example.com' },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          phoneNumbers: ['+919876543210', '+919876543211', '+919876543212'],
          stats: { completed: 320, failed: 30 },
          completedCalls: 320,
          failedCalls: 30,
          totalCalls: 350,
        },
        'campaign-2': {
          _id: 'campaign-2',
          name: 'Payment Reminder Batch',
          status: 'paused',
          agentId: 'agent-2',
          phoneId: { number: '+91-9876543211' },
          userId: { name: 'Jane Smith', email: 'jane@example.com' },
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          phoneNumbers: ['+919876543220', '+919876543221'],
          stats: { completed: 210, failed: 20 },
          completedCalls: 210,
          failedCalls: 20,
          totalCalls: 230,
        },
        'campaign-3': {
          _id: 'campaign-3',
          name: 'Premium Upsell List',
          status: 'active',
          agentId: 'agent-3',
          phoneId: { number: '+91-9876543212' },
          userId: { name: 'Bob Wilson', email: 'bob@example.com' },
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          phoneNumbers: ['+919876543230', '+919876543231', '+919876543232', '+919876543233'],
          stats: { completed: 145, failed: 15 },
          completedCalls: 145,
          failedCalls: 15,
          totalCalls: 160,
        },
      };
      
      const campaign = mockCampaigns[campaignId] || {
        _id: campaignId,
        name: 'Campaign ' + campaignId,
        status: 'active',
        agentId: 'agent-1',
        phoneId: { number: '+91-9876543210' },
        userId: { name: 'Demo User', email: 'demo@example.com' },
        createdAt: new Date().toISOString(),
        phoneNumbers: [],
        stats: { completed: 0, failed: 0 },
        completedCalls: 0,
        failedCalls: 0,
        totalCalls: 0,
      };
      
      return { data: campaign };
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}`);
    return response.data;
  },
};

// Analytics APIs
export const analyticsAPI = {
  // Get comprehensive dashboard analytics
  getDashboard: async (userId, timeRange = null) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      // Generate time labels for the day
      const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
      const callValues = [42, 58, 75, 88, 132, 164, 172, 160, 140, 118];
      
      return {
        data: {
          totalCalls: 1842,
          completedCalls: 1423,
          failedCalls: 219,
          inProgressCalls: 18,
          successRate: 77.3,
          averageDuration: 96,
          totalDuration: 176832,
          // Format for charts - array of { time, calls } objects
          callTrends: hours.map((time, i) => ({
            time,
            calls: callValues[i] || 0
          })),
          callsOverTime: {
            labels: hours,
            data: callValues
          },
          byStatus: {
            completed: 1423,
            failed: 219,
            'no-answer': 120,
            busy: 80,
          },
          byDirection: {
            inbound: 624,
            outbound: 1218,
          },
        }
      };
    }
    // Only make real API call if DEMO_MODE is false
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/dashboard', { params });
    return response.data;
  },

  // Get call analytics
  getCalls: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/calls', { params });
    return response.data;
  },

  // Get retry analytics
  getRetry: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/retry', { params });
    return response.data;
  },

  // Get scheduling analytics
  getScheduling: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/scheduling', { params });
    return response.data;
  },

  // Get voicemail analytics
  getVoicemail: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/voicemail', { params });
    return response.data;
  },

  // Get performance metrics
  getPerformance: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/performance', { params });
    return response.data;
  },

  // Get cost analytics
  getCost: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/cost', { params });
    return response.data;
  },

  // Get time-series trends
  getTrends: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/trends', { params });
    return response.data;
  },
};

// Credits APIs
export const creditsAPI = {
  // Get credit balance for a user (uses /auth/me to get own credits without admin privileges)
  getBalance: async () => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        success: true,
        data: {
          credits: 5420
        }
      };
    }
    // For regular users, get credits from their own profile via /auth/me
    // This avoids the admin-only /users/:id/credits endpoint
    const response = await api.get('/api/v1/auth/me');
    return {
      success: true,
      data: {
        credits: response.data.data.user.credits || 0
      }
    };
  },

  // Get credit transaction history for the current user (uses /auth/me/credits/transactions)
  getTransactions: async (options = {}) => {
    if (DEMO_MODE) {
      await mockDelay(250);
      const mockTransactions = Array.from({ length: 30 }).map((_, i) => ({
        _id: `txn-${i + 1}`,
        type: i % 3 === 0 ? 'addition' : 'deduction',
        amount: i % 3 === 0 ? 1000 : -(Math.floor(Math.random() * 200) + 50),
        balance: 5420 - (i * 50),
        reason: i % 3 === 0 ? 'admin_topup' : ['call_completed', 'call_failed', 'voicemail'][i % 3],
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        metadata: i % 3 !== 0 ? {
          durationSec: Math.floor(Math.random() * 300) + 30,
          callSid: `CA${Date.now()}${i}`,
        } : null,
      }));
      return {
        data: {
          transactions: mockTransactions,
          total: 30,
        }
      };
    }
    // For regular users, get their own transactions via /auth/me/credits/transactions
    // This avoids the admin-only /users/:id/credits/transactions endpoint
    const params = {
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
    if (options.startDate) {
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      params.endDate = options.endDate;
    }
    const response = await api.get('/api/v1/auth/me/credits/transactions', { params });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Handoff APIs (live chat takeover)
export const handoffAPI = {
  // Get active handoff sessions
  getActiveHandoffs: async (params = {}) => {
    const response = await api.get('/api/handoff/active', { params });
    return response.data;
  },

  // Send a message from agent to user
  sendMessage: async (sessionId, message, agentId = null) => {
    const response = await api.post('/api/handoff/send-message', {
      sessionId,
      message,
      agentId,
    });
    return response.data;
  },

  // Approve a pending handoff session
  approve: async (sessionId, agentId = null) => {
    const response = await api.post('/api/handoff/approve', {
      sessionId,
      agentId,
    });
    return response.data;
  },

  // Resolve/close a handoff session
  resolve: async (sessionId) => {
    const response = await api.post('/api/handoff/resolve', { sessionId });
    return response.data;
  },
};

// Translation APIs
export const translateAPI = {
  // Get supported languages
  getLanguages: async () => {
    const response = await api.get('/api/translate/languages');
    return response.data;
  },

  // Translate transcript
  translateTranscript: async (transcript, targetLanguage) => {
    const response = await api.post('/api/translate/transcript', {
      transcript,
      targetLanguage,
    });
    return response.data;
  },

  // Translate text array
  translateTexts: async (texts, targetLanguage, sourceLanguage = null) => {
    const body = {
      texts,
      targetLanguage,
    };
    if (sourceLanguage) {
      body.sourceLanguage = sourceLanguage;
    }
    const response = await api.post('/api/translate/text', body);
    return response.data;
  },

  // ==================== WHATSAPP ACCOUNTS ====================
  // Get all WhatsApp accounts - GET /api/accounts
  getWhatsAppAccounts: async () => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return {
        success: true,
        data: {
          accounts: [
            {
              _id: 'demo-1',
              accountName: 'Demo Account 1',
              phoneNumber: '919876543210',
              isConnected: true,
              lastLoginAt: new Date().toISOString(),
              browserType: 'chrome',
              browserInfo: 'WaSender / Chrome / 120.0.0',
            },
            {
              _id: 'demo-2',
              accountName: 'Demo Account 2',
              phoneNumber: '919876543211',
              isConnected: false,
              lastLoginAt: null,
              browserType: null,
              browserInfo: null,
            },
          ],
        }
      };
    }

    try {
      const response = await api.get('/api/accounts');
      return {
        success: true,
        data: {
          accounts: response.data?.accounts || [],
        }
      };
    } catch (error) {
      console.error('Error fetching WhatsApp accounts:', error);
      throw error;
    }
  },

  // Create WhatsApp account - POST /api/accounts
  createWhatsAppAccount: async (accountName, phoneNumber) => {
    if (DEMO_MODE) {
      await mockDelay(500);
      return {
        success: true,
        data: {
          account: {
            _id: `demo-${Date.now()}`,
            accountName,
            phoneNumber,
            isConnected: false,
            sessionId: `session-${Date.now()}`,
          }
        }
      };
    }

    try {
      // Validate inputs
      if (!accountName || !accountName.trim()) {
        throw new Error('Account name is required');
      }
      if (!phoneNumber || !phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }

      // Validate phone number format (should be digits only, no spaces or +)
      const cleanPhone = phoneNumber.trim().replace(/[\s+\-()]/g, '');
      if (!/^\d+$/.test(cleanPhone)) {
        throw new Error('Phone number must contain only digits (e.g., 919876543210)');
      }
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error('Phone number must be between 10 and 15 digits');
      }

      const response = await api.post('/api/accounts', {
        accountName: accountName.trim(),
        phoneNumber: cleanPhone,
      });

      if (response.data?.success) {
        return {
          success: true,
          data: {
            account: response.data?.account,
          }
        };
      } else {
        // Backend returned success: false or error
        throw new Error(response.data?.error || response.data?.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating WhatsApp account:', error);
      // If it's already an Error object with message, throw it as-is
      if (error.response?.data) {
        const errorMsg = error.response.data.error || error.response.data.message || error.message || 'Failed to create account';
        const customError = new Error(errorMsg);
        customError.response = error.response;
        throw customError;
      }
      throw error;
    }
  },

  // Delete WhatsApp account - DELETE /api/accounts/:id
  deleteWhatsAppAccount: async (accountId) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return { success: true };
    }

    try {
      await api.delete(`/api/accounts/${accountId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting WhatsApp account:', error);
      throw error;
    }
  },

  // Initialize WhatsApp connection - POST /api/whatsapp/init/:id
  initWhatsApp: async (accountId, options = {}) => {
    const { usePairingCode = false, phoneNumber, browserType = 'chrome', useTor = false, torCountryCode } = options;

    if (DEMO_MODE) {
      await mockDelay(1000);
      if (usePairingCode) {
        return {
          success: true,
          data: {
            needsQR: false,
            needsPairing: true,
            pairingCode: 'DEMO-1234-5678',
          }
        };
      }
      return {
        success: true,
        data: {
          needsQR: true,
          qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2RkZCIvPjwvc3ZnPg==',
        }
      };
    }

    try {
      const response = await api.post(`/api/whatsapp/init/${accountId}`, {
        usePairingCode,
        phoneNumber,
        browserType,
        useTor,
        torCountryCode,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      throw error;
    }
  },

  // Get WhatsApp status - GET /api/whatsapp/status/:id
  getWhatsAppStatus: async (accountId) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return {
        success: true,
        data: {
          isConnected: false,
          status: 'disconnected',
        }
      };
    }

    try {
      const response = await api.get(`/api/whatsapp/status/${accountId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      throw error;
    }
  },

  // Disconnect WhatsApp - POST /api/whatsapp/disconnect/:id
  disconnectWhatsApp: async (accountId) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return { success: true };
    }

    try {
      await api.post(`/api/whatsapp/disconnect/${accountId}`);
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      throw error;
    }
  },

  // Get Tor countries - GET /api/whatsapp/tor-countries
  getTorCountries: async () => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return {
        success: true,
        data: {
          countries: [
            { code: 'US', name: 'United States', flag: '🇺🇸' },
            { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
            { code: 'DE', name: 'Germany', flag: '🇩🇪' },
          ],
        }
      };
    }

    try {
      const response = await api.get('/api/whatsapp/tor-countries');
      return {
        success: true,
        data: {
          countries: response.data?.countries || [],
        }
      };
    } catch (error) {
      console.error('Error fetching Tor countries:', error);
      throw error;
    }
  },

  // Get IP address - POST /api/whatsapp/get-ip/:id
  getWhatsAppIP: async (accountId, useTor = false) => {
    if (DEMO_MODE) {
      await mockDelay(500);
      return {
        success: true,
        data: {
          ip: useTor ? '123.45.67.89' : '192.168.1.1',
        }
      };
    }

    try {
      const response = await api.post(`/api/whatsapp/get-ip/${accountId}`, {
        useTor,
      });
      return {
        success: true,
        data: {
          ip: response.data?.ip || 'Unknown',
        }
      };
    } catch (error) {
      console.error('Error fetching IP address:', error);
      throw error;
    }
  },
};

export default api;

