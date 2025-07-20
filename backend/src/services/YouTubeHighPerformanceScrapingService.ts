import * as cheerio from 'cheerio';
import { request } from 'undici';
import { Pool } from 'undici';
import Piscina from 'piscina';
import NodeCache from 'node-cache';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger, createTimer } from '../utils/logger';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { resolve } from 'path';
import { YouTubeLLMScrapingService, LLMScrapingConfig } from './YouTubeLLMScrapingService';

export interface HighPerformanceScrapingConfig {
  maxConcurrentRequests: number;
  requestDelayMs: number;
  retryAttempts: number;
  timeout: number;
  userAgents: string[];
  enableWorkerThreads: boolean;
  workerThreadCount: number;
  connectionPoolSize: number;
  batchSize: number;
  enableDeduplication: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  enableFastParsing: boolean;
  maxMemoryUsage: number; // MB
  enableLLMIntegration?: boolean; // Enable LLM-enhanced scraping
  llmConfig?: Partial<LLMScrapingConfig>; // LLM configuration override
}

export interface ScrapedVideoData {
  title?: string;
  description?: string;
  channelName?: string;
  channelId?: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: Date;
  tags?: string[];
  thumbnailUrl?: string;
  category?: string;
}

interface BatchScrapingResult {
  videoId: string;
  success: boolean;
  data?: ScrapedVideoData;
  error?: string;
  duration: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  workerUtilization: number;
  memoryUsage: number;
  duplicatesSkipped: number;
  startTime: number;
}

export class YouTubeHighPerformanceScrapingService {
  private config: HighPerformanceScrapingConfig;
  private cache: NodeCache;
  private connectionPools: Map<string, Pool>;
  private workerPool: Piscina | null = null;
  private metrics: PerformanceMetrics;
  private deduplicationSet: Set<string>;
  private requestQueue: Array<{videoId: string, resolve: Function, reject: Function}> = [];
  private isProcessingQueue = false;
  private llmService: YouTubeLLMScrapingService | null = null;

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15'
  ];

  private readonly YOUTUBE_HOSTS = [
    'www.youtube.com',
    'm.youtube.com',
    'youtube.com'
  ];

  constructor(config: HighPerformanceScrapingConfig, llmService?: YouTubeLLMScrapingService) {
    this.config = {
      ...config,
      userAgents: config.userAgents.length > 0 ? config.userAgents : this.USER_AGENTS,
      workerThreadCount: config.workerThreadCount || cpus().length * 2,
      connectionPoolSize: config.connectionPoolSize || 50,
      batchSize: config.batchSize || 100,
      enableLLMIntegration: config.enableLLMIntegration || false
    };
    
    this.cache = new NodeCache({ 
      stdTTL: this.config.cacheTTL || 3600, // 1 hour for high-performance
      checkperiod: 60,
      maxKeys: 100000 // Support more keys for high volume
    });
    
    this.connectionPools = new Map();
    this.deduplicationSet = new Set();

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      cacheHitRate: 0,
      workerUtilization: 0,
      memoryUsage: 0,
      duplicatesSkipped: 0,
      startTime: Date.now()
    };

    // Initialize LLM service if provided or if LLM integration is enabled
    if (llmService) {
      this.llmService = llmService;
      logger.info('LLM service integrated with high-performance scraping');
    } else if (this.config.enableLLMIntegration && this.config.llmConfig) {
      // Create LLM service with provided config
      const llmConfig: LLMScrapingConfig = {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 2000,
        temperature: 0.1,
        maxConcurrentRequests: 5,
        requestDelayMs: 1000,
        retryAttempts: 3,
        timeout: 30000,
        userAgents: [],
        connectionPoolSize: 20,
        batchSize: 10,
        enableCaching: true,
        cacheTTL: 7200,
        costLimit: 10,
        htmlChunkSize: 50000,
        enableFallback: true,
        ...this.config.llmConfig
      };
      
      this.llmService = new YouTubeLLMScrapingService(llmConfig);
      logger.info('LLM service created and integrated with high-performance scraping');
    }

    this.initializeConnectionPools();
    
    if (this.config.enableWorkerThreads) {
      this.initializeWorkerPool();
    }

    logger.info('YouTubeHighPerformanceScrapingService initialized', {
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      workerThreadCount: this.config.workerThreadCount,
      connectionPoolSize: this.config.connectionPoolSize,
      batchSize: this.config.batchSize,
      enableWorkerThreads: this.config.enableWorkerThreads,
      enableDeduplication: this.config.enableDeduplication,
      enableLLMIntegration: this.config.enableLLMIntegration,
      llmServiceAvailable: !!this.llmService
    });
  }

  /**
   * Initialize connection pools for different YouTube hosts
   */
  private initializeConnectionPools(): void {
    for (const host of this.YOUTUBE_HOSTS) {
      const pool = new Pool(`https://${host}`, {
        connections: this.config.connectionPoolSize,
        pipelining: 10,
        keepAliveTimeout: 60000,
        keepAliveMaxTimeout: 300000,
        connect: {
          timeout: this.config.timeout
        }
      });
      this.connectionPools.set(host, pool);
    }
    logger.debug('Connection pools initialized', { hosts: this.YOUTUBE_HOSTS.length, poolSize: this.config.connectionPoolSize });
  }

  /**
   * Initialize worker thread pool for CPU-intensive parsing
   */
  private async initializeWorkerPool(): Promise<void> {
    try {
      const path = require('path');
      const fs = require('fs');
      
      // Always use compiled JavaScript workers for Piscina compatibility
      const workerJsPath = resolve(__dirname, '../workers/scraping-worker.js');
      const workerTsPath = resolve(__dirname, '../workers/scraping-worker.ts');
      
      // In development, compile the worker if needed
      if (process.env.NODE_ENV !== 'production') {
        await this.ensureWorkerCompiled(workerTsPath, workerJsPath);
      }
      
      // Verify the compiled worker file exists
      if (!fs.existsSync(workerJsPath)) {
        throw new Error(`Compiled worker file not found: ${workerJsPath}`);
      }
      
      this.workerPool = new Piscina({
        filename: workerJsPath,
        maxThreads: this.config.workerThreadCount,
        minThreads: Math.ceil(this.config.workerThreadCount / 2),
        idleTimeout: 60000
      });
      
      logger.info('Worker thread pool initialized', { 
        maxThreads: this.config.workerThreadCount,
        minThreads: Math.ceil(this.config.workerThreadCount / 2),
        workerPath: workerJsPath
      });
    } catch (error) {
      logger.warn('Failed to initialize worker pool, falling back to main thread parsing', error);
      this.config.enableWorkerThreads = false;
      this.workerPool = null;
    }
  }

  /**
   * Ensure worker is compiled for development mode
   */
  private async ensureWorkerCompiled(tsPath: string, jsPath: string): Promise<void> {
    const fs = require('fs');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Check if TypeScript file exists
      if (!fs.existsSync(tsPath)) {
        throw new Error(`Worker TypeScript file not found: ${tsPath}`);
      }
      
      // Check if JavaScript file exists and is newer than TypeScript file
      if (fs.existsSync(jsPath)) {
        const tsStats = fs.statSync(tsPath);
        const jsStats = fs.statSync(jsPath);
        if (jsStats.mtime >= tsStats.mtime) {
          return; // JavaScript file is up to date
        }
      }
      
      logger.info('Compiling worker for development mode...');
      
      // Compile the worker file
      const tscCommand = `npx tsc "${tsPath}" --outDir "${require('path').dirname(jsPath)}" --target es2020 --module commonjs --esModuleInterop`;
      await execAsync(tscCommand);
      
      logger.info('Worker compiled successfully');
    } catch (error) {
      logger.warn('Failed to compile worker, worker threads will be disabled', error);
      throw error;
    }
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
    return null;
  }

  /**
   * High-performance batch scraping of multiple videos
   */
  public async scrapeBatch(videoIds: string[], options?: {
    enableDeduplication?: boolean;
    enableFastParsing?: boolean;
    maxConcurrency?: number;
  }): Promise<BatchScrapingResult[]> {
    const timer = createTimer(`Batch Scraping ${videoIds.length} videos`);
    const startTime = Date.now();
    
    // Use passed options or fall back to service configuration
    const enableDeduplication = options?.enableDeduplication ?? this.config.enableDeduplication;
    const enableFastParsing = options?.enableFastParsing ?? this.config.enableFastParsing;
    const maxConcurrency = options?.maxConcurrency ?? this.config.maxConcurrentRequests;
    
    // Deduplicate if enabled
    let processVideoIds = videoIds;
    if (enableDeduplication) {
      const uniqueIds = [...new Set(videoIds)];
      this.metrics.duplicatesSkipped += videoIds.length - uniqueIds.length;
      processVideoIds = uniqueIds.filter(id => !this.deduplicationSet.has(id));
      processVideoIds.forEach(id => this.deduplicationSet.add(id));
      
      logger.debug('Deduplication completed', {
        original: videoIds.length,
        afterDedup: uniqueIds.length,
        toProcess: processVideoIds.length,
        duplicatesSkipped: videoIds.length - processVideoIds.length,
        enableDeduplication
      });
    } else {
      logger.debug('Deduplication disabled, processing all videos', {
        original: videoIds.length,
        toProcess: processVideoIds.length,
        enableDeduplication
      });
    }

    // Process in optimized batches
    const batches = this.chunkArray(processVideoIds, this.config.batchSize);
    const allResults: BatchScrapingResult[] = [];

    timer.stage(`Processing ${batches.length} batches`);
    
    // Process batches with controlled concurrency
    const batchPromises = batches.map(async (batch, batchIndex) => {
      const batchTimer = createTimer(`Batch ${batchIndex + 1}`);
      
      try {
        const batchResults = await this.processBatchConcurrently(batch);
        
        batchTimer.end({
          batchSize: batch.length,
          successCount: batchResults.filter(r => r.success).length,
          avgDuration: batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length
        });
        
        return batchResults;
      } catch (error) {
        logger.error(`Batch ${batchIndex + 1} failed:`, error);
        batchTimer.end({ error: true });
        
        // Return failed results for all videos in the batch
        return batch.map(videoId => ({
          videoId,
          success: false,
          error: error instanceof Error ? error.message : 'Batch processing failed',
          duration: 0
        }));
      }
    });

    // Wait for all batches to complete
    const batchResultsArrays = await Promise.all(batchPromises);
    batchResultsArrays.forEach(results => allResults.push(...results));

    // Update metrics
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const successCount = allResults.filter(r => r.success).length;
    
    this.metrics.totalRequests += processVideoIds.length;
    this.metrics.successfulRequests += successCount;
    this.metrics.failedRequests += processVideoIds.length - successCount;
    this.metrics.requestsPerSecond = (this.metrics.totalRequests / ((endTime - this.metrics.startTime) / 1000));
    this.metrics.averageResponseTime = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;

    timer.end({
      totalVideos: videoIds.length,
      processedVideos: processVideoIds.length,
      successfulVideos: successCount,
      failedVideos: processVideoIds.length - successCount,
      totalTime,
      videosPerSecond: (processVideoIds.length / (totalTime / 1000)).toFixed(2),
      requestsPerSecond: this.metrics.requestsPerSecond.toFixed(2)
    });

    logger.info('Batch scraping completed', {
      totalVideos: videoIds.length,
      processedVideos: processVideoIds.length,
      successRate: ((successCount / processVideoIds.length) * 100).toFixed(1) + '%',
      averageTime: this.metrics.averageResponseTime.toFixed(0) + 'ms',
      throughput: (processVideoIds.length / (totalTime / 1000)).toFixed(2) + ' videos/sec'
    });

    return allResults;
  }

  /**
   * Process a batch of videos with maximum concurrency
   */
  private async processBatchConcurrently(videoIds: string[]): Promise<BatchScrapingResult[]> {
    const semaphore = new Map<string, Promise<BatchScrapingResult>>();
    const results: BatchScrapingResult[] = [];

    // Create promises for all videos with controlled concurrency
    const videoPromises = videoIds.map(async (videoId) => {
      // Wait for available slot if we're at max concurrency
      while (semaphore.size >= this.config.maxConcurrentRequests) {
        await Promise.race(Array.from(semaphore.values()));
      }

      const promise = this.scrapeVideoHighPerformance(videoId);
      semaphore.set(videoId, promise);

      try {
        const result = await promise;
        return result;
      } finally {
        semaphore.delete(videoId);
      }
    });

    // Wait for all videos to complete
    const settledResults = await Promise.allSettled(videoPromises);
    
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          videoId: videoIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
          duration: 0
        });
      }
    });

    return results;
  }

  /**
   * High-performance scraping of a single video
   */
  private async scrapeVideoHighPerformance(videoId: string): Promise<BatchScrapingResult> {
    const startTime = Date.now();
    
    // Check cache first
    if (this.config.cacheEnabled) {
      const cacheKey = `hp:${videoId}`;
      const cached = this.cache.get<ScrapedVideoData>(cacheKey);
      if (cached) {
        const cacheStats = this.cache.getStats();
        this.metrics.cacheHitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
        
        return {
          videoId,
          success: true,
          data: cached,
          duration: Date.now() - startTime
        };
      }
    }

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const html = await this.fetchVideoPageOptimized(url);
      
      // Debug: Log HTML content details
      logger.debug(`Fetched HTML for ${videoId}`, {
        htmlLength: html.length,
        hasYtInitialData: html.includes('var ytInitialData'),
        hasOgTitle: html.includes('og:title'),
        htmlStart: html.substring(0, 200)
      });
      
      let scrapedData: ScrapedVideoData | null = null;
      
      if (this.config.enableWorkerThreads && this.workerPool) {
        // Use worker thread for CPU-intensive parsing
        try {
          scrapedData = await this.workerPool.run({ html, videoId, enableFastParsing: this.config.enableFastParsing });
        } catch (workerError) {
          logger.debug('Worker parsing failed, falling back to main thread', { videoId, error: workerError });
          scrapedData = await this.extractDataOptimized(html);
        }
      } else {
        // Use main thread parsing
        scrapedData = await this.extractDataOptimized(html);
      }

      if (scrapedData && this.config.cacheEnabled) {
        this.cache.set(`hp:${videoId}`, scrapedData);
      }

      const duration = Date.now() - startTime;
      
      return {
        videoId,
        success: !!scrapedData,
        data: scrapedData || undefined,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.debug(`High-performance scraping failed for ${videoId}:`, error);
      
      return {
        videoId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  /**
   * Optimized HTTP fetching with connection pooling
   */
  private async fetchVideoPageOptimized(url: string): Promise<string> {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const pool = this.connectionPools.get(host) || this.connectionPools.get('www.youtube.com')!;
    
    const userAgent = this.getRandomUserAgent();
    
    const response = await request(url, {
      dispatcher: pool,
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      bodyTimeout: this.config.timeout,
      headersTimeout: this.config.timeout
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    return await response.body.text();
  }

  /**
   * Optimized data extraction focusing on speed
   */
  private async extractDataOptimized(html: string): Promise<ScrapedVideoData | null> {
    const data: ScrapedVideoData = {};

    try {
      // Strategy 1: Fast ytInitialData extraction (highest priority for performance)
      const ytDataMatch = html.match(/var ytInitialData = ({.+?});/s);
      if (ytDataMatch) {
        try {
          const ytData = JSON.parse(ytDataMatch[1]);
          const videoDetails = ytData?.videoDetails;
          
          if (videoDetails) {
            if (videoDetails.title) data.title = this.sanitizeTitle(videoDetails.title);
            if (videoDetails.author) data.channelName = videoDetails.author;
            if (videoDetails.channelId) data.channelId = videoDetails.channelId;
            if (videoDetails.shortDescription) data.description = videoDetails.shortDescription;
            if (videoDetails.lengthSeconds) data.duration = parseInt(videoDetails.lengthSeconds);
            if (videoDetails.viewCount) data.viewCount = parseInt(videoDetails.viewCount);
            if (videoDetails.keywords) data.tags = videoDetails.keywords;
            
            const thumbnail = videoDetails.thumbnail?.thumbnails?.[0]?.url;
            if (thumbnail) data.thumbnailUrl = thumbnail;
          }
          
          // Extract additional data from contents
          const contents = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
          if (contents && Array.isArray(contents)) {
            for (const content of contents) {
              if (content.videoPrimaryInfoRenderer?.dateText?.simpleText) {
                data.publishedAt = this.parsePublishDate(content.videoPrimaryInfoRenderer.dateText.simpleText);
              }
            }
          }
        } catch (parseError) {
          // Continue to next strategy
        }
      }

      // Strategy 2: Fast meta tag extraction (if ytInitialData incomplete)
      if (!data.title || !data.channelName) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch && !data.title) {
          data.title = this.sanitizeTitle(titleMatch[1]);
        }
        
        const authorMatch = html.match(/<meta itemprop="author" content="([^"]+)"/);
        if (authorMatch && !data.channelName) {
          data.channelName = authorMatch[1];
        }
      }

      // Strategy 3: Quick JSON-LD extraction (only if essential data missing)
      if (!data.duration && html.includes('application/ld+json')) {
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            const videoObj = Array.isArray(jsonData) ? 
              jsonData.find(item => item['@type'] === 'VideoObject') : 
              (jsonData['@type'] === 'VideoObject' ? jsonData : null);
            
            if (videoObj?.duration) {
              data.duration = this.parseDurationText(videoObj.duration);
            }
          } catch (parseError) {
            // Continue
          }
        }
      }

      return Object.keys(data).length > 0 ? data : null;

    } catch (error) {
      logger.debug('Optimized data extraction failed:', error);
      return null;
    }
  }

  /**
   * Main entry point - enrich video entries with high performance
   */
  public async enrichVideoEntries(entries: IVideoEntry[]): Promise<IVideoEntry[]> {
    const timer = createTimer('High-Performance YouTube Enrichment');
    const enrichedEntries: IVideoEntry[] = [...entries];
    
    // Extract video IDs
    const videoIds: string[] = [];
    const entryMap = new Map<string, IVideoEntry[]>();
    
    for (const entry of enrichedEntries) {
      const videoId = this.extractVideoId(entry.url);
      if (videoId) {
        entry.videoId = videoId;
        videoIds.push(videoId);
        
        if (!entryMap.has(videoId)) {
          entryMap.set(videoId, []);
        }
        entryMap.get(videoId)!.push(entry);
      }
    }

    logger.info(`High-performance enrichment starting`, {
      totalEntries: entries.length,
      uniqueVideoIds: new Set(videoIds).size,
      maxConcurrency: this.config.maxConcurrentRequests,
      batchSize: this.config.batchSize,
      llmIntegrationEnabled: !!this.llmService
    });

    let scrapingResults: BatchScrapingResult[] = [];
    let llmResults: any[] = [];

    // Use LLM scraping if available, otherwise fall back to traditional scraping
    if (this.llmService) {
      timer.stage('LLM-Enhanced Batch Scraping');
      logger.info('Using LLM-enhanced scraping for better data extraction');
      
      try {
        // Use LLM service to scrape videos
        const llmScrapingResults = await this.llmService.scrapeVideos(videoIds);
        
        // Convert LLM results to our format
        scrapingResults = llmScrapingResults.map(result => ({
          videoId: result.videoId,
          success: result.success,
          data: result.success && result.data ? {
            title: result.data.title,
            description: result.data.description,
            channelName: result.data.channelName,
            channelId: result.data.channelId,
            duration: result.data.duration,
            viewCount: result.data.viewCount,
            likeCount: result.data.likeCount,
            commentCount: result.data.commentCount,
            publishedAt: result.data.publishedAt,
            tags: result.data.tags,
            thumbnailUrl: result.data.thumbnailUrl,
            category: result.data.category
          } : undefined,
          error: result.error,
          duration: 0 // LLM doesn't provide duration timing
        }));
        
        llmResults = llmScrapingResults;
        
        logger.info('LLM-enhanced scraping completed', {
          totalVideos: videoIds.length,
          successfulVideos: llmScrapingResults.filter(r => r.success).length,
          failedVideos: llmScrapingResults.filter(r => !r.success).length,
          successRate: ((llmScrapingResults.filter(r => r.success).length / videoIds.length) * 100).toFixed(1) + '%'
        });
        
      } catch (error) {
        logger.warn('LLM scraping failed, falling back to traditional scraping', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Fall back to traditional scraping
        timer.stage('Fallback Traditional Scraping');
        scrapingResults = await this.scrapeBatch(videoIds, {
          enableDeduplication: false,
          enableFastParsing: this.config.enableFastParsing,
          maxConcurrency: this.config.maxConcurrentRequests
        });
      }
    } else {
      // Use traditional scraping
      timer.stage('Traditional Batch Scraping');
      scrapingResults = await this.scrapeBatch(videoIds, {
        enableDeduplication: false,
        enableFastParsing: this.config.enableFastParsing,
        maxConcurrency: this.config.maxConcurrentRequests
      });
    }
    
    // Apply results to entries
    timer.stage('Applying Results');
    let totalEnriched = 0;
    let llmEnriched = 0;
    
    for (const result of scrapingResults) {
      if (result.success && result.data) {
        const matchingEntries = entryMap.get(result.videoId) || [];
        
        for (const entry of matchingEntries) {
          this.applyScrapedDataToEntry(entry, result.data);
          totalEnriched++;
          
          // Track LLM enrichment
          if (this.llmService && llmResults.find(r => r.videoId === result.videoId && r.success)) {
            llmEnriched++;
            entry.llmEnriched = true;
            entry.llmProvider = 'google';
            
            // Add LLM cost if available
            const llmResult = llmResults.find(r => r.videoId === result.videoId);
            if (llmResult) {
              entry.llmCost = llmResult.cost;
              entry.llmTokensUsed = llmResult.tokensUsed;
            }
          }
        }
      }
    }

    const enrichmentRate = ((totalEnriched / entries.length) * 100).toFixed(1);
    const llmEnrichmentRate = this.llmService ? ((llmEnriched / entries.length) * 100).toFixed(1) : '0';
    
    timer.end({
      totalEntries: entries.length,
      enrichedEntries: totalEnriched,
      enrichmentRate: enrichmentRate + '%',
      llmEnrichmentRate: llmEnrichmentRate + '%',
      requestsPerSecond: this.metrics.requestsPerSecond.toFixed(2),
      cacheHitRate: this.metrics.cacheHitRate.toFixed(1) + '%'
    });

    logger.info(`High-performance enrichment completed`, {
      totalEntries: entries.length,
      enrichedEntries: totalEnriched,
      enrichmentRate: enrichmentRate + '%',
      llmEnriched: llmEnriched,
      llmEnrichmentRate: llmEnrichmentRate + '%',
      avgResponseTime: this.metrics.averageResponseTime.toFixed(0) + 'ms',
      throughput: this.metrics.requestsPerSecond.toFixed(2) + ' req/sec',
      llmIntegrationUsed: !!this.llmService
    });

    return enrichedEntries;
  }

  /**
   * Apply scraped data to video entry
   */
  private applyScrapedDataToEntry(entry: IVideoEntry, data: ScrapedVideoData): void {
    if (data.title) entry.title = data.title;
    if (data.channelName) entry.channel = data.channelName;
    if (data.channelId) entry.channelId = data.channelId;
    if (data.description) entry.description = data.description;
    if (data.duration) entry.duration = data.duration;
    if (data.viewCount) entry.viewCount = data.viewCount;
    if (data.likeCount) entry.likeCount = data.likeCount;
    if (data.commentCount) entry.commentCount = data.commentCount;
    if (data.publishedAt) entry.publishedAt = data.publishedAt;
    if (data.tags) entry.tags = data.tags;
    if (data.thumbnailUrl) entry.thumbnailUrl = data.thumbnailUrl;
    
    // Apply category from LLM data (this was missing!)
    if (data.category) {
      entry.category = data.category as VideoCategory;
    }
    
    // Content type classification - prioritize URL pattern and be more conservative with duration
    if (entry.url.includes('/shorts/')) {
      entry.contentType = ContentType.SHORT;
    } else if (data.duration && data.duration <= 30 && data.duration > 0) {
      // Only classify as SHORT if it's very short (30 seconds or less)
      entry.contentType = ContentType.SHORT;
    } else {
      entry.contentType = ContentType.VIDEO;
    }
    
    entry.enrichedWithAPI = true;
    entry.lastUpdated = new Date();
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const currentTime = Date.now();
    const uptime = (currentTime - this.metrics.startTime) / 1000;
    
    return {
      ...this.metrics,
      requestsPerSecond: this.metrics.totalRequests / uptime,
      workerUtilization: this.workerPool ? 
        ((this.workerPool.threads.length - this.workerPool.queueSize) / this.workerPool.threads.length) * 100 : 0,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  public reset(): void {
    this.cache.flushAll();
    this.deduplicationSet.clear();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      cacheHitRate: 0,
      workerUtilization: 0,
      memoryUsage: 0,
      duplicatesSkipped: 0,
      startTime: Date.now()
    };
    logger.info('High-performance scraping service reset');
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down high-performance scraping service...');
    
    // Close worker pool
    if (this.workerPool) {
      await this.workerPool.destroy();
    }
    
    // Close connection pools
    for (const [host, pool] of this.connectionPools) {
      await pool.close();
      logger.debug(`Connection pool closed for ${host}`);
    }
    
    // Cleanup LLM service if it was created by this service
    if (this.llmService && this.config.enableLLMIntegration) {
      await this.llmService.cleanup();
      logger.info('LLM service cleaned up');
    }
    
    // Clear caches
    this.cache.flushAll();
    this.deduplicationSet.clear();
    
    logger.info('High-performance scraping service shutdown complete');
  }

  /**
   * Utility methods
   */
  private getRandomUserAgent(): string {
    return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sanitizeTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();
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
    
    return 0;
  }

  private parsePublishDate(dateText: string): Date | undefined {
    try {
      if (dateText.includes('ago')) {
        const now = new Date();
        const match = dateText.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          switch (unit) {
            case 'day': return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
            case 'week': return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
            case 'month': return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
            case 'year': return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
          }
        }
      }
    } catch (error) {
      return undefined;
    }
    
    return undefined;
  }
} 