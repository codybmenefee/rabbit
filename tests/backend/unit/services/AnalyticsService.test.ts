import { AnalyticsService } from '../../../../backend/src/services/AnalyticsService';
import { IVideoEntry, ContentType, VideoCategory } from '../../../../backend/src/models/VideoEntry';
import { mockVideoEntry, mockAnalyticsData } from '../../helpers/setup';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockVideoEntries: IVideoEntry[];

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    
    mockVideoEntries = [
      {
        ...mockVideoEntry,
        category: VideoCategory.Entertainment,
        watchedAt: new Date('2023-10-01T12:00:00Z'),
        duration: 300, // 5 minutes
        channelName: 'Channel A'
      },
      {
        ...mockVideoEntry,
        title: 'Music Video',
        category: VideoCategory.Music,
        watchedAt: new Date('2023-10-02T14:30:00Z'),
        duration: 180, // 3 minutes
        channelName: 'Channel B'
      },
      {
        ...mockVideoEntry,
        title: 'Educational Content',
        category: VideoCategory.Education,
        watchedAt: new Date('2023-10-03T16:45:00Z'),
        duration: 600, // 10 minutes
        channelName: 'Channel A'
      },
      {
        ...mockVideoEntry,
        title: 'Gaming Video',
        category: VideoCategory.Gaming,
        watchedAt: new Date('2023-10-04T18:20:00Z'),
        duration: 420, // 7 minutes
        channelName: 'Channel C'
      }
    ];
  });

  describe('calculateBasicMetrics', () => {
    test('should calculate total videos correctly', () => {
      const metrics = analyticsService.calculateBasicMetrics(mockVideoEntries);
      
      expect(metrics.totalVideos).toBe(4);
    });

    test('should calculate total watch time correctly', () => {
      const metrics = analyticsService.calculateBasicMetrics(mockVideoEntries);
      
      // 300 + 180 + 600 + 420 = 1500 seconds = 25 minutes
      expect(metrics.totalWatchTime).toBe(1500);
    });

    test('should calculate average watch time correctly', () => {
      const metrics = analyticsService.calculateBasicMetrics(mockVideoEntries);
      
      // 1500 / 4 = 375 seconds = 6.25 minutes
      expect(metrics.averageWatchTime).toBe(375);
    });

    test('should handle empty array', () => {
      const metrics = analyticsService.calculateBasicMetrics([]);
      
      expect(metrics.totalVideos).toBe(0);
      expect(metrics.totalWatchTime).toBe(0);
      expect(metrics.averageWatchTime).toBe(0);
    });

    test('should handle videos with no duration', () => {
      const entriesNoDuration = mockVideoEntries.map(entry => ({
        ...entry,
        duration: undefined
      }));

      const metrics = analyticsService.calculateBasicMetrics(entriesNoDuration);
      
      expect(metrics.totalVideos).toBe(4);
      expect(metrics.totalWatchTime).toBe(0);
      expect(metrics.averageWatchTime).toBe(0);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    test('should calculate category distribution correctly', () => {
      const breakdown = analyticsService.calculateCategoryBreakdown(mockVideoEntries);
      
      expect(breakdown).toHaveLength(4);
      
      const entertainment = breakdown.find(cat => cat.category === VideoCategory.Entertainment);
      expect(entertainment?.count).toBe(1);
      expect(entertainment?.percentage).toBe(25);
      
      const music = breakdown.find(cat => cat.category === VideoCategory.Music);
      expect(music?.count).toBe(1);
      expect(music?.percentage).toBe(25);
    });

    test('should sort categories by count in descending order', () => {
      // Add more entries to test sorting
      const extendedEntries = [
        ...mockVideoEntries,
        { ...mockVideoEntry, category: VideoCategory.Entertainment },
        { ...mockVideoEntry, category: VideoCategory.Entertainment },
        { ...mockVideoEntry, category: VideoCategory.Music }
      ];

      const breakdown = analyticsService.calculateCategoryBreakdown(extendedEntries);
      
      expect(breakdown[0].category).toBe(VideoCategory.Entertainment);
      expect(breakdown[0].count).toBe(3);
      expect(breakdown[1].category).toBe(VideoCategory.Music);
      expect(breakdown[1].count).toBe(2);
    });

    test('should handle empty array', () => {
      const breakdown = analyticsService.calculateCategoryBreakdown([]);
      expect(breakdown).toEqual([]);
    });

    test('should calculate percentages correctly for single category', () => {
      const singleCategoryEntries = [
        { ...mockVideoEntry, category: VideoCategory.Music },
        { ...mockVideoEntry, category: VideoCategory.Music }
      ];

      const breakdown = analyticsService.calculateCategoryBreakdown(singleCategoryEntries);
      
      expect(breakdown).toHaveLength(1);
      expect(breakdown[0].percentage).toBe(100);
    });
  });

  describe('calculateTopChannels', () => {
    test('should calculate top channels correctly', () => {
      const topChannels = analyticsService.calculateTopChannels(mockVideoEntries);
      
      expect(topChannels).toHaveLength(3);
      
      const channelA = topChannels.find(ch => ch.channelName === 'Channel A');
      expect(channelA?.videoCount).toBe(2);
      expect(channelA?.totalWatchTime).toBe(900); // 300 + 600
      
      const channelB = topChannels.find(ch => ch.channelName === 'Channel B');
      expect(channelB?.videoCount).toBe(1);
      expect(channelB?.totalWatchTime).toBe(180);
    });

    test('should sort channels by video count descending', () => {
      const topChannels = analyticsService.calculateTopChannels(mockVideoEntries);
      
      expect(topChannels[0].channelName).toBe('Channel A');
      expect(topChannels[0].videoCount).toBe(2);
    });

    test('should limit results to specified count', () => {
      const topChannels = analyticsService.calculateTopChannels(mockVideoEntries, 2);
      expect(topChannels).toHaveLength(2);
    });

    test('should handle entries without channel names', () => {
      const entriesNoChannel = mockVideoEntries.map(entry => ({
        ...entry,
        channelName: undefined
      }));

      const topChannels = analyticsService.calculateTopChannels(entriesNoChannel);
      
      expect(topChannels).toHaveLength(1);
      expect(topChannels[0].channelName).toBe('Unknown Channel');
    });
  });

  describe('calculateWatchTimeByPeriod', () => {
    test('should calculate monthly watch time correctly', () => {
      const monthlyData = analyticsService.calculateWatchTimeByPeriod(mockVideoEntries, 'month');
      
      expect(monthlyData).toHaveLength(1); // All entries are in October 2023
      expect(monthlyData[0].period).toBe('2023-10');
      expect(monthlyData[0].totalTime).toBe(1500);
      expect(monthlyData[0].videoCount).toBe(4);
    });

    test('should calculate weekly watch time correctly', () => {
      const weeklyData = analyticsService.calculateWatchTimeByPeriod(mockVideoEntries, 'week');
      
      expect(weeklyData.length).toBeGreaterThan(0);
      expect(weeklyData[0]).toHaveProperty('period');
      expect(weeklyData[0]).toHaveProperty('totalTime');
      expect(weeklyData[0]).toHaveProperty('videoCount');
    });

    test('should calculate daily watch time correctly', () => {
      const dailyData = analyticsService.calculateWatchTimeByPeriod(mockVideoEntries, 'day');
      
      expect(dailyData).toHaveLength(4); // One entry per day
      expect(dailyData[0].period).toBe('2023-10-01');
      expect(dailyData[0].totalTime).toBe(300);
      expect(dailyData[0].videoCount).toBe(1);
    });

    test('should handle empty array', () => {
      const result = analyticsService.calculateWatchTimeByPeriod([], 'month');
      expect(result).toEqual([]);
    });

    test('should sort periods chronologically', () => {
      const dailyData = analyticsService.calculateWatchTimeByPeriod(mockVideoEntries, 'day');
      
      // Should be sorted by date ascending
      expect(new Date(dailyData[0].period)).toEqual(new Date('2023-10-01'));
      expect(new Date(dailyData[1].period)).toEqual(new Date('2023-10-02'));
      expect(new Date(dailyData[2].period)).toEqual(new Date('2023-10-03'));
      expect(new Date(dailyData[3].period)).toEqual(new Date('2023-10-04'));
    });
  });

  describe('calculateViewingPatterns', () => {
    test('should identify peak viewing hours', () => {
      const patterns = analyticsService.calculateViewingPatterns(mockVideoEntries);
      
      expect(patterns).toHaveProperty('peakHours');
      expect(patterns.peakHours).toBeInstanceOf(Array);
      expect(patterns.peakHours.length).toBeGreaterThan(0);
    });

    test('should identify favorite categories', () => {
      const patterns = analyticsService.calculateViewingPatterns(mockVideoEntries);
      
      expect(patterns).toHaveProperty('favoriteCategories');
      expect(patterns.favoriteCategories).toBeInstanceOf(Array);
      expect(patterns.favoriteCategories[0]).toHaveProperty('category');
      expect(patterns.favoriteCategories[0]).toHaveProperty('percentage');
    });

    test('should calculate average session length', () => {
      const patterns = analyticsService.calculateViewingPatterns(mockVideoEntries);
      
      expect(patterns).toHaveProperty('averageSessionLength');
      expect(typeof patterns.averageSessionLength).toBe('number');
      expect(patterns.averageSessionLength).toBeGreaterThan(0);
    });

    test('should handle empty data gracefully', () => {
      const patterns = analyticsService.calculateViewingPatterns([]);
      
      expect(patterns.peakHours).toEqual([]);
      expect(patterns.favoriteCategories).toEqual([]);
      expect(patterns.averageSessionLength).toBe(0);
    });
  });

  describe('generateInsights', () => {
    test('should generate meaningful insights', () => {
      const insights = analyticsService.generateInsights(mockVideoEntries);
      
      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      
      insights.forEach(insight => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('value');
      });
    });

    test('should include top category insight', () => {
      const insights = analyticsService.generateInsights(mockVideoEntries);
      
      const categoryInsight = insights.find(insight => insight.type === 'category');
      expect(categoryInsight).toBeDefined();
      expect(categoryInsight?.title).toContain('category');
    });

    test('should include watch time insight', () => {
      const insights = analyticsService.generateInsights(mockVideoEntries);
      
      const timeInsight = insights.find(insight => insight.type === 'time');
      expect(timeInsight).toBeDefined();
      expect(timeInsight?.value).toBeGreaterThan(0);
    });

    test('should handle edge cases', () => {
      const singleEntry = [mockVideoEntries[0]];
      const insights = analyticsService.generateInsights(singleEntry);
      
      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('performance and edge cases', () => {
    test('should handle large datasets efficiently', () => {
      // Generate a large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...mockVideoEntry,
        title: `Video ${i}`,
        watchedAt: new Date(2023, 0, 1 + (i % 365)),
        category: Object.values(VideoCategory)[i % Object.values(VideoCategory).length],
        channelName: `Channel ${i % 100}`
      }));

      const startTime = Date.now();
      const metrics = analyticsService.calculateBasicMetrics(largeDataset);
      const endTime = Date.now();

      expect(metrics.totalVideos).toBe(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle malformed data gracefully', () => {
      const malformedEntries = [
        { ...mockVideoEntry, watchedAt: null as any },
        { ...mockVideoEntry, duration: -100 },
        { ...mockVideoEntry, category: 'InvalidCategory' as any },
        { ...mockVideoEntry, channelName: '' }
      ];

      expect(() => {
        analyticsService.calculateBasicMetrics(malformedEntries);
        analyticsService.calculateCategoryBreakdown(malformedEntries);
        analyticsService.calculateTopChannels(malformedEntries);
      }).not.toThrow();
    });

    test('should maintain precision in calculations', () => {
      const precisionEntries = [
        { ...mockVideoEntry, duration: 33.33 },
        { ...mockVideoEntry, duration: 66.67 },
        { ...mockVideoEntry, duration: 100.00 }
      ];

      const metrics = analyticsService.calculateBasicMetrics(precisionEntries);
      
      expect(metrics.totalWatchTime).toBeCloseTo(200, 2);
      expect(metrics.averageWatchTime).toBeCloseTo(66.67, 2);
    });
  });
});