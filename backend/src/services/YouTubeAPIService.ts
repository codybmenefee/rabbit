import { google, youtube_v3 } from 'googleapis';
import NodeCache from 'node-cache';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger } from '../utils/logger';

interface YouTubeAPIConfig {
  apiKey: string;
  quotaLimit: number;
  batchSize: number;
  requestDelay: number;
  maxConcurrentRequests: number;
}

interface APIQuotaUsage {
  used: number;
  remaining: number;
  requestsMade: number;
  resetTime: Date;
}

export class YouTubeAPIService {
  private youtube: youtube_v3.Youtube;
  private config: YouTubeAPIConfig;
  private cache: NodeCache;
  private quotaUsage: APIQuotaUsage;

  constructor(config: YouTubeAPIConfig) {
    this.config = config;
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.apiKey
    });
    
    // Cache for 24 hours to reduce API calls
    this.cache = new NodeCache({ stdTTL: 86400 });
    
    this.quotaUsage = {
      used: 0,
      remaining: config.quotaLimit,
      requestsMade: 0,
      resetTime: this.getNextResetTime()
    };
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  public extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    logger.warn(`Could not extract video ID from URL: ${url}`);
    return null;
  }

  /**
   * Enrich video entries with YouTube API data
   */
  public async enrichVideoEntries(entries: IVideoEntry[]): Promise<IVideoEntry[]> {
    const startTime = Date.now();
    const enrichedEntries: IVideoEntry[] = [];
    const videoIds = new Set<string>();

    // Extract valid video IDs
    for (const entry of entries) {
      const videoId = this.extractVideoId(entry.url);
      if (videoId && !videoIds.has(videoId)) {
        videoIds.add(videoId);
        entry.videoId = videoId;
      }
    }

    logger.info(`Enriching ${videoIds.size} unique videos from ${entries.length} entries`);

    // Process in batches to respect quota limits
    const videoIdArray = Array.from(videoIds);
    const batches = this.chunkArray(videoIdArray, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        // Check quota before making request
        if (this.quotaUsage.remaining < 100) {
          logger.warn('YouTube API quota limit approaching, stopping enrichment');
          break;
        }

        const videoDetails = await this.getVideoDetails(batch);
        const channelIds = new Set(videoDetails.map(v => v.snippet?.channelId).filter((id): id is string => Boolean(id)));
        const channelDetails = await this.getChannelDetails(Array.from(channelIds));

        // Apply enrichment to matching entries
        for (const entry of entries) {
          if (entry.videoId && batch.includes(entry.videoId)) {
            const videoData = videoDetails.find(v => v.id === entry.videoId);
            const channelData = channelDetails.find(c => c.id === videoData?.snippet?.channelId);
            
            this.applyVideoEnrichment(entry, videoData, channelData);
          }
          enrichedEntries.push(entry);
        }

        // Rate limiting
        if (i < batches.length - 1) {
          await this.delay(this.config.requestDelay);
        }

      } catch (error) {
        logger.error(`Error enriching batch ${i + 1}:`, error);
        
        // Add non-enriched entries to results
        for (const entry of entries) {
          if (entry.videoId && batch.includes(entry.videoId)) {
            entry.processingErrors = entry.processingErrors || [];
            entry.processingErrors.push(`API enrichment failed: ${error}`);
            enrichedEntries.push(entry);
          }
        }
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    logger.info(`Enrichment completed in ${processingTime}s. Enriched ${enrichedEntries.filter(e => e.enrichedWithAPI).length} entries`);

    return enrichedEntries;
  }

  /**
   * Get video details from YouTube API
   */
  private async getVideoDetails(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
    const cacheKey = `videos:${videoIds.join(',')}`;
    const cached = this.cache.get<youtube_v3.Schema$Video[]>(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for ${videoIds.length} videos`);
      return cached;
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
        maxResults: 50
      });

      this.updateQuotaUsage(100); // videos.list costs 1 unit per video
      
      const videos = response.data.items || [];
      this.cache.set(cacheKey, videos);
      
      logger.debug(`Retrieved ${videos.length} video details from API`);
      return videos;

    } catch (error) {
      logger.error('Error fetching video details:', error);
      throw error;
    }
  }

  /**
   * Get channel details from YouTube API
   */
  private async getChannelDetails(channelIds: string[]): Promise<youtube_v3.Schema$Channel[]> {
    if (channelIds.length === 0) return [];

    const cacheKey = `channels:${channelIds.join(',')}`;
    const cached = this.cache.get<youtube_v3.Schema$Channel[]>(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for ${channelIds.length} channels`);
      return cached;
    }

    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: channelIds,
        maxResults: 50
      });

      this.updateQuotaUsage(1); // channels.list costs 1 unit
      
      const channels = response.data.items || [];
      this.cache.set(cacheKey, channels);
      
      logger.debug(`Retrieved ${channels.length} channel details from API`);
      return channels;

    } catch (error) {
      logger.error('Error fetching channel details:', error);
      throw error;
    }
  }

  /**
   * Apply enrichment data to video entry
   */
  private applyVideoEnrichment(
    entry: IVideoEntry,
    videoData?: youtube_v3.Schema$Video,
    channelData?: youtube_v3.Schema$Channel
  ): void {
    if (!videoData) {
      entry.processingErrors = entry.processingErrors || [];
      entry.processingErrors.push('Video not found in YouTube API');
      return;
    }

    const snippet = videoData.snippet;
    const statistics = videoData.statistics;
    const contentDetails = videoData.contentDetails;

    // Basic metadata
    if (snippet) {
      entry.description = snippet.description || undefined;
      entry.publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : undefined;
      entry.tags = snippet.tags || [];
      entry.thumbnailUrl = snippet.thumbnails?.default?.url || undefined;
      entry.category = this.mapYouTubeCategoryToEnum(snippet.categoryId || undefined);
    }

    // Duration parsing
    if (contentDetails?.duration) {
      entry.duration = this.parseDuration(contentDetails.duration);
    }

    // Statistics
    if (statistics) {
      entry.viewCount = parseInt(statistics.viewCount || '0');
      entry.likeCount = parseInt(statistics.likeCount || '0');
      entry.commentCount = parseInt(statistics.commentCount || '0');
    }

    // Content type classification
    entry.contentType = this.classifyContentType(entry, videoData);

    // Subscription status (if channel data available)
    if (channelData) {
      // Note: Subscription status requires OAuth, so we can't determine this with API key only
      entry.isSubscribed = undefined;
    }

    entry.enrichedWithAPI = true;
    entry.lastUpdated = new Date();
  }

  /**
   * Map YouTube category ID to our enum
   */
  private mapYouTubeCategoryToEnum(categoryId?: string): VideoCategory {
    const categoryMap: Record<string, VideoCategory> = {
      '1': VideoCategory.FILM_ANIMATION,
      '2': VideoCategory.AUTOS_VEHICLES,
      '10': VideoCategory.MUSIC,
      '15': VideoCategory.PETS_ANIMALS,
      '17': VideoCategory.SPORTS,
      '19': VideoCategory.TRAVEL_EVENTS,
      '20': VideoCategory.GAMING,
      '22': VideoCategory.PEOPLE_BLOGS,
      '23': VideoCategory.COMEDY,
      '24': VideoCategory.ENTERTAINMENT,
      '25': VideoCategory.NEWS_POLITICS,
      '26': VideoCategory.HOWTO_STYLE,
      '27': VideoCategory.EDUCATION,
      '28': VideoCategory.SCIENCE_TECHNOLOGY,
      '29': VideoCategory.NONPROFITS_ACTIVISM
    };

    return categoryMap[categoryId || ''] || VideoCategory.UNKNOWN;
  }

  /**
   * Classify content type based on video data
   */
  private classifyContentType(entry: IVideoEntry, videoData: youtube_v3.Schema$Video): ContentType {
    const snippet = videoData.snippet;
    const duration = entry.duration || 0;

    // Check for YouTube Shorts (under 60 seconds and vertical)
    if (duration <= 60) {
      return ContentType.SHORT;
    }

    // Check for live streams
    if (snippet?.liveBroadcastContent === 'live' || snippet?.liveBroadcastContent === 'upcoming') {
      return ContentType.LIVESTREAM;
    }

    // Check for premieres
    if (snippet?.liveBroadcastContent === 'none' && videoData.liveStreamingDetails?.scheduledStartTime) {
      return ContentType.PREMIERE;
    }

    return ContentType.VIDEO;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Update quota usage tracking
   */
  private updateQuotaUsage(cost: number): void {
    this.quotaUsage.used += cost;
    this.quotaUsage.remaining = Math.max(0, this.config.quotaLimit - this.quotaUsage.used);
    this.quotaUsage.requestsMade++;

    // Reset if new day
    if (new Date() > this.quotaUsage.resetTime) {
      this.quotaUsage = {
        used: cost,
        remaining: this.config.quotaLimit - cost,
        requestsMade: 1,
        resetTime: this.getNextResetTime()
      };
    }
  }

  /**
   * Get quota usage statistics
   */
  public getQuotaUsage(): APIQuotaUsage {
    return { ...this.quotaUsage };
  }

  /**
   * Utility methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}