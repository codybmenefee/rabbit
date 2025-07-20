import { Request, Response } from 'express';
import { YouTubeLLMScrapingService, LLMScrapingConfig } from '../services/YouTubeLLMScrapingService';
import { logger } from '../utils/logger';

export interface LLMScrapingRequest {
  videoIds: string[];
  config?: Partial<LLMScrapingConfig>;
}

export interface LLMBatchScrapingRequest {
  videoIds: string[];
  batchSize?: number;
  costLimit?: number;
  provider?: 'anthropic' | 'openai' | 'deepseek';
  model?: string;
}

export class LLMScrapingController {
  private scrapingService: YouTubeLLMScrapingService;

  constructor(scrapingService: YouTubeLLMScrapingService) {
    this.scrapingService = scrapingService;
  }

  /**
   * Scrape videos using LLM processing
   */
  public scrapeVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoIds, config } = req.body as LLMScrapingRequest;

      if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'videoIds must be a non-empty array'
        });
        return;
      }

      logger.info('LLM scraping request received', {
        videoCount: videoIds.length,
        customConfig: !!config
      });

      const results = await this.scrapingService.scrapeVideos(videoIds, config);
      const metrics = this.scrapingService.getMetrics();

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalVideos: videoIds.length,
            successfulVideos: successful.length,
            failedVideos: failed.length,
            successRate: (successful.length / videoIds.length) * 100,
            totalCost: metrics.totalCost,
            averageCostPerVideo: metrics.successfulRequests > 0 ? metrics.totalCost / metrics.successfulRequests : 0,
            totalTokensUsed: metrics.totalTokensUsed
          },
          metrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('LLM scraping failed:', error);
      
      if (error instanceof Error && error.message.includes('Cost limit')) {
        res.status(429).json({
          error: 'Cost limit exceeded',
          message: error.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        error: 'LLM scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Batch scraping with cost optimization
   */
  public batchScrapeVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        videoIds, 
        batchSize = 10, 
        costLimit = 10, 
        provider = 'anthropic',
        model 
      } = req.body as LLMBatchScrapingRequest;

      if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'videoIds must be a non-empty array'
        });
        return;
      }

      logger.info('LLM batch scraping request received', {
        videoCount: videoIds.length,
        batchSize,
        costLimit,
        provider,
        model
      });

      // Process videos in smaller batches to respect cost limits
      const results = [];
      const totalBatches = Math.ceil(videoIds.length / batchSize);
      let currentCost = 0;
      let processedVideos = 0;

      for (let i = 0; i < totalBatches; i++) {
        const startIdx = i * batchSize;
        const endIdx = Math.min(startIdx + batchSize, videoIds.length);
        const batchVideoIds = videoIds.slice(startIdx, endIdx);

        try {
          const batchResults = await this.scrapingService.scrapeVideos(batchVideoIds);
          results.push(...batchResults);
          
          const batchCost = batchResults.reduce((sum, r) => sum + r.cost, 0);
          currentCost += batchCost;
          processedVideos += batchVideoIds.length;

          logger.info(`Batch ${i + 1}/${totalBatches} completed`, {
            batchSize: batchVideoIds.length,
            batchCost,
            totalCost: currentCost,
            processedVideos
          });

          // Check cost limit
          if (currentCost >= costLimit) {
            logger.warn('Cost limit reached, stopping batch processing', {
              currentCost,
              costLimit,
              processedVideos,
              totalVideos: videoIds.length
            });
            break;
          }

        } catch (error) {
          logger.error(`Batch ${i + 1} failed:`, error);
          // Continue with next batch on error
          continue;
        }
      }

      const metrics = this.scrapingService.getMetrics();
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalVideos: videoIds.length,
            processedVideos,
            successfulVideos: successful.length,
            failedVideos: failed.length,
            successRate: processedVideos > 0 ? (successful.length / processedVideos) * 100 : 0,
            totalCost: currentCost,
            averageCostPerVideo: successful.length > 0 ? currentCost / successful.length : 0,
            costLimitReached: currentCost >= costLimit,
            batchesCompleted: Math.floor(processedVideos / batchSize)
          },
          metrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('LLM batch scraping failed:', error);
      
      res.status(500).json({
        error: 'LLM batch scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get LLM scraping metrics
   */
  public getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.scrapingService.getMetrics();
      
      res.json({
        success: true,
        data: {
          metrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get LLM scraping metrics:', error);
      
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Reset LLM scraping metrics
   */
  public resetMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      this.scrapingService.resetMetrics();
      
      res.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to reset LLM scraping metrics:', error);
      
      res.status(500).json({
        error: 'Failed to reset metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Estimate scraping cost
   */
  public estimateCost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoCount, provider = 'anthropic', model } = req.body;

      if (!videoCount || typeof videoCount !== 'number' || videoCount <= 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'videoCount must be a positive number'
        });
        return;
      }

      // Estimate based on average token usage
      const avgTokensPerVideo = provider === 'anthropic' ? 12500 : 12500;
      const totalTokens = videoCount * avgTokensPerVideo;
      
      let estimatedCost = 0;
      if (provider === 'anthropic') {
        // Claude 3 Haiku: $0.25/1M input tokens, $1.25/1M output tokens
        // Assume 80% input, 20% output
        const inputTokens = totalTokens * 0.8;
        const outputTokens = totalTokens * 0.2;
        estimatedCost = (inputTokens / 1000000) * 0.25 + (outputTokens / 1000000) * 1.25;
      } else {
        // GPT-3.5-turbo: $0.50/1M tokens
        estimatedCost = (totalTokens / 1000000) * 0.50;
      }

      // Processing time estimate (assuming 2 seconds per video)
      const estimatedTimeMinutes = Math.ceil((videoCount * 2) / 60);

      res.json({
        success: true,
        data: {
          videoCount,
          provider,
          model: model || (provider === 'google' ? 'gemma-3-4b-it' : 'gpt-3.5-turbo'),
          estimates: {
            totalTokens,
            totalCost: Math.round(estimatedCost * 100) / 100,
            costPerVideo: Math.round((estimatedCost / videoCount) * 10000) / 10000,
            estimatedTimeMinutes,
            recommendedBatchSize: Math.min(10, videoCount),
            dailyBudgetVideos: Math.floor(10 / (estimatedCost / videoCount)) // $10 daily budget
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to estimate LLM scraping cost:', error);
      
      res.status(500).json({
        error: 'Failed to estimate cost',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
}