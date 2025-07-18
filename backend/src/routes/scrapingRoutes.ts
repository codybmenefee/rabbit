import { Router, Request, Response } from 'express';
import { ScrapingController } from '../controllers/ScrapingController';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to check if scraping service is available
const checkScrapingService = (req: Request, res: Response, next: any) => {
  const scrapingService = req.app.locals.services?.youtubeScraping;
  
  if (!scrapingService) {
    return res.status(503).json({
      success: false,
      error: 'Scraping service not available',
      message: 'Web scraping is disabled or not configured properly'
    });
  }
  
  // Attach scraping service to request for controller use
  req.scrapingService = scrapingService;
  next();
};

// Initialize scraping controller
let scrapingController: ScrapingController | null = null;

// Middleware to initialize controller
const initController = (req: Request, res: Response, next: any) => {
  if (!scrapingController && req.scrapingService) {
    scrapingController = new ScrapingController(req.scrapingService);
  }
  next();
};

// Apply middleware to all routes
router.use(checkScrapingService);
router.use(initController);

/**
 * @route GET /scraping/stats
 * @desc Get scraping service statistics
 * @access Public
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!scrapingController) {
      return res.status(500).json({
        success: false,
        error: 'Scraping controller not initialized'
      });
    }
    
    await scrapingController.getStats(req, res);
  } catch (error) {
    logger.error('Error in scraping stats route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route DELETE /scraping/cache
 * @desc Clear scraping cache
 * @access Public
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    if (!scrapingController) {
      return res.status(500).json({
        success: false,
        error: 'Scraping controller not initialized'
      });
    }
    
    await scrapingController.clearCache(req, res);
  } catch (error) {
    logger.error('Error in scraping cache clear route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /scraping/test/:videoId
 * @desc Test scraping a single video
 * @access Public
 */
router.get('/test/:videoId', async (req: Request, res: Response) => {
  try {
    if (!scrapingController) {
      return res.status(500).json({
        success: false,
        error: 'Scraping controller not initialized'
      });
    }
    
    await scrapingController.testScrapeVideo(req, res);
  } catch (error) {
    logger.error('Error in scraping test route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /scraping/extract-video-id
 * @desc Extract video ID from YouTube URL
 * @access Public
 */
router.post('/extract-video-id', async (req: Request, res: Response) => {
  try {
    if (!scrapingController) {
      return res.status(500).json({
        success: false,
        error: 'Scraping controller not initialized'
      });
    }
    
    await scrapingController.extractVideoId(req, res);
  } catch (error) {
    logger.error('Error in video ID extraction route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /scraping/health
 * @desc Check scraping service health
 * @access Public
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!scrapingController) {
      return res.status(500).json({
        success: false,
        error: 'Scraping controller not initialized'
      });
    }
    
    await scrapingController.healthCheck(req, res);
  } catch (error) {
    logger.error('Error in scraping health check route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Extend Request interface to include scraping service
declare global {
  namespace Express {
    interface Request {
      scrapingService?: any;
    }
  }
}

export default router;