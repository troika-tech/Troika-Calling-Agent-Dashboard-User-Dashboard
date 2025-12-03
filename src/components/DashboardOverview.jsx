import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FaPhone,
  FaCheckCircle,
  FaUserPlus,
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaPlay,
  FaPause,
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaBullseye,
  FaCoins,
  FaTimes,
  FaCalendar,
  FaTimesCircle,
  FaVolumeUp,
  FaVolumeMute
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiPhoneCall } from 'react-icons/fi';
import { analyticsAPI, wsAPI, campaignAPI, creditsAPI, callAPI } from '../services/api';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [wsStats, setWsStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creditBalance, setCreditBalance] = useState(null);
  const [userExpiryDate, setUserExpiryDate] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callDetails, setCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);
  const [topCallsByDuration, setTopCallsByDuration] = useState([]);
  const [loadingTopCalls, setLoadingTopCalls] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [totalCampaignsCount, setTotalCampaignsCount] = useState(0);
  const [totalCallsCount, setTotalCallsCount] = useState(0);
  const [callChartData, setCallChartData] = useState(null);

  // Audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Ref to prevent duplicate fetches (especially with React.StrictMode)
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch if we haven't fetched yet
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDashboardData();
      fetchTopCallsByDuration();
    }
  }, []);

  // Utility function to format duration from milliseconds to minute:second
  const formatDuration = (durationMs) => {
    // Handle both milliseconds and seconds (if durationSec is already in seconds)
    // Check if it's likely milliseconds (> 10000) or seconds (< 10000)
    let totalSeconds;
    if (durationMs > 10000) {
      // Likely milliseconds, convert to seconds
      totalSeconds = Math.floor(durationMs / 1000);
    } else {
      // Likely already in seconds
      totalSeconds = Math.floor(durationMs);
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchTopCallsByDuration = async () => {
    try {
      setLoadingTopCalls(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      if (!userId) {
        console.warn('No userId found, skipping top calls fetch');
        setTopCallsByDuration([]);
        return;
      }

      const response = await callAPI.getTopCallsByDuration(userId);
      const calls = response.data?.calls || [];
      setTopCallsByDuration(calls);
    } catch (err) {
      console.error('Error fetching top calls by duration:', err);
      // Don't show error to user, just log it and set empty array
      setTopCallsByDuration([]);
    } finally {
      setLoadingTopCalls(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset audio player state when modal closes or call changes
  useEffect(() => {
    if (!showCallModal || !callDetails) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [showCallModal, callDetails]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      // Set user expiry date from localStorage user object
      if (user.expiryDate) {
        setUserExpiryDate(user.expiryDate);
      }

      // Calculate time range for last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const timeRange = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      };

      // Use Promise.allSettled to ensure all API calls complete even if some fail
      const results = await Promise.allSettled([
        // Fetch unified dashboard analytics with 7-day time range
        analyticsAPI.getDashboard(userId, timeRange).then(res => res.data).catch(err => {
          console.warn('Dashboard analytics not available:', err);
          return null;
        }),
        // Fetch WebSocket stats for real-time metrics
        wsAPI.getStats().catch(err => {
          console.warn('WebSocket stats not available:', err);
          return null;
        }),
        // Fetch campaigns
        campaignAPI.list().then(res => {
          const campaignsData = res.data;
          if (Array.isArray(campaignsData)) {
            return campaignsData;
          } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
            return campaignsData.campaigns;
          } else {
            console.warn('Campaigns response is not an array:', campaignsData);
            return [];
          }
        }).catch(err => {
          console.warn('Campaigns data not available:', err);
          return [];
        }),
        // Fetch credit balance and user data (includes expiryDate)
        creditsAPI.getBalance().then(res => {
          // Also update expiryDate if available from auth/me response
          if (res.data?.expiryDate) {
            setUserExpiryDate(res.data.expiryDate);
          }
          return res.data?.credits || 0;
        }).catch(err => {
          console.warn('Credit balance not available:', err);
          return 0;
        }),
        // Fetch recent calls as fallback for charts (primary data comes from getCallChartData)
        callAPI.getAllCalls({
          limit: 50, // Reduced limit - chart data comes from dedicated endpoint
          sort: 'desc',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }).then(res => {
          const calls = res.data?.calls || res.data || [];
          return Array.isArray(calls) ? calls : [];
        }).catch(err => {
          console.warn('Recent calls not available:', err);
          return [];
        }),
        // Fetch total campaigns count using userId
        campaignAPI.getCount().then(res => {
          return res.data?.count || 0;
        }).catch(err => {
          console.warn('Campaign count not available:', err);
          return 0;
        }),
        // Fetch total calls count using userId
        analyticsAPI.getCallCount(userId).then(res => {
          return res.data?.count || 0;
        }).catch(err => {
          console.warn('Call count not available:', err);
          return 0;
        }),
        // Fetch call chart data for both charts (last 7 days excluding today)
        analyticsAPI.getCallChartData(userId).then(res => {
          // API service returns the data object directly: { chartData: [...], totalCalls: ... }
          return res || null;
        }).catch(err => {
          console.warn('Call chart data not available:', err);
          return null;
        }),
      ]);

      // Set data from results
      if (results[0].status === 'fulfilled' && results[0].value) {
        console.log('Dashboard data received:', results[0].value);
        setDashboardData(results[0].value);
      } else {
        console.warn('Dashboard data not received:', results[0]);
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        setWsStats(results[1].value);
      }
      if (results[2].status === 'fulfilled') {
        setCampaigns(results[2].value || []);
      }
      if (results[3].status === 'fulfilled') {
        setCreditBalance(results[3].value);
      }
      if (results[4].status === 'fulfilled') {
        setRecentCalls(results[4].value || []);
      }
      if (results[5].status === 'fulfilled') {
        setTotalCampaignsCount(results[5].value || 0);
      }
      if (results[6].status === 'fulfilled') {
        setTotalCallsCount(results[6].value || 0);
      }
      if (results[7].status === 'fulfilled' && results[7].value) {
        setCallChartData(results[7].value);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('timeout')) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend server is running.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Internal server error';
        setError(`Server error: ${errorMsg}`);
      } else {
        const errorData = err.response?.data?.error;
        const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message || err.message || 'Failed to load dashboard data';
        setError(errorMsg);
      }
    } finally {
      // Always set loading to false, even if there are errors
      setLoading(false);
    }
  };

  // Calculate KPIs from analytics data
  const calculateKPIs = () => {
    // Get total campaigns count from campaigns model using userId (fetched via count endpoint)
    const totalCampaigns = totalCampaignsCount || 0;
    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
    const activeCampaigns = campaignsArray.filter(c => c.status === 'active' || c.status === 'running').length || 0;

    // Get total calls count from call logs using userId (fetched via count endpoint)
    const totalCalls = totalCallsCount || 0;
    const completedCalls = dashboardData?.completedCalls || dashboardData?.overview?.successfulCalls || 0;

    // Use actual credit balance from API
    const credits = creditBalance !== null ? creditBalance : 0;
    const isLowCredits = credits < 100 && credits > 0;
    const isNoCredits = credits <= 0;

    // Format expiry date from backend
    let validityDisplay = 'Not Set';
    let isExpired = false;
    let isExpiringSoon = false;

    if (userExpiryDate) {
      const expiryDate = new Date(userExpiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      isExpired = daysUntilExpiry < 0;
      isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

      validityDisplay = expiryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    return [
      {
        title: 'Validity',
        value: validityDisplay,
        change: isExpired ? 'Expired' : isExpiringSoon ? 'Expiring soon' : '',
        trend: isExpired ? 'down' : isExpiringSoon ? 'down' : 'up',
        icon: FaCalendar,
        color: isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-yellow-500' : 'bg-blue-500',
        warning: isExpired || isExpiringSoon,
      },
      {
        title: 'Total Campaigns',
        value: totalCampaigns.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPlay,
        color: 'bg-green-500',
      },
      {
        title: 'Total Calls',
        value: totalCalls.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPhone,
        color: 'bg-purple-500',
      },
      {
        title: 'Credit Balance',
        value: credits.toLocaleString(),
        change: isNoCredits ? 'Out of credits' : isLowCredits ? 'Low balance' : 'Active',
        trend: isNoCredits ? 'down' : isLowCredits ? 'down' : 'up',
        icon: FaCoins,
        color: isNoCredits ? 'bg-red-500' : isLowCredits ? 'bg-yellow-500' : 'bg-green-500',
        warning: isNoCredits || isLowCredits,
      },
    ];
  };

  // Prepare chart data from analytics
  const prepareChartData = () => {
    // Handle both flat and nested data structures from backend
    const overview = dashboardData?.overview || dashboardData;
    const totalCalls = overview?.totalCalls || 0;
    const completedCalls = overview?.successfulCalls || overview?.completedCalls || 0;
    const failedCalls = overview?.failedCalls || 0;
    const inProgressCalls = overview?.inProgressCalls || 0;

    const callOutcomeData = [
      { name: 'Total Calls', value: totalCalls, color: '#2196F3' },
      { name: 'Completed', value: completedCalls, color: '#4CAF50' },
      { name: 'In Progress', value: inProgressCalls, color: '#FF9800' },
      { name: 'Failed', value: failedCalls, color: '#F44336' },
    ];

    // Use chart data from backend endpoint if available (for Calls Over Time chart)
    let callsOverTimeData = [];
    
    if (callChartData && callChartData.chartData && Array.isArray(callChartData.chartData)) {
      // Use the chart data from backend endpoint
      callsOverTimeData = callChartData.chartData.map(item => {
        // Parse dateLabel (DD/MM format) and format as "Nov 21"
        const [day, month] = item.dateLabel.split('/');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1] || 'Nov';
        return {
          time: `${monthName} ${day}`,
          calls: item.calls || 0
        };
      });
    } else if (dashboardData?.trends?.callsOverTime) {
      // Fallback to trends data from backend analytics
      const trends = dashboardData.trends.callsOverTime;
      if (trends.labels && trends.data && trends.data.some(v => v > 0)) {
        callsOverTimeData = trends.labels.map((label, index) => {
          // Format the label for display
          let displayLabel = label;
          try {
            const date = new Date(label);
            if (!isNaN(date.getTime())) {
              displayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          } catch (e) {
            // Keep original label
          }
          return {
            time: displayLabel,
            calls: trends.data[index] || 0
          };
        });
      }
    } else if (dashboardData?.callTrends && Array.isArray(dashboardData.callTrends)) {
      // Already in correct format
      callsOverTimeData = dashboardData.callTrends;
    } else if (dashboardData?.callsOverTime?.labels && dashboardData?.callsOverTime?.data) {
      // Alternative format
      callsOverTimeData = dashboardData.callsOverTime.labels.map((label, index) => ({
        time: label,
        calls: dashboardData.callsOverTime.data[index] || 0
      }));
    }

    // Fallback: Build hourly distribution from recentCalls if no trends data
    if (callsOverTimeData.length === 0 && recentCalls && recentCalls.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Group calls by hour for today
      const hourlyData = {};
      for (let h = 8; h <= 20; h++) {
        const hourLabel = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        hourlyData[hourLabel] = 0;
      }

      recentCalls.forEach(call => {
        const callTime = new Date(call.startedAt || call.createdAt);
        if (callTime >= today && callTime <= todayEnd) {
          const hour = callTime.getHours();
          const hourLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
          if (hourlyData[hourLabel] !== undefined) {
            hourlyData[hourLabel]++;
          }
        }
      });

      // Convert to array, only include hours with data or working hours
      callsOverTimeData = Object.entries(hourlyData)
        .map(([time, calls]) => ({ time, calls }))
        .filter((_, i, arr) => {
          // Keep all if there's any data, otherwise show working hours
          const hasAnyData = arr.some(item => item.calls > 0);
          return hasAnyData || true;
        });
    }

    // Final fallback: Show last 7 days from recentCalls
    if (callsOverTimeData.length === 0 && recentCalls && recentCalls.length > 0) {
      const today = new Date();
      const callsByDay = {};

      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        callsByDay[key] = 0;
      }

      // Count calls by day
      recentCalls.forEach(call => {
        const callDate = new Date(call.startedAt || call.createdAt);
        const key = callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (callsByDay[key] !== undefined) {
          callsByDay[key]++;
        }
      });

      callsOverTimeData = Object.entries(callsByDay).map(([time, calls]) => ({ time, calls }));
    }

    return { callOutcomeData, callsOverTimeData };
  };

  const getWeeklyCallsData = () => {
    // Use chart data from backend endpoint if available
    if (callChartData && callChartData.chartData && Array.isArray(callChartData.chartData)) {
      return callChartData.chartData.map(item => ({
        day: item.day,
        dateLabel: item.dateLabel,
        calls: item.calls || 0,
      }));
    }

    // Fallback: Return empty data structure
    return [];
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading dashboard</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();
  const { callOutcomeData, callsOverTimeData } = prepareChartData();
  const weeklyCallsOverTime = getWeeklyCallsData();

  // Custom tick component - shows only date in mobile, weekday+date in desktop
  const WeeklyTick = ({ x, y, payload, index }) => {
    // In Recharts BarChart, try multiple ways to access the data
    let dataPoint = payload?.payload;
    
    // If payload.payload doesn't work, try to find by index
    if (!dataPoint && weeklyCallsOverTime && typeof index === 'number') {
      dataPoint = weeklyCallsOverTime[index];
    }
    
    // If still no data, try payload directly
    if (!dataPoint) {
      dataPoint = payload;
    }
    
    if (!dataPoint) return null;
    
    if (isMobile) {
      // Mobile: Show only date (20/11) at the bottom
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#27272a" fontSize="11" fontWeight="600">
            {dataPoint.dateLabel || ''}
          </text>
        </g>
      );
    } else {
      // Desktop: Show weekday and date on separate lines
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#27272a" fontSize="11" fontWeight="600">
            {dataPoint.day || ''}
          </text>
          <text x={0} y={0} dy={32} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {dataPoint.dateLabel || ''}
          </text>
        </g>
      );
    }
  };

  // Build topPhoneNumbers from topCallsByDuration (fetched from dedicated endpoint)
  const topPhoneNumbers = [];

  if (topCallsByDuration && topCallsByDuration.length > 0) {
    topCallsByDuration.forEach((call, index) => {
      // durationSec is stored in milliseconds per user requirement
      const durationMs = call.durationSec || 0;
      const durationFormatted = formatDuration(durationMs);

      // Get campaign name based on call direction
      // For outbound calls: get from populated campaignId
      // For inbound calls: show "N/A" (no campaign)
      let campaignName;
      if (call.direction === 'inbound') {
        campaignName = 'N/A';
      } else {
        campaignName = call.campaignId?.name || call.campaignName || 'Direct Call';
      }
      const agentName = call.agentId?.name || call.agentName || `Agent ${index + 1}`;

      topPhoneNumbers.push({
        id: call._id || call.sessionId || `call-${index}`,
        phoneNumber: call.toPhone || call.fromPhone || 'Unknown',
        campaignName: campaignName,
        campaignId: call.campaignId?._id || call.campaignId || null,
        duration: durationFormatted,
        status: call.status,
        createdAt: call.startedAt || call.createdAt,
        agentName: agentName,
        callData: call, // Store full call data for modal
      });
    });
  }

  // Show "No data" message if empty - no dummy data
  const hasTopCallsData = topPhoneNumbers.length > 0 && !loadingTopCalls;

  const credits = creditBalance !== null ? creditBalance : 0;
  const isLowCredits = credits < 100 && credits > 0;
  const isNoCredits = credits <= 0;

  const handleCampaignClick = async (campaignId) => {
    try {
      setLoadingDetails(true);
      setSelectedCampaign(campaignId);
      setShowCampaignModal(true);
      
      // Fetch campaign details
      const response = await campaignAPI.get(campaignId);
      const campaignData = response.data || response;
      setCampaignDetails(campaignData);
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      // Still show modal with basic info from the campaign list
      const campaign = campaigns.find(c => (c._id || c.id) === campaignId);
      if (campaign) {
        setCampaignDetails(campaign);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePhoneClick = async (phoneNumber, campaignName) => {
    try {
      setLoadingCallDetails(true);
      setSelectedPhoneNumber(phoneNumber);
      setShowCallModal(true);
      
      // Fetch call details by phone number
      const response = await callAPI.getAllCalls({ 
        phoneNumbers: [phoneNumber],
        limit: 1,
        sort: 'desc'
      });
      
      const calls = response.data?.calls || response.data || [];
      if (calls.length > 0) {
        setCallDetails({
          ...calls[0],
          campaignName: campaignName
        });
      } else {
        // If no call found, show basic info
        setCallDetails({
          phoneNumber: phoneNumber,
          campaignName: campaignName,
          status: 'No call data found'
        });
      }
    } catch (err) {
      console.error('Error fetching call details:', err);
      // Show basic info even if API fails
      setCallDetails({
        phoneNumber: phoneNumber,
        campaignName: campaignName,
        status: 'Error loading call details'
      });
    } finally {
      setLoadingCallDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Live Voice AI Operations</span>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Realtime Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-xl">
            Monitor calls, agents, and system health in one control surface.
          </p>
        </div>
      </div>

      {/* Credit Warning Banner */}
      {isNoCredits && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80">
          <div className="flex items-center">
            <FaCoins className="text-red-500 mr-3" size={24} />
            <div>
              <h3 className="text-red-800 font-semibold">No Credits Available</h3>
              <p className="text-red-600 text-sm mt-1">
                Your account has run out of credits. You cannot make or receive calls until credits are added.
                Please contact your administrator to add credits to your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowCredits && (
        <div className="glass-card border-l-4 border-amber-400/80 bg-amber-50/80">
          <div className="flex items-center">
            <FaCoins className="text-yellow-500 mr-3" size={24} />
            <div>
              <h3 className="text-yellow-800 font-semibold">Low Credit Balance</h3>
              <p className="text-yellow-600 text-sm mt-1">
                You have {credits} credits remaining. Consider adding more credits to avoid service interruption.
                (1 credit = 1 second of call time)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const isCredit = kpi.title === 'Credit Balance';
          const changeColor = kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500';
          const isEmerald = kpi.title === 'Active Campaigns' || kpi.title === 'Credit Balance';
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {kpi.title}
                    </p>
                    <div className={`text-xl font-semibold tabular-nums ${
                      kpi.warning ? "text-red-500" : "text-zinc-900"
                    }`}>
                      {kpi.value}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white ${
                      isEmerald && "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isEmerald ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
                {/* Only show status row for Validity and Credit Balance cards */}
                {(kpi.title === 'Credit Balance' || kpi.title === 'Validity') && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      {kpi.title === 'Credit Balance' ? 'Status' : ''}
                    </span>
                    {kpi.title === 'Credit Balance' && (
                      <span className={`font-medium ${
                        kpi.warning ? 'text-red-500' : changeColor
                      }`}>
                        {kpi.change}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Call this month as live wave cards + FAQ/Terms */}
      {(hasTopCallsData || campaigns.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                  ●
                </div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Top calls this month
                </h2>
              </div>
              <p className="text-xs md:text-sm text-zinc-500">
                Top phone numbers from recent campaigns
              </p>
            </div>
            <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
              {loadingTopCalls ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-emerald-500" size={24} />
                  <span className="ml-2 text-zinc-500 text-sm">Loading top calls...</span>
                </div>
              ) : hasTopCallsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {topPhoneNumbers.map((phoneData, index) => (
                    <TopCallCard
                      key={phoneData.id}
                      phoneData={phoneData}
                      index={index}
                      onClick={() => {
                        // Use full call data if available, otherwise fetch
                        if (phoneData.callData) {
                          setCallDetails(phoneData.callData);
                          setShowCallModal(true);
                        } else {
                          handlePhoneClick(phoneData.phoneNumber, phoneData.campaignName);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No phone numbers found in recent campaigns
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* FAQ Card */}
            <div className="glass-card p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FaFileAlt className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Privacy Policy
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                Read how we safeguard your data and respect your privacy.
              </p>
              <a
                href="/pdfs/Privacy_Policy.pdf"
                download="Privacy_Policy.pdf"
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download Privacy Policy PDF</span>
              </a>
            </div>

            {/* Terms & Conditions Card */}
            <div className="glass-card p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FaFileAlt className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Terms & Conditions
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                Latest policy and compliance guidelines
              </p>
              <a
                href="/pdfs/T&C.pdf"
                download="Terms-and-Conditions.pdf"
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download Terms PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Call Outcome Funnel */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Weekly Call Volume <span className="text-xs font-normal text-zinc-500">(Last 7 days)</span>
          </h3>
          {weeklyCallsOverTime && weeklyCallsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 280}>
              <BarChart data={weeklyCallsOverTime} margin={{ bottom: isMobile ? 10 : 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="day" 
                  stroke="#71717a" 
                  tick={<WeeklyTick />}
                  interval={0}
                  height={isMobile ? 50 : 60}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="calls" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No weekly data available
            </div>
          )}
        </div>

        {/* Calls Over Time */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Calls Over Time
          </h3>
          {callsOverTimeData && callsOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={callsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {showCampaignModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => {
            setShowCampaignModal(false);
            setSelectedCampaign(null);
            setCampaignDetails(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Campaign Details
                </h2>
                <button
                  onClick={() => {
                    setShowCampaignModal(false);
                    setSelectedCampaign(null);
                    setCampaignDetails(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-6 flex items-center justify-center">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : campaignDetails ? (
              <div className="p-6 space-y-6">
                {/* Campaign Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign ID</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails._id || campaignDetails.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign Name</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Created At</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.createdAt 
                          ? new Date(campaignDetails.createdAt).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Start Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.startTime || campaignDetails.startDate 
                          ? new Date(campaignDetails.startTime || campaignDetails.startDate).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">End Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.endTime || campaignDetails.endDate 
                          ? new Date(campaignDetails.endTime || campaignDetails.endDate).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Status</p>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          campaignDetails.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : campaignDetails.status === 'paused'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : campaignDetails.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-zinc-50 text-zinc-700 border border-zinc-200'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {campaignDetails.status ? campaignDetails.status.charAt(0).toUpperCase() + campaignDetails.status.slice(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Total Numbers</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.totalCalls || campaignDetails.phoneNumbers?.length || campaignDetails.liveStats?.totalNumbers || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Active Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.liveStats?.activeCalls || campaignDetails.activeCalls || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Completed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.completedCalls || campaignDetails.liveStats?.completed || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Failed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.failedCalls || campaignDetails.liveStats?.failed || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Contact Details Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FaDownload size={16} />
                  <span>Download Contact Details</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">
                No campaign details available
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedCampaign(null);
                  setCampaignDetails(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
      )}

      {/* Call Details Modal */}
      {showCallModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => {
            setShowCallModal(false);
            setSelectedPhoneNumber(null);
            setCallDetails(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Call Details
                </h2>
                <button
                  onClick={() => {
                    setShowCallModal(false);
                    setSelectedPhoneNumber(null);
                    setCallDetails(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {loadingCallDetails ? (
              <div className="p-6 flex items-center justify-center">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : callDetails ? (
              <div className="p-6 space-y-6">
                {/* Call Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Phone Number</p>
                      <p className="text-sm font-semibold text-zinc-900">{callDetails.phoneNumber || callDetails.toPhone || callDetails.fromPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {/* For outbound calls, get campaign name from populated campaignId */}
                        {/* For inbound calls, show N/A */}
                        {callDetails.direction === 'outbound'
                          ? (callDetails.campaignId?.name || callDetails.campaignName || 'N/A')
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Call ID</p>
                      <p className="text-sm text-zinc-700 font-mono">{callDetails.sessionId || callDetails.exotelCallSid || callDetails.callSid || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Started At</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.startedAt 
                          ? new Date(callDetails.startedAt).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : callDetails.createdAt
                          ? new Date(callDetails.createdAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Ended At</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.endedAt 
                          ? new Date(callDetails.endedAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Status</p>
                      <div>
                        {callDetails.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FaCheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        ) : callDetails.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <FaTimesCircle className="h-3 w-3" />
                            Failed
                          </span>
                        ) : callDetails.status === 'in-progress' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <FaSpinner className="h-3 w-3 animate-spin" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-zinc-50 text-zinc-700 border border-zinc-200">
                            {callDetails.status || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Duration</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {callDetails.duration 
                          ? formatDuration(callDetails.duration)
                          : callDetails.durationSec
                          ? formatDuration(callDetails.durationSec)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Credits Consumed</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {callDetails.creditsConsumed || callDetails.durationSec || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Direction</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.direction === 'outbound' ? 'Outbound' : callDetails.direction === 'inbound' ? 'Inbound' : 'N/A'}
                      </p>
                    </div>
                    {callDetails.recordingUrl && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-zinc-500 mb-2">Recording</p>
                        <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                          <audio
                            ref={audioRef}
                            src={callDetails.recordingUrl}
                            onTimeUpdate={() => {
                              if (audioRef.current) {
                                setCurrentTime(audioRef.current.currentTime);
                              }
                            }}
                            onLoadedMetadata={() => {
                              if (audioRef.current) {
                                setDuration(audioRef.current.duration);
                              }
                            }}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                          />

                          {/* Progress bar */}
                          <div className="mb-3">
                            <input
                              type="range"
                              min="0"
                              max={duration || 100}
                              value={currentTime}
                              onChange={(e) => {
                                const time = parseFloat(e.target.value);
                                if (audioRef.current) {
                                  audioRef.current.currentTime = time;
                                  setCurrentTime(time);
                                }
                              }}
                              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-500 mt-1">
                              <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
                              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Play/Pause */}
                              <button
                                onClick={() => {
                                  if (audioRef.current) {
                                    if (isPlaying) {
                                      audioRef.current.pause();
                                    } else {
                                      audioRef.current.play();
                                    }
                                    setIsPlaying(!isPlaying);
                                  }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                              >
                                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
                              </button>

                              {/* Volume */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (audioRef.current) {
                                      const newMuted = !isMuted;
                                      audioRef.current.muted = newMuted;
                                      setIsMuted(newMuted);
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-zinc-700 transition-colors"
                                >
                                  {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
                                </button>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={isMuted ? 0 : volume}
                                  onChange={(e) => {
                                    const newVolume = parseFloat(e.target.value);
                                    if (audioRef.current) {
                                      audioRef.current.volume = newVolume;
                                      setVolume(newVolume);
                                      if (newVolume > 0) setIsMuted(false);
                                    }
                                  }}
                                  className="w-20 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Download */}
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(callDetails.recordingUrl);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `recording-${callDetails.sessionId || callDetails.callSid || 'call'}.mp3`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch (err) {
                                  console.error('Download failed:', err);
                                  // Fallback: open in new tab
                                  window.open(callDetails.recordingUrl, '_blank');
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              <FaDownload size={12} />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcript if available */}
                {callDetails.transcript && callDetails.transcript.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-500 mb-2">Transcript</p>
                    <div className="bg-zinc-50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                      {Array.isArray(callDetails.transcript) ? (
                        callDetails.transcript.map((entry, idx) => (
                          <div key={entry._id || idx} className={`text-sm ${entry.speaker === 'user' ? 'text-blue-700' : 'text-zinc-700'}`}>
                            <span className="font-medium capitalize">{entry.speaker || entry.role || 'Unknown'}:</span>{' '}
                            <span>{entry.text || entry.content || ''}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                          {typeof callDetails.transcript === 'string' ? callDetails.transcript : JSON.stringify(callDetails.transcript)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">
                No call details available
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setSelectedPhoneNumber(null);
                  setCallDetails(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
      )}
    </div>
  );
};

function TopCallCard({ phoneData, index, onClick }) {
  // Use actual agent name from call data, fallback to index-based label
  const agentLabel = phoneData.agentName || `Agent ${index + 1}`;
  const phoneNumber = phoneData.phoneNumber || '';

  // Determine status color
  const getStatusColor = () => {
    switch (phoneData.status) {
      case 'completed':
        return 'text-emerald-500';
      case 'failed':
        return 'text-red-500';
      case 'in-progress':
        return 'text-blue-500';
      default:
        return 'text-emerald-500';
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/80 transition-all duration-200 hover:border-emerald-300 hover:shadow-emerald-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <FaPhone className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900">
              {phoneNumber}
            </p>
            <p className="text-[11px] text-slate-500">{phoneData.campaignName}</p>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="mt-3">
        <Waveform />
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <FiPhoneCall className={`h-3 w-3 ${getStatusColor()}`} />
          <span>{phoneData.duration}</span>
        </div>
        <span className="text-slate-500">
          Agent: <span className="font-medium text-slate-700">{agentLabel}</span>
        </span>
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex items-end gap-0.5 h-10 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => {
        // Create varying base heights for each bar (20% to 60%)
        const baseHeight = 20 + (i % 8) * 5;
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              height: `${baseHeight}%`,
              animationDelay: `${i * 0.03}s`,
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default DashboardOverview;
