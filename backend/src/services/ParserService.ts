import { JSDOM } from 'jsdom';
import VideoMetrics from '../models/Metrics';
import { VideoEntry, ContentType } from '../models/VideoEntry';
import ClassifierService from './ClassifierService';

// Define interface for parser results
interface ParseResult {
  metrics: VideoMetrics;
  entries: VideoEntry[];
}

class ParserService {
  /**
   * Parse YouTube watch history HTML file
   */
  parseWatchHistory(htmlContent: string, includeAds: boolean = false, includeShorts: boolean = false): ParseResult {
    console.log('Starting to parse watch history...');
    
    try {
      const { window } = new JSDOM(htmlContent);
      const document = window.document;
      
      // Get all video entries
      const entries = document.querySelectorAll('.outer-cell');
      console.log(`Found ${entries.length} entries to process`);
      
      // Initialize metrics
      const metrics: VideoMetrics = {
        totalVideos: 0,
        watchTimeMinutes: 0,
        channelDistribution: {},
        dayOfWeekDistribution: {
          'Monday': 0,
          'Tuesday': 0,
          'Wednesday': 0,
          'Thursday': 0,
          'Friday': 0,
          'Saturday': 0,
          'Sunday': 0
        },
        mostWatchedChannels: [],
        filteredAdsCount: 0,
        filteredShortsCount: 0,
        includingAds: includeAds,
        includingShorts: includeShorts
      };
      
      // If no entries, return sample data immediately
      if (!entries || entries.length === 0) {
        console.log('No entries found, generating sample data');
        return this.generateSampleData(includeAds, includeShorts);
      }
      
      const videoEntries: VideoEntry[] = [];
      
      // Process limited number of entries to prevent freezing
      const maxEntriesToProcess = Math.min(entries.length, 100); // Limit to 100 entries
      console.log(`Processing up to ${maxEntriesToProcess} entries...`);
      
      for (let i = 0; i < maxEntriesToProcess; i++) {
        const entry = entries[i];
        try {
          // Extract video details
          const contentCell = entry.querySelector('.content-cell');
          if (!contentCell) continue;
          
          const text = contentCell.textContent || '';
          
          // Extract video title (assuming a structure like "Watched: Video Title")
          const titleMatch = text.match(/Watched:\s*(.+?)(?=\son|$)/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Unknown Video';
          
          // Extract channel name
          const channelMatch = text.match(/on\s+(.+?)$/i);
          const channelName = channelMatch ? channelMatch[1].trim() : 'Unknown Channel';
          
          // Extract URL if available
          const linkElement = contentCell.querySelector('a');
          const url = linkElement ? linkElement.href : '';
          
          // Extract date (in a real app, you'd parse the actual date)
          // For this example, we'll use the current date
          const watchDate = new Date();
          
          // Create a video entry object
          const videoData = {
            title,
            channelName,
            url,
            watchDate,
            // In a real implementation, we'd extract more metadata
            durationSeconds: Math.floor(Math.random() * 600), // Mock duration
            isSponsored: false,
            isVertical: Math.random() > 0.7, // Mock aspect ratio (30% are vertical)
          };
          
          // Classify the content
          const contentType = ClassifierService.classifyContent(videoData);
          
          const videoEntry: VideoEntry = {
            title,
            channelName,
            watchDate,
            url,
            durationSeconds: videoData.durationSeconds,
            contentType
          };
          
          // Only count the video if it passes our filters
          let shouldInclude = true;
          
          if (contentType === ContentType.ADVERTISEMENT) {
            metrics.filteredAdsCount++;
            shouldInclude = includeAds;
          } else if (contentType === ContentType.SHORT) {
            metrics.filteredShortsCount++;
            shouldInclude = includeShorts;
          }
          
          if (shouldInclude) {
            // Add to metrics
            metrics.totalVideos++;
            
            // Update channel distribution
            metrics.channelDistribution[channelName] = (metrics.channelDistribution[channelName] || 0) + 1;
            
            // Estimated watch time (based on content type)
            if (contentType === ContentType.SHORT) {
              metrics.watchTimeMinutes += Math.min(1, videoData.durationSeconds / 60); // Shorts are usually less than a minute
            } else if (contentType === ContentType.ADVERTISEMENT) {
              metrics.watchTimeMinutes += 0.5; // Ads are typically 30 seconds
            } else {
              metrics.watchTimeMinutes += videoData.durationSeconds / 60; // Regular videos, use actual duration
            }
            
            // Set day of week (for mock data, let's distribute randomly)
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const randomDay = days[Math.floor(Math.random() * days.length)];
            metrics.dayOfWeekDistribution[randomDay] = metrics.dayOfWeekDistribution[randomDay] + 1;
            
            // Save the entry for potential future use
            videoEntries.push(videoEntry);
          }
        } catch (error) {
          console.error('Error parsing entry:', error);
        }
      }
      
      console.log('Finished processing entries, calculating most watched channels');
      
      // Calculate most watched channels
      metrics.mostWatchedChannels = Object.entries(metrics.channelDistribution)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // If no entries were found or if all were filtered out, create sample data for demo
      if (metrics.totalVideos === 0) {
        console.log('No valid videos after filtering, generating sample data');
        return this.generateSampleData(includeAds, includeShorts);
      }
      
      console.log('Successfully parsed watch history');
      return {
        metrics,
        entries: videoEntries
      };
    } catch (error) {
      console.error('Error in parseWatchHistory:', error);
      // Fall back to sample data on error
      return this.generateSampleData(includeAds, includeShorts);
    }
  }
  
  /**
   * Generate sample data for demonstration purposes
   */
  generateSampleData(includeAds: boolean = false, includeShorts: boolean = false): ParseResult {
    console.log('Generating sample data...');
    const regularVideos = 70;
    const shortsCount = 40;
    const adsCount = 10;
    
    const totalVideos = regularVideos + 
      (includeShorts ? shortsCount : 0) + 
      (includeAds ? adsCount : 0);
    
    const metrics: VideoMetrics = {
      totalVideos,
      watchTimeMinutes: regularVideos * 5 + (includeShorts ? shortsCount * 0.5 : 0) + (includeAds ? adsCount * 0.5 : 0),
      channelDistribution: {
        'Music Channel': 20,
        'Tech Channel': 15,
        'Gaming Channel': 15,
        'Cooking Channel': 10,
        'Educational Channel': 20,
        'Shorts Channel': includeShorts ? 30 : 0,
        'Advertisement': includeAds ? 10 : 0
      },
      dayOfWeekDistribution: {
        'Monday': 10,
        'Tuesday': 15,
        'Wednesday': 20,
        'Thursday': 15,
        'Friday': 25,
        'Saturday': 25,
        'Sunday': 10
      },
      mostWatchedChannels: [
        { channel: 'Music Channel', count: 20 },
        { channel: 'Educational Channel', count: 20 },
        { channel: includeShorts ? 'Shorts Channel' : 'Tech Channel', count: includeShorts ? 30 : 15 },
        { channel: 'Gaming Channel', count: 15 },
        { channel: 'Cooking Channel', count: 10 }
      ],
      filteredAdsCount: adsCount,
      filteredShortsCount: shortsCount,
      includingAds: includeAds,
      includingShorts: includeShorts
    };
    
    // Generate sample video entries
    const sampleEntries: VideoEntry[] = [];
    const channels = ['Music Channel', 'Tech Channel', 'Gaming Channel', 'Cooking Channel', 'Educational Channel', 'Shorts Channel', 'Advertisement'];
    const titles = [
      'How to Build a Website', 'Learning TypeScript', 'React for Beginners', 
      'Delicious Pasta Recipe', 'History of Computing', 'Quick Tutorial', 
      'Product Review', 'Live Concert', 'Gaming Highlights', 'News Update'
    ];
    
    // Current date
    const now = new Date();
    
    // Generate different video entries
    for (let i = 0; i < totalVideos; i++) {
      let contentType = ContentType.STANDARD;
      let channelName = '';
      let durationSeconds = 0;
      
      if (i < regularVideos) {
        // Regular videos
        contentType = ContentType.STANDARD;
        channelName = channels[Math.floor(Math.random() * 5)]; // First 5 channels
        durationSeconds = Math.floor(Math.random() * 900) + 60; // 1-15 minutes
      } else if (i < regularVideos + shortsCount && includeShorts) {
        // Shorts
        contentType = ContentType.SHORT;
        channelName = 'Shorts Channel';
        durationSeconds = Math.floor(Math.random() * 30) + 15; // 15-45 seconds
      } else if (includeAds) {
        // Ads
        contentType = ContentType.ADVERTISEMENT;
        channelName = 'Advertisement';
        durationSeconds = Math.floor(Math.random() * 15) + 5; // 5-20 seconds
      }
      
      if (channelName) { // Only add if we've assigned a channel (respecting includeAds/includeShorts)
        // Random date within the last 30 days
        const date = new Date(now);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        sampleEntries.push({
          title: `${titles[Math.floor(Math.random() * titles.length)]} ${i + 1}`,
          channelName,
          watchDate: date,
          url: `https://youtube.com/watch?v=${Math.random().toString(36).substring(2, 12)}`,
          durationSeconds,
          contentType
        });
      }
    }
    
    return {
      metrics,
      entries: sampleEntries
    };
  }
  
  /**
   * Generate sample entries for the table view
   */
  generateSampleEntries(includeAds: boolean = false, includeShorts: boolean = false): {entries: VideoEntry[]} {
    const result = this.generateSampleData(includeAds, includeShorts);
    return { entries: result.entries };
  }
}

export default new ParserService(); 