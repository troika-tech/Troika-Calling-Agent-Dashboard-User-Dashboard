# AUTOMATIC CALLBACK IMPLEMENTATION PLAN
## Missed Call Auto-Callback System for 2-Channel Concurrency

---

## TABLE OF CONTENTS
1. [Overview](#overview)
2. [Current System Analysis](#current-system-analysis)
3. [Feature Requirements](#feature-requirements)
4. [Architecture Design](#architecture-design)
5. [Implementation Plan](#implementation-plan)
6. [Database Schema Changes](#database-schema-changes)
7. [Backend Implementation](#backend-implementation)
8. [Frontend Implementation](#frontend-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Deployment & Rollout](#deployment--rollout)

---

## OVERVIEW

### Problem Statement
Currently, when both calling channels are busy (2 concurrent calls active):
- **Incoming calls**: Get rejected/cut, creating a missed call entry
- **Outgoing/Campaign calls**: No slots available for new calls

### Desired Behavior

#### Scenario 1: Incoming Calls (Priority Callback)
```
CURRENT STATE:
Channel 1: Active incoming call
Channel 2: Active incoming/outgoing call
New incoming call → REJECTED → Missed call logged

DESIRED STATE:
Channel 1: Active incoming call
Channel 2: Active incoming/outgoing call
New incoming call → REJECTED → Missed call logged
When Channel 1 or 2 frees up → AUTO-CALLBACK to missed number
```

#### Scenario 2: Campaign Calls (Delayed Callback)
```
CURRENT STATE:
Campaign running with 2 concurrent calls
20 contacts in queue
Campaign completes → All done

DESIRED STATE:
Campaign running with 2 concurrent calls
5 missed calls during campaign (from channels being busy)
Campaign completes → AUTO-CALLBACK to all 5 missed numbers
```

### Key Differences
| Aspect | Incoming Missed Calls | Campaign Missed Calls |
|--------|---------------------|---------------------|
| **Priority** | HIGH (immediate callback) | LOW (after campaign) |
| **Trigger** | As soon as slot frees | After campaign completion |
| **Queue** | Real-time queue | Batch queue |
| **Retry Logic** | Single attempt only (no retries) | Single attempt only (no retries) |

---

## CURRENT SYSTEM ANALYSIS

### System Configuration & Relationships

#### User-Agent-Phone Hierarchy
```
User (Top Level)
  ├─► credits: number (balance for calls, 1 credit = 1 second)
  ├─► phoneId: ObjectId (reference to assigned phone)
  │
  ├─► Phone(s) [userId field in Phone points back to User]
  │     ├─► agentId: ObjectId (which agent handles calls on this phone)
  │     ├─► exotelData: { apiKey, apiToken, sid, subdomain } (ENCRYPTED)
  │     └─► status: 'active' | 'inactive'
  │
  └─► Agent(s) [userId field in Agent points back to User]
        ├─► config: { prompt, voice, llm, languages, etc. }
        └─► isActive: boolean
```

**Key Relationships**:
- **User → Phone**: One-to-One (User.phoneId points to Phone)
- **Phone → User**: Many-to-One (Phone.userId points to User)
- **Phone → Agent**: Many-to-One (Phone.agentId points to Agent)
- **Agent → User**: Many-to-One (Agent.userId points to User - creator/owner)

**Configuration Flow**:
1. Admin assigns Phone to User: `Phone.userId = userId` AND `User.phoneId = phoneId`
2. User creates Agent: `Agent.userId = userId` (ownership)
3. User/Admin assigns Agent to Phone: `Phone.agentId = agentId`
4. Phone is now ready to make/receive calls using that Agent

**Credit System**:
- Credits stored in `User.credits` (Number, min: 0)
- 1 credit = 1 second of call duration
- Credits deducted AFTER call ends (automatic post-save hook on CallLog)
- Credit check BEFORE call initiation: Must have `credits > 0`
- Manual credit management by admin only (add/remove)
- All credit changes create CreditTransaction record + WebSocket broadcast

**IMPORTANT FOR CALLBACKS**:
- CallLog has `userId` field (who owns the call)
- CallLog has `phoneId` field (which phone was used)
- CallLog has `agentId` field (which agent handled the call)
- For callbacks, we'll use the same userId/phoneId/agentId from the original missed call

### Existing Components We'll Leverage

#### 1. Redis Concurrency System (redisConcurrency.util.ts)
```typescript
// Already handles:
- campaign:{campaignId}:leases (SET of active call IDs)
- campaign:{campaignId}:limit (default: 2)
- Atomic LUA scripts for slot management
- TTL-based cleanup
```
**Usage**: We'll extend this to track global phone number concurrency, not just campaign-level.

#### 2. CallLog Model (CallLog.ts)
```typescript
// Already tracks:
- status: 'initiated' | 'completed' | 'failed' | 'no-answer' | 'busy'
- failureReason: 'no_answer' | 'busy' | 'voicemail'
- direction: 'inbound' | 'outbound'
- retryCount, retryOf
```
**Usage**: Add new fields for callback tracking.

#### 3. BullMQ Queue System
```typescript
// Already exists:
- campaignCalls.queue (campaign job processing)
- scheduledCalls.queue (future calls)
```
**Usage**: Add new `missedCallCallbacks.queue` for auto-callbacks.

#### 4. CallBacks.jsx Component
```typescript
// Already handles:
- Follow-up call scheduling from transcripts
- Callback detection using NLP patterns
- Manual callback scheduling
```
**Usage**: Extend to show automatic missed call callbacks.

#### 5. WebSocket System (useCreditWebSocket.js)
```typescript
// Already supports:
- Real-time credit updates
- Dashboard notifications
```
**Usage**: Add missed call notifications and callback status updates.

---

## FEATURE REQUIREMENTS

### Functional Requirements

#### FR1: Missed Call Detection
- Automatically detect when incoming call is rejected due to busy channels
- Log missed call with metadata (timestamp, caller number, phone number called)
- Differentiate between:
  - Busy (no slots available)
  - No answer (rang but not answered)
  - Network failure (technical issue)

#### FR2: Channel Availability Monitoring
- Real-time monitoring of active calls per phone number
- Track when channel becomes available (call ends)
- Trigger callback queue processing on slot availability

#### FR3: Automatic Callback Queue
- **Priority Queue**: Incoming missed calls (FIFO)
- **Batch Queue**: Campaign missed calls (processed after campaign ends)
- **Single attempt only** - No retry logic (1 attempt per missed call)
- If callback fails, it's marked as 'failed' and not retried
- **CREDIT CHECK REQUIREMENT**: User must have credits > 100 before callback is attempted
  - If user has <= 100 credits, callback will be paused/skipped
  - Callback status marked as 'insufficient_credits'
  - Admin notification sent to add credits
  - Callback can be retried after credits are added

#### FR4: Callback Execution
- Use same AI agent that would have handled the incoming call
- Maintain conversation context (e.g., "I see you called earlier...")
- Track callback attempts and outcomes
- Update CallLog with callback results

#### FR5: Dashboard Integration
- Real-time missed call notifications
- Missed call callback status tracking
- Visual indication of pending callbacks
- Callback history and analytics

#### FR6: Campaign Integration
- Track missed calls during campaign execution
- Pause callback processing while campaign is active
- Resume callbacks after campaign completion
- Separate callback limits for campaign vs. incoming

### Non-Functional Requirements

#### NFR1: Performance
- Callback processing latency < 5 seconds after slot availability
- Support up to 100 missed calls in queue
- No impact on existing call quality

#### NFR2: Reliability
- 99.9% callback execution rate
- Redis persistence for queue durability
- Automatic retry on transient failures

#### NFR3: Scalability
- Support multiple phone numbers with independent queues
- Handle concurrent callback processing across users
- Efficient Redis key management

#### NFR4: Observability
- Comprehensive logging for callback lifecycle
- Metrics for callback success/failure rates
- Real-time dashboard updates

---

## ARCHITECTURE DESIGN

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         INCOMING CALL                            │
│                              ↓                                   │
│                    Check Channel Availability                    │
│                              ↓                                   │
│                    ┌─────────┴─────────┐                        │
│                    │                   │                        │
│              Slot Available      No Slot (BUSY)                 │
│                    │                   │                        │
│              Process Call         Reject Call                   │
│                    │                   │                        │
│                    │           Log as MISSED CALL               │
│                    │                   │                        │
│                    │         Add to Priority Queue              │
│                    │                   │                        │
│                    ├───────────────────┘                        │
│                    │                                            │
│              Call Ends Event                                    │
│                    │                                            │
│              Trigger Callback                                   │
│              Processor                                          │
│                    │                                            │
│         ┌──────────┴──────────┐                                │
│         │                     │                                │
│   Priority Queue      Campaign Queue                           │
│   (Immediate)         (After Campaign)                         │
│         │                     │                                │
│   Execute Callback      Wait for Campaign                      │
│         │                     │                                │
│   Update CallLog        Execute Batch                          │
│                               │                                │
│                         Update CallLog                         │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Key Schema

```typescript
// Global phone concurrency tracking
phone:{phoneId}:active-calls           // SET of sessionIds
phone:{phoneId}:concurrent-limit       // Number (default: 2)
phone:{phoneId}:missed-queue           // ZSET (score = timestamp)

// Missed call metadata
missedcall:{sessionId}:metadata        // HASH {callerId, timestamp, reason}
missedcall:{sessionId}:attempts        // Number
missedcall:{sessionId}:status          // pending | processing | completed | failed

// Campaign-specific
campaign:{campaignId}:missed-calls     // ZSET (score = timestamp)
campaign:{campaignId}:callback-paused  // Boolean (1/0)

// User notifications
user:{userId}:missed-call-count        // Number
user:{userId}:callback-notifications   // LIST
```

### BullMQ Queue Design

```typescript
// New Queue: missedCallCallbacks.queue
{
  name: 'process-missed-call-callback',
  data: {
    sessionId: string,           // Original missed call session
    callerId: string,            // Number that called
    phoneId: string,             // Phone number they called
    agentId: string,             // AI agent to use
    userId: string,              // User who owns the number
    missedAt: Date,              // When call was missed
    attemptNumber: number,       // 1, 2, or 3
    priority: 'high' | 'low',    // high = incoming, low = campaign
    campaignId?: string,         // If from campaign
  },
  opts: {
    attempts: 1,  // Single attempt only - no retries
    priority: priority === 'high' ? 1 : 10,
    removeOnComplete: true,
    removeOnFail: false  // Keep failed jobs for manual review
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Foundation (Days 1-3)

#### Step 1.1: Database Schema Updates
**File**: `backend/src/models/CallLog.ts`

Add new fields to CallLog schema:
```typescript
// Add these fields to ICallLog interface
isMissedCall: boolean;              // Flag for missed calls
missedCallReason: 'busy' | 'no_answer' | 'network_error' | null;
callbackStatus: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'failed' | null;
callbackAttempts: number;           // Number of callback attempts
originalMissedCallId: ObjectId;     // Link to original missed call (for callbacks)
nextCallbackAt: Date;               // Scheduled callback time
isAutoCallback: boolean;            // Distinguish auto vs manual callbacks
```

**File**: `backend/src/models/MissedCallQueue.ts` (NEW)

Create new model for queue management:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IMissedCallQueue extends Document {
  sessionId: string;
  callLogId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  phoneId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  callerNumber: string;
  missedAt: Date;
  reason: 'busy' | 'no_answer' | 'network_error';
  priority: 'high' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'insufficient_credits' | 'on-hold';
  attempts: number;
  maxAttempts: number;              // Always 1 (single attempt only)
  nextAttemptAt: Date;
  campaignId?: mongoose.Types.ObjectId;
  metadata: {
    originalCallDuration?: number;
    callDirection: 'inbound' | 'outbound';
    retryDelayMinutes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MissedCallQueueSchema = new Schema<IMissedCallQueue>({
  sessionId: { type: String, required: true, unique: true },
  callLogId: { type: Schema.Types.ObjectId, ref: 'CallLog', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  phoneId: { type: Schema.Types.ObjectId, ref: 'Phone', required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  callerNumber: { type: String, required: true },
  missedAt: { type: Date, required: true },
  reason: { type: String, enum: ['busy', 'no_answer', 'network_error'], required: true },
  priority: { type: String, enum: ['high', 'low'], default: 'high' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'insufficient_credits', 'on-hold'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 1 },  // Single attempt only - no retries
  nextAttemptAt: { type: Date, required: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  metadata: {
    originalCallDuration: Number,
    callDirection: { type: String, enum: ['inbound', 'outbound'] },
    retryDelayMinutes: { type: Number, default: 0 }  // No retry delay (single attempt only)
  }
}, { timestamps: true });

// Indexes for efficient querying
MissedCallQueueSchema.index({ status: 1, nextAttemptAt: 1 });
MissedCallQueueSchema.index({ phoneId: 1, status: 1 });
MissedCallQueueSchema.index({ userId: 1, status: 1 });
MissedCallQueueSchema.index({ campaignId: 1 });

export default mongoose.model<IMissedCallQueue>('MissedCallQueue', MissedCallQueueSchema);
```

#### Step 1.2: Redis Concurrency Extensions
**File**: `backend/src/utils/phoneNumberConcurrency.util.ts` (NEW)

Create phone-level concurrency tracking (extends existing campaign concurrency):
```typescript
import Redis from 'ioredis';
import { logger } from './logger';

export class PhoneNumberConcurrencyManager {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get current active calls for a phone number
   */
  async getActiveCallsCount(phoneId: string): Promise<number> {
    const key = `phone:${phoneId}:active-calls`;
    return await this.redis.scard(key);
  }

  /**
   * Get concurrent call limit for phone number
   */
  async getConcurrentLimit(phoneId: string): Promise<number> {
    const key = `phone:${phoneId}:concurrent-limit`;
    const limit = await this.redis.get(key);
    return limit ? parseInt(limit) : 2; // Default to 2
  }

  /**
   * Check if slot is available for new call
   */
  async hasAvailableSlot(phoneId: string): Promise<boolean> {
    const activeCount = await this.getActiveCallsCount(phoneId);
    const limit = await this.getConcurrentLimit(phoneId);
    return activeCount < limit;
  }

  /**
   * Acquire slot for new call (atomic operation)
   */
  async acquireSlot(phoneId: string, sessionId: string): Promise<boolean> {
    const luaScript = `
      local phoneKey = KEYS[1]
      local limitKey = KEYS[2]
      local sessionId = ARGV[1]
      local ttl = tonumber(ARGV[2])

      local limit = tonumber(redis.call('GET', limitKey)) or 2
      local current = redis.call('SCARD', phoneKey)

      if current < limit then
        redis.call('SADD', phoneKey, sessionId)
        redis.call('EXPIRE', phoneKey, ttl)
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      2,
      `phone:${phoneId}:active-calls`,
      `phone:${phoneId}:concurrent-limit`,
      sessionId,
      3600 // 1 hour TTL
    );

    return result === 1;
  }

  /**
   * Release slot when call ends
   */
  async releaseSlot(phoneId: string, sessionId: string): Promise<void> {
    const key = `phone:${phoneId}:active-calls`;
    await this.redis.srem(key, sessionId);

    // Trigger callback processor
    await this.triggerCallbackProcessor(phoneId);
  }

  /**
   * Trigger callback processor when slot becomes available
   */
  private async triggerCallbackProcessor(phoneId: string): Promise<void> {
    // Publish event to callback processor
    await this.redis.publish('phone:slot-available', JSON.stringify({
      phoneId,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Add missed call to queue
   */
  async addMissedCall(phoneId: string, sessionId: string, priority: number = Date.now()): Promise<void> {
    const key = `phone:${phoneId}:missed-queue`;
    await this.redis.zadd(key, priority, sessionId);
  }

  /**
   * Get next missed call from queue
   */
  async getNextMissedCall(phoneId: string): Promise<string | null> {
    const key = `phone:${phoneId}:missed-queue`;
    const results = await this.redis.zrange(key, 0, 0);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Remove missed call from queue
   */
  async removeMissedCall(phoneId: string, sessionId: string): Promise<void> {
    const key = `phone:${phoneId}:missed-queue`;
    await this.redis.zrem(key, sessionId);
  }

  /**
   * Get missed call queue size
   */
  async getMissedCallQueueSize(phoneId: string): Promise<number> {
    const key = `phone:${phoneId}:missed-queue`;
    return await this.redis.zcard(key);
  }
}
```

#### Step 1.3: Missed Call Detection Service
**File**: `backend/src/services/missedCallDetection.service.ts` (NEW)

```typescript
import { CallLog } from '../models/CallLog';
import MissedCallQueue from '../models/MissedCallQueue';
import { PhoneNumberConcurrencyManager } from '../utils/phoneNumberConcurrency.util';
import { logger } from '../utils/logger';
import redis from '../config/redis';

export class MissedCallDetectionService {
  private concurrencyManager: PhoneNumberConcurrencyManager;

  constructor() {
    this.concurrencyManager = new PhoneNumberConcurrencyManager(redis);
  }

  /**
   * Check if incoming call should be rejected due to busy channels
   */
  async shouldRejectIncomingCall(phoneId: string): Promise<{
    shouldReject: boolean;
    reason?: 'busy' | 'no_slots_available';
  }> {
    const hasSlot = await this.concurrencyManager.hasAvailableSlot(phoneId);

    if (!hasSlot) {
      logger.warn(`No available slots for phone ${phoneId}`);
      return { shouldReject: true, reason: 'busy' };
    }

    return { shouldReject: false };
  }

  /**
   * Log missed call and add to callback queue
   */
  async logMissedCall(params: {
    callLogId: string;
    phoneId: string;
    agentId: string;
    userId: string;
    callerNumber: string;
    reason: 'busy' | 'no_answer' | 'network_error';
    campaignId?: string;
  }): Promise<void> {
    const { callLogId, phoneId, agentId, userId, callerNumber, reason, campaignId } = params;

    // Update CallLog
    await CallLog.findByIdAndUpdate(callLogId, {
      status: 'failed',
      isMissedCall: true,
      missedCallReason: reason,
      callbackStatus: 'pending',
      callbackAttempts: 0
    });

    // Determine priority (high for incoming, low for campaign)
    const priority = campaignId ? 'low' : 'high';

    // Create queue entry
    const queueEntry = await MissedCallQueue.create({
      sessionId: `callback-${callLogId}-${Date.now()}`,
      callLogId,
      userId,
      phoneId,
      agentId,
      callerNumber,
      missedAt: new Date(),
      reason,
      priority,
      status: 'pending',
      attempts: 0,
      maxAttempts: 1,  // Single attempt only
      nextAttemptAt: new Date(),  // Attempt immediately when slot available
      campaignId,
      metadata: {
        callDirection: 'inbound',
        retryDelayMinutes: 0  // No retry
      }
    });

    // Add to Redis queue
    await this.concurrencyManager.addMissedCall(
      phoneId,
      queueEntry.sessionId,
      priority === 'high' ? Date.now() : Date.now() + 1000000 // Lower priority score for campaign
    );

    logger.info(`Missed call logged: ${queueEntry.sessionId}, priority: ${priority}`);
  }

  /**
   * Handle campaign missed calls (add to batch queue)
   */
  async logCampaignMissedCall(campaignId: string, callLogId: string): Promise<void> {
    // Same as logMissedCall but with campaignId and low priority
    // Will be processed after campaign completion
  }
}

export default new MissedCallDetectionService();
```

---

### Phase 2: Callback Queue Processor (Days 4-6)

#### Step 2.1: BullMQ Queue Setup
**File**: `backend/src/queues/missedCallCallbacks.queue.ts` (NEW)

```typescript
import Queue from 'bull';
import redis from '../config/redis';
import { logger } from '../utils/logger';

export interface MissedCallCallbackJob {
  sessionId: string;
  callLogId: string;
  callerId: string;
  phoneId: string;
  agentId: string;
  userId: string;
  missedAt: Date;
  attemptNumber: number;
  priority: 'high' | 'low';
  campaignId?: string;
}

export const missedCallCallbacksQueue = new Queue<MissedCallCallbackJob>(
  'missed-call-callbacks',
  {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    defaultJobOptions: {
      attempts: 1,  // Single attempt only - no retries
      removeOnComplete: 100,
      removeOnFail: 500,  // Keep failed callbacks for manual review
    },
  }
);

missedCallCallbacksQueue.on('error', (error) => {
  logger.error('Missed call callbacks queue error:', error);
});

missedCallCallbacksQueue.on('completed', (job) => {
  logger.info(`Callback job ${job.id} completed for session ${job.data.sessionId}`);
});

missedCallCallbacksQueue.on('failed', (job, error) => {
  logger.error(`Callback job ${job?.id} failed:`, error);
});

export default missedCallCallbacksQueue;
```

#### Step 2.2: Callback Processor
**File**: `backend/src/processors/missedCallCallbackProcessor.ts` (NEW)

```typescript
import { Job } from 'bull';
import { MissedCallCallbackJob, missedCallCallbacksQueue } from '../queues/missedCallCallbacks.queue';
import MissedCallQueue from '../models/MissedCallQueue';
import { CallLog } from '../models/CallLog';
import { makeOutboundCall } from '../services/outboundCall.service';
import { PhoneNumberConcurrencyManager } from '../utils/phoneNumberConcurrency.util';
import { logger } from '../utils/logger';
import redis from '../config/redis';

export class MissedCallCallbackProcessor {
  private concurrencyManager: PhoneNumberConcurrencyManager;

  constructor() {
    this.concurrencyManager = new PhoneNumberConcurrencyManager(redis);
    this.setupProcessor();
    this.setupSlotListener();
  }

  /**
   * Setup BullMQ processor
   */
  private setupProcessor(): void {
    missedCallCallbacksQueue.process(async (job: Job<MissedCallCallbackJob>) => {
      return await this.processCallback(job);
    });
  }

  /**
   * Setup Redis pub/sub listener for slot availability
   */
  private setupSlotListener(): void {
    const subscriber = redis.duplicate();

    subscriber.subscribe('phone:slot-available', (err) => {
      if (err) {
        logger.error('Failed to subscribe to slot-available channel:', err);
      }
    });

    subscriber.on('message', async (channel, message) => {
      if (channel === 'phone:slot-available') {
        const { phoneId } = JSON.parse(message);
        await this.triggerNextCallback(phoneId);
      }
    });
  }

  /**
   * Trigger next callback when slot becomes available
   */
  private async triggerNextCallback(phoneId: string): Promise<void> {
    try {
      // Check if slot is still available
      const hasSlot = await this.concurrencyManager.hasAvailableSlot(phoneId);
      if (!hasSlot) {
        logger.debug(`No available slot for phone ${phoneId}, skipping callback trigger`);
        return;
      }

      // Get next pending callback
      const nextSessionId = await this.concurrencyManager.getNextMissedCall(phoneId);
      if (!nextSessionId) {
        logger.debug(`No pending callbacks for phone ${phoneId}`);
        return;
      }

      // Get queue entry
      const queueEntry = await MissedCallQueue.findOne({ sessionId: nextSessionId, status: 'pending' });
      if (!queueEntry) {
        logger.warn(`Queue entry not found for session ${nextSessionId}`);
        await this.concurrencyManager.removeMissedCall(phoneId, nextSessionId);
        return;
      }

      // Check if it's time to attempt callback
      if (new Date() < queueEntry.nextAttemptAt) {
        logger.debug(`Too early to callback ${nextSessionId}, scheduled for ${queueEntry.nextAttemptAt}`);
        return;
      }

      // CREDIT CHECK: User must have > 100 credits
      const user = await User.findById(queueEntry.userId).select('credits');
      if (!user || user.credits <= 100) {
        logger.warn(`Insufficient credits for callback ${nextSessionId}. User has ${user?.credits || 0} credits (requires > 100)`);

        // Mark as insufficient credits
        await MissedCallQueue.findOneAndUpdate(
          { sessionId: nextSessionId },
          { status: 'insufficient_credits' }
        );

        // Remove from Redis queue
        await this.concurrencyManager.removeMissedCall(phoneId, nextSessionId);

        // Send notification to admin/user (via WebSocket or email)
        await this.notifyInsufficientCredits(queueEntry.userId.toString(), queueEntry.sessionId);

        // Try next callback in queue
        await this.triggerNextCallback(phoneId);
        return;
      }

      // Add to BullMQ for processing
      await missedCallCallbacksQueue.add(
        {
          sessionId: queueEntry.sessionId,
          callLogId: queueEntry.callLogId.toString(),
          callerId: queueEntry.callerNumber,
          phoneId: queueEntry.phoneId.toString(),
          agentId: queueEntry.agentId.toString(),
          userId: queueEntry.userId.toString(),
          missedAt: queueEntry.missedAt,
          attemptNumber: queueEntry.attempts + 1,
          priority: queueEntry.priority,
          campaignId: queueEntry.campaignId?.toString(),
        },
        {
          priority: queueEntry.priority === 'high' ? 1 : 10,
        }
      );

      logger.info(`Triggered callback job for ${nextSessionId}`);
    } catch (error) {
      logger.error(`Error triggering callback for phone ${phoneId}:`, error);
    }
  }

  /**
   * Process callback job
   */
  private async processCallback(job: Job<MissedCallCallbackJob>): Promise<void> {
    const { sessionId, callLogId, callerId, phoneId, agentId, userId, attemptNumber, priority } = job.data;

    logger.info(`Processing callback attempt ${attemptNumber} for session ${sessionId}`);

    try {
      // Update queue entry status
      await MissedCallQueue.findOneAndUpdate(
        { sessionId },
        { status: 'processing', attempts: attemptNumber }
      );

      // Check slot availability again
      const hasSlot = await this.concurrencyManager.hasAvailableSlot(phoneId);
      if (!hasSlot) {
        logger.warn(`No slot available during callback processing for ${sessionId}, requeueing`);
        throw new Error('No slot available');
      }

      // Make outbound call
      const callResult = await makeOutboundCall({
        userId,
        phoneId,
        agentId,
        toNumber: callerId,
        isAutoCallback: true,
        originalMissedCallId: callLogId,
      });

      // Update original CallLog
      await CallLog.findByIdAndUpdate(callLogId, {
        callbackStatus: 'completed',
        callbackAttempts: attemptNumber,
      });

      // Mark queue entry as completed
      await MissedCallQueue.findOneAndUpdate(
        { sessionId },
        { status: 'completed' }
      );

      // Remove from Redis queue
      await this.concurrencyManager.removeMissedCall(phoneId, sessionId);

      logger.info(`Callback completed successfully for session ${sessionId}`);
    } catch (error) {
      logger.error(`Callback attempt ${attemptNumber} failed for ${sessionId}:`, error);

      const queueEntry = await MissedCallQueue.findOne({ sessionId });

      if (!queueEntry) {
        throw error;
      }

      // Single attempt only - mark as failed immediately
      await MissedCallQueue.findOneAndUpdate(
        { sessionId },
        { status: 'failed' }
      );

      await CallLog.findByIdAndUpdate(callLogId, {
        callbackStatus: 'failed',
        callbackAttempts: attemptNumber,
      });

      await this.concurrencyManager.removeMissedCall(phoneId, sessionId);

      logger.error(`Callback failed for ${sessionId}, no retry (single attempt policy)`);

      throw error; // Rethrow for BullMQ (will not retry due to attempts: 1)
    }
  }

  /**
   * Notify user/admin about insufficient credits
   */
  private async notifyInsufficientCredits(userId: string, sessionId: string): Promise<void> {
    try {
      // Send WebSocket notification to user
      await wsManager.broadcastToUser(userId, {
        type: 'callback:insufficient_credits',
        data: {
          sessionId,
          message: 'Insufficient credits for callback. Please add credits (minimum 100 required).',
          requiredCredits: 100
        }
      });

      // Log for admin monitoring
      logger.warn(`User ${userId} has insufficient credits for callback ${sessionId}`);
    } catch (error) {
      logger.error('Error sending insufficient credits notification:', error);
    }
  }

  /**
   * Periodic scanner for pending callbacks (backup to pub/sub)
   */
  async scanPendingCallbacks(): Promise<void> {
    try {
      const pendingCallbacks = await MissedCallQueue.find({
        status: 'pending',
        nextAttemptAt: { $lte: new Date() }
      }).limit(50);

      for (const callback of pendingCallbacks) {
        const hasSlot = await this.concurrencyManager.hasAvailableSlot(callback.phoneId.toString());

        if (hasSlot) {
          await this.triggerNextCallback(callback.phoneId.toString());
        }
      }
    } catch (error) {
      logger.error('Error scanning pending callbacks:', error);
    }
  }

  /**
   * Retry callbacks marked as insufficient_credits (called after credits are added)
   */
  async retryInsufficientCreditCallbacks(userId: string): Promise<void> {
    try {
      const callbacks = await MissedCallQueue.find({
        userId,
        status: 'insufficient_credits'
      });

      logger.info(`Retrying ${callbacks.length} callbacks for user ${userId} after credit addition`);

      for (const callback of callbacks) {
        // Reset to pending status
        await MissedCallQueue.findByIdAndUpdate(callback._id, {
          status: 'pending',
          nextAttemptAt: new Date() // Retry immediately
        });

        // Re-add to Redis queue
        await this.concurrencyManager.addMissedCall(
          callback.phoneId.toString(),
          callback.sessionId,
          callback.priority === 'high' ? Date.now() : Date.now() + 1000000
        );

        // Trigger callback processing
        await this.triggerNextCallback(callback.phoneId.toString());
      }
    } catch (error) {
      logger.error('Error retrying insufficient credit callbacks:', error);
    }
  }
}

export default new MissedCallCallbackProcessor();
```

#### Step 2.3: Campaign Integration
**File**: `backend/src/services/campaignCallbackIntegration.service.ts` (NEW)

```typescript
import { Campaign } from '../models/Campaign';
import MissedCallQueue from '../models/MissedCallQueue';
import { missedCallCallbacksQueue } from '../queues/missedCallCallbacks.queue';
import { logger } from '../utils/logger';

export class CampaignCallbackIntegrationService {
  /**
   * Pause callbacks while campaign is running
   */
  async pauseCallbacksForCampaign(campaignId: string): Promise<void> {
    logger.info(`Pausing callbacks for campaign ${campaignId}`);

    // Mark all pending callbacks for this campaign as on-hold
    await MissedCallQueue.updateMany(
      { campaignId, status: 'pending' },
      { $set: { status: 'on-hold' } }
    );
  }

  /**
   * Resume callbacks after campaign completion
   */
  async resumeCallbacksForCampaign(campaignId: string): Promise<void> {
    logger.info(`Resuming callbacks for campaign ${campaignId}`);

    // Get all on-hold callbacks for this campaign
    const callbacks = await MissedCallQueue.find({
      campaignId,
      status: 'on-hold'
    });

    // Resume each callback
    for (const callback of callbacks) {
      await MissedCallQueue.findByIdAndUpdate(callback._id, {
        status: 'pending',
        nextAttemptAt: new Date() // Attempt immediately after campaign
      });

      // Add to BullMQ queue
      await missedCallCallbacksQueue.add(
        {
          sessionId: callback.sessionId,
          callLogId: callback.callLogId.toString(),
          callerId: callback.callerNumber,
          phoneId: callback.phoneId.toString(),
          agentId: callback.agentId.toString(),
          userId: callback.userId.toString(),
          missedAt: callback.missedAt,
          attemptNumber: callback.attempts + 1,
          priority: 'low', // Campaign callbacks are low priority
          campaignId: campaignId
        },
        {
          priority: 10, // Lower priority
          delay: 5000 // 5 second delay before starting
        }
      );
    }

    logger.info(`Resumed ${callbacks.length} callbacks for campaign ${campaignId}`);
  }

  /**
   * Hook into campaign lifecycle events
   */
  async onCampaignStatusChange(campaignId: string, newStatus: string): Promise<void> {
    if (newStatus === 'active') {
      await this.pauseCallbacksForCampaign(campaignId);
    } else if (['completed', 'cancelled', 'paused'].includes(newStatus)) {
      await this.resumeCallbacksForCampaign(campaignId);
    }
  }
}

export default new CampaignCallbackIntegrationService();
```

---

### Phase 3: Voice Call Integration (Days 7-9)

#### Step 3.1: Update Exotel Voice Routes
**File**: `backend/src/routes/exotelVoice.routes.ts`

Modify `/voice/connect` endpoint to handle busy channels:

```typescript
// Add at the beginning of the /voice/connect handler
router.all('/connect', async (req, res) => {
  try {
    const { CallFrom, CallTo, CallSid } = req.body;

    // Existing logic to determine direction...
    const isOutbound = Boolean(req.body.CustomField);

    if (!isOutbound) {
      // INCOMING CALL - Check slot availability
      const phone = await Phone.findOne({ exotelNumber: CallTo });

      if (!phone) {
        return res.status(404).send('Phone number not found');
      }

      // CHECK SLOT AVAILABILITY
      const { shouldReject, reason } = await missedCallDetectionService.shouldRejectIncomingCall(
        phone._id.toString()
      );

      if (shouldReject) {
        // LOG MISSED CALL
        const callLog = await CallLog.create({
          sessionId: CallSid,
          phoneId: phone._id,
          agentId: phone.agentId,
          userId: phone.userId,
          direction: 'inbound',
          phoneNumber: CallFrom,
          status: 'failed',
          isMissedCall: true,
          missedCallReason: reason,
          callbackStatus: 'pending',
          callbackAttempts: 0,
          createdAt: new Date()
        });

        // ADD TO CALLBACK QUEUE
        await missedCallDetectionService.logMissedCall({
          callLogId: callLog._id.toString(),
          phoneId: phone._id.toString(),
          agentId: phone.agentId.toString(),
          userId: phone.userId.toString(),
          callerNumber: CallFrom,
          reason: reason || 'busy'
        });

        // RETURN BUSY TONE
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say language="en-US">All our lines are currently busy. We will call you back shortly.</Say>
            <Hangup/>
          </Response>
        `);
      }

      // SLOT AVAILABLE - Acquire slot and proceed
      const sessionId = CallSid;
      const acquired = await concurrencyManager.acquireSlot(phone._id.toString(), sessionId);

      if (!acquired) {
        // Race condition - slot taken between check and acquire
        // Handle same as busy
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say language="en-US">All our lines are currently busy. We will call you back shortly.</Say>
            <Hangup/>
          </Response>
        `);
      }
    }

    // ... rest of existing connect logic
  } catch (error) {
    logger.error('Error in /voice/connect:', error);
    res.status(500).send('Internal server error');
  }
});
```

#### Step 3.2: Update Call End Handler
**File**: `backend/src/routes/exotelVoice.routes.ts`

Modify `/voice/end` endpoint to release slots and trigger callbacks:

```typescript
router.post('/end', async (req, res) => {
  const { CallSid } = req.body;

  try {
    const callLog = await CallLog.findOne({ sessionId: CallSid });

    if (!callLog) {
      return res.status(200).send('OK');
    }

    // ... existing end logic (save transcript, update credits, etc.)

    // RELEASE SLOT
    await concurrencyManager.releaseSlot(
      callLog.phoneId.toString(),
      CallSid
    );

    // This will automatically trigger callback processor via pub/sub

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error in /voice/end:', error);
    res.status(500).send('Error');
  }
});
```

#### Step 3.3: Update Outbound Call Service
**File**: `backend/src/services/outboundCall.service.ts`

Add support for auto-callback context:

```typescript
export async function makeOutboundCall(params: {
  userId: string;
  phoneId: string;
  agentId: string;
  toNumber: string;
  isAutoCallback?: boolean;
  originalMissedCallId?: string;
}): Promise<any> {
  const { userId, phoneId, agentId, toNumber, isAutoCallback, originalMissedCallId } = params;

  // Create CallLog
  const callLog = await CallLog.create({
    userId,
    phoneId,
    agentId,
    direction: 'outbound',
    phoneNumber: toNumber,
    status: 'initiated',
    isAutoCallback: isAutoCallback || false,
    originalMissedCallId: originalMissedCallId || null,
    createdAt: new Date()
  });

  // Acquire slot
  const acquired = await concurrencyManager.acquireSlot(phoneId, callLog.sessionId);

  if (!acquired) {
    await CallLog.findByIdAndUpdate(callLog._id, {
      status: 'failed',
      failureReason: 'busy'
    });
    throw new Error('No available slots for outbound call');
  }

  // Make Exotel API call
  const exotelResponse = await axios.post(
    `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`,
    {
      From: phone.exotelNumber,
      To: toNumber,
      CallerId: phone.exotelNumber,
      CustomField: callLog._id.toString(), // Link to CallLog
      // ... other Exotel params
    },
    {
      auth: {
        username: EXOTEL_API_KEY,
        password: EXOTEL_API_TOKEN
      }
    }
  );

  // Update CallLog with Exotel details
  await CallLog.findByIdAndUpdate(callLog._id, {
    sessionId: exotelResponse.data.Call.Sid,
    outboundStatus: 'queued'
  });

  return exotelResponse.data;
}
```

#### Step 3.4: Update AI Agent Prompt for Callbacks
**File**: `backend/src/services/conversationAI.service.ts`

Modify system prompt when call is auto-callback:

```typescript
function buildSystemPrompt(callLog: ICallLog, agent: IAgent): string {
  let basePrompt = agent.systemPrompt;

  // ADD CALLBACK CONTEXT
  if (callLog.isAutoCallback && callLog.originalMissedCallId) {
    const callbackContext = `
IMPORTANT CONTEXT: This is an automatic callback.
The customer called us earlier but we were unable to answer due to high call volume.
You should acknowledge this politely at the beginning of the conversation.

Example opening:
"Hello! I'm calling you back. I see you tried to reach us earlier. I apologize for the wait. How can I assist you today?"

Do NOT make the customer repeat information if they sound frustrated.
Be extra courteous and understanding.
    `;
    basePrompt = callbackContext + '\n\n' + basePrompt;
  }

  return basePrompt;
}
```

#### Step 3.5: Hook Credit Addition to Retry Callbacks
**File**: `backend/src/services/credit.service.ts`

Add hook to retry callbacks when credits are added:

```typescript
// Modify the addCredits function to trigger callback retries
async addCredits(userId, amount, reason, adminId, metadata) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get current balance
    const user = await User.findById(userId).session(session);
    const currentBalance = user.credits || 0;
    const newBalance = currentBalance + amount;

    // Update user credits
    await User.findByIdAndUpdate(
      userId,
      { credits: newBalance },
      { session, new: true }
    );

    // Create transaction record
    await CreditTransaction.create([{
      userId,
      amount,
      balance: newBalance,
      type: 'addition',
      reason,
      adminId,
      metadata
    }], { session });

    await session.commitTransaction();

    // Broadcast WebSocket notification
    await wsManager.broadcastToUser(userId, {
      type: 'credit:added',
      data: { amount, newBalance }
    });

    // IMPORTANT: If new balance > 100, retry any callbacks marked as insufficient_credits
    if (newBalance > 100) {
      // Import callback processor
      const { default: callbackProcessor } = await import('../processors/missedCallCallbackProcessor');
      await callbackProcessor.retryInsufficientCreditCallbacks(userId);

      logger.info(`Triggered callback retry for user ${userId} after credit addition (new balance: ${newBalance})`);
    }

    return { success: true, newBalance };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
}
```

---

### Phase 4: API Endpoints (Days 10-11)

#### Step 4.1: Missed Call Callback API Routes
**File**: `backend/src/routes/missedCallCallbacks.routes.ts` (NEW)

```typescript
import express from 'express';
import { authenticate } from '../middleware/auth';
import MissedCallQueue from '../models/MissedCallQueue';
import { CallLog } from '../models/CallLog';
import { PhoneNumberConcurrencyManager } from '../utils/phoneNumberConcurrency.util';

const router = express.Router();

/**
 * GET /api/v1/callbacks/missed
 * Get all missed call callbacks for user
 */
router.get('/missed', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status, phoneId, limit = 50, offset = 0 } = req.query;

    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    if (phoneId) {
      query.phoneId = phoneId;
    }

    const callbacks = await MissedCallQueue.find(query)
      .populate('phoneId', 'displayName exotelNumber')
      .populate('agentId', 'name')
      .populate('callLogId')
      .sort({ missedAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string));

    const total = await MissedCallQueue.countDocuments(query);

    res.json({
      success: true,
      data: callbacks,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/callbacks/missed/stats
 * Get callback statistics
 */
router.get('/missed/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const stats = await MissedCallQueue.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      'on-hold': 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/callbacks/missed/:id/retry
 * Manually retry a failed callback
 */
router.post('/missed/:id/retry', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const callbackId = req.params.id;

    const callback = await MissedCallQueue.findOne({
      _id: callbackId,
      userId
    });

    if (!callback) {
      return res.status(404).json({ success: false, error: 'Callback not found' });
    }

    if (callback.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Can only retry failed callbacks'
      });
    }

    // Reset callback for retry
    await MissedCallQueue.findByIdAndUpdate(callbackId, {
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date()
    });

    res.json({
      success: true,
      message: 'Callback scheduled for retry'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/callbacks/missed/:id
 * Cancel a pending callback
 */
router.delete('/missed/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const callbackId = req.params.id;

    const callback = await MissedCallQueue.findOne({
      _id: callbackId,
      userId
    });

    if (!callback) {
      return res.status(404).json({ success: false, error: 'Callback not found' });
    }

    if (!['pending', 'on-hold'].includes(callback.status)) {
      return res.status(400).json({
        success: false,
        error: 'Can only cancel pending callbacks'
      });
    }

    // Remove from queue
    await MissedCallQueue.findByIdAndDelete(callbackId);

    // Remove from Redis
    const concurrencyManager = new PhoneNumberConcurrencyManager(redis);
    await concurrencyManager.removeMissedCall(
      callback.phoneId.toString(),
      callback.sessionId
    );

    res.json({
      success: true,
      message: 'Callback cancelled'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

Register routes in main app:
```typescript
// backend/src/app.ts
import missedCallCallbacksRoutes from './routes/missedCallCallbacks.routes';
app.use('/api/v1/callbacks', missedCallCallbacksRoutes);
```

---

### Phase 5: Frontend Implementation (Days 12-15)

#### Step 5.1: Update CallBacks Component
**File**: `src/components/CallBacks.jsx`

Add tab for automatic missed call callbacks:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const CallBacks = () => {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'missed'
  const [missedCallbacks, setMissedCallbacks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch missed call callbacks
  const fetchMissedCallbacks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/v1/callbacks/missed`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMissedCallbacks(response.data.data);
    } catch (error) {
      console.error('Error fetching missed callbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/v1/callbacks/missed/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Retry failed callback
  const handleRetry = async (id) => {
    try {
      await axios.post(
        `${config.apiBaseUrl}/api/v1/callbacks/missed/${id}/retry`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      alert('Callback scheduled for retry');
      fetchMissedCallbacks();
    } catch (error) {
      console.error('Error retrying callback:', error);
      alert('Failed to retry callback');
    }
  };

  // Cancel callback
  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this callback?')) return;

    try {
      await axios.delete(`${config.apiBaseUrl}/api/v1/callbacks/missed/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Callback cancelled');
      fetchMissedCallbacks();
    } catch (error) {
      console.error('Error cancelling callback:', error);
      alert('Failed to cancel callback');
    }
  };

  useEffect(() => {
    if (activeTab === 'missed') {
      fetchMissedCallbacks();
      fetchStats();
    }
  }, [activeTab]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (activeTab === 'missed') {
      const interval = setInterval(() => {
        fetchMissedCallbacks();
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Call Backs</h2>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${activeTab === 'manual' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Follow-ups
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'missed' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('missed')}
        >
          Missed Call Callbacks
          {stats.pending > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {stats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Manual Follow-ups Tab */}
      {activeTab === 'manual' && (
        <div>
          {/* Existing manual follow-up code */}
        </div>
      )}

      {/* Missed Call Callbacks Tab */}
      {activeTab === 'missed' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.processing || 0}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {/* Callbacks Table */}
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missed At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Attempt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {missedCallbacks.map((callback) => (
                    <tr key={callback._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{callback.callerNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {callback.phoneId?.displayName || callback.phoneId?.exotelNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(callback.missedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                          {callback.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {callback.attempts} / {callback.maxAttempts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          callback.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          callback.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          callback.status === 'completed' ? 'bg-green-100 text-green-800' :
                          callback.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {callback.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {callback.status === 'pending' ? new Date(callback.nextAttemptAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {callback.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(callback._id)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Retry
                          </button>
                        )}
                        {['pending', 'on-hold'].includes(callback.status) && (
                          <button
                            onClick={() => handleCancel(callback._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {missedCallbacks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No missed call callbacks found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallBacks;
```

#### Step 5.2: WebSocket Notifications
**File**: `src/hooks/useMissedCallNotifications.js` (NEW)

```javascript
import { useEffect, useState } from 'react';
import config from '../config';

export const useMissedCallNotifications = (userId, token) => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!userId || !token) return;

    const wsUrl = `${config.wsBaseUrl}/ws/dashboard?userId=${userId}&token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for missed call notifications');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'missed-call') {
          // New missed call notification
          setNotifications((prev) => [
            {
              id: data.callbackId,
              message: `Missed call from ${data.callerNumber}. Auto-callback scheduled.`,
              timestamp: new Date(),
              type: 'missed-call'
            },
            ...prev
          ]);

          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Missed Call', {
              body: `Call from ${data.callerNumber} will be automatically returned.`,
              icon: '/logo.png'
            });
          }
        } else if (data.type === 'callback-completed') {
          // Callback completed notification
          setNotifications((prev) => [
            {
              id: data.callbackId,
              message: `Callback to ${data.callerNumber} completed successfully.`,
              timestamp: new Date(),
              type: 'callback-completed'
            },
            ...prev
          ]);
        } else if (data.type === 'callback-failed') {
          // Callback failed notification
          setNotifications((prev) => [
            {
              id: data.callbackId,
              message: `Callback to ${data.callerNumber} failed. Retrying...`,
              timestamp: new Date(),
              type: 'callback-failed'
            },
            ...prev
          ]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [userId, token]);

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, clearNotification };
};
```

#### Step 5.3: Dashboard Overview Updates
**File**: `src/components/DashboardOverview.jsx`

Add missed call callback stats to dashboard:

```jsx
import { useMissedCallNotifications } from '../hooks/useMissedCallNotifications';

const DashboardOverview = () => {
  // ... existing code

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const { notifications, clearNotification } = useMissedCallNotifications(userId, token);

  const [callbackStats, setCallbackStats] = useState({});

  useEffect(() => {
    fetchCallbackStats();
  }, []);

  const fetchCallbackStats = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/v1/callbacks/missed/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCallbackStats(response.data.data);
    } catch (error) {
      console.error('Error fetching callback stats:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 flex justify-between items-center"
            >
              <span className="text-blue-800">{notification.message}</span>
              <button
                onClick={() => clearNotification(notification.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Existing stats cards... */}

        {/* Missed Call Callbacks Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Callbacks</h3>
          <p className="text-3xl font-bold text-yellow-600">{callbackStats.pending || 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            {callbackStats.processing || 0} processing
          </p>
        </div>
      </div>

      {/* ... rest of dashboard */}
    </div>
  );
};
```

---

### Phase 6: Testing & Validation (Days 16-18)

#### Step 6.1: Unit Tests
**File**: `backend/tests/missedCallCallbacks.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import MissedCallQueue from '../src/models/MissedCallQueue';
import { PhoneNumberConcurrencyManager } from '../src/utils/phoneNumberConcurrency.util';
import redis from '../src/config/redis';

describe('Missed Call Callback System', () => {
  let concurrencyManager: PhoneNumberConcurrencyManager;

  beforeAll(() => {
    concurrencyManager = new PhoneNumberConcurrencyManager(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('Phone Number Concurrency', () => {
    it('should correctly track active calls', async () => {
      const phoneId = 'test-phone-123';
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      // Acquire first slot
      const acquired1 = await concurrencyManager.acquireSlot(phoneId, sessionId1);
      expect(acquired1).toBe(true);

      // Check active count
      const count1 = await concurrencyManager.getActiveCallsCount(phoneId);
      expect(count1).toBe(1);

      // Acquire second slot
      const acquired2 = await concurrencyManager.acquireSlot(phoneId, sessionId2);
      expect(acquired2).toBe(true);

      const count2 = await concurrencyManager.getActiveCallsCount(phoneId);
      expect(count2).toBe(2);

      // Try to acquire third slot (should fail)
      const acquired3 = await concurrencyManager.acquireSlot(phoneId, 'session-3');
      expect(acquired3).toBe(false);

      // Release slots
      await concurrencyManager.releaseSlot(phoneId, sessionId1);
      await concurrencyManager.releaseSlot(phoneId, sessionId2);
    });

    it('should manage missed call queue correctly', async () => {
      const phoneId = 'test-phone-456';

      // Add missed calls
      await concurrencyManager.addMissedCall(phoneId, 'missed-1', Date.now());
      await concurrencyManager.addMissedCall(phoneId, 'missed-2', Date.now() + 1000);

      // Get queue size
      const size = await concurrencyManager.getMissedCallQueueSize(phoneId);
      expect(size).toBe(2);

      // Get next missed call
      const next = await concurrencyManager.getNextMissedCall(phoneId);
      expect(next).toBe('missed-1');

      // Remove from queue
      await concurrencyManager.removeMissedCall(phoneId, 'missed-1');
      const newSize = await concurrencyManager.getMissedCallQueueSize(phoneId);
      expect(newSize).toBe(1);
    });
  });

  describe('MissedCallQueue Model', () => {
    it('should create missed call queue entry', async () => {
      const entry = await MissedCallQueue.create({
        sessionId: 'test-session-123',
        callLogId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        phoneId: '507f1f77bcf86cd799439013',
        agentId: '507f1f77bcf86cd799439014',
        callerNumber: '+919876543210',
        missedAt: new Date(),
        reason: 'busy',
        priority: 'high',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        nextAttemptAt: new Date(Date.now() + 300000),
        metadata: {
          callDirection: 'inbound',
          retryDelayMinutes: 5
        }
      });

      expect(entry.sessionId).toBe('test-session-123');
      expect(entry.priority).toBe('high');
      expect(entry.status).toBe('pending');

      // Cleanup
      await MissedCallQueue.deleteOne({ _id: entry._id });
    });
  });
});
```

#### Step 6.2: Integration Tests
**File**: `backend/tests/integration/callbackFlow.test.ts` (NEW)

Test complete callback flow:
1. Incoming call rejected (channels busy)
2. Missed call logged
3. Channel becomes available
4. Callback triggered
5. Callback completed

#### Step 6.3: Load Testing
Test concurrent callback processing under high load:
- 100 missed calls in queue
- 10 phone numbers with callbacks
- Verify no race conditions in slot acquisition

---

### Phase 7: Deployment (Days 19-20)

#### Step 7.1: Environment Variables
Add to `.env`:
```bash
# Missed Call Callbacks
CALLBACK_MAX_ATTEMPTS=1  # Single attempt only - no retries
CALLBACK_QUEUE_SCAN_INTERVAL=60  # seconds
CALLBACK_MIN_CREDITS_REQUIRED=100  # Minimum credits required for callback
```

#### Step 7.2: Database Migrations
Run migration script to add new fields to existing CallLogs:
```typescript
// migrations/add-callback-fields.ts
import { CallLog } from '../models/CallLog';

async function migrate() {
  await CallLog.updateMany(
    { isMissedCall: { $exists: false } },
    {
      $set: {
        isMissedCall: false,
        missedCallReason: null,
        callbackStatus: null,
        callbackAttempts: 0,
        isAutoCallback: false,
        originalMissedCallId: null,
        nextCallbackAt: null
      }
    }
  );
  console.log('Migration completed');
}

migrate();
```

#### Step 7.3: Monitoring & Alerts
Setup monitoring for:
- Callback success/failure rates
- Queue size (alert if > 50 pending)
- Slot acquisition failures
- Retry exhaustion rate

---

## DATABASE SCHEMA CHANGES

### CallLog Model Updates
```typescript
// Add to existing CallLog schema
{
  // ... existing fields

  // NEW FIELDS
  isMissedCall: { type: Boolean, default: false },
  missedCallReason: {
    type: String,
    enum: ['busy', 'no_answer', 'network_error'],
    default: null
  },
  callbackStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'failed'],
    default: null
  },
  callbackAttempts: { type: Number, default: 0 },
  originalMissedCallId: {
    type: Schema.Types.ObjectId,
    ref: 'CallLog',
    default: null
  },
  nextCallbackAt: { type: Date, default: null },
  isAutoCallback: { type: Boolean, default: false }
}
```

### MissedCallQueue Model (NEW)
See Phase 1, Step 1.1 for complete schema.

---

## TESTING STRATEGY

### Test Scenarios

#### Scenario 1: Incoming Call Rejected (Channels Busy)
```
Given: 2 active incoming calls on phone number
When: 3rd incoming call arrives
Then:
  - Call is rejected with busy message
  - Missed call logged in CallLog
  - Entry added to MissedCallQueue with priority 'high'
  - Entry added to Redis missed call queue
```

#### Scenario 2: Auto-Callback After Channel Frees
```
Given: Missed call in queue (pending)
When: Active call ends (channel freed)
Then:
  - Redis pub/sub event triggered
  - Callback processor picks up next missed call
  - Outbound call initiated to missed caller
  - Queue entry status updated to 'processing'
```

#### Scenario 3: Campaign Missed Calls
```
Given: Campaign running with 2 concurrent calls
And: 3 incoming calls attempt to connect
When: All 3 calls rejected (channels busy)
Then:
  - All 3 logged as missed with priority 'low'
  - Callbacks marked as 'on-hold' (campaign active)
When: Campaign completes
Then:
  - All 3 callbacks status changed to 'pending'
  - Callbacks processed in FIFO order
```

#### Scenario 4: Single Attempt Policy (No Retry)
```
Given: Callback attempt failed (no answer or busy)
When: Callback fails
Then:
  - Queue entry status changed to 'failed'
  - CallLog.callbackStatus set to 'failed'
  - Entry removed from Redis queue
  - No retry scheduled (single attempt policy)
  - Admin can manually retry via dashboard if needed
```

#### Scenario 5: Insufficient Credits
```
Given: Missed call in queue (pending)
And: User has 50 credits (< 100 minimum required)
When: Callback processor attempts to process callback
Then:
  - Credit check fails (credits <= 100)
  - Queue entry status changed to 'insufficient_credits'
  - Entry removed from Redis queue
  - WebSocket notification sent to user
  - Admin log entry created

When: Admin adds 200 credits to user
Then:
  - Credit service detects new balance > 100
  - All 'insufficient_credits' callbacks for user retrieved
  - Callbacks reset to 'pending' status
  - Callbacks re-added to Redis queue
  - Callback processor triggered
  - Callbacks processed successfully
```

---

## DEPLOYMENT & ROLLOUT

### Pre-Deployment Checklist
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Redis keys documented
- [ ] BullMQ queue registered
- [ ] WebSocket events tested
- [ ] Frontend components tested
- [ ] API endpoints tested
- [ ] Load testing completed

### Rollout Plan
1. **Stage 1**: Deploy to staging environment
2. **Stage 2**: Enable for 10% of users (feature flag)
3. **Stage 3**: Monitor for 48 hours
4. **Stage 4**: Enable for 50% of users
5. **Stage 5**: Monitor for 7 days
6. **Stage 6**: Full rollout (100%)

### Rollback Plan
If issues detected:
1. Disable callback processor
2. Mark all pending callbacks as 'paused'
3. Revert backend code
4. Keep missed call logging (view-only mode)

---

## KEY METRICS TO TRACK

### Success Metrics
- **Callback Success Rate**: % of callbacks that successfully connected (first attempt)
- **Average Callback Delay**: Time between missed call and callback attempt
- **Failure Rate**: % of callbacks that failed on first attempt
- **Queue Size**: Number of pending callbacks at any time

### Alert Thresholds
- Queue size > 50: Warning
- Queue size > 100: Critical
- Callback success rate < 60%: Warning (single attempt, so lower threshold expected)
- Average callback delay > 5 minutes: Warning
- Insufficient credit callbacks > 10: Warning

---

## FUTURE ENHANCEMENTS

### Phase 2 Features (Future)
1. **Smart Scheduling**: ML-based optimal callback timing
2. **Priority Scoring**: Callback priority based on customer value
3. **Voice Message**: Leave voicemail if callback fails
4. **SMS Notification**: Send SMS before callback attempt
5. **Callback Preferences**: Allow customers to set preferred callback times

---

## CONCLUSION

This implementation plan provides a complete, production-ready automatic callback system that:

### Core Features
- Handles missed calls from both incoming and campaign scenarios
- Prioritizes incoming missed calls over campaign callbacks
- **Single attempt policy** - No automatic retries (manual retry via dashboard)
- Integrates seamlessly with existing Redis concurrency system
- Provides real-time dashboard updates via WebSocket
- Includes comprehensive failure handling and notifications
- Scales to handle high call volumes
- Maintains backward compatibility with existing code

### System Configuration Understanding
The plan is built on comprehensive analysis of your existing system:
- **User-Agent-Phone Hierarchy**: Properly maps the relationship chain
  - User owns Phone(s)
  - Phone has assigned Agent
  - Agent is created by User
- **Credit System**: Integrates with existing credit deduction/addition flow
  - Credits stored in User.credits
  - 1 credit = 1 second of call duration
  - Automatic deduction after call completion
  - Manual addition by admin triggers callback retry

### Credit Check Requirement (NEW)
**IMPORTANT**: Callbacks will ONLY be attempted if user has **credits > 100**

**Implementation Details**:
1. Before processing any callback, system checks user's credit balance
2. If credits <= 100:
   - Callback marked as 'insufficient_credits'
   - User notified via WebSocket
   - Admin receives log notification
   - Callback removed from active queue
3. When admin adds credits (and balance > 100):
   - All 'insufficient_credits' callbacks automatically retried
   - Callbacks reset to 'pending' status
   - Processing resumes immediately

**Benefits**:
- Prevents callbacks when user can't afford the call duration
- Automatic retry when credits are replenished (only for 'insufficient_credits' status)
- Clear visibility into credit-related callback failures
- No manual intervention needed after credit addition

### Single Attempt Policy (No Retries)
**IMPORTANT**: Each missed call gets **only 1 callback attempt**

**Implementation Details**:
1. When callback fails (no answer, busy, network error):
   - Marked as 'failed' immediately
   - No automatic retry scheduled
   - Admin can manually retry via dashboard if needed
2. Benefits:
   - Prevents multiple unwanted callback attempts
   - Reduces credit consumption
   - Gives user control over when to retry
   - Cleaner queue management

### New Database Fields & Models
1. **CallLog Model**: 7 new fields for callback tracking
2. **MissedCallQueue Model**: Complete new model for queue management
3. **Status Types**: 6 statuses including 'insufficient_credits' and 'on-hold'

### New Backend Components
1. PhoneNumberConcurrencyManager (Redis-based)
2. MissedCallDetectionService
3. MissedCallCallbackProcessor (BullMQ + Redis Pub/Sub)
4. CampaignCallbackIntegrationService
5. Credit service hook for auto-retry

### New Frontend Features
1. Missed call callback dashboard tab
2. Real-time WebSocket notifications
3. Insufficient credit alerts
4. Manual retry/cancel actions
5. Stats visualization (pending/processing/completed/failed/insufficient_credits)

**Estimated Implementation Time**: 20 days (4 weeks)

**Team Requirements**:
- 1 Backend Developer (15 days)
- 1 Frontend Developer (5 days)
- 1 QA Engineer (5 days, parallel)

**Dependencies**:
- Redis running and accessible
- BullMQ workers configured
- Exotel API integration working
- WebSocket server operational
- User credit system functional

**Configuration Requirements**:
- `CALLBACK_MIN_CREDITS_REQUIRED=100` in .env
- Credit check integrated into callback processor
- Credit service modified to trigger callback retry on addition

---

## SUMMARY OF YOUR REQUIREMENTS

✅ **User-Agent-Phone Configuration**: Fully analyzed and integrated
- Phone assigned to User (Phone.userId = userId)
- Agent assigned to Phone (Phone.agentId = agentId)
- Agent owned by User (Agent.userId = userId)
- Callbacks use same userId/phoneId/agentId from original missed call

✅ **Credit Check Requirement**: Fully implemented
- Minimum credit requirement: **> 100 credits**
- Check performed BEFORE callback attempt
- Automatic retry when credits added
- Clear status tracking ('insufficient_credits')
- WebSocket notifications for transparency

✅ **Two Callback Scenarios**: Both handled with single attempt
- **Incoming missed calls**: HIGH priority, immediate callback when slot frees (1 attempt)
- **Campaign missed calls**: LOW priority, batch callback after campaign ends (1 attempt)
- **No automatic retries**: Failed callbacks require manual retry via dashboard

✅ **Concurrency Management**: Extends existing system
- Leverages your existing Redis-based campaign concurrency
- Adds phone-level concurrency tracking
- Proper slot acquisition/release with atomic operations

✅ **Complete Integration**: Production-ready
- Seamless integration with existing Exotel voice routes
- Credit system integration (deduction + addition hooks)
- WebSocket real-time updates
- Dashboard UI components
- Comprehensive testing strategy

---

**End of Implementation Plan**
