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
import { logger, createTimer } from '../utils/logger';

export class AnalyticsService {
  
  /**
   * Generate comprehensive metrics from video entries
   */
  public async generateMetrics(entries: IVideoEntry[]): Promise<VideoMetrics> {
    const timer = createTimer('Analytics Generation');
    
    try {
      logger.info(`Generating metrics for ${entries.length} entries`);
      logger.debug('Analytics generation started', {
        totalEntries: entries.length,
        enrichedEntries: entries.filter(e => e.enrichedWithAPI).length,
        enrichmentRate: entries.length > 0 ? ((entries.filter(e => e.enrichedWithAPI).length / entries.length) * 100).toFixed(1) + '%' : '0%'
      });
      
      if (entries.length === 0) {
        logger.warn('No entries provided for metrics generation');
        timer.end({ success: false, reason: 'no_entries' });
        return emptyMetrics;
      }

      // Calculate basic overview metrics
      timer.stage('Overview Metrics');
      const overview = this.calculateOverviewMetrics(entries);
      logger.debug('Overview metrics calculated', {
        totalVideos: overview.totalVideos,
        totalWatchTime: overview.totalWatchTime,
        uniqueChannels: overview.uniqueChannels,
        dateRange: {
          start: overview.dateRange.start.toISOString(),
          end: overview.dateRange.end.toISOString(),
          totalDays: overview.dateRange.totalDays
        }
      });
      
      // Calculate content breakdowns
      timer.stage('Content Type Distribution');
      const contentTypes = this.calculateContentTypeDistribution(entries);
      logger.debug('Content type distribution calculated', {
        distribution: contentTypes,
        totalEntries: Object.values(contentTypes).reduce((sum, count) => sum + count, 0)
      });
      
      timer.stage('Category Metrics');
      const categories = this.calculateCategoryMetrics(entries);
      logger.debug('Category metrics calculated', {
        categoriesFound: categories.length,
        topCategories: categories.slice(0, 5).map(c => ({ category: c.category, count: c.videoCount }))
      });
      
      timer.stage('Channel Metrics');
      const topChannels = this.calculateChannelMetrics(entries);
      logger.debug('Channel metrics calculated', {
        channelsFound: topChannels.length,
        topChannels: topChannels.slice(0, 5).map(c => ({ name: c.channelName, count: c.videoCount }))
      });
      
      // Calculate temporal patterns
      timer.stage('Temporal Metrics');
      const temporal = this.calculateTemporalMetrics(entries);
      logger.debug('Temporal metrics calculated', {
        peakHours: temporal.peakHours,
        peakDays: temporal.peakDays,
        seasonalCounts: temporal.seasonalPatterns
      });
      
      // Calculate discovery and engagement metrics
      timer.stage('Discovery Metrics');
      const discovery = this.calculateDiscoveryMetrics(entries);
      logger.debug('Discovery metrics calculated', {
        subscriptionRate: discovery.subscriptionRate,
        completionRate: discovery.contentCompletionRate,
        discoveryMethods: Object.keys(discovery.discoveryMethods).length
      });
      
      // Calculate trend analysis
      timer.stage('Trend Metrics');
      const trends = this.calculateTrendMetrics(entries);
      logger.debug('Trend metrics calculated', {
        dailyDataPoints: trends.watchTime.daily.length,
        weeklyDataPoints: trends.watchTime.weekly.length,
        monthlyDataPoints: trends.watchTime.monthly.length
      });
      
      // Calculate comparative analysis
      timer.stage('Comparative Metrics');
      const comparisons = this.calculateComparativeMetrics(entries);
      logger.debug('Comparative metrics calculated', {
        monthOverMonth: comparisons.monthOverMonth,
        yearOverYear: comparisons.yearOverYear
      });
      
      // Calculate processing statistics
      timer.stage('Processing Stats');
      const processing = this.calculateProcessingStats(entries);
      logger.debug('Processing stats calculated', {
        enrichedCount: processing.enrichedWithAPI,
        errorsCount: processing.processingErrors,
        dataQuality: processing.dataQuality
      });
      
      // Legacy compatibility
      timer.stage('Legacy Metrics');
      const legacy = this.calculateLegacyMetrics(entries);
      logger.debug('Legacy metrics calculated', {
        mostWatchedChannelsCount: legacy.mostWatchedChannels.length,
        filteredAdsCount: legacy.filteredAdsCount,
        filteredShortsCount: legacy.filteredShortsCount
      });

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

      timer.end({
        totalEntries: entries.length,
        metricsGenerated: true,
        categoriesFound: categories.length,
        channelsFound: topChannels.length,
        enrichmentRate: ((entries.filter(e => e.enrichedWithAPI).length / entries.length) * 100).toFixed(1) + '%'
      });
      
      logger.info('Metrics generation completed successfully');
      return metrics;
      
    } catch (error) {
      logger.error('Error generating metrics:', error);
      timer.end({ 
        error: true, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        entriesCount: entries.length 
      });
      return emptyMetrics;
    }
  }

  /**
   * Calculate basic overview metrics
   */
  private calculateOverviewMetrics(entries: IVideoEntry[]) {
    const timer = createTimer('Overview Metrics Calculation');
    
    const totalVideos = entries.length;
    
    timer.stage('Watch Time Calculation');
    const totalWatchTime = entries.reduce((sum, entry) => {
      const duration = entry.duration || 300; // Default 5 minutes if unknown
      return sum + (duration / 60); // Convert to minutes
    }, 0);
    
    const averageWatchTime = totalVideos > 0 ? totalWatchTime / totalVideos : 0;
    
    timer.stage('Channel Analysis');
    const uniqueChannels = new Set(entries.map(e => e.channel)).size;
    
    timer.stage('Date Range Analysis');
    const dates = entries.map(e => e.watchedAt).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0] || new Date();
    const end = dates[dates.length - 1] || new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    const result = {
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

    timer.end({
      totalVideos,
      totalWatchTimeMinutes: Math.round(totalWatchTime),
      uniqueChannels,
      totalDays
    });

    logger.debug('Overview metrics details', {
      avgVideoLength: averageWatchTime.toFixed(1) + ' minutes',
      watchTimeHours: (totalWatchTime / 60).toFixed(1),
      videosPerDay: (totalVideos / totalDays).toFixed(1)
    });

    return result;
  }

  /**
   * Calculate content type distribution
   */
  private calculateContentTypeDistribution(entries: IVideoEntry[]): Record<ContentType, number> {
    const timer = createTimer('Content Type Distribution');
    
    const distribution: Record<ContentType, number> = {
      [ContentType.VIDEO]: 0,
      [ContentType.SHORT]: 0,
      [ContentType.LIVESTREAM]: 0,
      [ContentType.PREMIERE]: 0,
      [ContentType.ADVERTISEMENT]: 0,
      [ContentType.STANDARD]: 0,
      [ContentType.UNKNOWN]: 0
    };

    entries.forEach(entry => {
      distribution[entry.contentType]++;
    });

    timer.end({
      totalEntries: entries.length,
      contentTypesCounted: Object.keys(distribution).length,
      distribution
    });

    logger.debug('Content type analysis', {
      videos: distribution[ContentType.VIDEO],
      shorts: distribution[ContentType.SHORT],
      livestreams: distribution[ContentType.LIVESTREAM],
      ads: distribution[ContentType.ADVERTISEMENT],
      unknown: distribution[ContentType.UNKNOWN]
    });

    return distribution;
  }

  /**
   * Calculate category metrics with trends
   */
  private calculateCategoryMetrics(entries: IVideoEntry[]): CategoryMetrics[] {
    const timer = createTimer('Category Metrics Calculation');
    
    const categoryData: Record<VideoCategory, {
      videoCount: number;
      totalWatchTime: number;
      totalDuration: number;
      channels: Set<string>;
    }> = {} as any;

    // Initialize category data
    timer.stage('Category Data Initialization');
    Object.values(VideoCategory).forEach(category => {
      categoryData[category] = {
        videoCount: 0,
        totalWatchTime: 0,
        totalDuration: 0,
        channels: new Set()
      };
    });

    // Aggregate data
    timer.stage('Data Aggregation');
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
    
    timer.stage('Trend Calculations');
    const result = Object.entries(categoryData)
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

    timer.end({
      categoriesWithContent: result.length,
      topCategory: result[0]?.category,
      totalVideosProcessed: totalVideos
    });

    logger.debug('Category metrics summary', {
      activeCategories: result.length,
      topCategories: result.slice(0, 3).map(c => ({
        category: c.category,
        videos: c.videoCount,
        percentage: c.percentage
      }))
    });

    return result;
  }

  /**
   * Calculate channel metrics
   */
  private calculateChannelMetrics(entries: IVideoEntry[]): ChannelMetrics[] {
    const timer = createTimer('Channel Metrics Calculation');
    
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

    timer.stage('Channel Data Aggregation');
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

    timer.stage('Channel Metrics Processing');
    const result = Object.entries(channelData)
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

    timer.end({
      totalChannels: Object.keys(channelData).length,
      topChannelsReturned: result.length,
      enrichedChannelsData: result.filter(c => c.engagement.averageViews > 0).length
    });

    logger.debug('Channel metrics summary', {
      totalChannels: Object.keys(channelData).length,
      topChannels: result.slice(0, 5).map(c => ({
        name: c.channelName.substring(0, 30) + (c.channelName.length > 30 ? '...' : ''),
        videos: c.videoCount,
        watchTime: c.totalWatchTime + 'min'
      }))
    });

    return result;
  }

  /**
   * Calculate temporal viewing patterns
   */
  private calculateTemporalMetrics(entries: IVideoEntry[]): TemporalMetrics {
    const timer = createTimer('Temporal Metrics Calculation');
    
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

    timer.stage('Temporal Data Processing');
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

    timer.stage('Peak Analysis');
    // Find peak hours and days
    const peakHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, ]) => `${hour}:00`);

    const peakDays = Object.entries(dayOfWeekDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day, ]) => day);

    const result = {
      hourlyDistribution,
      dayOfWeekDistribution,
      monthlyDistribution,
      seasonalPatterns: seasonalCounts,
      peakHours,
      peakDays
    };

    timer.end({
      peakHour: peakHours[0],
      peakDay: peakDays[0],
      monthsWithData: Object.keys(monthlyDistribution).length,
      seasonalDistribution: seasonalCounts
    });

    logger.debug('Temporal patterns identified', {
      mostActiveHour: peakHours[0],
      mostActiveDay: peakDays[0],
      seasonalPreference: Object.entries(seasonalCounts).sort(([,a], [,b]) => b - a)[0][0]
    });

    return result;
  }

  /**
   * Calculate discovery and engagement metrics
   */
  private calculateDiscoveryMetrics(entries: IVideoEntry[]): DiscoveryMetrics {
    const timer = createTimer('Discovery Metrics Calculation');
    
    const discoveryMethods: Record<string, number> = {};
    let subscribedCount = 0;
    let totalSessionLength = 0;
    let completedVideos = 0;

    timer.stage('Discovery Method Analysis');
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

    timer.end({
      totalEntries: entries.length,
      discoveryMethodsCounted: Object.keys(discoveryMethods).length,
      subscriptionRate: subscriptionRate,
      completionRate: contentCompletionRate
    });

    logger.debug('Discovery metrics summary', {
      subscriptionRate: subscriptionRate,
      completionRate: contentCompletionRate,
      mostCommonDiscoveryMethod: Object.entries(discoveryMethods).sort(([,a], [,b]) => b - a)[0][0]
    });

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
    const timer = createTimer('Trend Metrics Calculation');
    
    // Group entries by time periods
    const dailyData = this.groupEntriesByPeriod(entries, 'day');
    const weeklyData = this.groupEntriesByPeriod(entries, 'week');
    const monthlyData = this.groupEntriesByPeriod(entries, 'month');

    const result = {
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
        [ContentType.ADVERTISEMENT]: [],
        [ContentType.STANDARD]: [],
        [ContentType.UNKNOWN]: []
      },
      categories: {} as any,
      topChannels: []
    };

    timer.end({
      dailyDataPoints: result.watchTime.daily.length,
      weeklyDataPoints: result.watchTime.weekly.length,
      monthlyDataPoints: result.watchTime.monthly.length
    });

    logger.debug('Trend metrics summary', {
      dailyTrends: result.watchTime.daily.length > 0 ? {
        date: result.watchTime.daily[0].date.toISOString(),
        value: result.watchTime.daily[0].value
      } : 'No daily data',
      weeklyTrends: result.watchTime.weekly.length > 0 ? {
        date: result.watchTime.weekly[0].date.toISOString(),
        value: result.watchTime.weekly[0].value
      } : 'No weekly data',
      monthlyTrends: result.watchTime.monthly.length > 0 ? {
        date: result.watchTime.monthly[0].date.toISOString(),
        value: result.watchTime.monthly[0].value
      } : 'No monthly data'
    });

    return result;
  }

  /**
   * Calculate comparative metrics (period over period)
   */
  private calculateComparativeMetrics(entries: IVideoEntry[]): {
    monthOverMonth: PeriodComparison;
    yearOverYear: PeriodComparison;
    quarterOverQuarter: PeriodComparison;
  } {
    const timer = createTimer('Comparative Metrics Calculation');
    
    const now = new Date();
    
    const result = {
      monthOverMonth: this.calculatePeriodComparison(entries, undefined, 'month'),
      yearOverYear: this.calculatePeriodComparison(entries, undefined, 'year'),
      quarterOverQuarter: this.calculatePeriodComparison(entries, undefined, 'quarter')
    };

    timer.end({
      monthOverMonth: result.monthOverMonth,
      yearOverYear: result.yearOverYear,
      quarterOverQuarter: result.quarterOverQuarter
    });

    logger.debug('Comparative metrics calculated', {
      monthOverMonth: result.monthOverMonth,
      yearOverYear: result.yearOverYear
    });

    return result;
  }

  /**
   * Calculate processing statistics
   */
  private calculateProcessingStats(entries: IVideoEntry[]) {
    const timer = createTimer('Processing Stats Calculation');
    
    const enrichedCount = entries.filter(e => e.enrichedWithAPI).length;
    const errorsCount = entries.filter(e => e.processingErrors && e.processingErrors.length > 0).length;
    
    const result = {
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

    timer.end({
      totalEntries: entries.length,
      enrichedCount: enrichedCount,
      errorsCount: errorsCount,
      dataQuality: result.dataQuality
    });

    logger.debug('Processing stats summary', {
      totalVideosProcessed: result.totalVideosProcessed,
      enrichedWithAPI: result.enrichedWithAPI,
      processingErrors: result.processingErrors,
      dataQuality: result.dataQuality
    });

    return result;
  }

  /**
   * Calculate legacy metrics for backwards compatibility
   */
  private calculateLegacyMetrics(entries: IVideoEntry[]) {
    const timer = createTimer('Legacy Metrics Calculation');
    
    const channelDistribution: Record<string, number> = {};
    const dayOfWeekDistribution: Record<string, number> = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
      'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    timer.stage('Channel Distribution Analysis');
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

    timer.end({
      totalChannels: Object.keys(channelDistribution).length,
      mostWatchedChannelsCount: mostWatchedChannels.length,
      filteredAdsCount: filteredAdsCount,
      filteredShortsCount: filteredShortsCount
    });

    logger.debug('Legacy metrics summary', {
      totalChannels: Object.keys(channelDistribution).length,
      mostWatchedChannels: mostWatchedChannels.slice(0, 5).map(c => ({
        name: c.channel,
        count: c.count
      })),
      filteredAdsCount: filteredAdsCount,
      filteredShortsCount: filteredShortsCount
    });

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
    const timer = createTimer('Period Comparison Calculation');
    
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

    timer.end({
      currentPeriodEntries: current,
      previousPeriodEntries: previous,
      change: change,
      changePercentage: changePercentage
    });

    logger.debug('Period comparison details', {
      currentPeriod: periodStart.toISOString(),
      previousPeriod: previousPeriodStart.toISOString(),
      change: change,
      changePercentage: changePercentage
    });

    return {
      current,
      previous,
      change,
      changePercentage: Math.round(changePercentage * 10) / 10
    };
  }

  private groupEntriesByPeriod(entries: IVideoEntry[], period: 'day' | 'week' | 'month'): Record<string, IVideoEntry[]> {
    const timer = createTimer('Entries Grouping by Period');
    
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

    timer.end({
      totalEntries: entries.length,
      groupedEntries: Object.keys(grouped).length,
      period
    });

    logger.debug('Entries grouped by period', {
      period,
      totalGroups: Object.keys(grouped).length,
      firstGroup: Object.keys(grouped)[0],
      lastGroup: Object.keys(grouped)[Object.keys(grouped).length - 1]
    });

    return grouped;
  }

  private convertToTimeSeriesPoints(groupedData: Record<string, IVideoEntry[]>): TimeSeriesPoint[] {
    const timer = createTimer('Time Series Point Conversion');
    
    const result = Object.entries(groupedData)
      .map(([date, entries]) => ({
        date: new Date(date),
        value: entries.length,
        label: date
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    timer.end({
      totalPoints: result.length,
      firstPointDate: result[0]?.date.toISOString(),
      lastPointDate: result[result.length - 1]?.date.toISOString()
    });

    logger.debug('Time series points converted', {
      totalPoints: result.length,
      firstPoint: result[0]?.date.toISOString(),
      lastPoint: result[result.length - 1]?.date.toISOString()
    });

    return result;
  }
}