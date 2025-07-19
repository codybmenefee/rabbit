import { AnalyticsService } from '../../../../backend/src/services/AnalyticsService';
import { IVideoEntry, ContentType, VideoCategory } from '../../../../backend/src/models/VideoEntry';
import { VideoMetrics } from '../../../../backend/src/models/Metrics';
import { mockVideoEntry } from '../../helpers/setup';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockVideoEntries: IVideoEntry[];

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    
    mockVideoEntries = [
      {
        ...mockVideoEntry,
        category: VideoCategory.ENTERTAINMENT,
        watchedAt: new Date('2023-10-01T12:00:00Z'),
        duration: 300, // 5 minutes
        channel: 'Channel A'
      },
      {
        ...mockVideoEntry,
        title: 'Music Video',
        category: VideoCategory.MUSIC,
        watchedAt: new Date('2023-10-02T14:30:00Z'),
        duration: 180, // 3 minutes
        channel: 'Channel B'
      },
      {
        ...mockVideoEntry,
        title: 'Educational Content',
        category: VideoCategory.EDUCATION,
        watchedAt: new Date('2023-10-03T16:45:00Z'),
        duration: 600, // 10 minutes
        channel: 'Channel A'
      },
      {
        ...mockVideoEntry,
        title: 'Gaming Video',
        category: VideoCategory.GAMING,
        watchedAt: new Date('2023-10-04T18:20:00Z'),
        duration: 420, // 7 minutes
        channel: 'Channel C'
      }
    ];
  });

  describe('generateMetrics', () => {
    test('should generate comprehensive metrics for video entries', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      // Test basic overview metrics
      expect(metrics.totalVideos).toBe(4);
      expect(metrics.totalWatchTime).toBeGreaterThan(0);
      expect(metrics.averageWatchTime).toBeGreaterThan(0);
      expect(metrics.uniqueChannels).toBe(3);
      
      // Test date range
      expect(metrics.dateRange.start).toBeInstanceOf(Date);
      expect(metrics.dateRange.end).toBeInstanceOf(Date);
      expect(metrics.dateRange.totalDays).toBeGreaterThan(0);
    });

    test('should calculate content type distribution correctly', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.contentTypes).toBeDefined();
      expect(typeof metrics.contentTypes[ContentType.VIDEO]).toBe('number');
      expect(typeof metrics.contentTypes[ContentType.SHORT]).toBe('number');
    });

    test('should return empty metrics for empty input', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics([]);
      
      expect(metrics.totalVideos).toBe(0);
      expect(metrics.totalWatchTime).toBe(0);
      expect(metrics.uniqueChannels).toBe(0);
    });

    test('should handle entries with missing duration gracefully', async () => {
      const entriesNoDuration = mockVideoEntries.map(entry => ({
        ...entry,
        duration: undefined
      }));
      
      const metrics: VideoMetrics = await analyticsService.generateMetrics(entriesNoDuration);
      
      expect(metrics.totalVideos).toBe(4);
      expect(metrics.uniqueChannels).toBe(3);
      // Total watch time might be 0 or calculated differently when duration is missing
      expect(metrics.totalWatchTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('category breakdown', () => {
    test('should calculate category metrics correctly', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.categories).toBeDefined();
      expect(Array.isArray(metrics.categories)).toBe(true);
      expect(metrics.categories.length).toBeGreaterThan(0);
      
      // Find entertainment category
      const entertainment = metrics.categories.find(cat => cat.category === VideoCategory.ENTERTAINMENT);
      expect(entertainment).toBeDefined();
      expect(entertainment?.videoCount).toBe(1);
      
      // Find music category
      const music = metrics.categories.find(cat => cat.category === VideoCategory.MUSIC);
      expect(music).toBeDefined();
      expect(music?.videoCount).toBe(1);
    });

    test('should sort categories by count (descending)', async () => {
      const extendedEntries = [
        ...mockVideoEntries,
        { ...mockVideoEntry, category: VideoCategory.ENTERTAINMENT },
        { ...mockVideoEntry, category: VideoCategory.ENTERTAINMENT },
        { ...mockVideoEntry, category: VideoCategory.MUSIC }
      ];

      const metrics: VideoMetrics = await analyticsService.generateMetrics(extendedEntries);
      
      expect(metrics.categories[0].category).toBe(VideoCategory.ENTERTAINMENT);
      expect(metrics.categories[0].videoCount).toBe(3);
      expect(metrics.categories[1].category).toBe(VideoCategory.MUSIC);
      expect(metrics.categories[1].videoCount).toBe(2);
    });

    test('should calculate percentages correctly for single category', async () => {
      const singleCategoryEntries = [
        { ...mockVideoEntry, category: VideoCategory.MUSIC },
        { ...mockVideoEntry, category: VideoCategory.MUSIC }
      ];

      const metrics: VideoMetrics = await analyticsService.generateMetrics(singleCategoryEntries);
      
      expect(metrics.categories).toHaveLength(1);
      expect(metrics.categories[0].percentage).toBe(100);
    });

    test('should handle empty categories array', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics([]);
      
      expect(metrics.categories).toEqual([]);
    });
  });

  describe('channel analysis', () => {
    test('should calculate top channels correctly', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.topChannels).toBeDefined();
      expect(Array.isArray(metrics.topChannels)).toBe(true);
      expect(metrics.topChannels.length).toBeGreaterThan(0);
      
      // Channel A should have 2 videos
      const channelA = metrics.topChannels.find(ch => ch.channelName === 'Channel A');
      expect(channelA).toBeDefined();
      expect(channelA?.videoCount).toBe(2);
    });

    test('should calculate channel watch times correctly', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      const channelA = metrics.topChannels.find(ch => ch.channelName === 'Channel A');
      expect(channelA?.totalWatchTime).toBeGreaterThan(0);
    });
  });

  describe('temporal analysis', () => {
    test('should calculate temporal metrics', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.temporal).toBeDefined();
      expect(metrics.temporal.hourlyDistribution).toBeDefined();
      expect(metrics.temporal.dayOfWeekDistribution).toBeDefined();
      expect(metrics.temporal.monthlyDistribution).toBeDefined();
    });
  });

  describe('discovery metrics', () => {
    test('should calculate discovery metrics', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.discovery).toBeDefined();
      expect(typeof metrics.discovery.subscriptionRate).toBe('number');
      expect(typeof metrics.discovery.contentCompletionRate).toBe('number');
    });
  });

  describe('trend analysis', () => {
    test('should calculate trend metrics', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.trends).toBeDefined();
      expect(metrics.trends.watchTime).toBeDefined();
      expect(metrics.trends.categories).toBeDefined();
      expect(metrics.trends.topChannels).toBeDefined();
    });
  });

  describe('performance and robustness', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000).fill(null).map((_, index) => ({
        ...mockVideoEntry,
        title: `Video ${index}`,
        watchedAt: new Date(`2023-10-${(index % 30) + 1}T12:00:00Z`),
        channel: `Channel ${index % 10}`
      }));

      const startTime = Date.now();
      const metrics: VideoMetrics = await analyticsService.generateMetrics(largeDataset);
      const endTime = Date.now();
      
      expect(metrics.totalVideos).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle malformed entries gracefully', async () => {
      const malformedEntries = mockVideoEntries.map(entry => ({
        ...entry,
        watchedAt: null as any,
        duration: 'invalid' as any
      }));

      expect(async () => {
        await analyticsService.generateMetrics(malformedEntries);
      }).not.toThrow();
    });

    test('should maintain precision with decimal calculations', async () => {
      const precisionEntries = [
        { ...mockVideoEntry, duration: 123.456 },
        { ...mockVideoEntry, duration: 789.123 }
      ];

      const metrics: VideoMetrics = await analyticsService.generateMetrics(precisionEntries);
      
      expect(metrics.totalWatchTime).toBeCloseTo(15.2, 1); // (123.456 + 789.123) / 60 minutes
    });
  });

  describe('processing metadata', () => {
    test('should include processing statistics', async () => {
      const metrics: VideoMetrics = await analyticsService.generateMetrics(mockVideoEntries);
      
      expect(metrics.processing).toBeDefined();
      expect(typeof metrics.processing.processingTime).toBe('number');
      expect(typeof metrics.processing.enrichedWithAPI).toBe('number');
      expect(typeof metrics.processing.totalVideosProcessed).toBe('number');
    });
  });
});