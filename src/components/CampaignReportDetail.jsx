/* eslint-disable */
// @ts-nocheck
// Note: TypeScript/ESLint errors here are false positives due to Windows case-insensitivity
// seeing both 'user-dashboard' and 'User-Dashboard' directories as duplicates
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaPhone, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaDollarSign,
  FaPlay,
  FaCircle,
  FaRedo,
  FaDownload,
  FaFilter,
  FaCalendar,
  FaSpinner,
  FaChevronDown,
  FaSearch
} from 'react-icons/fa';
import { campaignAPI, callAPI } from '../services/api';

const CampaignReportDetail = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [callLogs, setCallLogs] = useState([]); // Keep for backward compatibility
  const [stats, setStats] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  
  // Analytics tab - Campaign Contacts with server-side pagination
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsPages, setContactsPages] = useState(0);
  
  // Filters for Analytics tab
  const [phoneFilter, setPhoneFilter] = useState([]); // Changed to array for multiple selection
  const [statusFilter, setStatusFilter] = useState('');
  const [interactionFilter, setInteractionFilter] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [phoneFilterOpen, setPhoneFilterOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [allPhoneNumbers, setAllPhoneNumbers] = useState([]);
  const [tempSelectedPhones, setTempSelectedPhones] = useState([]);
  const phoneFilterRef = useRef(null);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [transcriptCall, setTranscriptCall] = useState(null);
  const [recordingDurations, setRecordingDurations] = useState({}); // Store recording durations by contact ID

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  // Fetch campaign contacts when analytics tab is active or filters change
  useEffect(() => {
    if (activeTab === 'analytics' && campaignId) {
      fetchCampaignContacts();
    }
  }, [activeTab, campaignId, currentPage, entriesPerPage, statusFilter, phoneFilter, interactionFilter]);

  // Fetch unique phone numbers for filter dropdown (fetch first page to get all unique phones)
  useEffect(() => {
    if (activeTab === 'analytics' && campaignId) {
      console.log('Fetching unique phone numbers for campaign:', campaignId);
      fetchUniquePhoneNumbers();
    }
  }, [activeTab, campaignId]);

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

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign report overview (includes all data for overview tab)
      const overviewResponse = await campaignAPI.getReportOverview(campaignId);
      const overviewData = overviewResponse.data || overviewResponse;
      
      if (!overviewData || !overviewData.campaign) {
        throw new Error('Campaign not found');
      }

      // Set campaign data
      setCampaign(overviewData.campaign);
      
      // Set overview data for display
      setOverviewData(overviewData.overview);
      
      // Set stats from overview data
      if (overviewData.overview) {
        setStats({
          totalNumbers: overviewData.overview.campaignTarget || 0,
          completedCalls: overviewData.overview.highEngagement || 0,
          failedCalls: overviewData.overview.failedCalls || 0,
        });
      }
        
      // Note: Campaign contacts are now fetched separately when analytics tab is active
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to load campaign details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getCreditsUsed = () => {
    return campaign?.stats?.completed ?? campaign?.completedCalls ?? 0;
  };

  // Fetch campaign contacts with server-side pagination
  const fetchCampaignContacts = async () => {
    if (!campaignId) return;
    
    try {
      setContactsLoading(true);
      
      const params = {
        page: currentPage,
        limit: entriesPerPage === 10000 ? 10000 : entriesPerPage, // Use large limit for "All"
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      if (phoneFilter && phoneFilter.length > 0) {
        params.phoneNumbers = phoneFilter;
      }
      
      if (interactionFilter) {
        params.hasInteraction = interactionFilter === 'interaction';
      }
      
      const response = await campaignAPI.getAnalyticsContacts(campaignId, params);
      const data = response.data || response;
      
      setContacts(data.contacts || []);
      setContactsTotal(data.total || 0);
      setContactsPages(data.pages || 0);
    } catch (err) {
      console.error('Error fetching campaign contacts:', err);
      setContacts([]);
      setContactsTotal(0);
      setContactsPages(0);
    } finally {
      setContactsLoading(false);
    }
  };

  // Fetch unique phone numbers for filter dropdown (from CampaignContact, not CallLog)
  const fetchUniquePhoneNumbers = async () => {
    if (!campaignId) return;

    try {
      console.log('Fetching phone numbers for campaign:', campaignId);

      // Use the dedicated endpoint to get phone numbers from CampaignContact
      const response = await campaignAPI.getPhoneNumbers(campaignId);

      console.log('Phone numbers API response:', {
        hasResponse: !!response,
        phoneNumbers: response?.phoneNumbers,
        total: response?.total
      });

      const phoneNumbers = response?.phoneNumbers || [];

      console.log('Fetched unique phone numbers:', {
        uniquePhonesCount: phoneNumbers.length,
        samplePhones: phoneNumbers.slice(0, 5)
      });

      setAllPhoneNumbers(phoneNumbers);
    } catch (err) {
      console.error('Error fetching unique phone numbers:', err);
      console.error('Error details:', err.response?.data || err.message);
      setAllPhoneNumbers([]);
    }
  };

  const calculateStats = () => {
    // Use overview data if available (from backend), otherwise calculate from call logs
    if (overviewData) {
      return {
        totalCalls: overviewData.campaignTarget || 0,
        completed: overviewData.highEngagement || 0,
        failed: overviewData.failedCalls || 0,
        pickedUp: overviewData.pickupRate?.count || 0,
        pickupRate: overviewData.pickupRate?.percentage || 0,
        notReachable: overviewData.failedCalls || 0,
        noAnswer: 0,
        busy: 0,
        failedCount: overviewData.failedCalls || 0,
        noInteraction: overviewData.noOrMinimalEngagement || 0,
        pending: overviewData.remaining?.count || 0,
        pendingPercent: overviewData.remaining?.percentage || 0,
      };
    }

    // Fallback: calculate from campaign and call logs
    if (!campaign && !stats) return null;

    const totalCalls = campaign?.phoneNumbers?.length || stats?.totalNumbers || 0;
    const completed = campaign?.completedCalls || stats?.completedCalls || 0;
    const failed = campaign?.failedCalls || stats?.failedCalls || 0;
    const pickedUp = callLogs.filter(call => 
      call.status === 'completed' || call.status === 'in-progress'
    ).length;
    const pickupRate = totalCalls > 0 ? ((pickedUp / totalCalls) * 100).toFixed(0) : 0;
    
    // Calculate not reachable
    const notReachable = callLogs.filter(call => 
      call.status === 'no-answer' || call.status === 'busy' || call.status === 'failed'
    ).length;
    const noAnswer = callLogs.filter(call => call.status === 'no-answer').length;
    const busy = callLogs.filter(call => call.status === 'busy').length;
    const failedCount = callLogs.filter(call => call.status === 'failed').length;
    
    // Calculate interaction
    const noInteraction = callLogs.filter(call => 
      call.status === 'completed' && (!call.transcript || call.transcript.length === 0)
    ).length;
    
    const pending = totalCalls - completed - failed;

    return {
      totalCalls,
      completed,
      failed,
      pickedUp,
      pickupRate,
      notReachable,
      noAnswer,
      busy,
      failedCount,
      noInteraction,
      pending,
      pendingPercent: totalCalls > 0 ? ((pending / totalCalls) * 100).toFixed(0) : 0
    };
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    if (activeTab === 'analytics') {
      setCurrentPage(1);
    }
  }, [phoneFilter, statusFilter, interactionFilter, entriesPerPage]);

  const getFilteredPhoneNumbers = () => {
    if (!phoneSearch) return allPhoneNumbers;
    return allPhoneNumbers.filter((phone) =>
      phone.toLowerCase().includes(phoneSearch.toLowerCase())
    );
  };

  const filteredPhones = getFilteredPhoneNumbers();
  const allFilteredSelected = filteredPhones.length > 0 && filteredPhones.every(phone => tempSelectedPhones.includes(phone));

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'failed': 'bg-red-50 text-red-700 border border-red-200',
      'in-progress': 'bg-blue-50 text-blue-700 border border-blue-200',
      'no-answer': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'busy': 'bg-orange-50 text-orange-700 border border-orange-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${styles[status] || 'bg-zinc-100 text-zinc-700 border border-zinc-200'}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'unknown'}
      </span>
    );
  };

  const getInteractionBadge = (contact) => {
    const hasInteraction = contact.hasInteraction !== undefined 
      ? contact.hasInteraction 
      : (contact.transcript && contact.transcript.length > 0);
    if (hasInteraction) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
          Interaction
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        No Interaction
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 font-medium">Error loading campaign</p>
          <p className="text-red-600 text-sm mt-1">{error || 'Campaign not found'}</p>
          <button
            onClick={() => navigate('/delivery-reports')}
            className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const calculatedStats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/delivery-reports')}
          className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 bg-white rounded-full text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-all"
        >
          <FaArrowLeft size={12} />
          <span>Back to Reports</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'analytics'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Analytics
          </button>
      </div>

      {/* Campaign Header */}
          <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaPhone className="h-3 w-3" />
          <span>Campaign details</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
              Campaign: {campaign.name}
            </h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              campaign.status === 'completed' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : campaign.status === 'active' || campaign.status === 'running'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : campaign.status === 'paused'
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
              {campaign.status || 'unknown'}
            </span>
          </div>
        </div>

      {/* Campaign Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 mb-1">Number</p>
          <p className="text-sm font-semibold text-zinc-900">{campaign.phoneId?.number || 'N/A'}</p>
          </div>
        <div className="glass-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 mb-1">Created By</p>
          <p className="text-sm font-semibold text-zinc-900">{campaign.userId?.name || campaign.userId?.email || 'N/A'}</p>
          </div>
        <div className="glass-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 mb-1">Created On</p>
          <p className="text-sm font-semibold text-zinc-900">
              {campaign.createdAt ? new Date(campaign.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(',', ' at') : 'N/A'}
            </p>
        </div>
      </div>

      {activeTab === 'overview' && calculatedStats && (
        <>
          {/* Campaign Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Campaign Target</p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.totalCalls}</div>
                  </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <FaPhone className="h-4 w-4 text-zinc-500" />
                </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Total Attempted</p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.totalCalls}</div>
                  </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <FaPlay className="h-4 w-4 text-zinc-500" />
                </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Pickup Rate</p>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.pickedUp}</div>
                      <span className="text-sm font-medium text-emerald-500">{calculatedStats.pickupRate}%</span>
                    </div>
                </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100">
                    <FaCheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Outcomes Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">High Engagement</p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.completed}</div>
                  </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100">
                    <FaCheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">No or Minimal Engagement</p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.noInteraction}</div>
                  </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <FaCircle className="h-4 w-4 text-zinc-500" />
                </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Failed Calls</p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{calculatedStats.notReachable}</div>
                  </div>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <FaTimesCircle className="h-4 w-4 text-zinc-500" />
                </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="glass-panel p-4 relative" style={{ zIndex: 50 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="relative" ref={phoneFilterRef} style={{ zIndex: 1000 }}>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Filter Phone Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneFilterOpen(!phoneFilterOpen);
                    if (!phoneFilterOpen) {
                      setTempSelectedPhones([...phoneFilter]);
                    }
                  }}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 transition-all flex items-center justify-between text-xs"
                >
                  <span className="text-left">
                    {phoneFilter.length === 0
                      ? 'All Phone Numbers'
                      : phoneFilter.length === 1
                      ? phoneFilter[0]
                      : `${phoneFilter.length} selected`}
                  </span>
                  <FaChevronDown className={`ml-2 transition-transform ${phoneFilterOpen ? 'rotate-180' : ''}`} size={12} />
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
                          setTempSelectedPhones([...phoneFilter]);
                          setPhoneSearch('');
                        }}
                        className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneFilter(tempSelectedPhones);
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
              <div className="relative" style={{ zIndex: 1000 }}>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Filter Call Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs relative"
                  style={{ zIndex: 1001 }}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
              <div className="relative" style={{ zIndex: 1000 }}>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Filter Interaction
                </label>
                <select
                  value={interactionFilter}
                  onChange={(e) => setInteractionFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs relative"
                  style={{ zIndex: 1001 }}
                >
                  <option value="">All</option>
                  <option value="interaction">Has Interaction</option>
                  <option value="no-interaction">No Interaction</option>
                </select>
              </div>
              <div className="relative" style={{ zIndex: 1000 }}>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Show List
                </label>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEntriesPerPage(value === 'all' ? 10000 : Number(value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs relative"
                  style={{ zIndex: 1001 }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  Total Calls
                </label>
                <span className="w-full block text-xs font-semibold text-zinc-700 bg-white px-4 py-2 rounded-lg border border-zinc-200 text-center">
                  {contactsTotal} contacts
                </span>
              </div>
            </div>
          </div>

          {/* Call Lines Table */}
          <div className="glass-panel overflow-hidden relative" style={{ zIndex: 1 }}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Call Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Phone Number</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Call Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Recording</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Transcript</th>
                  </tr>
                </thead>
                <tbody>
                  {contactsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <FaSpinner className="animate-spin text-emerald-500" size={16} />
                          <span>Loading contacts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                        No contacts found
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact._id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          {contact.callDate ? new Date(contact.callDate).toLocaleString() : 'Not called'}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">{contact.phoneNumber || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(contact.callStatus || contact.status)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          {contact.duration 
                            ? formatDuration(contact.duration) 
                            : recordingDurations[contact._id] 
                              ? formatDuration(recordingDurations[contact._id]) 
                              : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {contact.recordingUrl ? (
                            <audio 
                              controls 
                              className="h-8 max-w-full"
                              onLoadedMetadata={(e) => {
                                // Use recording duration as fallback if call log duration is not available
                                const audioElement = e.target;
                                if (audioElement && audioElement.duration && !contact.duration) {
                                  const durationInSeconds = Math.floor(audioElement.duration);
                                  setRecordingDurations(prev => ({
                                    ...prev,
                                    [contact._id]: durationInSeconds
                                  }));
                                }
                              }}
                            >
                              <source src={contact.recordingUrl} type="audio/mpeg" />
                              <source src={contact.recordingUrl} type="audio/mp3" />
                              <source src={contact.recordingUrl} type="audio/wav" />
                              Your browser does not support the audio element.
                            </audio>
                          ) : (
                            <span className="text-xs text-zinc-500">No recording</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.hasInteraction && contact.transcript && contact.transcript.length > 0 ? (
                            <button
                              onClick={() => {
                                setTranscriptCall(contact);
                                setTranscriptModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[11px] font-medium transition-colors"
                            >
                              <FaDownload size={12} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-500">No transcript</span>
                          )}
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
                  Showing <span className="text-emerald-600">{(currentPage - 1) * entriesPerPage + 1}</span> to <span className="text-emerald-600">{Math.min(currentPage * entriesPerPage, contactsTotal)}</span> of <span className="text-zinc-900">{contactsTotal}</span> contacts
                </div>
              </div>
              {contactsPages > 1 && (
                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || contactsLoading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || contactsLoading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    «
                  </button>
                  <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                    Page <span className="text-emerald-600">{currentPage}</span> of <span className="text-zinc-900">{contactsPages}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(contactsPages, currentPage + 1))}
                    disabled={currentPage >= contactsPages || contactsLoading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    »
                  </button>
                  <button
                    onClick={() => setCurrentPage(contactsPages)}
                    disabled={currentPage >= contactsPages || contactsLoading}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    »»
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {transcriptModalOpen && transcriptCall && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Transcript</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {transcriptCall.phoneNumber} •{' '}
                  {transcriptCall.startTime
                    ? new Date(transcriptCall.startTime).toLocaleString()
                    : 'Not started'}
                </p>
              </div>
              <button
                onClick={() => {
                  setTranscriptModalOpen(false);
                  setTranscriptCall(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 text-xl font-bold"
                aria-label="Close transcript"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {transcriptCall.transcript && transcriptCall.transcript.length > 0 ? (
                transcriptCall.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className="border border-zinc-200 rounded-lg p-4 bg-zinc-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                        {entry.role || 'Assistant'}
                      </span>
                      {entry.timestamp && (
                        <span className="text-xs text-zinc-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                      {entry.content || entry.text || '—'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-zinc-500 text-sm">
                  No transcript available for this call.
                </div>
              )}
            </div>
            <div className="border-t border-zinc-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setTranscriptModalOpen(false);
                  setTranscriptCall(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignReportDetail;


