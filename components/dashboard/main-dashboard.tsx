'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WatchRecord } from '@/types/records'
import { computeSessionAnalysis } from '@/lib/advanced-analytics'
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
  subYears
} from 'date-fns'
import { ArrowDownRight, ArrowUpRight, Upload } from 'lucide-react'

const AVERAGE_VIDEO_SECONDS = 300
const PRODUCTIVE_KEYWORDS = [
  'education',
  'technology',
  'science',
  'ai',
  'machine learning',
  'frontend',
  'development',
  'physics',
  'productivity',
  'habit',
  'career',
  'news',
  'finance',
  'health'
]

interface DashboardMetric {
  id: string
  label: string
  value: string
  delta: number
  deltaLabel: string
}

interface CategoryMetric {
  topic: string
  hours: number
  hoursLabel: string
  momDelta: number
  yoyDelta: number
}

interface TopicTrend {
  topic: string
  delta: number
}

interface TopicTimelineBucket {
  key: string
  label: string
  count: number
}

interface TopicTimelineRow {
  topic: string
  buckets: TopicTimelineBucket[]
}

interface CreatorMetric {
  channel: string
  hours: number
  hoursLabel: string
  delta: number
}

interface ProductivitySummary {
  productiveRatio: number
  deltaVsPrevious: number
  breakdown: Array<{ name: 'Productive' | 'Passive'; value: number }>
}

interface TrendPoint {
  key: string
  label: string
  watchTimeHours: number
  videos: number
}

interface DashboardAnalytics {
  periodLabel: string
  metrics: DashboardMetric[]
  trend: TrendPoint[]
  categories: CategoryMetric[]
  topicTrends: TopicTrend[]
  topicTimeline: TopicTimelineRow[]
  timelineLabels: string[]
  topCreators: CreatorMetric[]
  productivity: ProductivitySummary
  totals: {
    totalRecords: number
    startLabel: string
    endLabel: string
  }
}

interface MainDashboardProps {
  data: WatchRecord[]
  onRequestImport?: () => void
}

interface RecordWithDate {
  record: WatchRecord
  date: Date
}

export function MainDashboard({ data, onRequestImport }: MainDashboardProps) {
  const analytics = useMemo(() => computeAnalytics(data), [data])

  if (!analytics) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">No data yet</p>
          <p className="text-sm text-slate-400">
            Upload your Google Takeout history to unlock personalized insights.
          </p>
          <Button onClick={onRequestImport} className="mt-4" size="sm">
            <Upload className="mr-2 h-4 w-4" /> Upload data
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CalloutCard onRequestImport={onRequestImport} totals={analytics.totals} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <PerformanceCard
          periodLabel={analytics.periodLabel}
          metrics={analytics.metrics}
          trend={analytics.trend}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <TopCategoriesCard categories={analytics.categories} />
          <TopTopicsCard topicTrends={analytics.topicTrends} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <TopicsOverTimeCard
          rows={analytics.topicTimeline}
          labels={analytics.timelineLabels}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <TopCreatorsCard creators={analytics.topCreators} />
          <ProductivityCard productivity={analytics.productivity} />
        </div>
      </motion.div>
    </div>
  )
}

function CalloutCard({
  onRequestImport,
  totals
}: {
  onRequestImport?: () => void
  totals: DashboardAnalytics['totals']
}) {
  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-r from-slate-900 via-purple-900/70 to-slate-900 text-slate-100">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/40 to-cyan-400/40 blur-3xl" />
      <CardContent className="relative grid gap-6 p-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-300/80">
            Get your own insights
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Upload your data to generate a personalized report
          </h2>
          <p className="text-sm text-slate-300/90">
            Connect your YouTube history and we&apos;ll surface patterns across creators, topics, and productivity over time.
          </p>
          <div className="flex items-center gap-8 text-xs text-slate-200/70">
            <div>
              <p className="font-semibold text-white">{totals.totalRecords.toLocaleString()} videos</p>
              <p className="text-slate-300/80">Processed so far</p>
            </div>
            <div>
              <p className="font-semibold text-white">{totals.startLabel} → {totals.endLabel}</p>
              <p className="text-slate-300/80">Current coverage</p>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-end">
          <Button
            size="lg"
            onClick={onRequestImport}
            className="bg-white/15 text-white hover:bg-white/25"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload your data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceCard({
  periodLabel,
  metrics,
  trend
}: {
  periodLabel: string
  metrics: DashboardMetric[]
  trend: TrendPoint[]
}) {
  return (
    <Card className="border border-white/5 bg-slate-900/60">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current Period</p>
            <h3 className="text-xl font-semibold text-white">{periodLabel}</h3>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => (
            <div
              key={metric.id}
              className="rounded-xl border border-white/5 bg-slate-950/40 p-4"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
              <DeltaBadge value={metric.delta} label={metric.deltaLabel} className="mt-3" />
            </div>
          ))}
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.9} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 12,
                  color: '#e2e8f0'
                }}
                formatter={(value: unknown, _name, payload) => {
                  const data = payload && typeof payload[0] === 'object' ? payload[0].payload : null
                  if (!data) return value
                  const asNumber = typeof value === 'number' ? value : Number(value)
                  return [`${asNumber.toFixed(1)} hrs`, `${data.videos} videos`]
                }}
              />
              <Bar dataKey="watchTimeHours" radius={[8, 8, 0, 0]} fill="url(#trendGradient)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function TopCategoriesCard({ categories }: { categories: CategoryMetric[] }) {
  const maxHours = Math.max(...categories.map(item => item.hours), 0)

  return (
    <Card className="lg:col-span-2 border border-white/5 bg-slate-900/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">Top Categories</CardTitle>
        <p className="text-sm text-slate-400">With MoM / YoY deltas</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category.topic} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-200">
              <span>{category.topic}</span>
              <span className="font-semibold text-white">{category.hoursLabel}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/80">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400"
                style={{ width: `${maxHours ? (category.hours / maxHours) * 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <DeltaBadge value={category.momDelta} label="MoM" />
              <DeltaBadge value={category.yoyDelta} label="YoY" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TopTopicsCard({ topicTrends }: { topicTrends: TopicTrend[] }) {
  return (
    <Card className="border border-white/5 bg-slate-900/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">Top Topics</CardTitle>
        <p className="text-sm text-slate-400">Trend vs last month</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {topicTrends.map(topic => (
          <div key={topic.topic} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{topic.topic}</p>
            </div>
            <DeltaBadge value={topic.delta} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TopicsOverTimeCard({
  rows,
  labels
}: {
  rows: TopicTimelineRow[]
  labels: string[]
}) {
  const maxValue = Math.max(
    ...rows.flatMap(row => row.buckets.map(bucket => bucket.count)),
    0
  )

  return (
    <Card className="border border-white/5 bg-slate-900/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">Topics Over Time</CardTitle>
        <p className="text-sm text-slate-400">Intensity by week</p>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <div className="min-w-[640px] space-y-3">
          {rows.map(row => (
            <div key={row.topic}>
              <div className="mb-1 text-sm font-medium text-slate-200">{row.topic}</div>
              <div className="grid grid-flow-col auto-cols-[16px] gap-[6px]">
                {row.buckets.map(bucket => (
                  <div
                    key={bucket.key}
                    className="h-8 w-4 rounded-md border border-white/5"
                    style={{
                      backgroundColor: getHeatmapColor(bucket.count, maxValue)
                    }}
                    title={`${row.topic} • ${bucket.label}: ${bucket.count} videos`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-flow-col auto-cols-[16px] gap-[6px] text-[10px] uppercase tracking-[0.3em] text-slate-500">
            {labels.map(label => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TopCreatorsCard({ creators }: { creators: CreatorMetric[] }) {
  return (
    <Card className="border border-white/5 bg-slate-900/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">Top Creators</CardTitle>
        <p className="text-sm text-slate-400">Last 30 days</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {creators.map(creator => (
          <div key={creator.channel} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{creator.channel}</p>
              <p className="text-xs text-slate-400">{creator.hoursLabel} watchtime</p>
            </div>
            <DeltaBadge value={creator.delta} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ProductivityCard({ productivity }: { productivity: ProductivitySummary }) {
  const colors: Record<string, string> = {
    Productive: '#38bdf8',
    Passive: '#a855f7'
  }

  const productiveLabel = `${productivity.productiveRatio.toFixed(0)}% productive`

  return (
    <Card className="border border-white/5 bg-slate-900/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">Productive vs Passive</CardTitle>
        <p className="text-sm text-slate-400">Last 30 days</p>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        <div className="h-40 w-40">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={productivity.breakdown}
                innerRadius={48}
                outerRadius={64}
                paddingAngle={4}
                dataKey="value"
              >
                {productivity.breakdown.map(entry => (
                  <Cell key={entry.name} fill={colors[entry.name]} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-semibold text-white">{productiveLabel}</p>
          <DeltaBadge value={productivity.deltaVsPrevious} label="vs baseline" />
          <div className="space-y-1 text-sm text-slate-300">
            {productivity.breakdown.map(entry => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[entry.name] }}
                />
                <span>{entry.name}</span>
                <span className="text-slate-500">
                  {entry.value} videos
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaBadge({
  value,
  label,
  className
}: {
  value: number
  label?: string
  className?: string
}) {
  const positive = value >= 0
  const formatted = formatPercent(value)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        positive
          ? 'bg-emerald-500/10 text-emerald-300'
          : 'bg-rose-500/10 text-rose-300'
      } ${className ?? ''}`}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>
        {formatted}
        {label ? ` ${label}` : ''}
      </span>
    </span>
  )
}

function computeAnalytics(data: WatchRecord[]): DashboardAnalytics | null {
  const datedRecords: RecordWithDate[] = data.reduce<RecordWithDate[]>((acc, record) => {
    const recordDate = resolveRecordDate(record)
    if (recordDate) {
      acc.push({ record, date: recordDate })
    }
    return acc
  }, [])

  if (datedRecords.length === 0) {
    return null
  }

  const sorted = [...datedRecords].sort((a, b) => a.date.getTime() - b.date.getTime())
  const periodEnd = endOfDay(sorted[sorted.length - 1].date)
  const periodStart = startOfDay(subDays(periodEnd, 29))

  const current = filterByRange(sorted, periodStart, periodEnd)
  const previousEnd = startOfDay(subDays(periodStart, 1))
  const previousStart = startOfDay(subDays(previousEnd, 29))
  const previous = filterByRange(sorted, previousStart, previousEnd)

  const yoyStart = startOfDay(subYears(periodStart, 1))
  const yoyEnd = endOfDay(subYears(periodEnd, 1))
  const yoy = filterByRange(sorted, yoyStart, yoyEnd)

  const watchTimeHours = hoursFromCount(current.length)
  const watchTimePrev = hoursFromCount(previous.length)
  const watchTimeYoy = hoursFromCount(yoy.length)

  const sessionsCurrent = safeSessionCount(current.map(item => item.record))
  const sessionsPrev = safeSessionCount(previous.map(item => item.record))

  const productiveCurrent = current.filter(({ record }) => isProductive(record)).length
  const productivePrevious = previous.filter(({ record }) => isProductive(record)).length
  const productiveRatio = current.length ? (productiveCurrent / current.length) * 100 : 0
  const prevRatio = previous.length ? (productivePrevious / previous.length) * 100 : 0

  const topicMetrics = buildTopicMetrics(current, previous, yoy)
  const creators = buildCreatorMetrics(current, previous)
  const trend = buildTrend(current, periodEnd)
  const timeline = buildTopicTimeline(sorted, topicMetrics.topicsForTimeline, periodEnd)

  return {
    periodLabel: `${format(periodStart, 'MMM d')} → ${format(periodEnd, 'MMM d')}`,
    metrics: [
      {
        id: 'watchtime',
        label: 'Watchtime',
        value: formatHours(watchTimeHours),
        delta: percentageChange(watchTimeHours, watchTimePrev),
        deltaLabel: `${formatPercent(percentageChange(watchTimeHours, watchTimePrev))} MoM`
      },
      {
        id: 'yoy',
        label: 'Year over year',
        value: formatPercent(percentageChange(watchTimeHours, watchTimeYoy)),
        delta: percentageChange(watchTimeHours, watchTimeYoy),
        deltaLabel: `${formatPercent(percentageChange(watchTimeHours, watchTimeYoy))} YoY`
      },
      {
        id: 'productive',
        label: 'Productive',
        value: `${productiveRatio.toFixed(0)}%`,
        delta: productiveRatio - prevRatio,
        deltaLabel: `${formatPercent(productiveRatio - prevRatio)} vs baseline`
      },
      {
        id: 'sessions',
        label: 'Sessions',
        value: sessionsCurrent.toLocaleString(),
        delta: percentageChange(sessionsCurrent, sessionsPrev),
        deltaLabel: `${formatPercent(percentageChange(sessionsCurrent, sessionsPrev))} MoM`
      }
    ],
    trend,
    categories: topicMetrics.categories,
    topicTrends: topicMetrics.topicTrends,
    topicTimeline: timeline.rows,
    timelineLabels: timeline.labels,
    topCreators: creators,
    productivity: {
      productiveRatio,
      deltaVsPrevious: productiveRatio - prevRatio,
      breakdown: [
        { name: 'Productive', value: productiveCurrent },
        { name: 'Passive', value: Math.max(current.length - productiveCurrent, 0) }
      ]
    },
    totals: {
      totalRecords: data.length,
      startLabel: format(sorted[0].date, 'MMM d'),
      endLabel: format(periodEnd, 'MMM d')
    }
  }
}

function buildTrend(records: RecordWithDate[], periodEnd: Date): TrendPoint[] {
  const trendStart = startOfDay(subDays(periodEnd, 13))
  const days = eachDayOfInterval({ start: trendStart, end: periodEnd })
  const counts = new Map<string, number>()

  records.forEach(({ date }) => {
    const key = format(date, 'yyyy-MM-dd')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return days.map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const count = counts.get(key) ?? 0

    return {
      key,
      label: format(day, 'MMM d'),
      watchTimeHours: hoursFromCount(count),
      videos: count
    }
  })
}

function buildTopicMetrics(
  current: RecordWithDate[],
  previous: RecordWithDate[],
  yoy: RecordWithDate[]
): {
  categories: CategoryMetric[]
  topicTrends: TopicTrend[]
  topicsForTimeline: string[]
} {
  const currentCounts = aggregateTopics(current)
  const previousCounts = aggregateTopics(previous)
  const yoyCounts = aggregateTopics(yoy)

  const sortedTopics = Array.from(currentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const categories = sortedTopics.map(([topic, count]) => {
    const prev = previousCounts.get(topic) ?? 0
    const yoyValue = yoyCounts.get(topic) ?? 0
    return {
      topic,
      hours: hoursFromCount(count),
      hoursLabel: formatHours(hoursFromCount(count)),
      momDelta: percentageChange(count, prev),
      yoyDelta: percentageChange(count, yoyValue),
      barPercentage: 0
    }
  })

  const topicTrends = sortedTopics.map(([topic, count]) => ({
    topic,
    delta: percentageChange(count, previousCounts.get(topic) ?? 0)
  }))

  return {
    categories,
    topicTrends,
    topicsForTimeline: sortedTopics.map(([topic]) => topic)
  }
}

function buildCreatorMetrics(
  current: RecordWithDate[],
  previous: RecordWithDate[]
): CreatorMetric[] {
  const currentCounts = aggregateCreators(current)
  const previousCounts = aggregateCreators(previous)

  return Array.from(currentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([channel, count]) => ({
      channel,
      hours: hoursFromCount(count),
      hoursLabel: formatHours(hoursFromCount(count)),
      delta: percentageChange(count, previousCounts.get(channel) ?? 0)
    }))
}

function buildTopicTimeline(
  records: RecordWithDate[],
  topics: string[],
  periodEnd: Date
): { rows: TopicTimelineRow[]; labels: string[] } {
  if (topics.length === 0) {
    return { rows: [], labels: [] }
  }

  const weeks = eachWeekOfInterval(
    {
      start: startOfWeek(subWeeks(periodEnd, 23)),
      end: periodEnd
    },
    { weekStartsOn: 0 }
  )

  const buckets = weeks.map(weekStart => ({
    start: startOfWeek(weekStart),
    end: endOfWeek(weekStart),
    key: format(weekStart, 'yyyy-MM-dd'),
    label: format(weekStart, 'MMM d')
  }))

  const rows = topics.map(topic => ({
    topic,
    buckets: buckets.map(bucket => ({
      key: `${topic}-${bucket.key}`,
      label: bucket.label,
      count: records.filter(({ record, date }) =>
        date >= bucket.start &&
        date <= bucket.end &&
        record.topics.some(t => t === topic)
      ).length
    }))
  }))

  const labels = buckets.map(bucket => format(bucket.start, 'MMM'))

  return { rows, labels }
}

function aggregateTopics(records: RecordWithDate[]): Map<string, number> {
  const counts = new Map<string, number>()
  records.forEach(({ record }) => {
    record.topics.forEach(topic => {
      counts.set(topic, (counts.get(topic) ?? 0) + 1)
    })
  })
  return counts
}

function aggregateCreators(records: RecordWithDate[]): Map<string, number> {
  const counts = new Map<string, number>()
  records.forEach(({ record }) => {
    if (!record.channelTitle) return
    counts.set(record.channelTitle, (counts.get(record.channelTitle) ?? 0) + 1)
  })
  return counts
}

function filterByRange(records: RecordWithDate[], start: Date, end: Date): RecordWithDate[] {
  return records.filter(({ date }) => date >= start && date <= end)
}

function resolveRecordDate(record: WatchRecord): Date | null {
  const candidates = [record.watchedAt, (record as any).rawTimestamp as string | undefined]

  for (const candidate of candidates) {
    if (!candidate) continue
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

function hoursFromCount(count: number): number {
  return (count * AVERAGE_VIDEO_SECONDS) / 3600
}

function formatHours(value: number): string {
  if (value >= 100) {
    return `${Math.round(value)}h`
  }
  if (value >= 10) {
    return `${value.toFixed(1)}h`
  }
  return `${value.toFixed(1)}h`
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0
    return 100
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return '0%'
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(1)}%`
}

function getHeatmapColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) {
    return 'rgba(15, 23, 42, 0.6)'
  }
  const intensity = Math.min(value / max, 1)
  const start = { r: 56, g: 189, b: 248 }
  const end = { r: 168, g: 85, b: 247 }

  const r = Math.round(start.r + (end.r - start.r) * intensity)
  const g = Math.round(start.g + (end.g - start.g) * intensity)
  const b = Math.round(start.b + (end.b - start.b) * intensity)
  const alpha = 0.25 + intensity * 0.55

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isProductive(record: WatchRecord): boolean {
  return record.topics.some(topic => {
    const normalized = topic.toLowerCase()
    return PRODUCTIVE_KEYWORDS.some(keyword => normalized.includes(keyword))
  })
}

function safeSessionCount(records: WatchRecord[]): number {
  try {
    return computeSessionAnalysis(records).totalSessions
  } catch (error) {
    console.warn('Failed to compute session analysis', error)
    return 0
  }
}

export function generateSampleData(): WatchRecord[] {
  const topics = ['Education', 'Technology', 'Podcasts', 'News', 'Entertainment', 'Productivity']
  const channels = ['Fireship', 'Lex Fridman', 'Veritasium', 'Kurzgesagt', 'Ali Abdaal', 'Marques Brownlee']
  const sampleData: WatchRecord[] = []

  const startDate = new Date('2023-01-01')
  const endDate = new Date('2024-08-25')

  for (let i = 0; i < 520; i++) {
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    const randomDate = new Date(randomTime)
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const topic = topics[Math.floor(Math.random() * topics.length)]

    sampleData.push({
      id: `sample-${i}`,
      watchedAt: randomDate.toISOString(),
      videoId: `video-${i}`,
      videoTitle: `Sample Video ${i + 1}`,
      videoUrl: `https://youtube.com/watch?v=video-${i}`,
      channelTitle: channel,
      channelUrl: `https://youtube.com/channel/${channel.toLowerCase().replace(/\s+/g, '-')}`,
      product: Math.random() > 0.2 ? 'YouTube' : 'YouTube Music',
      topics: [topic],
      year: randomDate.getFullYear(),
      month: randomDate.getMonth() + 1,
      week: Math.floor((randomDate.getDate() - 1) / 7) + 1,
      dayOfWeek: randomDate.getDay(),
      hour: randomDate.getHours(),
      yoyKey: `${randomDate.getFullYear()}-${String(randomDate.getMonth() + 1).padStart(2, '0')}`,
      rawTimestamp: randomDate.toISOString()
    })
  }

  return sampleData
}
