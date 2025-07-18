import * as cheerio from 'cheerio';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger, createTimer, debugVideoProcessing } from '../utils/logger';

export interface ScrapingConfig {
  maxConcurrentRequests: number;
  requestDelayMs: number;
  retryAttempts: number;
  timeout: number;
  userAgents: string[];
  enableJavaScript: boolean;
  enableBrowser: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface ScrapedVideoData {
  title?: string;
  description?: string;
  channelName?: string;
  channelId?: string;
  duration?: number; // seconds
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: Date;
  tags?: string[];
  thumbnailUrl?: string;
  category?: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date;
  isOpen: boolean;
  halfOpenAttempts: number;
}

export class YouTubeScrapingService {
  private config: ScrapingConfig;
  private cache: NodeCache;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private circuitBreaker: CircuitBreakerState;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];

  private readonly DEFAULT_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  };

  constructor(config: ScrapingConfig) {
    this.config = {
      ...config,
      userAgents: config.userAgents.length > 0 ? config.userAgents : this.USER_AGENTS
    };
    
    // Cache for 24 hours by default
    this.cache = new NodeCache({ 
      stdTTL: this.config.cacheTTL || 86400,
      checkperiod: 600 // Check for expired keys every 10 minutes
    });
    
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: new Date(),
      isOpen: false,
      halfOpenAttempts: 0
    };

    this.concurrencyLimit = pLimit(this.config.maxConcurrentRequests);

    logger.debug('YouTubeScrapingService initialized', {
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      requestDelayMs: this.config.requestDelayMs,
      retryAttempts: this.config.retryAttempts,
      timeout: this.config.timeout,
      enableJavaScript: this.config.enableJavaScript,
      enableBrowser: this.config.enableBrowser,
      cacheEnabled: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL,
      userAgentCount: this.config.userAgents.length
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
   * Main entry point - enrich video entries with scraped data
   */
  public async enrichVideoEntries(entries: IVideoEntry[]): Promise<IVideoEntry[]> {
    const timer = createTimer('YouTube Scraping Enrichment');
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

    logger.info(`Scraping ${videoIds.size} unique videos from ${entries.length} entries`);
    debugVideoProcessing.apiEnrichmentStart(Array.from(videoIds), Math.ceil(videoIds.size / 5));

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      logger.warn('Circuit breaker is open, skipping scraping', {
        failures: this.circuitBreaker.failures,
        lastFailureTime: this.circuitBreaker.lastFailureTime
      });
      timer.end({ success: false, reason: 'circuit_breaker_open' });
      return enrichedEntries;
    }

    // Process in small batches
    const videoIdArray = Array.from(videoIds);
    const batches = this.chunkArray(videoIdArray, 5); // Small batches for scraping

    timer.stage('Batch Processing');
    logger.debug('Starting batch processing', {
      totalBatches: batches.length,
      batchSize: 5,
      requestDelay: this.config.requestDelayMs,
      concurrencyLimit: this.config.maxConcurrentRequests
    });

    let totalEnriched = 0;
    let totalErrors = 0;

    // Initialize browser if needed
    if (this.config.enableBrowser && !this.browser) {
      await this.initializeBrowser();
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchTimer = createTimer(`Scraping Batch ${i + 1}/${batches.length}`);
      
      try {
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
          batchIndex: i + 1,
          batchSize: batch.length,
          videoIds: batch
        });

        batchTimer.stage('Scraping Video Data');
        const scrapingPromises = batch.map(videoId => 
          this.concurrencyLimit(() => this.scrapeVideoData(videoId))
        );
        
        const scrapedDataResults = await Promise.allSettled(scrapingPromises);
        
        logger.debug('Scraping data fetched for batch', {
          batchIndex: i + 1,
          videoIds: batch,
          resultsCount: scrapedDataResults.length
        });

        // Apply enrichment to matching entries
        batchTimer.stage('Applying Enrichment');
        let batchEnriched = 0;
        
        for (let j = 0; j < batch.length; j++) {
          const videoId = batch[j];
          const result = scrapedDataResults[j];
          
          if (result.status === 'fulfilled' && result.value) {
            for (const entry of enrichedEntries) {
              if (entry.videoId === videoId) {
                const enrichmentResult = this.applyVideoEnrichment(entry, result.value);
                if (enrichmentResult.success) {
                  batchEnriched++;
                  totalEnriched++;
                  this.successCount++;
                } else {
                  totalErrors++;
                  this.errorCount++;
                  logger.debug('Enrichment failed for video', {
                    videoId: entry.videoId,
                    reason: enrichmentResult.error,
                    title: entry.title.substring(0, 50) + '...'
                  });
                }
                break;
              }
            }
          } else {
            totalErrors++;
            this.errorCount++;
            // Add error to affected entry
            for (const entry of enrichedEntries) {
              if (entry.videoId === videoId) {
                entry.processingErrors = entry.processingErrors || [];
                const error = result.status === 'rejected' ? result.reason : 'Failed to scrape video data';
                entry.processingErrors.push(`Scraping failed: ${error}`);
                break;
              }
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
          logger.debug(`Rate limiting delay: ${this.config.requestDelayMs}ms`);
          await this.delay(this.config.requestDelayMs);
        }

      } catch (error) {
        logger.error(`Error scraping batch ${i + 1}:`, error);
        totalErrors += batch.length;
        this.recordFailure();
        
        // Add error information to affected entries
        for (const entry of enrichedEntries) {
          if (entry.videoId && batch.includes(entry.videoId)) {
            entry.processingErrors = entry.processingErrors || [];
            entry.processingErrors.push(`Batch scraping failed: ${error}`);
          }
        }

        batchTimer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Clean up browser if we're done
    if (this.config.enableBrowser && this.browser) {
      await this.cleanupBrowser();
    }

    const finalEnrichedCount = enrichedEntries.filter(e => e.enrichedWithAPI).length;
    timer.end({
      totalEntries: entries.length,
      uniqueVideoIds: videoIds.size,
      batchesProcessed: batches.length,
      totalEnriched: finalEnrichedCount,
      totalErrors,
      enrichmentRate: ((finalEnrichedCount / entries.length) * 100).toFixed(1) + '%',
      successCount: this.successCount,
      errorCount: this.errorCount
    });

    logger.info(`Scraping completed. Enriched ${finalEnrichedCount} entries`);
    logger.debug('Final scraping statistics', {
      originalEntries: entries.length,
      uniqueVideoIds: videoIds.size,
      finalEnrichedCount,
      enrichmentRate: ((finalEnrichedCount / entries.length) * 100).toFixed(1) + '%',
      totalRequests: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate: ((this.successCount / (this.successCount + this.errorCount)) * 100).toFixed(1) + '%'
    });

    return enrichedEntries;
  }

  /**
   * Scrape single video page
   */
  public async scrapeVideoData(videoId: string): Promise<ScrapedVideoData | null> {
    const cacheKey = `scrape:${videoId}`;
    
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ScrapedVideoData>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for video ${videoId}`);
        return cached;
      }
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    let scrapedData: ScrapedVideoData | null = null;

    this.requestCount++;

    try {
      // Try browser-based scraping first if enabled
      if (this.config.enableBrowser) {
        scrapedData = await this.scrapeWithPlaywright(url);
      }
      
      // Fallback to fetch-based scraping
      if (!scrapedData) {
        scrapedData = await this.scrapeWithFetch(url);
      }

      if (scrapedData && this.config.cacheEnabled) {
        this.cache.set(cacheKey, scrapedData);
      }

      return scrapedData;

    } catch (error) {
      logger.error(`Error scraping video ${videoId}:`, error);
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Scrape with Playwright (JavaScript enabled)
   */
  private async scrapeWithPlaywright(url: string): Promise<ScrapedVideoData | null> {
    if (!this.browser || !this.context) {
      logger.debug('Browser not available, skipping Playwright scraping');
      return null;
    }

    const timer = createTimer('Playwright Scraping');
    let page: Page | null = null;

    try {
      timer.stage('Creating Page');
      page = await this.context.newPage();
      
      // Set random user agent
      const userAgent = this.getRandomUserAgent();
      await page.route('**/*', (route) => {
        route.continue({
          headers: {
            ...route.request().headers(),
            'user-agent': userAgent
          }
        });
      });
      
      // Set extra headers
      await page.setExtraHTTPHeaders(this.DEFAULT_HEADERS);

      timer.stage('Navigating to Page');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      });

      // Wait for the page to load and for key elements
      timer.stage('Waiting for Content');
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {
        logger.debug('Title selector not found within timeout');
      });

      timer.stage('Extracting Data');
      const html = await page.content();
      const scrapedData = await this.extractAllData(html);

      timer.end({ success: !!scrapedData });
      return scrapedData;

    } catch (error) {
      logger.error('Playwright scraping failed:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  }

  /**
   * Scrape with fetch (faster, no JavaScript)
   */
  private async scrapeWithFetch(url: string): Promise<ScrapedVideoData | null> {
    const timer = createTimer('Fetch Scraping');
    
    try {
      timer.stage('Making Request');
      const userAgent = this.getRandomUserAgent();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.DEFAULT_HEADERS,
          'User-Agent': userAgent
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      timer.stage('Processing Response');
      const html = await response.text();
      const scrapedData = await this.extractAllData(html);

      timer.end({ success: !!scrapedData });
      return scrapedData;

    } catch (error) {
      logger.error('Fetch scraping failed:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Extract data using all available strategies
   */
  private async extractAllData(html: string): Promise<ScrapedVideoData | null> {
    const results: Partial<ScrapedVideoData>[] = [];

    try {
      // Strategy A: JSON-LD Structured Data
      const jsonLdData = this.extractFromJsonLd(html);
      if (jsonLdData && Object.keys(jsonLdData).length > 0) {
        results.push(jsonLdData);
        logger.debug('JSON-LD extraction successful', { fieldsFound: Object.keys(jsonLdData) });
      }

      // Strategy B: YouTube's ytInitialData
      const ytInitialData = this.extractFromYtInitialData(html);
      if (ytInitialData && Object.keys(ytInitialData).length > 0) {
        results.push(ytInitialData);
        logger.debug('ytInitialData extraction successful', { fieldsFound: Object.keys(ytInitialData) });
      }

      // Strategy C: Meta Tags
      const metaData = this.extractFromMetaTags(html);
      if (metaData && Object.keys(metaData).length > 0) {
        results.push(metaData);
        logger.debug('Meta tags extraction successful', { fieldsFound: Object.keys(metaData) });
      }

      // Strategy D: DOM Selectors
      const domData = this.extractFromDomSelectors(html);
      if (domData && Object.keys(domData).length > 0) {
        results.push(domData);
        logger.debug('DOM selectors extraction successful', { fieldsFound: Object.keys(domData) });
      }

      // Merge all results, prioritizing the best data for each field
      const mergedData = this.mergeScrapedData(results);
      
      if (Object.keys(mergedData).length === 0) {
        logger.warn('No data extracted from any strategy');
        return null;
      }

      logger.debug('Data extraction completed', {
        strategiesUsed: results.length,
        finalFields: Object.keys(mergedData),
        hasTitle: !!mergedData.title,
        hasChannel: !!mergedData.channelName,
        hasDuration: !!mergedData.duration
      });

      return mergedData;

    } catch (error) {
      logger.error('Error in data extraction:', error);
      return null;
    }
  }

  /**
   * Strategy A: Extract from JSON-LD structured data
   */
  private extractFromJsonLd(html: string): Partial<ScrapedVideoData> {
    const data: Partial<ScrapedVideoData> = {};

    try {
      const $ = cheerio.load(html);
      
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (!jsonText) return;
          
          const jsonData = JSON.parse(jsonText);
          
          // Handle array of objects
          const objects = Array.isArray(jsonData) ? jsonData : [jsonData];
          
          for (const obj of objects) {
            if (obj['@type'] === 'VideoObject') {
              if (obj.name) data.title = this.sanitizeTitle(obj.name);
              if (obj.description) data.description = obj.description;
              if (obj.duration) data.duration = this.parseDurationText(obj.duration);
              if (obj.uploadDate) data.publishedAt = new Date(obj.uploadDate);
              if (obj.thumbnailUrl) data.thumbnailUrl = Array.isArray(obj.thumbnailUrl) ? obj.thumbnailUrl[0] : obj.thumbnailUrl;
              
              // Extract channel info
              if (obj.author) {
                if (typeof obj.author === 'string') {
                  data.channelName = obj.author;
                } else if (obj.author.name) {
                  data.channelName = obj.author.name;
                }
              }
              
              // Extract interaction statistics
              if (obj.interactionStatistic) {
                const stats = Array.isArray(obj.interactionStatistic) ? obj.interactionStatistic : [obj.interactionStatistic];
                for (const stat of stats) {
                  if (stat.interactionType && stat.userInteractionCount) {
                    const count = parseInt(stat.userInteractionCount);
                    if (stat.interactionType.includes('WatchAction')) {
                      data.viewCount = count;
                    } else if (stat.interactionType.includes('LikeAction')) {
                      data.likeCount = count;
                    } else if (stat.interactionType.includes('CommentAction')) {
                      data.commentCount = count;
                    }
                  }
                }
              }
              
              break; // Found VideoObject, stop searching
            }
          }
        } catch (parseError) {
          // Continue to next script tag
        }
      });

    } catch (error) {
      logger.debug('JSON-LD extraction failed:', error);
    }

    return data;
  }

  /**
   * Strategy B: Extract from ytInitialData
   */
  private extractFromYtInitialData(html: string): Partial<ScrapedVideoData> {
    const data: Partial<ScrapedVideoData> = {};

    try {
      // Look for ytInitialData
      const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/s) || 
                                 html.match(/window\["ytInitialData"\] = ({.+?});/s);
      
      if (ytInitialDataMatch) {
        const ytData = JSON.parse(ytInitialDataMatch[1]);
        
        // Navigate the complex YouTube data structure
        const contents = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
        if (contents && Array.isArray(contents)) {
          for (const content of contents) {
            // Video primary info
            if (content.videoPrimaryInfoRenderer) {
              const videoInfo = content.videoPrimaryInfoRenderer;
              
              if (videoInfo.title?.runs?.[0]?.text) {
                data.title = this.sanitizeTitle(videoInfo.title.runs[0].text);
              }
              
              if (videoInfo.viewCount?.videoViewCountRenderer?.viewCount?.runs?.[0]?.text) {
                data.viewCount = this.normalizeViewCount(videoInfo.viewCount.videoViewCountRenderer.viewCount.runs[0].text);
              }
              
              if (videoInfo.dateText?.simpleText) {
                data.publishedAt = this.parsePublishDate(videoInfo.dateText.simpleText);
              }
            }
            
            // Video secondary info (channel)
            if (content.videoSecondaryInfoRenderer) {
              const secondaryInfo = content.videoSecondaryInfoRenderer;
              
              if (secondaryInfo.owner?.videoOwnerRenderer?.title?.runs?.[0]?.text) {
                data.channelName = secondaryInfo.owner.videoOwnerRenderer.title.runs[0].text;
              }
              
              if (secondaryInfo.owner?.videoOwnerRenderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId) {
                data.channelId = secondaryInfo.owner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId;
              }
              
              if (secondaryInfo.description?.runs) {
                data.description = secondaryInfo.description.runs.map((run: any) => run.text).join('');
              }
            }
          }
        }
        
        // Extract video details
        const videoDetails = ytData?.videoDetails;
        if (videoDetails) {
          if (videoDetails.title) data.title = this.sanitizeTitle(videoDetails.title);
          if (videoDetails.author) data.channelName = videoDetails.author;
          if (videoDetails.channelId) data.channelId = videoDetails.channelId;
          if (videoDetails.shortDescription) data.description = videoDetails.shortDescription;
          if (videoDetails.lengthSeconds) data.duration = parseInt(videoDetails.lengthSeconds);
          if (videoDetails.viewCount) data.viewCount = parseInt(videoDetails.viewCount);
          if (videoDetails.keywords) data.tags = videoDetails.keywords;
          if (videoDetails.thumbnail?.thumbnails?.[0]?.url) data.thumbnailUrl = videoDetails.thumbnail.thumbnails[0].url;
        }
      }

    } catch (error) {
      logger.debug('ytInitialData extraction failed:', error);
    }

    return data;
  }

  /**
   * Strategy C: Extract from meta tags
   */
  private extractFromMetaTags(html: string): Partial<ScrapedVideoData> {
    const data: Partial<ScrapedVideoData> = {};

    try {
      const $ = cheerio.load(html);
      
      // Title
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const twitterTitle = $('meta[name="twitter:title"]').attr('content');
      const title = $('title').text();
      
      if (ogTitle) data.title = this.sanitizeTitle(ogTitle);
      else if (twitterTitle) data.title = this.sanitizeTitle(twitterTitle);
      else if (title) data.title = this.sanitizeTitle(title.replace(' - YouTube', ''));
      
      // Description
      const ogDescription = $('meta[property="og:description"]').attr('content');
      const description = $('meta[name="description"]').attr('content');
      
      if (ogDescription) data.description = ogDescription;
      else if (description) data.description = description;
      
      // Thumbnail
      const ogImage = $('meta[property="og:image"]').attr('content');
      const twitterImage = $('meta[name="twitter:image"]').attr('content');
      
      if (ogImage) data.thumbnailUrl = ogImage;
      else if (twitterImage) data.thumbnailUrl = twitterImage;
      
      // Duration
      const duration = $('meta[itemprop="duration"]').attr('content');
      if (duration) data.duration = this.parseDurationText(duration);
      
      // Channel name
      const channelName = $('meta[itemprop="author"]').attr('content') || 
                         $('link[itemprop="url"]').attr('href')?.match(/\/channel\/([^\/]+)/)?.[1];
      if (channelName) data.channelName = channelName;

    } catch (error) {
      logger.debug('Meta tags extraction failed:', error);
    }

    return data;
  }

  /**
   * Strategy D: Extract from DOM selectors
   */
  private extractFromDomSelectors(html: string): Partial<ScrapedVideoData> {
    const data: Partial<ScrapedVideoData> = {};

    try {
      const $ = cheerio.load(html);
      
      // Title selectors
      const titleSelectors = [
        'h1.title',
        'h1[class*="title"]',
        '#title h1',
        '.ytd-video-primary-info-renderer h1',
        'h1.style-scope.ytd-video-primary-info-renderer'
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = $(selector);
        if (titleElement.length > 0) {
          const titleText = titleElement.text().trim();
          if (titleText) {
            data.title = this.sanitizeTitle(titleText);
            break;
          }
        }
      }
      
      // Channel selectors
      const channelSelectors = [
        '#channel-name',
        '.ytd-channel-name',
        '[class*="channel-name"]',
        '#owner-name a',
        '.yt-user-info a'
      ];
      
      for (const selector of channelSelectors) {
        const channelElement = $(selector);
        if (channelElement.length > 0) {
          const channelText = channelElement.text().trim();
          if (channelText) {
            data.channelName = channelText;
            break;
          }
        }
      }
      
      // View count selectors
      const viewSelectors = [
        '#count',
        '[class*="view-count"]',
        '.view-count',
        '#info .count'
      ];
      
      for (const selector of viewSelectors) {
        const viewElement = $(selector);
        if (viewElement.length > 0) {
          const viewText = viewElement.text().trim();
          if (viewText && viewText.includes('views')) {
            data.viewCount = this.normalizeViewCount(viewText);
            break;
          }
        }
      }
      
      // Description selectors
      const descSelectors = [
        '#description',
        '[class*="description"]',
        '.description',
        '#watch-description-text'
      ];
      
      for (const selector of descSelectors) {
        const descElement = $(selector);
        if (descElement.length > 0) {
          const descText = descElement.text().trim();
          if (descText && descText.length > 10) {
            data.description = descText;
            break;
          }
        }
      }

    } catch (error) {
      logger.debug('DOM selectors extraction failed:', error);
    }

    return data;
  }

  /**
   * Merge scraped data from multiple strategies
   */
  private mergeScrapedData(results: Partial<ScrapedVideoData>[]): ScrapedVideoData {
    const merged: ScrapedVideoData = {};

    for (const result of results) {
      // Prioritize non-empty values
      if (result.title && !merged.title) merged.title = result.title;
      if (result.description && !merged.description) merged.description = result.description;
      if (result.channelName && !merged.channelName) merged.channelName = result.channelName;
      if (result.channelId && !merged.channelId) merged.channelId = result.channelId;
      if (result.duration && !merged.duration) merged.duration = result.duration;
      if (result.viewCount && !merged.viewCount) merged.viewCount = result.viewCount;
      if (result.likeCount && !merged.likeCount) merged.likeCount = result.likeCount;
      if (result.commentCount && !merged.commentCount) merged.commentCount = result.commentCount;
      if (result.publishedAt && !merged.publishedAt) merged.publishedAt = result.publishedAt;
      if (result.tags && !merged.tags) merged.tags = result.tags;
      if (result.thumbnailUrl && !merged.thumbnailUrl) merged.thumbnailUrl = result.thumbnailUrl;
      if (result.category && !merged.category) merged.category = result.category;
    }

    return merged;
  }

  /**
   * Apply scraped data to video entry
   */
  private applyVideoEnrichment(
    entry: IVideoEntry,
    scrapedData: ScrapedVideoData
  ): { success: boolean; error?: string } {
    try {
      if (!scrapedData || Object.keys(scrapedData).length === 0) {
        const error = 'No scraped data available';
        entry.processingErrors = entry.processingErrors || [];
        entry.processingErrors.push(error);
        return { success: false, error };
      }

      logger.debug('Applying scraped enrichment', {
        videoId: entry.videoId,
        hasTitle: !!scrapedData.title,
        hasChannel: !!scrapedData.channelName,
        hasDuration: !!scrapedData.duration,
        hasViews: !!scrapedData.viewCount
      });

      // Apply scraped data
      if (scrapedData.description) entry.description = scrapedData.description;
      if (scrapedData.duration) entry.duration = scrapedData.duration;
      if (scrapedData.viewCount) entry.viewCount = scrapedData.viewCount;
      if (scrapedData.likeCount) entry.likeCount = scrapedData.likeCount;
      if (scrapedData.commentCount) entry.commentCount = scrapedData.commentCount;
      if (scrapedData.publishedAt) entry.publishedAt = scrapedData.publishedAt;
      if (scrapedData.tags) entry.tags = scrapedData.tags;
      if (scrapedData.thumbnailUrl) entry.thumbnailUrl = scrapedData.thumbnailUrl;
      if (scrapedData.channelId) entry.channelId = scrapedData.channelId;
      
      // Update channel name if we got a better one
      if (scrapedData.channelName && (entry.channel === 'Unknown Channel' || scrapedData.channelName.length > entry.channel.length)) {
        entry.channel = scrapedData.channelName;
      }
      
      // Map category if available
      if (scrapedData.category) {
        entry.category = this.mapScrapedCategoryToEnum(scrapedData.category);
      }

      // Content type classification
      const previousContentType = entry.contentType;
      entry.contentType = this.classifyContentType(entry);
      
      if (previousContentType !== entry.contentType) {
        logger.debug('Content type reclassified via scraping', {
          videoId: entry.videoId,
          previousType: previousContentType,
          newType: entry.contentType,
          duration: entry.duration
        });
      }

      entry.enrichedWithAPI = true; // Using same flag for compatibility
      entry.lastUpdated = new Date();

      logger.debug('Video enrichment completed successfully via scraping', {
        videoId: entry.videoId,
        enrichedFields: {
          description: !!entry.description,
          duration: !!entry.duration,
          viewCount: !!entry.viewCount,
          publishedAt: !!entry.publishedAt,
          channelName: !!scrapedData.channelName
        }
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown enrichment error';
      entry.processingErrors = entry.processingErrors || [];
      entry.processingErrors.push(`Scraping enrichment failed: ${errorMessage}`);
      
      logger.error('Error applying scraped enrichment', {
        videoId: entry.videoId,
        error: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Utility methods
   */
  private normalizeViewCount(viewText: string): number {
    if (!viewText) return 0;
    
    // Remove non-numeric characters except for K, M, B
    const normalized = viewText.replace(/[^\d.KMB]/gi, '').toUpperCase();
    
    let multiplier = 1;
    if (normalized.includes('K')) multiplier = 1000;
    else if (normalized.includes('M')) multiplier = 1000000;
    else if (normalized.includes('B')) multiplier = 1000000000;
    
    const number = parseFloat(normalized.replace(/[KMB]/gi, ''));
    return Math.floor(number * multiplier);
  }

  private parseDurationText(durationText: string): number {
    if (!durationText) return 0;
    
    // Handle ISO 8601 duration (PT1H2M3S)
    if (durationText.startsWith('PT')) {
      const match = durationText.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    // Handle time format (1:23:45 or 12:34)
    const timeParts = durationText.split(':').map(part => parseInt(part) || 0);
    if (timeParts.length === 3) {
      return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    } else if (timeParts.length === 2) {
      return timeParts[0] * 60 + timeParts[1];
    }
    
    return 0;
  }

  private parsePublishDate(dateText: string): Date | undefined {
    try {
      // Handle various date formats
      if (dateText.includes('ago')) {
        // Relative dates like "2 days ago", "1 week ago"
        const now = new Date();
        const match = dateText.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          switch (unit) {
            case 'second': return new Date(now.getTime() - amount * 1000);
            case 'minute': return new Date(now.getTime() - amount * 60 * 1000);
            case 'hour': return new Date(now.getTime() - amount * 60 * 60 * 1000);
            case 'day': return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
            case 'week': return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
            case 'month': return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
            case 'year': return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
          }
        }
      } else {
        // Try to parse as regular date
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (error) {
      logger.debug('Failed to parse publish date:', dateText);
    }
    
    return undefined;
  }

  private sanitizeTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();
  }

  private mapScrapedCategoryToEnum(category: string): VideoCategory {
    const categoryMap: Record<string, VideoCategory> = {
      'Film & Animation': VideoCategory.FILM_ANIMATION,
      'Autos & Vehicles': VideoCategory.AUTOS_VEHICLES,
      'Music': VideoCategory.MUSIC,
      'Pets & Animals': VideoCategory.PETS_ANIMALS,
      'Sports': VideoCategory.SPORTS,
      'Travel & Events': VideoCategory.TRAVEL_EVENTS,
      'Gaming': VideoCategory.GAMING,
      'People & Blogs': VideoCategory.PEOPLE_BLOGS,
      'Comedy': VideoCategory.COMEDY,
      'Entertainment': VideoCategory.ENTERTAINMENT,
      'News & Politics': VideoCategory.NEWS_POLITICS,
      'Howto & Style': VideoCategory.HOWTO_STYLE,
      'Education': VideoCategory.EDUCATION,
      'Science & Technology': VideoCategory.SCIENCE_TECHNOLOGY,
      'Nonprofits & Activism': VideoCategory.NONPROFITS_ACTIVISM
    };

    return categoryMap[category] || VideoCategory.UNKNOWN;
  }

  private classifyContentType(entry: IVideoEntry): ContentType {
    const duration = entry.duration || 0;

    // Check for YouTube Shorts (under 60 seconds)
    if (duration <= 60 && duration > 0) {
      return ContentType.SHORT;
    }

    // Check URL for shorts
    if (entry.url.includes('/shorts/')) {
      return ContentType.SHORT;
    }

    return ContentType.VIDEO;
  }

  private getRandomUserAgent(): string {
    return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
  }

  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      logger.debug('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      this.browser = null;
      this.context = null;
    }
  }

  private async cleanupBrowser(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.debug('Browser cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up browser:', error);
    }
  }

  private isCircuitBreakerOpen(): boolean {
    const now = new Date();
    const timeSinceLastFailure = now.getTime() - this.circuitBreaker.lastFailureTime.getTime();
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

    if (this.circuitBreaker.isOpen && timeSinceLastFailure > cooldownPeriod) {
      // Try to reset circuit breaker
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.halfOpenAttempts = 0;
      logger.info('Circuit breaker reset after cooldown period');
    }

    return this.circuitBreaker.isOpen;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = new Date();

    // Open circuit breaker if too many failures
    if (this.circuitBreaker.failures >= 10) {
      this.circuitBreaker.isOpen = true;
      logger.warn('Circuit breaker opened due to excessive failures', {
        failures: this.circuitBreaker.failures,
        lastFailureTime: this.circuitBreaker.lastFailureTime
      });
    }
  }

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

  /**
   * Get scraping statistics
   */
  public getScrapingStats(): {
    requestCount: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    circuitBreakerOpen: boolean;
    cacheHitRate?: number;
  } {
    const cacheStats = this.cache.getStats();
    const totalRequests = this.successCount + this.errorCount;
    
    return {
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate: totalRequests > 0 ? (this.successCount / totalRequests) * 100 : 0,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      cacheHitRate: cacheStats.hits + cacheStats.misses > 0 ? 
        (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100 : 0
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.flushAll();
    logger.info('Scraping cache cleared');
  }
}