import { Router } from 'express';
import { HighPerformanceScrapingController } from '../controllers/HighPerformanceScrapingController';
import { YouTubeHighPerformanceScrapingService } from '../services/YouTubeHighPerformanceScrapingService';
import rateLimit from 'express-rate-limit';

// Create rate limiters for different endpoint types
const batchScrapeLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 batch requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many batch scraping requests. Limit: 10 requests per 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const performanceLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 performance requests per minute per IP
  message: {
    success: false,
    error: 'Too many performance requests. Limit: 30 requests per minute.',
    retryAfter: '1 minute'
  }
});

const benchmarkLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 benchmark tests per hour per IP
  message: {
    success: false,
    error: 'Too many benchmark requests. Limit: 3 requests per hour.',
    retryAfter: '1 hour'
  }
});

/**
 * Create high-performance scraping routes
 */
export function createHighPerformanceScrapingRoutes(
  highPerformanceScrapingService: YouTubeHighPerformanceScrapingService
): Router {
  const router = Router();
  const controller = new HighPerformanceScrapingController(highPerformanceScrapingService);

  // Middleware to check if high-performance service is available
  router.use((req, res, next) => {
    if (!highPerformanceScrapingService) {
      return res.status(503).json({
        success: false,
        error: 'High-performance scraping service not available',
        message: 'Service may be disabled or failed to initialize'
      });
    }
    next();
  });

  /**
   * POST /api/hp-scraping/batch
   * Batch scrape multiple video IDs with high performance
   * 
   * Body: {
   *   videoIds: string[],
   *   options?: {
   *     enableDeduplication?: boolean,
   *     enableFastParsing?: boolean,
   *     maxConcurrency?: number
   *   }
   * }
   */
  router.post('/batch', batchScrapeLimit, controller.batchScrape);

  /**
   * POST /api/hp-scraping/bulk
   * Bulk scrape from YouTube URLs (extracts video IDs automatically)
   * 
   * Body: {
   *   videoUrls: string[],
   *   options?: {
   *     enableDeduplication?: boolean,
   *     enableFastParsing?: boolean,
   *     maxConcurrency?: number,
   *     batchSize?: number
   *   }
   * }
   */
  router.post('/bulk', batchScrapeLimit, controller.bulkScrape);

  /**
   * GET /api/hp-scraping/performance
   * Get detailed performance metrics
   */
  router.get('/performance', performanceLimit, controller.getPerformanceMetrics);

  /**
   * GET /api/hp-scraping/benchmark?testSize=100&concurrency=100
   * Run performance benchmark test
   */
  router.get('/benchmark', benchmarkLimit, controller.runPerformanceBenchmark);

  /**
   * POST /api/hp-scraping/reset
   * Reset performance metrics and cache
   */
  router.post('/reset', controller.resetMetrics);

  /**
   * GET /api/hp-scraping/health
   * Health check for high-performance service
   */
  router.get('/health', controller.healthCheck);

  /**
   * GET /api/hp-scraping/capabilities
   * Get configuration and capabilities
   */
  router.get('/capabilities', controller.getCapabilities);

  return router;
} 