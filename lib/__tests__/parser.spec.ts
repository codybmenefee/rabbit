import { YouTubeHistoryParser } from '../parser'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('YouTubeHistoryParser', () => {
  test('parses record with channel and full timestamp', async () => {
    const html = await fs.readFile(path.join(process.cwd(), 'test/fixtures/watch-history-sample-1.html'), 'utf8')
    const parser = new YouTubeHistoryParser(html)
    const events = await parser.parse()
    const e1 = events[0]
    expect(e1.videoId).toBe('MKMFlUaICXs')
    expect(e1.videoUrl).toBe('https://www.youtube.com/watch?v=MKMFlUaICXs')
    expect(e1.channelTitle).toBe('More or Less Podcast')
    expect(e1.channelId).toBe('UCVPayYVn9c12mpDOiQsl2uQ')
    expect(e1.startedAt).toBe('2025-08-15T16:04:01.000Z')
  })

  test('parses record without channel but with timestamp', async () => {
    const html = await fs.readFile(path.join(process.cwd(), 'test/fixtures/watch-history-sample-1.html'), 'utf8')
    const parser = new YouTubeHistoryParser(html)
    const events = await parser.parse()
    const e2 = events[1]
    expect(e2.videoId).toBe('wpbp_VvgKGQ')
    expect(e2.videoUrl).toBe('https://www.youtube.com/watch?v=wpbp_VvgKGQ')
    expect(e2.channelTitle).toBeUndefined()
    expect(e2.startedAt).toBe('2025-08-15T04:42:22.000Z')
  })

  test('preserves original timestamp in raw', async () => {
    const html = await fs.readFile(path.join(process.cwd(), 'test/fixtures/watch-history-sample-1.html'), 'utf8')
    const parser = new YouTubeHistoryParser(html)
    const events = await parser.parse()
    const e1 = events[0]
    expect(e1.raw.originalTimestamp).toBe('Aug 15, 2025, 11:04:01 AM CDT')
  })
})
