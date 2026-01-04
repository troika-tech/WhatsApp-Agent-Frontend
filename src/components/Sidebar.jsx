import React, { useState, useEffect, useMemo } from 'react';

import { Link, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

import { 
  
  FaHome, 
  
  FaBullseye, 
  
  FaChartLine, 
  
  FaCog,
  
  FaBars,
  
  FaTimes,
  
  FaBan,
  
  FaGift,
  
  FaPhone,
  FaList,
  FaFileDownload,
  FaFileAlt,
  FaSignal,
  FaMicrophone,
  FaUserFriends,
  FaRedo,
  FaUsers,
  FaComments,
  FaEnvelope,
  FaWhatsapp,
  FaQrcode,
  FaHeadset,
  FaMobileAlt,
  FaRobot,
  FaUserShield
} from 'react-icons/fa';



const Sidebar = ({ isOpen = false, onClose }) => {

  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [permissions, setPermissions] = useState({
    enabled: true,
    allowedKeys: null,
    offerDisplayText: 'Offers',
  });
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [user, setUser] = useState(null);

  const location = useLocation();

  // Get user role for admin-only menu items - make it reactive
  useEffect(() => {
    const checkUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUser(null);
      }
    };

    // Check immediately
    checkUser();

    // Listen for storage changes (cross-tab updates)
    window.addEventListener('storage', checkUser);
    
    // Also check on focus (in case user logged in another tab)
    window.addEventListener('focus', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('focus', checkUser);
    };
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setCollapsed(false); // Always show on desktop
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with parent state on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(!isOpen);
    }
  }, [isOpen, isMobile]);

  // Combine base menu items with admin-only items (exactly like reference sidebar pattern)
  const menuItems = useMemo(() => {
    const isAdmin = user?.role === 'admin';

    const baseItems = [
      { key: 'dashboard', path: '/dashboard', icon: FaHome, label: 'Dashboard' },
      { key: 'leads', path: '/leads', icon: FaUserFriends, label: 'Leads' },
      { key: 'chat-history', path: '/chat-history', icon: FaList, label: 'Chat History' },
      { key: 'follow-up', path: '/follow-up', icon: FaRedo, label: 'C\\M Request' },

      { key: 'chat-summary', path: '/chat-summary', icon: FaComments, label: 'Chat Summary' },
      { key: 'analytics', path: '/analytics', icon: FaChartLine, label: 'Analytics' },
      // { key: 'credit-history', path: '/credit-history', icon: FaFileDownload, label: 'Credit History' },
      { key: 'send-email', path: '/send-email', icon: FaEnvelope, label: 'Send Email' },
      { key: 'whatsapp-proposals', path: '/whatsapp-proposals', icon: FaWhatsapp, label: 'WhatsApp Proposals' },
      { key: 'whatsapp-accounts', path: '/whatsapp-accounts', icon: FaMobileAlt, label: 'WhatsApp Accounts' },
      { key: 'manage-chatbot', path: '/manage-chatbot', icon: FaRobot, label: 'Manage Chatbot' },
    ];

    const adminItems = [
      { key: 'user-management', path: '/user-management', icon: FaUserShield, label: 'User Management', adminOnly: true }
    ];

    // Combine exactly like reference: isAdmin ? [...baseMenuItems, ...adminMenuItems] : baseMenuItems
    const allItems = isAdmin ? [...baseItems, ...adminItems] : baseItems;
    return allItems;
  }, [user?.role, permissions.offerDisplayText]);

  // COMMENTED OUT TABS - Functionality preserved but hidden from sidebar
  // WhatsApp QR: Displays QR code for WhatsApp account connection/authentication
  // Allows users to scan QR code to connect their WhatsApp account to the chatbot system
  // { key: 'whatsapp-qr', path: '/whatsapp-qr', icon: FaQrcode, label: 'WhatsApp QR' },
  
  // Online Session: Shows active/live chat sessions in real-time
  // Displays currently active customer conversations and allows monitoring of live interactions
  // { key: 'online-session', path: '/online-session', icon: FaHeadset, label: 'Online Session' },
  
  // Banned Sessions: Manages sessions that have been banned/blocked
  // Allows viewing and managing customer sessions that were banned due to policy violations or abuse
  // { key: 'banned-sessions', path: '/banned-sessions', icon: FaBan, label: 'Banned Sessions' },
  
  // Offers: Displays promotional offers and templates available to customers
  // Shows special offers, discounts, and promotional messages that can be sent to customers
  // { key: 'offers', path: '/offers', icon: FaGift, label: permissions.offerDisplayText },

  // Fetch sidebar permissions from backend
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await authAPI.getDashboardSidebarConfig();
        const data = response?.data || response;
        const allowedKeys =
          Array.isArray(data?.allowed_menu_keys) && data.allowed_menu_keys.length > 0
            ? data.allowed_menu_keys
            : null;
        setPermissions({
          enabled: data?.sidebar_enabled !== undefined ? data.sidebar_enabled : true,
          allowedKeys,
          offerDisplayText: data?.offer_sidebar_display_text || 'Offers',
        });
        // Store chatbot_id for use in other components
        if (data?.chatbot_id) {
          localStorage.setItem('user_chatbot_id', data.chatbot_id);
        }
      } catch (error) {
        console.error('Error fetching sidebar permissions:', error);
        // Fail open to avoid blocking access if config fetch fails
        setPermissions({
          enabled: true,
          allowedKeys: null,
        });
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, []);

  const visibleMenuItems = permissions.enabled
    ? menuItems.filter((item) => {
        // Always show admin-only items if user is admin (bypass permissions filter)
        if (item.adminOnly && user?.role === 'admin') {
          return true;
        }
        // Filter other items based on allowedKeys if set
        return !permissions.allowedKeys || permissions.allowedKeys.includes(item.key);
      })
    : [];

  // Commented out menu items:
  // { path: '/campaigns', icon: FaBullseye, label: 'Campaigns' },
  // { path: '/call-recording', icon: FaMicrophone, label: 'Call Recording' },
  // { path: '/live-status', icon: FaSignal, label: 'Live Status' },
  // { path: '/delivery-reports', icon: FaFileAlt, label: 'Delivery Reports' },



  const isActive = (path) => {
    const currentPath = location.pathname;
    // Handle redirect from old route
    if (currentPath === '/call-logs' && path === '/chat-history') {
      return true;
    }
    return currentPath === path;
  };

  if (loadingPermissions) {
    return null;
  }

  if (!permissions.enabled) {
    return null;
  }

  return (

    <>

      {/* Sidebar */}

      <aside

        style={{

          transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',

        }}

        className={`

          fixed lg:static top-0 bottom-0 left-0 z-[60] lg:z-40

          w-full lg:w-64

          bg-white/90 backdrop-blur-xl

          border-r border-zinc-200

          lg:translate-x-0

          transition-transform duration-300 ease-in-out

          flex flex-col

          shadow-lg lg:shadow-none

          overflow-y-auto

        `}

      >

        {/* Header */}

        <div className="flex items-center gap-3 px-6 h-16 border-b border-zinc-200">

          <img 
            src="/images/logo.png" 
            alt="Logo" 
            className="h-9 w-auto"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="hidden lg:block">
            <div className="text-sm font-semibold tracking-tight text-zinc-900">Troika Tech AI</div>
            <div className="text-xs text-zinc-500">AI Chat Agent</div>
          </div>
          {!collapsed && (
            <div className="lg:hidden">
              <div className="text-sm font-semibold tracking-tight text-zinc-900">Troika Tech AI</div>
              <div className="text-xs text-zinc-500">AI Chat Agent</div>
            </div>
          )}
          {/* Close button for mobile */}
          <button
            onClick={() => {
              setCollapsed(true);
              if (onClose) onClose();
            }}
            className="lg:hidden ml-auto p-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close sidebar"
          >
            <FaTimes size={20} />
          </button>
        </div>



        {/* Navigation Menu */}

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">

          {visibleMenuItems.map((item) => {

            const Icon = item.icon;

            const active = isActive(item.path);

            return (

              <Link

                key={item.key || item.path}

                to={item.path}

                onClick={() => {

                  // Only collapse on mobile

                  if (isMobile) {

                    setCollapsed(true);

                    if (onClose) onClose();

                  }

                }}

                className={`

                  group flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-medium transition-all

                  ${

                    active

                      ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/20'

                      : 'hover:bg-emerald-50 hover:text-emerald-700 text-zinc-700'

                  }

                `}

              >

                <Icon className="h-5 w-5" />

                <span>{item.label}</span>

              </Link>

            );

          })}

        </nav>



        {/* Footer */}

        <div className="px-4 py-5 border-t border-zinc-300 text-sm text-zinc-700 flex items-center justify-center gap-2 mt-auto">
          <span className="font-medium">Powered by Troika Tech</span>
        </div>

      </aside>



      {/* Overlay for mobile */}

      {!collapsed && isMobile && (

        <div

          className="lg:hidden fixed inset-0 bg-black/40 z-30"

          onClick={() => {
            setCollapsed(true);
            if (onClose) onClose();
          }}

        />

      )}

    </>

  );

};



export default Sidebar;




