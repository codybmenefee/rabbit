import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Process jobs every 30 seconds for faster response
crons.interval(
  'process jobs',
  { seconds: 30 },
  internal.jobs.processJobQueue
)

// Clean up expired leases every 5 minutes
crons.interval(
  'cleanup expired leases',
  { minutes: 5 },
  internal.jobs.releaseExpiredLeases,
  {}
)

// Clean up old completed jobs every hour
crons.interval(
  'cleanup old jobs',
  { hours: 1 },
  internal.jobs.cleanupOldJobs,
  {}
)

export default crons
