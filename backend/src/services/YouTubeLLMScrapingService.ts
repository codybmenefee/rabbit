import * as cheerio from 'cheerio';
import { request } from 'undici';
import { Pool } from 'undici';
import NodeCache from 'node-cache';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { convert as htmlToText } from 'html-to-text';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger, createTimer } from '../utils/logger';

export interface LLMScrapingConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
  maxConcurrentRequests: number;
  requestDelayMs: number;
  retryAttempts: number;
  timeout: number;
  userAgents: string[];
  connectionPoolSize: number;
  batchSize: number;
  enableCaching: boolean;
  cacheTTL: number;
  costLimit: number; // Maximum cost in USD
  htmlChunkSize: number; // Size of HTML chunks to send to LLM
  enableFallback: boolean; // Fallback to traditional scraping
}

export interface LLMScrapedVideoData {
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
  isLivestream?: boolean;
  isShort?: boolean;
}

interface LLMBatchResult {
  videoId: string;
  success: boolean;
  data?: LLMScrapedVideoData;
  error?: string;
  tokensUsed: number;
  cost: number;
  duration: number;
}

interface LLMPerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageResponseTime: number;
  cacheHitRate: number;
  costPerVideo: number;
  startTime: number;
}

export class YouTubeLLMScrapingService {
  private config: LLMScrapingConfig;
  private cache: NodeCache;
  private connectionPools: Map<string, Pool>;
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private metrics: LLMPerformanceMetrics;

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  // LLM prompt template for extracting YouTube video data
  private readonly LLM_PROMPT = `Extract YouTube video information from the provided HTML. Return ONLY a valid JSON object with the following structure:

{
  "title": "Video title",
  "description": "Video description (first 500 chars)",
  "channelName": "Channel name",
  "channelId": "Channel ID if available",
  "duration": 123, // duration in seconds, null if live
  "viewCount": 12345, // view count as number
  "likeCount": 123, // like count as number, null if not available
  "commentCount": 45, // comment count as number, null if not available
  "publishedAt": "2024-01-01T00:00:00Z", // ISO date string
  "tags": ["tag1", "tag2"], // array of tags/keywords
  "thumbnailUrl": "https://...", // thumbnail URL
  "category": "Entertainment", // video category if available
  "isLivestream": false, // boolean
  "isShort": false // boolean for YouTube Shorts
}

Rules:
- Extract only factual data visible in the HTML
- Convert duration from "1:23" format to seconds (83)
- Convert view counts like "1.2M views" to numbers (1200000)
- Use null for unavailable data, not empty strings
- For live streams, set duration to null and isLivestream to true
- Detect YouTube Shorts and set isShort to true
- Return valid JSON only, no explanation text

HTML Content:`;

  constructor(config: LLMScrapingConfig) {
    this.config = {
      ...config,
      userAgents: config.userAgents.length > 0 ? config.userAgents : this.USER_AGENTS,
      connectionPoolSize: config.connectionPoolSize || 20,
      batchSize: config.batchSize || 10,
      htmlChunkSize: config.htmlChunkSize || 50000,
      model: config.model || (config.provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-3.5-turbo'),
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.1
    };

    this.cache = new NodeCache({
      stdTTL: this.config.cacheTTL || 7200, // 2 hours
      checkperiod: 300 // 5 minutes
    });

    this.connectionPools = new Map();
    this.initializeLLMClients();
    this.initializeMetrics();

    logger.info('YouTubeLLMScrapingService initialized', {
      provider: this.config.provider,
      model: this.config.model,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      batchSize: this.config.batchSize,
      costLimit: this.config.costLimit
    });
  }

  private initializeLLMClients(): void {
    try {
      if (this.config.provider === 'anthropic') {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
      } else if (this.config.provider === 'openai') {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
      }
    } catch (error) {
      logger.error('Failed to initialize LLM clients:', error);
      throw error;
    }
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      costPerVideo: 0,
      startTime: Date.now()
    };
  }

  /**
   * Scrape multiple videos using LLM processing
   */
  public async scrapeVideos(videoIds: string[]): Promise<LLMBatchResult[]> {
    const timer = createTimer();
    
    if (this.metrics.totalCost >= this.config.costLimit) {
      logger.warn('Cost limit reached, stopping LLM scraping', {
        currentCost: this.metrics.totalCost,
        costLimit: this.config.costLimit
      });
      throw new Error(`Cost limit of $${this.config.costLimit} reached`);
    }

    logger.info('Starting LLM batch scraping', {
      videoCount: videoIds.length,
      batchSize: this.config.batchSize,
      provider: this.config.provider,
      model: this.config.model
    });

    const results: LLMBatchResult[] = [];
    const batches = this.chunkArray(videoIds, this.config.batchSize);

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);

      // Check cost limit after each batch
      if (this.metrics.totalCost >= this.config.costLimit) {
        logger.warn('Cost limit reached during processing', {
          processedVideos: results.length,
          totalVideos: videoIds.length,
          currentCost: this.metrics.totalCost
        });
        break;
      }

      // Add delay between batches
      if (this.config.requestDelayMs > 0) {
        await this.delay(this.config.requestDelayMs);
      }
    }

    const duration = timer.end();
    this.updateGlobalMetrics(results, duration);

    logger.info('LLM batch scraping completed', {
      totalVideos: videoIds.length,
      processedVideos: results.length,
      successfulVideos: results.filter(r => r.success).length,
      totalCost: this.metrics.totalCost,
      averageCostPerVideo: this.metrics.costPerVideo,
      duration
    });

    return results;
  }

  /**
   * Process a batch of video IDs
   */
  private async processBatch(videoIds: string[]): Promise<LLMBatchResult[]> {
    const promises = videoIds.map(videoId => this.processVideo(videoId));
    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          videoId: videoIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
          tokensUsed: 0,
          cost: 0,
          duration: 0
        };
      }
    });
  }

  /**
   * Process a single video with LLM
   */
  private async processVideo(videoId: string): Promise<LLMBatchResult> {
    const timer = createTimer();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.cache.get<LLMScrapedVideoData>(videoId);
        if (cached) {
          return {
            videoId,
            success: true,
            data: cached,
            tokensUsed: 0,
            cost: 0,
            duration: timer.end()
          };
        }
      }

      // Fetch HTML content
      const html = await this.fetchVideoHTML(videoId);
      
      // Extract relevant HTML sections
      const relevantHTML = this.extractRelevantHTML(html);
      
      // Process with LLM
      const llmResult = await this.processWithLLM(relevantHTML);
      
      // Cache the result
      if (this.config.enableCaching && llmResult.data) {
        this.cache.set(videoId, llmResult.data);
      }

      const duration = timer.end();
      
      return {
        videoId,
        success: true,
        data: llmResult.data,
        tokensUsed: llmResult.tokensUsed,
        cost: llmResult.cost,
        duration
      };

    } catch (error) {
      logger.error(`Failed to process video ${videoId}:`, error);
      return {
        videoId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: 0,
        cost: 0,
        duration: timer.end()
      };
    }
  }

  /**
   * Fetch HTML content for a video
   */
  private async fetchVideoHTML(videoId: string): Promise<string> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const userAgent = this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];

    const response = await request(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      headersTimeout: this.config.timeout,
      bodyTimeout: this.config.timeout
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: Failed to fetch video page`);
    }

    return await response.body.text();
  }

  /**
   * Extract relevant HTML sections for LLM processing
   */
  private extractRelevantHTML(html: string): string {
    const $ = cheerio.load(html);
    
    // Extract key sections that contain video metadata
    const sections = [
      // Video title and basic info
      $('h1.ytd-watch-metadata').text(),
      $('#watch-description-text').text(),
      $('.ytd-channel-name').text(),
      $('.ytd-video-view-count-renderer').text(),
      $('.ytd-toggle-button-renderer').text(),
      
      // JSON-LD structured data
      $('script[type="application/ld+json"]').html(),
      
      // Video metadata from meta tags
      $('meta[property="og:title"]').attr('content'),
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="description"]').attr('content'),
      
      // Initial data script
      $('script').filter(function() {
        return $(this).html()?.includes('var ytInitialData') || 
               $(this).html()?.includes('window.ytInitialData');
      }).first().html()
    ].filter(Boolean).join('\n\n');

    // Limit the size to avoid token limits
    return sections.substring(0, this.config.htmlChunkSize);
  }

  /**
   * Process HTML content with LLM
   */
  private async processWithLLM(htmlContent: string): Promise<{data: LLMScrapedVideoData, tokensUsed: number, cost: number}> {
    const prompt = `${this.LLM_PROMPT}\n\n${htmlContent}`;
    
    if (this.config.provider === 'anthropic' && this.anthropic) {
      return await this.processWithAnthropic(prompt);
    } else if (this.config.provider === 'openai' && this.openai) {
      return await this.processWithOpenAI(prompt);
    } else {
      throw new Error('No LLM client available');
    }
  }

  /**
   * Process with Anthropic Claude
   */
  private async processWithAnthropic(prompt: string): Promise<{data: LLMScrapedVideoData, tokensUsed: number, cost: number}> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response format from Anthropic');
    }

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const cost = this.calculateAnthropicCost(response.usage.input_tokens, response.usage.output_tokens);

    try {
      const data = JSON.parse(content.text) as LLMScrapedVideoData;
      return { data, tokensUsed, cost };
    } catch (error) {
      logger.error('Failed to parse LLM response:', content.text);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Process with OpenAI GPT
   */
  private async processWithOpenAI(prompt: string): Promise<{data: LLMScrapedVideoData, tokensUsed: number, cost: number}> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = this.calculateOpenAICost(tokensUsed);

    try {
      const data = JSON.parse(content) as LLMScrapedVideoData;
      return { data, tokensUsed, cost };
    } catch (error) {
      logger.error('Failed to parse LLM response:', content);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Calculate cost for Anthropic usage
   */
  private calculateAnthropicCost(inputTokens: number, outputTokens: number): number {
    // Claude 3 Haiku pricing: $0.25/1M input tokens, $1.25/1M output tokens
    const inputCost = (inputTokens / 1000000) * 0.25;
    const outputCost = (outputTokens / 1000000) * 1.25;
    return inputCost + outputCost;
  }

  /**
   * Calculate cost for OpenAI usage
   */
  private calculateOpenAICost(totalTokens: number): number {
    // GPT-3.5-turbo pricing: $0.50/1M tokens
    return (totalTokens / 1000000) * 0.50;
  }

  /**
   * Update global metrics
   */
  private updateGlobalMetrics(results: LLMBatchResult[], duration: number): void {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    this.metrics.totalRequests += results.length;
    this.metrics.successfulRequests += successful.length;
    this.metrics.failedRequests += failed.length;
    this.metrics.totalTokensUsed += totalTokens;
    this.metrics.totalCost += totalCost;
    this.metrics.costPerVideo = this.metrics.totalCost / this.metrics.successfulRequests;
    
    // Update cache hit rate
    const cacheHits = this.cache.getStats().hits;
    const cacheMisses = this.cache.getStats().misses;
    this.metrics.cacheHitRate = cacheHits / (cacheHits + cacheMisses) * 100;
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): LLMPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.initializeMetrics();
    this.cache.flushAll();
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

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.cache.flushAll();
    
    for (const pool of this.connectionPools.values()) {
      await pool.close();
    }
    this.connectionPools.clear();
    
    logger.info('YouTubeLLMScrapingService cleanup completed');
  }
}