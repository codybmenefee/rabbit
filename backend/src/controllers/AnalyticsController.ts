import { Request, Response } from 'express';
import { z } from 'zod';
import { IVideoEntry } from '../models/VideoEntry';
import { VideoMetrics } from '../models/Metrics';
import { ParseOptions, ParseResult } from '../services/ParserService';
import { YouTubeAPIService } from '../services/YouTubeAPIService';
import { AnalyticsService } from '../services/AnalyticsService';
import { VideoService } from '../services/VideoService';
import { ParserService } from '../services/ParserService';
import { VideoCategory } from '../models/VideoEntry';
import { logger } from '../utils/logger';

// Request validation schemas
const uploadRequestSchema = z.object({
  htmlContent: z.string().min(1, 'HTML content is required'),
  options: z.object({
    enrichWithAPI: z.boolean().default(false),
    includeAds: z.boolean().default(false),
    includeShorts: z.boolean().default(true),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional(),
    categoryFilters: z.array(z.string()).optional()
  }).default({})
});

const settingsUpdateSchema = z.object({
  enrichWithAPI: z.boolean().optional(),
  includeAds: z.boolean().optional(),
  includeShorts: z.boolean().optional(),
  categoryFilters: z.array(z.string()).optional()
});

export class AnalyticsController {
  // In-memory storage for processed data (in production, use Redis or database)
  private processedResults = new Map<string, ParseResult>();
  private sessionData = new Map<string, {
    entries: IVideoEntry[];
    metrics: VideoMetrics;
    lastUpdated: Date;
  }>();

  /**
   * Get services from app locals
   */
  private getServices(req: Request) {
    return {
      parser: req.app.locals.services.parser as ParserService,
      analytics: req.app.locals.services.analytics as AnalyticsService,
      video: req.app.locals.services.video as VideoService,
      youtubeAPI: req.app.locals.services.youtubeAPI as YouTubeAPIService | null
    };
  }

  /**
   * Get processing progress for a session
   */
  public async getProgress(req: Request, res: Response): Promise<Response> {
    try {
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const services = this.getServices(req);
      const progress = services.parser.getProgress(sessionId);
      
      if (!progress) {
        return res.status(404).json({
          error: 'Session not found or progress data not available',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        progress,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving progress:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve progress',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Upload and process watch history file
   */
  public async uploadFile(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = uploadRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
          timestamp: new Date().toISOString()
        });
      }

      const { htmlContent, options } = validation.data;
      const services = this.getServices(req);

      if (!services.parser) {
        return res.status(500).json({
          error: 'Parser service not available',
          timestamp: new Date().toISOString()
        });
      }

      // Convert string dates to Date objects if provided
      const parseOptions: ParseOptions = {
        ...options,
        dateRange: options.dateRange ? {
          start: new Date(options.dateRange.start!),
          end: new Date(options.dateRange.end!)
        } : undefined,
        categoryFilters: options.categoryFilters ? 
          options.categoryFilters.map(cat => cat as VideoCategory) : 
          undefined
      };

      // Generate session ID early so we can track progress
      const sessionId = this.generateSessionId();

      logger.info('Processing watch history upload', {
        sessionId,
        contentLength: htmlContent.length,
        options: parseOptions,
        ip: req.ip
      });

      // Process the HTML file with session ID for progress tracking
      const result = await services.parser.parseWatchHistory(htmlContent, parseOptions, sessionId);
      
      // Store results
      this.processedResults.set(sessionId, result);
      this.sessionData.set(sessionId, {
        entries: result.entries,
        metrics: result.metrics,
        lastUpdated: new Date()
      });

      // Clean up old sessions (keep last 10)
      this.cleanupOldSessions();

      const processingTime = (Date.now() - startTime) / 1000;
      
      logger.info('Upload processing completed', {
        sessionId,
        totalEntries: result.processingStats.totalEntries,
        validEntries: result.processingStats.validEntries,
        processingTime,
        enrichedEntries: result.entries.filter(e => e.enrichedWithAPI).length
      });

      // Include API quota information if available
      const quotaInfo = services.youtubeAPI?.getQuotaUsage();

      return res.status(200).json({
        success: true,
        sessionId,
        metrics: result.metrics,
        processingStats: {
          ...result.processingStats,
          processingTime
        },
        quotaUsage: quotaInfo,
        summary: {
          totalVideos: result.metrics.totalVideos,
          uniqueChannels: result.metrics.uniqueChannels,
          totalWatchTime: result.metrics.totalWatchTime,
          dateRange: result.metrics.dateRange,
          enrichmentEnabled: parseOptions.enrichWithAPI,
          apiEnrichmentRate: result.entries.length > 0 ? 
            Math.round((result.entries.filter(e => e.enrichedWithAPI).length / result.entries.length) * 100) : 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      logger.error('Error processing upload:', error);

      return res.status(500).json({
        error: 'Failed to process watch history file',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get metrics for a session
   */
  public async getMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const sessionData = this.sessionData.get(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          error: 'Session not found or expired',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Metrics requested', { sessionId, ip: req.ip });

      return res.status(200).json({
        success: true,
        metrics: sessionData.metrics,
        lastUpdated: sessionData.lastUpdated,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving metrics:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get video entries with pagination
   */
  public async getVideoEntries(req: Request, res: Response): Promise<Response> {
    try {
      const sessionId = req.query.sessionId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200); // Max 200 per page
      const sortBy = req.query.sortBy as string || 'watchedAt';
      const sortOrder = req.query.sortOrder as string || 'desc';
      const search = req.query.search as string;
      const category = req.query.category as string;
      const contentType = req.query.contentType as string;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const sessionData = this.sessionData.get(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          error: 'Session not found or expired',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      let entries = [...sessionData.entries];

      // Apply filters
      if (search) {
        entries = entries.filter(entry => 
          entry.title.toLowerCase().includes(search.toLowerCase()) ||
          entry.channel.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (category) {
        entries = entries.filter(entry => entry.category === category);
      }

      if (contentType) {
        entries = entries.filter(entry => entry.contentType === contentType);
      }

      // Sort entries
      entries.sort((a, b) => {
        let aValue: any = a[sortBy as keyof IVideoEntry];
        let bValue: any = b[sortBy as keyof IVideoEntry];

        if (aValue instanceof Date) aValue = aValue.getTime();
        if (bValue instanceof Date) bValue = bValue.getTime();

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = entries.slice(startIndex, endIndex);

      const totalPages = Math.ceil(entries.length / limit);

      logger.info('Video entries requested', {
        sessionId,
        page,
        limit,
        totalEntries: entries.length,
        returnedEntries: paginatedEntries.length,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        entries: paginatedEntries,
        pagination: {
          currentPage: page,
          totalPages,
          totalEntries: entries.length,
          entriesPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          search: search || null,
          category: category || null,
          contentType: contentType || null,
          sortBy,
          sortOrder
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving video entries:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve video entries',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update processing settings and reprocess data
   */
  public async updateSettings(req: Request, res: Response): Promise<Response> {
    try {
      const sessionId = req.body.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const validation = settingsUpdateSchema.safeParse(req.body.settings || {});
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid settings data',
          details: validation.error.issues,
          timestamp: new Date().toISOString()
        });
      }

      const result = this.processedResults.get(sessionId);
      if (!result) {
        return res.status(404).json({
          error: 'Session not found or expired',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      const services = this.getServices(req);
      const newSettings = validation.data;

      // Regenerate metrics with new settings
      let filteredEntries = [...result.entries];

      // Apply content type filters
      if (newSettings.includeAds === false) {
        filteredEntries = filteredEntries.filter(e => e.contentType !== 'advertisement');
      }
      if (newSettings.includeShorts === false) {
        filteredEntries = filteredEntries.filter(e => e.contentType !== 'short');
      }

      // Apply category filters
      if (newSettings.categoryFilters && newSettings.categoryFilters.length > 0) {
        filteredEntries = filteredEntries.filter(e => 
          newSettings.categoryFilters!.includes(e.category)
        );
      }

      // Regenerate metrics
      const newMetrics = await services.analytics.generateMetrics(filteredEntries);

      // Update session data
      this.sessionData.set(sessionId, {
        entries: filteredEntries,
        metrics: newMetrics,
        lastUpdated: new Date()
      });

      logger.info('Settings updated', {
        sessionId,
        newSettings,
        filteredEntries: filteredEntries.length,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        metrics: newMetrics,
        appliedSettings: newSettings,
        entriesCount: filteredEntries.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error updating settings:', error);
      
      return res.status(500).json({
        error: 'Failed to update settings',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get API quota usage information
   */
  public async getQuotaUsage(req: Request, res: Response): Promise<Response> {
    try {
      const services = this.getServices(req);
      
      if (!services.youtubeAPI) {
        return res.status(404).json({
          error: 'YouTube API service not available',
          timestamp: new Date().toISOString()
        });
      }

      const quotaUsage = services.youtubeAPI.getQuotaUsage();
      
      return res.status(200).json({
        success: true,
        quotaUsage,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving quota usage:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve quota usage',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export data in various formats
   */
  public async exportData(req: Request, res: Response): Promise<Response> {
    try {
      const sessionId = req.query.sessionId as string;
      const format = req.query.format as string || 'json';

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const sessionData = this.sessionData.get(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          error: 'Session not found or expired',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      if (format === 'csv') {
        const csv = this.convertToCSV(sessionData.entries);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="youtube-analytics-${sessionId}.csv"`);
        return res.send(csv);
      } else {
        const exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            sessionId,
            version: '2.0.0'
          },
          metrics: sessionData.metrics,
          entries: sessionData.entries
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="youtube-analytics-${sessionId}.json"`);
        return res.json(exportData);
      }

    } catch (error) {
      logger.error('Error exporting data:', error);
      
      return res.status(500).json({
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private cleanupOldSessions(): void {
    const sessions = Array.from(this.sessionData.entries())
      .sort(([,a], [,b]) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    // Keep only the 10 most recent sessions
    sessions.slice(10).forEach(([sessionId]) => {
      this.sessionData.delete(sessionId);
      this.processedResults.delete(sessionId);
    });
  }

  private convertToCSV(entries: IVideoEntry[]): string {
    const headers = [
      'Title', 'Channel', 'Watched At', 'URL', 'Content Type', 'Category',
      'Duration (seconds)', 'View Count', 'Like Count', 'Comment Count',
      'Enriched with API', 'Video ID'
    ];

    const rows = entries.map(entry => [
      `"${entry.title.replace(/"/g, '""')}"`,
      `"${entry.channel.replace(/"/g, '""')}"`,
      entry.watchedAt.toISOString(),
      entry.url,
      entry.contentType,
      entry.category,
      entry.duration || '',
      entry.viewCount || '',
      entry.likeCount || '',
      entry.commentCount || '',
      entry.enrichedWithAPI,
      entry.videoId || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get videos from database with pagination and filtering
   */
  public async getDatabaseVideos(req: Request, res: Response): Promise<Response> {
    try {
      const services = this.getServices(req);
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200); // Max 200 per page
      const offset = (page - 1) * limit;
      const sortBy = req.query.sortBy as string || 'watchedAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
      const channel = req.query.channel as string;
      const category = req.query.category as string;
      const contentType = req.query.contentType as string;
      
      // Parse date range if provided
      let dateRange;
      if (req.query.startDate && req.query.endDate) {
        dateRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        };
      }

      const result = await services.video.queryVideos({
        limit,
        offset,
        sortBy,
        sortOrder,
        dateRange,
        channel,
        category,
        contentType
      });

      logger.info('Database videos queried', { 
        page, 
        limit, 
        total: result.total, 
        returned: result.videos.length,
        ip: req.ip 
      });

      return res.status(200).json({
        success: true,
        data: {
          videos: result.videos,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: result.hasMore
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error querying database videos:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve videos from database',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get video statistics from database
   */
  public async getDatabaseStats(req: Request, res: Response): Promise<Response> {
    try {
      const services = this.getServices(req);
      
      const stats = await services.video.getVideoStats();

      logger.info('Database statistics generated', { 
        totalVideos: stats.totalVideos,
        totalChannels: stats.totalChannels,
        ip: req.ip 
      });

      return res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error generating database statistics:', error);
      
      return res.status(500).json({
        error: 'Failed to generate database statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate metrics from database videos
   */
  public async getDatabaseMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const services = this.getServices(req);
      
      // Get filters from query parameters
      const channel = req.query.channel as string;
      const category = req.query.category as string;
      const contentType = req.query.contentType as string;
      
      let dateRange;
      if (req.query.startDate && req.query.endDate) {
        dateRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        };
      }

      // Query videos from database (get all for metrics generation)
      const result = await services.video.queryVideos({
        limit: 10000, // Large limit for metrics generation
        offset: 0,
        dateRange,
        channel,
        category,
        contentType
      });

      // Generate metrics from database videos
      const metrics = await services.analytics.generateMetrics(result.videos);

      logger.info('Database metrics generated', { 
        videosAnalyzed: result.videos.length,
        hasFilters: !!(channel || category || contentType || dateRange),
        ip: req.ip 
      });

      return res.status(200).json({
        success: true,
        data: {
          metrics,
          videosAnalyzed: result.videos.length,
          filters: {
            channel,
            category,
            contentType,
            dateRange
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error generating metrics from database:', error);
      
      return res.status(500).json({
        error: 'Failed to generate metrics from database',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new AnalyticsController(); 