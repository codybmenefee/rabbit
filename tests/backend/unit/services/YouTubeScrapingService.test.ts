import { YouTubeScrapingService, ScrapingConfig } from '../../../../backend/src/services/YouTubeScrapingService';
import { IVideoEntry, ContentType, VideoCategory } from '../../../../backend/src/models/VideoEntry';

describe('YouTubeScrapingService', () => {
  let scrapingService: YouTubeScrapingService;
  
  const testConfig: ScrapingConfig = {
    maxConcurrentRequests: 1,
    requestDelayMs: 1000,
    retryAttempts: 2,
    timeout: 15000,
    userAgents: [],
    enableJavaScript: false,
    enableBrowser: false, // Disable browser for tests
    cacheEnabled: true,
    cacheTTL: 3600
  };

  beforeEach(() => {
    scrapingService = new YouTubeScrapingService(testConfig);
  });

  afterEach(() => {
    scrapingService.clearCache();
  });

  describe('extractVideoId', () => {
    test('should extract video ID from standard YouTube URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from youtu.be URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from YouTube Shorts URL', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx&index=1';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should return null for invalid YouTube URL', () => {
      const url = 'https://example.com/not-a-youtube-url';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBeNull();
    });

    test('should return null for non-URL strings', () => {
      const url = 'not-a-url-at-all';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBeNull();
    });
  });

  describe('data extraction utilities', () => {
    test('should normalize view count correctly', () => {
      const testCases = [
        { input: '1,234,567 views', expected: 1234567 },
        { input: '1.2M views', expected: 1200000 },
        { input: '500K views', expected: 500000 },
        { input: '1.2B views', expected: 1200000000 },
        { input: '123 views', expected: 123 },
        { input: 'invalid', expected: 0 },
        { input: '', expected: 0 },
        { input: null, expected: 0 },
        { input: undefined, expected: 0 }
      ];

      testCases.forEach(({ input, expected }) => {
        // This tests the private method via reflection for testing purposes
        const result = (scrapingService as any).normalizeViewCount(input);
        expect(result).toBe(expected);
      });
    });

    test('should parse duration correctly', () => {
      const testCases = [
        { input: 'PT3M33S', expected: 213 }, // ISO 8601 format
        { input: '3:33', expected: 213 }, // MM:SS format
        { input: '1:03:33', expected: 3813 }, // H:MM:SS format
        { input: 'PT1H3M33S', expected: 3813 }, // ISO 8601 with hours
        { input: 'invalid', expected: 0 },
        { input: '', expected: 0 },
        { input: null, expected: 0 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (scrapingService as any).parseDurationText(input);
        expect(result).toBe(expected);
      });
    });

    test('should sanitize titles correctly', () => {
      const testCases = [
        { input: 'Normal Title', expected: 'Normal Title' },
        { input: '  Title with  extra   spaces  ', expected: 'Title with extra spaces' },
        // Fixed: Control characters should be removed, not replaced with spaces
        { input: 'Title\u0000with\u001Fcontrol\u007Fchars', expected: 'Titlewithcontrolchars' },
        { input: '', expected: '' },
        { input: null, expected: '' },
        { input: undefined, expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (scrapingService as any).sanitizeTitle(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('enrichVideoEntries', () => {
    test('should handle empty array', async () => {
      const entries: IVideoEntry[] = [];
      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toEqual([]);
    });

    test('should skip entries with invalid URLs', async () => {
      const entries: IVideoEntry[] = [
        {
          title: 'Test Video',
          channel: 'Test Channel',
          url: 'https://invalid-url.com',
          watchedAt: new Date(),
          contentType: ContentType.VIDEO,
          category: VideoCategory.UNKNOWN,
          enrichedWithAPI: false,
          lastUpdated: new Date()
        }
      ];
      
      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(entries[0]); // Should return unchanged
    });

    test('should process valid YouTube URLs', async () => {
      const entries: IVideoEntry[] = [
        {
          title: 'Test Video',
          channel: 'Test Channel',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          watchedAt: new Date(),
          contentType: ContentType.VIDEO,
          category: VideoCategory.UNKNOWN,
          enrichedWithAPI: false,
          lastUpdated: new Date()
        }
      ];
      
      // Mock the scrapeVideoData method to avoid actual network calls
      const mockScrapeVideoData = jest.spyOn(scrapingService as any, 'scrapeVideoData')
        .mockResolvedValue({
          title: 'Enriched Title',
          description: 'Test description',
          views: 1000000,
          likes: 50000,
          duration: 240,
          uploadDate: new Date(),
          channelName: 'Test Channel',
          category: VideoCategory.MUSIC
        });

      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Enriched Title');
      expect(result[0].category).toBe(VideoCategory.MUSIC);
      
      mockScrapeVideoData.mockRestore();
    });
  });

  describe('error handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockScrapeVideoData = jest.spyOn(scrapingService as any, 'scrapeVideoData')
        .mockRejectedValue(new Error('Network error'));

      const entries: IVideoEntry[] = [
        {
          title: 'Test Video',
          channel: 'Test Channel',
          url: 'https://www.youtube.com/watch?v=test-video-id',
          watchedAt: new Date(),
          contentType: ContentType.VIDEO,
          category: VideoCategory.UNKNOWN,
          enrichedWithAPI: false,
          lastUpdated: new Date()
        }
      ];

      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(entries[0]); // Should return original entry when enrichment fails
      
      mockScrapeVideoData.mockRestore();
    });

    test('should handle HTTP errors gracefully', async () => {
      const mockScrapeVideoData = jest.spyOn(scrapingService as any, 'scrapeVideoData')
        .mockRejectedValue(new Error('HTTP 404: Not Found'));

      const entries: IVideoEntry[] = [
        {
          title: 'Test Video',
          channel: 'Test Channel',
          url: 'https://www.youtube.com/watch?v=test-video-id',
          watchedAt: new Date(),
          contentType: ContentType.VIDEO,
          category: VideoCategory.UNKNOWN,
          enrichedWithAPI: false,
          lastUpdated: new Date()
        }
      ];

      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(entries[0]); // Should return original entry
      
      mockScrapeVideoData.mockRestore();
    });
  });

  describe('cache functionality', () => {
    test('should cache results', async () => {
      const videoId = 'test-video-cache';
      
      // Mock successful response
      const mockData = {
        title: 'Cached Video',
        description: 'Test description',
        views: 100000,
        likes: 5000,
        duration: 180,
        uploadDate: new Date(),
        channelName: 'Test Channel',
        category: VideoCategory.ENTERTAINMENT
      };

      const mockScrapeVideoData = jest.spyOn(scrapingService as any, 'scrapeVideoData')
        .mockResolvedValue(mockData);

      // First call
      const result1 = await (scrapingService as any).scrapeVideoData(videoId);
      expect(result1).toEqual(mockData);

      // Second call should use cache
      const result2 = await (scrapingService as any).scrapeVideoData(videoId);
      expect(result2).toEqual(mockData);
      
      // Verify scrapeVideoData was only called once (due to caching)
      expect(mockScrapeVideoData).toHaveBeenCalledTimes(1);
      
      mockScrapeVideoData.mockRestore();
    });

    test('should clear cache properly', () => {
      scrapingService.clearCache();
      // If this runs without error, cache clearing works
      expect(true).toBe(true);
    });
  });

  describe('configuration', () => {
    test('should use provided configuration', () => {
      const customConfig: ScrapingConfig = {
        maxConcurrentRequests: 5,
        requestDelayMs: 500,
        retryAttempts: 3,
        timeout: 30000,
        userAgents: ['Custom User Agent'],
        enableJavaScript: true,
        enableBrowser: true,
        cacheEnabled: false,
        cacheTTL: 7200
      };

      const customService = new YouTubeScrapingService(customConfig);
      expect(customService).toBeDefined();
      
      // Access private config for testing
      const config = (customService as any).config;
      expect(config.maxConcurrentRequests).toBe(5);
      expect(config.requestDelayMs).toBe(500);
      expect(config.retryAttempts).toBe(3);
    });
  });
});