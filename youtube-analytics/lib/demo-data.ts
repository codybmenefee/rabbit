import { WatchRecord, ImportSummary } from '@/types/records'

// Realistic YouTube channels and content patterns
const DEMO_CHANNELS = [
  // Tech channels
  { name: 'Fireship', topics: ['tech', 'education'], videoTypes: ['tutorial', 'quick tips', 'web dev'] },
  { name: 'ThePrimeagen', topics: ['tech', 'education'], videoTypes: ['programming', 'react', 'vim'] },
  { name: 'Theo - t3․gg', topics: ['tech', 'education'], videoTypes: ['react', 'nextjs', 'typescript'] },
  { name: 'Web Dev Simplified', topics: ['tech', 'education'], videoTypes: ['javascript', 'css', 'tutorials'] },
  { name: 'Traversy Media', topics: ['tech', 'education'], videoTypes: ['full stack', 'tutorials', 'frameworks'] },
  
  // Entertainment
  { name: 'MrBeast', topics: ['entertainment'], videoTypes: ['challenge', 'giveaway', 'crazy stunts'] },
  { name: 'PewDiePie', topics: ['entertainment', 'gaming'], videoTypes: ['gaming', 'meme review', 'react'] },
  { name: 'Markiplier', topics: ['entertainment', 'gaming'], videoTypes: ['horror games', 'indie games', 'comedy'] },
  { name: 'Dude Perfect', topics: ['entertainment'], videoTypes: ['trick shots', 'sports', 'challenges'] },
  
  // Music
  { name: 'Lofi Girl', topics: ['music'], videoTypes: ['lofi hip hop', 'study music', 'chill beats'] },
  { name: 'Trap Nation', topics: ['music'], videoTypes: ['electronic', 'dubstep', 'trap music'] },
  { name: 'Proximity', topics: ['music'], videoTypes: ['electronic', 'future bass', 'house music'] },
  
  // Education/Science
  { name: '3Blue1Brown', topics: ['education', 'science'], videoTypes: ['mathematics', 'linear algebra', 'calculus'] },
  { name: 'Veritasium', topics: ['education', 'science'], videoTypes: ['physics', 'engineering', 'experiments'] },
  { name: 'Kurzgesagt – In a Nutshell', topics: ['education', 'science'], videoTypes: ['space', 'biology', 'philosophy'] },
  { name: 'Khan Academy', topics: ['education'], videoTypes: ['math', 'science', 'history'] },
  
  // Business/Finance
  { name: 'Ali Abdaal', topics: ['business', 'lifestyle'], videoTypes: ['productivity', 'study tips', 'entrepreneurship'] },
  { name: 'Graham Stephan', topics: ['business'], videoTypes: ['real estate', 'investing', 'finance'] },
  { name: 'Meet Kevin', topics: ['business'], videoTypes: ['stocks', 'real estate', 'economics'] },
  
  // Lifestyle/Vlogs
  { name: 'Emma Chamberlain', topics: ['lifestyle'], videoTypes: ['vlogs', 'coffee', 'fashion'] },
  { name: 'Casey Neistat', topics: ['lifestyle'], videoTypes: ['vlogs', 'filmmaking', 'nyc life'] },
  { name: 'Peter McKinnon', topics: ['lifestyle'], videoTypes: ['photography', 'filmmaking', 'gear reviews'] }
]

// Generate video titles based on channel and topics
function generateVideoTitle(channel: typeof DEMO_CHANNELS[0]): string {
  const templates = [
    'How to {skill} in {timeframe}',
    'Why {topic} is {adjective}',
    '{number} {topic} Tips That Changed My Life',
    'I {action} for {timeframe} - Here\'s What Happened',
    'The {adjective} Way to {action}',
    'React to {topic}',
    '{topic} Explained in {timeframe}',
    'Building {project} with {tech}',
    '{adjective} {topic} You Need to Know'
  ]
  
  const skills = ['code', 'design', 'invest', 'study', 'create content']
  const timeframes = ['30 days', '1 year', '6 months', '24 hours', '1 week']
  const topics = ['JavaScript', 'React', 'AI', 'Productivity', 'Money', 'Life']
  const adjectives = ['Best', 'Worst', 'Fastest', 'Easiest', 'Most Important']
  const actions = ['learned coding', 'built a startup', 'invested $10k', 'quit my job']
  const numbers = ['5', '10', '15', '7', '3']
  const projects = ['a SaaS app', 'an AI tool', 'a mobile app', 'a website']
  const techs = ['NextJS', 'Python', 'TypeScript', 'React Native']
  
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  return template
    .replace('{skill}', skills[Math.floor(Math.random() * skills.length)])
    .replace('{timeframe}', timeframes[Math.floor(Math.random() * timeframes.length)])
    .replace('{topic}', topics[Math.floor(Math.random() * topics.length)])
    .replace('{adjective}', adjectives[Math.floor(Math.random() * adjectives.length)])
    .replace('{action}', actions[Math.floor(Math.random() * actions.length)])
    .replace('{number}', numbers[Math.floor(Math.random() * numbers.length)])
    .replace('{project}', projects[Math.floor(Math.random() * projects.length)])
    .replace('{tech}', techs[Math.floor(Math.random() * techs.length)])
}

// Generate realistic viewing patterns
function generateViewingPatterns(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate more realistic patterns - heavier on weekends and evenings
  for (let day = 0; day < daysDiff; day++) {
    const currentDate = new Date(startDate.getTime() + (day * 24 * 60 * 60 * 1000))
    const dayOfWeek = currentDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // More videos on weekends
    const baseVideosPerDay = isWeekend ? 8 : 5
    const videosToday = Math.floor(Math.random() * baseVideosPerDay) + 1
    
    for (let video = 0; video < videosToday; video++) {
      // Peak hours: 7-9am (morning), 12-1pm (lunch), 6-11pm (evening)
      const hourRanges = [
        [7, 9],   // Morning
        [12, 13], // Lunch  
        [18, 23]  // Evening
      ]
      
      const selectedRange = hourRanges[Math.floor(Math.random() * hourRanges.length)]
      const hour = Math.floor(Math.random() * (selectedRange[1] - selectedRange[0] + 1)) + selectedRange[0]
      const minute = Math.floor(Math.random() * 60)
      const second = Math.floor(Math.random() * 60)
      
      const videoDate = new Date(currentDate)
      videoDate.setHours(hour, minute, second, 0)
      dates.push(videoDate)
    }
  }
  
  return dates.sort((a, b) => b.getTime() - a.getTime()) // Most recent first
}

// Helper to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Generate a unique ID (safe for all characters)
function generateId(videoTitle: string, timestamp: string, channelTitle: string): string {
  const hashInput = `${videoTitle}|${timestamp}|${channelTitle}`
  // Simple hash function to avoid btoa issues with non-ASCII characters
  let hash = 0
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 16).padStart(16, '0')
}

export function generateDemoData(): { records: WatchRecord[], summary: ImportSummary } {
  // Generate data for the last 18 months
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(endDate.getMonth() - 18)
  
  const viewingDates = generateViewingPatterns(startDate, endDate)
  const records: WatchRecord[] = []
  
  // Create weighted channel selection (some channels watched more than others)
  const channelWeights = DEMO_CHANNELS.map((channel, index) => ({
    channel,
    weight: Math.pow(0.8, index) // Exponential decay for realistic distribution
  }))
  
  const totalWeight = channelWeights.reduce((sum, cw) => sum + cw.weight, 0)
  
  viewingDates.forEach((date, index) => {
    // Weighted random channel selection
    let random = Math.random() * totalWeight
    let selectedChannel = DEMO_CHANNELS[0]
    
    for (const cw of channelWeights) {
      random -= cw.weight
      if (random <= 0) {
        selectedChannel = cw.channel
        break
      }
    }
    
    const videoTitle = generateVideoTitle(selectedChannel)
    const videoId = `demo_${index}_${Math.random().toString(36).substr(2, 11)}`
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const channelUrl = `https://www.youtube.com/@${selectedChannel.name.replace(/\s+/g, '').toLowerCase()}`
    
    // Determine product (90% YouTube, 10% YouTube Music for music channels)
    const isMusic = selectedChannel.topics.includes('music') && Math.random() < 0.7
    const product: 'YouTube' | 'YouTube Music' = isMusic ? 'YouTube Music' : 'YouTube'
    
    const watchedAt = date.toISOString()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const week = getWeekNumber(date)
    const dayOfWeek = date.getDay()
    const hour = date.getHours()
    const yoyKey = `${year}-${String(month).padStart(2, '0')}`
    
    const record: WatchRecord = {
      id: generateId(videoTitle, watchedAt, selectedChannel.name),
      watchedAt,
      videoId,
      videoTitle,
      videoUrl,
      channelTitle: selectedChannel.name,
      channelUrl,
      product,
      topics: selectedChannel.topics,
      year,
      month,
      week,
      dayOfWeek,
      hour,
      yoyKey,
      rawTimestamp: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      })
    }
    
    records.push(record)
  })
  
  // Generate summary
  const uniqueChannels = new Set(records.map(r => r.channelTitle).filter(Boolean))
  const validDates = records
    .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
  
  const dateRange = {
    start: validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null,
    end: validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : null
  }
  
  const productBreakdown = records.reduce((acc, record) => {
    if (record.product === 'YouTube Music') {
      acc.youtubeMusic++
    } else {
      acc.youtube++
    }
    return acc
  }, { youtube: 0, youtubeMusic: 0 })
  
  const summary: ImportSummary = {
    totalRecords: records.length,
    uniqueChannels: uniqueChannels.size,
    dateRange,
    productBreakdown,
    parseErrors: 0
  }
  
  return { records, summary }
}