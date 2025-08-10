import { 
  VideoWatch, 
  TopicTrend, 
  CreatorMetrics, 
  EventCorrelation, 
  InsightCard, 
  DashboardMetrics,
  TimeSeriesData,
  TopicCategory 
} from '@/types'
import { subDays, subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

const categories: TopicCategory[] = [
  'Technology', 'Finance', 'Politics', 'Entertainment', 'Education', 
  'Gaming', 'Music', 'Sports', 'News', 'Science', 'Cooking', 'Travel'
]

const channels = [
  { name: 'Veritasium', category: 'Science', subscribers: 12500000 },
  { name: 'MKBHD', category: 'Technology', subscribers: 18200000 },
  { name: 'Ben Felix', category: 'Finance', subscribers: 1200000 },
  { name: 'CGP Grey', category: 'Education', subscribers: 5100000 },
  { name: 'Linus Tech Tips', category: 'Technology', subscribers: 15300000 },
  { name: 'Kurzgesagt', category: 'Science', subscribers: 20100000 },
  { name: 'The Daily Show', category: 'Politics', subscribers: 3400000 },
  { name: 'Coffeezilla', category: 'Finance', subscribers: 3200000 },
  { name: 'Tom Scott', category: 'Education', subscribers: 6200000 },
  { name: 'Corridor Crew', category: 'Entertainment', subscribers: 4800000 }
]

function generateRandomWatchHistory(days: number = 365): VideoWatch[] {
  const watches: VideoWatch[] = []
  const now = new Date()
  
  for (let i = 0; i < days * 5; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const duration = Math.floor(Math.random() * 3600) + 300 // 5min to 1hr
    const watchedDuration = Math.floor(duration * (0.3 + Math.random() * 0.7))
    
    watches.push({
      id: `video_${i}`,
      title: generateVideoTitle(channel.category),
      channel: channel.name,
      category: channel.category,
      duration,
      watchedAt: subDays(now, Math.floor(Math.random() * days)),
      watchedDuration,
      url: `https://youtube.com/watch?v=video_${i}`,
      thumbnailUrl: `https://picsum.photos/seed/${i}/320/180`
    })
  }
  
  return watches.sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
}

function generateVideoTitle(category: string): string {
  const titles = {
    Technology: [
      'The Future of AI is Terrifying',
      'Why Apple\'s New Chip Changes Everything',
      'The Smartphone Wars Are Over',
      'Quantum Computing Breakthrough'
    ],
    Finance: [
      'Why the Stock Market Will Crash in 2024',
      'The Fed\'s Next Move Will Shock You',
      'Index Funds vs ETFs: The Truth',
      'Crypto Winter is Coming'
    ],
    Science: [
      'This Discovery Changes Everything',
      'The Universe is Stranger Than We Thought',
      'Climate Change: The Real Numbers',
      'Space Elevator: Possible or Fantasy?'
    ],
    Education: [
      'How Countries Are Actually Run',
      'The Map Men Explain Everything',
      'Why This Tiny Detail Matters',
      'The History You Never Learned'
    ]
  }
  
  const categoryTitles = titles[category as keyof typeof titles] || [
    'Interesting Content About This Topic',
    'Amazing Facts You Need to Know',
    'The Complete Guide to Everything'
  ]
  
  return categoryTitles[Math.floor(Math.random() * categoryTitles.length)]
}

export function getMockWatchHistory(): VideoWatch[] {
  return generateRandomWatchHistory()
}

export function getMockTopicTrends(): TopicTrend[] {
  const trends: TopicTrend[] = []
  const now = new Date('2024-08-10') // Fixed date for consistency
  
  categories.forEach((topic, topicIndex) => {
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i)
      // Use deterministic values based on topic and month for consistency
      const baseWatchTime = (topicIndex * 10000) + (i * 5000) + 15000
      const seasonalModifier = Math.sin((i / 12) * Math.PI * 2) * 0.3 + 1
      
      trends.push({
        topic,
        date,
        watchTime: Math.floor(baseWatchTime * seasonalModifier),
        videoCount: 10 + (i * 2) + (topicIndex * 3),
        growthRate: (i % 2 === 0 ? 1 : -1) * (10 + (i * 5))
      })
    }
  })
  
  return trends
}

export function getMockCreatorMetrics(): CreatorMetrics[] {
  const fixedDate = new Date('2024-08-10')
  
  return channels.map((channel, index) => ({
    channel: channel.name,
    totalWatchTime: 20000 + (index * 12000) + (index % 3) * 5000,
    videoCount: 5 + (index * 4) + (index % 5),
    averageWatchTime: 300 + (index * 150) + (index % 4) * 100,
    lastWatchedAt: subDays(fixedDate, index * 3 + 1),
    loyaltyScore: 20 + (index * 8) + (index % 7) * 5,
    category: channel.category,
    subscriberCount: channel.subscribers,
    avatarUrl: `https://ui-avatars.com/api/?name=${channel.name}&background=8b5cf6&color=fff`
  }))
}

export function getMockEventCorrelations(): EventCorrelation[] {
  return [
    {
      event: 'SVB Bank Collapse',
      date: new Date('2023-03-10'),
      description: 'Silicon Valley Bank collapse triggered increased interest in finance content',
      impactMetrics: [
        { topic: 'Finance', beforeAverage: 5000, afterAverage: 17000, percentageChange: 240 },
        { topic: 'Technology', beforeAverage: 12000, afterAverage: 8000, percentageChange: -33 }
      ]
    },
    {
      event: 'ChatGPT Launch',
      date: new Date('2022-11-30'),
      description: 'AI breakthrough sparked massive interest in technology content',
      impactMetrics: [
        { topic: 'Technology', beforeAverage: 8000, afterAverage: 25000, percentageChange: 213 },
        { topic: 'Science', beforeAverage: 3000, afterAverage: 8000, percentageChange: 167 }
      ]
    },
    {
      event: '2024 Elections',
      date: new Date('2024-01-01'),
      description: 'Election season increased political content consumption',
      impactMetrics: [
        { topic: 'Politics', beforeAverage: 2000, afterAverage: 12000, percentageChange: 500 },
        { topic: 'News', beforeAverage: 4000, afterAverage: 9000, percentageChange: 125 }
      ]
    }
  ]
}

export function getMockInsights(): InsightCard[] {
  return [
    {
      id: '1',
      type: 'trend',
      title: 'AI Content Surge',
      description: 'Your AI-related viewing increased 340% after ChatGPT launch',
      impact: 'high',
      metric: { value: 340, change: 340, label: '% increase' },
      timeframe: 'Last 6 months'
    },
    {
      id: '2', 
      type: 'correlation',
      title: 'Market Volatility Impact',
      description: 'Finance content peaks during major market events',
      impact: 'medium',
      metric: { value: 67, change: 23, label: 'correlation score' },
      timeframe: 'Past year'
    },
    {
      id: '3',
      type: 'pattern',
      title: 'Weekend Learning',
      description: 'You consume 45% more educational content on weekends',
      impact: 'medium',
      metric: { value: 45, change: 12, label: '% more on weekends' },
      timeframe: 'Ongoing pattern'
    },
    {
      id: '4',
      type: 'discovery',
      title: 'New Interest Emerging',
      description: 'Space exploration content growing in your feed',
      impact: 'low',
      metric: { value: 156, change: 156, label: '% growth this month' },
      timeframe: 'This month'
    }
  ]
}

export function getMockDashboardMetrics(): DashboardMetrics {
  return {
    totalWatchTime: 847320, // seconds
    videosWatched: 1247,
    uniqueChannels: 89,
    averageSessionLength: 1680,
    topCategory: 'Technology',
    diversityIndex: 73,
    previousPeriodComparison: {
      watchTime: 12.4,
      videos: 8.7,
      channels: -2.1
    }
  }
}

export function getMockTimeSeriesData(): TimeSeriesData[] {
  const data: TimeSeriesData[] = []
  const now = new Date('2024-08-10') // Fixed date for consistency
  
  for (let i = 30; i >= 0; i--) {
    const date = subDays(now, i)
    const entry: TimeSeriesData = { date }
    
    categories.forEach((category, categoryIndex) => {
      // Use deterministic values based on category and day
      entry[category] = 1000 + (categoryIndex * 800) + (i * 100) + ((i + categoryIndex) % 7) * 300
    })
    
    data.push(entry)
  }
  
  return data
}