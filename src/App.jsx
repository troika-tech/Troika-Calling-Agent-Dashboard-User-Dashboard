import React, { useState, useEffect, createContext, useContext } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { FaBars, FaHeadset } from 'react-icons/fa';

import Sidebar from './components/Sidebar';

import UserMenu from './components/UserMenu';
import SupportDropdown from './components/SupportDropdown';
import Login from './components/Login';
import DashboardOverview from './components/DashboardOverview';

import Campaigns from './components/Campaigns';

import Analytics from './components/Analytics';

import CallLogs from './components/CallLogs';
import CallRecording from './components/CallRecording';
import Leads from './components/Leads';
import CallSummary from './components/CallSummary';
import CallBacks from './components/CallBacks';
import LiveStatus from './components/LiveStatus';
import CreditHistory from './components/CreditHistory';
import DeliveryReports from './components/DeliveryReport';
import CampaignReportDetail from './components/CampaignReportDetail';
import Settings from './components/Settings';
import ScheduledCalls from './components/ScheduledCalls';
import AppointmentBooking from './components/AppointmentBooking';
import { authAPI } from './services/api';
import { pushNotificationService } from './services/pushNotifications';
import { isMobilePlatform } from './utils/platform';
import BottomNav from './components/mobile/BottomNav';

// User Context for sharing user data (including permissions) across components
const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};


function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Fetch fresh user data (including permissions) on app load
  useEffect(() => {
    const fetchFreshUserData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setPermissionsLoaded(true);
        return;
      }

      try {
        console.log('[App] Fetching fresh user data...');
        const response = await authAPI.getCurrentUser();

        if (response.success && response.data?.user) {
          const freshUser = response.data.user;
          console.log('[App] Fresh user data received:', freshUser);
          console.log('[App] Permissions:', freshUser.permissions);

          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);

          // Dispatch storage event to notify Sidebar
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(freshUser)
          }));
        }
      } catch (error) {
        console.error('[App] Failed to fetch fresh user data:', error);
        // If fetch fails, use cached data from localStorage
        try {
          const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
          setUser(cachedUser);
        } catch (e) {
          console.error('[App] Failed to parse cached user:', e);
        }
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchFreshUserData();
  }, []);

  // Cleanup push notifications on unmount
  useEffect(() => {
    return () => {
      if (isMobilePlatform()) {
        pushNotificationService.cleanup();
      }
    };
  }, []);

  return (

    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
      <UserContext.Provider value={{ user, permissionsLoaded }}>
      
      {/* Loading Screen - Show until permissions are loaded */}
      {!permissionsLoaded ? (
        <div className="h-screen bg-gradient-to-b from-zinc-50 via-slate-50 to-slate-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <img 
              src="/images/logo.png" 
              alt="Logo" 
              className="h-12 w-auto animate-pulse"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      ) : (
      <div className="h-screen bg-gradient-to-b from-zinc-50 via-slate-50 to-slate-100 text-zinc-900 flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Mobile Header - Only visible on mobile */}
          <header className="lg:hidden fixed top-0 left-0 right-0 border-b border-zinc-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 shadow-sm shadow-black/5 z-[60]" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm"
            >
              <FaBars size={20} className="text-zinc-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
              <div className="relative">
                <button
                  onClick={() => setSupportModalOpen(!supportModalOpen)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                  title="Support"
                >
                  <FaHeadset size={16} />
                </button>
                {supportModalOpen && (
                  <SupportDropdown onClose={() => setSupportModalOpen(false)} />
                )}
              </div>
              <UserMenu />
            </div>
          </header>

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} permissions={user?.permissions} permissionsLoaded={permissionsLoaded} />

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
                <div className="relative">
<button
                  onClick={() => setSupportModalOpen(!supportModalOpen)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                  title="Support"
                >
                  <FaHeadset size={18} />
                </button>
                  {/* Support dropdown positioned relative to button */}
                  {supportModalOpen && (
                    <SupportDropdown onClose={() => setSupportModalOpen(false)} />
                  )}
                </div>
                <div className="hidden lg:block">
                  <UserMenu />
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 md:px-6 md:pt-8 md:pb-6 lg:pt-6 lg:pb-6" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          <Routes>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardOverview />} />

            <Route path="/campaigns" element={<Campaigns />} />

            <Route path="/analytics" element={<Analytics />} />

                    <Route path="/call-logs" element={<CallLogs />} />
            <Route path="/call-recording" element={<CallRecording />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/call-summary" element={<CallSummary />} />
            {/* <Route path="/call-backs" element={<CallBacks />} /> */}
            <Route path="/scheduled-calls" element={<ScheduledCalls />} />
            <Route path="/live-status" element={<LiveStatus />} />
            <Route path="/credit-history" element={<CreditHistory />} />
            <Route path="/delivery-reports" element={<DeliveryReports />} />
            <Route path="/campaign-report/:campaignId" element={<CampaignReportDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/appointment-booking" element={<AppointmentBooking />} />

          </Routes>
            </main>
          </div>
        </div>

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <BottomNav />
      </div>
      )}
      </UserContext.Provider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>

  );

}

export default App;
