/**
 * Demo Data Generator
 * Generates realistic call records, campaigns, and analytics for exhibition demo
 */

import config from '../config';
import { getRealRecordingUrl } from '../config/realRecordings';

const { demo } = config;

// Cache for generated data to improve performance
const callCache = new Map();
const CACHE_SIZE = 1000; // Cache last 1000 calls

/**
 * Get or generate call with caching
 */
const getCachedCall = (index, totalCalls, config) => {
  const cacheKey = `${index}-${config.demo.totalCalls}`;

  if (callCache.has(cacheKey)) {
    return callCache.get(cacheKey);
  }

  const campaignIndex = index % config.demo.totalCampaigns;
  const template = CAMPAIGN_TEMPLATES[campaignIndex % CAMPAIGN_TEMPLATES.length];
  const call = generateCall(index, `campaign-${campaignIndex + 1}`, template.name, template.type);

  // Maintain cache size limit
  if (callCache.size >= CACHE_SIZE) {
    const firstKey = callCache.keys().next().value;
    callCache.delete(firstKey);
  }

  callCache.set(cacheKey, call);
  return call;
};

// Campaign templates with different types and purposes
const CAMPAIGN_TEMPLATES = [
  { name: 'Christmas Offer Campaign', type: 'sales', priority: 'high' },
  { name: 'New Year Offer Campaign', type: 'sales', priority: 'high' },
  { name: 'Holiday Season Special - Premium Plans', type: 'sales', priority: 'high' },
  { name: 'Year End Sale - Warm Leads', type: 'sales', priority: 'high' },
  { name: 'Payment Reminder - January Batch', type: 'reminder', priority: 'medium' },
  { name: 'Premium Plan Upsell Campaign', type: 'sales', priority: 'high' },
  { name: 'Customer Satisfaction Survey', type: 'survey', priority: 'low' },
  { name: 'New Feature Announcement', type: 'marketing', priority: 'medium' },
  { name: 'Account Renewal Reminder', type: 'reminder', priority: 'high' },
  { name: 'Product Demo Follow-up', type: 'sales', priority: 'high' },
  { name: 'Service Feedback Collection', type: 'survey', priority: 'low' },
  { name: 'Welcome Call - New Customers', type: 'onboarding', priority: 'medium' },
  { name: 'Re-engagement Campaign - Inactive Users', type: 'marketing', priority: 'medium' },
];

// Realistic transcript templates for different call types
const TRANSCRIPT_TEMPLATES = {
  sales: [
    {
      assistant: "Hello! This is calling from our sales team. I'd like to tell you about our exclusive Christmas offer.",
      user: "Hi, what's this about?",
      assistant: "We're offering a 40% discount on our premium plans this Christmas season. Are you currently using any similar services?",
      user: "Yes, I'm interested. Tell me more.",
      assistant: "Great! Our premium plan includes unlimited calls, advanced analytics, and priority support. Would you like me to email you the details?",
      user: "Yes, please send me the information.",
      assistant: "Perfect! I'll send that right away. Is there anything else you'd like to know?",
      user: "No, that's all for now.",
      assistant: "Thank you for your time! Merry Christmas!",
    },
    {
      assistant: "Good afternoon! I'm calling about our special New Year offer on AI calling solutions.",
      user: "What's the offer about?",
      assistant: "We're giving 50% off for the first 3 months this New Year. We've helped companies reduce their calling costs by 60%. Would that be of interest?",
      user: "Yes, that sounds good.",
      assistant: "Excellent! Can I send you a quick email with all the details and pricing?",
      user: "Sure, that's fine.",
      assistant: "Perfect! You'll receive it within the hour. Happy New Year!",
    },
    {
      assistant: "Hello! I'm calling to discuss how our AI calling solution can help your business grow this holiday season.",
      user: "I'm a bit busy right now.",
      assistant: "I understand. This will only take a minute. We have a special year-end sale with up to 45% discount. Interested?",
      user: "Maybe, but I really need to go.",
      assistant: "No problem! Can I send you our holiday brochure via email?",
      user: "Sure, that works.",
      assistant: "Excellent! Check your inbox in a few minutes. Thank you!",
    },
  ],
  reminder: [
    {
      assistant: "Hello! This is a friendly reminder about your pending payment for January.",
      user: "Oh yes, I forgot about that.",
      assistant: "No worries! Your payment of ₹5,000 is due by the 15th. Would you like me to send you the payment link?",
      user: "Yes, please do that.",
      assistant: "I've sent it to your registered email. You should receive it shortly.",
      user: "Great, I'll take care of it today.",
      assistant: "Thank you! Let us know if you need any assistance.",
    },
  ],
  survey: [
    {
      assistant: "Hi! We're conducting a quick customer satisfaction survey. Do you have 2 minutes?",
      user: "Sure, go ahead.",
      assistant: "On a scale of 1 to 10, how satisfied are you with our service?",
      user: "I'd say about 8.",
      assistant: "That's great to hear! What could we do to make it a 10?",
      user: "Maybe faster response times for support queries.",
      assistant: "Thank you for the feedback! We'll definitely work on that. Have a great day!",
    },
  ],
  onboarding: [
    {
      assistant: "Welcome! Thank you for signing up. I'm here to help you get started.",
      user: "Thanks! I'm excited to begin.",
      assistant: "Perfect! Have you had a chance to explore the dashboard yet?",
      user: "Not really, I just signed up.",
      assistant: "No problem! I'll send you a quick start guide. Would you like to schedule a demo call?",
      user: "Yes, that would be helpful.",
      assistant: "Great! I'll have someone from our team reach out to schedule that. Welcome aboard!",
    },
  ],
};

// Generate random Indian phone number
const generatePhoneNumber = (seed) => {
  // Use multiple primes for very random-looking distribution
  const prefixes = [98, 99, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80];
  const prefix = prefixes[(seed * 6997) % prefixes.length];

  // Mix multiple primes for maximum randomness while staying deterministic
  const part1 = ((seed * 7919) % 10000).toString().padStart(4, '0');
  const part2 = ((seed * 5237 + 1234) % 10000).toString().padStart(4, '0');

  return `+91${prefix}${part1}${part2}`;
};

// Deterministic pseudo-random using seed
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Get call status based on pickup and completion rates
const getCallStatus = (seed) => {
  const rand = seededRandom(seed);
  const pickupRate = demo.pickupRate / 100;
  const completionRate = demo.completionRate / 100;

  if (rand < completionRate) {
    return 'completed';
  } else if (rand < pickupRate) {
    return 'user-ended'; // Picked up but didn't complete
  } else if (rand < pickupRate + 0.10) {
    return 'busy';
  } else if (rand < pickupRate + 0.15) {
    return 'failed';
  } else {
    return 'no-answer';
  }
};

// Generate realistic call duration based on status
const getCallDuration = (status, seed) => {
  if (status === 'completed') {
    // Completed calls: 60-300 seconds (1-5 minutes) - PICKED UP
    return Math.floor(60 + seededRandom(seed) * 240);
  } else if (status === 'user-ended') {
    // User ended early: 10-60 seconds - PICKED UP
    return Math.floor(10 + seededRandom(seed * 2) * 50);
  } else {
    // Not picked up (no-answer, busy, failed): 0 duration
    return 0;
  }
};

// Generate transcript for completed/user-ended calls
const generateTranscript = (campaignType, seed, status) => {
  if (status !== 'completed' && status !== 'user-ended') {
    return null;
  }

  const templates = TRANSCRIPT_TEMPLATES[campaignType] || TRANSCRIPT_TEMPLATES.sales;
  const template = templates[seed % templates.length];

  const transcript = [];
  let timeOffset = 2000; // Start at 2 seconds

  Object.entries(template).forEach(([speaker, text]) => {
    transcript.push({
      speaker: speaker === 'assistant' ? 'assistant' : 'user',
      role: speaker === 'assistant' ? 'assistant' : 'user',
      text: text,
      content: text,
      timestamp: new Date(Date.now() - timeOffset).toISOString(),
    });
    timeOffset += 3000 + seededRandom(seed + timeOffset) * 4000; // 3-7 seconds between messages
  });

  // For user-ended calls, cut transcript short
  if (status === 'user-ended') {
    return transcript.slice(0, Math.floor(transcript.length * 0.6));
  }

  return transcript;
};

// Generate a single call record
export const generateCall = (index, campaignId, campaignName, campaignType) => {
  const seed = index + 12345; // Offset seed for variety
  const status = getCallStatus(seed);
  const duration = getCallDuration(status, seed);

  // Distribute calls over 3-month period (Oct 17, 2024 to Jan 17, 2026)
  const startDate = new Date(demo.dataStartDate);
  const endDate = new Date(demo.dataEndDate);
  const timeRange = endDate - startDate;
  const callTime = new Date(startDate.getTime() + seededRandom(seed) * timeRange);

  // Set realistic time of day (9 AM to 6 PM)
  const hour = 9 + Math.floor(seededRandom(seed * 5) * 9);
  const minute = Math.floor(seededRandom(seed * 6) * 60);
  callTime.setHours(hour, minute, 0, 0);

  const endTime = new Date(callTime.getTime() + duration * 1000);
  const phoneNumber = generatePhoneNumber(seed);
  const transcript = generateTranscript(campaignType, seed, status);

  // Get recording URL - check for real recording first, fallback to demo URL
  let recordingUrl = null;
  if (index < demo.realRecordingsCount) {
    // Try to get real recording URL
    const realUrl = getRealRecordingUrl(index);
    if (realUrl) {
      recordingUrl = realUrl;
    } else {
      // Fallback to demo placeholder URL
      recordingUrl = `https://demo-recordings.example.com/call-${String(index + 1).padStart(3, '0')}.mp3`;
    }
  }

  // Realistic direction distribution: 75% outbound, 25% inbound
  const direction = (index * 7919) % 100 < 75 ? 'outbound' : 'inbound';

  const call = {
    _id: `call-${index + 1}`,
    callSid: `CA${1000000 + index}`,
    sessionId: `CA${1000000 + index}`,
    exotelCallSid: `CA${1000000 + index}`,
    fromPhone: '+919876543210', // Company number
    toPhone: phoneNumber,
    status: status,
    duration: duration,
    durationSec: duration,
    cost: (duration * 0.008).toFixed(2), // ₹0.008 per second
    createdAt: callTime.toISOString(),
    startedAt: callTime.toISOString(),
    startTime: callTime.toISOString(),
    endedAt: endTime.toISOString(),
    direction: direction,
    campaignId: campaignId,
    campaignName: campaignName,
    agentName: `AI Agent ${(seed % 5) + 1}`,
    transcript: transcript,
    recordingUrl: recordingUrl,
    creditsConsumed: duration,
  };

  // Flag first 40 calls for real recordings
  if (index < demo.realRecordingsCount) {
    call.isRealRecording = true;
  }

  return call;
};

// Generate paginated calls with filters
export const generateCalls = (params = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const total = demo.totalCalls;

  // Generate all call indices
  const allIndices = Array.from({ length: total }, (_, i) => i);

  // Filter by status
  let filteredIndices = allIndices;
  if (params.status) {
    filteredIndices = allIndices.filter(i => {
      const status = getCallStatus(i + 12345);
      return status === params.status;
    });
  }

  // Filter by direction (all calls are outbound in demo)
  if (params.direction) {
    // All demo calls are outbound, so filter out if direction is not outbound
    if (params.direction !== 'outbound') {
      filteredIndices = [];
    }
  }

  // Filter by date range
  if (params.startDate || params.endDate) {
    const startDate = params.startDate ? new Date(params.startDate) : null;
    const endDate = params.endDate ? new Date(params.endDate) : null;

    filteredIndices = filteredIndices.filter(i => {
      const seed = i + 12345;
      const dataStart = new Date(demo.dataStartDate);
      const dataEnd = new Date(demo.dataEndDate);
      const timeRange = dataEnd - dataStart;
      const callTime = new Date(dataStart.getTime() + seededRandom(seed) * timeRange);

      if (startDate && callTime < startDate) return false;
      if (endDate && callTime > endDate) return false;
      return true;
    });
  }

  // Filter by phone numbers (if provided)
  // Note: This is less efficient as we need to generate calls to check phone numbers
  // For demo purposes, we'll skip this filter or implement it post-generation
  if (params.phoneNumbers && Array.isArray(params.phoneNumbers) && params.phoneNumbers.length > 0) {
    // Generate calls first, then filter by phone numbers
    const tempCalls = filteredIndices.map(i => {
      return getCachedCall(i, total, config);
    });

    filteredIndices = tempCalls
      .map((call, idx) => ({ call, originalIndex: filteredIndices[idx] }))
      .filter(({ call }) => params.phoneNumbers.includes(call.toPhone))
      .map(({ originalIndex }) => originalIndex);
  }

  const filteredTotal = filteredIndices.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const pageIndices = filteredIndices.slice(startIndex, endIndex);

  // Generate calls for this page
  const calls = pageIndices.map(i => {
    return getCachedCall(i, total, config);
  });

  return {
    data: {
      calls: calls,
      total: filteredTotal,
      page: page,
      limit: limit,
      pages: Math.ceil(filteredTotal / limit),
      pagination: {
        page: page,
        limit: limit,
        total: filteredTotal,
        pages: Math.ceil(filteredTotal / limit),
      }
    }
  };
};

// Generate campaigns
export const generateCampaigns = () => {
  // Generate 43 campaigns (some templates used multiple times)
  const campaignList = [];

  // Campaign date range: Nov 1, 2025 to Jan 17, 2026
  const startDate = new Date('2025-11-01').getTime();
  const endDate = new Date('2026-01-17').getTime();

  for (let i = 0; i < 43; i++) {
    const template = CAMPAIGN_TEMPLATES[i % CAMPAIGN_TEMPLATES.length];
    const campaignId = `camp-${i + 1}`;
    const totalCalls = Math.floor(config.demo.totalCalls / 43) + (i % 5); // Add variance

    const seed = i + 54321;
    const statusRand = seededRandom(seed);

    // Most campaigns completed, some paused
    let status;
    if (statusRand < 0.85) {
      status = 'completed';
    } else {
      status = 'paused';
    }

    // Calculate campaign stats
    const totalContacts = 1000 + Math.floor(seededRandom(seed * 2) * 4000);

    // Completed campaigns: 100% progress, Paused campaigns: 40-70% progress
    let processed, completed, failed, completedCalls, failedCalls;
    if (status === 'completed') {
      processed = totalContacts; // 100% progress

      // Some campaigns have 0 failures (50%), others have minimal failures (1-3%)
      const failureRand = seededRandom(seed * 6);
      if (failureRand < 0.5) {
        // 50% campaigns have 0 failed calls (perfect success)
        failedCalls = 0;
        completedCalls = totalContacts;
      } else {
        // 50% campaigns have 1-3% failed calls
        failedCalls = Math.floor(totalContacts * (0.01 + seededRandom(seed * 7) * 0.02));
        completedCalls = totalContacts - failedCalls;
      }
      completed = completedCalls;
      failed = failedCalls;
    } else {
      // Paused campaigns have partial progress (40-70%)
      processed = Math.floor(totalContacts * (0.4 + seededRandom(seed * 3) * 0.3));

      // Paused campaigns also have minimal failures
      const failureRand = seededRandom(seed * 6);
      if (failureRand < 0.5) {
        failedCalls = 0;
        completedCalls = processed;
      } else {
        failedCalls = Math.floor(processed * (0.01 + seededRandom(seed * 7) * 0.02));
        completedCalls = processed - failedCalls;
      }
      completed = completedCalls;
      failed = failedCalls;
    }

    // Distribute campaigns across Nov 2025 - Jan 17 2026
    const campaignDate = new Date(startDate + (i / 42) * (endDate - startDate));

    campaignList.push({
      _id: campaignId,
      id: campaignId,
      name: i < CAMPAIGN_TEMPLATES.length ? template.name : `${template.name} - Batch ${Math.floor(i / CAMPAIGN_TEMPLATES.length) + 1}`,
      type: template.type,
      status: status,
      priority: template.priority,
      agentId: { name: `AI Agent ${(seed % 5) + 1}` },
      phoneId: `phone-${(seed % 3) + 1}`,
      totalCalls,
      completedCalls,
      failedCalls,
      skippedCalls: 0,
      voicemailCalls: 0,
      successRate: config.demo.completionRate,
      createdAt: campaignDate.toISOString(),
      totalContacts: totalContacts,
      processed: processed,
      remaining: totalContacts - processed,
      completed: completed,
      failed: failed,
      liveStats: {
        processed: processed,
        totalNumbers: totalContacts,
        remaining: totalContacts - processed,
        activeCalls: status === 'active' ? Math.floor(seededRandom(seed * 4) * 10) : 0,
        queueLength: status === 'active' ? Math.floor(seededRandom(seed * 5) * 50) : 0,
        completed: completed,
        failed: failed,
      }
    });
  }

  return { data: campaignList };
};

// Generate dashboard analytics
export const generateDashboardAnalytics = () => {
  const completedCalls = Math.floor(demo.totalCalls * (demo.completionRate / 100));
  const pickedUpCalls = Math.floor(demo.totalCalls * (demo.pickupRate / 100));
  const userEndedCalls = pickedUpCalls - completedCalls;
  const noAnswerCalls = Math.floor((demo.totalCalls - pickedUpCalls) * 0.75);
  const busyCalls = Math.floor((demo.totalCalls - pickedUpCalls) * 0.15);
  const failedCalls = demo.totalCalls - completedCalls - userEndedCalls - noAnswerCalls - busyCalls;

  return {
    data: {
      totalCalls: demo.totalCalls,
      completedCalls: completedCalls,
      failedCalls: failedCalls,
      inProgressCalls: 0,
      successRate: ((completedCalls / demo.totalCalls) * 100).toFixed(1),
      averageDuration: demo.avgDuration,
      totalDuration: completedCalls * demo.avgDuration,
      byStatus: {
        completed: completedCalls,
        'user-ended': userEndedCalls,
        'no-answer': noAnswerCalls,
        busy: busyCalls,
        failed: failedCalls,
      },
      byDirection: {
        outbound: Math.floor(demo.totalCalls * 0.75),
        inbound: Math.floor(demo.totalCalls * 0.25),
      },
    }
  };
};

// Generate weekly chart data (last 7 days)
export const generateWeeklyChartData = () => {
  const chartData = [];
  const today = new Date();

  for (let i = 7; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = dayNames[date.getDay()];
    const dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

    // More calls on weekdays, fewer on weekends
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseCalls = isWeekend ? 800 : 2000;
    const variance = seededRandom(i * 999) * 500;
    const calls = Math.floor(baseCalls + variance);

    chartData.push({
      date: date.toISOString().split('T')[0],
      day: day,
      dateLabel: dateLabel,
      calls: calls
    });
  }

  return {
    chartData: chartData,
    totalCalls: chartData.reduce((sum, d) => sum + d.calls, 0)
  };
};

export default {
  generateCall,
  getCachedCall,
  generateCalls,
  generateCampaigns,
  generateDashboardAnalytics,
  generateWeeklyChartData,
};
