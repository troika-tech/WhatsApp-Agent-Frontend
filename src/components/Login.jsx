import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { initializeSession } from '../utils/sessionManager';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for session invalidation message
  useEffect(() => {
    const sessionInvalidated = sessionStorage.getItem('sessionInvalidated');
    const message = sessionStorage.getItem('sessionInvalidationMessage');
    
    if (sessionInvalidated === 'true' && message) {
      toast.info(message, { autoClose: 5000 });
      sessionStorage.removeItem('sessionInvalidated');
      sessionStorage.removeItem('sessionInvalidationMessage');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      toast.error('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      // Call the chatbot backend login API
      // Backend: POST /api/user/login
      // Returns: { success: true, data: { token, role, user: { id, name, email } }, message }
      const response = await authAPI.login(formData.email, formData.password);

      if (response.success) {
        // Store the JWT token and user info FIRST
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Initialize session and broadcast new login to other tabs IMMEDIATELY
        const userId = response.data.user.id || response.data.user._id;

        if (userId) {
          // Initialize session immediately (no delay needed)
          const sessionId = initializeSession(String(userId));

        } else {

        }

        toast.success('Login successful!');

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        const msg = response.message || 'Login failed. Please try again.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'An error occurred. Please try again.';

      // Handle different error types
      if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50 via-white to-slate-100">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-400 to-sky-400 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.4),transparent_55%)]" />
        <div className="relative z-10 max-w-md px-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/20 px-5 py-2 text-sm backdrop-blur-md border border-white/30 shadow-lg">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="uppercase tracking-[0.16em] text-white font-bold">
            Whatsapp AI Agent
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-left text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Manage all your <span className="text-emerald-200 font-extrabold drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">customer conversations</span> from one Place
          </h1>
          <p className="text-base md:text-lg text-white/95 font-semibold text-left" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          Monitor live chats, user interactions, and engagement in realtime with a seamless dashboard designed for smooth tracking and better control.
          </p>
        </div>
      </div>

      {/* Right auth card */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Logo" 
              className="h-10 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                AI Agent
              </p>
              <p className="text-lg font-semibold text-zinc-900">Operations Dashboard</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white shadow-lg p-7 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-zinc-900">Sign in</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border-2 border-zinc-200 bg-white px-4 py-3 text-base outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border-2 border-zinc-200 bg-white px-4 py-3 pr-12 text-base outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-300/50 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-300/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Continue to dashboard'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;