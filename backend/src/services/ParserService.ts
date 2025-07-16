import { JSDOM } from 'jsdom';
import { IVideoEntry, ContentType, VideoCategory } from '../models/VideoEntry';
import { VideoMetrics } from '../models/Metrics';
import { YouTubeAPIService } from './YouTubeAPIService';
import { AnalyticsService } from './AnalyticsService';
import { logger } from '../utils/logger';

export interface ParseOptions {
  enrichWithAPI: boolean;
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
    errors: string[];
    processingTime: number;
  };
}

export class ParserService {
  private youtubeAPI: YouTubeAPIService;
  private analyticsService: AnalyticsService;

  constructor(youtubeAPI: YouTubeAPIService, analyticsService: AnalyticsService) {
    this.youtubeAPI = youtubeAPI;
    this.analyticsService = analyticsService;
  }

  /**
   * Parse YouTube watch history HTML file
   */
  public async parseWatchHistory(htmlContent: string, options: ParseOptions): Promise<ParseResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    logger.info('Starting watch history parsing...', { 
      enrichWithAPI: options.enrichWithAPI,
      includeAds: options.includeAds,
      includeShorts: options.includeShorts
    });

    try {
      // Parse HTML and extract raw entries
      const rawEntries = this.extractRawEntries(htmlContent);
      logger.info(`Extracted ${rawEntries.length} raw entries from HTML`);

      if (rawEntries.length === 0) {
        logger.warn('No entries found in HTML content');
        return this.createEmptyResult(startTime, ['No watch history entries found in HTML file']);
      }

      // Convert to structured video entries
      const videoEntries = this.convertToVideoEntries(rawEntries);
      logger.info(`Converted to ${videoEntries.length} video entries`);

      // Remove duplicates
      const uniqueEntries = this.removeDuplicates(videoEntries);
      const duplicatesRemoved = videoEntries.length - uniqueEntries.length;
      logger.info(`Removed ${duplicatesRemoved} duplicate entries`);

      // Apply filters
      const filteredEntries = this.applyFilters(uniqueEntries, options);
      logger.info(`Applied filters, ${filteredEntries.length} entries remaining`);

      // Enrich with YouTube API if requested
      let enrichedEntries = filteredEntries;
      if (options.enrichWithAPI && this.youtubeAPI) {
        try {
          enrichedEntries = await this.youtubeAPI.enrichVideoEntries(filteredEntries);
          logger.info(`Enriched ${enrichedEntries.filter(e => e.enrichedWithAPI).length} entries with API data`);
        } catch (error) {
          logger.error('Error during API enrichment:', error);
          errors.push(`API enrichment failed: ${error}`);
        }
      }

      // Generate metrics
      const metrics = await this.analyticsService.generateMetrics(enrichedEntries);
      logger.info('Generated comprehensive metrics');

      const processingTime = (Date.now() - startTime) / 1000;
      
      return {
        entries: enrichedEntries,
        metrics,
        processingStats: {
          totalEntries: rawEntries.length,
          validEntries: enrichedEntries.length,
          duplicatesRemoved,
          errors,
          processingTime
        }
      };

    } catch (error) {
      logger.error('Error parsing watch history:', error);
      const processingTime = (Date.now() - startTime) / 1000;
      
      return {
        entries: [],
        metrics: await this.analyticsService.generateMetrics([]),
        processingStats: {
          totalEntries: 0,
          validEntries: 0,
          duplicatesRemoved: 0,
          errors: [`Fatal parsing error: ${error}`],
          processingTime
        }
      };
    }
  }

  /**
   * Extract raw entries from HTML content
   */
  private extractRawEntries(htmlContent: string): any[] {
    try {
      const { window } = new JSDOM(htmlContent);
      const document = window.document;

      // Try different selectors for YouTube watch history format
      const selectors = [
        '.outer-cell',           // Standard format
        '.content-cell',         // Alternative format
        '[data-test-id="video-entry"]', // Newer format
        '.activity-record'       // Legacy format
      ];

      let entries: NodeListOf<Element> | null = null;
      
      for (const selector of selectors) {
        entries = document.querySelectorAll(selector);
        if (entries && entries.length > 0) {
          logger.debug(`Found entries using selector: ${selector}`);
          break;
        }
      }

      if (!entries || entries.length === 0) {
        logger.warn('No entries found with any known selector');
        return [];
      }

      const rawEntries: any[] = [];
      
      entries.forEach((entry, index) => {
        try {
          const extractedData = this.extractEntryData(entry);
          if (extractedData) {
            rawEntries.push(extractedData);
          }
        } catch (error) {
          logger.warn(`Error extracting entry ${index}:`, error);
        }
      });

      return rawEntries;

    } catch (error) {
      logger.error('Error parsing HTML DOM:', error);
      throw new Error(`Failed to parse HTML content: ${error}`);
    }
  }

  /**
   * Extract data from a single entry element
   */
  private extractEntryData(element: Element): any | null {
    try {
      // Find title and URL
      const titleElement = element.querySelector('a[href*="watch?v="], a[href*="youtu.be/"], a[href*="shorts/"]');
      
      if (!titleElement) {
        return null; // Skip entries without video links
      }

      const url = titleElement.getAttribute('href') || '';
      const title = titleElement.textContent?.trim() || 'Unknown Title';

      // Find channel name - try multiple selectors
      const channelSelectors = [
        '.channel-name',
        '.creator-name', 
        'a[href*="/channel/"]',
        'a[href*="/c/"]',
        'a[href*="/@"]'
      ];
      
      let channel = 'Unknown Channel';
      for (const selector of channelSelectors) {
        const channelElement = element.querySelector(selector);
        if (channelElement) {
          channel = channelElement.textContent?.trim() || 'Unknown Channel';
          break;
        }
      }

      // Find date/time
      const dateSelectors = [
        'time[datetime]',
        '.timestamp',
        '.date',
        '[data-timestamp]'
      ];

      let watchedAt = new Date();
      for (const selector of dateSelectors) {
        const dateElement = element.querySelector(selector);
        if (dateElement) {
          const dateValue = dateElement.getAttribute('datetime') || 
                          dateElement.getAttribute('data-timestamp') ||
                          dateElement.textContent;
          
          if (dateValue) {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              watchedAt = parsedDate;
              break;
            }
          }
        }
      }

      // Extract additional metadata if available
      const metadata = this.extractMetadata(element);

      return {
        title,
        channel,
        url: this.normalizeURL(url),
        watchedAt,
        ...metadata
      };

    } catch (error) {
      logger.warn('Error extracting entry data:', error);
      return null;
    }
  }

  /**
   * Extract additional metadata from entry element
   */
  private extractMetadata(element: Element): any {
    const metadata: any = {};

    // Try to detect content type from URL or context
    const url = element.querySelector('a')?.getAttribute('href') || '';
    
    if (url.includes('/shorts/')) {
      metadata.contentType = ContentType.SHORT;
    } else if (url.includes('live') || element.textContent?.includes('live')) {
      metadata.contentType = ContentType.LIVESTREAM;
    } else {
      metadata.contentType = ContentType.VIDEO;
    }

    // Check for ads
    if (element.textContent?.toLowerCase().includes('ad') || 
        element.classList.contains('ad') ||
        element.querySelector('.ad-marker')) {
      metadata.contentType = ContentType.AD;
    }

    return metadata;
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
      videoId: this.youtubeAPI?.extractVideoId(raw.url),
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
   * Apply filters based on options
   */
  private applyFilters(entries: IVideoEntry[], options: ParseOptions): IVideoEntry[] {
    let filtered = entries;

    // Filter by content type
    if (!options.includeAds) {
      filtered = filtered.filter(entry => entry.contentType !== ContentType.AD);
    }

    if (!options.includeShorts) {
      filtered = filtered.filter(entry => entry.contentType !== ContentType.SHORT);
    }

    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter(entry => 
        entry.watchedAt >= options.dateRange!.start && 
        entry.watchedAt <= options.dateRange!.end
      );
    }

    // Filter by categories (if specified)
    if (options.categoryFilters && options.categoryFilters.length > 0) {
      filtered = filtered.filter(entry => 
        options.categoryFilters!.includes(entry.category)
      );
    }

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
        errors,
        processingTime: (Date.now() - startTime) / 1000
      }
    };
  }
} 