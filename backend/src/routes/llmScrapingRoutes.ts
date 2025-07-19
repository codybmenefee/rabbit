import { Router } from 'express';
import { LLMScrapingController } from '../controllers/LLMScrapingController';
import { YouTubeLLMScrapingService } from '../services/YouTubeLLMScrapingService';
import { logger } from '../utils/logger';

export function createLLMScrapingRoutes(llmScrapingService: YouTubeLLMScrapingService): Router {
  const router = Router();
  const controller = new LLMScrapingController(llmScrapingService);

  // Middleware for request logging
  router.use((req, res, next) => {
    logger.info(`LLM Scraping API request: ${req.method} ${req.path}`, {
      body: req.method === 'POST' ? req.body : undefined,
      query: req.query,
      ip: req.ip
    });
    next();
  });

  /**
   * POST /scrape
   * Scrape videos using LLM processing
   * Body: { videoIds: string[], config?: Partial<LLMScrapingConfig> }
   */
  router.post('/scrape', controller.scrapeVideos);

  /**
   * POST /batch-scrape
   * Batch scrape videos with cost optimization
   * Body: { 
   *   videoIds: string[], 
   *   batchSize?: number, 
   *   costLimit?: number, 
   *   provider?: 'anthropic' | 'openai',
   *   model?: string 
   * }
   */
  router.post('/batch-scrape', controller.batchScrapeVideos);

  /**
   * GET /metrics
   * Get current LLM scraping metrics
   */
  router.get('/metrics', controller.getMetrics);

  /**
   * POST /metrics/reset
   * Reset LLM scraping metrics
   */
  router.post('/metrics/reset', controller.resetMetrics);

  /**
   * POST /estimate-cost
   * Estimate scraping cost for a given number of videos
   * Body: { videoCount: number, provider?: 'anthropic' | 'openai', model?: string }
   */
  router.post('/estimate-cost', controller.estimateCost);

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (req, res) => {
    try {
      const metrics = llmScrapingService.getMetrics();
      
      res.json({
        success: true,
        service: 'LLM Scraping Service',
        status: 'healthy',
        metrics: {
          totalRequests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 ? 
            (metrics.successfulRequests / metrics.totalRequests) * 100 : 0,
          totalCost: metrics.totalCost,
          cacheHitRate: metrics.cacheHitRate
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        service: 'LLM Scraping Service',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /config
   * Get current service configuration (without sensitive data)
   */
  router.get('/config', (req, res) => {
    try {
      // Return safe configuration information
      res.json({
        success: true,
        data: {
          providers: ['anthropic', 'openai'],
          models: {
            anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
            openai: ['gpt-3.5-turbo', 'gpt-4-turbo-preview']
          },
          pricing: {
            anthropic: {
              'claude-3-haiku-20240307': {
                input: '$0.25/1M tokens',
                output: '$1.25/1M tokens'
              }
            },
            openai: {
              'gpt-3.5-turbo': '$0.50/1M tokens'
            }
          },
          recommendations: {
            batchSize: 10,
            dailyBudget: 10,
            maxCostPerVideo: 0.01
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}