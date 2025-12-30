import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaCoins,
  FaComments,
  FaUsers,
  FaClock,
  FaTimes,
  FaUser,
  FaRobot
} from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { authAPI } from '../services/api';
import api from '../services/api';
import { DEMO_MODE } from '../config/api.config';
import TranslationComponent from './TranslationComponent';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState(null);
  const [topChats, setTopChats] = useState([]);
  const [topChatsLoading, setTopChatsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState(null);
  const [chatsChartData, setChatsChartData] = useState([]);
  const [visitorsChartData, setVisitorsChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchTopChats();
    fetchChartData();
    // Auto-refresh disabled
    // const interval = setInterval(fetchDashboardData, 30000);
    // return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch usage and plan data from chatbot backend
      const results = await Promise.allSettled([
        // GET /api/user/usage - Returns { total_messages, unique_users, last_activity }
        authAPI.getUserUsage().catch(err => {

          return null;
        }),
        // GET /api/user/plan - Returns plan info with expiry date
        authAPI.getUserPlan().catch(err => {

          return null;
        }),
      ]);

      // Set usage data
      if (results[0].status === 'fulfilled' && results[0].value) {

        setUsageData(results[0].value.data);
      } else {

      }

      // Set plan data
      if (results[1].status === 'fulfilled' && results[1].value) {

        setPlanData(results[1].value.data);
      } else {

      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('timeout')) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend server is running.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Internal server error';
        setError(`Server error: ${errorMsg}`);
      } else {
        const errorData = err.response?.data?.error;
        const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message || err.message || 'Failed to load dashboard data';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from usage and plan data
  const calculateKPIs = () => {
    // Get data from usage API - fetched from backend chatbot conversations
    const totalChats = usageData?.total_messages || 0; // Total messages across all conversations
    const totalVisitors = usageData?.unique_users || 0; // Unique phone numbers (customers)
    const totalChatbots = usageData?.total_chatbots || 0; // Number of chatbot accounts

    // Calculate change percentages (demo mode shows realistic changes)
    // In real mode, these would come from API comparison data
    const chatsChange = totalChats > 0 ? '+12.5%' : '+0%';
    const visitorsChange = totalVisitors > 0 ? '+8.3%' : '+0%';

    return [
      {
        title: 'Total Chats',
        value: totalChats.toLocaleString(), // Total messages from all chatbot conversations
        change: chatsChange,
        trend: 'up',
        icon: FaComments,
        color: 'bg-purple-500',
      },
      {
        title: 'Total Visitors',
        value: totalVisitors.toLocaleString(), // Unique customers (phone numbers) from conversations
        change: visitorsChange,
        trend: 'up',
        icon: FaUsers,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Chatbot',
        value: totalChatbots.toString(), // Number of chatbot accounts
        change: 'Active',
        trend: 'up',
        icon: FaClock,
        color: 'bg-indigo-500',
      },
      {
        title: 'Credit Balance',
        value: '10000', // Static value as requested
        change: 'Active',
        trend: 'up',
        icon: FaCoins,
        color: 'bg-green-500',
      },
    ];
  };

  // Fetch chart data for last 7 days - Chats per Day and Visitors per Day from conversations
  const fetchChartData = async () => {
    if (DEMO_MODE) {
      // Generate last 7 days with dates in "28 Nov" format
      const mockChartData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const dateLabel = `${day} ${month}`;
        
        // Fixed mock data values
        const chatsValues = [245, 198, 267, 223, 289, 156, 178];
        const visitorsValues = [82, 71, 95, 88, 102, 64, 69];
        const index = 6 - i;
        
        mockChartData.push({
          date: dateLabel,
          chats: chatsValues[index],
          visitors: visitorsValues[index],
        });
      }
      
      setChatsChartData(mockChartData);
      setVisitorsChartData(mockChartData);
      return;
    }
    
    try {
      // Get all chatbot accounts
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      
      // Initialize date map for last 7 days
      const dateMap = new Map();
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0]; // "2025-12-29"
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        dateMap.set(dateKey, {
          date: `${day} ${month}`,
          chats: 0,
          visitors: 0,
        });
      }

      // Collect conversations from all chatbots
      const dailyChats = new Map(); // date -> message count
      const dailyVisitors = new Map(); // date -> Set of unique phones
      
      for (const chatbot of chatbotAccounts) {
        try {
          let page = 1;
          let hasMore = true;
          
          while (hasMore && page <= 10) {
            const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
              params: { page, limit: 100 }
            });
            
            const conversations = convResponse.data?.conversations || [];
            const pagination = convResponse.data?.pagination || {};
            
            conversations.forEach(conv => {
              // Get date from lastMessageAt or updatedAt
              const messageDate = conv.lastMessageAt || conv.updatedAt || conv.createdAt;
              if (!messageDate) return;
              
              const date = new Date(messageDate);
              const dateKey = date.toISOString().split('T')[0];
              
              // Only count if within last 7 days
              if (dateMap.has(dateKey)) {
                // Count messages (chats) for this date
                const messageCount = conv.messageCount || 0;
                dailyChats.set(dateKey, (dailyChats.get(dateKey) || 0) + messageCount);
                
                // Count unique visitors for this date
                const phone = conv.exact_customerPhone || conv.customerPhone;
                if (phone) {
                  if (!dailyVisitors.has(dateKey)) {
                    dailyVisitors.set(dateKey, new Set());
                  }
                  dailyVisitors.get(dateKey).add(phone);
                }
              }
            });
            
            hasMore = page < (pagination.totalPages || 0);
            page++;
          }
        } catch (err) {
          console.error(`Error fetching conversations for chart data from chatbot ${chatbot._id}:`, err);
        }
      }

      // Fill in the date map with actual data
      dateMap.forEach((value, dateKey) => {
        value.chats = dailyChats.get(dateKey) || 0;
        value.visitors = dailyVisitors.has(dateKey) ? dailyVisitors.get(dateKey).size : 0;
      });

      // Convert map to array maintaining order
      const chartData = Array.from(dateMap.values());
      
      setChatsChartData(chartData);
      setVisitorsChartData(chartData);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setChatsChartData([]);
      setVisitorsChartData([]);
    }
  };

  // Fetch top chats data - Top 4 visitors with most messages
  const fetchTopChats = async () => {
    try {
      setTopChatsLoading(true);
      
      if (DEMO_MODE) {
        // Simulate network delay for demo mode
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data for top chats
        const mockTopChats = [
          {
            id: 'chat-1',
            visitorName: 'Sarah Johnson',
            visitorId: 'visitor-001',
            lastMessage: 'Thank you so much for your help! This is exactly what I needed.',
            messageCount: 24,
            duration: 1245, // seconds
            status: 'completed',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            sentiment: 'positive',
          },
          {
            id: 'chat-2',
            visitorName: 'Michael Chen',
            visitorId: 'visitor-002',
            lastMessage: 'Can you send me more details about the pricing plans?',
            messageCount: 18,
            duration: 892,
            status: 'active',
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
            sentiment: 'neutral',
          },
          {
            id: 'chat-3',
            visitorName: 'Emily Rodriguez',
            visitorId: 'visitor-003',
            lastMessage: 'I\'m having trouble with my account login. Can you help?',
            messageCount: 31,
            duration: 1567,
            status: 'completed',
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            sentiment: 'neutral',
          },
          {
            id: 'chat-4',
            visitorName: 'David Kim',
            visitorId: 'visitor-004',
            lastMessage: 'Great! I\'ll proceed with the premium plan then.',
            messageCount: 15,
            duration: 678,
            status: 'completed',
            timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
            sentiment: 'positive',
          },
        ];
        setTopChats(mockTopChats);
        return;
      }
      
      // Fetch all chatbot accounts
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      
      if (chatbotAccounts.length === 0) {
        setTopChats([]);
        return;
      }

      // Collect all conversations from all chatbots
      const allConversations = [];
      
      for (const chatbot of chatbotAccounts) {
        try {
          // Fetch conversations with pagination to get all
          let page = 1;
          let hasMore = true;
          
          while (hasMore && page <= 10) { // Limit to 10 pages per chatbot
            const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
              params: { page, limit: 100 }
            });
            
            const conversations = convResponse.data?.conversations || [];
            const pagination = convResponse.data?.pagination || {};
            
            // Add conversations with visitor info
            conversations.forEach(conv => {
              if (conv.messageCount > 0) {
                allConversations.push({
                  _id: conv._id,
                  customerPhone: conv.exact_customerPhone || conv.customerPhone || 'Unknown',
                  customerName: conv.customerName || 'Guest',
                  messageCount: conv.messageCount || 0,
                  lastMessage: conv.lastMessage?.content || 'No message',
                  lastMessageAt: conv.lastMessageAt || conv.updatedAt || conv.createdAt,
                  chatbotId: chatbot._id,
                  phoneNumber: conv.exact_customerPhone || conv.customerPhone,
                });
              }
            });
            
            hasMore = page < (pagination.totalPages || 0);
            page++;
          }
        } catch (err) {
          console.error(`Error fetching conversations for chatbot ${chatbot._id}:`, err);
        }
      }

      // Group by visitor (phone number) and sum message counts
      const visitorMap = new Map();
      
      allConversations.forEach(conv => {
        const phone = conv.phoneNumber || conv.customerPhone;
        if (!phone) return;
        
        if (visitorMap.has(phone)) {
          const existing = visitorMap.get(phone);
          existing.messageCount += conv.messageCount;
          // Store conversation IDs for fetching messages later
          if (!existing.conversationIds) {
            existing.conversationIds = [];
          }
          existing.conversationIds.push({ id: conv._id, chatbotId: conv.chatbotId });
          // Keep the most recent last message
          if (new Date(conv.lastMessageAt) > new Date(existing.lastMessageAt)) {
            existing.lastMessage = conv.lastMessage;
            existing.lastMessageAt = conv.lastMessageAt;
          }
          // Keep the best name (prefer non-Guest names)
          if (conv.customerName && conv.customerName !== 'Guest' && existing.customerName === 'Guest') {
            existing.customerName = conv.customerName;
          }
        } else {
          visitorMap.set(phone, {
            id: conv._id,
            visitorName: conv.customerName || 'Guest',
            visitorId: phone,
            phoneNumber: phone,
            messageCount: conv.messageCount,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
            status: 'completed',
            conversationIds: [{ id: conv._id, chatbotId: conv.chatbotId }], // Store for fetching messages
          });
        }
      });

      // Sort by message count (descending) and take top 4
      const topVisitors = Array.from(visitorMap.values())
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 4)
        .map((visitor, index) => ({
          id: visitor.id || `visitor-${index}`,
          visitorName: visitor.visitorName,
          visitorId: visitor.visitorId,
          lastMessage: visitor.lastMessage || 'No message',
          messageCount: visitor.messageCount,
          duration: 0, // Duration not available from conversations
          status: 'completed',
          timestamp: visitor.lastMessageAt || new Date().toISOString(),
          phoneNumber: visitor.phoneNumber,
          conversationIds: visitor.conversationIds || [], // Store conversation IDs for fetching messages
        }));

      setTopChats(topVisitors);
    } catch (err) {
      console.error('Error fetching top chats:', err);
      setTopChats([]);
    } finally {
      setTopChatsLoading(false);
    }
  };

  // State to store fetched messages for selected chat
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationPhoneNumber, setConversationPhoneNumber] = useState(null);

  // Fetch complete chat conversation from backend
  const fetchChatConversation = async (chat) => {
    if (DEMO_MODE) {
      // Use mock data for demo mode
      const mockMessages = getChatConversation(chat.id);
      setChatMessages(mockMessages);
      setLoadingMessages(false);
      return;
    }

    try {
      setLoadingMessages(true);
      
      // Initialize phone number from chat object
      const initialPhone = chat.phoneNumber || chat.visitorId;
      if (initialPhone) {
        // Clean phone number (remove @s.whatsapp.net if present)
        const cleanPhone = initialPhone.split('@')[0];
        setConversationPhoneNumber(cleanPhone);
      }
      
      // Get all chatbot accounts
      const chatbotsResponse = await api.get('/api/chatbot-accounts');
      const chatbotAccounts = chatbotsResponse.data?.chatbotAccounts || [];
      
      if (chatbotAccounts.length === 0) {
        setChatMessages([]);
        return;
      }

      // Use stored conversation IDs if available, otherwise search by phone number
      const conversationIds = chat.conversationIds || [];
      const phoneNumber = chat.phoneNumber || chat.visitorId;
      
      if (conversationIds.length === 0 && !phoneNumber) {
        setChatMessages([]);
        return;
      }

      const allMessages = [];

      // If we have conversation IDs, fetch them directly (more efficient)
      if (conversationIds.length > 0) {
        for (const convInfo of conversationIds) {
              try {
                const fullConvResponse = await api.get(`/api/chatbot-accounts/${convInfo.chatbotId}/conversations/${convInfo.id}`);
                const fullConversation = fullConvResponse.data?.conversation;
                
                if (fullConversation) {
                  // Store exact phone number from conversation (if not already set)
                  if (!conversationPhoneNumber && fullConversation.exact_customerPhone) {
                    setConversationPhoneNumber(fullConversation.exact_customerPhone);
                  } else if (!conversationPhoneNumber && fullConversation.customerPhone) {
                    // Extract phone from WhatsApp format (remove @s.whatsapp.net)
                    const phone = fullConversation.customerPhone.split('@')[0];
                    setConversationPhoneNumber(phone);
                  }
                  
                  if (fullConversation.messages) {
                    // Add messages from this conversation
                    fullConversation.messages.forEach((msg, idx) => {
                      allMessages.push({
                        id: `${convInfo.id}-${idx}`,
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content || '',
                        timestamp: msg.timestamp,
                      });
                    });
                  }
                }
              } catch (err) {
                console.error(`Error fetching full conversation ${convInfo.id}:`, err);
              }
        }
      } else {
        // Fallback: Search by phone number if conversation IDs not available
        for (const chatbot of chatbotAccounts) {
          try {
            let page = 1;
            let hasMore = true;
            
            while (hasMore && page <= 10) {
              const convResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations`, {
                params: { page, limit: 100 }
              });
              
              const conversations = convResponse.data?.conversations || [];
              const pagination = convResponse.data?.pagination || {};
              
              // Find conversations matching this phone number
              const matchingConvs = conversations.filter(conv => {
                const convPhone = conv.exact_customerPhone || conv.customerPhone;
                if (!convPhone) return false;
                // Remove @s.whatsapp.net suffix if present
                const cleanPhone = convPhone.split('@')[0];
                const cleanSearchPhone = phoneNumber.split('@')[0];
                return cleanPhone === cleanSearchPhone || convPhone === phoneNumber;
              });

              // Fetch full conversation details for matching conversations
              for (const conv of matchingConvs) {
                try {
                  const fullConvResponse = await api.get(`/api/chatbot-accounts/${chatbot._id}/conversations/${conv._id}`);
                  const fullConversation = fullConvResponse.data?.conversation;
                  
                  if (fullConversation) {
                    // Store exact phone number from conversation (if not already set)
                    if (!conversationPhoneNumber && fullConversation.exact_customerPhone) {
                      setConversationPhoneNumber(fullConversation.exact_customerPhone);
                    } else if (!conversationPhoneNumber && fullConversation.customerPhone) {
                      // Extract phone from WhatsApp format (remove @s.whatsapp.net)
                      const phone = fullConversation.customerPhone.split('@')[0];
                      setConversationPhoneNumber(phone);
                    }
                    
                    if (fullConversation.messages) {
                      // Add messages from this conversation
                      fullConversation.messages.forEach((msg, idx) => {
                        allMessages.push({
                          id: `${conv._id}-${idx}`,
                          role: msg.role === 'assistant' ? 'assistant' : 'user',
                          content: msg.content || '',
                          timestamp: msg.timestamp,
                        });
                      });
                    }
                  }
                } catch (err) {
                  console.error(`Error fetching full conversation ${conv._id}:`, err);
                }
              }
              
              hasMore = page < (pagination.totalPages || 0);
              page++;
            }
          } catch (err) {
            console.error(`Error fetching conversations for chatbot ${chatbot._id}:`, err);
          }
        }
      }

      // Sort all messages by timestamp (oldest first)
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setChatMessages(allMessages);
    } catch (error) {
      console.error('Error fetching chat conversation:', error);
      setChatMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Get complete chat conversation
  const getChatConversation = (chatId) => {
    // For real data, fetch from backend
    if (!DEMO_MODE) {
      return chatMessages; // Return fetched messages
    }

    // Mock conversation data
    const conversations = {
      'chat-1': [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello! Welcome to our support. How can I assist you today?',
          timestamp: new Date(Date.now() - 1245000).toISOString(),
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'Hi, I\'m looking for information about your premium features.',
          timestamp: new Date(Date.now() - 1230000).toISOString(),
        },
        {
          id: 'msg-3',
          role: 'assistant',
          content: 'I\'d be happy to help! Our premium plan includes advanced analytics, priority support, and custom integrations. Would you like to know more about any specific feature?',
          timestamp: new Date(Date.now() - 1215000).toISOString(),
        },
        {
          id: 'msg-4',
          role: 'user',
          content: 'What about the pricing?',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
        },
        {
          id: 'msg-5',
          role: 'assistant',
          content: 'Our premium plan is $99/month or $990/year (save 17%). It includes all features plus unlimited API calls and dedicated account management.',
          timestamp: new Date(Date.now() - 1185000).toISOString(),
        },
        {
          id: 'msg-6',
          role: 'user',
          content: 'That sounds reasonable. Can I try it before committing?',
          timestamp: new Date(Date.now() - 1170000).toISOString(),
        },
        {
          id: 'msg-7',
          role: 'assistant',
          content: 'Absolutely! We offer a 14-day free trial with full access to all premium features. No credit card required. Would you like me to set that up for you?',
          timestamp: new Date(Date.now() - 1155000).toISOString(),
        },
        {
          id: 'msg-8',
          role: 'user',
          content: 'Yes, please! That would be great.',
          timestamp: new Date(Date.now() - 1140000).toISOString(),
        },
        {
          id: 'msg-9',
          role: 'assistant',
          content: 'Perfect! I\'ve started your free trial. You\'ll receive an email with setup instructions. Is there anything else I can help you with?',
          timestamp: new Date(Date.now() - 1125000).toISOString(),
        },
        {
          id: 'msg-10',
          role: 'user',
          content: 'Thank you so much for your help! This is exactly what I needed.',
          timestamp: new Date(Date.now() - 1110000).toISOString(),
        },
      ],
      'chat-2': [
        {
          id: 'msg-11',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'msg-12',
          role: 'user',
          content: 'I\'m interested in your service. Can you tell me more?',
          timestamp: new Date(Date.now() - 1785000).toISOString(),
        },
        {
          id: 'msg-13',
          role: 'assistant',
          content: 'Of course! We offer a comprehensive platform with multiple plans. What specific aspect would you like to know about?',
          timestamp: new Date(Date.now() - 1770000).toISOString(),
        },
        {
          id: 'msg-14',
          role: 'user',
          content: 'Can you send me more details about the pricing plans?',
          timestamp: new Date(Date.now() - 1755000).toISOString(),
        },
      ],
      'chat-3': [
        {
          id: 'msg-15',
          role: 'assistant',
          content: 'Hi there! I\'m here to help. What can I do for you?',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'msg-16',
          role: 'user',
          content: 'I\'m having trouble with my account login. Can you help?',
          timestamp: new Date(Date.now() - 7185000).toISOString(),
        },
        {
          id: 'msg-17',
          role: 'assistant',
          content: 'I\'m sorry to hear you\'re having login issues. Let me help you troubleshoot. Have you tried resetting your password?',
          timestamp: new Date(Date.now() - 7170000).toISOString(),
        },
        {
          id: 'msg-18',
          role: 'user',
          content: 'Yes, I tried that but I\'m not receiving the reset email.',
          timestamp: new Date(Date.now() - 7155000).toISOString(),
        },
        {
          id: 'msg-19',
          role: 'assistant',
          content: 'Let me check your account. Can you verify the email address you\'re using?',
          timestamp: new Date(Date.now() - 7140000).toISOString(),
        },
        {
          id: 'msg-20',
          role: 'user',
          content: 'It\'s emily.rodriguez@email.com',
          timestamp: new Date(Date.now() - 7125000).toISOString(),
        },
        {
          id: 'msg-21',
          role: 'assistant',
          content: 'I see the issue. The reset emails might be going to spam. I\'ve sent a new reset link and also updated your account settings. Please check your spam folder.',
          timestamp: new Date(Date.now() - 7110000).toISOString(),
        },
        {
          id: 'msg-22',
          role: 'user',
          content: 'Found it! Thank you so much!',
          timestamp: new Date(Date.now() - 7095000).toISOString(),
        },
      ],
      'chat-4': [
        {
          id: 'msg-23',
          role: 'assistant',
          content: 'Welcome! How can I assist you today?',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
        },
        {
          id: 'msg-24',
          role: 'user',
          content: 'I want to upgrade to premium.',
          timestamp: new Date(Date.now() - 5385000).toISOString(),
        },
        {
          id: 'msg-25',
          role: 'assistant',
          content: 'Great choice! The premium plan offers advanced features. Would you like monthly or annual billing?',
          timestamp: new Date(Date.now() - 5370000).toISOString(),
        },
        {
          id: 'msg-26',
          role: 'user',
          content: 'Annual sounds good. What\'s the price?',
          timestamp: new Date(Date.now() - 5355000).toISOString(),
        },
        {
          id: 'msg-27',
          role: 'assistant',
          content: 'Annual is $990/year, which saves you 17% compared to monthly. I can set that up for you right now.',
          timestamp: new Date(Date.now() - 5340000).toISOString(),
        },
        {
          id: 'msg-28',
          role: 'user',
          content: 'Great! I\'ll proceed with the premium plan then.',
          timestamp: new Date(Date.now() - 5325000).toISOString(),
        },
      ],
    };

    return conversations[chatId] || [];
  };

  const handleChatClick = async (chat) => {
    setSelectedChat(chat);
    setShowChatModal(true);
    setTranslatedMessages(null); // Reset translation when opening new chat
    setChatMessages([]); // Clear previous messages
    setConversationPhoneNumber(null); // Reset phone number
    
    // Fetch messages for this chat
    await fetchChatConversation(chat);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading dashboard</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>AI Chat Agent Dashboard</span>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-xl">
            Monitor your chatbot performance, user engagement, and plan status.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const changeColor = kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500';
          const isHighlighted = kpi.title === 'Total Chats' || kpi.title === 'Total Visitors';
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {kpi.title}
                    </p>
                    <div className={`text-xl font-semibold tabular-nums ${
                      kpi.warning ? "text-red-500" : "text-zinc-900"
                    }`}>
                      {kpi.value}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white ${
                      isHighlighted && "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isHighlighted ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Status</span>
                  <span className={`font-medium ${
                    kpi.warning ? 'text-red-500' : changeColor
                  }`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Chats Cards + FAQ/Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Chats Cards */}
        <div className="lg:col-span-2 glass-card flex flex-col min-h-[376px]">
          <div className="flex items-center gap-2 mb-4 px-6 pt-6">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
              <FaComments />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Top Chats
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-6 flex-1">
            {topChatsLoading ? (
              // Skeleton loading cards
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="glass-card p-5 border border-zinc-200 rounded-xl flex flex-col animate-pulse"
                >
                  <div className="flex-1 mb-4 space-y-2">
                    <div className="h-4 bg-zinc-200 rounded w-full" />
                    <div className="h-4 bg-zinc-200 rounded w-5/6" />
                    <div className="h-4 bg-zinc-200 rounded w-4/6" />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-100">
                    <div className="h-3 bg-zinc-200 rounded w-20" />
                    <div className="h-3 bg-zinc-200 rounded w-1" />
                    <div className="h-3 bg-zinc-200 rounded w-12" />
                    <div className="h-3 bg-zinc-200 rounded w-1" />
                    <div className="h-3 bg-zinc-200 rounded w-16" />
                  </div>
                </div>
              ))
            ) : topChats.length > 0 ? (
              topChats.map((chat) => {
                const formatDuration = (seconds) => {
                  const mins = Math.floor(seconds / 60);
                  return `${mins}m`;
                };
                const formatTime = (timestamp) => {
                  const date = new Date(timestamp);
                  const now = new Date();
                  const diffMs = now - date;
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 60) return `${diffMins}m ago`;
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) return `${diffHours}h ago`;
                  return date.toLocaleDateString();
                };
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat)}
                    className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-zinc-200 hover:border-emerald-300 rounded-xl flex flex-col"
                  >
                    <div className="flex-1 mb-4">
                      <div className="text-sm text-zinc-700 line-clamp-3 leading-relaxed prose prose-sm prose-zinc max-w-none [&_p]:m-0 [&_strong]:text-zinc-700 [&_strong]:font-semibold [&_em]:text-zinc-600">
                        <ReactMarkdown>{chat.lastMessage}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-3 border-t border-zinc-100">
                      {/* Phone Number */}
                      {chat.phoneNumber && (
                        <div className="text-xs text-zinc-600 font-medium">
                          📱 {chat.phoneNumber}
                        </div>
                      )}
                      {/* Message Stats */}
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="font-medium">{chat.messageCount} messages</span>
                        <span className="text-zinc-400">•</span>
                        <span>{formatTime(chat.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex items-center justify-center h-32 text-zinc-500 text-sm">
                No chat data available yet
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Privacy Policy Card */}
          <div className="glass-card p-4 flex flex-col min-h-[180px]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FaFileAlt className="text-emerald-500" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Privacy Policy
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              Read how we safeguard your data and respect your privacy.
            </p>
            <a
              href="/pdfs/Privacy_Policy.pdf"
              download="Privacy_Policy.pdf"
              className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
            >
              <FaDownload size={14} />
              <span>Download Privacy Policy PDF</span>
            </a>
          </div>

          {/* Terms & Conditions Card */}
          <div className="glass-card p-4 flex flex-col min-h-[180px]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FaFileAlt className="text-emerald-500" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Terms & Conditions
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              Latest policy and compliance guidelines
            </p>
            <a
              href="/pdfs/T&C.pdf"
              download="Terms_and_Conditions.pdf"
              className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
            >
              <FaDownload size={14} />
              <span>Download Terms PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Chats per Day */}
        <div className="glass-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                <FaComments />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Chats per Day
              </h2>
            </div>
            <p className="text-xs md:text-sm text-zinc-500">
              Last 7 days
            </p>
          </div>
          <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
            {chatsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chatsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="chats" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Line Chart - Visitors per Day */}
        <div className="glass-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                <FaUsers />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Visitors per Day
              </h2>
            </div>
            <p className="text-xs md:text-sm text-zinc-500">
              Last 7 days
            </p>
          </div>
          <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
            {visitorsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={visitorsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                No data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Conversation Modal */}
      {showChatModal && selectedChat && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => {
            setShowChatModal(false);
            setSelectedChat(null);
            setTranslatedMessages(null);
            setChatMessages([]); // Clear messages when closing
            setConversationPhoneNumber(null); // Clear phone number
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden bg-white border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <FaComments />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      Chat Conversation
                    </h2>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-zinc-500">
                        {selectedChat.messageCount} messages {selectedChat.duration > 0 ? `• ${Math.floor(selectedChat.duration / 60)}m duration` : ''}
                      </p>
                      {(conversationPhoneNumber || selectedChat.phoneNumber || selectedChat.visitorId) && (
                        <p className="text-xs text-zinc-600 font-medium">
                          Phone: {conversationPhoneNumber || selectedChat.phoneNumber || selectedChat.visitorId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChatModal(false);
                    setSelectedChat(null);
                    setTranslatedMessages(null);
                    setChatMessages([]); // Clear messages when closing
                    setConversationPhoneNumber(null); // Clear phone number
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Translation Component */}
            {selectedChat && chatMessages.length > 0 && !loadingMessages && (
              <div className="px-6 pt-4 pb-0">
                <TranslationComponent
                  content={chatMessages.map(msg => ({
                    speaker: msg.role === 'user' ? 'user' : 'agent',
                    text: msg.content,
                    content: msg.content,
                    timestamp: msg.timestamp,
                  }))}
                  onTranslatedContentChange={(translated) => {
                    setTranslatedMessages(translated);
                  }}
                />
              </div>
            )}

            {/* Chat Messages */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-emerald-500" size={24} />
                  <span className="ml-3 text-zinc-500">Loading messages...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-zinc-500">
                  No messages found for this conversation
                </div>
              ) : (
                (translatedMessages || chatMessages).map((message, index, allMessages) => {
                  // Handle both original message format and translated transcript format
                  const isUser = message.role === 'user' || message.speaker === 'user';
                  const messageContent = message.content || message.text || '';
                  const messageTimestamp = message.timestamp;
                  
                  // For translated messages, we need to reconstruct the grouping
                  const prevMessage = index > 0 ? allMessages[index - 1] : null;
                  const nextMessage = index < allMessages.length - 1 ? allMessages[index + 1] : null;
                  
                  // Check if this message is part of a group (same sender as prev/next)
                  const prevIsUser = prevMessage ? (prevMessage.role === 'user' || prevMessage.speaker === 'user') : null;
                  const nextIsUser = nextMessage ? (nextMessage.role === 'user' || nextMessage.speaker === 'user') : null;
                  const isFirstInGroup = !prevMessage || prevIsUser !== isUser;
                  const isLastInGroup = !nextMessage || nextIsUser !== isUser;
                  
                  // Determine spacing: larger gap between different senders, smaller gap within same sender
                  const marginTop = index === 0 ? '' : isFirstInGroup ? 'mt-4' : 'mt-1';

                  return (
                    <div
                      key={message.id || `msg-${index}`}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${marginTop}`}
                    >
                      {/* Avatar - only show for first message in group */}
                      {isFirstInGroup ? (
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                          isUser
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {isUser ? <FaUser size={12} /> : <FaRobot size={12} />}
                        </div>
                      ) : (
                        <div className="w-8 flex-shrink-0" />
                      )}

                      <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 ${
                          isUser
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-100 text-zinc-900'
                        }`}>
                          <div className={`text-sm whitespace-pre-wrap prose prose-sm max-w-none ${
                            isUser
                              ? 'prose-invert [&_strong]:text-white [&_em]:text-emerald-100'
                              : '[&_strong]:text-zinc-700 [&_strong]:font-semibold [&_em]:text-zinc-600'
                          } [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0`}>
                            <ReactMarkdown>{messageContent}</ReactMarkdown>
                          </div>
                        </div>

                        {/* Timestamp - only show for last message in group */}
                        {isLastInGroup && messageTimestamp && (
                          <p className={`text-xs text-zinc-400 mt-1 ${
                            isUser ? 'text-right' : 'text-left'
                          }`}>
                            {new Date(messageTimestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
