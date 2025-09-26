import { mutation, query, type MutationCtx, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

const DEFAULT_PRIORITY = 100
const DEFAULT_LEASE_MS = 5 * 60 * 1000
const MAX_LEASE_MS = 30 * 60 * 1000

export type JobStatus = 'pending' | 'in_progress' | 'succeeded' | 'failed'

export interface EnqueueJobInput {
  type: string
  userId?: string
  videoId?: string
  fileId?: string
  priority?: number
  payload?: Record<string, unknown>
  dedupeKey?: string
  scheduledFor?: string
  maxAttempts?: number
}

export interface LeaseNextArgs {
  types?: string[]
  leaseMs?: number
  includeScheduled?: boolean
  limit?: number
  userId?: string
}

export interface JobRecord {
  _id: string
  type: string
  status: JobStatus
  priority: number
  userId?: string
  videoId?: string
  fileId?: string
  payload?: Record<string, unknown>
  attempts: number
  maxAttempts?: number
  scheduledFor?: string
  leaseExpiresAt?: string
  dedupeKey?: string
  lastError?: string
  result?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export async function enqueueJobInternal(
  ctx: MutationCtx,
  {
    type,
    userId,
    videoId,
    fileId,
    priority,
    payload,
    dedupeKey,
    scheduledFor,
    maxAttempts,
  }: EnqueueJobInput,
) {
  if (dedupeKey) {
    const duplicate = await ctx.db
      .query('jobs')
      .withIndex('by_dedupe', (q) => q.eq('dedupeKey', dedupeKey))
      .first()

    if (duplicate && duplicate.status !== 'failed') {
      return duplicate._id
    }
  }

  const nowIso = new Date().toISOString()
  const document = {
    type,
    status: 'pending' as JobStatus,
    priority: priority ?? DEFAULT_PRIORITY,
    userId,
    videoId,
    fileId,
    payload,
    attempts: 0,
    maxAttempts: maxAttempts ?? 5,
    scheduledFor,
    leaseExpiresAt: undefined,
    dedupeKey,
    lastError: undefined,
    result: undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  return ctx.db.insert('jobs', document)
}

export const enqueue = mutation({
  args: {
    type: v.string(),
    userId: v.optional(v.string()),
    videoId: v.optional(v.string()),
    fileId: v.optional(v.string()),
    priority: v.optional(v.number()),
    payload: v.optional(v.any()),
    dedupeKey: v.optional(v.string()),
    scheduledFor: v.optional(v.string()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const jobId = await enqueueJobInternal(ctx, args)
    return { jobId }
  },
})

export const leaseNext = mutation({
  args: {
    types: v.optional(v.array(v.string())),
    leaseMs: v.optional(v.number()),
    includeScheduled: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const leaseMs = Math.min(args.leaseMs ?? DEFAULT_LEASE_MS, MAX_LEASE_MS)
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50))

    const candidates = await ctx.db
      .query('jobs')
      .withIndex('by_status_priority', (q) => q.eq('status', 'pending'))
      .order('asc')
      .take(limit)

    const types = args.types?.length ? new Set(args.types) : null
    const includeScheduled = args.includeScheduled ?? false

    const job = candidates.find((candidate) => {
      if (types && !types.has(candidate.type)) {
        return false
      }

      if (args.userId && candidate.userId !== args.userId) {
        return false
      }

      if (!includeScheduled && candidate.scheduledFor) {
        return candidate.scheduledFor <= nowIso
      }

      if (candidate.scheduledFor && candidate.scheduledFor > nowIso) {
        return false
      }

      return true
    })

    if (!job) {
      return null
    }

    const leaseExpiresAt = new Date(now + leaseMs).toISOString()

    await ctx.db.patch(job._id, {
      status: 'in_progress',
      leaseExpiresAt,
      attempts: job.attempts + 1,
      updatedAt: nowIso,
    })

    return {
      _id: job._id,
      type: job.type,
      userId: job.userId,
      videoId: job.videoId,
      fileId: job.fileId,
      payload: job.payload,
      attempts: job.attempts + 1,
      maxAttempts: job.maxAttempts,
      leaseExpiresAt,
      priority: job.priority,
    }
  },
})

export const complete = mutation({
  args: {
    jobId: v.id('jobs'),
    result: v.optional(v.any()),
  },
  handler: async (ctx, { jobId, result }) => {
    const nowIso = new Date().toISOString()
    await ctx.db.patch(jobId, {
      status: 'succeeded',
      leaseExpiresAt: undefined,
      result,
      updatedAt: nowIso,
      lastError: undefined,
    })
  },
})

export const fail = mutation({
  args: {
    jobId: v.id('jobs'),
    error: v.string(),
    retryBackoffMs: v.optional(v.number()),
    allowRetry: v.optional(v.boolean()),
  },
  handler: async (ctx, { jobId, error, retryBackoffMs, allowRetry }) => {
    const job = await ctx.db.get(jobId)
    if (!job) {
      throw new Error('JOB_NOT_FOUND')
    }

    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const attempts = job.attempts
    const maxAttempts = job.maxAttempts ?? 5
    const shouldRetry = allowRetry ?? attempts < maxAttempts

    if (shouldRetry) {
      const backoffMs = Math.min(retryBackoffMs ?? Math.pow(2, attempts) * 1000, MAX_LEASE_MS)
      const scheduledFor = new Date(now + backoffMs).toISOString()
      await ctx.db.patch(jobId, {
        status: 'pending',
        leaseExpiresAt: undefined,
        scheduledFor,
        lastError: error,
        updatedAt: nowIso,
      })
      return { scheduledFor }
    }

    await ctx.db.patch(jobId, {
      status: 'failed',
      leaseExpiresAt: undefined,
      lastError: error,
      updatedAt: nowIso,
    })

    return { status: 'failed' as const }
  },
})

export const heartbeat = mutation({
  args: {
    jobId: v.id('jobs'),
    extendByMs: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, extendByMs }) => {
    const job = await ctx.db.get(jobId)
    if (!job) {
      throw new Error('JOB_NOT_FOUND')
    }

    if (job.status !== 'in_progress') {
      throw new Error('JOB_NOT_IN_PROGRESS')
    }

    const extendMs = Math.min(extendByMs ?? DEFAULT_LEASE_MS, MAX_LEASE_MS)
    const currentLease = job.leaseExpiresAt ? new Date(job.leaseExpiresAt).getTime() : Date.now()
    const leaseExpiresAt = new Date(currentLease + extendMs).toISOString()

    await ctx.db.patch(jobId, {
      leaseExpiresAt,
      updatedAt: new Date().toISOString(),
    })

    return { leaseExpiresAt }
  },
})

export const release = mutation({
  args: {
    jobId: v.id('jobs'),
    reason: v.optional(v.string()),
    rescheduleFor: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, reason, rescheduleFor }) => {
    const job = await ctx.db.get(jobId)
    if (!job) {
      throw new Error('JOB_NOT_FOUND')
    }

    if (job.status !== 'in_progress') {
      return
    }

    await ctx.db.patch(jobId, {
      status: 'pending',
      leaseExpiresAt: undefined,
      scheduledFor: rescheduleFor,
      updatedAt: new Date().toISOString(),
      lastError: reason ?? job.lastError,
    })
  },
})

export const releaseExpiredLeases = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const nowIso = new Date().toISOString()
    const limitValue = Math.max(1, Math.min(limit ?? 50, 200))

    const expired = await ctx.db
      .query('jobs')
      .withIndex('by_lease')
      .filter((q) => q.lt(q.field('leaseExpiresAt'), nowIso))
      .take(limitValue)

    for (const job of expired) {
      if (job.status !== 'in_progress') {
        continue
      }

      await ctx.db.patch(job._id, {
        status: 'pending',
        leaseExpiresAt: undefined,
        updatedAt: nowIso,
        scheduledFor: job.scheduledFor ?? nowIso,
      })
    }

    return { released: expired.length }
  },
})

export const stats = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, { type }) => {
    const pending = await ctx.db
      .query('jobs')
      .withIndex('by_status_priority', (q) => q.eq('status', 'pending'))
      .collect()

    const inProgress = await ctx.db
      .query('jobs')
      .withIndex('by_status_priority', (q) => q.eq('status', 'in_progress'))
      .collect()

    const filterByType = (job: any) => (!type ? true : job.type === type)

    return {
      pending: pending.filter(filterByType).length,
      inProgress: inProgress.filter(filterByType).length,
    }
  },
})

// Internal functions for cron jobs

export const processJobQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This function will be called by the cron job
    // It should process pending jobs by calling external worker APIs
    // For now, we'll just log that it was called
    
    const pendingJobs = await ctx.db
      .query('jobs')
      .withIndex('by_status_priority', (q) => q.eq('status', 'pending'))
      .take(10)
    
    console.log(`Cron job processing: ${pendingJobs.length} pending jobs`)
    
    // In a real implementation, you would:
    // 1. Call your worker service to process jobs
    // 2. Or implement job processing logic here
    // 3. Update job statuses accordingly
    
    return { processed: pendingJobs.length }
  },
})

export const cleanupOldJobs = internalMutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, { olderThanDays = 7 }) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffIso = cutoffDate.toISOString()
    
    const oldJobs = await ctx.db
      .query('jobs')
      .withIndex('by_status_priority', (q) => q.eq('status', 'succeeded'))
      .filter((q) => q.lt(q.field('updatedAt'), cutoffIso))
      .collect()
    
    let deleted = 0
    for (const job of oldJobs) {
      await ctx.db.delete(job._id)
      deleted++
    }
    
    console.log(`Cleaned up ${deleted} old completed jobs`)
    return { deleted }
  },
})
