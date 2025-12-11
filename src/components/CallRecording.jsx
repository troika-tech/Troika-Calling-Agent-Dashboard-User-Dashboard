import React, { useState, useEffect, useRef } from 'react';
import {
  FaMicrophone,
  FaPlay,
  FaPause,
  FaDownload,
  FaSearch,
  FaClock,
  FaSpinner,
  FaSortUp,
  FaSortDown,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { callAPI } from '../services/api';

const CallRecording = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [dateSortOrder, setDateSortOrder] = useState('desc');
  const [stats, setStats] = useState({ totalRecordings: 0, outgoing: 0, incoming: 0, totalDuration: 0 });
  const audioRef = useRef(null);

  // Get user from localStorage
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const getUserId = () => {
    const user = getUser();
    return user._id || user.id;
  };

  // Fetch recordings from API with server-side filtering (hasRecording=true)
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = getUserId();
      if (!userId) {
        setError('User not authenticated. Please login again.');
        setLoading(false);
        return;
      }

      // Use server-side filtering for recordings with pagination
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        userId,
        hasRecording: 'true', // Server-side filter for recordings only
      };

      const response = await callAPI.getAllCalls(params);
      console.log('Recordings response:', response);

      // The API returns { success, data: { calls, pagination } }
      // getAllCalls returns response.data, so response = { success, data: { calls, pagination } }
      const responseData = response?.data || response;
      const calls = responseData?.calls || [];

      // Transform data for display
      const transformedRecordings = calls.map(call => ({
        id: call._id || call.sessionId,
        callId: call.sessionId || call.exotelCallSid || call._id,
        phoneNumber: call.direction === 'outbound' ? call.toPhone : call.fromPhone,
        direction: call.direction || 'outbound',
        callType: call.direction === 'inbound' ? 'Incoming' : 'Outgoing',
        durationSec: call.durationSec || 0,
        duration: formatDurationDisplay(call.durationSec || 0),
        date: call.startedAt ? new Date(call.startedAt).toISOString().split('T')[0] : new Date(call.createdAt).toISOString().split('T')[0],
        time: call.startedAt ? new Date(call.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
        status: call.status || 'completed',
        recordingUrl: call.recordingUrl,
        dateTime: call.startedAt || call.createdAt
      }));

      setRecordings(transformedRecordings);

      // Update pagination from API response
      const apiPagination = responseData?.pagination || {};
      const totalRecordings = apiPagination.total || transformedRecordings.length;
      setPagination(prev => ({
        ...prev,
        total: totalRecordings,
        pages: apiPagination.pages || Math.ceil(totalRecordings / prev.limit)
      }));

      // Update total recordings in stats immediately from pagination (most accurate)
      // This ensures the card shows the correct total even if stats fetch is slow
      setStats(prev => ({
        ...prev,
        totalRecordings: totalRecordings
      }));

      // Fetch full stats separately for outgoing/incoming/duration breakdown
      if (totalRecordings > 0) {
        fetchStats();
      }

    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats separately - get ALL recordings to calculate accurate counts
  const fetchStats = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.log('No userId found for stats');
        return;
      }

      // For stats, fetch all recordings (high limit) to calculate outgoing/incoming/duration
      const statsParams = {
        limit: 10000,
        userId,
        hasRecording: 'true',
      };

      console.log('📊 Fetching stats with params:', statsParams);
      const statsResponse = await callAPI.getAllCalls(statsParams);
      console.log('📊 Stats Response (full):', statsResponse);
      console.log('📊 Stats Response type:', typeof statsResponse);
      console.log('📊 Stats Response keys:', Object.keys(statsResponse || {}));

      // getAllCalls returns response.data from axios
      // Backend returns: { success: true, data: { calls: [...], pagination: {...} } }
      // axios response.data = { success: true, data: { calls: [...], pagination: {...} } }
      // So statsResponse is: { success: true, data: { calls: [...], pagination: {...} } }
      // We need to access: statsResponse.data.calls
      
      // Handle both possible response structures
      let responseData;
      if (statsResponse?.data && Array.isArray(statsResponse.data.calls)) {
        // Structure: { success: true, data: { calls: [...], pagination: {...} } }
        responseData = statsResponse.data;
      } else if (statsResponse?.calls) {
        // Structure: { calls: [...], pagination: {...} }
        responseData = statsResponse;
      } else {
        // Fallback
        responseData = statsResponse?.data || statsResponse || {};
      }
      
      console.log('📊 Response Data:', responseData);
      console.log('📊 Response Data keys:', Object.keys(responseData || {}));
      console.log('📊 Response Data has calls?', !!responseData?.calls);
      console.log('📊 Response Data calls type:', Array.isArray(responseData?.calls) ? 'array' : typeof responseData?.calls);
      
      const statsCalls = Array.isArray(responseData?.calls) ? responseData.calls : [];
      const totalFromPagination = responseData?.pagination?.total || 0;
      
      console.log('📊 Stats Calls Count:', statsCalls.length);
      console.log('📊 Total from Pagination:', totalFromPagination);
      console.log('📊 First call sample:', statsCalls.length > 0 ? {
        direction: statsCalls[0].direction,
        durationSec: statsCalls[0].durationSec,
        hasRecording: !!statsCalls[0].recordingUrl,
        recordingUrl: statsCalls[0].recordingUrl ? 'exists' : 'missing'
      } : 'No calls');

      // Calculate stats from the fetched calls
      const outgoingCount = statsCalls.filter(c => c.direction === 'outbound').length;
      const incomingCount = statsCalls.filter(c => c.direction === 'inbound').length;
      const totalDurationSec = statsCalls.reduce((sum, c) => sum + (c.durationSec || 0), 0);

      // Use pagination total - this is the accurate count from backend
      // If pagination total is 0 but we have calls, use calls length as fallback
      const totalRecordings = totalFromPagination > 0 ? totalFromPagination : (statsCalls.length > 0 ? statsCalls.length : 0);

      console.log('📊 Calculated Stats:', { 
        totalRecordings, 
        outgoingCount, 
        incomingCount, 
        totalDurationSec,
        statsCallsLength: statsCalls.length,
        totalFromPagination
      });

      const newStats = {
        totalRecordings,
        outgoing: outgoingCount,
        incoming: incomingCount,
        totalDuration: totalDurationSec
      };
      
      console.log('📊 Setting stats:', newStats);
      setStats(newStats);
      console.log('✅ Stats set successfully');
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });
      // Set stats to zero on error to show something
      setStats({
        totalRecordings: 0,
        outgoing: 0,
        incoming: 0,
        totalDuration: 0
      });
    }
  };

  // Debug: Log stats whenever they change
  useEffect(() => {
    console.log('📊 Stats state updated:', stats);
  }, [stats]);

  useEffect(() => {
    fetchRecordings();
  }, [pagination.page, pagination.limit]);

  // Fetch stats on component mount and when recordings change
  useEffect(() => {
    fetchStats();
  }, []); // Only fetch stats once on mount, not on pagination change

  // Format duration for display (MM:SS)
  const formatDurationDisplay = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format total duration for stats
  const formatTotalDuration = (seconds) => {
    if (!seconds) return '0m';
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${Math.floor(seconds / 60)}m`;
  };

  // Filter and sort recordings for display (client-side search only, pagination is server-side)
  const displayRecordings = recordings.filter(recording => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (recording.callId && recording.callId.toLowerCase().includes(query)) ||
      (recording.phoneNumber && recording.phoneNumber.includes(query)) ||
      (recording.callType && recording.callType.toLowerCase().includes(query))
    );
  }).sort((a, b) => {
    const dateA = new Date(a.dateTime).getTime();
    const dateB = new Date(b.dateTime).getTime();
    return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Use server-side pagination values
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = Math.min(startIndex + pagination.limit, pagination.total);

  const handlePlay = (recording) => {
    if (playingId === recording.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Play new recording
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(recording.id);
      // Create and play audio
      const audio = new Audio(recording.recordingUrl);
      audioRef.current = audio;
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setPlayingId(null);
      });
      audio.onended = () => {
        setPlayingId(null);
      };
    }
  };

  const handleDownload = async (recording) => {
    try {
      // Use backend proxy to avoid CORS issues
      const token = localStorage.getItem('authToken');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const downloadUrl = `${apiBaseUrl}/api/v1/analytics/calls/${recording.id}/recording/download`;

      // Fetch the audio file through backend proxy
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'audio/mpeg, audio/*, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `call_recording_${recording.id || Date.now()}.mp3`;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Cleanup after download
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      console.log('Recording downloaded successfully');
    } catch (err) {
      console.error('Error downloading recording:', err);
      alert('Failed to download recording. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-current flex-shrink-0" />
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        <span className="h-2 w-2 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaMicrophone className="h-3 w-3" />
          <span>Call Management</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Call Recording
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Listen, download, and manage your call recordings
        </p>
      </div>

      {/* Stats Cards
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Recordings
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {stats.totalRecordings}
                </div>
                <p className="text-xs text-zinc-500">All time</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaMicrophone className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Outgoing
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {stats.outgoing}
                </div>
                <p className="text-xs text-zinc-500">Recordings</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-purple-50">
                <FaArrowUp className="h-4 w-4 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Incoming
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {stats.incoming}
                </div>
                <p className="text-xs text-zinc-500">Recordings</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50">
                <FaArrowDown className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Total Duration
                </p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {formatTotalDuration(stats.totalDuration)}
                </div>
                <p className="text-xs text-zinc-500">All time</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaClock className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Filters and Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by phone number or call type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 outline-none"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Recordings List */}
      <div className="glass-panel overflow-hidden relative" style={{ zIndex: 1 }}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full table-fixed" style={{ minWidth: '900px' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Call Type
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}>
                    Date & Time
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Recordings
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Body - Fixed height for ~10 rows */}
        <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '450px' }}>
          <table className="w-full table-fixed" style={{ minWidth: '900px' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <FaSpinner className="animate-spin text-emerald-500" size={20} />
                      <span className="text-zinc-500 text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : displayRecordings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <FaMicrophone className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                    <p className="text-zinc-500 text-sm">No recordings found</p>
                  </td>
                </tr>
              ) : (
                displayRecordings.map((recording) => (
                  <tr key={recording.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-zinc-900">
                        {recording.phoneNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        recording.direction === 'inbound'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {recording.direction === 'inbound' ? (
                          <FaArrowDown size={10} />
                        ) : (
                          <FaArrowUp size={10} />
                        )}
                        {recording.callType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                        <FaClock className="h-3 w-3" />
                        {recording.duration}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-zinc-900">{recording.date}</div>
                      <div className="text-[10px] text-zinc-500">{recording.time}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-center">
                        {getStatusBadge(recording.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePlay(recording)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-medium transition-colors"
                        >
                          {playingId === recording.id ? (
                            <>
                              <FaPause size={10} />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <FaPlay size={10} />
                              <span>Play</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(recording)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full text-[10px] font-medium transition-colors"
                        >
                          <FaDownload size={10} />
                          <span>Download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{pagination.total > 0 ? startIndex + 1 : 0}</span> to <span className="text-emerald-600">{endIndex}</span> of <span className="text-zinc-900">{pagination.total}</span> recordings
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600">Show:</label>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 });
                }}
                className="px-2 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1 || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                First
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1 || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Prev
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Next
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Last
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallRecording;
