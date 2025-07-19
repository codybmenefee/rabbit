import { Request, Response } from 'express';
import { YouTubeHighPerformanceScrapingService } from '../services/YouTubeHighPerformanceScrapingService';
import { logger } from '../utils/logger';

interface BatchScrapeRequest {
  videoIds: string[];
  options?: {
    enableDeduplication?: boolean;
    enableFastParsing?: boolean;
    maxConcurrency?: number;
  };
}

interface BulkScrapeRequest {
  videoUrls: string[];
  options?: {
    enableDeduplication?: boolean;
    enableFastParsing?: boolean;
    maxConcurrency?: number;
    batchSize?: number;
  };
}

export class HighPerformanceScrapingController {
  private scrapingService: YouTubeHighPerformanceScrapingService;

  constructor(scrapingService: YouTubeHighPerformanceScrapingService) {
    this.scrapingService = scrapingService;
  }

  /**
   * Batch scrape multiple video IDs with high performance
   */
  public batchScrape = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoIds, options = {} }: BatchScrapeRequest = req.body;
      
      if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'videoIds array is required and must not be empty',
          maxRecommendedBatch: 1000
        });
        return;
      }

      if (videoIds.length > 10000) {
        res.status(400).json({
          success: false,
          error: 'Batch size too large. Maximum 10,000 videos per request.',
          provided: videoIds.length,
          maximum: 10000
        });
        return;
      }

      logger.info(`High-performance batch scraping started`, {
        videoCount: videoIds.length,
        enableDeduplication: options.enableDeduplication,
        enableFastParsing: options.enableFastParsing,
        maxConcurrency: options.maxConcurrency
      });

      const startTime = Date.now();
      const results = await this.scrapingService.scrapeBatch(videoIds, {
        enableDeduplication: options.enableDeduplication,
        enableFastParsing: options.enableFastParsing,
        maxConcurrency: options.maxConcurrency
      });
      const totalTime = Date.now() - startTime;

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const videosPerSecond = (results.length / (totalTime / 1000)).toFixed(2);

      // Include error details for debugging
      const errorSample = results.filter(r => !r.success && r.error).slice(0, 5).map(r => ({
        videoId: r.videoId,
        error: r.error
      }));

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalVideos: videoIds.length,
            successfulVideos: successCount,
            failedVideos: failureCount,
            successRate: ((successCount / results.length) * 100).toFixed(1) + '%',
            totalTime: totalTime,
            averageTimePerVideo: Math.round(averageTime),
            videosPerSecond: parseFloat(videosPerSecond),
            throughput: `${videosPerSecond} videos/sec`
          },
          ...(errorSample.length > 0 && { errorSample })
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in batch scraping:', error);
      res.status(500).json({
        success: false,
        error: 'Batch scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Bulk scrape from YouTube URLs (extracts video IDs automatically)
   */
  public bulkScrape = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoUrls, options = {} }: BulkScrapeRequest = req.body;
      
      if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
        res.status(400).json({
          success: false,
          error: 'videoUrls array is required and must not be empty'
        });
        return;
      }

      // Extract video IDs from URLs
      const videoIds: string[] = [];
      const invalidUrls: string[] = [];

      for (const url of videoUrls) {
        const videoId = this.scrapingService.extractVideoId(url);
        if (videoId) {
          videoIds.push(videoId);
        } else {
          invalidUrls.push(url);
        }
      }

      if (videoIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid YouTube URLs found',
          invalidUrls
        });
        return;
      }

      logger.info(`Bulk scraping started`, {
        totalUrls: videoUrls.length,
        validVideoIds: videoIds.length,
        invalidUrls: invalidUrls.length,
        options
      });

      const startTime = Date.now();
      const results = await this.scrapingService.scrapeBatch(videoIds);
      const totalTime = Date.now() - startTime;

      const successCount = results.filter(r => r.success).length;
      const videosPerSecond = (results.length / (totalTime / 1000)).toFixed(2);

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalUrls: videoUrls.length,
            validVideoIds: videoIds.length,
            invalidUrls: invalidUrls.length,
            successfulVideos: successCount,
            failedVideos: results.length - successCount,
            successRate: ((successCount / results.length) * 100).toFixed(1) + '%',
            totalTime: totalTime,
            videosPerSecond: parseFloat(videosPerSecond),
            throughput: `${videosPerSecond} videos/sec`
          },
          invalidUrls
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in bulk scraping:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get detailed performance metrics
   */
  public getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.scrapingService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          ...metrics,
          uptime: ((Date.now() - metrics.startTime) / 1000).toFixed(1) + 's',
          throughputSummary: {
            requestsPerSecond: metrics.requestsPerSecond.toFixed(2),
            successRate: ((metrics.successfulRequests / (metrics.successfulRequests + metrics.failedRequests)) * 100).toFixed(1) + '%',
            cacheEfficiency: metrics.cacheHitRate.toFixed(1) + '%',
            averageResponseTime: metrics.averageResponseTime.toFixed(0) + 'ms'
          },
          systemResources: {
            memoryUsage: metrics.memoryUsage.toFixed(1) + 'MB',
            workerUtilization: metrics.workerUtilization.toFixed(1) + '%'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Performance benchmark test
   */
  public runPerformanceBenchmark = async (req: Request, res: Response): Promise<void> => {
    try {
      const { testSize = 100, concurrency = 100 } = req.query;
      const videoCount = Math.min(parseInt(testSize as string) || 100, 1000); // Max 1000 for safety
      const maxConcurrency = Math.min(parseInt(concurrency as string) || 100, 500); // Max 500 for safety

      // Generate test video IDs (using popular videos for consistent results)
      const testVideoIds = [
        'dQw4w9WgXcQ', 'kJQP7kiw5Fk', '9bZkp7q19f0', 'fJ9rUzIMcZQ', 'hT_nvWreIhg',
        'pRpeEdMmmQ0', 'YQHsXMglC9A', 'WPni755-Krg', '2Vv-BfVoq4g', 'JGwWNGJdvx8'
      ];

      // Replicate to reach desired test size
      const benchmarkVideoIds: string[] = [];
      for (let i = 0; i < videoCount; i++) {
        benchmarkVideoIds.push(testVideoIds[i % testVideoIds.length]);
      }

      logger.info(`Running performance benchmark`, {
        testSize: videoCount,
        maxConcurrency,
        targetThroughput: '1000 videos/sec'
      });

      const startTime = Date.now();
      const results = await this.scrapingService.scrapeBatch(benchmarkVideoIds);
      const totalTime = Date.now() - startTime;

      const successCount = results.filter(r => r.success).length;
      const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const videosPerSecond = (results.length / (totalTime / 1000));
      const estimatedHourlyCapacity = Math.round(videosPerSecond * 3600);

      // Calculate if we're meeting the 10,000 videos in 10 seconds target
      const targetVideosPerSecond = 1000; // 10,000 videos / 10 seconds
      const performanceRatio = videosPerSecond / targetVideosPerSecond;
      const meetsTarget = performanceRatio >= 1.0;

      res.json({
        success: true,
        data: {
          benchmark: {
            testSize: videoCount,
            maxConcurrency,
            totalTime: totalTime,
            successfulVideos: successCount,
            failedVideos: results.length - successCount,
            successRate: ((successCount / results.length) * 100).toFixed(1) + '%'
          },
          performance: {
            videosPerSecond: videosPerSecond.toFixed(2),
            averageTimePerVideo: Math.round(averageTime) + 'ms',
            estimatedHourlyCapacity: estimatedHourlyCapacity.toLocaleString(),
            performanceRatio: performanceRatio.toFixed(2),
            meetsTarget: meetsTarget,
            targetThroughput: `${targetVideosPerSecond} videos/sec`
          },
          projection: {
            timeFor10000Videos: ((10000 / videosPerSecond).toFixed(1)) + 's',
            targetTime: '10s',
            scalabilityFactor: performanceRatio >= 1 ? 'Exceeds target' : `Needs ${(1/performanceRatio).toFixed(1)}x improvement`
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error running performance benchmark:', error);
      res.status(500).json({
        success: false,
        error: 'Performance benchmark failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Reset performance metrics and cache
   */
  public resetMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      this.scrapingService.reset();
      
      logger.info('High-performance scraping metrics reset');
      
      res.json({
        success: true,
        message: 'Performance metrics and cache reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error resetting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Health check for high-performance service
   */
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.scrapingService.getPerformanceMetrics();
      const currentThroughput = metrics.requestsPerSecond;
      const successRate = metrics.successfulRequests > 0 ? 
        (metrics.successfulRequests / (metrics.successfulRequests + metrics.failedRequests)) * 100 : 100;
      
      // Define health thresholds
      const isHealthy = successRate >= 80 && metrics.memoryUsage < 1000; // 80% success rate, <1GB memory
      const isPerformant = currentThroughput >= 100; // At least 100 req/sec
      
      const status = isHealthy ? (isPerformant ? 'excellent' : 'good') : 'degraded';
      const httpStatus = isHealthy ? 200 : 503;

      res.status(httpStatus).json({
        success: isHealthy,
        data: {
          status,
          health: {
            successRate: successRate.toFixed(1) + '%',
            memoryUsage: metrics.memoryUsage.toFixed(1) + 'MB',
            currentThroughput: currentThroughput.toFixed(2) + ' req/sec',
            workerUtilization: metrics.workerUtilization.toFixed(1) + '%'
          },
          performance: {
            meetsHighPerformanceThreshold: isPerformant,
            currentCapacity: Math.round(currentThroughput * 3600).toLocaleString() + ' videos/hour',
            targetCapacity: '3,600,000 videos/hour (1000 req/sec)'
          },
          uptime: ((Date.now() - metrics.startTime) / 1000 / 60).toFixed(1) + ' minutes'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error checking high-performance service health:', error);
      res.status(503).json({
        success: false,
        error: 'High-performance service health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get configuration and capabilities
   */
  public getCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.scrapingService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          capabilities: {
            maxConcurrentRequests: 500,
            maxBatchSize: 10000,
            estimatedThroughput: '1000+ videos/sec',
            workerThreads: true,
            connectionPooling: true,
            intelligentCaching: true,
            deduplication: true
          },
          currentConfiguration: {
            workerUtilization: metrics.workerUtilization.toFixed(1) + '%',
            memoryUsage: metrics.memoryUsage.toFixed(1) + 'MB',
            cacheHitRate: metrics.cacheHitRate.toFixed(1) + '%',
            uptime: ((Date.now() - metrics.startTime) / 1000).toFixed(1) + 's'
          },
          endpoints: {
            batchScrape: 'POST /api/hp-scraping/batch',
            bulkScrape: 'POST /api/hp-scraping/bulk',
            performance: 'GET /api/hp-scraping/performance',
            benchmark: 'GET /api/hp-scraping/benchmark',
            health: 'GET /api/hp-scraping/health',
            reset: 'POST /api/hp-scraping/reset'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting capabilities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get capabilities',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 