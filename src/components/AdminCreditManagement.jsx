import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSearch, FaCoins, FaPlus, FaMinus, FaHistory, FaUser, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const AdminCreditManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [showRemoveCreditsModal, setShowRemoveCreditsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [addCreditsForm, setAddCreditsForm] = useState({
    amount: '',
    reason: '',
  });
  const [removeCreditsForm, setRemoveCreditsForm] = useState({
    amount: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(response.data.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/v1/users/${userId}/credits/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });

      setTransactions(response.data.data.transactions || []);
      setShowTransactionsModal(true);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Failed to load transaction history');
    }
  };

  const handleAddCredits = async (e) => {
    e.preventDefault();

    if (!addCreditsForm.amount || addCreditsForm.amount <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('authToken');

      await axios.post(
        `${API_BASE_URL}/api/v1/users/${selectedUser._id}/credits/add`,
        {
          amount: parseInt(addCreditsForm.amount),
          reason: addCreditsForm.reason || 'admin_grant'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Successfully added ${addCreditsForm.amount} credits to ${selectedUser.name}`);
      setShowAddCreditsModal(false);
      setAddCreditsForm({ amount: '', reason: '' });
      fetchUsers(); // Refresh user list
    } catch (err) {
      console.error('Error adding credits:', err);
      toast.error(err.response?.data?.message || 'Failed to add credits');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCredits = async (e) => {
    e.preventDefault();

    if (!removeCreditsForm.amount || removeCreditsForm.amount <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('authToken');

      await axios.post(
        `${API_BASE_URL}/api/v1/users/${selectedUser._id}/credits/remove`,
        {
          amount: parseInt(removeCreditsForm.amount),
          reason: removeCreditsForm.reason || 'admin_removal'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Successfully removed ${removeCreditsForm.amount} credits from ${selectedUser.name}`);
      setShowRemoveCreditsModal(false);
      setRemoveCreditsForm({ amount: '', reason: '' });
      fetchUsers(); // Refresh user list
    } catch (err) {
      console.error('Error removing credits:', err);
      toast.error(err.response?.data?.message || 'Failed to remove credits');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Credit Management
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage user credits and view transaction history
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white uppercase text-xs tracking-wider shadow-lg" style={{ background: 'linear-gradient(to right, #1e4fd9, #2c60eb)' }}>
              <tr>
                <th className="px-4 lg:px-6 py-4 text-left font-bold rounded-tl-xl">User</th>
                <th className="px-4 lg:px-6 py-4 text-left font-bold">Email</th>
                <th className="px-4 lg:px-6 py-4 text-left font-bold">Current Balance</th>
                <th className="px-4 lg:px-6 py-4 text-left font-bold">Plan</th>
                <th className="px-4 lg:px-6 py-4 text-left font-bold rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 lg:px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No users match your search' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span className="text-gray-600 dark:text-gray-300">{user.email}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaCoins className={user.credits <= 0 ? 'text-red-500' : 'text-green-500'} />
                        <span className={`font-bold ${user.credits <= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {user.credits || 0}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.floor((user.credits || 0) / 60)} min)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs font-medium">
                        {user.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddCreditsModal(true);
                          }}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaPlus size={10} />
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRemoveCreditsModal(true);
                          }}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaMinus size={10} />
                          <span>Remove</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            fetchTransactions(user._id);
                          }}
                          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaHistory size={10} />
                          <span>History</span>
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

      {/* Add Credits Modal */}
      {showAddCreditsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Credits to {selectedUser?.name}
            </h2>
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (credits)
                </label>
                <input
                  type="number"
                  min="1"
                  value={addCreditsForm.amount}
                  onChange={(e) => setAddCreditsForm({ ...addCreditsForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount (1 credit = 1 second)"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {addCreditsForm.amount ? `${Math.floor(addCreditsForm.amount / 60)} minutes` : '1 credit = 1 second of call time'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={addCreditsForm.reason}
                  onChange={(e) => setAddCreditsForm({ ...addCreditsForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Monthly credit allocation"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Credits'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCreditsModal(false);
                    setAddCreditsForm({ amount: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Credits Modal */}
      {showRemoveCreditsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Remove Credits from {selectedUser?.name}
            </h2>
            <form onSubmit={handleRemoveCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (credits)
                </label>
                <input
                  type="number"
                  min="1"
                  value={removeCreditsForm.amount}
                  onChange={(e) => setRemoveCreditsForm({ ...removeCreditsForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  placeholder="Enter amount (1 credit = 1 second)"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {removeCreditsForm.amount ? `${Math.floor(removeCreditsForm.amount / 60)} minutes` : '1 credit = 1 second of call time'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={removeCreditsForm.reason}
                  onChange={(e) => setRemoveCreditsForm({ ...removeCreditsForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Credit adjustment"
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Removing credits may result in a negative balance. User will not be able to make or receive calls until credits are added.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Removing...' : 'Remove Credits'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveCreditsModal(false);
                    setRemoveCreditsForm({ amount: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Transaction History - {selectedUser?.name}
              </h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No transactions found
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-gray-700 dark:text-gray-300 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((txn) => (
                      <tr key={txn._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {new Date(txn.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.type === 'addition'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {txn.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {txn.amount > 0 ? '+' : ''}{txn.amount}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {txn.balance}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                          {txn.reason.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowTransactionsModal(false)}
                className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCreditManagement;
