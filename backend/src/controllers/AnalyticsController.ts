import { Request, Response } from 'express';
import ParserService from '../services/ParserService';
import { emptyMetrics } from '../models/Metrics';
import { VideoEntry } from '../models/VideoEntry';

class AnalyticsController {
  // Store the last processed metrics in memory (in a real app, use a database)
  private lastProcessedMetrics = emptyMetrics;
  // Store the last HTML content for reprocessing with different filter settings
  private lastHtmlContent: string | null = null;
  // Store the last processed video entries
  private lastVideoEntries: VideoEntry[] = [];

  /**
   * Upload and process a watch history HTML file
   */
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.body || !req.body.htmlContent) {
        return res.status(400).json({ error: 'No HTML content provided' });
      }

      const { htmlContent } = req.body;
      
      // Get filter preferences
      const includeAds = req.body.includeAds === true;
      const includeShorts = req.body.includeShorts === true;
      
      // Store the HTML content for potential reprocessing
      this.lastHtmlContent = htmlContent;
      
      // Process the HTML file
      const result = ParserService.parseWatchHistory(htmlContent, includeAds, includeShorts);
      
      // Store the metrics and entries for later retrieval
      this.lastProcessedMetrics = result.metrics;
      this.lastVideoEntries = result.entries;
      
      return res.status(200).json({
        message: 'File processed successfully',
        metrics: result.metrics,
        filterSummary: {
          adsFiltered: result.metrics.filteredAdsCount,
          shortsFiltered: result.metrics.filteredShortsCount,
          includingAds: result.metrics.includingAds,
          includingShorts: result.metrics.includingShorts
        }
      });
    } catch (error) {
      console.error('Error processing file:', error);
      return res.status(500).json({ error: 'Failed to process the file' });
    }
  }

  /**
   * Get metrics from the most recently processed file
   */
  getMetrics(req: Request, res: Response) {
    try {
      return res.status(200).json({
        metrics: this.lastProcessedMetrics,
        filterSummary: {
          adsFiltered: this.lastProcessedMetrics.filteredAdsCount,
          shortsFiltered: this.lastProcessedMetrics.filteredShortsCount,
          includingAds: this.lastProcessedMetrics.includingAds,
          includingShorts: this.lastProcessedMetrics.includingShorts
        }
      });
    } catch (error) {
      console.error('Error retrieving metrics:', error);
      return res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }

  /**
   * Update filter settings and reprocess the last uploaded file
   */
  updateFilters(req: Request, res: Response) {
    try {
      const includeAds = req.body.includeAds === true;
      const includeShorts = req.body.includeShorts === true;
      
      if (!this.lastHtmlContent) {
        return res.status(400).json({ error: 'No data has been uploaded yet' });
      }
      
      // Reprocess with new filter settings
      const result = ParserService.parseWatchHistory(this.lastHtmlContent, includeAds, includeShorts);
      
      // Update stored metrics and entries
      this.lastProcessedMetrics = result.metrics;
      this.lastVideoEntries = result.entries;
      
      return res.status(200).json({
        message: 'Filters updated successfully',
        metrics: result.metrics,
        filterSummary: {
          adsFiltered: result.metrics.filteredAdsCount,
          shortsFiltered: result.metrics.filteredShortsCount,
          includingAds: result.metrics.includingAds,
          includingShorts: result.metrics.includingShorts
        }
      });
    } catch (error) {
      console.error('Error updating filters:', error);
      return res.status(500).json({ error: 'Failed to update filters' });
    }
  }

  /**
   * Demo method to generate sample data
   */
  getSampleData(req: Request, res: Response) {
    try {
      const includeAds = req.query.includeAds === 'true';
      const includeShorts = req.query.includeShorts === 'true';
      
      const result = ParserService.generateSampleData(includeAds, includeShorts);
      this.lastProcessedMetrics = result.metrics;
      this.lastVideoEntries = result.entries;
      
      return res.status(200).json({
        metrics: result.metrics,
        filterSummary: {
          adsFiltered: result.metrics.filteredAdsCount,
          shortsFiltered: result.metrics.filteredShortsCount,
          includingAds: result.metrics.includingAds,
          includingShorts: result.metrics.includingShorts
        }
      });
    } catch (error) {
      console.error('Error generating sample data:', error);
      return res.status(500).json({ error: 'Failed to generate sample data' });
    }
  }
  
  /**
   * Get raw video entries
   */
  getVideoEntries(req: Request, res: Response) {
    try {
      if (this.lastVideoEntries.length === 0) {
        // If no entries have been uploaded, use sample data
        const includeAds = req.query.includeAds === 'true';
        const includeShorts = req.query.includeShorts === 'true';
        
        const result = ParserService.generateSampleData(includeAds, includeShorts);
        this.lastVideoEntries = result.entries;
        this.lastProcessedMetrics = result.metrics;
        
        return res.status(200).json({
          entries: result.entries
        });
      }
      
      return res.status(200).json({
        entries: this.lastVideoEntries
      });
    } catch (error) {
      console.error('Error retrieving video entries:', error);
      return res.status(500).json({ error: 'Failed to retrieve video entries' });
    }
  }
}

export default new AnalyticsController(); 