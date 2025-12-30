import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaBars, FaPhone, FaHeadset, FaEnvelope } from 'react-icons/fa';
import Sidebar from './components/Sidebar';
import UserMenu from './components/UserMenu';
import Login from './components/Login';
import SessionListener from './components/SessionListener';
import InactivityTimer from './components/InactivityTimer';
import DashboardOverview from './components/DashboardOverview';
import Campaigns from './components/Campaigns';
import Analytics from './components/Analytics';
import ChatHistory from './components/ChatHistory';
import CallRecording from './components/CallRecording';
import Leads from './components/Leads';
// import Customers from './components/Customers';
import DailySummary from './components/DailySummary';
import CallBacks from './components/CallBacks';
import FollowUpLeads from './components/FollowUpLeads';
import LiveStatus from './components/LiveStatus';
import CreditHistory from './components/CreditHistory';
import DeliveryReports from './components/DeliveryReport';
import CampaignReportDetail from './components/CampaignReportDetail';
import OnlineSession from './components/OnlineSession';
import Settings from './components/Settings';
import SendEmailHistory from './components/SendEmailHistory';
import WhatsAppProposalHistory from './components/WhatsAppProposalHistory';
import WhatsAppAccounts from './components/WhatsAppAccounts';
import WhatsAppQR from './components/WhatsAppQR';
import BannedSessions from './components/BannedSessions';
import Offers from './components/Offers';
import ManageChatbot from './components/ManageChatbot';
import UserManagement from './components/UserManagement';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};


function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supportRef.current && !supportRef.current.contains(event.target)) {
        setSupportOpen(false);
      }
    };
    if (supportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supportOpen]);



  return (

    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss={false}
        draggable 
        pauseOnHover={false}
        theme="light"
        enableMultiContainer={false}
      />
      
      {/* Session Listener for cross-tab logout - Always active */}
      <SessionListener />
      
      {/* Inactivity Timer - Auto logout after 4 minutes of inactivity */}
      <InactivityTimer />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
      <div className="h-screen bg-gradient-to-b from-zinc-50 via-slate-50 to-slate-100 text-zinc-900 flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Mobile Header - Only visible on mobile */}
          <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 shadow-sm shadow-black/5 z-[60]">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm"
            >
              <FaBars size={20} className="text-zinc-700" />
            </button>
            <UserMenu />
          </header>

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top bar */}
            <header className="hidden lg:flex h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-xl items-center justify-between px-4 md:px-6 shadow-sm shadow-black/5 relative z-40 flex-shrink-0">
              <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500 uppercase tracking-[0.16em]">
                <span>Realtime Operations</span>
              </div>
              <div className="flex items-center gap-3 relative z-50">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
                <div className="relative" ref={supportRef}>
                  <button
                    onClick={() => setSupportOpen((prev) => !prev)}
                    className="flex items-center justify-center w-11 h-11 bg-white border border-zinc-200 rounded-full shadow-sm hover:shadow-md transition-all text-emerald-600"
                    title="Support"
                  >
                    <FaHeadset className="h-5 w-5" />
                  </button>
                  {supportOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-black/10 p-4 space-y-2 text-sm text-zinc-800">
                      <div className="font-semibold text-zinc-900">Troika Tech Support</div>
                      <div className="flex items-center gap-2">
                        <FaPhone className="text-emerald-600" />
                        <span>+91 98212 11755</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="text-emerald-600" />
                        <span>info@troikatech.in</span>
                      </div>
                      <div className="text-xs text-zinc-500">Business hours: Monday to Saturday</div>
                      <div className="text-xs text-zinc-500">Timings: 10am - 6pm</div>
                    </div>
                  )}
                </div>
                <div className="hidden lg:block">
                  <UserMenu />
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 md:px-6 pt-20 pb-4 md:pt-8 md:pb-6 lg:pt-6">
          <Routes>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardOverview />} />

            <Route path="/campaigns" element={<Campaigns />} />

            <Route path="/analytics" element={<Analytics />} />

                    <Route path="/chat-history" element={<ChatHistory />} />
                    <Route path="/call-logs" element={<Navigate to="/chat-history" replace />} />
            <Route path="/call-recording" element={<CallRecording />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/chat-summary" element={<DailySummary />} />
            <Route path="/call-backs" element={<CallBacks />} />
            <Route path="/follow-up" element={<FollowUpLeads />} />
            <Route path="/live-status" element={<LiveStatus />} />
            <Route path="/credit-history" element={<CreditHistory />} />
            <Route path="/delivery-reports" element={<DeliveryReports />} />
            <Route path="/campaign-report/:campaignId" element={<CampaignReportDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/send-email" element={<SendEmailHistory />} />
            <Route path="/whatsapp-proposals" element={<WhatsAppProposalHistory />} />
            <Route path="/whatsapp-accounts" element={<WhatsAppAccounts />} />
            <Route path="/manage-chatbot" element={<ManageChatbot />} />
            <Route path="/user-management" element={<UserManagement />} />
            
            {/* COMMENTED OUT ROUTES - Tabs hidden from sidebar but routes preserved for future use */}
            {/* WhatsApp QR: Route for displaying QR code for WhatsApp account connection */}
            {/* <Route path="/whatsapp-qr" element={<WhatsAppQR />} /> */}
            
            {/* Online Session: Route for viewing active/live chat sessions in real-time */}
            {/* <Route path="/online-session" element={<OnlineSession />} /> */}
            
            {/* Banned Sessions: Route for managing sessions that have been banned/blocked */}
            {/* <Route path="/banned-sessions" element={<BannedSessions />} /> */}
            
            {/* Offers: Route for displaying promotional offers and templates */}
            {/* <Route path="/offers" element={<Offers />} /> */}

          </Routes>
            </main>
          </div>
        </div>
      </div>

            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>

  );

}

export default App;
