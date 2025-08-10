import { WatchRecord } from '@/types/records'

// Load edge case test data
export function getEdgeCaseFixtures(): WatchRecord[] {
  return [
    {
      id: "2025-01-15T10:30:00Z_abc123",
      watchedAt: "2025-01-15T10:30:00Z",
      videoId: "abc123",
      videoTitle: "How to Build Amazing Web Apps",
      videoUrl: "https://www.youtube.com/watch?v=abc123",
      channelTitle: "Tech Tutorials Pro",
      channelUrl: "https://www.youtube.com/channel/UCexample",
      product: "YouTube",
      topics: ["programming", "web development"],
      year: 2025,
      month: 1,
      week: 3,
      dayOfWeek: 3,
      hour: 10,
      yoyKey: "2025-01"
    },
    {
      id: "2024-12-20T15:45:00Z_private",
      watchedAt: "2024-12-20T15:45:00Z",
      videoId: null,
      videoTitle: "Private video",
      videoUrl: null,
      channelTitle: null,
      channelUrl: null,
      product: "YouTube",
      topics: [],
      year: 2024,
      month: 12,
      week: 51,
      dayOfWeek: 5,
      hour: 15,
      yoyKey: "2024-12"
    },
    {
      id: "2024-11-08T20:15:30Z_music456",
      watchedAt: "2024-11-08T20:15:30Z",
      videoId: "music456",
      videoTitle: "Chill Lo-Fi Beats for Coding",
      videoUrl: "https://www.youtube.com/watch?v=music456",
      channelTitle: "Lo-Fi Records",
      channelUrl: "https://www.youtube.com/channel/UClofimusic",
      product: "YouTube Music",
      topics: ["music", "lo-fi"],
      year: 2024,
      month: 11,
      week: 45,
      dayOfWeek: 5,
      hour: 20,
      yoyKey: "2024-11"
    }
  ]
}

// Load missing data test cases
export function getMissingDataFixtures(): WatchRecord[] {
  return [
    {
      id: "unknown_timestamp_xyz789",
      watchedAt: null,
      videoId: "xyz789",
      videoTitle: "Video with Missing Timestamp",
      videoUrl: "https://www.youtube.com/watch?v=xyz789",
      channelTitle: "Tech Channel",
      channelUrl: "https://www.youtube.com/channel/UCtech",
      product: "YouTube",
      topics: ["technology"],
      year: null,
      month: null,
      week: null,
      dayOfWeek: null,
      hour: null,
      yoyKey: null
    },
    {
      id: "2024-10-15T14:20:00Z_unicode123",
      watchedAt: "2024-10-15T14:20:00Z",
      videoId: "unicode123",
      videoTitle: "Técnicas Avanzadas de Programación 🚀 | Tutorial en Español",
      videoUrl: "https://www.youtube.com/watch?v=unicode123",
      channelTitle: "Programación & Código",
      channelUrl: "https://www.youtube.com/channel/UCespanol",
      product: "YouTube",
      topics: ["programming", "tutorial"],
      year: 2024,
      month: 10,
      week: 42,
      dayOfWeek: 2,
      hour: 14,
      yoyKey: "2024-10"
    },
    {
      id: "2024-09-12T09:00:00Z_missing",
      watchedAt: "2024-09-12T09:00:00Z",
      videoId: null,
      videoTitle: "Deleted Video Title Still Showing",
      videoUrl: null,
      channelTitle: "Channel Name Still Present",
      channelUrl: "https://www.youtube.com/channel/UCstillhere",
      product: "YouTube",
      topics: [],
      year: 2024,
      month: 9,
      week: 37,
      dayOfWeek: 4,
      hour: 9,
      yoyKey: "2024-09"
    }
  ]
}

// Load time variation test cases
export function getTimeVariationFixtures(): WatchRecord[] {
  return [
    {
      id: "2024-08-20T16:30:45Z_standard",
      watchedAt: "2024-08-20T16:30:45Z",
      videoId: "standard123",
      videoTitle: "Regular Video Entry",
      videoUrl: "https://www.youtube.com/watch?v=standard123",
      channelTitle: "Standard Channel",
      channelUrl: "https://www.youtube.com/channel/UCstandard",
      product: "YouTube",
      topics: ["general"],
      year: 2024,
      month: 8,
      week: 34,
      dayOfWeek: 2,
      hour: 16,
      yoyKey: "2024-08"
    },
    {
      id: "2024-07-05T02:15:00Z_early",
      watchedAt: "2024-07-05T02:15:00Z",
      videoId: "early456",
      videoTitle: "Late Night Coding Session",
      videoUrl: "https://www.youtube.com/watch?v=early456",
      channelTitle: "Night Owl Developers",
      channelUrl: "https://www.youtube.com/channel/UCnightowl",
      product: "YouTube",
      topics: ["programming", "coding"],
      year: 2024,
      month: 7,
      week: 27,
      dayOfWeek: 5,
      hour: 2,
      yoyKey: "2024-07"
    },
    {
      id: "2023-12-31T23:59:30Z_boundary",
      watchedAt: "2023-12-31T23:59:30Z",
      videoId: "boundary789",
      videoTitle: "New Year's Eve Countdown",
      videoUrl: "https://www.youtube.com/watch?v=boundary789",
      channelTitle: "Celebration Central",
      channelUrl: "https://www.youtube.com/channel/UCcelebration",
      product: "YouTube",
      topics: ["celebration", "new year"],
      year: 2023,
      month: 12,
      week: 53,
      dayOfWeek: 0,
      hour: 23,
      yoyKey: "2023-12"
    }
  ]
}

// Combined fixture dataset for development
export function getAllFixtures(): WatchRecord[] {
  return [
    ...getEdgeCaseFixtures(),
    ...getMissingDataFixtures(),
    ...getTimeVariationFixtures()
  ]
}

// Generate realistic sample data for development
export function generateDevelopmentSampleData(): WatchRecord[] {
  const channels = [
    { name: "Veritasium", topic: "science" },
    { name: "MKBHD", topic: "technology" },
    { name: "Ben Felix", topic: "finance" },
    { name: "CGP Grey", topic: "education" },
    { name: "Linus Tech Tips", topic: "technology" },
    { name: "Kurzgesagt", topic: "science" },
    { name: "3Blue1Brown", topic: "mathematics" },
    { name: "Two Minute Papers", topic: "AI" }
  ]

  const records: WatchRecord[] = []
  const now = new Date()

  // Generate 200 records over past 6 months
  for (let i = 0; i < 200; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const daysAgo = Math.floor(Math.random() * 180) // Past 6 months
    const watchedAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
    const hour = Math.floor(Math.random() * 24)
    watchedAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0)

    const videoId = `sample_${i.toString().padStart(3, '0')}`
    
    records.push({
      id: `${watchedAt.toISOString()}_${videoId}`,
      watchedAt: watchedAt.toISOString(),
      videoId,
      videoTitle: `${channel.topic.charAt(0).toUpperCase() + channel.topic.slice(1)} Video ${i + 1}`,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelTitle: channel.name,
      channelUrl: `https://www.youtube.com/channel/UC${channel.name.replace(/\s/g, '')}`,
      product: Math.random() > 0.9 ? "YouTube Music" : "YouTube",
      topics: [channel.topic],
      year: watchedAt.getFullYear(),
      month: watchedAt.getMonth() + 1,
      week: Math.ceil((watchedAt.getDate() + new Date(watchedAt.getFullYear(), watchedAt.getMonth(), 1).getDay()) / 7),
      dayOfWeek: watchedAt.getDay(),
      hour: watchedAt.getHours(),
      yoyKey: `${watchedAt.getFullYear()}-${(watchedAt.getMonth() + 1).toString().padStart(2, '0')}`
    })
  }

  return records.sort((a, b) => 
    new Date(b.watchedAt || 0).getTime() - new Date(a.watchedAt || 0).getTime()
  )
}

// Check if running in development
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development'
}