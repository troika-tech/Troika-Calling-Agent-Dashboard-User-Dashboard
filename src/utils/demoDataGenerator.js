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

// Single source of truth for campaigns data - cached
let cachedCampaigns = null;

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

// Generate realistic call SID (like Twilio/Exotel format)
const generateCallSid = (seed) => {
  const hexChars = '0123456789abcdef';
  let sid = 'CA'; // Prefix for call SIDs

  // Generate 32 random hex characters
  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(seededRandom(seed * (i + 1) * 7919) * 16);
    sid += hexChars[randomIndex];
  }

  return sid;
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

  // Generate realistic call SID
  const callSid = generateCallSid(seed);

  const call = {
    _id: `call-${index + 1}`,
    callSid: callSid,
    sessionId: callSid,
    exotelCallSid: callSid,
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

// ============================================
// STATIC CAMPAIGNS DATA - Single source of truth
// Used by both Campaigns page and Delivery Reports page
// Total: 85 campaigns, ~119,847 calls
// ============================================
const STATIC_CAMPAIGNS = [
  // November 2025 (20 campaigns)
  { id: 1, name: 'Christmas Offer Campaign', status: 'completed', totalContacts: 1456, completedCalls: 1456, failedCalls: 0, date: '2025-11-01' },
  { id: 2, name: 'New Year Offer Campaign', status: 'completed', totalContacts: 1287, completedCalls: 1287, failedCalls: 0, date: '2025-11-02' },
  { id: 3, name: 'Holiday Season Special', status: 'completed', totalContacts: 1823, completedCalls: 1823, failedCalls: 0, date: '2025-11-03' },
  { id: 4, name: 'Year End Sale - Warm Leads', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2025-11-04' },
  { id: 5, name: 'Payment Reminder Batch 1', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-11-05' },
  { id: 6, name: 'Premium Plan Upsell', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-11-06' },
  { id: 7, name: 'Customer Satisfaction Survey', status: 'completed', totalContacts: 987, completedCalls: 987, failedCalls: 0, date: '2025-11-07' },
  { id: 8, name: 'New Feature Announcement', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-11-08' },
  { id: 9, name: 'Account Renewal Reminder', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2025-11-09' },
  { id: 10, name: 'Product Demo Follow-up', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2025-11-10' },
  { id: 11, name: 'Service Feedback Collection', status: 'completed', totalContacts: 1765, completedCalls: 1765, failedCalls: 0, date: '2025-11-11' },
  { id: 12, name: 'Welcome Call - New Users', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2025-11-12' },
  { id: 13, name: 'Re-engagement Campaign', status: 'completed', totalContacts: 1098, completedCalls: 1098, failedCalls: 0, date: '2025-11-13' },
  { id: 14, name: 'Cross-sell Add-ons', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-11-14' },
  { id: 15, name: 'Loyalty Program Promo', status: 'paused', totalContacts: 1387, completedCalls: 450, failedCalls: 0, date: '2025-11-15' },
  { id: 16, name: 'Technical Support Outreach', status: 'completed', totalContacts: 876, completedCalls: 876, failedCalls: 0, date: '2025-11-16' },
  { id: 17, name: 'Holiday Greetings Call', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-11-17' },
  { id: 18, name: 'Black Friday Preview', status: 'completed', totalContacts: 1987, completedCalls: 1987, failedCalls: 0, date: '2025-11-18' },
  { id: 19, name: 'Weekend Flash Sale', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-11-19' },
  { id: 20, name: 'Thanksgiving Special', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-11-20' },
  // Late November (10 campaigns)
  { id: 21, name: 'Black Friday Deals', status: 'completed', totalContacts: 2134, completedCalls: 2134, failedCalls: 0, date: '2025-11-21' },
  { id: 22, name: 'Cyber Monday Prep', status: 'completed', totalContacts: 1456, completedCalls: 1456, failedCalls: 0, date: '2025-11-22' },
  { id: 23, name: 'Small Business Saturday', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2025-11-23' },
  { id: 24, name: 'Cyber Monday Sale', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2025-11-24' },
  { id: 25, name: 'Post-Holiday Follow-up', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2025-11-25' },
  { id: 26, name: 'Extended Sale Campaign', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-11-26' },
  { id: 27, name: 'Month-End Push', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-11-27' },
  { id: 28, name: 'VIP Early Access', status: 'completed', totalContacts: 987, completedCalls: 987, failedCalls: 0, date: '2025-11-28' },
  { id: 29, name: 'Premium Tier Outreach', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-11-29' },
  { id: 30, name: 'November Closing Sale', status: 'completed', totalContacts: 1765, completedCalls: 1765, failedCalls: 0, date: '2025-11-30' },
  // December 2025 (30 campaigns)
  { id: 31, name: 'December Kickoff', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2025-12-01' },
  { id: 32, name: 'Winter Warm-up Sale', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-12-02' },
  { id: 33, name: 'Gift Guide Promotion', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2025-12-03' },
  { id: 34, name: 'Free Shipping Week', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-12-04' },
  { id: 35, name: 'Holiday Bundle Deals', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-12-05' },
  { id: 36, name: 'Weekend Warriors Sale', status: 'paused', totalContacts: 1123, completedCalls: 320, failedCalls: 0, date: '2025-12-06' },
  { id: 37, name: 'Pearl Harbor Day Promo', status: 'completed', totalContacts: 987, completedCalls: 987, failedCalls: 0, date: '2025-12-07' },
  { id: 38, name: 'Mid-Week Special', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2025-12-08' },
  { id: 39, name: 'Gift Card Campaign', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-12-09' },
  { id: 40, name: 'Last Minute Gifts', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2025-12-10' },
  { id: 41, name: 'Green Monday Sale', status: 'completed', totalContacts: 1765, completedCalls: 1765, failedCalls: 0, date: '2025-12-11' },
  { id: 42, name: 'Express Shipping Push', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2025-12-12' },
  { id: 43, name: 'Friday the 13th Deals', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-12-13' },
  { id: 44, name: 'Weekend Rush Sale', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-12-14' },
  { id: 45, name: 'Final Push Week', status: 'completed', totalContacts: 1987, completedCalls: 1987, failedCalls: 0, date: '2025-12-15' },
  { id: 46, name: 'Super Saver Monday', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-12-16' },
  { id: 47, name: 'Digital Deals Day', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2025-12-17' },
  { id: 48, name: 'Two Day Shipping Cut', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2025-12-18' },
  { id: 49, name: 'Last Ship Date Alert', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2025-12-19' },
  { id: 50, name: 'Store Pickup Promo', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2025-12-20' },
  { id: 51, name: 'Winter Solstice Sale', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-12-21' },
  { id: 52, name: 'Last Call Campaign', status: 'completed', totalContacts: 987, completedCalls: 987, failedCalls: 0, date: '2025-12-22' },
  { id: 53, name: 'Christmas Eve Rush', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-12-23' },
  { id: 54, name: 'Christmas Day Greetings', status: 'completed', totalContacts: 876, completedCalls: 876, failedCalls: 0, date: '2025-12-24' },
  { id: 55, name: 'Boxing Day Sale', status: 'completed', totalContacts: 1765, completedCalls: 1765, failedCalls: 0, date: '2025-12-26' },
  { id: 56, name: 'Year End Clearance', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2025-12-27' },
  { id: 57, name: 'Weekend Blowout', status: 'paused', totalContacts: 1234, completedCalls: 410, failedCalls: 0, date: '2025-12-28' },
  { id: 58, name: 'New Year Countdown', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2025-12-29' },
  { id: 59, name: 'Year End Thank You', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2025-12-30' },
  { id: 60, name: 'New Year Eve Special', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2025-12-31' },
  // January 2026 (25 campaigns)
  { id: 61, name: 'New Year Fresh Start', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2026-01-01' },
  { id: 62, name: 'January Kickoff Sale', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2026-01-02' },
  { id: 63, name: 'Winter Clearance Event', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2026-01-03' },
  { id: 64, name: 'New Year Resolution', status: 'paused', totalContacts: 1234, completedCalls: 150, failedCalls: 0, date: '2026-01-04' },
  { id: 65, name: 'Weekend Warrior Sale', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2026-01-05' },
  { id: 66, name: 'Monday Motivation', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2026-01-06' },
  { id: 67, name: 'Mid-Week Deals', status: 'completed', totalContacts: 987, completedCalls: 987, failedCalls: 0, date: '2026-01-07' },
  { id: 68, name: 'Customer Loyalty Week', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2026-01-08' },
  { id: 69, name: 'Premium Member Drive', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2026-01-09' },
  { id: 70, name: 'Friday Flash Sale', status: 'completed', totalContacts: 1765, completedCalls: 1765, failedCalls: 0, date: '2026-01-10' },
  { id: 71, name: 'Weekend Special', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2026-01-11' },
  { id: 72, name: 'Sunday Savings', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2026-01-12' },
  { id: 73, name: 'New Week New Deals', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2026-01-13' },
  { id: 74, name: 'Valentine Preview', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2026-01-14' },
  { id: 75, name: 'Mid-January Push', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2026-01-15' },
  { id: 76, name: 'MLK Day Special', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2026-01-16' },
  { id: 77, name: 'Friday Frenzy Sale', status: 'completed', totalContacts: 1876, completedCalls: 1876, failedCalls: 0, date: '2026-01-17' },
  { id: 78, name: 'Weekend Warriors', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2026-01-18' },
  { id: 79, name: 'Super Saver Sunday', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2026-01-19' },
  { id: 80, name: 'Blue Monday Boost', status: 'completed', totalContacts: 1432, completedCalls: 1432, failedCalls: 0, date: '2026-01-19' },
  { id: 81, name: 'Flash Deal Tuesday', status: 'completed', totalContacts: 1123, completedCalls: 1123, failedCalls: 0, date: '2026-01-19' },
  { id: 82, name: 'Hump Day Hustle', status: 'completed', totalContacts: 1345, completedCalls: 1345, failedCalls: 0, date: '2026-01-19' },
  { id: 83, name: 'Thursday Thunder', status: 'completed', totalContacts: 1543, completedCalls: 1543, failedCalls: 0, date: '2026-01-19' },
  { id: 84, name: 'Friday Finale', status: 'completed', totalContacts: 1234, completedCalls: 1234, failedCalls: 0, date: '2026-01-19' },
  { id: 85, name: 'Weekend Wrap-up', status: 'completed', totalContacts: 1654, completedCalls: 1654, failedCalls: 0, date: '2026-01-19' },
];

// Generate full campaign objects from static data
const getCampaignsList = () => {
  return [...STATIC_CAMPAIGNS].sort((a, b) => new Date(b.date) - new Date(a.date)).map((c, i) => {
    const campaignDate = new Date(c.date);
    const processed = c.completedCalls + c.failedCalls;
    const remaining = c.totalContacts - processed;

    // Generate random concurrency (2-6) and retry attempts using seeded random
    const seed = c.id + 12345;
    const concurrentCalls = 2 + Math.floor(seededRandom(seed * 7) * 5); // 2-6
    // Retry contact: 10-120 based on campaign size
    const minRetry = 10 + Math.floor(seededRandom(seed * 13) * 30); // 10-40
    const maxRetry = 80 + Math.floor(seededRandom(seed * 17) * 41); // 80-120
    const retryContact = minRetry + Math.floor(seededRandom(seed * 19) * (maxRetry - minRetry));
    // Total retries made: 1-3x of retry contacts (realistic retry count)
    const retryMultiplier = 1 + seededRandom(seed * 23) * 2; // 1-3x
    const totalRetriesMade = Math.floor(retryContact * retryMultiplier);

    return {
      _id: `camp-${c.id}`,
      id: `camp-${c.id}`,
      name: c.name,
      type: 'sales',
      status: c.status,
      priority: 'high',
      agentId: { name: `AI Agent ${(c.id % 5) + 1}` },
      phoneId: `phone-${(c.id % 3) + 1}`,
      totalCalls: c.totalContacts,
      completedCalls: c.completedCalls,
      failedCalls: c.failedCalls,
      skippedCalls: 0,
      voicemailCalls: 0,
      successRate: 95,
      createdAt: campaignDate.toISOString(),
      totalContacts: c.totalContacts,
      processed: processed,
      remaining: remaining,
      completed: c.completedCalls,
      failed: c.failedCalls,
      // Add concurrency and retry fields
      concurrentCallsLimit: concurrentCalls,
      settings: {
        concurrentCallsLimit: concurrentCalls,
        retryAttempts: 3, // Max retry attempts allowed (config)
      },
      retryContact: retryContact,
      retryAttempt: totalRetriesMade,
      // These are the field names the UI expects
      contactsSetForRetry: retryContact,
      totalRetriesMade: totalRetriesMade,
      liveStats: {
        processed: processed,
        totalNumbers: c.totalContacts,
        remaining: remaining,
        activeCalls: c.status === 'active' ? Math.floor(Math.random() * 10) : 0,
        queueLength: c.status === 'active' ? remaining : 0,
        completed: c.completedCalls,
        failed: c.failedCalls,
      }
    };
  });
};

// Generate campaigns - returns the static data
export const generateCampaigns = () => {
  return { data: getCampaignsList() };
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

// Generate delivery reports based on campaigns - uses same data as campaigns page
export const generateDeliveryReports = (params = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const search = params.search || '';

  // Get campaigns data to ensure consistency
  const campaignsData = generateCampaigns();
  const campaigns = campaignsData.data;

  // Convert campaigns to delivery reports format
  const reports = campaigns.map((campaign, i) => {
    const seed = i + 54321;

    // Generate random-looking unique ID (12 digits)
    const d1 = Math.floor(seededRandom(seed * 11) * 9) + 1; // 1-9
    const d2 = Math.floor(seededRandom(seed * 13) * 10);
    const d3 = Math.floor(seededRandom(seed * 17) * 10);
    const d4 = Math.floor(seededRandom(seed * 19) * 10);
    const d5 = Math.floor(seededRandom(seed * 23) * 10);
    const d6 = Math.floor(seededRandom(seed * 29) * 10);
    const d7 = Math.floor(seededRandom(seed * 31) * 10);
    const d8 = Math.floor(seededRandom(seed * 37) * 10);
    const d9 = Math.floor(seededRandom(seed * 41) * 10);
    const d10 = Math.floor(seededRandom(seed * 43) * 10);
    const d11 = Math.floor(seededRandom(seed * 47) * 10);
    const d12 = Math.floor(seededRandom(seed * 53) * 10);
    const uniqueId = `${d1}${d2}${d3}${d4}${d5}${d6}${d7}${d8}${d9}${d10}${d11}${d12}`;

    // Calculate used credits from completed calls  
    const usedCredits = Math.floor(campaign.completedCalls * (140 + seededRandom(seed * 3) * 60));

    return {
      _id: `report-${i + 1}`,
      uniqueId: uniqueId,
      campaignName: campaign.name, // Use exact campaign name
      totalNumbers: campaign.totalContacts,
      usedCredits: usedCredits,
      status: campaign.status, // Use exact campaign status
      createdAt: campaign.createdAt,
      campaignId: campaign._id,
    };
  });

  // Keep same order as campaigns page (no sorting needed - using static data order)

  // Filter by search term if provided
  let filteredReports = reports;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredReports = reports.filter(report =>
      report.campaignName.toLowerCase().includes(searchLower) ||
      report.uniqueId.toLowerCase().includes(searchLower)
    );
  }

  const total = filteredReports.length;
  const pages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  return {
    reports: paginatedReports,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      pages: pages,
    }
  };
};

// Get all delivery reports without pagination
export const getAllDeliveryReports = () => {
  const result = generateDeliveryReports({ page: 1, limit: 1000 });
  return {
    reports: result.reports,
    total: result.pagination.total,
  };
};

// Get a specific delivery report by ID (supports both _id and campaignId formats)
export const getDeliveryReportById = (reportId) => {
  const allReports = generateDeliveryReports({ page: 1, limit: 1000 }).reports;

  // Find report by _id, campaignId, or uniqueId
  return allReports.find(report =>
    report._id === reportId ||
    report.campaignId === reportId ||
    report.uniqueId === reportId
  ) || null;
};

// Generate campaign report overview data for a specific report
export const generateCampaignReportOverview = (campaignId) => {
  const report = getDeliveryReportById(campaignId);

  if (!report) {
    return null;
  }

  const seed = parseInt(campaignId.replace(/\D/g, ''), 10) || 12345;
  const totalNumbers = report.totalNumbers;

  // Calculate very positive stats
  const pickupRate = report.status === 'completed'
    ? 82 + Math.floor(seededRandom(seed * 7) * 13) // 82-95% for completed
    : 75 + Math.floor(seededRandom(seed * 7) * 15); // 75-90% for others

  const pickedUp = Math.floor(totalNumbers * pickupRate / 100);
  const highEngagement = Math.floor(pickedUp * (0.70 + seededRandom(seed * 8) * 0.20)); // 70-90% of picked up have high engagement
  const noOrMinimalEngagement = pickedUp - highEngagement;
  const failedCalls = Math.floor(totalNumbers * (0.02 + seededRandom(seed * 9) * 0.05)); // Only 2-7% failed
  const remaining = Math.max(0, totalNumbers - pickedUp - failedCalls);
  const remainingPercent = totalNumbers > 0 ? Math.floor((remaining / totalNumbers) * 100) : 0;

  // Generate phone number and user
  const phoneNumber = `+91${String(9000000000 + (seed % 1000000000)).slice(0, 10)}`;
  const userNames = ['Pratik Sharma', 'Raj Kumar', 'Aisha Patel', 'Vikram Singh', 'Priya Gupta'];
  const userName = userNames[seed % userNames.length];
  const userEmail = userName.toLowerCase().replace(' ', '.') + '@troika.tech';

  return {
    campaign: {
      _id: report._id,
      name: report.campaignName,
      status: report.status,
      totalContacts: totalNumbers,
      phoneId: { number: phoneNumber },
      userId: { name: userName, email: userEmail },
      createdAt: report.createdAt,
    },
    overview: {
      campaignTarget: totalNumbers,
      attemptsMade: pickedUp + failedCalls,
      pickupRate: { count: pickedUp, percentage: String(pickupRate) },
      campaignCredits: report.usedCredits,
      highEngagement: highEngagement,
      noOrMinimalEngagement: noOrMinimalEngagement,
      remaining: { count: remaining, percentage: String(remainingPercent) },
      failedCalls: failedCalls,
    },
  };
};

// Generate campaign contacts for the analytics tab
export const generateCampaignContacts = (campaignId, params = {}) => {
  const report = getDeliveryReportById(campaignId);
  if (!report) {
    return { contacts: [], total: 0, page: 1, pages: 0 };
  }

  const page = params.page || 1;
  const limit = params.limit || 25;
  const seed = parseInt(campaignId.replace(/\D/g, ''), 10) || 12345;
  const totalNumbers = report.totalNumbers;

  // Generate ALL contacts matching the total (no cap)
  const allContacts = [];
  const failureReasons = ['No answer', 'Busy', null, null, null];

  // Helper to generate random-looking phone numbers
  const generatePhoneNumber = (contactSeed) => {
    // Generate varied, random-looking Indian phone numbers
    const prefixes = ['98', '99', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85', '84', '83', '82', '81', '80', '79', '78', '77', '76', '75', '74', '73', '72', '70'];
    const prefixIndex = Math.floor(seededRandom(contactSeed * 11) * prefixes.length);
    const prefix = prefixes[prefixIndex];

    // Generate remaining 8 digits with more randomness
    const d1 = Math.floor(seededRandom(contactSeed * 13) * 10);
    const d2 = Math.floor(seededRandom(contactSeed * 17) * 10);
    const d3 = Math.floor(seededRandom(contactSeed * 19) * 10);
    const d4 = Math.floor(seededRandom(contactSeed * 23) * 10);
    const d5 = Math.floor(seededRandom(contactSeed * 29) * 10);
    const d6 = Math.floor(seededRandom(contactSeed * 31) * 10);
    const d7 = Math.floor(seededRandom(contactSeed * 37) * 10);
    const d8 = Math.floor(seededRandom(contactSeed * 41) * 10);

    return `+91${prefix}${d1}${d2}${d3}${d4}${d5}${d6}${d7}${d8}`;
  };

  for (let i = 0; i < totalNumbers; i++) {
    const contactSeed = seed * 1000 + i;
    const statusRand = seededRandom(contactSeed);
    let status;
    // Very positive: 85% completed, only 15% other statuses
    if (statusRand < 0.85) status = 'completed';
    else if (statusRand < 0.92) status = 'no-answer';
    else if (statusRand < 0.97) status = 'busy';
    else status = 'failed';

    // Higher interaction rate: 80% of completed calls have interaction
    const hasInteraction = status === 'completed' && seededRandom(contactSeed * 2) > 0.2;
    const phoneNumber = generatePhoneNumber(contactSeed);
    const duration = status === 'completed'
      ? Math.floor(30 + seededRandom(contactSeed * 3) * 180)
      : 0;

    const failureReason = status === 'failed' || status === 'no-answer' || status === 'busy'
      ? failureReasons[Math.floor(seededRandom(contactSeed * 4) * failureReasons.length)]
      : null;

    // Generate call date within campaign date range
    const reportDate = new Date(report.createdAt);
    const callDate = new Date(reportDate.getTime() + (i * 60000)); // Spread calls over time

    allContacts.push({
      _id: `contact-${campaignId}-${i}`,
      phoneNumber: phoneNumber,
      status: status,
      failureReason: failureReason,
      duration: duration,
      hasInteraction: hasInteraction,
      recordingUrl: hasInteraction ? `https://recordings.example.com/${campaignId}/${i}.mp3` : null,
      transcript: hasInteraction ? [{ role: 'agent', content: 'Hello, is this a good time?' }, { role: 'customer', content: 'Yes, please continue.' }] : [],
      callDate: callDate.toISOString(),
      createdAt: callDate.toISOString(),
    });
  }

  // Apply filters
  let filteredContacts = allContacts;

  if (params.status) {
    filteredContacts = filteredContacts.filter(c => c.status === params.status);
  }

  if (params.phoneNumbers && params.phoneNumbers.length > 0) {
    filteredContacts = filteredContacts.filter(c =>
      params.phoneNumbers.some(phone => c.phoneNumber.includes(phone))
    );
  }

  if (params.hasInteraction !== undefined) {
    filteredContacts = filteredContacts.filter(c => c.hasInteraction === params.hasInteraction);
  }

  const total = filteredContacts.length;
  const pages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + limit);

  return {
    contacts: paginatedContacts,
    total: total,
    page: page,
    pages: pages,
  };
};

// Get unique phone numbers for a campaign's contacts
export const getCampaignPhoneNumbers = (campaignId) => {
  const contacts = generateCampaignContacts(campaignId, { page: 1, limit: 500 });
  const phoneNumbers = [...new Set(contacts.contacts.map(c => c.phoneNumber))];
  return {
    phoneNumbers: phoneNumbers.slice(0, 100), // Limit to 100 unique numbers
    total: phoneNumbers.length,
  };
};

export default {
  generateCall,
  getCachedCall,
  generateCalls,
  generateCampaigns,
  generateDashboardAnalytics,
  generateWeeklyChartData,
  generateDeliveryReports,
  getAllDeliveryReports,
  getDeliveryReportById,
  generateCampaignReportOverview,
  generateCampaignContacts,
  getCampaignPhoneNumbers,
};
