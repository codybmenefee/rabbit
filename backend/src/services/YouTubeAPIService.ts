import { google, youtube_v3 } from 'googleapis';
import NodeCache from 'node-cache';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger, createTimer, debugVideoProcessing } from '../utils/logger';

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

    logger.debug('YouTubeAPIService initialized', {
      quotaLimit: config.quotaLimit,
      batchSize: config.batchSize,
      requestDelay: config.requestDelay,
      maxConcurrentRequests: config.maxConcurrentRequests,
      cacheEnabled: true,
      cacheTTL: 86400
    });
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
        logger.debug('Video ID extracted successfully', {
          url: url.substring(0, 50) + '...',
          videoId: match[1],
          pattern: pattern.toString()
        });
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
    const timer = createTimer('YouTube API Enrichment');
    // Start with a copy of all entries - they'll be enriched in place
    const enrichedEntries: IVideoEntry[] = [...entries];
    const videoIds = new Set<string>();

    timer.stage('Video ID Extraction');
    // Extract valid video IDs
    for (const entry of enrichedEntries) {
      const videoId = this.extractVideoId(entry.url);
      if (videoId && !videoIds.has(videoId)) {
        videoIds.add(videoId);
        entry.videoId = videoId;
      }
    }

    logger.info(`Enriching ${videoIds.size} unique videos from ${entries.length} entries`);
    debugVideoProcessing.apiEnrichmentStart(Array.from(videoIds), Math.ceil(videoIds.size / this.config.batchSize));

    logger.debug('Video ID extraction completed', {
      totalEntries: entries.length,
      uniqueVideoIds: videoIds.size,
      duplicateVideoIds: entries.length - videoIds.size,
      extractionSuccessRate: ((videoIds.size / entries.length) * 100).toFixed(1) + '%'
    });

    // If no quota available, return original entries
    if (this.quotaUsage.remaining < 100) {
      logger.warn('YouTube API quota limit reached, returning non-enriched entries', {
        quotaUsed: this.quotaUsage.used,
        quotaRemaining: this.quotaUsage.remaining,
        quotaLimit: this.config.quotaLimit
      });
      timer.end({ success: false, reason: 'quota_exhausted' });
      return enrichedEntries;
    }

    // Process in batches to respect quota limits
    const videoIdArray = Array.from(videoIds);
    const batches = this.chunkArray(videoIdArray, this.config.batchSize);

    timer.stage('Batch Processing');
    logger.debug('Starting batch processing', {
      totalBatches: batches.length,
      batchSize: this.config.batchSize,
      requestDelay: this.config.requestDelay,
      quotaAvailable: this.quotaUsage.remaining
    });

    let totalEnriched = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchTimer = createTimer(`API Batch ${i + 1}/${batches.length}`);
      
      try {
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
          batchIndex: i + 1,
          batchSize: batch.length,
          videoIds: batch,
          quotaRemaining: this.quotaUsage.remaining
        });

        // Check quota before making request
        if (this.quotaUsage.remaining < 100) {
          logger.warn('YouTube API quota limit approaching, stopping enrichment', {
            currentBatch: i + 1,
            totalBatches: batches.length,
            quotaRemaining: this.quotaUsage.remaining
          });
          break;
        }

        batchTimer.stage('Fetching Video Details');
        const videoDetails = await this.getVideoDetails(batch);
        
        batchTimer.stage('Fetching Channel Details');
        const channelIds = new Set(videoDetails.map(v => v.snippet?.channelId).filter((id): id is string => Boolean(id)));
        const channelDetails = await this.getChannelDetails(Array.from(channelIds));

        logger.debug('API data fetched for batch', {
          batchIndex: i + 1,
          videosRetrieved: videoDetails.length,
          channelsRetrieved: channelDetails.length,
          videoDetailsSuccess: ((videoDetails.length / batch.length) * 100).toFixed(1) + '%'
        });

        // Apply enrichment to matching entries
        batchTimer.stage('Applying Enrichment');
        let batchEnriched = 0;
        for (const entry of enrichedEntries) {
          if (entry.videoId && batch.includes(entry.videoId)) {
            const videoData = videoDetails.find(v => v.id === entry.videoId);
            const channelData = channelDetails.find(c => c.id === videoData?.snippet?.channelId);
            
            const enrichmentResult = this.applyVideoEnrichment(entry, videoData, channelData);
            if (enrichmentResult.success) {
              batchEnriched++;
              totalEnriched++;
            } else {
              totalErrors++;
              logger.debug('Enrichment failed for video', {
                videoId: entry.videoId,
                reason: enrichmentResult.error,
                title: entry.title.substring(0, 50) + '...'
              });
            }
          }
        }

        debugVideoProcessing.apiBatchProcessed(i, batch.length, batchEnriched);
        
        batchTimer.end({
          batchSize: batch.length,
          enrichedCount: batchEnriched,
          successRate: ((batchEnriched / batch.length) * 100).toFixed(1) + '%'
        });

        // Rate limiting
        if (i < batches.length - 1) {
          logger.debug(`Rate limiting delay: ${this.config.requestDelay}ms`);
          await this.delay(this.config.requestDelay);
        }

      } catch (error) {
        logger.error(`Error enriching batch ${i + 1}:`, error);
        totalErrors += batch.length;
        
        // Add error information to affected entries and try web scraping fallback
        for (const entry of enrichedEntries) {
          if (entry.videoId && batch.includes(entry.videoId)) {
            entry.processingErrors = entry.processingErrors || [];
            entry.processingErrors.push(`API enrichment failed: ${error}`);
            
            // Try web scraping fallback for channel name if still missing
            if (entry.channel === 'Unknown Channel' && entry.videoId) {
              try {
                const scrapedChannel = await this.scrapeChannelName(entry.videoId);
                if (scrapedChannel) {
                  entry.channel = scrapedChannel;
                  logger.debug('Channel name recovered via web scraping', {
                    videoId: entry.videoId,
                    channelName: scrapedChannel
                  });
                }
              } catch (scrapeError) {
                logger.debug('Web scraping fallback also failed', {
                  videoId: entry.videoId,
                  error: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
                });
              }
            }
          }
        }

        batchTimer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const finalEnrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
    timer.end({
      totalEntries: entries.length,
      uniqueVideoIds: videoIds.size,
      batchesProcessed: batches.length,
      totalEnriched: finalEnrichedCount,
      totalErrors,
      enrichmentRate: ((finalEnrichedCount / entries.length) * 100).toFixed(1) + '%',
      quotaUsed: this.quotaUsage.used,
      quotaRemaining: this.quotaUsage.remaining
    });

    logger.info(`Enrichment completed. Enriched ${finalEnrichedCount} entries`);
    logger.debug('Final enrichment statistics', {
      originalEntries: entries.length,
      uniqueVideoIds: videoIds.size,
      finalEnrichedCount,
      enrichmentRate: ((finalEnrichedCount / entries.length) * 100).toFixed(1) + '%',
      apiQuotaUsed: this.quotaUsage.used,
      apiQuotaRemaining: this.quotaUsage.remaining,
      errorCount: totalErrors
    });

    return enrichedEntries;
  }

  /**
   * Get video details from YouTube API
   */
  private async getVideoDetails(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
    const timer = createTimer(`Video Details API Call (${videoIds.length} videos)`);
    const cacheKey = `videos:${videoIds.join(',')}`;
    const cached = this.cache.get<youtube_v3.Schema$Video[]>(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for ${videoIds.length} videos`, {
        cacheKey: cacheKey.substring(0, 100) + '...',
        videosFromCache: cached.length
      });
      timer.end({ cacheHit: true, videosReturned: cached.length });
      return cached;
    }

    try {
      logger.debug('Making YouTube API call for video details', {
        videoCount: videoIds.length,
        videoIds: videoIds.slice(0, 5), // Log first 5 IDs
        quotaBefore: this.quotaUsage.remaining
      });

      timer.stage('API Request');
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
        maxResults: 50
      });

      this.updateQuotaUsage(100); // videos.list costs 1 unit per video
      
      const videos = response.data.items || [];
      this.cache.set(cacheKey, videos);
      
      logger.debug(`Retrieved ${videos.length} video details from API`, {
        requested: videoIds.length,
        received: videos.length,
        successRate: ((videos.length / videoIds.length) * 100).toFixed(1) + '%',
        quotaAfter: this.quotaUsage.remaining,
        quotaCost: 100
      });

      timer.end({
        videosRequested: videoIds.length,
        videosReceived: videos.length,
        quotaCost: 100,
        cached: true
      });
      
      return videos;

    } catch (error) {
      logger.error('Error fetching video details:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get channel details from YouTube API
   */
  private async getChannelDetails(channelIds: string[]): Promise<youtube_v3.Schema$Channel[]> {
    if (channelIds.length === 0) {
      logger.debug('No channel IDs provided, skipping channel details fetch');
      return [];
    }

    const timer = createTimer(`Channel Details API Call (${channelIds.length} channels)`);
    const cacheKey = `channels:${channelIds.join(',')}`;
    const cached = this.cache.get<youtube_v3.Schema$Channel[]>(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for ${channelIds.length} channels`, {
        cacheKey: cacheKey.substring(0, 100) + '...',
        channelsFromCache: cached.length
      });
      timer.end({ cacheHit: true, channelsReturned: cached.length });
      return cached;
    }

    try {
      logger.debug('Making YouTube API call for channel details', {
        channelCount: channelIds.length,
        channelIds: channelIds.slice(0, 5), // Log first 5 IDs
        quotaBefore: this.quotaUsage.remaining
      });

      timer.stage('API Request');
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: channelIds,
        maxResults: 50
      });

      this.updateQuotaUsage(1); // channels.list costs 1 unit
      
      const channels = response.data.items || [];
      this.cache.set(cacheKey, channels);
      
      logger.debug(`Retrieved ${channels.length} channel details from API`, {
        requested: channelIds.length,
        received: channels.length,
        successRate: ((channels.length / channelIds.length) * 100).toFixed(1) + '%',
        quotaAfter: this.quotaUsage.remaining,
        quotaCost: 1
      });

      timer.end({
        channelsRequested: channelIds.length,
        channelsReceived: channels.length,
        quotaCost: 1,
        cached: true
      });
      
      return channels;

    } catch (error) {
      logger.error('Error fetching channel details:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
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
  ): { success: boolean; error?: string } {
    try {
      if (!videoData) {
        const error = 'Video not found in YouTube API';
        entry.processingErrors = entry.processingErrors || [];
        entry.processingErrors.push(error);
        logger.debug('Video enrichment failed - video not found', {
          videoId: entry.videoId,
          title: entry.title.substring(0, 50) + '...'
        });
        return { success: false, error };
      }

      const snippet = videoData.snippet;
      const statistics = videoData.statistics;
      const contentDetails = videoData.contentDetails;

      logger.debug('Applying video enrichment', {
        videoId: entry.videoId,
        hasSnippet: !!snippet,
        hasStatistics: !!statistics,
        hasContentDetails: !!contentDetails,
        hasChannelData: !!channelData
      });

      // Basic metadata
      if (snippet) {
        entry.description = snippet.description || undefined;
        entry.publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : undefined;
        entry.tags = snippet.tags || [];
        entry.thumbnailUrl = snippet.thumbnails?.default?.url || undefined;
        entry.category = this.mapYouTubeCategoryToEnum(snippet.categoryId || undefined);
        
        // Channel information - this is the key fix!
        if (snippet.channelTitle) {
          entry.channel = snippet.channelTitle;
          logger.debug('Channel name extracted from API', {
            videoId: entry.videoId,
            channelName: snippet.channelTitle,
            previousChannel: entry.channel
          });
        }
        
        // Also extract channel ID for future use
        if (snippet.channelId) {
          entry.channelId = snippet.channelId;
        }
        
        logger.debug('Applied snippet data', {
          videoId: entry.videoId,
          hasDescription: !!entry.description,
          tagsCount: entry.tags?.length || 0,
          category: entry.category,
          publishedAt: entry.publishedAt?.toISOString(),
          channelName: snippet.channelTitle,
          channelId: snippet.channelId
        });
      }

      // Duration parsing
      if (contentDetails?.duration) {
        const parsedDuration = this.parseDuration(contentDetails.duration);
        entry.duration = parsedDuration;
        logger.debug('Applied duration data', {
          videoId: entry.videoId,
          rawDuration: contentDetails.duration,
          parsedDurationSeconds: parsedDuration
        });
      }

      // Statistics
      if (statistics) {
        entry.viewCount = parseInt(statistics.viewCount || '0');
        entry.likeCount = parseInt(statistics.likeCount || '0');
        entry.commentCount = parseInt(statistics.commentCount || '0');
        
        logger.debug('Applied statistics data', {
          videoId: entry.videoId,
          viewCount: entry.viewCount,
          likeCount: entry.likeCount,
          commentCount: entry.commentCount
        });
      }

      // Content type classification
      const previousContentType = entry.contentType;
      entry.contentType = this.classifyContentType(entry, videoData);
      
      if (previousContentType !== entry.contentType) {
        logger.debug('Content type reclassified', {
          videoId: entry.videoId,
          previousType: previousContentType,
          newType: entry.contentType,
          duration: entry.duration
        });
      }

      // Subscription status (if channel data available)
      if (channelData) {
        // Note: Subscription status requires OAuth, so we can't determine this with API key only
        entry.isSubscribed = undefined;
      }

      entry.enrichedWithAPI = true;
      entry.lastUpdated = new Date();

      logger.debug('Video enrichment completed successfully', {
        videoId: entry.videoId,
        enrichedFields: {
          description: !!entry.description,
          duration: !!entry.duration,
          viewCount: !!entry.viewCount,
          publishedAt: !!entry.publishedAt,
          category: entry.category !== VideoCategory.UNKNOWN
        }
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown enrichment error';
      entry.processingErrors = entry.processingErrors || [];
      entry.processingErrors.push(`Enrichment failed: ${errorMessage}`);
      
      logger.error('Error applying video enrichment', {
        videoId: entry.videoId,
        error: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
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

    // Check for YouTube Shorts - prioritize URL pattern over duration
    // Only classify as SHORT if URL contains /shorts/ OR (duration <= 60 AND has vertical aspect ratio indicators)
    if (entry.url && entry.url.includes('/shorts/')) {
      return ContentType.SHORT;
    }

    // Additional check for Shorts based on duration for videos that might have been transcoded
    // but be more conservative - only very short videos with specific characteristics
    if (duration <= 30 && duration > 0) {
      // Only classify as SHORT if it's very short (30 seconds or less)
      // This is more conservative than the previous 60-second threshold
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

    // Default to regular video - this preserves the original content type for most videos
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
    const previousUsed = this.quotaUsage.used;
    this.quotaUsage.used += cost;
    this.quotaUsage.remaining = Math.max(0, this.config.quotaLimit - this.quotaUsage.used);
    this.quotaUsage.requestsMade++;

    logger.debug('Quota usage updated', {
      cost,
      previousUsed,
      currentUsed: this.quotaUsage.used,
      remaining: this.quotaUsage.remaining,
      requestsMade: this.quotaUsage.requestsMade,
      percentageUsed: ((this.quotaUsage.used / this.config.quotaLimit) * 100).toFixed(1) + '%'
    });

    // Reset if new day
    if (new Date() > this.quotaUsage.resetTime) {
      logger.info('Daily quota reset', {
        previousUsed: this.quotaUsage.used,
        resetTime: this.quotaUsage.resetTime
      });
      
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
   * Scrape channel name from YouTube page as fallback
   */
  private async scrapeChannelName(videoId: string): Promise<string | null> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const html = await response.text();
      
      // Try multiple patterns to find channel name
      const patterns = [
        /"ownerChannelName":"([^"]+)"/,
        /"author":"([^"]+)"/,
        /"channelName":"([^"]+)"/,
        /itemprop="name" content="([^"]+)"/,
        /"uploader":"([^"]+)"/
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const channelName = match[1].replace(/\\u[\da-f]{4}/gi, (match) => 
            String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
          );
          
          if (channelName && channelName !== 'Unknown' && channelName.length > 0) {
            logger.debug('Channel name found via web scraping', {
              videoId,
              channelName,
              pattern: pattern.source
            });
            return channelName;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.debug('Web scraping failed', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
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