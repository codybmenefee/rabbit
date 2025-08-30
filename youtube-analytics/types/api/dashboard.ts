import { z } from 'zod'

export const DashboardStatus = z.object({
  hasData: z.boolean(),
  lastUpdated: z.string().datetime().optional(),
})
export type DashboardStatus = z.infer<typeof DashboardStatus>

export const TopChannel = z.object({
  channelId: z.string(),
  name: z.string().nullable(),
  minutes: z.number(),
  rank: z.number(),
})

export const SeriesPoint = z.object({
  date: z.string(),
  minutes: z.number(),
})

export const DashboardSummary = z.object({
  period: z.string(),
  kpis: z.object({
    minutesWatched: z.number(),
    videos: z.number(),
    uniqueChannels: z.number(),
  }),
  series: z.array(SeriesPoint),
  topChannels: z.array(TopChannel),
})
export type DashboardSummary = z.infer<typeof DashboardSummary>

