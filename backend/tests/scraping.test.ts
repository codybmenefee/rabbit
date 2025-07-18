import { YouTubeScrapingService, ScrapingConfig } from '../src/services/YouTubeScrapingService';
import { IVideoEntry, ContentType, VideoCategory } from '../src/models/VideoEntry';

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

    test('should return null for invalid URL', () => {
      const url = 'https://example.com/not-a-youtube-url';
      const videoId = scrapingService.extractVideoId(url);
      expect(videoId).toBeNull();
    });
  });

  describe('enrichVideoEntries', () => {
    test('should handle empty entries array', async () => {
      const entries: IVideoEntry[] = [];
      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result).toEqual([]);
    });

    test('should handle entries without valid video IDs', async () => {
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
      expect(result.length).toBe(1);
      expect(result[0].enrichedWithAPI).toBe(false);
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
      
      // Mock the scrapeVideoData method to avoid actual HTTP requests
      const mockScrapedData = {
        title: 'Never Gonna Give You Up',
        channelName: 'RickAstleyVEVO',
        duration: 213,
        viewCount: 1000000
      };
      
      jest.spyOn(scrapingService, 'scrapeVideoData').mockResolvedValue(mockScrapedData);
      
      const result = await scrapingService.enrichVideoEntries(entries);
      expect(result.length).toBe(1);
      expect(result[0].videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('data extraction utilities', () => {
    test('should normalize view count correctly', () => {
      const testCases = [
        { input: '1,000,000 views', expected: 1000000 },
        { input: '1.5M views', expected: 1500000 },
        { input: '500K views', expected: 500000 },
        { input: '1.2B views', expected: 1200000000 },
        { input: '123 views', expected: 123 },
        { input: 'invalid', expected: 0 }
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
        { input: 'invalid', expected: 0 }
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
        { input: 'Title\u0000with\u001Fcontrol\u007Fchars', expected: 'Title with control chars' },
        { input: '', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (scrapingService as any).sanitizeTitle(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('error handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      try {
        await scrapingService.scrapeVideoData('test-video-id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    test('should handle HTTP errors gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      global.fetch = mockFetch;

      try {
        await scrapingService.scrapeVideoData('test-video-id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('HTTP 404: Not Found');
      }
    });
  });

  describe('caching', () => {
    test('should cache successful scraping results', async () => {
      const mockScrapedData = {
        title: 'Test Video',
        channelName: 'Test Channel',
        duration: 180
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><title>Test Video - YouTube</title></html>')
      });
      global.fetch = mockFetch;

      // Mock the extraction method
      jest.spyOn(scrapingService as any, 'extractAllData').mockResolvedValue(mockScrapedData);

      // First call should hit the network
      const result1 = await scrapingService.scrapeVideoData('test-video-id');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockScrapedData);

      // Second call should use cache
      const result2 = await scrapingService.scrapeVideoData('test-video-id');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(mockScrapedData);
    });
  });

  describe('circuit breaker', () => {
    test('should track scraping statistics', () => {
      const stats = scrapingService.getScrapingStats();
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('circuitBreakerOpen');
    });
  });

  describe('content type classification', () => {
    test('should classify YouTube Shorts correctly', () => {
      const entry: IVideoEntry = {
        title: 'Short Video',
        channel: 'Channel',
        url: 'https://www.youtube.com/shorts/abc123',
        watchedAt: new Date(),
        contentType: ContentType.VIDEO,
        category: VideoCategory.UNKNOWN,
        enrichedWithAPI: false,
        lastUpdated: new Date(),
        duration: 30
      };

      const result = (scrapingService as any).classifyContentType(entry);
      expect(result).toBe(ContentType.SHORT);
    });

    test('should classify regular videos correctly', () => {
      const entry: IVideoEntry = {
        title: 'Regular Video',
        channel: 'Channel',
        url: 'https://www.youtube.com/watch?v=abc123',
        watchedAt: new Date(),
        contentType: ContentType.VIDEO,
        category: VideoCategory.UNKNOWN,
        enrichedWithAPI: false,
        lastUpdated: new Date(),
        duration: 300
      };

      const result = (scrapingService as any).classifyContentType(entry);
      expect(result).toBe(ContentType.VIDEO);
    });
  });
});

// Integration tests with real YouTube URLs (these should be run sparingly)
describe('YouTubeScrapingService Integration Tests', () => {
  let scrapingService: YouTubeScrapingService;
  
  const integrationConfig: ScrapingConfig = {
    maxConcurrentRequests: 1,
    requestDelayMs: 3000, // Be respectful with real requests
    retryAttempts: 1,
    timeout: 30000,
    userAgents: [],
    enableJavaScript: false,
    enableBrowser: false,
    cacheEnabled: true,
    cacheTTL: 3600
  };

  beforeAll(() => {
    scrapingService = new YouTubeScrapingService(integrationConfig);
  });

  afterAll(() => {
    scrapingService.clearCache();
  });

  // Skip these tests by default to avoid hitting YouTube's servers during normal testing
  describe.skip('Real YouTube scraping', () => {
    test('should scrape data from a real YouTube video', async () => {
      // Using Rick Astley's "Never Gonna Give You Up" as a stable test case
      const videoId = 'dQw4w9WgXcQ';
      
      const result = await scrapingService.scrapeVideoData(videoId);
      
      expect(result).toBeTruthy();
      expect(result?.title).toBeTruthy();
      expect(result?.channelName).toBeTruthy();
      expect(result?.duration).toBeGreaterThan(0);
    }, 60000); // 60 second timeout for network requests

    test('should handle non-existent video gracefully', async () => {
      const videoId = 'nonexistent123';
      
      try {
        const result = await scrapingService.scrapeVideoData(videoId);
        // Should either return null or throw an error
        expect(result).toBeNull();
      } catch (error) {
        // This is also acceptable behavior
        expect(error).toBeTruthy();
      }
    }, 60000);
  });
});