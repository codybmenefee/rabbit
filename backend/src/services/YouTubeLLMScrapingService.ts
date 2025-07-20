import * as cheerio from 'cheerio';
import { request } from 'undici';
import { Pool } from 'undici';
import NodeCache from 'node-cache';
import { IVideoEntry, VideoCategory, ContentType } from '../models/VideoEntry';
import { logger, createTimer } from '../utils/logger';

export interface LLMScrapingConfig {
  provider: 'anthropic' | 'openai' | 'meta' | 'google' | 'mistral' | 'deepseek';
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
  costLimit: number;
  htmlChunkSize: number;
  enableFallback: boolean;
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
  provider: string;
  model: string;
}

interface LLMPerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageResponseTime: number;
  cacheHitRate: number;
  requestsByProvider: Map<string, number>;
  costByProvider: Map<string, number>;
}

export class YouTubeLLMScrapingService {
  private config: LLMScrapingConfig;
  private cache: NodeCache;
  private connectionPools: Map<string, Pool>;
  private openrouterClient: any | null = null;
  private metrics!: LLMPerformanceMetrics;

  // OpenRouter API endpoint
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
  
  // OpenRouter model mappings
  private readonly MODEL_MAPPINGS = {
    // Anthropic models
    'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
    'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet',
    'claude-3-opus-20240229': 'anthropic/claude-3-opus',
    
    // OpenAI models
    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
    'gpt-4-turbo-preview': 'openai/gpt-4-turbo-preview',
    'gpt-4o': 'openai/gpt-4o',
    
    // Meta models
    'llama-3.1-8b-instruct': 'meta-llama/llama-3.1-8b-instruct',
    'llama-3.1-70b-instruct': 'meta-llama/llama-3.1-70b-instruct',
    
    // Google models
    'gemini-pro': 'google/gemini-pro',
    'gemini-pro-vision': 'google/gemini-pro-vision',
    'gemma-3-4b-it': 'google/gemma-3-4b-it',
    'gemma-3n-e4b-it': 'google/gemma-3n-e4b-it',
    
    // Mistral models
    'mistral-7b-instruct': 'mistralai/mistral-7b-instruct',
    'mixtral-8x7b-instruct': 'mistralai/mixtral-8x7b-instruct',
    
    // DeepSeek models
    'deepseek-r1-0528': 'deepseek/deepseek-r1-0528:free',
    'deepseek-r1-0528-free': 'deepseek/deepseek-r1-0528:free'
  };

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  constructor(config: LLMScrapingConfig) {
    this.config = {
      ...config,
      userAgents: config.userAgents.length > 0 ? config.userAgents : this.USER_AGENTS,
      connectionPoolSize: config.connectionPoolSize || 20,
      batchSize: config.batchSize || 10,
      htmlChunkSize: config.htmlChunkSize || 100000, // Smart extraction within 100KB limit
      model: config.model || 'claude-3-haiku-20240307',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.1,
      retryAttempts: config.retryAttempts || 3,
      requestDelayMs: config.requestDelayMs || 2000,
      maxConcurrentRequests: config.maxConcurrentRequests || 5,
      costLimit: config.costLimit || 10,
      timeout: config.timeout || 30000
    };

    this.cache = new NodeCache({
      stdTTL: this.config.cacheTTL || 7200,
      checkperiod: 300
    });

    this.connectionPools = new Map();
    this.initializeOpenRouterClient();
    this.initializeMetrics();

    logger.info('YouTubeLLMScrapingService initialized with OpenRouter', {
      provider: this.config.provider,
      model: this.config.model,
      openrouterModel: this.getOpenRouterModel(),
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      batchSize: this.config.batchSize,
      costLimit: this.config.costLimit
    });
  }

  private initializeOpenRouterClient(): void {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey || apiKey === 'test_key_openrouter') {
      logger.info('Mock OpenRouter client initialized (no API key provided)');
      this.openrouterClient = null;
      return;
    }

    // Initialize OpenRouter client
    this.openrouterClient = {
      apiKey,
      baseURL: this.OPENROUTER_API_URL,
      defaultHeaders: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      }
    };

    logger.info('OpenRouter client initialized', {
      model: this.getOpenRouterModel(),
      referer: process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com'
    });
  }

  private getOpenRouterModel(): string {
    return this.MODEL_MAPPINGS[this.config.model as keyof typeof this.MODEL_MAPPINGS] || this.config.model;
  }

  private getOpenRouterModelForConfig(config: LLMScrapingConfig): string {
    return this.MODEL_MAPPINGS[config.model as keyof typeof this.MODEL_MAPPINGS] || config.model;
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
      requestsByProvider: new Map(),
      costByProvider: new Map()
    };
  }

  /**
   * Scrape videos using OpenRouter LLM API (or mock data if no API key)
   */
  public async scrapeVideos(videoIds: string[], configOverride?: Partial<LLMScrapingConfig>): Promise<LLMBatchResult[]> {
    // Merge config override with default config
    const effectiveConfig = configOverride ? { ...this.config, ...configOverride } : this.config;
    
    if (this.openrouterClient) {
      logger.info('Starting OpenRouter LLM batch scraping', {
        videoCount: videoIds.length,
        batchSize: effectiveConfig.batchSize,
        provider: effectiveConfig.provider,
        model: effectiveConfig.model,
        configOverride: !!configOverride
      });

      return this.scrapeWithOpenRouter(videoIds, effectiveConfig);
    } else {
      logger.info('Starting MOCK LLM batch scraping', {
        videoCount: videoIds.length,
        batchSize: effectiveConfig.batchSize,
        provider: effectiveConfig.provider,
        model: effectiveConfig.model
      });

      return this.scrapeWithMockData(videoIds);
    }
  }

  /**
   * Scrape videos using real OpenRouter API with enhanced batch processing
   */
  private async scrapeWithOpenRouter(videoIds: string[], config: LLMScrapingConfig): Promise<LLMBatchResult[]> {
    const results: LLMBatchResult[] = [];
    const batchSize = config.batchSize || 10;
    const maxConcurrent = config.maxConcurrentRequests || 5;

    logger.info('Starting OpenRouter batch processing', {
      totalVideos: videoIds.length,
      batchSize,
      maxConcurrent,
      retryAttempts: config.retryAttempts || 3
    });

    // Process videos in batches to control concurrency
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      // Process batch with controlled concurrency
      const promises = batch.map(async (videoId, index) => {
        // Add small delay between requests in the same batch to avoid overwhelming the API
        if (index > 0) {
          await this.delay(config.requestDelayMs / 2);
        }
        
        try {
          const result = await this.scrapeVideoWithOpenRouter(videoId, config);
          
          // Check cost limits after each successful request
          if (this.metrics.totalCost >= config.costLimit) {
            logger.warn('Cost limit reached during batch processing', {
              totalCost: this.metrics.totalCost,
              costLimit: config.costLimit,
              processedVideos: results.length + 1
            });
            return result;
          }
          
          return result;
        } catch (error) {
          const errorResult: LLMBatchResult = {
            videoId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tokensUsed: 0,
            cost: 0,
            provider: config.provider,
            model: this.getOpenRouterModelForConfig(config)
          };
          return errorResult;
        }
      });

      // Wait for all promises in the batch to complete
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < videoIds.length) {
        await this.delay(config.requestDelayMs);
      }

      // Check if we should stop due to cost limits
      if (this.metrics.totalCost >= config.costLimit) {
        logger.warn('Cost limit reached, stopping batch processing', {
          totalCost: this.metrics.totalCost,
          costLimit: config.costLimit,
          processedVideos: results.length
        });
        break;
      }
    }

    logger.info('OpenRouter batch processing completed', {
      totalVideos: videoIds.length,
      processedVideos: results.length,
      successfulRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      totalCost: this.metrics.totalCost
    });

    return results;
  }

  /**
   * Mock implementation for testing
   */
  private async scrapeWithMockData(videoIds: string[]): Promise<LLMBatchResult[]> {
    const results: LLMBatchResult[] = [];

    for (const videoId of videoIds) {
      // Simulate processing time
      await this.delay(100);

      // Mock successful extraction with fake data
      const mockData: LLMScrapedVideoData = {
        title: `Mock Video Title for ${videoId}`,
        description: `Mock description for video ${videoId}`,
        channelName: `Mock Channel ${videoId.substring(0, 3)}`,
        channelId: `UC${videoId}`,
        duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
        viewCount: Math.floor(Math.random() * 1000000) + 1000,
        likeCount: Math.floor(Math.random() * 10000) + 100,
        commentCount: Math.floor(Math.random() * 1000) + 10,
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        tags: ['mock', 'test', 'demo'],
        category: 'Entertainment',
        isLivestream: false,
        isShort: Math.random() > 0.8
      };

      const result: LLMBatchResult = {
        videoId,
        success: Math.random() > 0.1, // 90% success rate
        data: mockData,
        tokensUsed: Math.floor(Math.random() * 1000) + 500,
        cost: (Math.random() * 0.01) + 0.001, // $0.001-0.011
        provider: 'mock',
        model: 'mock'
      };

      if (!result.success) {
        result.error = 'Mock error: Simulated failure';
        result.data = undefined;
      }

      results.push(result);
      this.updateMetrics(result);
    }

    const duration = 200; // Mock duration

    logger.info('MOCK LLM batch scraping completed', {
      totalVideos: videoIds.length,
      processedVideos: results.length,
      successfulVideos: results.filter(r => r.success).length,
      totalCost: this.metrics.totalCost,
      duration
    });

    return results;
  }

  private updateMetrics(result: LLMBatchResult): void {
    this.metrics.totalRequests++;
    if (result.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    this.metrics.totalTokensUsed += result.tokensUsed;
    this.metrics.totalCost += result.cost;
    
    // Update provider-specific metrics
    const providerKey = result.provider;
    this.metrics.requestsByProvider.set(providerKey, (this.metrics.requestsByProvider.get(providerKey) || 0) + 1);
    this.metrics.costByProvider.set(providerKey, (this.metrics.costByProvider.get(providerKey) || 0) + result.cost);
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

  /**
   * Scrape a single video using OpenRouter with retry logic
   */
  private async scrapeVideoWithOpenRouter(videoId: string, config: LLMScrapingConfig): Promise<LLMBatchResult> {
    const timer = createTimer(`OpenRouter scraping for ${videoId}`);
    const maxRetries = config.retryAttempts || 3;
    let lastError: string | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`OpenRouter scraping attempt ${attempt}/${maxRetries} for ${videoId}`);
        
        // Fetch video HTML
        const htmlContent = await this.fetchVideoHTML(videoId);
        
        // Make OpenRouter request
        const response = await this.makeOpenRouterRequest(
          'Extract YouTube video metadata',
          htmlContent,
          config
        );

        // Parse response
        const data = this.parseOpenRouterResponse(response);
        
        // Calculate usage and cost
        const tokensUsed = response.usage?.total_tokens || 1000;
        const cost = this.calculateCost(tokensUsed, this.getOpenRouterModelForConfig(config));

        const result: LLMBatchResult = {
          videoId,
          success: true,
          data,
          tokensUsed,
          cost,
          provider: config.provider,
          model: this.getOpenRouterModelForConfig(config)
        };

        this.updateMetrics(result);
        timer.end();
        
        if (attempt > 1) {
          logger.info(`OpenRouter scraping succeeded for ${videoId} on attempt ${attempt}`);
        } else {
          logger.info(`OpenRouter scraping completed for ${videoId}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        // Log retry attempt
        if (attempt < maxRetries) {
          logger.warn(`OpenRouter scraping attempt ${attempt} failed for ${videoId}, retrying...`, {
            error: lastError,
            attempt,
            maxRetries,
            videoId
          });
          
          // Exponential backoff: wait longer between retries
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.delay(backoffDelay);
        } else {
          logger.error(`OpenRouter scraping failed for ${videoId} after ${maxRetries} attempts`, {
            finalError: lastError,
            videoId
          });
        }
      }
    }

    // All retries failed
    const result: LLMBatchResult = {
      videoId,
      success: false,
      error: lastError || 'All retry attempts failed',
      tokensUsed: 0,
      cost: 0,
      provider: config.provider,
      model: this.getOpenRouterModelForConfig(config)
    };

    this.updateMetrics(result);
    timer.end();
    
    return result;
  }

  /**
   * Make OpenRouter API request with enhanced prompt
   */
  private async makeOpenRouterRequest(prompt: string, htmlContent: string, config: LLMScrapingConfig): Promise<any> {
    if (!this.openrouterClient) {
      throw new Error('OpenRouter client not initialized');
    }

    const openrouterModel = this.getOpenRouterModelForConfig(config);
    
    const requestBody = {
      model: openrouterModel,
      messages: [
        {
          role: 'system',
          content: `You are a precise YouTube video metadata extractor. Extract structured data from YouTube video HTML and return ONLY valid JSON.

CRITICAL REQUIREMENTS:
1. Return ONLY raw JSON - no explanations, no markdown, no code blocks
2. Extract EXACT video title and channel name as they appear
3. Use null for missing values
4. Numbers as numbers, booleans as true/false
5. If field not found, omit from JSON
6. Keep descriptions and tags SHORT to avoid truncation

COMPACT JSON FORMAT (keep descriptions under 100 chars):
{
  "title": "exact video title",
  "channelName": "exact channel name", 
  "channelId": "channel ID if found",
  "duration": seconds_as_number,
  "viewCount": views_as_number,
  "likeCount": likes_as_number,
  "publishedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "category": "category",
  "isLivestream": false,
  "isShort": false
}

EXTRACTION PRIORITY:
1. Video title (from <title> or h1)
2. Channel name (from author/creator elements)
3. Basic metrics (views, likes, duration)
4. Skip long descriptions to prevent truncation`
        },
        {
          role: 'user',
          content: `Extract YouTube video metadata. Return compact JSON only:

${this.extractRelevantContent(htmlContent, Math.min(config.htmlChunkSize, 80000))}`
        }
      ],
      max_tokens: Math.max(config.maxTokens, 3000), // Ensure enough tokens for complete response
      temperature: config.temperature
    };

    const response = await request(this.OPENROUTER_API_URL + '/chat/completions', {
      method: 'POST',
      headers: this.openrouterClient.defaultHeaders,
      body: JSON.stringify(requestBody)
    });

    if (response.statusCode !== 200) {
      const errorText = await response.body.text();
      throw new Error(`OpenRouter API error: ${response.statusCode} - ${errorText}`);
    }

    const data = await response.body.json();
    return data;
  }

  /**
   * Parse OpenRouter response and extract video metadata with enhanced error handling
   */
  private parseOpenRouterResponse(response: any): LLMScrapedVideoData {
    try {
      const choice = response.choices?.[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('Invalid response format from OpenRouter');
      }

      const content = choice.message.content.trim();
      
      // Log the raw response for debugging
      logger.debug('Raw OpenRouter response content', {
        contentLength: content.length,
        contentPreview: content.substring(0, 500),
        contentSample: content.substring(100, 300)
      });
      
      // Try to extract JSON from the response with multiple strategies
      let jsonString = content;
      
      // Strategy 1: Try to extract from markdown code blocks with json language
      let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
        logger.debug('JSON extracted using strategy 1 (markdown json block)', { jsonLength: jsonString.length });
      } else {
        // Strategy 2: Try to extract from code blocks without language specification
        jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
          logger.debug('JSON extracted using strategy 2 (markdown block)', { jsonLength: jsonString.length });
        } else {
          // Strategy 3: Try to find JSON object directly (most inclusive)
          jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
            logger.debug('JSON extracted using strategy 3 (direct match)', { jsonLength: jsonString.length });
          } else {
            // Strategy 4: Try to find JSON object with loose boundaries
            const openBrace = content.indexOf('{');
            const closeBrace = content.lastIndexOf('}');
            if (openBrace !== -1 && closeBrace !== -1 && closeBrace > openBrace) {
              jsonString = content.substring(openBrace, closeBrace + 1);
              logger.debug('JSON extracted using strategy 4 (brace search)', { jsonLength: jsonString.length });
            } else {
              logger.error('No JSON structure found in response', { 
                content: content.substring(0, 1000),
                hasOpenBrace: content.includes('{'),
                hasCloseBrace: content.includes('}')
              });
              throw new Error('No JSON structure found in response');
            }
          }
        }
      }
      
      if (!jsonString || !jsonString.includes('{')) {
        logger.error('Extracted JSON string is invalid', { 
          jsonString: jsonString?.substring(0, 200),
          jsonLength: jsonString?.length
        });
        throw new Error('No JSON structure found in response');
      }

      logger.debug('JSON string before cleaning', { 
        jsonPreview: jsonString.substring(0, 300),
        jsonLength: jsonString.length
      });

      // Clean up the JSON string with safer approach
      jsonString = this.cleanJSONString(jsonString);
      
      logger.debug('JSON string after cleaning', { 
        jsonPreview: jsonString.substring(0, 300),
        jsonLength: jsonString.length
      });
      
      let jsonData;
      try {
        jsonData = JSON.parse(jsonString);
        logger.debug('JSON parsing successful', { 
          keys: Object.keys(jsonData),
          title: jsonData.title,
          channelName: jsonData.channelName
        });
      } catch (parseError) {
        logger.error('JSON parsing failed - attempting to fix truncated JSON', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          jsonString: jsonString.substring(0, 500),
          jsonLength: jsonString.length,
          charAtError: parseError instanceof Error && parseError.message.includes('position') ? 
            jsonString.charAt(parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0')) : 'unknown'
        });
        
        // Try to fix truncated JSON by completing it
        try {
          let fixedJson = jsonString;
          
          // If JSON is truncated (missing closing braces), try to complete it
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          
          if (openBraces > closeBraces) {
            // Remove any incomplete property at the end
            const lastComma = fixedJson.lastIndexOf(',');
            const lastQuote = fixedJson.lastIndexOf('"');
            const lastColon = fixedJson.lastIndexOf(':');
            
            // If there's an incomplete property, remove it
            if (lastColon > lastQuote && lastColon > lastComma) {
              const lastComplete = Math.max(lastComma, fixedJson.lastIndexOf('}', lastColon));
              if (lastComplete > 0) {
                fixedJson = fixedJson.substring(0, lastComplete);
              }
            }
            
            // Add missing closing braces
            for (let i = closeBraces; i < openBraces; i++) {
              fixedJson += '}';
            }
            
            logger.debug('Attempting to parse fixed JSON', { 
              fixedJson: fixedJson.substring(0, 300),
              fixedLength: fixedJson.length
            });
            
            jsonData = JSON.parse(fixedJson);
            logger.info('Successfully parsed fixed JSON after truncation repair');
          } else {
            throw parseError; // Re-throw original error if fix doesn't apply
          }
        } catch (fixError) {
          logger.error('Failed to fix truncated JSON', {
            originalError: parseError instanceof Error ? parseError.message : 'Unknown error',
            fixError: fixError instanceof Error ? fixError.message : 'Unknown error'
          });
          throw parseError; // Throw original error
        }
      }
      
      return {
        title: jsonData.title || undefined,
        description: jsonData.description || undefined,
        channelName: jsonData.channelName || undefined,
        channelId: jsonData.channelId || undefined,
        duration: jsonData.duration ? parseInt(jsonData.duration) : undefined,
        viewCount: jsonData.viewCount ? parseInt(jsonData.viewCount) : undefined,
        likeCount: jsonData.likeCount ? parseInt(jsonData.likeCount) : undefined,
        commentCount: jsonData.commentCount ? parseInt(jsonData.commentCount) : undefined,
        publishedAt: jsonData.publishedAt ? new Date(jsonData.publishedAt) : undefined,
        tags: Array.isArray(jsonData.tags) ? jsonData.tags : undefined,
        thumbnailUrl: jsonData.thumbnailUrl || undefined,
        category: jsonData.category || undefined,
        isLivestream: Boolean(jsonData.isLivestream),
        isShort: Boolean(jsonData.isShort)
      };
    } catch (error) {
      throw new Error(`Failed to parse OpenRouter response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Clean up JSON string to handle common formatting issues
   */
  private cleanJSONString(jsonString: string): string {
    // Remove any leading/trailing whitespace and newlines
    jsonString = jsonString.trim();
    
    // Remove any markdown formatting that might have been missed
    jsonString = jsonString.replace(/^```.*\n?/, '').replace(/\n?```$/, '');
    
    // Try to fix common JSON formatting issues without breaking valid JSON
    try {
      // First, try to parse as-is
      JSON.parse(jsonString);
      return jsonString; // If it parses, return it unchanged
    } catch (error) {
      // If parsing fails, try some gentle fixes
      let fixedJson = jsonString;
      
      // Remove trailing commas before closing braces/brackets
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to fix unquoted property names (but be careful not to break strings)
      fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      
      // Try to fix single quotes to double quotes (but be careful in strings)
      fixedJson = fixedJson.replace(/'/g, '"');
      
      try {
        JSON.parse(fixedJson);
        return fixedJson;
      } catch (secondError) {
        // If we still can't parse it, return the original and let the caller handle the error
        return jsonString;
      }
    }
  }

  /**
   * Extract relevant content from YouTube HTML for LLM processing
   */
  private extractRelevantContent(htmlContent: string, maxSize: number): string {
    try {
      // Strategy 1: Extract only the essential metadata
      let relevantContent = '';
      
      // 1. Extract and include page title (most important)
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/);
      if (titleMatch) {
        relevantContent += titleMatch[0] + '\n';
      }
      
      // 2. Extract key meta tags (description, author, etc.)
      const metaPatterns = [
        /<meta[^>]+name="description"[^>]+content="[^"]*"[^>]*>/g,
        /<meta[^>]+name="author"[^>]+content="[^"]*"[^>]*>/g,
        /<meta[^>]+name="title"[^>]+content="[^"]*"[^>]*>/g,
        /<meta[^>]+property="og:title"[^>]+content="[^"]*"[^>]*>/g,
        /<meta[^>]+property="og:description"[^>]+content="[^"]*"[^>]*>/g,
        /<meta[^>]+name="twitter:title"[^>]+content="[^"]*"[^>]*>/g
      ];
      
      metaPatterns.forEach(pattern => {
        const matches = htmlContent.match(pattern);
        if (matches) {
          relevantContent += matches.join('\n') + '\n';
        }
      });
      
      // 3. Extract structured data (JSON-LD)
      const jsonLdMatch = htmlContent.match(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
      if (jsonLdMatch) {
        relevantContent += jsonLdMatch.slice(0, 2).join('\n') + '\n'; // First 2 JSON-LD blocks
      }
      
      // 4. Extract compact ytInitialData (most important for YouTube but very large)
      const ytDataMatch = htmlContent.match(/var ytInitialData = ({.*?});/);
      if (ytDataMatch) {
        try {
          const ytData = JSON.parse(ytDataMatch[1]);
          
          // Extract only the essential parts we need
          const essentialData = {
            contents: {
              twoColumnWatchNextResults: {
                results: {
                  results: {
                    contents: ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.slice(0, 3)
                  }
                }
              }
            }
          };
          
          relevantContent += `<script>var ytInitialData = ${JSON.stringify(essentialData)};</script>\n`;
        } catch (e) {
          // If parsing fails, include a truncated version
          const truncatedYtData = ytDataMatch[1].substring(0, 10000);
          relevantContent += `<script>var ytInitialData = ${truncatedYtData}...};</script>\n`;
        }
      }
      
      // 5. Look for video-specific elements
      const videoElementPatterns = [
        /<span[^>]*class="[^"]*view-count[^"]*"[^>]*>.*?<\/span>/gi,
        /<div[^>]*class="[^"]*video-title[^"]*"[^>]*>.*?<\/div>/gi,
        /<a[^>]*class="[^"]*channel[^"]*"[^>]*>.*?<\/a>/gi,
        /<h1[^>]*class="[^"]*title[^"]*"[^>]*>.*?<\/h1>/gi
      ];
      
      videoElementPatterns.forEach(pattern => {
        const matches = htmlContent.match(pattern);
        if (matches) {
          relevantContent += matches.slice(0, 3).join('\n') + '\n'; // Max 3 matches per pattern
        }
      });
      
      // Ensure we don't exceed the size limit
      if (relevantContent.length > maxSize) {
        // If still too large, prioritize the most important parts
        const lines = relevantContent.split('\n');
        let finalContent = '';
        
        for (const line of lines) {
          if (finalContent.length + line.length + 1 > maxSize) {
            break;
          }
          finalContent += line + '\n';
        }
        
        return finalContent;
      }
      
      return relevantContent;
      
    } catch (error) {
      // If extraction fails, use a smart fallback
      // Look for title position and take content around it
      const titlePos = htmlContent.indexOf('<title>');
      if (titlePos > 0) {
        const startPos = Math.max(0, titlePos - 5000);
        const endPos = Math.min(htmlContent.length, startPos + maxSize);
        return htmlContent.substring(startPos, endPos);
      }
      
      // Final fallback
      return htmlContent.substring(0, Math.min(maxSize, htmlContent.length));
    }
  }

  /**
   * Calculate cost based on token usage and model
   */
  private calculateCost(tokensUsed: number, model: string): number {
    // OpenRouter pricing (approximate, these change frequently)
    const pricingMap: { [key: string]: { input: number; output: number } } = {
      'anthropic/claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      'anthropic/claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'anthropic/claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'openai/gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'openai/gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'meta-llama/llama-3.1-8b-instruct': { input: 0.0002, output: 0.0002 },
      'meta-llama/llama-3.1-70b-instruct': { input: 0.0009, output: 0.0009 },
      'google/gemma-3-4b-it': { input: 0.00000002, output: 0.00000004 },
      'google/gemma-3n-e4b-it': { input: 0.00000002, output: 0.00000004 },
      'deepseek/deepseek-r1-0528:free': { input: 0, output: 0 } // Free model
    };

    const pricing = pricingMap[model] || { input: 0.001, output: 0.002 };
    
    // Estimate input/output split (rough approximation)
    const inputTokens = Math.floor(tokensUsed * 0.7);
    const outputTokens = tokensUsed - inputTokens;
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  /**
   * Fetch HTML content for a YouTube video with enhanced error handling
   */
  private async fetchVideoHTML(videoId: string): Promise<string> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];

    try {
      const response = await request(url, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity', // Don't request compression to avoid decompression issues
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        bodyTimeout: 30000, // 30 second timeout
        headersTimeout: 10000 // 10 second timeout for headers
      });

      if (response.statusCode === 429) {
        throw new Error(`Rate limited by YouTube (HTTP 429) - video ${videoId}`);
      }
      
      if (response.statusCode === 403) {
        throw new Error(`Access forbidden by YouTube (HTTP 403) - video ${videoId}`);
      }
      
      if (response.statusCode === 404) {
        throw new Error(`Video not found (HTTP 404) - video ${videoId}`);
      }
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch video: HTTP ${response.statusCode} - video ${videoId}`);
      }

      const htmlContent = await response.body.text();
      
      // Validate that we got actual HTML content
      if (!htmlContent || htmlContent.length < 1000) {
        throw new Error(`Received insufficient HTML content for video ${videoId} (${htmlContent.length} characters)`);
      }
      
      // Check if we got a YouTube error page
      if (htmlContent.includes('Video unavailable') || htmlContent.includes('This video is not available')) {
        throw new Error(`Video is unavailable or private: ${videoId}`);
      }

      return htmlContent;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Timeout fetching HTML for video ${videoId}: ${error.message}`);
      }
      throw new Error(`Failed to fetch HTML for video ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}