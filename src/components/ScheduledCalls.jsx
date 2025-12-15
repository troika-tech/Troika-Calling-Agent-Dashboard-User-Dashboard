import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaSearch, FaFilter, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner, FaEdit, FaTimes, FaCalendar, FaSync, FaEye, FaVolumeUp } from 'react-icons/fa';
import { schedulingAPI, callAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const ScheduledCalls = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    agentId: '',
    startDate: '',
    endDate: '',
  });
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [callDetails, setCallDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
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

  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination({ ...pagination, page: 1 });
    } else {
      fetchScheduledCalls();
    }
  }, [filters]);

  useEffect(() => {
    fetchScheduledCalls();
  }, [pagination.page, pagination.limit]);

  const fetchScheduledCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = getUserId();
      if (!userId) {
        setError('User not authenticated. Please login again.');
        setLoading(false);
        return;
      }

      const filterParams = {};
      if (filters.status) filterParams.status = filters.status;
      if (filters.agentId) filterParams.agentId = filters.agentId;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;

      const response = await schedulingAPI.getScheduledCalls(userId, filterParams);
      const calls = response.data?.scheduledCalls || [];

      // Debug: Log first call to inspect data structure
      if (calls.length > 0) {
        console.log('Sample scheduled call data:', calls[0]);
        console.log('ScheduledCall status:', calls[0].status);
        console.log('CallLog populated?:', calls[0].callLogId);
        console.log('CallLog status:', calls[0].callLogId?.status);
        console.log('CallLog failureReason:', calls[0].callLogId?.failureReason);
      }

      // Sort calls by scheduledFor date in descending order (most recent first)
      const sortedCalls = calls.sort((a, b) => {
        const dateA = new Date(a.scheduledFor);
        const dateB = new Date(b.scheduledFor);
        return dateB - dateA; // Descending order
      });

      // Apply client-side pagination
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const paginatedCalls = sortedCalls.slice(start, end);

      // Debug: Check if callLogId survives pagination
      console.log('=== PAGINATION DEBUG ===');
      console.log('Total calls from API:', calls.length);
      console.log('Pagination range:', start, 'to', end);
      console.log('Paginated calls count:', paginatedCalls.length);
      if (paginatedCalls.length > 0) {
        console.log('First paginated call:', paginatedCalls[0]);
        console.log('First paginated call status:', paginatedCalls[0].status);
        console.log('First paginated call callLogId:', paginatedCalls[0].callLogId);
      }
      console.log('=== END PAGINATION DEBUG ===');

      setScheduledCalls(paginatedCalls);
      setPagination({
        ...pagination,
        total: calls.length,
        pages: Math.ceil(calls.length / pagination.limit)
      });
    } catch (err) {
      console.error('Error fetching scheduled calls:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load scheduled calls');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (call) => {
    setSelectedCall(call);
    const scheduledDate = new Date(call.scheduledFor);
    setRescheduleDate(scheduledDate.toISOString().split('T')[0]);
    setRescheduleTime(scheduledDate.toTimeString().slice(0, 5));
    setShowRescheduleModal(true);
  };

  const handleCancelClick = (call) => {
    setSelectedCall(call);
    setShowCancelModal(true);
  };

  const confirmReschedule = async () => {
    try {
      const userId = getUserId();
      const scheduledFor = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();

      await schedulingAPI.rescheduleCall(selectedCall._id, userId, scheduledFor);
      toast.success('Call rescheduled successfully');
      setShowRescheduleModal(false);
      fetchScheduledCalls();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to reschedule call');
    }
  };

  const confirmCancel = async () => {
    try {
      const userId = getUserId();
      await schedulingAPI.cancelScheduledCall(selectedCall._id, userId);
      toast.success('Scheduled call cancelled');
      setShowCancelModal(false);
      fetchScheduledCalls();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel call');
    }
  };

  const handleViewDetails = async (call) => {
    if (!call.callLogId) {
      toast.error('No call log available for this scheduled call');
      return;
    }

    setSelectedCall(call);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setCallDetails(null);

    try {
      // Extract the ID string from populated callLogId (could be object or string)
      const callLogId = typeof call.callLogId === 'object' ? call.callLogId._id : call.callLogId;
      const response = await callAPI.getCallById(callLogId);
      setCallDetails(response.data);
    } catch (err) {
      console.error('Error fetching call details:', err);
      toast.error('Failed to load call details');
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatScheduledTime = (dateString, timezone) => {
    const date = new Date(dateString);
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'Asia/Kolkata'
    };
    return date.toLocaleString('en-US', options);
  };

  const getTimeUntil = (dateString) => {
    const now = new Date();
    const scheduled = new Date(dateString);
    const diff = scheduled - now;

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }
    return `In ${minutes}m`;
  };

  const getStatusBadge = (call) => {
    const status = call?.status || 'pending';
    // Get populated callLog data if available
    const callLog = call?.callLogId;

    console.log('getStatusBadge called:', {
      scheduledCallStatus: status,
      hasCallLog: !!callLog,
      isObject: typeof callLog === 'object',
      hasId: callLog?._id,
      callLogStatus: callLog?.status
    });

    const styles = {
      pending: 'bg-amber-50 text-amber-700 border border-amber-200',
      processing: 'bg-blue-50 text-blue-700 border border-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200',
      failed: 'bg-rose-50 text-rose-700 border border-rose-200',
      'no-answer': 'bg-orange-50 text-orange-700 border border-orange-200',
      busy: 'bg-purple-50 text-purple-700 border border-purple-200'
    };

    const icons = {
      pending: <FaClock className="inline mr-1" />,
      processing: <FaSpinner className="inline mr-1 animate-spin" />,
      completed: <FaCheckCircle className="inline mr-1" />,
      cancelled: <FaTimes className="inline mr-1" />,
      failed: <FaTimesCircle className="inline mr-1" />,
      'no-answer': <FaTimesCircle className="inline mr-1" />,
      busy: <FaTimesCircle className="inline mr-1" />
    };

    // Get detailed status from CallLog if available
    let displayStatus = status;
    let displayText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';

    // If there's a populated callLog (object with properties), use its status and failure reason
    // Check if callLog is an object (populated) not just an ObjectId string
    if (callLog && typeof callLog === 'object' && callLog._id) {
      // Check CallLog failure reason first
      if (callLog.failureReason) {
        displayStatus = callLog.failureReason === 'no_answer' ? 'no-answer' : callLog.failureReason;
        displayText = callLog.failureReason === 'no_answer' ? 'No Answer' :
                     callLog.failureReason === 'invalid_number' ? 'Invalid Number' :
                     callLog.failureReason === 'network_error' ? 'Network Error' :
                     callLog.failureReason === 'voicemail' ? 'Voicemail' :
                     callLog.failureReason.charAt(0).toUpperCase() + callLog.failureReason.slice(1);
      }
      // Check CallLog metadata for call outcome
      else if (callLog.metadata?.callOutcome) {
        const outcome = callLog.metadata.callOutcome;
        if (outcome === 'no-answer') {
          displayStatus = 'no-answer';
          displayText = 'No Answer';
        } else if (outcome === 'busy') {
          displayStatus = 'busy';
          displayText = 'Busy';
        } else if (outcome === 'failed') {
          displayStatus = 'failed';
          displayText = 'Failed';
        }
      }
      // Check CallLog status
      else if (callLog.status) {
        if (callLog.status === 'no-answer') {
          displayStatus = 'no-answer';
          displayText = 'No Answer';
        } else if (callLog.status === 'busy') {
          displayStatus = 'busy';
          displayText = 'Busy';
        } else if (callLog.status === 'completed') {
          displayStatus = 'completed';
          displayText = 'Completed';
        } else if (callLog.status === 'failed') {
          displayStatus = 'failed';
          displayText = 'Failed';
        }
      }
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[displayStatus] || styles[status] || styles.pending}`}>
        {icons[displayStatus] || icons[status]}
        {displayText}
      </span>
    );
  };

  // Reschedule Modal
  const RescheduleModal = () => {
    if (!showRescheduleModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="glass-panel w-full max-w-md p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900">Reschedule Call</h3>
            <button
              onClick={() => setShowRescheduleModal(false)}
              className="p-1 hover:bg-zinc-100 rounded"
            >
              <FaTimes className="text-zinc-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Phone Number</label>
              <p className="text-zinc-900 font-mono">{selectedCall?.phoneNumber}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={confirmReschedule}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
              >
                Confirm Reschedule
              </button>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Cancel Confirmation Modal
  const CancelModal = () => {
    if (!showCancelModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="glass-panel w-full max-w-md p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Cancel Scheduled Call</h3>
          <p className="text-zinc-600 mb-6">
            Are you sure you want to cancel the scheduled call to <span className="font-mono font-semibold">{selectedCall?.phoneNumber}</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmCancel}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
            >
              Yes, Cancel Call
            </button>
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg font-medium"
            >
              No, Keep It
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Call Details Modal (Transcript & Recording)
  const DetailsModal = () => {
    if (!showDetailsModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
        <div className="glass-panel w-full max-w-4xl my-8 p-6 rounded-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Call Details</h3>
              {selectedCall?.metadata?.autoScheduled && (
                <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <FaClock className="mr-1" />
                  Auto-Scheduled
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setCallDetails(null);
                if (audioRef.current) {
                  audioRef.current.pause();
                }
              }}
              className="p-2 hover:bg-zinc-100 rounded-lg"
            >
              <FaTimes className="text-zinc-500" size={20} />
            </button>
          </div>

          {loadingDetails ? (
            <div className="text-center py-12">
              <FaSpinner className="inline-block text-4xl text-emerald-500 animate-spin mb-4" />
              <p className="text-zinc-600">Loading call details...</p>
            </div>
          ) : callDetails ? (
            <div className="space-y-6">
              {/* Call Info Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-lg">
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Phone Number</p>
                  <p className="font-mono text-sm font-semibold">{callDetails.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Duration</p>
                  <p className="text-sm font-semibold">{formatDuration(callDetails.durationSec || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Status</p>
                  <p className="text-sm font-semibold text-emerald-600">{callDetails.outcome}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Credits</p>
                  <p className="text-sm font-semibold">{callDetails.credits || 0}</p>
                </div>
              </div>

              {/* Auto-Scheduled Source Info */}
              {selectedCall?.metadata?.autoScheduled && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Auto-Scheduled Details</h4>
                  <div className="space-y-1 text-sm text-purple-800">
                    {selectedCall.metadata.sourceCallLogId && (
                      <p><span className="font-medium">Source Call:</span> {selectedCall.metadata.sourceCallLogId}</p>
                    )}
                    {selectedCall.metadata.transcriptSnippet && (
                      <p><span className="font-medium">Detected Phrase:</span> "{selectedCall.metadata.transcriptSnippet}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recording */}
              {callDetails.recordingUrl && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 flex items-center gap-2 mb-3">
                    <FaVolumeUp />
                    Call Recording
                  </h4>
                  <audio
                    ref={audioRef}
                    src={callDetails.recordingUrl}
                    className="w-full"
                    controls
                  />
                </div>
              )}

              {/* Summary */}
              {callDetails.summary && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Call Summary</h4>
                  <p className="text-sm text-blue-800">{callDetails.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {callDetails.transcript && callDetails.transcript.length > 0 ? (
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-200">
                    <h4 className="font-semibold text-zinc-900">Transcript</h4>
                    <p className="text-xs text-zinc-500 mt-1">{callDetails.transcript.length} messages</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-white">
                    {callDetails.transcript.map((entry, index) => (
                      <div
                        key={index}
                        className={`flex ${entry.speaker === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-lg ${
                            entry.speaker === 'user'
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {entry.speaker === 'user' ? 'User' : 'Assistant'}
                          </p>
                          <p className="text-sm">{entry.text}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-lg">
                  <p className="text-zinc-500">No transcript available for this call</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-lg">
              <p className="text-zinc-500">No call details available</p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Scheduled Calls</h1>
          <p className="text-zinc-600 mt-1">Manage your upcoming scheduled calls</p>
        </div>
        <button
          onClick={fetchScheduledCalls}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <FaSync />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-zinc-500" />
          <h3 className="font-semibold text-zinc-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Items per page</label>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-12 rounded-xl text-center">
          <FaSpinner className="inline-block text-4xl text-emerald-500 animate-spin mb-4" />
          <p className="text-zinc-600">Loading scheduled calls...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-panel p-6 rounded-xl border-2 border-red-200 bg-red-50">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Scheduled Calls Table */}
      {!loading && !error && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Scheduled Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Time Until</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Recurring</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {scheduledCalls.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-zinc-500">
                      No scheduled calls found
                    </td>
                  </tr>
                ) : (
                  scheduledCalls.map((call) => (
                    <tr key={call._id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-zinc-900">{call.phoneNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {call.agentId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700">
                        <div className="flex items-center gap-1">
                          <FaClock className="text-zinc-400" />
                          {formatScheduledTime(call.scheduledFor, call.timezone)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {call.status === 'pending' ? (
                          <span className="text-amber-600 font-medium">{getTimeUntil(call.scheduledFor)}</span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(call)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {call.isRecurring ? (
                          <span className="text-blue-600 flex items-center gap-1">
                            <FaSync className="text-xs" />
                            {call.recurring?.frequency}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex gap-2 justify-end">
                          {call.status === 'completed' && call.callLogId && (
                            <button
                              onClick={() => handleViewDetails(call)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium flex items-center gap-1"
                            >
                              <FaEye />
                              View Details
                            </button>
                          )}
                          {call.canCancel && (
                            <>
                              <button
                                onClick={() => handleReschedule(call)}
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-medium flex items-center gap-1"
                              >
                                <FaEdit />
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelClick(call)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-medium flex items-center gap-1"
                              >
                                <FaTimes />
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {scheduledCalls.length > 0 && (
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
              <div className="text-sm text-zinc-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} scheduled calls
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 border border-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RescheduleModal />
      <CancelModal />
      <DetailsModal />
    </div>
  );
};

export default ScheduledCalls;
