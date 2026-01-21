import axios from 'axios';
import config from '../config';
import demoDataGenerator from '../utils/demoDataGenerator';
import realSummaries from '../data/realSummaries.json';
import dbRealCalls from '../data/realCalls.json';

// Use config file for API URL and demo mode
const API_BASE_URL = config.apiBaseUrl;
const DEMO_MODE = config.demoMode;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for development (increased from 10s)
});

// Helper function to simulate API delay
const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);

    // If 401 Unauthorized, redirect to login
    if (error.response?.status === 401) {
      // Backend returns { success: false, error: { code, message } }
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      // Clear stored auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivityTime');

      // Check if session was invalidated by another login
      if (errorCode === 'SESSION_INVALID') {
        // Store the message to show on login page
        localStorage.setItem('sessionInvalidMessage', errorMessage || 'Your session has been terminated. Another device logged in with this account.');
      }

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Signup
  signup: async (email, password, name) => {
    const response = await api.post('/api/v1/auth/signup', {
      email,
      password,
      name,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/api/v1/auth/logout');
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/api/v1/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// Call APIs
export const callAPI = {
  // Make outbound call
  makeCall: async (phoneNumber, customParameters = {}) => {
    const response = await api.post('/api/v1/calls/outbound', {
      phoneNumber,
      customParameters,
    });
    return response.data;
  },

  // Get call details
  getCall: async (callSid) => {
    const response = await api.get(`/api/v1/calls/${callSid}`);
    return response.data;
  },

  // Get call history
  getHistory: async (phoneNumber, limit = 10) => {
    const response = await api.get(`/api/v1/calls/history/${phoneNumber}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get call statistics
  getStats: async () => {
    const response = await api.get('/api/v1/calls/outbound/stats');
    return response.data;
  },

  // Get top 4 calls by duration for current month
  getTopCallsByDuration: async (userId) => {
    if (DEMO_MODE) {
      await mockDelay(300);

      // Custom filtering as per user request:
      // 1. Keep call with duration 10:58 (658 seconds)
      // 2. Keep call with duration 07:15 (435 seconds)
      // 3. Exclude top calls: 30:48 (1848s), 27:14 (1634s), 11:28 (688s)
      // 4. Exclude second batch: 09:40 (580s), 08:42 (522s), 08:41 (521s)
      // 5. Exclude third batch: 07:57 (477s), 07:56 (476s), 07:46 (466s)
      // 6. Exclude fourth batch: 07:33 (453s), 06:48 (408s)
      // 7. Exclude fifth batch: 06:35 (395s), 06:34 (394s)
      // 8. Exclude sixth batch: 06:25 (385s), 06:22 (382s)
      // 9. Status must be 'completed'
      // 10. Duration > 2 minutes (120s)

      const excludedDurations = [1848, 1634, 688, 580, 522, 521, 477, 476, 466, 453, 408, 395, 394, 385, 382];

      const filteredCalls = dbRealCalls.filter(call => {
        const duration = call.durationSec || call.duration || 0;

        // Critical checks
        if (call.status !== 'completed') return false;
        if (duration <= 120) return false;
        if (excludedDurations.includes(duration)) return false;

        return true;
      });

      // Sort by duration descending
      filteredCalls.sort((a, b) => {
        const durA = a.durationSec || a.duration || 0;
        const durB = b.durationSec || b.duration || 0;
        return durB - durA;
      });

      const topCalls = filteredCalls.slice(0, 4).map(call => ({
        ...call,
        // Ensure durationSec is consistent
        durationSec: (call.durationSec || call.duration || 0) * 1000, // Frontend expects ms if we look at DashboardOverview:123 ? 
        // Wait, DashboardOverview line 122: if (durationMs > 10000) ... 
        // The original random generator did: durationSec: call.duration * 1000. 
        // But the dbRealCalls has durationSec as seconds (e.g. 97).
        // If I pass 97, formatDuration will think it is seconds (97 < 10000). 
        // If I pass 97000, it filters > 10000 and divides by 1000 -> 97s.
        // Let's stick to milliseconds to be safe and consistent with previous "durationSec" naming in this specific mock function,
        // BUT `dbRealCalls` has `durationSec` as seconds.
        // Let's pass it as milliseconds to match the previous mock behavior which seemed to imply ms for `durationSec` key despite the name, OR rely on the frontend helper that handles both.
        // Frontend `formatDuration` handles both. If I pass 130 (seconds), it renders correctly. 
        // However, the previous mock code did: `durationSec: call.duration * 1000`.
        // Let's just pass raw seconds from DB but multiply by 1000 to be safe/consistent with previous mock expectations if any variables relied on it being ms.
        // Actually, let's look at `DashboardOverview.jsx`:
        // const durationMs = call.durationSec || 0;
        // const durationFormatted = formatDuration(durationMs);
        // formatDuration checks > 10000. 120 seconds = 120. 120 < 10000 -> treated as seconds.
        // So raw seconds is fine. BUT, let's look at the previous mock implementation I'm replacing:
        // `durationSec: call.duration * 1000` -> this was definitely sending MS.
        // If I change it, it might be fine, but let's stick to MS to avoid ambiguity.
        durationSec: (call.durationSec || call.duration || 0) * 1000,

        // Ensure campaign/agent names are accessible
        campaignId: call.campaignId || { name: call.campaignName || 'Campaign' },
        campaignName: call.campaignName || 'Campaign',
        agentId: call.agentId || { name: call.agentName || 'Agent' },
        agentName: call.agentName || 'Agent',
        phoneNumber: call.toPhone || call.fromPhone
      }));

      return {
        data: {
          calls: topCalls
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/top-by-duration', {
      params: { userId }
    });
    return response.data;
  },

  // Get all calls with pagination and filters
  // Using analytics/calls/logs endpoint which returns actual call logs
  getAllCalls: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);

      // Extract pagination and filters from params
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 25;

      // ---- 1. PREPARE REAL CALLS (from DB export) ----
      let processedRealCalls = dbRealCalls.map((call, index) => {
        // Shift dates to be VERY recent (Today & Yesterday) so they appear ahead of dummy data
        // Even if dummy data is future dated (2026), let's ensure these are the "latest" relative to the list
        // Actually, dummy data goes up to Jan 17, 2026. Today is Jan 19, 2026.
        // So setting these to Jan 19, 2026 (descending with time) works perfectly.
        const baseDate = new Date(); // Today (2026-01-19)
        const offsetMs = index * 5 * 60 * 1000; // 5 mins gap per call backwards
        const fakeDate = new Date(baseDate.getTime() - offsetMs).toISOString();

        return {
          ...call,
          _id: call._id,
          // Ensure fields match what frontend expects
          sessionId: call._id,
          date: fakeDate,
          createdAt: fakeDate,
          startedAt: fakeDate,
          endedAt: new Date(new Date(fakeDate).getTime() + (call.durationSec || 0) * 1000).toISOString(),
          status: call.status || 'completed',
          direction: call.direction || 'outbound',
          phoneNumber: call.direction === 'inbound' ? call.fromPhone : call.toPhone,
          campaignId: call.campaignId || { name: 'Real Campaign' },
          campaignName: 'Real Campaign',
          agentId: call.agentId || { name: 'Real Agent' },
          agentName: 'Real Agent',
          recordingUrl: call.recordingUrl, // Should participate in "hasRecording" filter
          transcript: call.transcript,
          summary: call.summary
        };
      });

      // Filter real calls based on params
      if (params.status) {
        processedRealCalls = processedRealCalls.filter(c => c.status === params.status);
      }
      if (params.direction) {
        processedRealCalls = processedRealCalls.filter(c => c.direction === params.direction);
      }
      // Special filter for recordings page
      if (params.hasRecording === 'true') {
        processedRealCalls = processedRealCalls.filter(c => !!c.recordingUrl);
      }

      const totalRealCalls = processedRealCalls.length;

      // ---- 2. GENERATE DUMMY CALLS ----
      // We rely on demoDataGenerator but we need to know the total count
      const dummyTotal = config.demo.totalCalls; // 119,847 (approx)

      // Calculate Overall Total
      const overallTotal = totalRealCalls + dummyTotal;

      // ---- 3. PAGINATION LOGIC ----
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const resultCalls = [];

      // A. If we need calls from the REAL set
      if (startIndex < totalRealCalls) {
        const realSlice = processedRealCalls.slice(startIndex, endIndex);
        resultCalls.push(...realSlice);
      }

      // B. If we still need calls (from DUMMY set)
      if (resultCalls.length < limit && endIndex > totalRealCalls) {
        const dummyNeeded = limit - resultCalls.length;

        // Calculate where to start in the dummy sequence
        // If startIndex was inside real calls (e.g. 0), we start dummy at 0
        // If startIndex was beyond real calls (e.g. 3000), we start dummy at (3000 - 2300) = 700
        const dummyStartIndex = Math.max(0, startIndex - totalRealCalls);

        // Use generator to fetch specific range
        // Since generator usually returns a page, we might need a custom loop or reuse generateCalls
        // generating individual calls is safer to ensure continuity
        for (let i = 0; i < dummyNeeded; i++) {
          const index = dummyStartIndex + i;
          let call = demoDataGenerator.generateCall(index, dummyTotal, config);

          // Apply filters to dummy data too if needed (simplistic check)
          // The generator might return something that doesn't match filter? 
          // `generateCalls` handles filtering by looping until it finds matches.
          // Re-using `generateCalls` is better but we need specific offset.
          // Let's use `generateCalls` but trick it with page/limit?
          // No, mixing is hard.
          // Fallback: Just generate raw calls and assume they match typical distribution or ignore complex filters for dummy part in this mixed mode.
          // Or verify basic filters:
          if (params.hasRecording === 'true' && !call.recordingUrl) {
            // force recording for dummy if requested (mock it)
            call.recordingUrl = "https://example.com/dummy.mp3";
          }
          resultCalls.push(call);
        }
      }

      return {
        data: {
          calls: resultCalls,
          pagination: {
            page,
            limit,
            total: overallTotal,
            pages: Math.ceil(overallTotal / limit)
          }
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/logs', { params });
    return response.data;
  },

  // Get leads - calls filtered by leadKeywords from agent config
  getLeads: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);

      const page = params.page || 1;
      const limit = params.limit || 50;

      // Keywords pool for leads
      const LEAD_KEYWORDS = [
        'Interested', 'Pricing', 'Demo Request', 'Ready to Buy', 'Callback Requested',
        'Budget Approved', 'Decision Maker', 'Free Trial', 'Upgrade', 'Premium Plan',
        'Enterprise', 'Contact Me', 'More Info', 'Schedule Call', 'Send Proposal',
        'Compare Plans', 'Features', 'Integration', 'Support', 'Discount'
      ];

      // Helper to get deterministic keywords based on index
      const getKeywords = (index) => {
        const numKeywords = 1 + (index % 3); // 1-3 keywords
        const keywords = [];
        for (let i = 0; i < numKeywords; i++) {
          const keywordIndex = (index * 7 + i * 13) % LEAD_KEYWORDS.length;
          if (!keywords.includes(LEAD_KEYWORDS[keywordIndex])) {
            keywords.push(LEAD_KEYWORDS[keywordIndex]);
          }
        }
        return keywords;
      };

      // Generate leads from completed/user-ended calls (about 487 total)
      const leadIndices = Array.from({ length: 487 }, (_, i) => i * 246); // Every 246th call is a lead
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageIndices = leadIndices.slice(startIndex, endIndex);

      const leads = pageIndices.map((index, i) => {
        const call = demoDataGenerator.generateCall(index, config.demo.totalCalls, config);
        const keywords = getKeywords(index + i);

        // Ensure lead has positive duration (answered calls only)
        // Generate duration between 30-240 seconds (0.5 to 4 minutes)
        const leadDuration = 30 + Math.floor((index * 7) % 210);

        // Add lead-specific fields with keywords
        return {
          ...call,
          duration: leadDuration, // Override with positive duration
          durationSec: leadDuration, // Also set durationSec
          status: 'completed', // Leads are from completed calls
          detectedKeywords: keywords, // Add keywords array
          leadScore: 70 + (index % 30), // Score 70-99
          actionStatus: index % 3 === 0 ? 'completed' : 'pending',
          notes: `Keywords: ${keywords.join(', ')}`,
          followUpDate: new Date(Date.now() + (index % 7) * 86400000).toISOString(),
        };
      });

      // Apply filters
      let filtered = leads;
      if (params.actionStatus) {
        filtered = filtered.filter(lead => lead.actionStatus === params.actionStatus);
      }
      if (params.keyword) {
        filtered = filtered.filter(lead =>
          lead.detectedKeywords && lead.detectedKeywords.includes(params.keyword)
        );
      }

      return {
        data: {
          calls: filtered,
          pagination: {
            page,
            limit,
            total: 487,
            pages: Math.ceil(487 / limit)
          }
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/leads', { params });
    return response.data;
  },

  // Get follow-ups - calls filtered by followUpKeywords from agent config
  getFollowUps: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      // Return empty array in demo mode - follow-ups should come from backend
      return {
        data: {
          calls: [],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 50,
            total: 0,
            pages: 0
          }
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/follow-ups', { params });
    return response.data;
  },

  // Update lead action status (pending/completed)
  updateLeadStatus: async (leadId, actionStatus) => {
    const response = await api.patch(`/api/v1/analytics/calls/leads/${leadId}/status`, {
      actionStatus
    });
    return response.data;
  },

  // Update follow-up action status (pending/completed)
  updateFollowUpStatus: async (followUpId, actionStatus) => {
    const response = await api.patch(`/api/v1/analytics/calls/follow-ups/${followUpId}/status`, {
      actionStatus
    });
    return response.data;
  },

  // Get retriable calls (failed calls excluding voicemail)
  getRetriableCalls: async (userId, options = {}) => {
    const params = { userId, ...options };
    const response = await api.get('/api/v1/calls/retriable', { params });
    return response.data;
  },

  // Get voicemail statistics
  getVoicemailStats: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/calls/voicemail-stats', { params });
    return response.data;
  },

  // Get voicemail analysis for specific call
  getVoicemailAnalysis: async (callLogId) => {
    const response = await api.get(`/api/v1/calls/${callLogId}/voicemail-analysis`);
    return response.data;
  },

  // Mark voicemail detection as false positive
  markFalsePositive: async (callLogId, isFalsePositive) => {
    const response = await api.post(`/api/v1/calls/${callLogId}/mark-false-positive`, {
      isFalsePositive,
    });
    return response.data;
  },

  // Get delivery reports (with pagination)
  getDeliveryReports: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      const result = demoDataGenerator.generateDeliveryReports(params);
      return {
        data: result
      };
    }
    const response = await api.get('/api/v1/campaigns/reports/delivery', { params });
    // Backend returns { success: true, data: { reports: [...], pagination: {...} } }
    // Return the nested data object directly
    return response.data?.data || response.data;
  },

  // Get all delivery reports (no pagination)
  getAllDeliveryReports: async () => {
    if (DEMO_MODE) {
      await mockDelay(300);
      const result = demoDataGenerator.getAllDeliveryReports();
      return {
        data: result
      };
    }
    const response = await api.get('/api/v1/campaigns/reports/all');
    // Backend returns { success: true, data: { reports: [...], total: ... } }
    return response.data?.data || response.data;
  },

  // Download delivery report
  downloadDeliveryReport: async (campaignId) => {
    try {
      const response = await api.get(`/api/v1/campaigns/reports/delivery/${campaignId}/download`, {
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `delivery_report_${campaignId}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Get call log details by ID (for scheduled calls with transcript and recording)
  getCallById: async (callLogId) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      const hasTranscript = Math.random() > 0.3;
      const hasRecording = Math.random() > 0.4;

      return {
        success: true,
        data: {
          id: callLogId,
          sessionId: `CA${Date.now()}`,
          phone: '+919876543210',
          fromPhone: '+919876543210',
          toPhone: '+911234567890',
          campaignId: 'campaign-1',
          campaignName: 'Demo Campaign',
          direction: 'outbound',
          callType: 'Outgoing',
          status: 'completed',
          outcome: 'Success',
          durationSec: 145,
          credits: 145,
          transcript: hasTranscript ? [
            {
              speaker: 'assistant',
              text: 'Hello! Thank you for calling. How can I assist you today?',
              timestamp: new Date(Date.now() - 145000).toISOString(),
            },
            {
              speaker: 'user',
              text: 'Hi, I wanted to know about your services.',
              timestamp: new Date(Date.now() - 140000).toISOString(),
            },
            {
              speaker: 'assistant',
              text: 'Of course! We offer a wide range of services. Let me provide you with more details...',
              timestamp: new Date(Date.now() - 135000).toISOString(),
            },
            {
              speaker: 'user',
              text: 'That sounds great. Can you send me more information?',
              timestamp: new Date(Date.now() - 130000).toISOString(),
            },
            {
              speaker: 'assistant',
              text: 'Absolutely! I will send you an email with all the details. Is there anything else I can help you with?',
              timestamp: new Date(Date.now() - 125000).toISOString(),
            },
            {
              speaker: 'user',
              text: 'No, that is all. Thank you!',
              timestamp: new Date(Date.now() - 120000).toISOString(),
            },
            {
              speaker: 'assistant',
              text: 'You are welcome! Have a great day!',
              timestamp: new Date(Date.now() - 115000).toISOString(),
            },
          ] : [],
          recordingUrl: hasRecording ? 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' : null,
          s3RecordingKey: hasRecording ? 'recordings/2025/12/demo-call.mp3' : null,
          summary: 'User inquired about services. Provided details and agreed to send email with more information.',
          createdAt: new Date(Date.now() - 150000).toISOString(),
          startedAt: new Date(Date.now() - 145000).toISOString(),
          endedAt: new Date(Date.now()).toISOString(),
        }
      };
    }

    const response = await api.get(`/api/v1/dashboard/call-logs/${callLogId}`);
    return response.data;
  },
};

// WebSocket/System Stats API
export const wsAPI = {
  getStats: async () => {
    // Always check DEMO_MODE first to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        activeCalls: 12,
        totalConnections: 45,
        queueLength: 8,
        uptime: 3600 * 24, // 24 hours
      };
    }
    const response = await api.get('/api/v1/stats');
    return response.data;
  },
};

// Knowledge Base APIs
export const knowledgeBaseAPI = {
  search: async (query, limit = 5, category = null) => {
    const response = await api.get('/api/v1/knowledge-base/search', {
      params: { query, limit, category },
    });
    return response.data;
  },

  list: async (params = {}) => {
    const response = await api.get('/api/v1/knowledge-base/list', { params });
    return response.data;
  },

  add: async (title, content, category = 'general', metadata = {}) => {
    const response = await api.post('/api/v1/knowledge-base/add', {
      title,
      content,
      category,
      metadata,
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/v1/knowledge-base/${id}`);
    return response.data;
  },
};

// Phone APIs
export const phoneAPI = {
  // Get phone by ID
  getPhone: async (phoneId) => {
    const response = await api.get(`/api/v1/phones/${phoneId}`);
    return response.data;
  },

  // Get all phones for logged-in user
  getPhones: async () => {
    const response = await api.get('/api/v1/phones');
    return response.data;
  },
};

// Agent APIs
export const agentAPI = {
  // Get all agents
  list: async (params = {}) => {
    const response = await api.get('/api/v1/agents', { params });
    return response.data;
  },

  // Get agent by ID
  get: async (agentId) => {
    const response = await api.get(`/api/v1/agents/${agentId}`);
    return response.data;
  },
};

// Campaign APIs
export const campaignAPI = {
  // Get campaign count for logged in user
  getCount: async () => {
    if (DEMO_MODE) {
      await mockDelay(50);
      return {
        data: { count: config.demo.totalCampaigns }
      };
    }
    const response = await api.get('/api/v1/campaigns/count');
    return response.data;
  },

  create: async (name, agentId, phoneId, concurrentCalls = 2) => {
    const response = await api.post('/api/v1/campaigns', {
      name,
      agentId,
      phoneId,
      settings: {
        concurrentCallsLimit: concurrentCalls,
      },
    });
    return response.data;
  },

  addContacts: async (campaignId, contactsOrPhoneNumbers) => {
    // Handle both array of phone numbers (backward compatibility) and array of contact objects
    const contacts = contactsOrPhoneNumbers.map(item => {
      if (typeof item === 'string') {
        // Backward compatibility: item is a phone number string
        return {
          phoneNumber: item.startsWith('+') ? item : `+91${item}`,
          name: '',
          metadata: {}
        };
      } else {
        // New format: item is a contact object with phoneNumber and name
        return {
          phoneNumber: item.phoneNumber.startsWith('+') ? item.phoneNumber : `+91${item.phoneNumber}`,
          name: item.name || '',
          metadata: item.metadata || {}
        };
      }
    });

    const response = await api.post(`/api/v1/campaigns/${campaignId}/contacts`, {
      contacts
    });
    return response.data;
  },

  start: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/start`);
    return response.data;
  },

  pause: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/pause`);
    return response.data;
  },

  resume: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/resume`);
    return response.data;
  },

  cancel: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/cancel`);
    return response.data;
  },

  update: async (campaignId, updates) => {
    const response = await api.patch(`/api/v1/campaigns/${campaignId}`, updates);
    return response.data;
  },

  list: async (params = {}) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      const campaigns = demoDataGenerator.generateCampaigns();
      return {
        data: { campaigns: campaigns.data }
      };
    }
    const response = await api.get('/api/v1/campaigns', { params });
    return response.data;
  },

  // Get campaign report overview (all data for overview tab)
  getReportOverview: async (campaignId) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      const overview = demoDataGenerator.generateCampaignReportOverview(campaignId);
      if (!overview) {
        throw new Error('Campaign not found');
      }
      return {
        data: overview,
      };
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}/report-overview`);
    return response.data;
  },

  // Get campaign contacts for analytics with server-side pagination
  getAnalyticsContacts: async (campaignId, params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      const contacts = demoDataGenerator.generateCampaignContacts(campaignId, params);
      return {
        data: contacts,
      };
    }
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.phoneNumbers && params.phoneNumbers.length > 0) {
      queryParams.append('phoneNumbers', params.phoneNumbers.join(','));
    }
    if (params.hasInteraction !== undefined) {
      queryParams.append('hasInteraction', params.hasInteraction.toString());
    }
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(
      `/api/v1/campaigns/${campaignId}/analytics/contacts?${queryParams.toString()}`
    );
    // Backend returns { success: true, data: { contacts, total, page, pages } }
    // Extract the nested data object
    return response.data?.data || response.data;
  },

  // Get phone numbers for a campaign (from CampaignContact, not CallLog)
  getPhoneNumbers: async (campaignId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      return demoDataGenerator.getCampaignPhoneNumbers(campaignId);
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}/phone-numbers`);
    // Backend returns { success: true, data: { phoneNumbers, total } }
    return response.data?.data || response.data;
  },

  get: async (campaignId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      // Return mock campaign data based on campaignId
      const mockCampaigns = {
        'campaign-1': {
          _id: 'campaign-1',
          name: 'Diwali Warm Leads',
          status: 'active',
          agentId: 'agent-1',
          phoneId: { number: '+91-9876543210' },
          userId: { name: 'John Doe', email: 'john@example.com' },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          phoneNumbers: ['+919876543210', '+919876543211', '+919876543212'],
          stats: { completed: 320, failed: 30 },
          completedCalls: 320,
          failedCalls: 30,
          totalCalls: 350,
        },
        'campaign-2': {
          _id: 'campaign-2',
          name: 'Payment Reminder Batch',
          status: 'paused',
          agentId: 'agent-2',
          phoneId: { number: '+91-9876543211' },
          userId: { name: 'Jane Smith', email: 'jane@example.com' },
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          phoneNumbers: ['+919876543220', '+919876543221'],
          stats: { completed: 210, failed: 20 },
          completedCalls: 210,
          failedCalls: 20,
          totalCalls: 230,
        },
        'campaign-3': {
          _id: 'campaign-3',
          name: 'Premium Upsell List',
          status: 'active',
          agentId: 'agent-3',
          phoneId: { number: '+91-9876543212' },
          userId: { name: 'Bob Wilson', email: 'bob@example.com' },
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          phoneNumbers: ['+919876543230', '+919876543231', '+919876543232', '+919876543233'],
          stats: { completed: 145, failed: 15 },
          completedCalls: 145,
          failedCalls: 15,
          totalCalls: 160,
        },
      };

      const campaign = mockCampaigns[campaignId] || {
        _id: campaignId,
        name: 'Campaign ' + campaignId,
        status: 'active',
        agentId: 'agent-1',
        phoneId: { number: '+91-9876543210' },
        userId: { name: 'Demo User', email: 'demo@example.com' },
        createdAt: new Date().toISOString(),
        phoneNumbers: [],
        stats: { completed: 0, failed: 0 },
        completedCalls: 0,
        failedCalls: 0,
        totalCalls: 0,
      };

      return { data: campaign };
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}`);
    return response.data;
  },
};

// Analytics APIs
export const analyticsAPI = {
  // Get total call count for logged in user
  getCallCount: async (userId) => {
    if (DEMO_MODE) {
      await mockDelay(50);
      return {
        data: { count: config.demo.totalCalls }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/count', {
      params: { userId }
    });
    return response.data;
  },

  // Get overview stats for Analytics page cards
  getOverview: async () => {
    if (DEMO_MODE) {
      await mockDelay(100);
      return {
        data: {
          totalCalls: config.demo.totalCalls,
          totalCampaigns: config.demo.totalCampaigns,
          avgDuration: config.demo.avgDuration
        }
      };
    }
    const response = await api.get('/api/v1/analytics/overview');
    return response.data;
  },

  // Get call chart data (last 7 days excluding today) for charts
  getCallChartData: async (userId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      return demoDataGenerator.generateWeeklyChartData();
    }
    // Use longer timeout for chart data endpoint (60 seconds) as it may process large datasets
    const response = await api.get('/api/v1/analytics/calls/chart-data', {
      params: { userId },
      timeout: 60000 // 60 seconds timeout
    });
    // Backend returns { success: true, data: { chartData: [...], totalCalls: ... } }
    // Return the data object directly
    return response.data.data || response.data;
  },

  // Get charts data (direction & status distribution) for Analytics page
  getCharts: async () => {
    if (DEMO_MODE) {
      await mockDelay(100);
      const analytics = demoDataGenerator.generateDashboardAnalytics();
      return {
        direction: analytics.data.byDirection,
        status: analytics.data.byStatus
      };
    }
    const response = await api.get('/api/v1/analytics/charts');
    return response.data.data || response.data;
  },

  // Get comprehensive dashboard analytics
  getDashboard: async (userId, timeRange = null) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      return demoDataGenerator.generateDashboardAnalytics(userId, timeRange);
    }
    // Only make real API call if DEMO_MODE is false
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/dashboard', { params });
    return response.data;
  },

  // Get call analytics
  getCalls: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/calls', { params });
    return response.data;
  },

  // Get retry analytics
  getRetry: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/retry', { params });
    return response.data;
  },

  // Get scheduling analytics
  getScheduling: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/scheduling', { params });
    return response.data;
  },

  // Get voicemail analytics
  getVoicemail: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/voicemail', { params });
    return response.data;
  },

  // Get performance metrics
  getPerformance: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/performance', { params });
    return response.data;
  },

  // Get cost analytics
  getCost: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/cost', { params });
    return response.data;
  },

  // Get time-series trends
  getTrends: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/trends', { params });
    return response.data;
  },

  // Get chat summary with count cards and call logs
  getChatSummary: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(200);

      // Generate calls using existing generator
      const page = params.page || 1;
      const limit = params.limit || 25;

      const generatorParams = {
        page,
        limit,
        // startDate: params.startDate, // Relaxing filters to ensure data
        // endDate: params.endDate,
        // status: 'completed',
      };

      const generatedData = demoDataGenerator.generateCalls(generatorParams);
      const calls = generatedData.data.calls;

      // Enhance calls with real summaries
      const enhancedCalls = calls.map((call, index) => {
        // Pick a random summary from the real list
        // Use a deterministic seed based on call ID/index so it stays consistent
        const summaryIndex = (parseInt(call._id.replace(/\D/g, '') || 0) + index) % realSummaries.length;
        const summary = realSummaries[summaryIndex];

        return {
          _id: call._id,
          phoneNumber: call.toPhone,
          name: call.agentName || 'Unknown', // Or customer name if available
          dateTime: call.startedAt,
          transcript: call.transcript, // Keep existing dummy transcript
          summary: summary, // Use REAL summary
          campaignName: call.campaignName,
          duration: call.duration,
          recordingUrl: call.recordingUrl,
        };
      });

      return {
        data: {
          summary: {
            totalCalls: generatedData.data.pagination.total,
            totalCampaigns: 85, // Static count
            avgDuration: 145, // Static avg
          },
          calls: enhancedCalls,
          pagination: generatedData.data.pagination,
        },
      };
    }
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await api.get(`/api/v1/analytics/chat-summary?${queryParams.toString()}`);
    return response.data;
  },
};

// Credits APIs
export const creditsAPI = {
  // Get credit balance for a user (uses /auth/me to get own credits without admin privileges)
  getBalance: async () => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        success: true,
        data: {
          credits: config.demo.creditBalance,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        }
      };
    }
    // For regular users, get credits from their own profile via /auth/me
    // This avoids the admin-only /users/:id/credits endpoint
    const response = await api.get('/api/v1/auth/me');
    const user = response.data.data.user;

    // Also update localStorage with latest user data including expiryDate
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return {
      success: true,
      data: {
        credits: user.credits || 0,
        expiryDate: user.expiryDate || null
      }
    };
  },

  // Get credit transaction history for the current user (uses /auth/me/credits/transactions)
  getTransactions: async (options = {}) => {
    if (DEMO_MODE) {
      await mockDelay(250);

      const currentBalance = config.demo.creditBalance;
      let runningBalance = currentBalance;
      const count = 200;

      const mockTransactions = Array.from({ length: count }).map((_, i) => {
        // More realistic distribution: 95% calls (deductions), 5% topups
        const isAddition = i > 0 && Math.random() > 0.95;

        // Amounts
        const deductionAmount = -(Math.floor(Math.random() * 50) + 10); // -10 to -60 credits
        const additionAmount = Math.floor(Math.random() * 10 + 1) * 5000; // 5000-50000 credits

        const amount = isAddition ? additionAmount : deductionAmount;
        const type = isAddition ? 'addition' : 'deduction';

        // Reasons
        const callReasons = ['call_completed', 'call_completed', 'call_completed', 'call_failed', 'voicemail'];
        const reason = isAddition ? 'admin_topup' : callReasons[Math.floor(Math.random() * callReasons.length)];

        // Balance snapshot is the balance AFTER this transaction
        const entryBalance = runningBalance;

        // Update running balance for next iteration (which is previous in time)
        runningBalance = runningBalance - amount;

        // Spread dates: ~10 mins apart on average
        const timeOffset = i * (10 * 60 * 1000 + Math.random() * 5 * 60 * 1000);

        return {
          _id: `txn-${Date.now()}-${i}`,
          type,
          amount,
          balance: entryBalance,
          reason,
          createdAt: new Date(Date.now() - timeOffset).toISOString(),
          metadata: type === 'deduction' ? {
            durationSec: Math.floor(Math.random() * 300) + 20,
            callSid: `CA${Date.now()}${i}`,
          } : null,
        };
      });

      // Calculate realistic totals based on the global call stats
      const totalCalls = config.demo.totalCalls; // 119,847
      const avgDuration = config.demo.avgDuration; // 142
      const calculatedCreditsUsed = totalCalls * avgDuration; // ~17M
      const calculatedCreditsAdded = calculatedCreditsUsed + currentBalance;

      return {
        data: {
          transactions: mockTransactions,
          total: count,
          currentBalance: config.demo.creditBalance,
          stats: {
            creditsUsed: calculatedCreditsUsed,
            creditsAdded: calculatedCreditsAdded
          }
        }
      };
    }
    // For regular users, get their own transactions via /auth/me/credits/transactions
    // This avoids the admin-only /users/:id/credits/transactions endpoint
    const params = {
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
    if (options.startDate) {
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      params.endDate = options.endDate;
    }
    const response = await api.get('/api/v1/auth/me/credits/transactions', { params });
    return response.data;
  },
};

// Scheduling APIs
export const schedulingAPI = {
  // Schedule a new call
  scheduleCall: async (params) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      return {
        success: true,
        data: {
          scheduledCallId: `sched-${Date.now()}`,
          scheduledFor: params.scheduledFor,
          message: 'Call scheduled successfully'
        }
      };
    }
    const response = await api.post('/api/v1/scheduling/schedule', params);
    return response.data;
  },

  // Get scheduled calls for a user
  getScheduledCalls: async (userId, filters = {}) => {
    if (DEMO_MODE) {
      await mockDelay(250);

      const campaigns = demoDataGenerator.generateCampaigns();
      const mockScheduledCalls = Array.from({ length: 47 }).map((_, i) => {
        // Most calls are completed (70%), some cancelled (15%), few pending (10%), few failed (5%)
        let status;
        const rand = i % 100;
        if (rand < 70) status = 'completed';
        else if (rand < 85) status = 'cancelled';
        else if (rand < 95) status = 'pending';
        else status = 'failed';

        // Distribute from November 2025 to January 2026 (3 months period)
        // Start date: Nov 1, 2025
        const startDate = new Date('2025-11-01');
        const endDate = new Date('2026-01-17');
        const timeRange = endDate - startDate;
        const randomOffset = Math.floor((i / 47) * timeRange);
        const scheduledTime = new Date(startDate.getTime() + randomOffset);

        // Set to business hours (9 AM - 5 PM)
        const hour = 9 + (i % 8);
        scheduledTime.setHours(hour, (i * 13) % 60, 0, 0);

        const campaign = campaigns[i % campaigns.length] || {
          _id: `camp-${i + 1}`,
          name: 'Default Campaign',
          agentId: { name: 'Sales Agent' }
        };

        // Generate random-looking phone number using multiple primes
        const prefix = [98, 99, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85][(i * 6997) % 15];
        const part1 = ((i * 7919) % 10000).toString().padStart(4, '0');
        const part2 = ((i * 5237 + 8765) % 10000).toString().padStart(4, '0');
        const phoneNumber = `+91${prefix}${part1}${part2}`;

        return {
          _id: `sched-${i + 1}`,
          phoneNumber: phoneNumber,
          agentId: {
            _id: campaign._id || `camp-${i + 1}`,
            name: (campaign.agentId && campaign.agentId.name) || 'Sales Agent'
          },
          campaignId: {
            _id: campaign._id || `camp-${i + 1}`,
            name: campaign.name || 'Default Campaign'
          },
          userId,
          scheduledFor: scheduledTime.toISOString(),
          timezone: 'Asia/Kolkata',
          status,
          respectBusinessHours: i % 2 === 0,
          businessHours: i % 2 === 0 ? {
            start: '09:00',
            end: '18:00',
            timezone: 'Asia/Kolkata',
            daysOfWeek: [1, 2, 3, 4, 5]
          } : null,
          createdAt: new Date(Date.now() - (i * 3600000)).toISOString(),
          isPending: status === 'pending',
          canCancel: status === 'pending'
        };
      });

      // Apply filters
      let filtered = mockScheduledCalls;
      if (filters.status) {
        filtered = filtered.filter(call => call.status === filters.status);
      }
      if (filters.agentId) {
        filtered = filtered.filter(call => call.agentId._id === filters.agentId);
      }
      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit);
      }

      return {
        success: true,
        data: {
          scheduledCalls: filtered,
          total: filtered.length
        }
      };
    }

    const queryParams = new URLSearchParams({ userId });
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.agentId) queryParams.append('agentId', filters.agentId);

    const response = await api.get(`/api/v1/scheduling/scheduled-calls?${queryParams.toString()}`);
    return response.data;
  },

  // Cancel a scheduled call
  cancelScheduledCall: async (scheduledCallId, userId) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          scheduledCallId,
          status: 'cancelled',
          message: 'Scheduled call cancelled successfully'
        }
      };
    }
    const response = await api.post(`/api/v1/scheduling/${scheduledCallId}/cancel`, { userId });
    return response.data;
  },

  // Reschedule a call
  rescheduleCall: async (scheduledCallId, userId, scheduledFor) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          scheduledCallId,
          scheduledFor,
          message: 'Call rescheduled successfully'
        }
      };
    }
    const response = await api.post(`/api/v1/scheduling/${scheduledCallId}/reschedule`, {
      userId,
      scheduledFor
    });
    return response.data;
  },

  // Get scheduling statistics
  getStats: async () => {
    if (DEMO_MODE) {
      await mockDelay(150);
      return {
        success: true,
        data: {
          scheduler: {
            totalScheduled: 438,      // Total scheduled over 3 months
            pending: 41,              // ~10% pending (future calls)
            processing: 8,            // Few processing
            completed: 307,           // ~70% completed (historical)
            cancelled: 66,            // ~15% cancelled
            failed: 16,               // ~5% failed
            todayScheduled: 3,        // Few scheduled for today
            upcomingToday: 2          // Few upcoming today        // Changed from 90
          }
        }
      };
    }
    const response = await api.get('/api/v1/scheduling/stats');
    return response.data;
  }
};

// Appointment Booking APIs
export const appointmentAPI = {
  // Get appointment booking settings
  getSettings: async () => {
    const response = await api.get('/api/v1/appointments/settings');
    return response.data;
  },

  // Update appointment booking settings
  updateSettings: async (settings) => {
    const response = await api.put('/api/v1/appointments/settings', settings);
    return response.data;
  },

  // List appointments
  list: async (params = {}) => {
    const response = await api.get('/api/v1/appointments', { params });
    return response.data;
  },

  // Get appointment by ID
  get: async (appointmentId) => {
    const response = await api.get(`/api/v1/appointments/${appointmentId}`);
    return response.data;
  },

  // Create appointment
  create: async (appointmentData) => {
    const response = await api.post('/api/v1/appointments', appointmentData);
    return response.data;
  },

  // Update appointment
  update: async (appointmentId, updates) => {
    const response = await api.put(`/api/v1/appointments/${appointmentId}`, updates);
    return response.data;
  },

  // Delete appointment
  delete: async (appointmentId) => {
    const response = await api.delete(`/api/v1/appointments/${appointmentId}`);
    return response.data;
  },

  // Get available slots for a date
  getAvailableSlots: async (date) => {
    const response = await api.get('/api/v1/appointments/available-slots', {
      params: { date }
    });
    return response.data;
  }
};

// Translation APIs
export const translateAPI = {
  // Get supported languages
  getLanguages: async () => {
    const response = await api.get('/api/v1/translate/languages');
    return response.data;
  },

  // Translate transcript
  translateTranscript: async (transcript, targetLanguage) => {
    const response = await api.post('/api/v1/translate/transcript', {
      transcript,
      targetLanguage,
    });
    return response.data;
  },

  // Translate text array
  translateTexts: async (texts, targetLanguage) => {
    const response = await api.post('/api/v1/translate/text', {
      texts,
      targetLanguage,
    });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;

