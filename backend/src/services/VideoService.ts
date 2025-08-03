import { VideoEntry, VideoEntryDocument, IVideoEntry } from '../models/VideoEntry';
import { logger, createTimer } from '../utils/logger';
import { FilterQuery } from 'mongoose';

export interface VideoQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    start: Date;
    end: Date;
  };
  channel?: string;
  category?: string;
  contentType?: string;
  search?: string;
}

export interface BulkUpsertResult {
  upsertedCount: number;
  modifiedCount: number;
  matchedCount: number;
  totalProcessed: number;
  errors: string[];
  processingTime: number;
}

export interface DuplicateCheckResult {
  existingVideos: Map<string, VideoEntryDocument>;
  newVideos: IVideoEntry[];
  duplicateCount: number;
}

export class VideoService {
  
  /**
   * Check for existing videos in database to avoid duplicates
   */
  public async checkForDuplicates(videos: IVideoEntry[]): Promise<DuplicateCheckResult> {
    const timer = createTimer('Duplicate Check');
    
    try {
      logger.debug(`Checking for duplicates among ${videos.length} videos`);
      
      // Extract unique identifiers for database lookup
      const videoIds = videos.map(v => v.videoId).filter(Boolean);
      const urls = videos.map(v => v.url).filter(Boolean);
      
      timer.stage('Database Query');
      
      // Query database for existing videos by videoId or URL
      const existingVideos = await VideoEntry.find({
        $or: [
          { videoId: { $in: videoIds } },
          { url: { $in: urls } }
        ]
      }).exec();
      
      logger.debug(`Found ${existingVideos.length} existing videos in database`);
      
      // Create lookup maps for efficient comparison
      const existingByVideoId = new Map<string, VideoEntryDocument>();
      const existingByUrl = new Map<string, VideoEntryDocument>();
      
      existingVideos.forEach(video => {
        if (video.videoId) {
          existingByVideoId.set(video.videoId, video);
        }
        existingByUrl.set(video.url, video);
      });
      
      timer.stage('Filtering New Videos');
      
      // Filter out videos that already exist
      const newVideos: IVideoEntry[] = [];
      const existingVideoMap = new Map<string, VideoEntryDocument>();
      
      for (const video of videos) {
        let isExisting = false;
        let existingVideo: VideoEntryDocument | undefined;
        
        // Check by videoId first (more reliable)
        if (video.videoId && existingByVideoId.has(video.videoId)) {
          isExisting = true;
          existingVideo = existingByVideoId.get(video.videoId);
        }
        // Then check by URL
        else if (existingByUrl.has(video.url)) {
          isExisting = true;
          existingVideo = existingByUrl.get(video.url);
        }
        
        if (isExisting && existingVideo) {
          // Create a unique key for this video to track existing ones
          const key = video.videoId || video.url;
          existingVideoMap.set(key, existingVideo);
        } else {
          newVideos.push(video);
        }
      }
      
      const duplicateCount = videos.length - newVideos.length;
      
      logger.info(`Duplicate check complete: ${duplicateCount} duplicates found, ${newVideos.length} new videos`);
      
      timer.end({
        totalVideos: videos.length,
        existingVideos: duplicateCount,
        newVideos: newVideos.length,
        databaseLookupTime: true
      });
      
      return {
        existingVideos: existingVideoMap,
        newVideos,
        duplicateCount
      };
      
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to check for duplicates: ${error}`);
    }
  }
  
  /**
   * Bulk upsert video entries to database
   */
  public async bulkUpsertVideos(videos: IVideoEntry[]): Promise<BulkUpsertResult> {
    const timer = createTimer('Bulk Video Upsert');
    const errors: string[] = [];
    
    try {
      logger.info(`Starting bulk upsert for ${videos.length} videos`);
      
      if (videos.length === 0) {
        return {
          upsertedCount: 0,
          modifiedCount: 0,
          matchedCount: 0,
          totalProcessed: 0,
          errors: [],
          processingTime: timer.end({ success: true, reason: 'no_videos' }) / 1000
        };
      }
      
      timer.stage('Preparing Upsert Operations');
      
      // Prepare bulk operations
      const bulkOps = videos.map(video => {
        // Create filter criteria - prefer videoId, fallback to URL
        const filter: any = {};
        if (video.videoId) {
          filter.videoId = video.videoId;
        } else {
          filter.url = video.url;
        }
        
        return {
          updateOne: {
            filter,
            update: {
              $set: {
                ...video,
                lastUpdated: new Date()
              }
            },
            upsert: true
          }
        };
      });
      
      timer.stage('Database Bulk Write');
      
      // Execute bulk write operation
      const result = await VideoEntry.bulkWrite(bulkOps, {
        ordered: false, // Continue processing even if some operations fail
        writeConcern: { w: 'majority' }
      });
      
      logger.info('Bulk upsert completed', {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        totalProcessed: videos.length
      });
      
      const processingTime = timer.end({
        totalVideos: videos.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        successfulOperations: true
      }) / 1000;
      
      return {
        upsertedCount: result.upsertedCount || 0,
        modifiedCount: result.modifiedCount || 0,
        matchedCount: result.matchedCount || 0,
        totalProcessed: videos.length,
        errors,
        processingTime
      };
      
    } catch (error) {
      logger.error('Error during bulk upsert:', error);
      errors.push(`Bulk upsert failed: ${error}`);
      
      const processingTime = timer.end({ 
        error: true, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      }) / 1000;
      
      return {
        upsertedCount: 0,
        modifiedCount: 0,
        matchedCount: 0,
        totalProcessed: videos.length,
        errors,
        processingTime
      };
    }
  }
  
  /**
   * Update existing videos with enriched data
   */
  public async updateExistingVideos(videoUpdates: Map<string, Partial<IVideoEntry>>): Promise<BulkUpsertResult> {
    const timer = createTimer('Update Existing Videos');
    const errors: string[] = [];
    
    try {
      if (videoUpdates.size === 0) {
        return {
          upsertedCount: 0,
          modifiedCount: 0,
          matchedCount: 0,
          totalProcessed: 0,
          errors: [],
          processingTime: timer.end({ success: true, reason: 'no_updates' }) / 1000
        };
      }
      
      logger.info(`Updating ${videoUpdates.size} existing videos with enriched data`);
      
      timer.stage('Preparing Update Operations');
      
      const bulkOps = Array.from(videoUpdates.entries()).map(([key, updates]) => {
        // Key could be videoId or URL
        const filter: any = {};
        if (key.startsWith('http')) {
          filter.url = key;
        } else {
          filter.videoId = key;
        }
        
        return {
          updateOne: {
            filter,
            update: {
              $set: {
                ...updates,
                lastUpdated: new Date()
              }
            }
          }
        };
      });
      
      timer.stage('Database Bulk Update');
      
      const result = await VideoEntry.bulkWrite(bulkOps, {
        ordered: false,
        writeConcern: { w: 'majority' }
      });
      
      logger.info('Existing videos update completed', {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        totalProcessed: videoUpdates.size
      });
      
      const processingTime = timer.end({
        totalVideos: videoUpdates.size,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        updateOperations: true
      }) / 1000;
      
      return {
        upsertedCount: 0,
        modifiedCount: result.modifiedCount || 0,
        matchedCount: result.matchedCount || 0,
        totalProcessed: videoUpdates.size,
        errors,
        processingTime
      };
      
    } catch (error) {
      logger.error('Error updating existing videos:', error);
      errors.push(`Video update failed: ${error}`);
      
      const processingTime = timer.end({ 
        error: true, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      }) / 1000;
      
      return {
        upsertedCount: 0,
        modifiedCount: 0,
        matchedCount: 0,
        totalProcessed: videoUpdates.size,
        errors,
        processingTime
      };
    }
  }
  
  /**
   * Query videos from database with filtering and pagination
   */
  public async queryVideos(options: VideoQueryOptions = {}): Promise<{
    videos: VideoEntryDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const timer = createTimer('Video Query');
    
    try {
      const {
        limit = 100,
        offset = 0,
        sortBy = 'watchedAt',
        sortOrder = 'desc',
        dateRange,
        channel,
        category,
        contentType,
        search
      } = options;
      
      // Build query filter
      const filter: FilterQuery<VideoEntryDocument> = {};
      
      if (dateRange) {
        filter.watchedAt = {
          $gte: dateRange.start,
          $lte: dateRange.end
        };
      }
      
      if (channel) {
        filter.channel = new RegExp(channel, 'i');
      }
      
      if (category) {
        filter.category = category;
      }
      
      if (contentType) {
        filter.contentType = contentType;
      }
      
      if (search) {
        // Search in title and channel fields
        filter.$or = [
          { title: new RegExp(search, 'i') },
          { channel: new RegExp(search, 'i') }
        ];
      }
      
      timer.stage('Database Query');
      
      // Execute query with pagination
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      const [videos, total] = await Promise.all([
        VideoEntry.find(filter)
          .sort(sortOptions)
          .skip(offset)
          .limit(limit)
          .exec(),
        VideoEntry.countDocuments(filter)
      ]);
      
      const hasMore = offset + videos.length < total;
      
      logger.debug(`Video query completed: ${videos.length} videos returned, ${total} total`);
      
      timer.end({
        videosReturned: videos.length,
        totalVideos: total,
        hasMore,
        queryFilter: Object.keys(filter).length > 0
      });
      
      return {
        videos,
        total,
        hasMore
      };
      
    } catch (error) {
      logger.error('Error querying videos:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to query videos: ${error}`);
    }
  }
  
  /**
   * Get video statistics from database
   */
  public async getVideoStats(): Promise<{
    totalVideos: number;
    totalChannels: number;
    dateRange: { start: Date; end: Date } | null;
    contentTypeBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  }> {
    const timer = createTimer('Video Statistics');
    
    try {
      timer.stage('Aggregation Pipeline');
      
      const [
        totalVideos,
        channelStats,
        dateRangeStats,
        contentTypeStats,
        categoryStats
      ] = await Promise.all([
        VideoEntry.countDocuments(),
        VideoEntry.distinct('channel'),
        VideoEntry.aggregate([
          {
            $group: {
              _id: null,
              minDate: { $min: '$watchedAt' },
              maxDate: { $max: '$watchedAt' }
            }
          }
        ]),
        VideoEntry.aggregate([
          {
            $group: {
              _id: '$contentType',
              count: { $sum: 1 }
            }
          }
        ]),
        VideoEntry.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          }
        ])
      ]);
      
      // Process results
      const totalChannels = channelStats.length;
      const dateRange = dateRangeStats.length > 0 ? {
        start: dateRangeStats[0].minDate,
        end: dateRangeStats[0].maxDate
      } : null;
      
      const contentTypeBreakdown: Record<string, number> = {};
      contentTypeStats.forEach(stat => {
        contentTypeBreakdown[stat._id] = stat.count;
      });
      
      const categoryBreakdown: Record<string, number> = {};
      categoryStats.forEach(stat => {
        categoryBreakdown[stat._id] = stat.count;
      });
      
      logger.info('Video statistics generated', {
        totalVideos,
        totalChannels,
        dateRange: dateRange ? {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        } : null,
        contentTypes: Object.keys(contentTypeBreakdown).length,
        categories: Object.keys(categoryBreakdown).length
      });
      
      timer.end({
        totalVideos,
        totalChannels,
        aggregationPipelines: 5
      });
      
      return {
        totalVideos,
        totalChannels,
        dateRange,
        contentTypeBreakdown,
        categoryBreakdown
      };
      
    } catch (error) {
      logger.error('Error generating video statistics:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to generate video statistics: ${error}`);
    }
  }
  
  /**
   * Delete videos by criteria
   */
  public async deleteVideos(filter: FilterQuery<VideoEntryDocument>): Promise<number> {
    const timer = createTimer('Video Deletion');
    
    try {
      logger.warn('Deleting videos with filter:', filter);
      
      const result = await VideoEntry.deleteMany(filter);
      const deletedCount = result.deletedCount || 0;
      
      logger.info(`Deleted ${deletedCount} videos`);
      
      timer.end({
        deletedCount,
        filterApplied: Object.keys(filter).length > 0
      });
      
      return deletedCount;
      
    } catch (error) {
      logger.error('Error deleting videos:', error);
      timer.end({ error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to delete videos: ${error}`);
    }
  }
} 