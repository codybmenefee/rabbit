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
import { YouTubeHighPerformanceScrapingService, HighPerformanceScrapingConfig } from './services/YouTubeHighPerformanceScrapingService';
import { YouTubeLLMScrapingService, LLMScrapingConfig } from './services/YouTubeLLMScrapingService';
import { AnalyticsService } from './services/AnalyticsService';
import { VideoService } from './services/VideoService';
import { ParserService } from './services/ParserService';
import { createHighPerformanceScrapingRoutes } from './routes/highPerformanceScrapingRoutes';
import { createLLMScrapingRoutes } from './routes/llmScrapingRoutes';

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
let youtubeHighPerformanceScrapingService: YouTubeHighPerformanceScrapingService | null = null;
let youtubeLLMScrapingService: YouTubeLLMScrapingService | null = null;
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

// Initialize High-Performance YouTube Scraping service if enabled
const hpScrapingEnabled = process.env.HP_SCRAPING_ENABLED?.toLowerCase() === 'true';
if (hpScrapingEnabled) {
  const hpScrapingConfig: HighPerformanceScrapingConfig = {
    maxConcurrentRequests: parseInt(process.env.HP_SCRAPING_MAX_CONCURRENT_REQUESTS || '500'),
    requestDelayMs: parseInt(process.env.HP_SCRAPING_REQUEST_DELAY_MS || '100'),
    retryAttempts: parseInt(process.env.HP_SCRAPING_RETRY_ATTEMPTS || '2'),
    timeout: parseInt(process.env.HP_SCRAPING_TIMEOUT_MS || '15000'),
    userAgents: [], // Will use default user agents
    enableWorkerThreads: process.env.HP_SCRAPING_ENABLE_WORKER_THREADS?.toLowerCase() === 'true',
    workerThreadCount: parseInt(process.env.HP_SCRAPING_WORKER_THREAD_COUNT || '16'),
    connectionPoolSize: parseInt(process.env.HP_SCRAPING_CONNECTION_POOL_SIZE || '50'),
    batchSize: parseInt(process.env.HP_SCRAPING_BATCH_SIZE || '100'),
    enableDeduplication: process.env.HP_SCRAPING_ENABLE_DEDUPLICATION?.toLowerCase() === 'true',
    cacheEnabled: process.env.HP_SCRAPING_CACHE_ENABLED?.toLowerCase() !== 'false',
    cacheTTL: parseInt(process.env.HP_SCRAPING_CACHE_TTL || '3600'),
    enableFastParsing: process.env.HP_SCRAPING_ENABLE_FAST_PARSING?.toLowerCase() === 'true',
    maxMemoryUsage: parseInt(process.env.HP_SCRAPING_MAX_MEMORY_USAGE || '2048')
  };

  youtubeHighPerformanceScrapingService = new YouTubeHighPerformanceScrapingService(hpScrapingConfig);
  logger.info('YouTube High-Performance Scraping service initialized', {
    maxConcurrentRequests: hpScrapingConfig.maxConcurrentRequests,
    enableWorkerThreads: hpScrapingConfig.enableWorkerThreads,
    workerThreadCount: hpScrapingConfig.workerThreadCount,
    connectionPoolSize: hpScrapingConfig.connectionPoolSize,
    batchSize: hpScrapingConfig.batchSize,
    enableDeduplication: hpScrapingConfig.enableDeduplication,
    enableFastParsing: hpScrapingConfig.enableFastParsing
  });
} else {
  logger.warn('YouTube High-Performance Scraping service disabled');
}

// Initialize LLM Scraping service if enabled
const llmScrapingEnabled = process.env.LLM_SCRAPING_ENABLED?.toLowerCase() === 'true';
if (llmScrapingEnabled && (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)) {
  const llmProvider = process.env.LLM_PROVIDER as 'anthropic' | 'openai' || 'anthropic';
  const llmScrapingConfig: LLMScrapingConfig = {
    provider: llmProvider,
    model: process.env.LLM_MODEL || (llmProvider === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-3.5-turbo'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    maxConcurrentRequests: parseInt(process.env.LLM_MAX_CONCURRENT_REQUESTS || '5'),
    requestDelayMs: parseInt(process.env.LLM_REQUEST_DELAY_MS || '1000'),
    retryAttempts: parseInt(process.env.LLM_RETRY_ATTEMPTS || '2'),
    timeout: parseInt(process.env.LLM_TIMEOUT_MS || '30000'),
    userAgents: [], // Will use default user agents
    connectionPoolSize: parseInt(process.env.LLM_CONNECTION_POOL_SIZE || '20'),
    batchSize: parseInt(process.env.LLM_BATCH_SIZE || '10'),
    enableCaching: process.env.LLM_CACHE_ENABLED?.toLowerCase() !== 'false',
    cacheTTL: parseInt(process.env.LLM_CACHE_TTL || '7200'),
    costLimit: parseFloat(process.env.LLM_COST_LIMIT || '10.0'),
    htmlChunkSize: parseInt(process.env.LLM_HTML_CHUNK_SIZE || '50000'),
    enableFallback: process.env.LLM_ENABLE_FALLBACK?.toLowerCase() !== 'false'
  };

  youtubeLLMScrapingService = new YouTubeLLMScrapingService(llmScrapingConfig);
  logger.info('YouTube LLM Scraping service initialized', {
    provider: llmProvider,
    model: llmScrapingConfig.model,
    maxConcurrentRequests: llmScrapingConfig.maxConcurrentRequests,
    batchSize: llmScrapingConfig.batchSize,
    costLimit: llmScrapingConfig.costLimit,
    enableCaching: llmScrapingConfig.enableCaching
  });
} else {
  if (llmScrapingEnabled) {
    logger.warn('LLM Scraping service enabled but no API keys provided (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
  } else {
    logger.warn('YouTube LLM Scraping service disabled');
  }
}

// Ensure at least one enrichment service is available
if (!youtubeAPIService && !youtubeScrapingService && !youtubeHighPerformanceScrapingService && !youtubeLLMScrapingService) {
  logger.error('No enrichment services available! Please configure YouTube API, enable scraping, or provide LLM API keys.');
}

// Initialize analytics, video, and parser services
analyticsService = new AnalyticsService();
videoService = new VideoService();
parserService = new ParserService(
  youtubeAPIService!, 
  analyticsService, 
  videoService, 
  youtubeScrapingService || undefined,
  youtubeHighPerformanceScrapingService || undefined,
  youtubeLLMScrapingService || undefined
);

// Make services available to routes
app.locals.services = {
  youtubeAPI: youtubeAPIService,
  youtubeScraping: youtubeScrapingService,
  youtubeHighPerformanceScraping: youtubeHighPerformanceScrapingService,
  youtubeLLMScraping: youtubeLLMScrapingService,
  analytics: analyticsService,
  video: videoService,
  parser: parserService
};

// API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scraping', scrapingRoutes);

// High-performance scraping routes (if service is available)
if (youtubeHighPerformanceScrapingService) {
  app.use('/api/hp-scraping', createHighPerformanceScrapingRoutes(youtubeHighPerformanceScrapingService));
}

// LLM scraping routes (if service is available)
if (youtubeLLMScrapingService) {
  app.use('/api/llm-scraping', createLLMScrapingRoutes(youtubeLLMScrapingService));
}

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
      
      if (youtubeHighPerformanceScrapingService) {
        logger.info('✅ YouTube High-Performance Scraping service enabled');
      } else {
        logger.info('⚠️  YouTube High-Performance Scraping service disabled');
      }
      
      if (youtubeLLMScrapingService) {
        logger.info('✅ YouTube LLM Scraping service enabled');
      } else {
        logger.info('⚠️  YouTube LLM Scraping service disabled');
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
          // Cleanup LLM service if available
          if (youtubeLLMScrapingService) {
            await youtubeLLMScrapingService.cleanup();
            logger.info('LLM Scraping service cleaned up');
          }
          
          await database.disconnect();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error during cleanup:', error);
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