import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaSearch, FaFilter, FaChevronDown, FaEye, FaComments, FaUser, FaRobot, FaBrain, FaSpinner, FaEnvelope, FaCalendar, FaUsers, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { DEMO_MODE } from '../config/api.config';
import { authAPI } from '../services/api';
import TranslationComponent from './TranslationComponent';

const ChatHistory = () => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    sender: '',
    contact: '',
    dateRange: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dropdown states
  const [contactFilterOpen, setContactFilterOpen] = useState(false);
  const [guestFilterOpen, setGuestFilterOpen] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  
  const [allContacts, setAllContacts] = useState([]);
  const [allGuests, setAllGuests] = useState([]); // Array of {session_id, label, number}
  const [allLocations, setAllLocations] = useState([]); // Array of unique locations
  const [selectedContact, setSelectedContact] = useState(''); // Phone number
  const [selectedGuest, setSelectedGuest] = useState(null); // Guest object with session_id
  const [selectedLocation, setSelectedLocation] = useState(''); // Location string
  
  const contactFilterRef = useRef(null);
  const guestFilterRef = useRef(null);
  const dateFilterRef = useRef(null);
  const locationFilterRef = useRef(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [groupedConversations, setGroupedConversations] = useState([]);
  const [translatedMessages, setTranslatedMessages] = useState(null);

  // Fetch all contacts on mount (for filter dropdowns)
  useEffect(() => {
    fetchAllContacts();
  }, []);

  useEffect(() => {
    fetchChatMessages();
  }, [pagination.page, pagination.limit, filters.dateRange, selectedContact, selectedGuest, selectedLocation]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchChatMessages();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contactFilterRef.current && !contactFilterRef.current.contains(event.target)) {
        setContactFilterOpen(false);
      }
      if (guestFilterRef.current && !guestFilterRef.current.contains(event.target)) {
        setGuestFilterOpen(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setDateFilterOpen(false);
      }
      if (locationFilterRef.current && !locationFilterRef.current.contains(event.target)) {
        setLocationFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllContacts = async () => {
    try {
      const response = await authAPI.getAllContacts();
      if (response?.success) {
        setAllContacts(response.data?.contacts || []);
        setAllGuests(response.data?.guests || []); // Keep full objects with session_id
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const fetchChatMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockMessages = [];
        const contacts = [
          { id: 'guest-449', name: 'Guest 449', type: 'guest' },
          { id: 'guest-448', name: 'Guest 448', type: 'guest' },
          { id: 'guest-447', name: 'Guest 447', type: 'guest' },
          { id: 'guest-446', name: 'Guest 446', type: 'guest' },
          { id: 'guest-445', name: 'Guest 445', type: 'guest' },
          { id: '+919876543210', name: '+91 98765 43210', type: 'phone' },
          { id: '+919876543211', name: '+91 98765 43211', type: 'phone' },
        ];
        
        const agentMessages = [
          'The cost for WhatsApp marketing messages is **INR 0.60 per message**. Here are the current packages available:\n\n**Package 1:** 3 Lac Messages...',
          'The pricing for our WhatsApp marketing service is set at **₹0.60 per message**. Here are the available packages:\n\n**Package Offers:...**',
          'The price for WhatsApp marketing services is **INR 0.60 per message**. Here are some package options:\n\n**Package 1:** 3 Lac Messages...',
          'Our WhatsApp marketing pricing is **₹0.60 per message**. Available packages include:\n\n**Package 1:** 3 Lac Messages - Special offer...',
          'The cost per WhatsApp marketing message is **INR 0.60**. We offer various packages:\n\n**Package 1:** 3 Lac Messages...',
        ];
        
        const userMessages = [
          'What is the cost?',
          'Pricing',
          'Price',
          'Price?',
          'What is the pricing?',
          'How much does it cost?',
          'Tell me about pricing',
        ];
        
        setAllContacts([...new Set(contacts.filter(c => c.type === 'phone').map(c => c.name))]);
        setAllGuests([...new Set(contacts.filter(c => c.type === 'guest').map(c => c.name))]);
        
        for (let i = 0; i < 100; i++) {
          const now = Date.now();
          const daysAgo = Math.floor(i / 10);
          const hoursAgo = (i % 10) * 0.5;
          const messageDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
          
          const isAgent = i % 2 === 0;
          const contactIndex = Math.floor(i / 2) % contacts.length;
          const contact = contacts[contactIndex];
          
          mockMessages.push({
            _id: `msg-${i + 1}`,
            sender: isAgent ? 'agent' : 'user',
            content: isAgent 
              ? agentMessages[i % agentMessages.length]
              : userMessages[i % userMessages.length],
            session_id: contact.id, // Use contact.id as session_id for grouping
            contact: contact.name,
            contactType: contact.type,
            phone: contact.type === 'phone' ? contact.id : null,
            email: null,
            name: contact.type === 'guest' ? null : contact.name,
            is_guest: contact.type === 'guest',
            timestamp: messageDate.toISOString(),
          });
        }

        let filteredMessages = [...mockMessages];
        
        if (filters.sender) {
          filteredMessages = filteredMessages.filter(msg => msg.sender === filters.sender);
        }
        
        if (selectedContact) {
          filteredMessages = filteredMessages.filter(msg => msg.contact === selectedContact);
        }
        
        if (selectedGuest) {
          filteredMessages = filteredMessages.filter(msg => msg.contact === selectedGuest);
        }
        
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredMessages = filteredMessages.filter(msg => 
            msg.content.toLowerCase().includes(query)
          );
        }
        
        // Date filtering
        if (filters.dateRange && filters.dateRange !== 'all') {
          const now = new Date();
          let cutoffDate = new Date();
          
          switch (filters.dateRange) {
            case '7days':
              cutoffDate.setDate(now.getDate() - 7);
              break;
            case '30days':
              cutoffDate.setDate(now.getDate() - 30);
              break;
            case '90days':
              cutoffDate.setDate(now.getDate() - 90);
              break;
            default:
              cutoffDate = new Date(0);
          }
          
          filteredMessages = filteredMessages.filter(msg => 
            new Date(msg.timestamp) >= cutoffDate
          );
        }

        filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Group messages by session_id first to get total conversations
        const allGrouped = groupMessagesBySession(filteredMessages);
        
        // Extract unique locations from grouped conversations (include all locations including "Local Network")
        const uniqueLocations = [...new Set(
          allGrouped
            .map(conv => conv.location)
            .filter(loc => loc && loc !== 'Unknown') // Only exclude "Unknown", keep "Local Network"
        )].sort();
        setAllLocations(uniqueLocations);
        
        // Filter by location if selected
        let filteredGrouped = allGrouped;
        if (selectedLocation) {
          filteredGrouped = allGrouped.filter(conv => conv.location === selectedLocation);
        }
        
        const totalConversations = filteredGrouped.length;
        
        // Paginate conversations (not messages)
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedConversations = filteredGrouped.slice(startIndex, endIndex);

        setMessages(filteredMessages);
        setGroupedConversations(paginatedConversations);
        
        setPagination(prev => ({
          ...prev,
          total: totalConversations,
          pages: Math.ceil(totalConversations / pagination.limit),
        }));
        setLoading(false);
        return;
      }

      // Real API call - fetch all messages first to group into conversations
      // We need to fetch all messages to properly group and paginate conversations
      // TODO: Backend should support conversation-based pagination for better performance
      const response = await authAPI.getMessages({
        page: 1,
        limit: 5000, // Fetch large batch to get all conversations (backend pagination is by messages, not conversations)
        dateRange: filters.dateRange,
        phone: selectedContact || undefined, // Filter by phone number
        session_id: selectedGuest?.session_id || undefined, // Filter by guest session
        search: searchQuery || undefined, // Search in message content
      });
      
      if (response?.success) {
        // Transform backend data to match UI expectations
        const transformedMessages = (response.data?.messages || []).map(msg => ({
          _id: msg.id,
          sender: msg.sender === 'bot' ? 'agent' : 'user',
          content: msg.content,
          timestamp: msg.timestamp,
          session_id: msg.session_id,
          contact: msg.contact_name || msg.name || msg.phone || msg.email || (msg.is_guest ? 'Guest' : 'Unknown'), // Will be updated in grouping
          contactType: msg.phone ? 'phone' : (msg.email ? 'email' : 'guest'),
          phone: msg.phone,
          email: msg.email,
          name: msg.name,
          is_guest: msg.is_guest,
          ip_address: msg.ip_address || null,
          location: msg.location || null,
        }));
        
        setMessages(transformedMessages);
        
        // Group messages by session_id to get conversations
        const allGrouped = groupMessagesBySession(transformedMessages);
        
        // Extract unique locations from grouped conversations (include all locations including "Local Network")
        const uniqueLocations = [...new Set(
          allGrouped
            .map(conv => conv.location)
            .filter(loc => loc && loc !== 'Unknown') // Only exclude "Unknown", keep "Local Network"
        )].sort();
        setAllLocations(uniqueLocations);
        
        // Filter by location if selected
        let filteredGrouped = allGrouped;
        if (selectedLocation) {
          filteredGrouped = allGrouped.filter(conv => conv.location === selectedLocation);
        }
        
        const totalConversations = filteredGrouped.length;
        
        // Paginate conversations (not messages)
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedConversations = filteredGrouped.slice(startIndex, endIndex);
        
        setGroupedConversations(paginatedConversations);
        
        setPagination(prev => ({
          ...prev,
          total: totalConversations,
          pages: Math.ceil(totalConversations / pagination.limit),
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load chat messages');
      setLoading(false);
    }
  };

  const fetchSessionChat = async (sessionId, message) => {
    try {
      setLoadingSession(true);
      setSelectedMessage(message);
      setShowDetailsModal(true);
      setSessionMessages([]);
      setTranslatedMessages(null); // Reset translation when opening new session

      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 300));
        // Generate mock session messages
        const mockSessionMessages = [];
        const agentMsgs = [
          'Hello! How can I assist you today?',
          'The cost for WhatsApp marketing messages is **INR 0.60 per message**.',
          'Is there anything else you would like to know?',
        ];
        const userMsgs = ['Hi', 'What is the pricing?', 'Thank you'];
        
        for (let i = 0; i < 6; i++) {
          const isAgent = i % 2 === 1;
          mockSessionMessages.push({
            _id: `session-msg-${i}`,
            sender: isAgent ? 'agent' : 'user',
            content: isAgent ? agentMsgs[Math.floor(i / 2) % agentMsgs.length] : userMsgs[Math.floor(i / 2) % userMsgs.length],
            timestamp: new Date(Date.now() - (5 - i) * 60000).toISOString(),
          });
        }
        setSessionMessages(mockSessionMessages);
        setLoadingSession(false);
        return;
      }

      // Real API call - fetch all messages for this session
      const response = await authAPI.getMessages({
        session_id: sessionId,
        limit: 500, // Get all messages in the session
        dateRange: 'all',
      });
      
      if (response?.success) {
        const transformedMessages = (response.data?.messages || []).map(msg => ({
          _id: msg.id,
          sender: msg.sender === 'bot' ? 'agent' : 'user',
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        // Sort by timestamp ascending (oldest first)
        transformedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSessionMessages(transformedMessages);
      }
      
      setLoadingSession(false);
    } catch (err) {
      console.error('Error fetching session chat:', err);
      setLoadingSession(false);
    }
  };

  const formatMessageDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${month} ${day}, ${year}\nat ${time}`;
  };

  const truncateMessage = (content, maxLength = 80) => {
    if (!content) return '';
    // Remove markdown bold markers for display
    const cleanContent = content.replace(/\*\*/g, '');
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength) + '...';
  };

  // Group messages by session_id
  const groupMessagesBySession = (messages) => {
    const groups = {};
    

    // First pass: Group all messages and identify guests
    messages.forEach(message => {
      const sessionId = message.session_id || message.contact || 'unknown';
      const isGuest = !message.phone && !message.email && (message.is_guest || message.contactType === 'guest' || (!message.name && !message.phone && !message.email));
      
      if (!groups[sessionId]) {
        groups[sessionId] = {
          session_id: sessionId,
          contactType: message.contactType || (message.phone ? 'phone' : message.email ? 'email' : 'guest'),
          phone: message.phone,
          exact_customerPhone: message.exact_customerPhone, // Store exact phone for contact display
          email: message.email,
          name: message.name,
          ip_address: message.ip_address,
          location: message.location,
          is_guest: isGuest,
          messages: [],
          firstMessageDate: message.timestamp,
          lastMessageDate: message.timestamp,
          conversation_createdAt: message.conversation_createdAt || null, // Store conversation createdAt
        };
      }
      
      // Update exact_customerPhone if not set yet
      if (!groups[sessionId].exact_customerPhone && message.exact_customerPhone) {
        groups[sessionId].exact_customerPhone = message.exact_customerPhone;
      }
      
      // Update conversation_createdAt if not set yet
      if (!groups[sessionId].conversation_createdAt && message.conversation_createdAt) {
        groups[sessionId].conversation_createdAt = message.conversation_createdAt;
      }
      
      groups[sessionId].messages.push(message);
      
      // Update date range
      const msgDate = new Date(message.timestamp);
      const firstDate = new Date(groups[sessionId].firstMessageDate);
      const lastDate = new Date(groups[sessionId].lastMessageDate);
      
      if (msgDate < firstDate) {
        groups[sessionId].firstMessageDate = message.timestamp;
      }
      if (msgDate > lastDate) {
        groups[sessionId].lastMessageDate = message.timestamp;
      }
    });
    
    // Second pass: Sort guests by earliest message timestamp and assign numbers chronologically
    const guestSessions = Object.values(groups)
      .filter(group => group.is_guest)
      .sort((a, b) => new Date(a.firstMessageDate) - new Date(b.firstMessageDate)); // Oldest first
    
    const guestSessionMap = {}; // Map to track guest numbers by session_id
    guestSessions.forEach((group, index) => {
      guestSessionMap[group.session_id] = index + 1; // Guest 1, Guest 2, etc.

    });
    
    // Third pass: Extract IP address and location from first user message and assign contact display names
    Object.values(groups).forEach(group => {
      // Extract IP address and location from the first user message in the session
      const firstUserMessage = group.messages
        .filter(msg => msg.sender === 'user' && msg.ip_address)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
      
      if (firstUserMessage) {
        if (firstUserMessage.ip_address) {
          group.ip_address = firstUserMessage.ip_address;
        }
        if (firstUserMessage.location) {
          group.location = firstUserMessage.location;
        }
      }
      
      let contactDisplay = null;
      
      // Priority 1: exact_customerPhone (preferred for contact column)
      const exactPhone = group.messages.find(m => m.exact_customerPhone)?.exact_customerPhone || group.phone;
      if (exactPhone) {
        contactDisplay = exactPhone;
      }
      // Priority 2: Phone number (fallback)
      else if (group.phone) {
        contactDisplay = group.phone;
      }
      // Priority 3: Email
      else if (group.email) {
        contactDisplay = group.email;
      }
      // Priority 4: Name (if not a guest placeholder)
      else if (group.name && !group.name.toLowerCase().includes('guest')) {
        contactDisplay = group.name;
      }
      // Priority 5: If it's a guest, use assigned number
      else if (group.is_guest && guestSessionMap[group.session_id]) {
        contactDisplay = `Guest ${guestSessionMap[group.session_id]}`;
      }
      // Fallback
      else {
        contactDisplay = 'Unknown';
      }
      
      group.contact = contactDisplay;
      
      // Store createdAt from conversation (use from first message if available, otherwise use first message timestamp)
      const firstMessageWithCreatedAt = group.messages.find(m => m.conversation_createdAt);
      group.conversation_createdAt = firstMessageWithCreatedAt?.conversation_createdAt || group.firstMessageDate;
    });
    
    const groupedArray = Object.values(groups).map(group => ({
      ...group,
      messages: group.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    })).sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
    

    return groupedArray;
  };


  const getDateRangeLabel = () => {
    switch (filters.dateRange) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '90days': return 'Last 90 days';
      case 'all': return 'All time';
      default: return 'Filter by Date';
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading chat messages...</p>
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
            <FaComments className="h-3 w-3" />
            <span>Chat management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Chat History
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View and manage all your message conversations in one place. Track user interactions, analyze engagement patterns, and export conversation data effortlessly.
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="glass-panel p-4 relative z-20">
        <div className="flex flex-wrap gap-3">
          {/* Filter by Contact */}
          <div className="relative" ref={contactFilterRef}>
            <button
              onClick={() => {
                setContactFilterOpen(!contactFilterOpen);
                setGuestFilterOpen(false);
                setDateFilterOpen(false);
                setLocationFilterOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
            >
              <FaFilter size={12} className="text-zinc-400" />
              <span>{selectedContact || 'Filter by Contact'}</span>
              <FaChevronDown size={10} className={`text-zinc-400 transition-transform ${contactFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {contactFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedContact('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setContactFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg ${!selectedContact ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    All Contacts
                  </button>
                  {allContacts.map(contact => (
                    <button
                      key={contact.phone || contact}
                      onClick={() => {
                        setSelectedContact(contact.phone || contact);
                        setPagination(prev => ({ ...prev, page: 1 }));
                        setContactFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg ${selectedContact === (contact.phone || contact) ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      {contact.phone || contact}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter by Guest */}
          <div className="relative" ref={guestFilterRef}>
            <button
              onClick={() => {
                setGuestFilterOpen(!guestFilterOpen);
                setContactFilterOpen(false);
                setDateFilterOpen(false);
                setLocationFilterOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
            >
              <FaUsers size={12} className="text-zinc-400" />
              <span>{selectedGuest ? selectedGuest.label : 'Filter by Guest'}</span>
              <FaChevronDown size={10} className={`text-zinc-400 transition-transform ${guestFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {guestFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedGuest(null);
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setGuestFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg ${!selectedGuest ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    All Guests
                  </button>
                  {allGuests.map(guest => (
                    <button
                      key={guest.session_id}
                      onClick={() => {
                        setSelectedGuest(guest);
                        setPagination(prev => ({ ...prev, page: 1 }));
                        setGuestFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg ${selectedGuest?.session_id === guest.session_id ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      {guest.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter by Date */}
          <div className="relative" ref={dateFilterRef}>
            <button
              onClick={() => {
                setDateFilterOpen(!dateFilterOpen);
                setContactFilterOpen(false);
                setGuestFilterOpen(false);
                setLocationFilterOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
            >
              <FaCalendar size={12} className="text-zinc-400" />
              <span>{getDateRangeLabel()}</span>
              <FaChevronDown size={10} className={`text-zinc-400 transition-transform ${dateFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dateFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  {[
                    { value: '7days', label: 'Last 7 days' },
                    { value: '30days', label: 'Last 30 days' },
                    { value: '90days', label: 'Last 90 days' },
                    { value: 'all', label: 'All time' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilters({ ...filters, dateRange: option.value });
                        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
                        setDateFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg ${filters.dateRange === option.value ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter by Location */}
          <div className="relative" ref={locationFilterRef}>
            <button
              onClick={() => {
                setLocationFilterOpen(!locationFilterOpen);
                setContactFilterOpen(false);
                setGuestFilterOpen(false);
                setDateFilterOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
            >
              <FaMapMarkerAlt size={12} className="text-zinc-400" />
              <span>{selectedLocation || 'Filter by Location'}</span>
              <FaChevronDown size={10} className={`text-zinc-400 transition-transform ${locationFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {locationFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedLocation('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setLocationFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg ${!selectedLocation ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    All Locations
                  </button>
                  {allLocations.length > 0 ? (
                    allLocations.map(location => (
                      <button
                        key={location}
                        onClick={() => {
                          setSelectedLocation(location);
                          setPagination(prev => ({ ...prev, page: 1 }));
                          setLocationFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${selectedLocation === location ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50'}`}
                      >
                        <FaMapMarkerAlt size={10} className="text-zinc-400" />
                        <span>{location}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-400">
                      No locations available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <FaSearch className="text-white" size={16} />
          </div>
          <input
            type="text"
            placeholder="Type any word to search in messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPagination(prev => ({ ...prev, page: 1 }));
                fetchChatMessages();
              }
            }}
            className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
          />
          <button
            onClick={() => {
              setPagination(prev => ({ ...prev, page: 1 }));
              fetchChatMessages();
            }}
            className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Messages Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-teal-600 to-cyan-600">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaEnvelope size={12} />
                    <span>Contact</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaEnvelope size={12} />
                    <span>Message</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaCalendar size={12} />
                    <span>Date</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaGlobe size={12} />
                    <span>IP Address</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaMapMarkerAlt size={12} />
                    <span>Location</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaEye size={12} />
                    <span>Action</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {groupedConversations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 text-sm">
                    <FaComments className="mx-auto mb-3 text-zinc-300" size={32} />
                    <p>{loading ? 'Loading messages...' : 'No messages found'}</p>
                  </td>
                </tr>
              ) : (
                groupedConversations.map((conversation) => {
                  // Show only one row per conversation
                  return (
                    <tr 
                      key={conversation.session_id} 
                      className="hover:bg-zinc-50/50 transition-colors border-t border-teal-200"
                    >
                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium border border-cyan-200">
                            <FaUsers size={10} />
                            {conversation.contact}
                          </span>
                        </div>
                      </td>
                      
                      {/* Message - Show total count */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">
                            {conversation.messages.length} message{conversation.messages.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      
                      {/* Date - Show createdAt from database */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">
                          {conversation.conversation_createdAt 
                            ? new Date(conversation.conversation_createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : new Date(conversation.firstMessageDate).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                          }
                        </p>
                      </td>

                      {/* IP Address */}
                      <td className="px-6 py-4">
                        {conversation.ip_address ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 text-zinc-600 text-xs font-mono">
                            {conversation.ip_address}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        {conversation.location ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                            <FaMapMarkerAlt size={10} />
                            {conversation.location}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>

                      {/* Action - View button */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            const messageWithContact = {
                              ...conversation.messages[0],
                              contact: conversation.contact,
                              is_guest: conversation.is_guest
                            };
                            fetchSessionChat(conversation.session_id, messageWithContact);
                          }}
                          className="w-8 h-8 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-500 hover:text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                          title="View complete chat"
                        >
                          <FaEye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {groupedConversations.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-gradient-to-r from-zinc-50 to-zinc-100/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="text-sm text-zinc-600">
                Showing <span className="font-semibold text-zinc-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="font-semibold text-zinc-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold text-zinc-900">{pagination.total}</span> conversation{pagination.total !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600 font-medium">Show per page:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
                  className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 font-medium cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-medium transition-colors"
                  title="First page"
                >
                  ««
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-medium transition-colors"
                  title="Previous page"
                >
                  «
                </button>
                <span className="px-4 py-1.5 text-sm font-semibold text-zinc-900 bg-white rounded-lg border border-zinc-300 min-w-[100px] text-center">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-medium transition-colors"
                  title="Next page"
                >
                  »
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-medium transition-colors"
                  title="Last page"
                >
                  »»
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Session Chat Modal */}
      {showDetailsModal && selectedMessage ? createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedMessage(null);
            setSessionMessages([]);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900">Complete Conversation</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {selectedMessage.contact || selectedMessage.guestId || (selectedMessage.is_guest ? 'Guest' : 'Unknown')} • Session Chat
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedMessage(null);
                    setSessionMessages([]);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Translation Component */}
            {sessionMessages.length > 0 && (
              <div className="px-6 pt-4 pb-0">
                <TranslationComponent
                  content={sessionMessages.map(msg => ({
                    speaker: msg.sender === 'agent' ? 'agent' : 'user',
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50">
              {loadingSession ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-emerald-500 mr-3" size={24} />
                  <span className="text-zinc-500">Loading conversation...</span>
                </div>
              ) : sessionMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <FaComments className="mx-auto mb-3 text-zinc-300" size={32} />
                  <p>No messages found in this session</p>
                </div>
              ) : (
                (translatedMessages || sessionMessages).map((msg, index) => {
                  // Handle both original message format and translated transcript format
                  const isAgent = msg.sender === 'agent' || msg.speaker === 'agent';
                  const messageContent = msg.content || msg.text || '';
                  const messageTimestamp = msg.timestamp;
                  
                  return (
                    <div key={msg._id || index} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isAgent
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isAgent ? <FaBrain size={14} /> : <FaUser size={14} />}
                        </div>
                        <div className={`rounded-2xl px-4 py-3 ${
                          isAgent 
                            ? 'bg-white border border-zinc-200 rounded-tl-sm' 
                            : 'bg-emerald-500 text-white rounded-tr-sm'
                        }`}>
                          <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${isAgent ? 'text-zinc-900 prose-zinc' : 'text-white prose-invert'}`}>
                            <ReactMarkdown
                              components={{
                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                li: ({children}) => <li className="ml-2">{children}</li>,
                                a: ({href, children}) => <a href={href} className={`underline ${isAgent ? 'text-emerald-600' : 'text-emerald-100'}`} target="_blank" rel="noopener noreferrer">{children}</a>,
                                code: ({children}) => <code className={`px-1 py-0.5 rounded text-xs ${isAgent ? 'bg-zinc-100' : 'bg-emerald-600'}`}>{children}</code>,
                              }}
                            >
                              {messageContent}
                            </ReactMarkdown>
                          </div>
                          {messageTimestamp && (
                            <p className={`text-xs mt-2 ${isAgent ? 'text-zinc-400' : 'text-emerald-100'}`}>
                              {new Date(messageTimestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 flex justify-between items-center flex-shrink-0 bg-white rounded-b-2xl">
              <span className="text-sm text-zinc-500">
                {sessionMessages.length} message{sessionMessages.length !== 1 ? 's' : ''} in this conversation
              </span>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedMessage(null);
                  setSessionMessages([]);
                  setTranslatedMessages(null);
                }}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};

export default ChatHistory;
