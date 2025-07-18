import { VideoCategory, ContentType } from './VideoEntry';

// Time-based aggregation interfaces
export interface TimeSeriesPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
}

// Channel analytics
export interface ChannelMetrics {
  channelName: string;
  videoCount: number;
  totalWatchTime: number; // in minutes
  averageVideoLength: number; // in seconds
  firstWatched: Date;
  lastWatched: Date;
  category: VideoCategory;
  isSubscribed?: boolean;
  engagement: {
    averageViews: number;
    averageLikes: number;
    averageComments: number;
  };
}

// Content category insights
export interface CategoryMetrics {
  category: VideoCategory;
  videoCount: number;
  totalWatchTime: number;
  percentage: number;
  averageVideoLength: number;
  topChannels: string[];
  trend: {
    monthOverMonth: PeriodComparison;
    yearOverYear: PeriodComparison;
  };
}

// Temporal patterns
export interface TemporalMetrics {
  hourlyDistribution: Record<string, number>; // 0-23 hours
  dayOfWeekDistribution: Record<string, number>;
  monthlyDistribution: Record<string, number>;
  seasonalPatterns: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  peakHours: string[];
  peakDays: string[];
}

// Discovery and engagement patterns
export interface DiscoveryMetrics {
  discoveryMethods: Record<string, number>;
  subscriptionRate: number;
  averageSessionLength: number;
  contentCompletionRate: number;
  bingeBehavior: {
    averageVideosPerSession: number;
    longestSession: number;
    channelLoyalty: number;
  };
}

// Trend analysis
export interface TrendMetrics {
  watchTime: {
    daily: TimeSeriesPoint[];
    weekly: TimeSeriesPoint[];
    monthly: TimeSeriesPoint[];
  };
  contentTypes: {
    [key in ContentType]: TimeSeriesPoint[];
  };
  categories: {
    [key in VideoCategory]: TimeSeriesPoint[];
  };
  topChannels: {
    channel: string;
    trend: TimeSeriesPoint[];
  }[];
}

// Processing statistics
export interface ProcessingStats {
  totalVideosProcessed: number;
  enrichedWithAPI: number;
  processingErrors: number;
  processingTime: number; // in seconds
  dataQuality: {
    completeEntries: number;
    partialEntries: number;
    duplicatesRemoved: number;
  };
  apiUsage: {
    quotaUsed: number;
    quotaRemaining: number;
    requestsMade: number;
  };
}

// Main metrics interface
export interface VideoMetrics {
  // Overview metrics
  totalVideos: number;
  totalWatchTime: number; // in minutes
  averageWatchTime: number; // in minutes
  uniqueChannels: number;
  dateRange: {
    start: Date;
    end: Date;
    totalDays: number;
  };

  // Content breakdown
  contentTypes: Record<ContentType, number>;
  categories: CategoryMetrics[];
  topChannels: ChannelMetrics[];

  // Temporal analysis
  temporal: TemporalMetrics;
  
  // Discovery and engagement
  discovery: DiscoveryMetrics;
  
  // Trend analysis
  trends: TrendMetrics;
  
  // Comparative analysis
  comparisons: {
    monthOverMonth: PeriodComparison;
    yearOverYear: PeriodComparison;
    quarterOverQuarter: PeriodComparison;
  };

  // Processing metadata
  processing: ProcessingStats;
  
  // Legacy fields for backwards compatibility
  channelDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  mostWatchedChannels: { channel: string; count: number }[];
  filteredAdsCount: number;
  filteredShortsCount: number;
  includingAds: boolean;
  includingShorts: boolean;
  
  // Metadata
  generatedAt: Date;
  version: string;
}

// Default empty metrics
export const emptyMetrics: VideoMetrics = {
  totalVideos: 0,
  totalWatchTime: 0,
  averageWatchTime: 0,
  uniqueChannels: 0,
  dateRange: {
    start: new Date(),
    end: new Date(),
    totalDays: 0
  },

  contentTypes: {
    [ContentType.VIDEO]: 0,
    [ContentType.SHORT]: 0,
    [ContentType.LIVESTREAM]: 0,
    [ContentType.PREMIERE]: 0,
    [ContentType.ADVERTISEMENT]: 0,
    [ContentType.STANDARD]: 0,
    [ContentType.UNKNOWN]: 0
  },

  categories: [],
  topChannels: [],

  temporal: {
    hourlyDistribution: {},
    dayOfWeekDistribution: {
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
      'Sunday': 0
    },
    monthlyDistribution: {},
    seasonalPatterns: {
      spring: 0,
      summer: 0,
      fall: 0,
      winter: 0
    },
    peakHours: [],
    peakDays: []
  },

  discovery: {
    discoveryMethods: {},
    subscriptionRate: 0,
    averageSessionLength: 0,
    contentCompletionRate: 0,
    bingeBehavior: {
      averageVideosPerSession: 0,
      longestSession: 0,
      channelLoyalty: 0
    }
  },

  trends: {
    watchTime: {
      daily: [],
      weekly: [],
      monthly: []
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
  },

  comparisons: {
    monthOverMonth: { current: 0, previous: 0, change: 0, changePercentage: 0 },
    yearOverYear: { current: 0, previous: 0, change: 0, changePercentage: 0 },
    quarterOverQuarter: { current: 0, previous: 0, change: 0, changePercentage: 0 }
  },

  processing: {
    totalVideosProcessed: 0,
    enrichedWithAPI: 0,
    processingErrors: 0,
    processingTime: 0,
    dataQuality: {
      completeEntries: 0,
      partialEntries: 0,
      duplicatesRemoved: 0
    },
    apiUsage: {
      quotaUsed: 0,
      quotaRemaining: 0,
      requestsMade: 0
    }
  },

  // Legacy compatibility
  channelDistribution: {},
  dayOfWeekDistribution: {
    'Monday': 0,
    'Tuesday': 0,
    'Wednesday': 0,
    'Thursday': 0,
    'Friday': 0,
    'Saturday': 0,
    'Sunday': 0
  },
  mostWatchedChannels: [],
  filteredAdsCount: 0,
  filteredShortsCount: 0,
  includingAds: false,
  includingShorts: false,

  generatedAt: new Date(),
  version: '2.0.0'
};

export default VideoMetrics; 