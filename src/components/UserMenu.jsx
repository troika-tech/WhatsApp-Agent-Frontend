import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { clearSession } from '../utils/sessionManager';

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      // Call backend logout API to invalidate token
      await authAPI.logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still show success message even if API call fails, as we're clearing local session
      toast.success('Logged out successfully');
    } finally {
      // Clear session and local storage (includes sessionId)
      clearSession();
      setOpen(false);
      navigate('/login');
    }
  };

  const handleSettings = () => {
    setOpen(false);
    navigate('/settings');
  };

  return (
    <div
      ref={menuRef}
      className="relative z-50"
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-12 h-12 bg-white border border-zinc-200 rounded-full shadow-sm hover:shadow-md transition-shadow"
      >
        <FaUser className="text-zinc-500" size={22} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-black/5 py-2 z-[100]">
          <div className="px-3 pb-2 border-b border-zinc-100">
            <div className="font-medium text-zinc-800 text-xs">{user?.name || 'User Name'}</div>
            <div className="text-[11px] text-zinc-500 truncate">{user?.email || 'user@example.com'}</div>
          </div>
          <div className="py-1">
            <button
              onClick={handleSettings}
              className="w-full flex items-center space-x-3 px-3 pt-2 text-left text-zinc-600 hover:bg-zinc-50 transition-colors text-xs"
            >
              <FaCog size={14} />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 pt-2 text-left text-red-600 hover:bg-red-50 transition-colors text-xs"
            >
              <FaSignOutAlt size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

