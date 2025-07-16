import { 
  IVideoEntry, 
  ContentType, 
  VideoCategory 
} from '../models/VideoEntry';
import { 
  VideoMetrics, 
  ChannelMetrics, 
  CategoryMetrics,
  TemporalMetrics,
  DiscoveryMetrics,
  TrendMetrics,
  TimeSeriesPoint,
  PeriodComparison,
  emptyMetrics
} from '../models/Metrics';
import { logger } from '../utils/logger';

export class AnalyticsService {
  
  /**
   * Generate comprehensive metrics from video entries
   */
  public async generateMetrics(entries: IVideoEntry[]): Promise<VideoMetrics> {
    const startTime = Date.now();
    
    try {
      logger.info(`Generating metrics for ${entries.length} entries`);
      
      if (entries.length === 0) {
        return emptyMetrics;
      }

      // Calculate basic overview metrics
      const overview = this.calculateOverviewMetrics(entries);
      
      // Calculate content breakdowns
      const contentTypes = this.calculateContentTypeDistribution(entries);
      const categories = this.calculateCategoryMetrics(entries);
      const topChannels = this.calculateChannelMetrics(entries);
      
      // Calculate temporal patterns
      const temporal = this.calculateTemporalMetrics(entries);
      
      // Calculate discovery and engagement metrics
      const discovery = this.calculateDiscoveryMetrics(entries);
      
      // Calculate trend analysis
      const trends = this.calculateTrendMetrics(entries);
      
      // Calculate comparative analysis
      const comparisons = this.calculateComparativeMetrics(entries);
      
      // Calculate processing statistics
      const processing = this.calculateProcessingStats(entries);
      
      // Legacy compatibility
      const legacy = this.calculateLegacyMetrics(entries);

      const metrics: VideoMetrics = {
        // Overview
        ...overview,
        
        // Content breakdown
        contentTypes,
        categories,
        topChannels,
        
        // Analysis
        temporal,
        discovery,
        trends,
        comparisons,
        processing,
        
        // Legacy compatibility
        ...legacy,
        
        // Metadata
        generatedAt: new Date(),
        version: '2.0.0'
      };

      const processingTime = (Date.now() - startTime) / 1000;
      logger.info(`Metrics generation completed in ${processingTime}s`);
      
      return metrics;
      
    } catch (error) {
      logger.error('Error generating metrics:', error);
      return emptyMetrics;
    }
  }

  /**
   * Calculate basic overview metrics
   */
  private calculateOverviewMetrics(entries: IVideoEntry[]) {
    const totalVideos = entries.length;
    const totalWatchTime = entries.reduce((sum, entry) => {
      const duration = entry.duration || 300; // Default 5 minutes if unknown
      return sum + (duration / 60); // Convert to minutes
    }, 0);
    
    const averageWatchTime = totalVideos > 0 ? totalWatchTime / totalVideos : 0;
    const uniqueChannels = new Set(entries.map(e => e.channel)).size;
    
    const dates = entries.map(e => e.watchedAt).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0] || new Date();
    const end = dates[dates.length - 1] || new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    return {
      totalVideos,
      totalWatchTime: Math.round(totalWatchTime),
      averageWatchTime: Math.round(averageWatchTime * 10) / 10,
      uniqueChannels,
      dateRange: {
        start,
        end,
        totalDays
      }
    };
  }

  /**
   * Calculate content type distribution
   */
  private calculateContentTypeDistribution(entries: IVideoEntry[]): Record<ContentType, number> {
    const distribution: Record<ContentType, number> = {
      [ContentType.VIDEO]: 0,
      [ContentType.SHORT]: 0,
      [ContentType.LIVESTREAM]: 0,
      [ContentType.PREMIERE]: 0,
      [ContentType.AD]: 0,
      [ContentType.UNKNOWN]: 0
    };

    entries.forEach(entry => {
      distribution[entry.contentType]++;
    });

    return distribution;
  }

  /**
   * Calculate category metrics with trends
   */
  private calculateCategoryMetrics(entries: IVideoEntry[]): CategoryMetrics[] {
    const categoryData: Record<VideoCategory, {
      videoCount: number;
      totalWatchTime: number;
      totalDuration: number;
      channels: Set<string>;
    }> = {} as any;

    // Initialize category data
    Object.values(VideoCategory).forEach(category => {
      categoryData[category] = {
        videoCount: 0,
        totalWatchTime: 0,
        totalDuration: 0,
        channels: new Set()
      };
    });

    // Aggregate data
    entries.forEach(entry => {
      const category = entry.category;
      const data = categoryData[category];
      
      data.videoCount++;
      data.channels.add(entry.channel);
      
      const duration = entry.duration || 300; // Default 5 minutes
      data.totalWatchTime += duration / 60; // Convert to minutes
      data.totalDuration += duration;
    });

    const totalVideos = entries.length;
    
    return Object.entries(categoryData)
      .filter(([_, data]) => data.videoCount > 0)
      .map(([category, data]) => ({
        category: category as VideoCategory,
        videoCount: data.videoCount,
        totalWatchTime: Math.round(data.totalWatchTime),
        percentage: Math.round((data.videoCount / totalVideos) * 100 * 10) / 10,
        averageVideoLength: Math.round(data.totalDuration / data.videoCount),
        topChannels: Array.from(data.channels).slice(0, 5),
        trend: {
          monthOverMonth: this.calculatePeriodComparison(entries, category as VideoCategory, 'month'),
          yearOverYear: this.calculatePeriodComparison(entries, category as VideoCategory, 'year')
        }
      }))
      .sort((a, b) => b.videoCount - a.videoCount);
  }

  /**
   * Calculate channel metrics
   */
  private calculateChannelMetrics(entries: IVideoEntry[]): ChannelMetrics[] {
    const channelData: Record<string, {
      videoCount: number;
      totalWatchTime: number;
      totalDuration: number;
      dates: Date[];
      categories: Set<VideoCategory>;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      enrichedCount: number;
    }> = {};

    entries.forEach(entry => {
      if (!channelData[entry.channel]) {
        channelData[entry.channel] = {
          videoCount: 0,
          totalWatchTime: 0,
          totalDuration: 0,
          dates: [],
          categories: new Set(),
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          enrichedCount: 0
        };
      }

      const data = channelData[entry.channel];
      data.videoCount++;
      data.dates.push(entry.watchedAt);
      data.categories.add(entry.category);

      const duration = entry.duration || 300;
      data.totalWatchTime += duration / 60;
      data.totalDuration += duration;

      if (entry.enrichedWithAPI) {
        data.enrichedCount++;
        data.totalViews += entry.viewCount || 0;
        data.totalLikes += entry.likeCount || 0;
        data.totalComments += entry.commentCount || 0;
      }
    });

    return Object.entries(channelData)
      .map(([channelName, data]) => {
        const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
        const mostCommonCategory = Array.from(data.categories)[0] || VideoCategory.UNKNOWN;
        
        return {
          channelName,
          videoCount: data.videoCount,
          totalWatchTime: Math.round(data.totalWatchTime),
          averageVideoLength: Math.round(data.totalDuration / data.videoCount),
          firstWatched: sortedDates[0],
          lastWatched: sortedDates[sortedDates.length - 1],
          category: mostCommonCategory,
          isSubscribed: undefined, // Would need OAuth to determine
          engagement: {
            averageViews: data.enrichedCount > 0 ? Math.round(data.totalViews / data.enrichedCount) : 0,
            averageLikes: data.enrichedCount > 0 ? Math.round(data.totalLikes / data.enrichedCount) : 0,
            averageComments: data.enrichedCount > 0 ? Math.round(data.totalComments / data.enrichedCount) : 0
          }
        };
      })
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 20); // Top 20 channels
  }

  /**
   * Calculate temporal viewing patterns
   */
  private calculateTemporalMetrics(entries: IVideoEntry[]): TemporalMetrics {
    const hourlyDistribution: Record<string, number> = {};
    const dayOfWeekDistribution: Record<string, number> = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
      'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };
    const monthlyDistribution: Record<string, number> = {};
    const seasonalCounts = { spring: 0, summer: 0, fall: 0, winter: 0 };

    // Initialize hourly distribution
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i.toString()] = 0;
    }

    entries.forEach(entry => {
      const date = entry.watchedAt;
      
      // Hour distribution
      const hour = date.getHours();
      hourlyDistribution[hour.toString()]++;
      
      // Day of week
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekDistribution[dayOfWeek]++;
      
      // Monthly distribution
      const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
      
      // Seasonal patterns
      const month_num = date.getMonth();
      if (month_num >= 2 && month_num <= 4) seasonalCounts.spring++;
      else if (month_num >= 5 && month_num <= 7) seasonalCounts.summer++;
      else if (month_num >= 8 && month_num <= 10) seasonalCounts.fall++;
      else seasonalCounts.winter++;
    });

    // Find peak hours and days
    const peakHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, ]) => `${hour}:00`);

    const peakDays = Object.entries(dayOfWeekDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day, ]) => day);

    return {
      hourlyDistribution,
      dayOfWeekDistribution,
      monthlyDistribution,
      seasonalPatterns: seasonalCounts,
      peakHours,
      peakDays
    };
  }

  /**
   * Calculate discovery and engagement metrics
   */
  private calculateDiscoveryMetrics(entries: IVideoEntry[]): DiscoveryMetrics {
    const discoveryMethods: Record<string, number> = {};
    let subscribedCount = 0;
    let totalSessionLength = 0;
    let completedVideos = 0;

    entries.forEach(entry => {
      // Discovery method (if available)
      const method = entry.discoveryMethod || 'unknown';
      discoveryMethods[method] = (discoveryMethods[method] || 0) + 1;
      
      // Subscription status
      if (entry.isSubscribed === true) subscribedCount++;
      
      // Completion rate (if available)
      if (entry.completionPercentage && entry.completionPercentage >= 80) {
        completedVideos++;
      }
    });

    const subscriptionRate = entries.length > 0 ? subscribedCount / entries.length : 0;
    const contentCompletionRate = entries.length > 0 ? completedVideos / entries.length : 0;

    return {
      discoveryMethods,
      subscriptionRate: Math.round(subscriptionRate * 100) / 100,
      averageSessionLength: 0, // Would need session grouping logic
      contentCompletionRate: Math.round(contentCompletionRate * 100) / 100,
      bingeBehavior: {
        averageVideosPerSession: 0, // Would need session analysis
        longestSession: 0,
        channelLoyalty: 0
      }
    };
  }

  /**
   * Calculate trend metrics over time
   */
  private calculateTrendMetrics(entries: IVideoEntry[]): TrendMetrics {
    // Group entries by time periods
    const dailyData = this.groupEntriesByPeriod(entries, 'day');
    const weeklyData = this.groupEntriesByPeriod(entries, 'week');
    const monthlyData = this.groupEntriesByPeriod(entries, 'month');

    return {
      watchTime: {
        daily: this.convertToTimeSeriesPoints(dailyData),
        weekly: this.convertToTimeSeriesPoints(weeklyData),
        monthly: this.convertToTimeSeriesPoints(monthlyData)
      },
      contentTypes: {
        [ContentType.VIDEO]: [],
        [ContentType.SHORT]: [],
        [ContentType.LIVESTREAM]: [],
        [ContentType.PREMIERE]: [],
        [ContentType.AD]: [],
        [ContentType.UNKNOWN]: []
      },
      categories: {} as any,
      topChannels: []
    };
  }

  /**
   * Calculate comparative metrics (period over period)
   */
  private calculateComparativeMetrics(entries: IVideoEntry[]): {
    monthOverMonth: PeriodComparison;
    yearOverYear: PeriodComparison;
    quarterOverQuarter: PeriodComparison;
  } {
    const now = new Date();
    
    return {
      monthOverMonth: this.calculatePeriodComparison(entries, undefined, 'month'),
      yearOverYear: this.calculatePeriodComparison(entries, undefined, 'year'),
      quarterOverQuarter: this.calculatePeriodComparison(entries, undefined, 'quarter')
    };
  }

  /**
   * Calculate processing statistics
   */
  private calculateProcessingStats(entries: IVideoEntry[]) {
    const enrichedCount = entries.filter(e => e.enrichedWithAPI).length;
    const errorsCount = entries.filter(e => e.processingErrors && e.processingErrors.length > 0).length;
    
    return {
      totalVideosProcessed: entries.length,
      enrichedWithAPI: enrichedCount,
      processingErrors: errorsCount,
      processingTime: 0, // Set by calling function
      dataQuality: {
        completeEntries: enrichedCount,
        partialEntries: entries.length - enrichedCount,
        duplicatesRemoved: 0 // Set during processing
      },
      apiUsage: {
        quotaUsed: 0,
        quotaRemaining: 0,
        requestsMade: 0
      }
    };
  }

  /**
   * Calculate legacy metrics for backwards compatibility
   */
  private calculateLegacyMetrics(entries: IVideoEntry[]) {
    const channelDistribution: Record<string, number> = {};
    const dayOfWeekDistribution: Record<string, number> = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
      'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    entries.forEach(entry => {
      // Channel distribution
      channelDistribution[entry.channel] = (channelDistribution[entry.channel] || 0) + 1;
      
      // Day of week
      const dayOfWeek = entry.watchedAt.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekDistribution[dayOfWeek]++;
    });

    const mostWatchedChannels = Object.entries(channelDistribution)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const filteredAdsCount = entries.filter(e => e.contentType === ContentType.AD).length;
    const filteredShortsCount = entries.filter(e => e.contentType === ContentType.SHORT).length;

    return {
      channelDistribution,
      dayOfWeekDistribution,
      mostWatchedChannels,
      filteredAdsCount,
      filteredShortsCount,
      includingAds: filteredAdsCount > 0,
      includingShorts: filteredShortsCount > 0
    };
  }

  /**
   * Helper methods
   */
  private calculatePeriodComparison(
    entries: IVideoEntry[], 
    category?: VideoCategory, 
    period: 'month' | 'year' | 'quarter' = 'month'
  ): PeriodComparison {
    const now = new Date();
    let periodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    if (period === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'year') {
      periodStart = new Date(now.getFullYear(), 0, 1);
      previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
      previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31);
    } else { // quarter
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      previousPeriodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      previousPeriodEnd = new Date(now.getFullYear(), quarter * 3, 0);
    }

    const currentPeriodEntries = entries.filter(e => 
      e.watchedAt >= periodStart && 
      (!category || e.category === category)
    );
    
    const previousPeriodEntries = entries.filter(e => 
      e.watchedAt >= previousPeriodStart && 
      e.watchedAt <= previousPeriodEnd &&
      (!category || e.category === category)
    );

    const current = currentPeriodEntries.length;
    const previous = previousPeriodEntries.length;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      changePercentage: Math.round(changePercentage * 10) / 10
    };
  }

  private groupEntriesByPeriod(entries: IVideoEntry[], period: 'day' | 'week' | 'month'): Record<string, IVideoEntry[]> {
    const grouped: Record<string, IVideoEntry[]> = {};

    entries.forEach(entry => {
      let key: string;
      const date = entry.watchedAt;

      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    return grouped;
  }

  private convertToTimeSeriesPoints(groupedData: Record<string, IVideoEntry[]>): TimeSeriesPoint[] {
    return Object.entries(groupedData)
      .map(([date, entries]) => ({
        date: new Date(date),
        value: entries.length,
        label: date
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}