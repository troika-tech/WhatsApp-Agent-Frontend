import React, { useState, useEffect, useRef } from 'react';
import { FaSpinner, FaTrash, FaQrcode, FaMobileAlt, FaGlobe, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const platformIcons = {
  chrome: "🌐",
  windows: "🪟",
  macos: "🍎",
  ubuntu: "🐧",
};

const WhatsAppAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [authMode, setAuthMode] = useState('qr');
  const [initLoading, setInitLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [selectedBrowserType, setSelectedBrowserType] = useState('chrome');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountTorSettings, setAccountTorSettings] = useState({});
  const [torCountries, setTorCountries] = useState([]);
  const [loadingTorCountries, setLoadingTorCountries] = useState(false);
  const [currentIP, setCurrentIP] = useState('');
  const [fetchingIP, setFetchingIP] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadAccounts();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/accounts');
      const accountsData = response.data.accounts || [];
      // Reverse to show last added first
      setAccounts([...accountsData].reverse());
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTorEnabled = (accountId) => accountTorSettings[accountId]?.useTor || false;
  const getAccountTorCountry = (accountId) => accountTorSettings[accountId]?.countryCode || '';
  const setAccountTorEnabled = (accountId, enabled) => {
    setAccountTorSettings(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], useTor: enabled, countryCode: prev[accountId]?.countryCode || '' }
    }));
  };
  const setAccountTorCountry = (accountId, countryCode) => {
    setAccountTorSettings(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], useTor: prev[accountId]?.useTor || false, countryCode }
    }));
  };

  const loadTorCountries = async () => {
    if (torCountries.length > 0) return;
    setLoadingTorCountries(true);
    try {
      const response = await api.get('/api/whatsapp/tor-countries');
      if (response.data.success && response.data.countries) {
        setTorCountries(response.data.countries);
      }
    } catch (error) {
      console.error('Error loading Tor countries:', error);
    } finally {
      setLoadingTorCountries(false);
    }
  };

  useEffect(() => {
    const anyTorEnabled = Object.values(accountTorSettings).some(settings => settings.useTor);
    if (anyTorEnabled && torCountries.length === 0) {
      loadTorCountries();
    }
  }, [accountTorSettings]);

  const createAccount = async () => {
    if (!newAccountName.trim() || !newPhoneNumber.trim()) {
      toast.warning('Please enter account name and phone number');
      return;
    }

    setAddingAccount(true);
    try {
      const response = await api.post('/api/accounts', {
        accountName: newAccountName.trim(),
        phoneNumber: newPhoneNumber.trim()
      });

      if (response.data.success) {
        toast.success('Account created successfully');
        setShowAddModal(false);
        setNewAccountName('');
        setNewPhoneNumber('');
        loadAccounts();
      }
    } catch (error) {
      console.error('Create account error:', error);
      toast.error(error.response?.data?.error || 'Failed to create account');
    } finally {
      setAddingAccount(false);
    }
  };

  const fetchCurrentIP = async (accountId) => {
    setFetchingIP(true);
    try {
      const response = await api.post(`/api/whatsapp/get-ip/${accountId}`, {
        useTor: getAccountTorEnabled(accountId)
      });
      if (response.data.success && response.data.ip) {
        setCurrentIP(response.data.ip);
      }
    } catch (error) {
      console.error('Failed to fetch IP:', error);
      setCurrentIP('Failed to fetch IP');
    } finally {
      setFetchingIP(false);
    }
  };

  const initWhatsApp = async (accountId, mode = 'qr', phoneNumber, browserType) => {
    setInitLoading(true);
    setSelectedAccountId(accountId);
    setAuthMode(mode);
    fetchCurrentIP(accountId);

    const useTor = getAccountTorEnabled(accountId);
    const torCountry = getAccountTorCountry(accountId);

    try {
      const response = await api.post(`/api/whatsapp/init/${accountId}`, {
        usePairingCode: mode === 'pairing',
        phoneNumber: phoneNumber,
        browserType: browserType || selectedBrowserType,
        useTor: useTor,
        torCountryCode: useTor && torCountry ? torCountry : undefined,
      });

      if (mode === 'pairing' && response.data.pairingCode) {
        setPairingCode(response.data.pairingCode);
        setConnectionStatus('Waiting for pairing code entry...');
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }

        setTimeout(() => {
          pollingIntervalRef.current = setInterval(async () => {
            try {
              const statusRes = await api.get(`/api/whatsapp/status/${accountId}`);
              if (statusRes.data.isConnected) {
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                setPairingCode(null);
                setSelectedAccountId(null);
                setConnectionStatus(`Connected via ${platformIcons[browserType] || '🌐'} ${(browserType || 'chrome').charAt(0).toUpperCase() + (browserType || 'chrome').slice(1)}!`);
                loadAccounts();
              }
            } catch (err) {
              console.error('Status check error:', err);
            }
          }, 5000);
        }, 3000);

        setTimeout(() => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }, 120000);

      } else if (response.data.needsQR) {
        setQrCode(response.data.qrCode);
        
        const interval = setInterval(async () => {
          try {
            const statusRes = await api.get(`/api/whatsapp/status/${accountId}`);
            if (statusRes.data.isConnected) {
              clearInterval(interval);
              setQrCode(null);
              setSelectedAccountId(null);
              loadAccounts();
            }
          } catch (err) {
            console.error('Status check error:', err);
          }
        }, 3000);

        setTimeout(() => clearInterval(interval), 120000);

      } else {
        loadAccounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initialize');
    } finally {
      setInitLoading(false);
    }
  };

  const autoConnect = async (accountId) => {
    setInitLoading(true);
    setSelectedAccountId(accountId);

    try {
      const loadingToast = toast.info('Connecting...', { autoClose: false });

      // Try to auto-connect with 30 second timeout
      const response = await api.post(
        `/api/whatsapp/auto-connect/${accountId}`,
        {},
        { timeout: 30000 } // 30 second timeout
      );

      toast.dismiss(loadingToast);

      if (response.data.connected) {
        toast.success('Connected successfully!');
        loadAccounts();
      } else if (response.data.needsAuth) {
        toast.error('Your account has been disconnected. Connect again', {
          autoClose: 4000
        });
      }
    } catch (error) {
      console.error('Auto-connect error:', error);
      toast.error('Your account has been disconnected. Connect again', {
        autoClose: 4000
      });
    } finally {
      setInitLoading(false);
      setSelectedAccountId(null);
    }
  };

  const disconnect = async (accountId) => {
    try {
      await api.post(`/api/whatsapp/disconnect/${accountId}`, {});
      toast.success('WhatsApp disconnected successfully');
      loadAccounts();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect');
    }
  };

  const handleDeleteClick = (accountId, accountName) => {
    setAccountToDelete({ id: accountId, name: accountName });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      await api.delete(`/api/accounts/${accountToDelete.id}`);
      toast.success(`Account "${accountToDelete.name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading WhatsApp accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            WhatsApp Accounts
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your connected WhatsApp accounts
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all"
        >
          + Add Account
        </button>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Add New WhatsApp Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Business Account 2"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Phone Number (with country code)
                </label>
                <input
                  type="text"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="e.g., 919876543210"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Enter number without + or spaces (e.g., 919876543210 for India)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAccountName('');
                    setNewPhoneNumber('');
                  }}
                  className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createAccount}
                  disabled={addingAccount}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                >
                  {addingAccount ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200 relative">
            <button
              onClick={() => {
                setQrCode(null);
                setSelectedAccountId(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <FaTimesCircle size={24} />
            </button>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Scan QR Code</h2>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="mt-4 text-center">
                <p className="text-zinc-600 mb-2">Open WhatsApp on your phone</p>
                <ol className="text-sm text-zinc-500 text-left space-y-1">
                  <li>1. Go to Settings → Linked Devices</li>
                  <li>2. Tap &quot;Link a Device&quot;</li>
                  <li>3. Scan this QR code</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Code Modal */}
      {pairingCode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg border border-zinc-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setPairingCode(null);
                setSelectedAccountId(null);
                setConnectionStatus('');
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <FaTimesCircle size={24} />
            </button>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Pairing Code</h2>
            <div className="flex flex-col items-center">
              <div className="text-5xl font-mono font-bold text-emerald-600 tracking-wider mb-6 bg-emerald-50 px-8 py-4 rounded-xl border border-emerald-200">
                {pairingCode}
              </div>

              {connectionStatus && (
                <div className={`mb-4 px-4 py-2 rounded-full text-sm font-medium ${
                  connectionStatus.includes('Connected') ? 'bg-emerald-100 text-emerald-700' :
                  connectionStatus.includes('Pairing successful') || connectionStatus.includes('Connecting') ? 'bg-blue-100 text-blue-800 animate-pulse' :
                  connectionStatus.includes('Disconnected') ? 'bg-red-100 text-red-800' :
                  'bg-zinc-100 text-zinc-800'
                }`}>
                  {connectionStatus.includes('Connecting') || connectionStatus.includes('reconnecting') ? '🔄 ' : ''}
                  {connectionStatus.includes('Connected') ? '✅ ' : ''}
                  {connectionStatus}
                </div>
              )}

              <div className="mt-4 text-center max-w-md">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">Important:</p>
                  <p className="text-xs text-yellow-700">
                    If WhatsApp says &quot;wrong number&quot; or &quot;check the number&quot;, the phone number in your account doesn&apos;t match your WhatsApp Business account number.
                    Make sure the account phone number matches EXACTLY the number registered with WhatsApp Business.
                  </p>
                </div>
                <p className="text-zinc-900 font-semibold mb-3">
                  Enter this code on your WhatsApp Business app
                </p>
                <ol className="text-sm text-zinc-600 text-left space-y-2">
                  <li>1. Open <span className="font-semibold text-zinc-900">WhatsApp Business</span> on your phone</li>
                  <li>2. Go to <span className="font-semibold text-zinc-900">Settings → Linked Devices</span></li>
                  <li>3. Tap <span className="font-semibold text-zinc-900">&quot;Link a Device&quot;</span></li>
                  <li>4. Tap <span className="font-semibold text-zinc-900">&quot;Link with phone number instead&quot;</span></li>
                  <li>5. Enter the code: <span className="font-mono font-bold text-emerald-600">{pairingCode}</span></li>
                </ol>
                <p className="text-xs text-zinc-500 mt-4">Code expires in 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="glass-card rounded-xl p-8 border border-zinc-200 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <FaMobileAlt className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-zinc-600 mb-4">No WhatsApp accounts found.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            + Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <div key={account._id} className="glass-card rounded-xl p-5 border border-zinc-200 hover:border-emerald-300 transition-all">
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900">{account.accountName}</h3>
                  <p className="text-sm text-zinc-600">{account.phoneNumber}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {account.isConnected ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                          Connected
                        </span>
                        {account.browserType && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {platformIcons[account.browserType] || '🌐'} {account.browserType.charAt(0).toUpperCase() + account.browserType.slice(1)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2"></span>
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>

                {/* IP Address Display */}
                {(selectedAccountId === account._id || (getAccountTorEnabled(account._id) && getAccountTorCountry(account._id))) && (
                  <div className="w-full">
                    <div className={`px-4 py-3 rounded-lg border-2 ${
                      getAccountTorEnabled(account._id)
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="text-center">
                        <p className="text-xs text-zinc-600 mb-1">
                          {getAccountTorEnabled(account._id) ? '🔒 Tor Exit Node' : '🌐 Your IP'}
                        </p>
                        <p className={`text-sm font-mono font-semibold ${
                          getAccountTorEnabled(account._id) ? 'text-purple-700' : 'text-blue-700'
                        }`}>
                          {getAccountTorEnabled(account._id)
                            ? (getAccountTorCountry(account._id)
                                ? `${torCountries.find(c => c.code === getAccountTorCountry(account._id))?.flag || '🌍'} ${torCountries.find(c => c.code === getAccountTorCountry(account._id))?.name || 'Random'}`
                                : '🌍 Random Country')
                            : (fetchingIP ? 'Fetching...' : currentIP)
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {account.isConnected ? (
                    <button
                      onClick={() => disconnect(account._id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <>
                      {/* Connect Button - Auto-reconnect using existing session */}
                      <button
                        onClick={() => autoConnect(account._id)}
                        disabled={initLoading && selectedAccountId === account._id}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium border border-green-300 disabled:opacity-50"
                      >
                        {initLoading && selectedAccountId === account._id ? 'Connecting...' : 'Connect'}
                      </button>

                      {/* Browser Type Selector */}
                      <select
                        value={selectedAccountId === account._id ? selectedBrowserType : 'chrome'}
                        onChange={(e) => {
                          setSelectedAccountId(account._id);
                          setSelectedBrowserType(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        title="Select platform identity for this connection"
                      >
                        <option value="chrome">🌐 Chrome</option>
                        <option value="windows">🪟 Windows</option>
                        <option value="macos">🍎 macOS</option>
                        <option value="ubuntu">🐧 Ubuntu</option>
                      </select>

                      {/* Tor IP Rotation Toggle */}
                      <label className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={getAccountTorEnabled(account._id)}
                          onChange={(e) => setAccountTorEnabled(account._id, e.target.checked)}
                          className="w-4 h-4 text-purple-600 bg-white border-zinc-300 rounded focus:ring-purple-500 focus:ring-2"
                        />
                        <span className="text-sm text-zinc-900 whitespace-nowrap">🔒 Use Tor</span>
                      </label>

                      {/* Tor Country Selector */}
                      {getAccountTorEnabled(account._id) && (
                        <select
                          value={getAccountTorCountry(account._id)}
                          onChange={(e) => setAccountTorCountry(account._id, e.target.value)}
                          className="w-full px-3 py-2 bg-purple-50 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900"
                          disabled={loadingTorCountries}
                        >
                          <option value="">🌍 Random Exit Node</option>
                          {loadingTorCountries ? (
                            <option disabled>Loading countries...</option>
                          ) : (
                            torCountries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))
                          )}
                        </select>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => initWhatsApp(account._id, 'qr', undefined, selectedAccountId === account._id ? selectedBrowserType : 'chrome')}
                          disabled={initLoading && selectedAccountId === account._id}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                        >
                          {initLoading && selectedAccountId === account._id && authMode === 'qr' ? 'Generating...' : 'QR Code'}
                        </button>
                        <button
                          onClick={() => initWhatsApp(account._id, 'pairing', account.phoneNumber, selectedAccountId === account._id ? selectedBrowserType : 'chrome')}
                          disabled={initLoading && selectedAccountId === account._id}
                          className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
                        >
                          {initLoading && selectedAccountId === account._id && authMode === 'pairing' ? 'Generating...' : 'Pairing Code'}
                        </button>
                      </div>
                    </>
                  )}
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteClick(account._id, account.accountName)}
                    className="w-full p-2 border border-zinc-300 text-zinc-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
                    title="Delete Account"
                  >
                    <FaTrash size={16} />
                    <span className="text-sm font-medium">Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && accountToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2">
              <FaTrash size={20} />
              Delete Account
            </h2>
            <p className="text-zinc-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{accountToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAccountToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <FaTrash size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAccounts;

