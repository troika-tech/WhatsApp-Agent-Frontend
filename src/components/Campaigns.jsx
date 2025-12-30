import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaPlus, FaSearch, FaEdit, FaPause, FaPlay, FaChartLine, FaTrash, FaFilter, FaSpinner, FaUsers, FaEye, FaCalendar, FaUpload, FaFileAlt, FaDownload, FaTimes, FaBullseye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { callAPI, campaignAPI } from '../services/api';
import { API_BASE_URL } from '../config/api.config';

const Campaigns = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    phoneId: '',
    phoneNumbers: '',
    concurrentCalls: 2,
    includeGreeting: false,
    useScript: false,
    scriptFile: null,
  });
  const [concurrentCallsError, setConcurrentCallsError] = useState('');
  const [scheduleConcurrentCallsError, setScheduleConcurrentCallsError] = useState('');
  const [showCsvExample, setShowCsvExample] = useState(false);
  const csvFileInputRef = useRef(null);
  const scheduleCsvFileInputRef = useRef(null);
  const scriptFileInputRef = useRef(null);
  const scheduleScriptFileInputRef = useRef(null);
  const [scheduleData, setScheduleData] = useState({
    name: '',
    agentId: '',
    phoneId: '',
    phoneNumbers: '',
    concurrentCalls: 2,
    scheduleDate: '',
    scheduleTime: '',
    includeGreeting: false,
    useScript: false,
    scriptFile: null,
  });
  const [downloadingCallDetails, setDownloadingCallDetails] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  useEffect(() => {
    fetchCampaigns();
    // Get agentId and phoneId from localStorage (set during login via user's phone)
    const storedAgentId = localStorage.getItem('agentId');
    const storedPhoneId = localStorage.getItem('phoneId');
    if (storedAgentId) {
      setFormData(prev => ({ ...prev, agentId: storedAgentId, phoneId: storedPhoneId }));
      setScheduleData(prev => ({ ...prev, agentId: storedAgentId, phoneId: storedPhoneId }));
    }
    // Auto-refresh every 5 seconds to show updated campaign status
    const interval = setInterval(() => fetchCampaigns(false), 5000);
    return () => clearInterval(interval);
  }, [filterStatus, searchQuery]);

  const handleCsvImport = (file, isSchedule = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Extract phone numbers from CSV (handle both single column and multiple columns)
        const phoneNumbers = [];
        let hasHeader = false;
        let phoneColumnIndex = 0;
        
        lines.forEach((line, index) => {
          // Check if first line is a header
          if (index === 0) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('phone') || lowerLine.includes('number') || lowerLine.includes('name')) {
              hasHeader = true;
              // Determine which column has phone numbers
              const columns = line.split(',').map(col => col.trim().toLowerCase());
              const phoneIndex = columns.findIndex(col => col.includes('phone') || col.includes('number'));
              phoneColumnIndex = phoneIndex >= 0 ? phoneIndex : (columns.length > 1 ? 1 : 0);
              return;
            }
          }
          
          // Skip header row
          if (hasHeader && index === 0) return;
          
          // Split by comma
          const columns = line.split(',').map(col => col.trim());
          
          // Determine phone number column
          let phoneNumber;
          if (hasHeader) {
            // Use the column index we found from header
            phoneNumber = columns[phoneColumnIndex] || columns[0];
          } else {
            // If no header, first column is phone number (new format: phone_number, name)
            phoneNumber = columns[0];
          }
          
          // Remove quotes if present
          const cleanNumber = phoneNumber ? phoneNumber.replace(/^["']|["']$/g, '') : '';
          
          if (cleanNumber && /^[0-9+\-() ]+$/.test(cleanNumber.replace(/\s/g, ''))) {
            phoneNumbers.push(cleanNumber);
          }
        });

        if (phoneNumbers.length === 0) {
          toast.warning('No valid phone numbers found in CSV file. Please check the format.');
          return;
        }

        const phoneNumbersText = phoneNumbers.join('\n');
        
        if (isSchedule) {
          setScheduleData({ ...scheduleData, phoneNumbers: phoneNumbersText });
        } else {
          setFormData({ ...formData, phoneNumbers: phoneNumbersText });
        }
        
        toast.success(`Successfully imported ${phoneNumbers.length} phone number(s) from CSV!`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error reading CSV file. Please make sure the file format is correct.');
      }
    };
    reader.onerror = () => {
      toast.error('Error reading file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleCsvFileSelect = (e, isSchedule = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.warning('Please select a CSV file.');
      return;
    }

    handleCsvImport(file, isSchedule);
    // Reset file input
    e.target.value = '';
  };

  const downloadCsvExample = () => {
    // Format phone numbers with leading apostrophe to force Excel to treat them as text
    // This prevents Excel from converting large numbers to scientific notation
    // The apostrophe won't be visible in Excel cells
    const csvContent = 'number,name\n\'9821211755,John Doe\n\'9876543210,Jane Smith\n\'9123456789,Bob Johnson\n\'9988776655,Alice Williams';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'phone_numbers_example.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const fetchCampaigns = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const params = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await campaignAPI.list(params);
      // Ensure we always set an array
      const campaignsData = response.data;
      if (Array.isArray(campaignsData)) {
        setCampaigns(campaignsData);
      } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
        setCampaigns(campaignsData.campaigns);
      } else {

        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      // Better error message for network errors
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server with: node server.js');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load campaigns');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate agent and phone selection
      if (!formData.agentId || !formData.phoneId) {
        toast.warning('Phone configuration missing. Please logout and login again to refresh your phone settings.');
        setLoading(false);
        return;
      }

      // Parse phone numbers from textarea (one per line or comma-separated)
      const phoneNumbers = formData.phoneNumbers
        .split(/[,\n]/)
        .map(num => num.trim())
        .filter(num => num.length > 0);

      if (phoneNumbers.length === 0) {
        alert('Please enter at least one phone number');
        setLoading(false);
        return;
      }

      // Step 1: Create campaign
      const response = await campaignAPI.create(
        formData.name,
        formData.agentId,
        formData.phoneId,
        parseInt(formData.concurrentCalls) || 2
      );

      if (response.success && response.data?._id) {
        // Step 2: Add contacts to campaign
        try {
          const contactsResponse = await campaignAPI.addContacts(response.data._id, phoneNumbers);

          if (contactsResponse.success && contactsResponse.data) {
            const { added, duplicates, errors } = contactsResponse.data;

            if (added === 0 && errors > 0) {
              toast.error(`Campaign created but failed to add contacts. ${errors} errors occurred.`);
              setLoading(false);
              return;
            }
          }

          // If script file is uploaded, set status to waiting_for_approval
          if (formData.scriptFile) {
            try {
              // Update campaign status to waiting_for_approval
              await campaignAPI.update(response.data._id, { status: 'waiting_for_approval' });
              
              toast.success(`Campaign "${formData.name}" created successfully with ${phoneNumbers.length} numbers! Script uploaded. Waiting for approval.`);
              setShowCreateModal(false);
              setConcurrentCallsError('');
              setFormData({ name: '', agentId: formData.agentId, phoneId: formData.phoneId, phoneNumbers: '', concurrentCalls: 2, includeGreeting: false, useScript: false, scriptFile: null });
              if (scriptFileInputRef.current) {
                scriptFileInputRef.current.value = '';
              }
              fetchCampaigns();
              return;
            } catch (updateErr) {
              console.error('Error updating campaign status:', updateErr);
              toast.error(`Campaign created but failed to update status: ${updateErr.response?.data?.error || updateErr.message}`);
            }
          }

          toast.success(`Campaign "${formData.name}" created successfully with ${phoneNumbers.length} numbers!`);
          setShowCreateModal(false);
          setConcurrentCallsError('');
          setFormData({ name: '', agentId: formData.agentId, phoneId: formData.phoneId, phoneNumbers: '', concurrentCalls: 2, includeGreeting: false, useScript: false, scriptFile: null });
          if (scriptFileInputRef.current) {
            scriptFileInputRef.current.value = '';
          }
          fetchCampaigns();

          // Auto-start the campaign

          try {
            await handleStartCampaign(response.data._id);
            toast.success('Campaign started! Calls are being initiated...');
          } catch (err) {
            console.error('Error auto-starting campaign:', err);
            toast.error(`Campaign created but failed to start: ${err.message || 'Unknown error'}`);
          }
        } catch (contactErr) {
          console.error('Error adding contacts:', contactErr);
          toast.error(`Campaign created but failed to add contacts: ${contactErr.response?.data?.error || contactErr.message}`);
        }
      } else {
        toast.error(`Error: ${response.error || 'Failed to create campaign'}`);
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.response?.data?.details?.[0] || err.message || 'Failed to create campaign'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCampaign = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate agent and phone selection
      if (!scheduleData.agentId || !scheduleData.phoneId) {
        toast.warning('Phone configuration missing. Please logout and login again to refresh your phone settings.');
        setLoading(false);
        return;
      }

      // Validate schedule date and time
      if (!scheduleData.scheduleDate || !scheduleData.scheduleTime) {
        toast.warning('Please select both date and time for scheduling');
        setLoading(false);
        return;
      }

      // Parse phone numbers from textarea (one per line or comma-separated)
      const phoneNumbers = scheduleData.phoneNumbers
        .split(/[,\n]/)
        .map(num => num.trim())
        .filter(num => num.length > 0);

      if (phoneNumbers.length === 0) {
        toast.warning('Please enter at least one phone number');
        setLoading(false);
        return;
      }

      // Combine date and time
      const scheduleDateTime = new Date(`${scheduleData.scheduleDate}T${scheduleData.scheduleTime}`);
      const now = new Date();

      if (scheduleDateTime <= now) {
        toast.warning('Please select a future date and time');
        setLoading(false);
        return;
      }

      // Step 1: Create campaign
      const response = await campaignAPI.create(
        scheduleData.name,
        scheduleData.agentId,
        scheduleData.phoneId,
        parseInt(scheduleData.concurrentCalls) || 2
      );

      if (response.success && response.data?._id) {
        // Step 2: Add contacts to campaign
        try {
          await campaignAPI.addContacts(response.data._id, phoneNumbers);

          toast.success(`Campaign "${scheduleData.name}" scheduled successfully for ${scheduleDateTime.toLocaleString()}!`);
          setShowScheduleModal(false);
          setScheduleConcurrentCallsError('');
          setScheduleData({
            name: '',
            agentId: scheduleData.agentId,
            phoneId: scheduleData.phoneId,
            phoneNumbers: '',
            concurrentCalls: 2,
            scheduleDate: '',
            scheduleTime: '',
            includeGreeting: false
          });
          fetchCampaigns();

          // Note: In a real implementation, you would:
          // 1. Store the scheduleDateTime in the campaign document
          // 2. Set up a cron job or scheduler to start the campaign at that time
          // 3. Or use a job queue system like Bull, Agenda, etc.
        } catch (contactErr) {
          console.error('Error adding contacts:', contactErr);
          toast.error(`Campaign created but failed to add contacts: ${contactErr.response?.data?.error || contactErr.message}`);
        }
      } else {
        toast.error(`Error: ${response.error || 'Failed to create campaign'}`);
      }
    } catch (err) {
      console.error('Error scheduling campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.response?.data?.details?.[0] || err.message || 'Failed to schedule campaign'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId) => {
    try {
      const response = await campaignAPI.start(campaignId);
      if (response.success) {
        toast.success('Campaign started successfully');
        fetchCampaigns(false); // Refresh without loading
      }
    } catch (err) {
      console.error('Error starting campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.message || 'Failed to start campaign'}`);
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
      const response = await campaignAPI.pause(campaignId);
      if (response.success) {
        toast.success('Campaign paused successfully');
        fetchCampaigns(false);
      }
    } catch (err) {
      console.error('Error pausing campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.message || 'Failed to pause campaign'}`);
    }
  };

  const handleResumeCampaign = async (campaignId) => {
    try {
      const response = await campaignAPI.resume(campaignId);
      if (response.success) {
        toast.success('Campaign resumed successfully');
        fetchCampaigns(false);
      }
    } catch (err) {
      console.error('Error resuming campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.message || 'Failed to resume campaign'}`);
    }
  };

  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to cancel this campaign? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await campaignAPI.cancel(campaignId);
      if (response.success) {
        toast.success('Campaign cancelled successfully');
        fetchCampaigns(false);
      }
    } catch (err) {
      console.error('Error canceling campaign:', err);
      toast.error(`Error: ${err.response?.data?.error || err.message || 'Failed to cancel campaign'}`);
    }
  };

  const handleDownloadCallDetails = async () => {
    if (!selectedCampaign) return;
    try {
      setDownloadingCallDetails(true);

      // Fetch all contacts for the campaign with pagination
      let allContacts = [];
      let page = 1;
      let hasMore = true;
      const limit = 10000; // Max allowed by backend validation - supports large campaigns

      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/api/v1/campaigns/${selectedCampaign._id}/contacts?page=${page}&limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch campaign contacts');
        }

        const data = await response.json();
        const contacts = data?.data?.contacts || [];
        allContacts = [...allContacts, ...contacts];

        // Check if there are more pages
        const totalPages = data?.data?.pages || 1;
        hasMore = page < totalPages;
        page++;
      }

      const contacts = allContacts;

      if (contacts.length === 0) {
        toast.warning('No contacts available to download for this campaign.');
        return;
      }

      // Create CSV with contact details including status
      const csvRows = ['Phone Number,Name,Status,Attempts,Last Error'];
      contacts.forEach((contact) => {
        const phoneNumber = contact.phoneNumber || '';
        const name = contact.name || '';
        const status = contact.status || '';
        const attempts = contact.attempts || 0;
        const lastError = contact.lastError || '';
        csvRows.push(`${phoneNumber},"${name}",${status},${attempts},"${lastError}"`);
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${selectedCampaign.name || selectedCampaign._id}-contacts.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contact details:', error);
      toast.error('Failed to download contact details. Please try again.');
    } finally {
      setDownloadingCallDetails(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'active': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'pending': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'paused': 'bg-orange-50 text-orange-700 border border-orange-200',
      'completed': 'bg-blue-50 text-blue-700 border border-blue-200',
      'failed': 'bg-red-50 text-red-700 border border-red-200',
      'cancel': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'cancelled': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'waiting_for_approval': 'bg-purple-50 text-purple-700 border border-purple-200',
    };
    const statusLabels = {
      'cancel': 'Cancelled',
      'cancelled': 'Cancelled',
      'waiting_for_approval': 'Waiting for approval',
    };
    return (
      <span
        className={`px-2 py-0.5 inline-flex text-[11px] font-medium rounded-full ${styles[status] || styles.pending}`}
      >
        {statusLabels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown')}
      </span>
    );
  };

  // Filter campaigns by search query
  const filteredCampaigns = useMemo(() => {
    // Ensure campaigns is always an array
    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
    let filtered = campaignsArray;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(query) ||
        campaign._id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [campaigns, searchQuery]);

  // Update pagination when filtered data changes
  useEffect(() => {
    const total = filteredCampaigns.length;
    const pages = Math.ceil(total / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total,
      pages,
      page: prev.page > pages && pages > 0 ? 1 : prev.page
    }));
  }, [filteredCampaigns.length, pagination.limit]);

  // Get paginated data
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredCampaigns.slice(startIndex, endIndex);
  }, [filteredCampaigns, pagination.page, pagination.limit]);

  if (loading && campaigns.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaBullseye className="h-3 w-3" />
            <span>Campaign orchestration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Campaigns
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create and manage bulk calling campaigns
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-6 sm:mt-4">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-all"
          >
            <FaCalendar />
            <span>Schedule Campaign</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-all"
          >
            <FaPlus />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="glass-panel p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FaFilter className="text-zinc-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="waiting_for_approval">Waiting for Approval</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Campaign Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Total Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Concurrent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-[0.16em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No campaigns found. Create your first campaign!
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((campaign) => {
                  // Progress includes both completed and failed calls (all processed calls)
                  // CRITICAL: Cap at 100% to prevent showing more than 100% progress
                  const processedCalls = (campaign.completedCalls || 0) + (campaign.failedCalls || 0);
                  const processedCallsCapped = Math.min(processedCalls, campaign.totalContacts); // Cap at totalContacts
                  const progress = campaign.totalContacts > 0
                    ? Math.min(Math.round((processedCallsCapped / campaign.totalContacts) * 100), 100) // Cap at 100%
                    : 0;
                  const remaining = Math.max(0, campaign.totalContacts - processedCallsCapped); // Don't show negative
                  
                  return (
                    <tr
                      key={campaign._id}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900">
                          {campaign.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="flex-1 bg-zinc-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-zinc-700 min-w-[60px]">
                            {progress}%
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {processedCallsCapped} / {campaign.totalContacts} processed
                          {campaign.completedCalls > 0 && (
                            <span className="text-emerald-600 ml-2">
                              ({campaign.completedCalls} completed)
                            </span>
                          )}
                          {campaign.failedCalls > 0 && (
                            <span className="text-red-600 ml-2">
                              ({campaign.failedCalls} failed)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-zinc-900 font-medium">
                          {campaign.totalContacts}
                        </div>
                        {remaining > 0 && (
                          <div className="text-xs text-zinc-500">
                            {remaining} in queue
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">
                        {campaign.settings?.concurrentCallsLimit || 2} at a time
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {campaign.status === 'active' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePauseCampaign(campaign._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                              style={{ borderRadius: '9999px' }}
                            >
                              <FaPause size={12} />
                              <span>Pause</span>
                            </button>
                            <button
                              onClick={() => handleCancelCampaign(campaign._id)}
                              className="inline-flex items-center justify-center w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-medium transition-colors shrink-0"
                              style={{ borderRadius: '9999px' }}
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                        ) : campaign.status === 'paused' ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleResumeCampaign(campaign._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                              style={{ borderRadius: '9999px' }}
                            >
                              <FaPlay size={12} />
                              <span>Resume</span>
                            </button>
                            {campaign.metadata?.pauseReason === 'insufficient_credits' && (
                              <div className="text-xs text-red-600 font-medium mt-1">
                                ⚠ No credits
                              </div>
                            )}
                          </div>
                        ) : (
                          getStatusBadge(campaign.status)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowViewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                            style={{ borderRadius: '9999px' }}
                          >
                            <FaEye size={12} />
                            <span>View</span>
                          </button>
                          {campaign.status === 'pending' && (
                            <button
                              onClick={() => handleStartCampaign(campaign._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors shrink-0 max-w-fit"
                              style={{ borderRadius: '9999px' }}
                            >
                              <FaPlay size={12} />
                              <span>Start</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> campaigns
            </div>
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
          </div>
        )}
      </div>

      {/* View Campaign Details Modal */}
      {showViewModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Campaign Details
                </h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCampaign(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Campaign ID
                    </label>
                    <p className="text-sm text-zinc-900 font-mono break-all">
                      {selectedCampaign._id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Campaign Name
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Created At
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.createdAt ? new Date(selectedCampaign.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(',', ' at') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Start Time
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.startedAt ? new Date(selectedCampaign.startedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(',', ' at') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      End Time
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.completedAt ? new Date(selectedCampaign.completedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(',', ' at') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Status
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedCampaign.status)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Total Numbers
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.totalContacts || 0}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Active Calls
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.activeCalls || 0}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Completed Calls
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.completedCalls || 0}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Failed Calls
                    </label>
                    <p className="text-sm text-zinc-900">
                      {selectedCampaign.failedCalls || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleDownloadCallDetails}
                  disabled={downloadingCallDetails}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloadingCallDetails ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      <span>Download Contact Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCampaign(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-zinc-200 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Create Bulk Campaign
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setConcurrentCallsError('');
                    setFormData({ ...formData, useScript: false, scriptFile: null });
                    if (scriptFileInputRef.current) {
                      scriptFileInputRef.current.value = '';
                    }
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your campaign name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Phone Numbers * (One per line or comma-separated)
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="9821211755&#10;9876543210&#10;9123456789&#10;9988776655"
                  value={formData.phoneNumbers}
                  onChange={(e) => setFormData({ ...formData, phoneNumbers: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 font-mono text-xs"
                />
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={csvFileInputRef}
                      accept=".csv"
                      onChange={(e) => handleCsvFileSelect(e, false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => csvFileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FaUpload size={14} />
                      <span>Import CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCsvExample(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FaFileAlt size={14} />
                      <span>CSV Example</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.includeGreeting}
                      onChange={(e) => setFormData({ ...formData, includeGreeting: e.target.checked })}
                      className="w-4 h-4 text-emerald-500 bg-white border-zinc-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                    />
                    <label className="text-xs font-medium text-zinc-700">
                      Include Greeting
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Script Upload Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.useScript}
                    onChange={(e) => {
                      setFormData({ ...formData, useScript: e.target.checked, scriptFile: e.target.checked ? formData.scriptFile : null });
                      if (!e.target.checked && scriptFileInputRef.current) {
                        scriptFileInputRef.current.value = '';
                      }
                    }}
                    className="w-4 h-4 text-emerald-500 bg-white border-zinc-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                  />
                  <label className="text-xs font-medium text-zinc-700">
                    Additional
                  </label>
                </div>
                {formData.useScript && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-2">
                      Upload Script
                    </label>
                    <input
                      type="file"
                      ref={scriptFileInputRef}
                      accept=".csv,.txt"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormData({ ...formData, scriptFile: file });
                        }
                      }}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                    />
                    {formData.scriptFile && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Selected: {formData.scriptFile.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Active Calls (At a time)
                </label>
                <input
                  type="number"
                  min="1"
                  max="2"
                  value={formData.concurrentCalls}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    if (value > 2) {
                      setConcurrentCallsError('Maximum 2 only');
                      setFormData({ ...formData, concurrentCalls: 2 });
                    } else {
                      setConcurrentCallsError('');
                      setFormData({ ...formData, concurrentCalls: value });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs ${
                    concurrentCallsError ? 'border-red-300' : 'border-zinc-200'
                  }`}
                />
                {concurrentCallsError && (
                  <p className="text-xs text-red-500 mt-2">
                    {concurrentCallsError}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800 font-medium">
                  <strong>How it works:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Campaign will automatically start after creation</li>
                  <li>{formData.concurrentCalls || 2} calls will be made at a time</li>
                  <li>Remaining numbers will wait in queue</li>
                  <li>When a call ends, next number from queue will be called automatically</li>
                  <li>You can pause/resume the campaign anytime</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setConcurrentCallsError('');
                    setFormData({ ...formData, useScript: false, scriptFile: null });
                    if (scriptFileInputRef.current) {
                      scriptFileInputRef.current.value = '';
                    }
                  }}
                  className="px-6 py-2 border border-zinc-300 rounded-full text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading 
                    ? 'Creating...' 
                    : formData.scriptFile 
                      ? 'Send for Approval' 
                      : 'Create & Start Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Campaign Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-zinc-200 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Schedule Campaign
                </h2>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleConcurrentCallsError('');
                    setScheduleData({ 
                      name: '', 
                      phoneNumbers: '', 
                      concurrentCalls: 2,
                      scheduleDate: '',
                      scheduleTime: '',
                      includeGreeting: false,
                      useScript: false,
                      scriptFile: null
                    });
                    if (scheduleScriptFileInputRef.current) {
                      scheduleScriptFileInputRef.current.value = '';
                    }
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleScheduleCampaign} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={scheduleData.name}
                  onChange={(e) => setScheduleData({ ...scheduleData, name: e.target.value })}
                  placeholder="Enter campaign name"
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Phone Numbers (one per line or comma-separated)
                </label>
                <textarea
                  required
                  value={scheduleData.phoneNumbers}
                  onChange={(e) => setScheduleData({ ...scheduleData, phoneNumbers: e.target.value })}
                  placeholder="+1234567890&#10;+1234567891&#10;+1234567892"
                  rows={6}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 font-mono text-xs"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Enter phone numbers, one per line or separated by commas
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={scheduleCsvFileInputRef}
                      accept=".csv"
                      onChange={(e) => handleCsvFileSelect(e, true)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => scheduleCsvFileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FaUpload size={14} />
                      <span>Import CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCsvExample(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FaFileAlt size={14} />
                      <span>CSV Example</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduleData.includeGreeting}
                      onChange={(e) => setScheduleData({ ...scheduleData, includeGreeting: e.target.checked })}
                      className="w-4 h-4 text-emerald-500 bg-white border-zinc-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                    />
                    <label className="text-xs font-medium text-zinc-700">
                      Include Greeting
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Script Upload Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={scheduleData.useScript}
                    onChange={(e) => {
                      setScheduleData({ ...scheduleData, useScript: e.target.checked, scriptFile: e.target.checked ? scheduleData.scriptFile : null });
                      if (!e.target.checked && scheduleScriptFileInputRef.current) {
                        scheduleScriptFileInputRef.current.value = '';
                      }
                    }}
                    className="w-4 h-4 text-emerald-500 bg-white border-zinc-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                  />
                  <label className="text-xs font-medium text-zinc-700">
                    Additional
                  </label>
                </div>
                {scheduleData.useScript && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-2">
                      Upload Script
                    </label>
                    <input
                      type="file"
                      ref={scheduleScriptFileInputRef}
                      accept=".csv,.txt"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setScheduleData({ ...scheduleData, scriptFile: file });
                        }
                      }}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                    />
                    {scheduleData.scriptFile && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Selected: {scheduleData.scriptFile.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Active Calls (At a time)
                </label>
                <input
                  type="number"
                  min="1"
                  max="2"
                  value={scheduleData.concurrentCalls}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    if (value > 2) {
                      setScheduleConcurrentCallsError('Maximum 2 only');
                      setScheduleData({ ...scheduleData, concurrentCalls: 2 });
                    } else {
                      setScheduleConcurrentCallsError('');
                      setScheduleData({ ...scheduleData, concurrentCalls: value });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs ${
                    scheduleConcurrentCallsError ? 'border-red-300' : 'border-zinc-200'
                  }`}
                />
                {scheduleConcurrentCallsError && (
                  <p className="text-xs text-red-500 mt-2">
                    {scheduleConcurrentCallsError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-2">
                    Schedule Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleData.scheduleDate}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduleDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-2">
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleData.scheduleTime}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduleTime: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
                  />
                </div>
              </div>

              {scheduleData.scheduleDate && scheduleData.scheduleTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800">
                    <strong>Scheduled for:</strong>{' '}
                    {new Date(`${scheduleData.scheduleDate}T${scheduleData.scheduleTime}`).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleConcurrentCallsError('');
        setScheduleData({ 
          name: '', 
          phoneNumbers: '', 
          concurrentCalls: 2,
          scheduleDate: '',
          scheduleTime: '',
          includeGreeting: false,
          useScript: false,
          scriptFile: null
        });
        if (scheduleScriptFileInputRef.current) {
          scheduleScriptFileInputRef.current.value = '';
        }
                  }}
                  className="px-6 py-2 border border-zinc-300 rounded-full text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading 
                    ? 'Scheduling...' 
                    : scheduleData.scriptFile 
                      ? 'Send for Approval' 
                      : 'Schedule Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Example Modal */}
      {showCsvExample && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  CSV Example Format
                </h2>
                <button
                  onClick={() => setShowCsvExample(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600">
                Your CSV file should have number and name columns. You can include a header row (optional).
              </p>
              
              <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                <h3 className="text-xs font-semibold text-zinc-700 mb-3">
                  Example CSV Format:
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-zinc-300 bg-white">
                    <thead>
                      <tr className="bg-zinc-100">
                        <th className="border border-zinc-300 px-4 py-2 text-left text-xs font-semibold text-zinc-700">number</th>
                        <th className="border border-zinc-300 px-4 py-2 text-left text-xs font-semibold text-zinc-700">name</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-zinc-50">
                        <td className="border border-zinc-300 px-4 py-2 text-xs font-mono text-zinc-800">9821211755</td>
                        <td className="border border-zinc-300 px-4 py-2 text-xs text-zinc-800">John Doe</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="border border-zinc-300 px-4 py-2 text-xs font-mono text-zinc-800">9876543210</td>
                        <td className="border border-zinc-300 px-4 py-2 text-xs text-zinc-800">Jane Smith</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="border border-zinc-300 px-4 py-2 text-xs font-mono text-zinc-800">9123456789</td>
                        <td className="border border-zinc-300 px-4 py-2 text-xs text-zinc-800">Bob Johnson</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="border border-zinc-300 px-4 py-2 text-xs font-mono text-zinc-800">9988776655</td>
                        <td className="border border-zinc-300 px-4 py-2 text-xs text-zinc-800">Alice Williams</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">
                  Notes:
                </h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>CSV should have two columns: number and name</li>
                  <li>First column should contain phone numbers</li>
                  <li>Second column should contain names (optional, can be empty)</li>
                  <li>Header row is optional (will be automatically skipped)</li>
                  <li>Phone numbers can include digits, +, -, (, ), and spaces</li>
                  <li>To prevent Excel from converting numbers to scientific notation, wrap phone numbers in quotes: "9821211755"</li>
                  <li>Empty lines will be ignored</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowCsvExample(false)}
                  className="px-6 py-2 border border-zinc-300 rounded-full text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCsvExample();
                    setShowCsvExample(false);
                  }}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
                >
                  Download Example CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
