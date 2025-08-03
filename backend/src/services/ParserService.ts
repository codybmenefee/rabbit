// Removed cheerio import - using regex-based parsing instead
import { IVideoEntry, ContentType, VideoCategory } from '../models/VideoEntry';
import { VideoMetrics } from '../models/Metrics';
import { YouTubeAPIService } from './YouTubeAPIService';
import { YouTubeScrapingService } from './YouTubeScrapingService';
import { YouTubeHighPerformanceScrapingService } from './YouTubeHighPerformanceScrapingService';
import { YouTubeLLMScrapingService } from './YouTubeLLMScrapingService';
import { AnalyticsService } from './AnalyticsService';
import { VideoService } from './VideoService';
import { logger, createTimer, debugVideoProcessing } from '../utils/logger';

export interface ParseOptions {
  enrichWithAPI: boolean;
  useScrapingService: boolean; // New option to choose between API and scraping
  useHighPerformanceService?: boolean; // New option for high-performance scraping
  useLLMService?: boolean; // New option for LLM-enhanced scraping
  llmProvider?: 'anthropic' | 'openai'; // LLM provider selection
  llmCostLimit?: number; // Cost limit for LLM processing
  forceReprocessing?: boolean; // New option to skip duplicate checking and reprocess all videos
  includeAds: boolean;
  includeShorts: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categoryFilters?: VideoCategory[];
}

export interface ParseResult {
  entries: IVideoEntry[];
  metrics: VideoMetrics;
  processingStats: {
    totalEntries: number;
    validEntries: number;
    duplicatesRemoved: number;
    videosLimitedForTesting: number;
    errors: string[];
    processingTime: number;
  };
}

// Add progress tracking interface
export interface ProcessingProgress {
  sessionId: string;
  stage: string;
  progress: number; // 0-100
  message: string;
  details: {
    totalEntries?: number;
    processedEntries?: number;
    enrichedEntries?: number;
    errors?: number;
  };
  isComplete: boolean;
  error?: string;
}

export class ParserService {
  private youtubeAPI: YouTubeAPIService;
  private youtubeScraping: YouTubeScrapingService | null;
  private youtubeHighPerformanceScraping: YouTubeHighPerformanceScrapingService | null;
  private youtubeLLMScraping: YouTubeLLMScrapingService | null;
  private analyticsService: AnalyticsService;
  private videoService: VideoService;
  
  // Add progress tracking
  private progressData = new Map<string, ProcessingProgress>();

  constructor(
    youtubeAPI: YouTubeAPIService, 
    analyticsService: AnalyticsService, 
    videoService: VideoService,
    youtubeScraping?: YouTubeScrapingService,
    youtubeHighPerformanceScraping?: YouTubeHighPerformanceScrapingService,
    youtubeLLMScraping?: YouTubeLLMScrapingService
  ) {
    this.youtubeAPI = youtubeAPI;
    this.youtubeScraping = youtubeScraping || null;
    this.youtubeHighPerformanceScraping = youtubeHighPerformanceScraping || null;
    this.youtubeLLMScraping = youtubeLLMScraping || null;
    this.analyticsService = analyticsService;
    this.videoService = videoService;
  }

  /**
   * Get processing progress for a session
   */
  public getProgress(sessionId: string): ProcessingProgress | null {
    return this.progressData.get(sessionId) || null;
  }

  /**
   * Update progress for a session
   */
  private updateProgress(sessionId: string, stage: string, progress: number, message: string, details: any = {}) {
    const progressInfo: ProcessingProgress = {
      sessionId,
      stage,
      progress,
      message,
      details,
      isComplete: progress >= 100,
    };
    
    this.progressData.set(sessionId, progressInfo);
    logger.info(`Progress [${sessionId}]: ${stage} (${progress}%) - ${message}`, details);
  }

  /**
   * Mark session as errored
   */
  private setError(sessionId: string, error: string) {
    const existing = this.progressData.get(sessionId);
    if (existing) {
      existing.error = error;
      existing.isComplete = true;
      this.progressData.set(sessionId, existing);
    }
  }

  /**
   * Clean up old progress data
   */
  private cleanupProgress() {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    for (const [sessionId, progress] of this.progressData.entries()) {
      // Remove progress data older than 1 hour
      if (now - Date.now() > ONE_HOUR) {
        this.progressData.delete(sessionId);
      }
    }
  }

  /**
   * Parse YouTube watch history HTML file
   */
  public async parseWatchHistory(htmlContent: string, options: ParseOptions, sessionId?: string): Promise<ParseResult> {
    const timer = createTimer('Video Processing Pipeline');
    const errors: string[] = [];
    
    // Log initial processing start
    debugVideoProcessing.startParsing(htmlContent.length, options);
    
    logger.info('Starting watch history parsing...', { 
      enrichWithAPI: options.enrichWithAPI,
      includeAds: options.includeAds,
      includeShorts: options.includeShorts,
      forceReprocessing: options.forceReprocessing,
      hasDateRange: !!options.dateRange,
      categoryFiltersCount: options.categoryFilters?.length || 0
    });

    try {
      const sessionIdToUse = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.updateProgress(sessionIdToUse, 'parsing', 5, 'Starting HTML parsing...', { htmlLength: htmlContent.length });

      // Parse HTML and extract raw entries
      timer.stage('HTML DOM Parsing');
      const rawEntries = this.extractRawEntries(htmlContent);
      logger.info(`Extracted ${rawEntries.length} raw entries from HTML`);
      debugVideoProcessing.entriesExtracted(rawEntries.length, rawEntries.length);
      
      this.updateProgress(sessionIdToUse, 'parsing', 15, `Found ${rawEntries.length} entries in watch history`, { 
        totalEntries: rawEntries.length 
      });

      if (rawEntries.length === 0) {
        logger.warn('No entries found in HTML content');
        return this.createEmptyResult(timer.start, ['No watch history entries found in HTML file']);
      }

      this.updateProgress(sessionIdToUse, 'conversion', 25, 'Converting entries to video objects...', { 
        totalEntries: rawEntries.length 
      });
      
      // Convert to structured video entries
      timer.stage('Converting to Video Entries');
      const videoEntries = this.convertToVideoEntries(rawEntries);
      logger.info(`Converted to ${videoEntries.length} video entries`);
      logger.debug('Video entry conversion stats', {
        rawEntriesProcessed: rawEntries.length,
        videoEntriesCreated: videoEntries.length,
        conversionSuccessRate: ((videoEntries.length / rawEntries.length) * 100).toFixed(1) + '%'
      });

      let limitedEntries: IVideoEntry[];
      let existingVideos: Map<string, any> = new Map();
      let duplicatesRemoved = 0;

      // DEBUG: Check forceReprocessing option before condition
      logger.info('🔍 FORCE REPROCESSING DEBUG: Checking condition...', {
        forceReprocessing: options.forceReprocessing,
        forceReprocessingType: typeof options.forceReprocessing,
        optionsObject: options,
        conditionWillMatch: !!options.forceReprocessing
      });

      // More explicit check to handle potential type issues
      const shouldForceReprocess = options.forceReprocessing === true || String(options.forceReprocessing) === 'true';
      logger.info('🔍 EXPLICIT FORCE CHECK:', { shouldForceReprocess, originalValue: options.forceReprocessing });

      if (shouldForceReprocess) {
        // Skip duplicate checking when force reprocessing is enabled
        this.updateProgress(sessionIdToUse, 'deduplication', 35, 'Skipping duplicate check - force reprocessing all videos...', { 
          totalEntries: videoEntries.length 
        });
        
        timer.stage('Force Reprocessing - Skip Duplicate Check');
        limitedEntries = videoEntries;
        logger.info(`🚀 FORCE REPROCESSING ENABLED: Processing all ${videoEntries.length} videos (skipping duplicate check)`);
        logger.info('🔍 FORCE REPROCESSING DEBUG: Duplicate check skipped', {
          totalVideos: videoEntries.length,
          forceReprocessing: true,
          reason: 'User requested reprocessing of all videos - will process all videos and let upsert handle duplicates',
          videoEntryTypes: videoEntries.slice(0, 5).map(v => ({ title: v.title.substring(0, 50), contentType: v.contentType, category: v.category }))
        });
      } else {
        // Check for duplicates against database
        this.updateProgress(sessionIdToUse, 'deduplication', 35, 'Checking for duplicates in database...', { 
          totalEntries: videoEntries.length 
        });
        
        timer.stage('Database Duplicate Check');
        const duplicateCheckResult = await this.videoService.checkForDuplicates(videoEntries);
        const newVideos = duplicateCheckResult.newVideos;
        existingVideos = duplicateCheckResult.existingVideos;
        duplicatesRemoved = duplicateCheckResult.duplicateCount;
        
        logger.info(`Database duplicate check: ${duplicatesRemoved} existing videos found, ${newVideos.length} new videos to process`);
        logger.debug('Database duplicate check results', {
          totalVideos: videoEntries.length,
          existingVideos: duplicatesRemoved,
          newVideos: newVideos.length,
          duplicateRate: ((duplicatesRemoved / videoEntries.length) * 100).toFixed(1) + '%'
        });
        debugVideoProcessing.duplicatesRemoved(videoEntries.length, newVideos.length);

        limitedEntries = newVideos;
      }

      logger.info(`Processing ${limitedEntries.length} videos (${shouldForceReprocess ? 'force reprocessing enabled' : 'new videos only'})`);

      // Apply initial filters (date range and categories only - content type filtering happens after enrichment)
      timer.stage('Pre-enrichment Filtering');
      const preFilteredEntries = this.applyPreEnrichmentFilters(limitedEntries, options);
      logger.info(`Applied pre-enrichment filters, ${preFilteredEntries.length} entries remaining`);
      logger.info('🔍 FILTER DEBUG: Pre-enrichment filtering results', {
        beforeFiltering: limitedEntries.length,
        afterFiltering: preFilteredEntries.length,
        filteredOut: limitedEntries.length - preFilteredEntries.length,
        hasDateRangeFilter: !!options.dateRange,
        hasCategoryFilters: !!(options.categoryFilters && options.categoryFilters.length > 0),
        dateRange: options.dateRange ? {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString()
        } : null,
        categoryFilters: options.categoryFilters || null
      });

      // Log warning if too many videos filtered out
      if (preFilteredEntries.length < limitedEntries.length * 0.1) {
        logger.warn('🚨 WARNING: Most videos filtered out by pre-enrichment filters!', {
          originalCount: limitedEntries.length,
          remainingCount: preFilteredEntries.length,
          filteringRate: ((limitedEntries.length - preFilteredEntries.length) / limitedEntries.length * 100).toFixed(1) + '%'
        });
      }

      this.updateProgress(sessionIdToUse, 'enrichment_start', 45, 'Starting enrichment service...', { 
        totalEntries: preFilteredEntries.length,
        enrichWithAPI: options.enrichWithAPI 
      });
      
      // Enrich with YouTube API, Scraping Service, High-Performance Scraping Service, or LLM Service if requested
      let enrichedEntries = preFilteredEntries;
      if (options.enrichWithAPI) {
        // NEW SERVICE PRIORITY: LLM (Primary) > API > High-Performance > Scraping
        // Default to LLM service when enrichment is enabled
        const useLLMService = options.useLLMService !== false; // Default to true unless explicitly disabled
        const useHighPerformanceService = options.useHighPerformanceService || false;
        const useScrapingService = options.useScrapingService || false;
        
        let serviceName: string;
        let service: any;
        let isLLMService = false;
        
        // Prioritize LLM as the primary extraction method
        if (useLLMService && this.youtubeLLMScraping) {
          serviceName = 'AI-Powered Extraction';
          service = this.youtubeLLMScraping;
          isLLMService = true;
        } else if (!useLLMService && this.youtubeAPI) {
          // If LLM is explicitly disabled, try API first
          serviceName = 'YouTube API';
          service = this.youtubeAPI;
        } else if (useHighPerformanceService && this.youtubeHighPerformanceScraping) {
          serviceName = 'High-Performance Scraping';
          service = this.youtubeHighPerformanceScraping;
        } else if (useScrapingService && this.youtubeScraping) {
          serviceName = 'Web Scraping';
          service = this.youtubeScraping;
        } else if (this.youtubeAPI) {
          // Final fallback to API if nothing else is available
          serviceName = 'YouTube API (Fallback)';
          service = this.youtubeAPI;
        } else {
          serviceName = 'None';
          service = null;
        }
        
        if (service) {
          try {
            timer.stage(`YouTube ${serviceName} Enrichment`);
            logger.debug(`Starting ${serviceName.toLowerCase()} enrichment process`, {
              totalEntries: preFilteredEntries.length,
              serviceType: serviceName,
              serviceAvailable: !!service,
              highPerformanceRequested: useHighPerformanceService,
              scrapingRequested: useScrapingService
            });
            
            this.updateProgress(sessionIdToUse, 'enrichment_processing', 50, `Enriching ${preFilteredEntries.length} videos with YouTube ${serviceName}...`, { 
              totalEntries: preFilteredEntries.length,
              serviceType: serviceName
            });
            
            if (isLLMService) {
              // Handle LLM service differently - it works with video IDs
              const videoIds = preFilteredEntries.map(entry => entry.videoId).filter(Boolean);
              const llmResults = await service.scrapeVideos(videoIds);
              
              // Convert LLM results back to enriched entries
              enrichedEntries = preFilteredEntries.map(entry => {
                const llmResult = llmResults.find((r: any) => r.videoId === entry.videoId && r.success);
                if (llmResult && llmResult.data) {
                  return {
                    ...entry,
                    title: llmResult.data.title || entry.title,
                    description: llmResult.data.description || entry.description,
                    channelName: llmResult.data.channelName || entry.channel,
                    channelId: llmResult.data.channelId || entry.channelId,
                    duration: llmResult.data.duration || entry.duration,
                    viewCount: llmResult.data.viewCount || entry.viewCount,
                    likeCount: llmResult.data.likeCount || entry.likeCount,
                    publishedAt: llmResult.data.publishedAt || entry.publishedAt,
                    tags: llmResult.data.tags || entry.tags,
                    thumbnailUrl: llmResult.data.thumbnailUrl || entry.thumbnailUrl,
                    category: llmResult.data.category as VideoCategory || entry.category,
                    enrichedWithAPI: true,
                    llmEnriched: true,
                    llmProvider: options.llmProvider,
                    llmCost: llmResult.cost
                  };
                }
                return entry;
              });
            } else {
              enrichedEntries = await service.enrichVideoEntries(preFilteredEntries);
            }
            
            const enrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
            
            this.updateProgress(sessionIdToUse, 'enrichment_complete', 70, `${serviceName} enrichment complete. ${enrichedCount} videos enriched`, { 
              totalEntries: preFilteredEntries.length,
              enrichedEntries: enrichedCount,
              enrichmentRate: ((enrichedCount / preFilteredEntries.length) * 100).toFixed(1) + '%',
              serviceType: serviceName
            });
            
            logger.info(`Enriched ${enrichedCount} entries with ${serviceName.toLowerCase()} data`);
            logger.debug(`${serviceName} enrichment results`, {
              totalEntries: preFilteredEntries.length,
              enrichedEntries: enrichedCount,
              enrichmentRate: ((enrichedCount / preFilteredEntries.length) * 100).toFixed(1) + '%',
              failedEnrichments: preFilteredEntries.length - enrichedCount,
              serviceType: serviceName
            });

            // Log scraping statistics if using scraping service
            if (useScrapingService && this.youtubeScraping) {
              const stats = this.youtubeScraping.getScrapingStats();
              logger.debug('Scraping service statistics', stats);
            }

          } catch (error) {
            logger.error(`Error during ${serviceName} enrichment:`, error);
            errors.push(`${serviceName} enrichment failed: ${error}`);
            
            // Enhanced fallback chain: LLM → API → Scraping
            let fallbackAttempted = false;
            
            // If LLM failed, try API
            if (isLLMService && this.youtubeAPI) {
              logger.info('AI extraction failed, attempting fallback to YouTube API');
              fallbackAttempted = true;
              try {
                enrichedEntries = await this.youtubeAPI.enrichVideoEntries(preFilteredEntries);
                const fallbackEnrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
                logger.info(`Fallback API enrichment successful: ${fallbackEnrichedCount} videos enriched`);
              } catch (apiError) {
                logger.error('API fallback also failed:', apiError);
                errors.push(`API fallback failed: ${apiError}`);
                
                // Try scraping as final fallback
                if (this.youtubeScraping) {
                  logger.info('API fallback failed, attempting web scraping as final fallback');
                  try {
                    enrichedEntries = await this.youtubeScraping.enrichVideoEntries(preFilteredEntries);
                    const scrapingEnrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
                    logger.info(`Final fallback scraping successful: ${scrapingEnrichedCount} videos enriched`);
                  } catch (scrapingError) {
                    logger.error('All enrichment methods failed:', scrapingError);
                    errors.push(`All enrichment methods failed: ${scrapingError}`);
                  }
                }
              }
            } 
            // If API failed and LLM wasn't used, try scraping
            else if (!isLLMService && serviceName.includes('API') && this.youtubeScraping) {
              logger.info('API failed, attempting fallback to web scraping');
              fallbackAttempted = true;
              try {
                enrichedEntries = await this.youtubeScraping.enrichVideoEntries(preFilteredEntries);
                const fallbackEnrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
                logger.info(`Fallback scraping enrichment successful: ${fallbackEnrichedCount} videos enriched`);
              } catch (fallbackError) {
                logger.error('Scraping fallback also failed:', fallbackError);
                errors.push(`Scraping fallback failed: ${fallbackError}`);
              }
            }
            
            if (!fallbackAttempted) {
              logger.warn('No fallback services available after enrichment failure');
            }
          }
        } else {
          logger.debug(`${serviceName} enrichment skipped`, {
            enrichWithAPI: options.enrichWithAPI,
            useScrapingService: useScrapingService,
            youtubeAPIAvailable: !!this.youtubeAPI,
            youtubeScrapingAvailable: !!this.youtubeScraping,
            reason: `${serviceName} service not available`
          });
        }
      } else {
        logger.debug('Enrichment skipped', {
          enrichWithAPI: options.enrichWithAPI,
          reason: 'enrichment disabled in options'
        });
      }

      // Apply content type filters AFTER enrichment (when we have accurate duration data)
      timer.stage('Post-enrichment Filtering');
      const finalFilteredEntries = this.applyPostEnrichmentFilters(enrichedEntries, options);
      logger.info(`Applied post-enrichment filters, ${finalFilteredEntries.length} entries remaining`);
      logger.debug('Post-enrichment filtering results', {
        beforeFiltering: enrichedEntries.length,
        afterFiltering: finalFilteredEntries.length,
        filteredOut: enrichedEntries.length - finalFilteredEntries.length,
        includeAds: options.includeAds,
        includeShorts: options.includeShorts
      });

      this.updateProgress(sessionIdToUse, 'analytics', 85, 'Generating analytics and insights...', { 
        totalEntries: finalFilteredEntries.length 
      });
      
      // Generate metrics
      timer.stage('Metrics Generation');
      const metrics = await this.analyticsService.generateMetrics(finalFilteredEntries);
      logger.info('Generated comprehensive metrics');
      debugVideoProcessing.metricsGeneration(finalFilteredEntries.length, ['overview', 'temporal', 'categories', 'channels']);

      this.updateProgress(sessionIdToUse, 'database_storage', 90, 'Storing videos in database...', { 
        totalEntries: finalFilteredEntries.length
      });
      
      // Store videos in database
      timer.stage('Database Storage');
      try {
        // Store new videos
        if (finalFilteredEntries.length > 0) {
          const storageResult = await this.videoService.bulkUpsertVideos(finalFilteredEntries);
          logger.info('Database storage completed', {
            upsertedCount: storageResult.upsertedCount,
            modifiedCount: storageResult.modifiedCount,
            totalProcessed: storageResult.totalProcessed,
            processingTime: storageResult.processingTime
          });
          
          if (storageResult.errors.length > 0) {
            errors.push(...storageResult.errors);
            logger.warn('Some videos failed to store in database', { errorCount: storageResult.errors.length });
          }
        }
        
        // Update existing videos with enriched data if we have any
        if (existingVideos.size > 0 && options.enrichWithAPI) {
          const enrichedUpdates = new Map<string, Partial<IVideoEntry>>();
          
          // Collect enriched data for existing videos
          for (const [key, existingVideo] of existingVideos.entries()) {
            // Find if this existing video was enriched in our processing
            const enrichedData = finalFilteredEntries.find(v => 
              (v.videoId && v.videoId === existingVideo.videoId) || 
              v.url === existingVideo.url
            );
            
            if (enrichedData && enrichedData.enrichedWithAPI) {
              enrichedUpdates.set(key, {
                description: enrichedData.description,
                duration: enrichedData.duration,
                viewCount: enrichedData.viewCount,
                likeCount: enrichedData.likeCount,
                commentCount: enrichedData.commentCount,
                publishedAt: enrichedData.publishedAt,
                tags: enrichedData.tags,
                thumbnailUrl: enrichedData.thumbnailUrl,
                category: enrichedData.category,
                enrichedWithAPI: true
              });
            }
          }
          
          if (enrichedUpdates.size > 0) {
            const updateResult = await this.videoService.updateExistingVideos(enrichedUpdates);
            logger.info('Updated existing videos with enriched data', {
              updatedCount: updateResult.modifiedCount,
              totalAttempted: enrichedUpdates.size
            });
          }
        }
        
      } catch (dbError) {
        logger.error('Error storing videos in database:', dbError);
        errors.push(`Database storage failed: ${dbError}`);
      }

      this.updateProgress(sessionIdToUse, 'complete', 100, 'Processing complete!', { 
        totalEntries: rawEntries.length,
        validEntries: finalFilteredEntries.length,
        enrichedEntries: finalFilteredEntries.filter(e => e.enrichedWithAPI).length,
        duplicatesSkipped: duplicatesRemoved,
        errors: errors.length
      });

      const totalProcessingTime = timer.end({
        totalEntriesProcessed: rawEntries.length,
        finalValidEntries: finalFilteredEntries.length,
        duplicatesRemoved,
        videosLimitedForTesting: 0,
        enrichmentEnabled: options.enrichWithAPI,
        errorCount: errors.length
      });
      
      return {
        entries: finalFilteredEntries,
        metrics,
        processingStats: {
          totalEntries: rawEntries.length,
          validEntries: finalFilteredEntries.length,
          duplicatesRemoved,
          videosLimitedForTesting: 0,
          errors,
          processingTime: totalProcessingTime / 1000
        }
      };

    } catch (error) {
      const sessionIdToUse = sessionId || `session_error_${Date.now()}`;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      this.setError(sessionIdToUse, errorMessage);
      
      logger.error('Error parsing watch history:', error);
      const processingTime = timer.end({ 
        error: true,
        errorMessage
      });
      
      return {
        entries: [],
        metrics: await this.analyticsService.generateMetrics([]),
        processingStats: {
          totalEntries: 0,
          validEntries: 0,
          duplicatesRemoved: 0,
          videosLimitedForTesting: 0,
          errors: [`Fatal parsing error: ${errorMessage}`],
          processingTime: processingTime / 1000
        }
      };
    }
  }

  /**
   * Extract raw entries from HTML content using fast regex parsing
   */
  private extractRawEntries(htmlContent: string): any[] {
    const timer = createTimer('HTML Entry Extraction');
    
    try {
      logger.debug('Starting fast HTML parsing with regex', {
        contentLength: htmlContent.length,
        contentPreview: htmlContent.substring(0, 200) + '...'
      });
      
      timer.stage('Extracting video links with regex');
      
      // Use regex to find video entries directly - much faster than DOM parsing
      // This regex looks for common patterns in YouTube takeout data
      const videoLinkRegex = /<a[^>]*href="[^"]*(?:watch\?v=|youtu\.be\/|shorts\/)[^"]*"[^>]*>([^<]+)<\/a>/gi;
      const allVideoMatches = [...htmlContent.matchAll(videoLinkRegex)];
      
      logger.debug(`Found ${allVideoMatches.length} potential video entries`);
      
      if (allVideoMatches.length === 0) {
        logger.warn('No video links found in HTML content');
        timer.end({ success: false, entriesFound: 0 });
        return [];
      }

      debugVideoProcessing.domParsed(allVideoMatches.length, 'regex-extraction');

      const rawEntries: any[] = [];
      let validEntries = 0;
      let invalidEntries = 0;
      
      timer.stage('Processing video matches');
      
      for (let i = 0; i < allVideoMatches.length; i++) {
        try {
          const match = allVideoMatches[i];
          const extractedData = this.extractEntryDataFromMatch(match, htmlContent);
          
          if (extractedData) {
            rawEntries.push(extractedData);
            validEntries++;
          } else {
            invalidEntries++;
          }
          
          // Progress logging for large datasets
          if ((i + 1) % 1000 === 0) {
            logger.debug(`Processed ${i + 1}/${allVideoMatches.length} entries (${((i + 1) / allVideoMatches.length * 100).toFixed(1)}%)`);
          }
        } catch (error) {
          invalidEntries++;
          logger.warn(`Error extracting entry ${i + 1}:`, error);
        }
      }

      logger.debug('Entry extraction completed', {
        totalMatchesProcessed: allVideoMatches.length,
        validEntriesExtracted: validEntries,
        invalidEntriesSkipped: invalidEntries,
        successRate: ((validEntries / allVideoMatches.length) * 100).toFixed(1) + '%'
      });

      timer.end({ 
        totalElements: allVideoMatches.length,
        validEntries,
        invalidEntries,
        extractionMethod: 'regex-based'
      });

      return rawEntries;

    } catch (error) {
      logger.error('Error parsing HTML:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to parse HTML content: ${error}`);
    }
  }



  /**
   * Extract data from a regex match of a video link
   */
  private extractEntryDataFromMatch(match: RegExpMatchArray, htmlContent: string): any | null {
    try {
      const fullMatch = match[0];
      const title = match[1]?.trim() || 'Unknown Title';
      
      // Extract URL from the href attribute
      const hrefMatch = fullMatch.match(/href="([^"]+)"/);
      const url = hrefMatch ? hrefMatch[1] : '';
      
      if (!url) {
        return null;
      }

      // Use simple patterns to find channel and date info around this match
      const matchIndex = match.index || 0;
      const contextStart = Math.max(0, matchIndex - 1000);
      const contextEnd = Math.min(htmlContent.length, matchIndex + 1000);
      const context = htmlContent.substring(contextStart, contextEnd);
      
      // Extract channel name (simple approach)
      let channel = 'Unknown Channel';
      const channelMatch = context.match(/<a[^>]*href="[^"]*(?:\/channel\/|\/c\/|\/@)[^"]*"[^>]*>([^<]+)<\/a>/i);
      if (channelMatch) {
        channel = channelMatch[1].trim();
      }
      
      // Default date to now (can be improved with more parsing)
      const watchedAt = new Date();
      
      // Detect content type
      let contentType = ContentType.VIDEO;
      if (url.includes('/shorts/')) {
        contentType = ContentType.SHORT;
      }
      
      return {
        title,
        channel,
        url: this.normalizeURL(url),
        watchedAt,
        contentType,
        extractionMetadata: {
          method: 'regex-extraction',
          hasContext: context.length > 0
        }
      };
      
    } catch (error) {
      logger.warn('Error extracting data from regex match:', error);
      return null;
    }
  }



  /**
   * Convert raw entries to structured video entries
   */
  private convertToVideoEntries(rawEntries: any[]): IVideoEntry[] {
    return rawEntries.map(raw => ({
      title: raw.title,
      channel: raw.channel,
      url: raw.url,
      watchedAt: raw.watchedAt,
      contentType: raw.contentType || ContentType.UNKNOWN,
      category: VideoCategory.UNKNOWN,
      enrichedWithAPI: false,
      lastUpdated: new Date(),
      videoId: raw.videoId || undefined,
      processingErrors: []
    }));
  }

  /**
   * Remove duplicate entries based on URL and timestamp
   */
  private removeDuplicates(entries: IVideoEntry[]): IVideoEntry[] {
    const seen = new Set<string>();
    return entries.filter(entry => {
      const key = `${entry.url}-${entry.watchedAt.getTime()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Apply initial filters (date range and categories) before enrichment
   */
  private applyPreEnrichmentFilters(entries: IVideoEntry[], options: ParseOptions): IVideoEntry[] {
    const timer = createTimer('Pre-enrichment Filtering');
    let filtered = entries;
    const originalCount = entries.length;

    // Filter by date range
    if (options.dateRange) {
      timer.stage('Date Range Filtering');
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(entry => 
        entry.watchedAt >= options.dateRange!.start && 
        entry.watchedAt <= options.dateRange!.end
      );
      logger.debug('Date range filter applied', {
        beforeFilter: beforeDateFilter,
        afterFilter: filtered.length,
        filteredOut: beforeDateFilter - filtered.length,
        dateRange: {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString()
        }
      });
    }

    // Filter by categories (if specified)
    if (options.categoryFilters && options.categoryFilters.length > 0) {
      timer.stage('Category Filtering');
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(entry => 
        options.categoryFilters!.includes(entry.category)
      );
      logger.debug('Category filter applied', {
        beforeFilter: beforeCategoryFilter,
        afterFilter: filtered.length,
        filteredOut: beforeCategoryFilter - filtered.length,
        allowedCategories: options.categoryFilters
      });
    }

    timer.end({
      originalCount,
      finalCount: filtered.length,
      totalFilteredOut: originalCount - filtered.length,
      filtersApplied: {
        dateRange: !!options.dateRange,
        categories: !!(options.categoryFilters && options.categoryFilters.length > 0)
      }
    });

    return filtered;
  }

  /**
   * Apply content type filters after enrichment
   */
  private applyPostEnrichmentFilters(entries: IVideoEntry[], options: ParseOptions): IVideoEntry[] {
    const timer = createTimer('Post-enrichment Filtering');
    let filtered = entries;
    const originalCount = entries.length;

    // Filter by content type
    if (!options.includeAds) {
      timer.stage('Ads Filtering');
      const beforeAdsFilter = filtered.length;
      filtered = filtered.filter(entry => entry.contentType !== ContentType.AD);
      logger.debug('Ads filter applied', {
        beforeFilter: beforeAdsFilter,
        afterFilter: filtered.length,
        adsFiltered: beforeAdsFilter - filtered.length
      });
    }

    if (!options.includeShorts) {
      timer.stage('Shorts Filtering');
      const beforeShortsFilter = filtered.length;
      filtered = filtered.filter(entry => entry.contentType !== ContentType.SHORT);
      logger.debug('Shorts filter applied', {
        beforeFilter: beforeShortsFilter,
        afterFilter: filtered.length,
        shortsFiltered: beforeShortsFilter - filtered.length
      });
    }

    timer.end({
      originalCount,
      finalCount: filtered.length,
      totalFilteredOut: originalCount - filtered.length,
      filtersApplied: {
        excludeAds: !options.includeAds,
        excludeShorts: !options.includeShorts
      }
    });

    return filtered;
  }

  /**
   * Normalize YouTube URLs to standard format
   */
  private normalizeURL(url: string): string {
    if (!url) return '';

    // Handle relative URLs
    if (url.startsWith('/')) {
      url = 'https://www.youtube.com' + url;
    }

    // Convert youtu.be to youtube.com
    url = url.replace('youtu.be/', 'youtube.com/watch?v=');

    return url;
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(startTime: number, errors: string[]): ParseResult {
    return {
      entries: [],
      metrics: this.analyticsService ? 
        this.analyticsService.generateMetrics([]).then(m => m) as any : 
        {} as VideoMetrics,
      processingStats: {
        totalEntries: 0,
        validEntries: 0,
        duplicatesRemoved: 0,
        videosLimitedForTesting: 0,
        errors,
        processingTime: (Date.now() - startTime) / 1000
      }
    };
  }
} 