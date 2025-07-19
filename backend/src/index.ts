import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger, logRequest } from './utils/logger';
import { database } from './utils/database';
import analyticsRoutes from './routes/analyticsRoutes';
import scrapingRoutes from './routes/scrapingRoutes';
import { YouTubeAPIService } from './services/YouTubeAPIService';
import { YouTubeScrapingService, ScrapingConfig } from './services/YouTubeScrapingService';
import { AnalyticsService } from './services/AnalyticsService';
import { VideoService } from './services/VideoService';
import { ParserService } from './services/ParserService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(limiter);

// Request logging middleware (before other middleware)
app.use(logRequest);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware with increased limits for file uploads
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '50mb',
  verify: (req, res, buf, encoding) => {
    // Set request timeout for large files
    req.setTimeout(parseInt(process.env.UPLOAD_TIMEOUT || '300000')); // 5 minutes
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '50mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Rabbit YouTube Analytics API',
    version: '2.0.0',
    description: 'Advanced YouTube watch history analytics platform',
    endpoints: {
      health: '/health',
      analytics: '/api/analytics',
      upload: '/api/analytics/upload',
      metrics: '/api/analytics/metrics'
    },
    documentation: 'https://docs.rabbit-analytics.com'
  });
});

// Initialize services
let youtubeAPIService: YouTubeAPIService | null = null;
let youtubeScrapingService: YouTubeScrapingService | null = null;
let analyticsService: AnalyticsService;
let videoService: VideoService;
let parserService: ParserService;

// Initialize YouTube API service if API key is provided
if (process.env.YOUTUBE_API_KEY) {
  youtubeAPIService = new YouTubeAPIService({
    apiKey: process.env.YOUTUBE_API_KEY,
    quotaLimit: parseInt(process.env.YOUTUBE_QUOTA_LIMIT || '10000'),
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    requestDelay: parseInt(process.env.API_DELAY_MS || '100'),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5')
  });
  logger.info('YouTube API service initialized');
} else {
  logger.warn('YouTube API key not provided - API enrichment will be disabled');
}

// Initialize YouTube Scraping service if enabled
const scrapingEnabled = process.env.SCRAPING_ENABLED?.toLowerCase() === 'true';
if (scrapingEnabled) {
  const scrapingConfig: ScrapingConfig = {
    maxConcurrentRequests: parseInt(process.env.SCRAPING_CONCURRENT_REQUESTS || '3'),
    requestDelayMs: parseInt(process.env.SCRAPING_DELAY_MS || '2000'),
    retryAttempts: parseInt(process.env.SCRAPING_RETRY_ATTEMPTS || '3'),
    timeout: parseInt(process.env.SCRAPING_TIMEOUT_MS || '30000'),
    userAgents: [], // Will use default user agents
    enableJavaScript: process.env.SCRAPING_ENABLE_JAVASCRIPT?.toLowerCase() === 'true',
    enableBrowser: process.env.SCRAPING_ENABLE_BROWSER?.toLowerCase() === 'true',
    cacheEnabled: process.env.SCRAPING_CACHE_ENABLED?.toLowerCase() !== 'false',
    cacheTTL: parseInt(process.env.SCRAPING_CACHE_TTL || '86400')
  };

  youtubeScrapingService = new YouTubeScrapingService(scrapingConfig);
  logger.info('YouTube Scraping service initialized', {
    maxConcurrentRequests: scrapingConfig.maxConcurrentRequests,
    requestDelayMs: scrapingConfig.requestDelayMs,
    enableBrowser: scrapingConfig.enableBrowser,
    enableJavaScript: scrapingConfig.enableJavaScript,
    cacheEnabled: scrapingConfig.cacheEnabled
  });
} else {
  logger.warn('YouTube Scraping service disabled - only API enrichment available');
}

// Ensure at least one enrichment service is available
if (!youtubeAPIService && !youtubeScrapingService) {
  logger.error('No enrichment services available! Please configure either YouTube API or enable scraping.');
}

// Initialize analytics, video, and parser services
analyticsService = new AnalyticsService();
videoService = new VideoService();
parserService = new ParserService(
  youtubeAPIService!, 
  analyticsService, 
  videoService, 
  youtubeScrapingService || undefined
);

// Make services available to routes
app.locals.services = {
  youtubeAPI: youtubeAPIService,
  youtubeScraping: youtubeScrapingService,
  analytics: analyticsService,
  video: videoService,
  parser: parserService
};

// API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scraping', scrapingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Start server function
async function startServer() {
  try {
    // Connect to database if URI is provided
    if (process.env.MONGODB_URI) {
      await database.connect({
        uri: process.env.MONGODB_URI,
        options: {
          retryWrites: true,
          w: 'majority'
        }
      });
      logger.info('Database connection established');
    } else {
      logger.warn('MongoDB URI not provided - running without database persistence');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`🐰 Rabbit Analytics API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`CORS origins: ${corsOrigins.join(', ')}`);
      
      // Service status logging
      if (youtubeAPIService) {
        logger.info('✅ YouTube API integration enabled');
      } else {
        logger.info('⚠️  YouTube API integration disabled');
      }
      
      if (youtubeScrapingService) {
        logger.info('✅ YouTube Scraping service enabled');
      } else {
        logger.info('⚠️  YouTube Scraping service disabled');
      }
      
      // Default enrichment service
      const defaultService = process.env.DEFAULT_ENRICHMENT_SERVICE || 'auto';
      logger.info(`🔧 Default enrichment service: ${defaultService}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error closing database connection:', error);
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force close server after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
export default app; 