import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSpinner, FaUsers, FaShieldAlt, FaTrash, FaCheckCircle, FaTimesCircle, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';

const UserManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Check user role on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      if (userData.role !== 'admin') {
        toast.error('Access denied. Admin only.');
        navigate('/dashboard');
        return;
      }
      loadUsers();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Load users error:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Admin only.');
        navigate('/dashboard');
      } else {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    setActionLoading(userId);
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await api.put(`/api/users/${userId}/role`, { role: newRole });
      toast.success(`Role changed to ${newRole} successfully!`);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (userId) => {
    setActionLoading(userId);
    try {
      await api.put(`/api/users/${userId}/status`, {});
      toast.success('Status updated successfully!');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      toast.success('User deleted successfully!');
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreatingUser(true);
    try {
      await api.post('/api/users', {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        appType: 'chatbot',
      });

      toast.success('User created successfully!');
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', password: '' });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FaUsers className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
              User Management
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Manage chatbot app users</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-600">
            Total Users: <span className="font-semibold text-zinc-900">{users.length}</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            <FaPlus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-xl border border-zinc-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <FaUsers className="w-12 h-12 mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-zinc-50 to-zinc-100/50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    App Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((u) => {
                  const isCurrentUser = u._id === user.id;
                  const isLoading = actionLoading === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-emerald-600">
                              {u.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-900">
                              {u.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-emerald-600">(You)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <FaShieldAlt size={12} />
                          ) : (
                            <FaUsers size={12} />
                          )}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.isActive ? (
                            <FaCheckCircle size={12} />
                          ) : (
                            <FaTimesCircle size={12} />
                          )}
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {u.appType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCurrentUser && (
                            <>
                              <button
                                onClick={() => toggleRole(u._id, u.role)}
                                disabled={isLoading}
                                title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <FaSpinner className="animate-spin" size={16} />
                                ) : u.role === 'admin' ? (
                                  <FaUsers size={16} />
                                ) : (
                                  <FaShieldAlt size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => toggleStatus(u._id)}
                                disabled={isLoading}
                                title={u.isActive ? 'Deactivate User' : 'Activate User'}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <FaSpinner className="animate-spin" size={16} />
                                ) : u.isActive ? (
                                  <FaTimesCircle size={16} />
                                ) : (
                                  <FaCheckCircle size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(u._id, u.name)}
                                disabled={isLoading}
                                title="Delete User"
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <FaSpinner className="animate-spin" size={16} />
                                ) : (
                                  <FaTrash size={16} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Create New User</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Add a new user to the chatbot app. The user will be able to login with these credentials.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Enter user name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded">
                <strong>App Type:</strong> chatbot (automatically set)
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewUser({ name: '', email: '', password: '' });
                  }}
                  disabled={creatingUser}
                  className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingUser ? (
                    <>
                      <FaSpinner className="animate-spin" size={14} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaPlus size={14} />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2">
              <FaTrash size={20} />
              Delete User
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                disabled={actionLoading === userToDelete?.id}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={actionLoading === userToDelete?.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === userToDelete?.id ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

