import axios from 'axios';
import config from '../config';
import demoDataGenerator from '../utils/demoDataGenerator';

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

      // Generate 4 completed calls with high durations
      const topCalls = [];
      let index = 0;
      let attempts = 0;
      const maxAttempts = 100; // Safety limit

      while (topCalls.length < 4 && attempts < maxAttempts) {
        const call = demoDataGenerator.generateCall(
          index,
          'campaign-1',
          'Diwali Warm Leads',
          'sales'
        );

        // Only include completed calls with duration > 100 seconds
        if (call.status === 'completed' && call.duration > 100) {
          topCalls.push({
            ...call,
            // Convert duration to milliseconds for consistency with backend
            durationSec: call.duration * 1000,
            campaignId: { name: call.campaignName },
            agentId: { name: call.agentName },
          });
        }

        index++;
        attempts++;
      }

      // Sort by duration descending
      topCalls.sort((a, b) => b.durationSec - a.durationSec);

      return {
        data: {
          calls: topCalls.slice(0, 4)
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
      const page = params.page || 1;
      const limit = params.limit || 25;

      // Build filters object for generateCalls
      const filters = {};
      if (params.status) filters.status = params.status;
      if (params.direction) filters.direction = params.direction;
      if (params.phoneNumbers) filters.phoneNumbers = params.phoneNumbers;
      if (params.startDate) filters.startDate = params.startDate;
      if (params.endDate) filters.endDate = params.endDate;

      // Generate paginated calls using demoDataGenerator
      const result = demoDataGenerator.generateCalls({
        page,
        limit,
        ...filters
      });

      return result;
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

      // Generate leads from completed/user-ended calls (about 487 total)
      const leadIndices = Array.from({ length: 487 }, (_, i) => i * 246); // Every 246th call is a lead
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageIndices = leadIndices.slice(startIndex, endIndex);

      const leads = pageIndices.map(index => {
        const call = demoDataGenerator.generateCall(index, config.demo.totalCalls, config);

        // Add lead-specific fields
        return {
          ...call,
          leadScore: 70 + (index % 30), // Score 70-99
          actionStatus: index % 3 === 0 ? 'completed' : 'pending',
          notes: index % 3 === 0 ? 'Follow-up completed' : 'Interested in premium plan',
          followUpDate: new Date(Date.now() + (index % 7) * 86400000).toISOString(),
        };
      });

      // Apply filters
      let filtered = leads;
      if (params.actionStatus) {
        filtered = filtered.filter(lead => lead.actionStatus === params.actionStatus);
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
      return {
        data: {
          reports: [],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 25,
            total: 0,
            pages: 0
          }
        }
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
      return {
        data: {
          reports: [],
          total: 0
        }
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
      return {
        data: {
          campaign: {
            _id: campaignId,
            name: "Demo Campaign",
            status: "completed",
            totalContacts: 100,
            phoneId: { number: "+1234567890" },
            userId: { name: "Demo User", email: "demo@example.com" },
            createdAt: new Date().toISOString(),
          },
          overview: {
            campaignTarget: 100,
            attemptsMade: 100,
            pickupRate: { count: 75, percentage: "75" },
            campaignCredits: 1000,
            highEngagement: 60,
            noOrMinimalEngagement: 15,
            remaining: { count: 25, percentage: "25" },
            failedCalls: 15,
          },
        },
      };
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}/report-overview`);
    return response.data;
  },

  // Get campaign contacts for analytics with server-side pagination
  getAnalyticsContacts: async (campaignId, params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        data: {
          contacts: [],
          total: 0,
          page: 1,
          pages: 0,
        },
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
      return {
        phoneNumbers: ['+919876543210', '+919876543211', '+919876543212'],
        total: 3
      };
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
      return {
        data: {
          summary: {
            totalCalls: 0,
            totalCampaigns: 0,
            avgDuration: 0,
          },
          calls: [],
          pagination: {
            page: 1,
            limit: 25,
            total: 0,
            pages: 0,
          },
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
      const mockTransactions = Array.from({ length: 30 }).map((_, i) => ({
        _id: `txn-${i + 1}`,
        type: i % 3 === 0 ? 'addition' : 'deduction',
        amount: i % 3 === 0 ? 1000 : -(Math.floor(Math.random() * 200) + 50),
        balance: 5420 - (i * 50),
        reason: i % 3 === 0 ? 'admin_topup' : ['call_completed', 'call_failed', 'voicemail'][i % 3],
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        metadata: i % 3 !== 0 ? {
          durationSec: Math.floor(Math.random() * 300) + 30,
          callSid: `CA${Date.now()}${i}`,
        } : null,
      }));
      return {
        data: {
          transactions: mockTransactions,
          total: 30,
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
        const statuses = ['pending', 'processing', 'completed', 'cancelled', 'failed'];
        // More pending calls for exhibition (60% pending)
        const status = i < 30 ? 'pending' : statuses[(i - 30) % 5];

        // Distribute over next 7 days
        const daysAhead = (i % 7) + 1;
        const hoursAhead = 9 + (i % 8); // Business hours 9-17
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() + daysAhead);
        scheduledTime.setHours(hoursAhead, i % 60, 0, 0);

        const campaign = campaigns[i % campaigns.length];

        return {
          _id: `sched-${i + 1}`,
          phoneNumber: `+9198765${String(43210 + i).slice(-5)}`,
          agentId: {
            _id: campaign._id,
            name: campaign.agentId.name
          },
          campaignId: {
            _id: campaign._id,
            name: campaign.name
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
          recurring: i % 5 === 0 ? {
            frequency: ['daily', 'weekly', 'monthly'][i % 3],
            interval: 1,
            currentOccurrence: 1
          } : null,
          createdAt: new Date(Date.now() - (i * 3600000)).toISOString(),
          isPending: status === 'pending',
          isRecurring: i % 5 === 0,
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
            totalScheduled: 438,      // Changed from 450
            pending: 267,             // Changed from 280
            processing: 18,           // Changed from 20
            completed: 126,           // Changed from 120
            cancelled: 19,            // Changed from 20
            failed: 8,                // Changed from 10
            todayScheduled: 33,       // Changed from 35
            upcomingToday: 14,        // Changed from 15
            recurringCalls: 87        // Changed from 90
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

