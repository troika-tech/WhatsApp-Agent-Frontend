import React, { useState, useEffect } from 'react';
import { FaUsers, FaPhone, FaSpinner, FaSearch, FaCalendar, FaEye, FaTimes, FaRobot, FaUser, FaComment, FaClock, FaFileDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { authAPI } from '../services/api';
import TranslationComponent from './TranslationComponent';

const Customers = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  // Modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState(null); // State for translated messages
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingPhoneNumber, setExportingPhoneNumber] = useState(null);
  const [phoneNumbersWithData, setPhoneNumbersWithData] = useState([]);
  const [phoneNumberCounts, setPhoneNumberCounts] = useState({});
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search query
    if (searchQuery.trim()) {
      const filtered = customers.filter(customer => 
        customer.phone.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.getAllContacts();

      if (response?.success) {
        const contacts = response.data?.contacts || [];

        // Sort contacts by firstContact date in descending order (most recent first)
        const sortedContacts = [...contacts].sort((a, b) => {
          const dateA = a.firstContact ? new Date(a.firstContact).getTime() : 0;
          const dateB = b.firstContact ? new Date(b.firstContact).getTime() : 0;
          return dateB - dateA; // Descending order
        });

        setCustomers(sortedContacts);
        setFilteredCustomers(sortedContacts);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load customers');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for CSV
  const formatDateForCSV = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // CSV building helper function
  const buildCSV = (rows) => {
    return rows
      .map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return '""';
          const safe = String(cell).replace(/"/g, '""');
          return `"${safe}"`;
        }).join(',')
      ).join('\n');
  };

  // Extract phone numbers with data
  const extractPhoneNumbersWithData = () => {
    if (filteredCustomers.length === 0) {
      setPhoneNumbersWithData([]);
      setPhoneNumberCounts({});
      return;
    }

    // Count customers per phone number
    const counts = {};
    filteredCustomers.forEach(customer => {
      const phone = customer.phone || '';
      counts[phone] = (counts[phone] || 0) + 1;
    });

    // Get unique phone numbers and sort
    const uniquePhones = Object.keys(counts)
      .filter(phone => phone) // Filter out empty strings
      .sort((a, b) => {
        // Sort by count (descending), then alphabetically
        if (counts[b] !== counts[a]) {
          return counts[b] - counts[a];
        }
        return a.localeCompare(b);
      });

    setPhoneNumbersWithData(uniquePhones);
    setPhoneNumberCounts(counts);
  };

  // Handle export modal open
  const handleOpenExportModal = () => {
    setShowExportModal(true);
    setLoadingPhoneNumbers(true);
    // Small delay to show loading state, then extract phone numbers
    setTimeout(() => {
      extractPhoneNumbersWithData();
      setLoadingPhoneNumbers(false);
    }, 100);
  };

  // Export all customers
  const handleExportAll = async () => {
    if (filteredCustomers.length === 0) {
      toast.warning('No customers to export');
      return;
    }

    try {
      setExportingAll(true);

      // Build CSV rows
      const rows = [
        ['Phone Number', 'Collected On', 'Message Count'],
      ];

      filteredCustomers.forEach((customer) => {
        rows.push([
          customer.phone || '',
          formatDateForCSV(customer.firstContact),
          customer.messageCount || 0,
        ]);
      });

      // Generate CSV
      const csvContent = buildCSV(rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = searchQuery.trim() 
        ? `customers-filtered-${dateStr}.csv`
        : `customers-all-${dateStr}.csv`;
      link.download = filename;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting customers:', err);
      toast.error('Failed to export customers. Please try again.');
    } finally {
      setExportingAll(false);
    }
  };

  // Export customers by specific phone number
  const handleExportByPhoneNumber = async (phoneNumber) => {
    if (!phoneNumber) return;

    try {
      setExportingPhoneNumber(phoneNumber);

      // Filter customers by phone number
      const customersForNumber = filteredCustomers.filter(
        customer => customer.phone === phoneNumber
      );

      if (customersForNumber.length === 0) {
        toast.warning(`No customers found for phone number "${phoneNumber}"`);
        setExportingPhoneNumber(null);
        return;
      }

      // Build CSV rows
      const rows = [
        ['Phone Number', 'Collected On', 'Message Count'],
      ];

      customersForNumber.forEach((customer) => {
        rows.push([
          customer.phone || '',
          formatDateForCSV(customer.firstContact),
          customer.messageCount || 0,
        ]);
      });

      // Generate CSV
      const csvContent = buildCSV(rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with phone number and date
      const dateStr = new Date().toISOString().split('T')[0];
      const safePhone = phoneNumber.replace(/[^0-9]/g, '').slice(-8); // Last 8 digits
      link.download = `customers-phone-${safePhone}-${dateStr}.csv`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting customers by phone number:', err);
      toast.error(`Failed to export customers for phone number "${phoneNumber}". Please try again.`);
    } finally {
      setExportingPhoneNumber(null);
    }
  };

  const handleViewChats = async (customer) => {
    setSelectedCustomer(customer);
    setShowChatModal(true);
    setChatLoading(true);
    setTranslatedMessages(null); // Reset translation on new chat

    try {
      const response = await authAPI.getChatHistory({
        phone: customer.phone
      });
      if (response?.success) {
        const messages = response.data?.messages || [];
        
        // Check for duplicates (same ID or same content+timestamp)
        const messageIds = new Set();
        const duplicateIds = [];
        const duplicateContent = [];
        messages.forEach((m, i) => {
          const msgId = String(m._id || m.id || i);
          if (messageIds.has(msgId)) {
            duplicateIds.push({idx: i, id: msgId});
          } else {
            messageIds.add(msgId);
          }
          // Check for duplicate content with same timestamp
          if (i > 0) {
            const prev = messages[i - 1];
            if (prev.content === m.content && prev.timestamp === m.timestamp && prev.sender === m.sender) {
              duplicateContent.push({idx: i, prevIdx: i - 1});
            }
          }
        });
        

        setChatMessages(messages);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedCustomer(null);
    setChatMessages([]);
    setTranslatedMessages(null); // Reset translation on modal close
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading customers...</p>
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
            <FaUsers className="h-3 w-3" />
            <span>Customer management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Customers
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View all customers who have shared their phone numbers
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <FaUsers className="text-emerald-600" size={16} />
          <span className="text-emerald-700 font-semibold">{customers.length}</span>
          <span className="text-emerald-600 text-sm">Total Customers</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <FaSearch className="text-white" size={16} />
          </div>
          <input
            type="text"
            placeholder="Search phone numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
          />
          <button
            onClick={handleOpenExportModal}
            disabled={customers.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export customers"
          >
            <FaFileDownload size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Customers Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-teal-600 to-cyan-600">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <span>#</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaPhone size={12} />
                    <span>Phone Number</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaClock size={12} />
                    <span>Collected On</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaComment size={12} />
                    <span>Messages</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <span>Action</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 text-sm">
                    <FaUsers className="mx-auto mb-3 text-zinc-300" size={32} />
                    <p>{customers.length === 0 ? 'No customers found' : 'No matching phone numbers'}</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <tr key={customer.phone} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-500">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <FaPhone size={16} />
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-600">{formatDate(customer.firstContact)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        <FaComment size={10} />
                        {customer.messageCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewChats(customer)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors text-sm font-medium"
                      >
                        <FaEye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/60">
          <div className="text-sm text-zinc-600">
            Showing <span className="font-medium text-zinc-900">{filteredCustomers.length}</span> of <span className="font-medium text-zinc-900">{customers.length}</span> customers
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <FaPhone className="text-white" size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedCustomer?.phone}
                  </h3>
                  <p className="text-emerald-100 text-xs">
                    {selectedCustomer?.messageCount || chatMessages.length} messages • First: {formatDate(selectedCustomer?.firstContact)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChatModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-white" size={20} />
              </button>
            </div>

            {/* Translation Component */}
            {chatMessages.length > 0 && (
              <div className="px-6 pt-4 pb-0">
                <TranslationComponent
                  content={chatMessages.map(msg => ({
                    speaker: msg.sender === 'user' ? 'user' : 'agent',
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
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <FaComment className="mx-auto mb-3 text-zinc-300" size={32} />
                  <p>No messages found</p>
                </div>
              ) : (
                (translatedMessages || chatMessages).map((msg, idx) => {
                  // Handle both original and translated message formats
                  const messageContent = msg.content || msg.text || '';
                  const messageSender = msg.sender || (msg.speaker === 'user' ? 'user' : 'agent');
                  const messageTimestamp = msg.timestamp;
                  const messageId = msg._id || msg.id || idx;
                  
                  return (
                    <div
                      key={messageId}
                      className={`flex ${messageSender === 'user' ? 'justify-end' : 'justify-start'} mt-4`}
                    >
                      <div className={`max-w-[80%] ${messageSender === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            messageSender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {messageSender === 'user' ? <FaUser size={12} /> : <FaRobot size={12} />}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {messageSender === 'user' ? 'User' : 'Bot'} • {formatDate(messageTimestamp)}
                          </span>
                        </div>
                        <div className={`p-3 rounded-xl ${
                          messageSender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-sm rounded-br-lg rounded-bl-lg'
                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm rounded-bl-lg rounded-br-lg'
                        }`}>
                          <div className={`text-sm prose prose-sm max-w-none ${
                            messageSender === 'user' ? 'prose-invert' : '[&_strong]:text-zinc-700 [&_strong]:font-semibold'
                          }`}>
                            <ReactMarkdown>{messageContent}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50/80 rounded-b-2xl">
              <p className="text-xs text-zinc-500 text-center">
                Total {selectedCustomer?.messageCount || chatMessages.length} messages from this customer
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full p-6 space-y-6 border border-zinc-200 max-h-[90vh] overflow-y-auto bg-white rounded-xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Export Customers</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {searchQuery.trim() 
                    ? `Exporting filtered customers: "${searchQuery}" • ${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`
                    : `Export all ${customers.length} customer${customers.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Export All Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <FaFileDownload className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Export All Customers</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Export all {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} {searchQuery.trim() ? 'matching your search' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExportAll}
                  disabled={exportingAll || filteredCustomers.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingAll ? (
                    <>
                      <FaSpinner className="animate-spin" size={12} />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FaFileDownload size={12} />
                      <span>Export All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Export by Phone Number Section */}
            {loadingPhoneNumbers ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaPhone className="text-emerald-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Phone Number</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-emerald-500" size={24} />
                  <span className="ml-3 text-sm text-zinc-600">Loading phone numbers...</span>
                </div>
              </div>
            ) : phoneNumbersWithData.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaPhone className="text-emerald-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Phone Number</h3>
                  <span className="text-xs text-zinc-500">({phoneNumbersWithData.length} phone number{phoneNumbersWithData.length !== 1 ? 's' : ''} available)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                  {phoneNumbersWithData.map((phoneNumber, idx) => {
                    const count = phoneNumberCounts[phoneNumber] || 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <FaPhone size={10} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900 truncate">{phoneNumber}</p>
                            <p className="text-xs text-zinc-500">
                              {count} customer{count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleExportByPhoneNumber(phoneNumber)}
                          disabled={exportingPhoneNumber === phoneNumber}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                        >
                          {exportingPhoneNumber === phoneNumber ? (
                            <>
                              <FaSpinner className="animate-spin" size={10} />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <FaFileDownload size={10} />
                              <span>Export</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FaPhone className="text-emerald-500" size={14} />
                  <h3 className="text-sm font-semibold text-zinc-900">Export by Phone Number</h3>
                </div>
                <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-50 rounded-lg border border-zinc-200">
                  <FaPhone className="text-zinc-300 mx-auto mb-2" size={32} />
                  <p>No phone numbers available</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <FaUsers className="text-zinc-300 mx-auto mb-2" size={32} />
                <p>No customers available for export</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-200">
              <p className="text-xs text-zinc-500 text-center">
                Exported files will be in CSV format and include: Phone Number, Collected On (Date), and Message Count
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

