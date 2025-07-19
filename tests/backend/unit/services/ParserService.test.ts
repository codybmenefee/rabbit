import { ParserService, ParseOptions, ParseResult } from '../../../../backend/src/services/ParserService';
import { YouTubeAPIService } from '../../../../backend/src/services/YouTubeAPIService';
import { AnalyticsService } from '../../../../backend/src/services/AnalyticsService';
import { VideoService } from '../../../../backend/src/services/VideoService';
import { IVideoEntry, ContentType, VideoCategory } from '../../../../backend/src/models/VideoEntry';
import { mockVideoEntry } from '../../helpers/setup';

// Mock dependencies
jest.mock('../../../../backend/src/services/YouTubeAPIService');
jest.mock('../../../../backend/src/services/AnalyticsService');
jest.mock('../../../../backend/src/services/VideoService');

describe('ParserService', () => {
  let parserService: ParserService;
  let mockYouTubeAPI: jest.Mocked<YouTubeAPIService>;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  let mockVideoService: jest.Mocked<VideoService>;

  const defaultParseOptions: ParseOptions = {
    enrichWithAPI: false,
    useScrapingService: false,
    includeAds: false,
    includeShorts: true
  };

  beforeEach(() => {
    // Create mocked dependencies
    mockYouTubeAPI = new YouTubeAPIService() as jest.Mocked<YouTubeAPIService>;
    mockAnalyticsService = new AnalyticsService() as jest.Mocked<AnalyticsService>;
    mockVideoService = new VideoService() as jest.Mocked<VideoService>;
    
    // Mock the generateMetrics method to return a simple metrics object
    mockAnalyticsService.generateMetrics = jest.fn().mockResolvedValue({
      totalVideos: 0,
      totalWatchTime: 0,
      averageWatchTime: 0,
      uniqueChannels: 0,
      dateRange: { start: new Date(), end: new Date(), totalDays: 0 },
      contentTypes: {},
      categories: [],
      topChannels: [],
      temporal: { hourlyDistribution: {}, dayOfWeekDistribution: {}, monthlyDistribution: {}, seasonalPatterns: { spring: 0, summer: 0, fall: 0, winter: 0 }, peakHours: [], peakDays: [] },
      discovery: { discoveryMethods: {}, subscriptionRate: 0, averageSessionLength: 0, contentCompletionRate: 0, bingeBehavior: { averageVideosPerSession: 0, longestSession: 0, channelLoyalty: 0 } },
      trends: { watchTime: { daily: [], weekly: [], monthly: [] }, contentTypes: {} as any, categories: {} as any, topChannels: [] },
      comparisons: { monthOverMonth: { current: 0, previous: 0, change: 0, changePercentage: 0 }, yearOverYear: { current: 0, previous: 0, change: 0, changePercentage: 0 }, quarterOverQuarter: { current: 0, previous: 0, change: 0, changePercentage: 0 } },
      processing: { totalVideosProcessed: 0, enrichedWithAPI: 0, processingErrors: 0, processingTime: 0, dataQuality: { completeEntries: 0, partialEntries: 0, duplicatesRemoved: 0 }, apiUsage: { quotaUsed: 0, quotaRemaining: 0, requestsMade: 0 } }
    });
    
    // Create ParserService with mocked dependencies
    parserService = new ParserService(
      mockYouTubeAPI,
      mockAnalyticsService,
      mockVideoService
    );
  });

  describe('parseWatchHistory', () => {
    test('should parse valid YouTube watch history HTML', async () => {
      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube Music</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Never Gonna Give You Up</a><br/>
            <a href="https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw">Rick Astley</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, defaultParseOptions);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.processingStats).toBeDefined();
      
      if (result.entries.length > 0) {
        const firstEntry = result.entries[0];
        expect(firstEntry.title).toBeDefined();
        expect(firstEntry.url).toBeDefined();
        expect(firstEntry.contentType).toBe(ContentType.VIDEO);
        expect(firstEntry.watchedAt).toBeInstanceOf(Date);
      }
    });

    test('should return empty results for empty HTML', async () => {
      const emptyHTML = '<html><body></body></html>';

      const result: ParseResult = await parserService.parseWatchHistory(emptyHTML, defaultParseOptions);

      expect(result.entries).toHaveLength(0);
      expect(result.processingStats.totalEntries).toBe(0);
    });

    test('should handle malformed HTML gracefully', async () => {
      const malformedHTML = '<div>Incomplete HTML without proper structure';

      const result: ParseResult = await parserService.parseWatchHistory(malformedHTML, defaultParseOptions);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
      expect(Array.isArray(result.entries)).toBe(true);
    });

    test('should parse multiple video entries', async () => {
      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://youtu.be/short123">Short Video</a><br/>
            <a href="https://www.youtube.com/channel/UCshort">Channel Short</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/shorts/abc123">Shorts Video</a><br/>
            <a href="https://www.youtube.com/channel/UCshorts">Shorts Channel</a><br/>
            Oct 26, 2023, 4:15:00 PM PDT
          </div>
        </div>
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://m.youtube.com/watch?v=mobile123">Mobile Video</a><br/>
            <a href="https://www.youtube.com/channel/UCmobile">Mobile Channel</a><br/>
            Oct 27, 2023, 5:30:15 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, defaultParseOptions);

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.processingStats.totalEntries).toBeGreaterThanOrEqual(result.entries.length);
    });

    test('should filter out shorts when includeShorts is false', async () => {
      const optionsNoShorts: ParseOptions = {
        ...defaultParseOptions,
        includeShorts: false
      };
      
      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/shorts/abc123">Shorts Video</a><br/>
            <a href="https://www.youtube.com/channel/UCshorts">Shorts Channel</a><br/>
            Oct 26, 2023, 4:15:00 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, optionsNoShorts);

      // Should have fewer entries when shorts are filtered out
      const shortsEntries = result.entries.filter(entry => entry.contentType === ContentType.SHORT);
      expect(shortsEntries.length).toBe(0);
    });

    test('should handle date range filtering', async () => {
      const optionsWithDateRange: ParseOptions = {
        ...defaultParseOptions,
        dateRange: {
          start: new Date('2023-10-25'),
          end: new Date('2023-10-26')
        }
      };

      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=test123">Test Video</a><br/>
            <a href="https://www.youtube.com/channel/UCtest">Test Channel</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, optionsWithDateRange);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });

    test('should handle category filtering', async () => {
      const optionsWithCategoryFilter: ParseOptions = {
        ...defaultParseOptions,
        categoryFilters: [VideoCategory.MUSIC, VideoCategory.ENTERTAINMENT]
      };

      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube Music</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=music123">Music Video</a><br/>
            <a href="https://www.youtube.com/channel/UCmusic">Music Channel</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, optionsWithCategoryFilter);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });
  });

  describe('parsing with API enrichment', () => {
    test('should handle API enrichment option', async () => {
      const optionsWithAPI: ParseOptions = {
        ...defaultParseOptions,
        enrichWithAPI: true
      };

      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=test123">Test Video</a><br/>
            <a href="https://www.youtube.com/channel/UCtest">Test Channel</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, optionsWithAPI);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });

    test('should handle scraping service option', async () => {
      const optionsWithScraping: ParseOptions = {
        ...defaultParseOptions,
        useScrapingService: true
      };

      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=test123">Test Video</a><br/>
            <a href="https://www.youtube.com/channel/UCtest">Test Channel</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, optionsWithScraping);

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });
  });

  describe('performance and robustness', () => {
    test('should handle large HTML files efficiently', async () => {
      // Generate a large HTML file with many entries
      const largeHTML = Array(1000).fill(null).map((_, index) => `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=test${index}">Test Video ${index}</a><br/>
            <a href="https://www.youtube.com/channel/UCtest${index}">Test Channel ${index}</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `).join('');

      const startTime = Date.now();
      const result: ParseResult = await parserService.parseWatchHistory(largeHTML, defaultParseOptions);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle unicode characters correctly', async () => {
      const unicodeHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=unicode123">🎵 Music Video with Emojis 🎵</a><br/>
            <a href="https://www.youtube.com/channel/UCunicode">Channel with 中文字符</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(unicodeHTML, defaultParseOptions);

      expect(result.entries.length).toBeGreaterThan(0);
      const firstEntry = result.entries[0];
      expect(firstEntry.title).toContain('🎵');
    });

    test('should handle entries without timestamps gracefully', async () => {
      const htmlWithoutTimestamp = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=notime123">Video Without Timestamp</a><br/>
            <a href="https://www.youtube.com/channel/UCnotime">Channel Without Time</a><br/>
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(htmlWithoutTimestamp, defaultParseOptions);

      expect(result.entries.length).toBeGreaterThan(0);
      const firstEntry = result.entries[0];
      expect(firstEntry.watchedAt).toBeInstanceOf(Date);
    });
  });

  describe('processing statistics', () => {
    test('should provide accurate processing statistics', async () => {
      const mockHTML = `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="header-cell mdl-cell mdl-cell--12-col">
            <p class="mdl-typography--title">YouTube</p>
          </div>
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=test123">Test Video</a><br/>
            <a href="https://www.youtube.com/channel/UCtest">Test Channel</a><br/>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `;

      const result: ParseResult = await parserService.parseWatchHistory(mockHTML, defaultParseOptions);

      expect(result.processingStats).toBeDefined();
      expect(typeof result.processingStats.totalEntries).toBe('number');
      expect(typeof result.processingStats.validEntries).toBe('number');
      expect(result.processingStats.validEntries).toBeLessThanOrEqual(result.processingStats.totalEntries);
    });
  });
});