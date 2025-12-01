import axios from 'axios';
import config from '../config';

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
      // Clear stored auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

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
      const now = Date.now();
      // Generate mock top 4 calls with highest durations
      const mockTopCalls = Array.from({ length: 4 }).map((_, i) => {
        const startTime = new Date(now - (i + 1) * 86400000); // Different days
        const durationMs = (300 + (4 - i) * 60) * 1000; // Decreasing durations in ms
        
        return {
          _id: `top-call-${i + 1}`,
          sessionId: `CA${Date.now()}${i}`,
          fromPhone: `+91${9876543210 + i}`,
          toPhone: `+91${9876543210 + i + 1000}`,
          status: 'completed',
          durationSec: durationMs, // Stored as milliseconds per user requirement
          createdAt: startTime.toISOString(),
          startedAt: startTime.toISOString(),
          endedAt: new Date(startTime.getTime() + durationMs).toISOString(),
          direction: 'outbound',
          campaignId: { name: ['Diwali Warm Leads', 'Payment Reminder', 'Premium Upsell', 'Follow-up'][i] },
          agentId: { name: `Agent ${i + 1}` },
          creditsConsumed: Math.floor(durationMs / 1000),
        };
      });

      return {
        data: {
          calls: mockTopCalls
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
      const now = Date.now();
      let mockCalls = Array.from({ length: 50 }).map((_, i) => {
        // Generate random hour between 9 AM and 4 PM for direction chart
        const hour = 9 + (i % 8);
        const startTime = new Date(now - i * 3600000);
        startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Generate transcript array for completed calls
        const hasTranscript = i % 3 === 0;
        const transcript = hasTranscript ? [
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Hello! Thank you for calling. How can I assist you today?',
            content: 'Hello! Thank you for calling. How can I assist you today?',
            timestamp: new Date(startTime.getTime() + 2000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'Hi, I wanted to know about your services.',
            content: 'Hi, I wanted to know about your services.',
            timestamp: new Date(startTime.getTime() + 5000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            content: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            timestamp: new Date(startTime.getTime() + 8000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'That sounds great. Can you send me more information?',
            content: 'That sounds great. Can you send me more information?',
            timestamp: new Date(startTime.getTime() + 12000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            content: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            timestamp: new Date(startTime.getTime() + 15000).toISOString(),
          },
        ] : null;

        return {
          _id: `call-${i + 1}`,
          callSid: `CA${Date.now()}${i}`,
          sessionId: `CA${Date.now()}${i}`,
          exotelCallSid: `CA${Date.now()}${i}`,
          fromPhone: `+91${9876543210 + i}`,
          toPhone: `+91${9876543210 + i + 1000}`,
          status: ['completed', 'failed', 'no-answer', 'busy', 'in-progress', 'initiated'][i % 6],
          duration: Math.floor(Math.random() * 300) + 30,
          durationSec: Math.floor(Math.random() * 300) + 30,
          cost: (Math.random() * 2 + 0.5).toFixed(2),
          createdAt: new Date(now - i * 3600000).toISOString(),
          startedAt: startTime.toISOString(),
          startTime: startTime.toISOString(),
          endedAt: i % 3 === 0 ? new Date(startTime.getTime() + (Math.floor(Math.random() * 300) + 30) * 1000).toISOString() : null,
          direction: i % 2 === 0 ? 'outbound' : 'inbound',
          campaignName: ['Diwali Warm Leads', 'Payment Reminder', 'Premium Upsell'][i % 3],
          agentName: `Agent ${(i % 5) + 1}`,
          recordingUrl: hasTranscript ? `https://example.com/recording-${i}.mp3` : null,
          transcript: transcript,
          creditsConsumed: Math.floor(Math.random() * 300) + 30,
        };
      });

      // Apply filters
      if (params.status) {
        mockCalls = mockCalls.filter(call => call.status === params.status);
      }
      if (params.direction) {
        mockCalls = mockCalls.filter(call => call.direction === params.direction);
      }
      if (params.phoneNumbers && Array.isArray(params.phoneNumbers) && params.phoneNumbers.length > 0) {
        mockCalls = mockCalls.filter(call => {
          const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
          return params.phoneNumbers.includes(phone);
        });
      }
      if (params.startDate) {
        const startDate = new Date(params.startDate);
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate >= startDate;
        });
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate <= endDate;
        });
      }

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const total = mockCalls.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCalls = mockCalls.slice(startIndex, endIndex);

      return {
        data: {
          calls: paginatedCalls,
          total: total,
          page: page,
          limit: limit,
          pages: Math.ceil(total / limit),
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit),
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
      // Return empty array in demo mode - leads should come from backend
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

  addContacts: async (campaignId, phoneNumbers) => {
    // Convert phone numbers array to contacts format
    const contacts = phoneNumbers.map(phoneNumber => ({
      phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
      name: '',
      metadata: {}
    }));

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
      return {
        data: [
          {
            _id: 'campaign-1',
            name: 'Diwali Warm Leads',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            liveStats: {
              processed: 450,
              totalNumbers: 1000,
              remaining: 550,
              activeCalls: 5,
              queueLength: 12,
              completed: 420,
              failed: 30,
            }
          },
          {
            _id: 'campaign-2',
            name: 'Payment Reminder Batch',
            status: 'paused',
            agentId: 'agent-2',
            phoneId: 'phone-2',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            liveStats: {
              processed: 210,
              totalNumbers: 500,
              remaining: 290,
              activeCalls: 0,
              queueLength: 0,
              completed: 200,
              failed: 10,
            }
          },
          {
            _id: 'campaign-3',
            name: 'Premium Upsell List',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            liveStats: {
              processed: 145,
              totalNumbers: 300,
              remaining: 155,
              activeCalls: 3,
              queueLength: 8,
              completed: 140,
              failed: 5,
            }
          },
        ]
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
        data: { count: 1842 }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/count', {
      params: { userId }
    });
    return response.data;
  },

  // Get overview stats for Analytics page cards
  getOverview: async () => {
    // if (DEMO_MODE) {
    //   await mockDelay(100);
    //   return {
    //     data: {
    //       totalCalls: 1842,
    //       totalCampaigns: 15,
    //       avgDuration: 96
    //     }
    //   };
    // }
    const response = await api.get('/api/v1/analytics/overview');
    return response.data;
  },

  // Get call chart data (last 7 days excluding today) for charts
  getCallChartData: async (userId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      // Generate mock data for last 7 days
      const today = new Date();
      const mockData = [];
      for (let i = 7; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = dayNames[date.getDay()];
        const dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        mockData.push({
          date: date.toISOString().split('T')[0],
          day: day,
          dateLabel: dateLabel,
          calls: Math.floor(Math.random() * 200) + 10
        });
      }
      // Return data object directly to match real API response structure
      return {
        chartData: mockData,
        totalCalls: mockData.reduce((sum, d) => sum + d.calls, 0)
      };
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
      return {
        direction: { inbound: 624, outbound: 1218 },
        status: { completed: 1423, failed: 219, 'in-progress': 18, initiated: 82 }
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
      // Generate time labels for the day
      const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
      const callValues = [42, 58, 75, 88, 132, 164, 172, 160, 140, 118];
      
      return {
        data: {
          totalCalls: 1842,
          completedCalls: 1423,
          failedCalls: 219,
          inProgressCalls: 18,
          successRate: 77.3,
          averageDuration: 96,
          totalDuration: 176832,
          // Format for charts - array of { time, calls } objects
          callTrends: hours.map((time, i) => ({
            time,
            calls: callValues[i] || 0
          })),
          callsOverTime: {
            labels: hours,
            data: callValues
          },
          byStatus: {
            completed: 1423,
            failed: 219,
            'no-answer': 120,
            busy: 80,
          },
          byDirection: {
            inbound: 624,
            outbound: 1218,
          },
        }
      };
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
          credits: 5420,
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

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;

