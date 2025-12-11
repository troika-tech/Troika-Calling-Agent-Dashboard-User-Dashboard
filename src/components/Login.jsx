import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaLock, FaEnvelope } from 'react-icons/fa';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { success, error: showError, alert } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    // Password length validation
    if (formData.password.length < 16) {
      setError('Password must be at least 16 characters long');
      setLoading(false);
      return;
    }

    try {
      // Call the backend login API
      const response = await authAPI.login(formData.email, formData.password);

      if (response.success) {
        const userData = response.data.user;

        // Check if user account is active
        if (userData.status === false || userData.status === 'inactive') {
          setLoading(false);
          alert({
            type: 'warning',
            message: 'Your account is currently inactive. Please contact the administrator to activate your account.',
            okText: 'OK'
          });
          return;
        }

        // Store the JWT token and user info
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        // Debug: Log user data to see structure

        // Store agentId and phoneId from user's phone if available
        if (userData.phone?.agentId) {
          
          localStorage.setItem('agentId', userData.phone.agentId);
          localStorage.setItem('phoneId', userData.phone._id);
        } else {
          // Try to fetch user's phone/agent info separately if not in login response
          try {
            const userResponse = await authAPI.getCurrentUser();
            if (userResponse.data?.user?.phone?.agentId) {
              localStorage.setItem('agentId', userResponse.data.user.phone.agentId);
              localStorage.setItem('phoneId', userResponse.data.user.phone._id);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch current user:', fetchErr);
          }
        }

        // Show success toast and navigate on OK
        alert({
          type: 'success',
          message: 'Login successful! Welcome back.',
          okText: 'Continue',
          onOk: () => navigate('/dashboard')
        });
      } else {
        showError('Login failed. Please try again.');
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);

      // Extract error message from different formats
      let errorMessage = 'An error occurred. Please try again.';
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      // Check if account is disabled/inactive
      const isAccountDisabled = errorMessage.toLowerCase().includes('inactive') ||
                                errorMessage.toLowerCase().includes('disabled');

      // Handle different error types
      if (isAccountDisabled) {
        alert({
          type: 'warning',
          message: 'Your account is currently inactive. Please contact the administrator to activate your account.',
          okText: 'OK'
        });
        setError('Your account is disabled. Please contact the owner.');
      } else if (err.response?.status === 401) {
        showError('Invalid email or password');
        setError('Invalid email or password');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        showError('Cannot connect to server');
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        showError(errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Left brand panel - Clean Premium Design */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        {/* Background Image */}
        <img 
          src="/images/LoginPage.jpg" 
          alt="Login Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/80 via-teal-500/70 to-cyan-500/80"></div>
        
        {/* Subtle light overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5"></div>
      </div>

      {/* Right auth card - Premium Design */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="relative">
              <img 
                src="/images/logo.png" 
                alt="Logo" 
                className="h-12 w-auto drop-shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1">
                Troika AI Calling Agent
              </p>
              <p className="text-2xl font-bold text-zinc-900 leading-4">Operations Dashboard</p>
            </div>
          </div>

          {/* Premium Card */}
          <div className="relative">
            {/* Glassmorphism Card */}
            <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur-2xl shadow-2xl pt-4 pb-12 px-8 space-y-6 relative overflow-hidden">
              {/* Card gradient overlay */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl -z-0"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-zinc-900">Welcome to Troika Tech</h2>
                  <p className="text-sm text-zinc-600">Sign in to continue to your dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50/90 backdrop-blur-sm border border-red-200/50 rounded-xl shadow-sm">
                      <p className="text-sm font-medium text-red-600 text-center">{error}</p>
                    </div>
                  )}
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                      <FaEnvelope className="text-emerald-500" size={14} />
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl border-2 border-zinc-200/60 bg-white/90 backdrop-blur-sm px-4 py-3.5 pl-12 text-base outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white shadow-sm"
                        placeholder="you@example.com"
                      />
                      <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                      <FaLock className="text-emerald-500" size={14} />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full rounded-xl border-2 border-zinc-200/60 bg-white/90 backdrop-blur-sm px-4 py-3.5 pl-12 pr-12 text-base outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white shadow-sm"
                        placeholder="Enter your password"
                      />
                      <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors duration-200"
                      >
                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </button>
                    </div>
                    {formData.password.length > 0 && formData.password.length < 16 && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Password must be at least 16 characters
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    {/* Button shine effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    
                    {loading ? (
                      <span className="flex items-center justify-center relative z-10">
                        <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      <span className="relative z-10">Continue to Dashboard</span>
                    )}
                  </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
