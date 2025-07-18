import { Request, Response } from 'express';
import { YouTubeScrapingService } from '../services/YouTubeScrapingService';
import { logger } from '../utils/logger';

export class ScrapingController {
  private scrapingService: YouTubeScrapingService;

  constructor(scrapingService: YouTubeScrapingService) {
    this.scrapingService = scrapingService;
  }

  /**
   * Get scraping service statistics
   */
  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.scrapingService.getScrapingStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting scraping stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve scraping statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Clear scraping cache
   */
  public clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      this.scrapingService.clearCache();
      
      logger.info('Scraping cache cleared via API request');
      
      res.json({
        success: true,
        message: 'Scraping cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error clearing scraping cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear scraping cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Test scraping a single video
   */
  public testScrapeVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;
      
      if (!videoId) {
        res.status(400).json({
          success: false,
          error: 'Video ID is required'
        });
        return;
      }

      logger.info(`Testing video scraping for ID: ${videoId}`);
      
      const startTime = Date.now();
      const scrapedData = await this.scrapingService.scrapeVideoData(videoId);
      const duration = Date.now() - startTime;

      if (scrapedData) {
        res.json({
          success: true,
          data: {
            videoId,
            scrapedData,
            metadata: {
              scrapingDuration: duration,
              timestamp: new Date().toISOString(),
              fieldsExtracted: Object.keys(scrapedData).length
            }
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'No data could be scraped for this video',
          data: {
            videoId,
            metadata: {
              scrapingDuration: duration,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      logger.error(`Error testing video scraping for ${req.params.videoId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to scrape video data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Extract video ID from URL
   */
  public extractVideoId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;
      
      if (!url) {
        res.status(400).json({
          success: false,
          error: 'URL is required'
        });
        return;
      }

      const videoId = this.scrapingService.extractVideoId(url);
      
      if (videoId) {
        res.json({
          success: true,
          data: {
            url,
            videoId,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Could not extract video ID from URL',
          data: {
            url,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Error extracting video ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract video ID',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Health check for scraping service
   */
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.scrapingService.getScrapingStats();
      const isHealthy = !stats.circuitBreakerOpen && stats.successRate >= 50;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          status: isHealthy ? 'healthy' : 'degraded',
          circuitBreakerOpen: stats.circuitBreakerOpen,
          successRate: stats.successRate,
          requestCount: stats.requestCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error checking scraping service health:', error);
      res.status(503).json({
        success: false,
        error: 'Scraping service health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}