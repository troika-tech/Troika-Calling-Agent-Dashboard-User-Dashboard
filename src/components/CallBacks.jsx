import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaPhone, FaCalendar, FaClock, FaCheckCircle, FaSpinner, FaPlus, FaEdit, FaTrash, FaRedo, FaSearch, FaFilter, FaChevronDown, FaEye, FaDownload } from 'react-icons/fa';
import { callAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const CallBacks = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [callBacks, setCallBacks] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null); // Track which follow-up is being updated
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    phoneNumbers: [],
    startDate: '',
    endDate: '',
  });
  const [phoneFilterOpen, setPhoneFilterOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [allPhoneNumbers, setAllPhoneNumbers] = useState([]);
  const [tempSelectedPhones, setTempSelectedPhones] = useState([]);
  const phoneFilterRef = useRef(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCallBack, setSelectedCallBack] = useState(null);

  useEffect(() => {
    // Reset to page 1 when filters change
    if (pagination.page !== 1) {
      setPagination({ ...pagination, page: 1 });
    } else {
      fetchCallBacks();
    }
  }, [filters]);

  useEffect(() => {
    fetchCallBacks();
  }, [pagination.page, pagination.limit]);

  // Fetch all unique phone numbers
  useEffect(() => {
    fetchAllPhoneNumbers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneFilterRef.current && !phoneFilterRef.current.contains(event.target)) {
        setPhoneFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAllPhoneNumbers = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
      };

      const response = await callAPI.getFollowUps(params);
      const allCalls = response.data?.calls || [];
      const uniquePhones = [...new Set(allCalls.map(call =>
        call.direction === 'outbound' ? call.toPhone : call.fromPhone
      ).filter(Boolean))].sort();
      setAllPhoneNumbers(uniquePhones);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
    }
  };

  // Function to detect callback requests in transcript
  const detectCallbackRequest = (transcript) => {
    if (!transcript || !Array.isArray(transcript)) return null;
    
    const callbackPhrases = [
      'call me',
      'call back',
      'callback',
      'call me back',
      'call me later',
      'call me at',
      'call me on',
      'call me tomorrow',
      'call me today',
      'call me evening',
      'call me morning',
      'call me afternoon',
      'mujhe call karo',
      'mujhe call karna',
      'mujhe call kar do',
      'mujhe call kar sakte ho',
      'aap mujhe call kar sakte ho',
      'aap call kar sakte ho',
      'call kar sakte ho',
      'call kar do',
      'call karna',
      'call karo',
      'baad me call',
      'baad mein call',
      'phir call',
      'fir call',
    ];

    const timePatterns = [
      /\b(\d{1,2})\s*(?:baje|o\'?clock|pm|am|:00)\b/gi,
      /\b(\d{1,2}):(\d{2})\s*(?:pm|am)?\b/gi,
      /\b(?:evening|morning|afternoon|night|shaam|subah|dopahar|raat)\b/gi,
      /\b(?:tomorrow|today|kal|aaj|parso)\b/gi,
    ];

    const transcriptText = transcript
      .map(t => (t.text || t.content || '').toLowerCase())
      .join(' ');

    // Check if any callback phrase exists
    const hasCallbackRequest = callbackPhrases.some(phrase => 
      transcriptText.includes(phrase.toLowerCase())
    );

    if (!hasCallbackRequest) return null;

    // Try to extract time
    let extractedTime = null;
    let scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: tomorrow

    // Extract time from transcript
    for (const pattern of timePatterns) {
      const matches = transcriptText.match(pattern);
      if (matches) {
        extractedTime = matches[0];
        // Try to parse time
        const hourMatch = transcriptText.match(/\b(\d{1,2})\s*(?:baje|o\'?clock|pm|am)\b/gi);
        if (hourMatch) {
          const hourStr = hourMatch[0].match(/\d{1,2}/);
          if (hourStr) {
            let hour = parseInt(hourStr[0]);
            if (transcriptText.includes('pm') && hour < 12) hour += 12;
            if (transcriptText.includes('am') && hour === 12) hour = 0;
            scheduledTime = new Date();
            scheduledTime.setHours(hour, 0, 0, 0);
            if (scheduledTime < new Date()) {
              scheduledTime.setDate(scheduledTime.getDate() + 1);
            }
          }
        }
        break;
      }
    }

    return {
      requested: true,
      extractedTime,
      scheduledTime: scheduledTime.toISOString(),
      requestText: transcriptText,
    };
  };

  const fetchCallBacks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.status) params.status = filters.status;
      if (filters.phoneNumbers && filters.phoneNumbers.length > 0) {
        params.phoneNumbers = filters.phoneNumbers;
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await callAPI.getFollowUps(params);
      const calls = response.data?.calls || [];

      // Map calls to follow-up format
      let callBacksList = calls.map(call => {
        const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
        const detectedKeywords = call.detectedKeywords || [];
        
        // Try to extract time from transcript if available
        const callbackInfo = detectCallbackRequest(call.transcript);
        
        return {
          _id: call._id || call.callSid || call.sessionId,
          phoneNumber: phone,
          originalCallId: call._id || call.callSid || call.sessionId,
          originalCallDate: call.startedAt || call.createdAt,
          scheduledTime: callbackInfo?.scheduledTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: callbackInfo?.extractedTime
            ? `Customer requested follow up at ${callbackInfo.extractedTime}`
            : detectedKeywords.length > 0
            ? `Follow-up keywords detected: ${detectedKeywords.join(', ')}`
            : 'Customer requested follow up',
          priority: 'high',
          campaignName: call.campaignName || '',
          attempts: 1,
          // Add call log fields for details modal
          callSid: call.sessionId || call.exotelCallSid || call.callSid,
          durationSec: call.durationSec || call.duration || call.callDuration || 0,
          creditsConsumed: call.creditsConsumed || call.durationSec || 0,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          createdAt: call.createdAt,
          direction: call.direction,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript,
          status: call.status || 'pending',
          detectedKeywords: detectedKeywords,
          actionStatus: call.actionStatus || 'pending', // Track completion status
        };
      });

      // Apply client-side filtering for phone numbers
      if (filters.phoneNumbers && filters.phoneNumbers.length > 0) {
        callBacksList = callBacksList.filter(cb => 
          filters.phoneNumbers.includes(cb.phoneNumber)
        );
      }

      // Apply date filtering
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        callBacksList = callBacksList.filter(cb => 
          new Date(cb.originalCallDate) >= startDate
        );
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        callBacksList = callBacksList.filter(cb => 
          new Date(cb.originalCallDate) <= endDate
        );
      }

      // Apply status filtering
      if (filters.status) {
        callBacksList = callBacksList.filter(cb => cb.status === filters.status);
      }

      // Remove duplicates by phone number (keep most recent)
      const uniqueCallBacks = [];
      const seenPhones = new Set();
      callBacksList
        .sort((a, b) => new Date(b.originalCallDate) - new Date(a.originalCallDate))
        .forEach(cb => {
          if (!seenPhones.has(cb.phoneNumber)) {
            seenPhones.add(cb.phoneNumber);
            uniqueCallBacks.push(cb);
          }
        });

      const total = uniqueCallBacks.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const paginatedCallBacks = uniqueCallBacks.slice(startIndex, startIndex + pagination.limit);

      setCallBacks(paginatedCallBacks);
      setPagination({
        ...pagination,
        total,
        pages: Math.ceil(total / pagination.limit)
      });
    } catch (err) {
      console.error('Error fetching follow ups:', err);
      setError('Failed to load follow ups');
      setCallBacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = (callBackId) => {
    setCallBacks(prev => prev.map(cb =>
      cb._id === callBackId
        ? { ...cb, status: 'completed' }
        : cb
    ));
  };

  const handleDeleteCallBack = (callBackId) => {
    if (window.confirm('Are you sure you want to delete this follow up?')) {
      setCallBacks(prev => prev.filter(cb => cb._id !== callBackId));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'pending': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'scheduled': 'bg-blue-50 text-blue-700 border border-blue-200',
      'cancelled': 'bg-red-50 text-red-700 border border-red-200',
      'in-progress': 'bg-blue-50 text-blue-700 border border-blue-200',
      'failed': 'bg-red-50 text-red-700 border border-red-200',
      'initiated': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'no-answer': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'busy': 'bg-orange-50 text-orange-700 border border-orange-200',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${styles[status] || styles.pending}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown'}
      </span>
    );
  };

  // Toggle follow-up action status (completed/pending)
  const handleToggleStatus = async (callBack) => {
    const newStatus = callBack.actionStatus === 'completed' ? 'pending' : 'completed';
    setUpdatingStatus(callBack._id);

    try {
      console.log('Updating follow-up status:', { followUpId: callBack._id, newStatus });
      const response = await callAPI.updateFollowUpStatus(callBack._id, newStatus);
      console.log('Follow-up status update response:', response);

      // Update local state
      setCallBacks(prev => prev.map(cb =>
        cb._id === callBack._id ? { ...cb, actionStatus: newStatus } : cb
      ));

      toast.success(`Follow-up marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update follow-up status:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isOverdue = (scheduledTime) => {
    if (!scheduledTime) return false;
    return new Date(scheduledTime) < new Date() && new Date(scheduledTime).getDate() !== new Date().getDate();
  };

  const getFilteredPhoneNumbers = () => {
    if (!phoneSearch) return allPhoneNumbers;
    return allPhoneNumbers.filter((phone) =>
      phone.toLowerCase().includes(phoneSearch.toLowerCase())
    );
  };

  const filteredPhones = getFilteredPhoneNumbers();
  const allFilteredSelected = filteredPhones.length > 0 && filteredPhones.every(phone => tempSelectedPhones.includes(phone));

  if (loading && callBacks.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading follow ups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaRedo className="h-3 w-3" />
            <span>Follow up management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Follow Up
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Schedule and manage follow ups
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="relative" ref={phoneFilterRef} style={{ zIndex: 1000 }}>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Phone Number
            </label>
            <button
              type="button"
              onClick={() => {
                setPhoneFilterOpen(!phoneFilterOpen);
                if (!phoneFilterOpen) {
                  setTempSelectedPhones([...filters.phoneNumbers]);
                }
              }}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 flex items-center justify-between text-xs"
            >
              <span className="text-left">
                {filters.phoneNumbers.length === 0
                  ? 'All Phone Numbers'
                  : filters.phoneNumbers.length === 1
                  ? filters.phoneNumbers[0]
                  : `${filters.phoneNumbers.length} selected`}
              </span>
              <FaChevronDown className={`ml-2 transition-transform ${phoneFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {phoneFilterOpen && (
              <div className="absolute w-full mt-1 glass-card border border-zinc-200 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col" style={{ zIndex: 1001 }}>
                {/* Search Bar */}
                <div className="p-3 border-b border-zinc-200">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded bg-white text-zinc-900 text-xs focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Select All Checkbox */}
                <div className="p-2 border-b border-zinc-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = [...new Set([...tempSelectedPhones, ...filteredPhones])];
                          setTempSelectedPhones(newSelected);
                        } else {
                          setTempSelectedPhones(tempSelectedPhones.filter(p => !filteredPhones.includes(p)));
                        }
                      }}
                      className="mr-2 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-zinc-700">(Select All)</span>
                  </label>
                </div>

                {/* Phone Numbers List */}
                <div className="overflow-y-auto flex-1">
                  {filteredPhones.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">
                      No phone numbers found
                    </div>
                  ) : (
                    filteredPhones.map((phone) => (
                      <label
                        key={phone}
                        className="flex items-center px-3 py-2 hover:bg-zinc-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={tempSelectedPhones.includes(phone)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempSelectedPhones([...tempSelectedPhones, phone]);
                            } else {
                              setTempSelectedPhones(tempSelectedPhones.filter((p) => p !== phone));
                            }
                          }}
                          className="mr-3 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-zinc-900">{phone}</span>
                      </label>
                    ))
                  )}
                </div>

                {/* OK and Cancel Buttons */}
                <div className="p-3 border-t border-zinc-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneFilterOpen(false);
                      setTempSelectedPhones([...filters.phoneNumbers]);
                      setPhoneSearch('');
                    }}
                    className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, phoneNumbers: tempSelectedPhones });
                      setPhoneFilterOpen(false);
                      setPhoneSearch('');
                    }}
                    className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              max={filters.endDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              min={filters.startDate || undefined}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters({
                status: '',
                phoneNumbers: [],
                startDate: '',
                endDate: '',
              })}
              className="w-full px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors text-xs font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Follow Ups Table */}
      <div className="glass-panel overflow-hidden relative" style={{ zIndex: 1 }}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Call SID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Credits
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Tag
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Original Call
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Campaign
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {callBacks.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    {loading ? 'Loading...' : 'No follow ups found'}
                  </td>
                </tr>
              ) : (
                callBacks.map((callBack) => (
                  <tr
                    key={callBack._id}
                    className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors ${
                      isOverdue(callBack.scheduledTime) && callBack.status === 'pending'
                        ? 'bg-red-50/30 border-l-4 border-red-500/70'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-zinc-900">
                      <span className="font-mono">{(callBack.callSid || callBack.originalCallId || 'N/A').substring(0, 20)}...</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                      {callBack.phoneNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                      {formatDuration(callBack.durationSec)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-emerald-600">
                      {callBack.creditsConsumed || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {callBack.detectedKeywords && callBack.detectedKeywords.length > 0 ? (
                          callBack.detectedKeywords.slice(0, 3).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                            >
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">No tags</span>
                        )}
                        {callBack.detectedKeywords && callBack.detectedKeywords.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                            +{callBack.detectedKeywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                      <div>{formatDate(callBack.scheduledTime)}</div>
                      {isOverdue(callBack.scheduledTime) && callBack.status === 'pending' && (
                        <div className="text-xs text-red-600 font-medium mt-1">⚠️ Overdue</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                      {formatDate(callBack.originalCallDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                      {callBack.campaignName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(callBack)}
                          disabled={updatingStatus === callBack._id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                            callBack.actionStatus === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-zinc-300'
                          } ${updatingStatus === callBack._id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          title={callBack.actionStatus === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                              callBack.actionStatus === 'completed' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-[10px] font-medium ${
                          callBack.actionStatus === 'completed' ? 'text-emerald-600' : 'text-zinc-500'
                        }`}>
                          {callBack.actionStatus === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCallBack(callBack);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-medium transition-colors shrink-0 max-w-fit"
                          style={{ borderRadius: '9999px' }}
                        >
                          <FaEye size={10} />
                          <span>View</span>
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
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> follow ups
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
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »»
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Call Details Modal */}
      {showDetailsModal && selectedCallBack && createPortal(
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
            setShowDetailsModal(false);
            setSelectedCallBack(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900">
                    Follow Up Details
                  </h2>
                  <p className="text-xs text-zinc-600 mt-1">
                    Phone: {selectedCallBack.phoneNumber} | Scheduled: {formatDate(selectedCallBack.scheduledTime)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCallBack(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Follow Up Info */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                  Follow Up Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Status</p>
                    <p className="text-sm text-zinc-900">{getStatusBadge(selectedCallBack.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Campaign</p>
                    <p className="text-sm text-zinc-900">{selectedCallBack.campaignName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Original Call Date</p>
                    <p className="text-sm text-zinc-900">{formatDate(selectedCallBack.originalCallDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Scheduled Time</p>
                    <p className="text-sm text-zinc-900">{formatDate(selectedCallBack.scheduledTime)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-600 mb-1">Notes</p>
                    <p className="text-sm text-zinc-900">{selectedCallBack.notes || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Recording Section */}
              {selectedCallBack.recordingUrl && (
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                    Recording
                  </h3>
                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <audio controls className="w-full">
                      <source src={selectedCallBack.recordingUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="mt-3">
                      <a
                        href={selectedCallBack.recordingUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
                      >
                        <FaDownload size={14} />
                        <span>Download Recording</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript Section */}
              {selectedCallBack.transcript && (
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                    Transcript
                  </h3>
                  {Array.isArray(selectedCallBack.transcript) && selectedCallBack.transcript.length > 0 ? (
                    <div className="space-y-4">
                      {selectedCallBack.transcript.map((entry, index) => {
                        const speaker = entry.speaker || entry.role || 'assistant';
                        const isUser = speaker === 'user';
                        const displayName = isUser ? 'User' : 'Assistant';

                        return (
                          <div
                            key={index}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-4 rounded-lg border ${
                                isUser
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                              }`}
                            >
                              <p className="font-semibold mb-1 text-sm">{displayName}:</p>
                              <p className="text-sm whitespace-pre-wrap">{entry.text || entry.content}</p>
                              {entry.timestamp && (
                                <p className="text-xs text-zinc-500 mt-2 text-right">
                                  {new Date(entry.timestamp).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-200">
                      <p className="text-zinc-500">No transcript available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCallBack(null);
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

export default CallBacks;
