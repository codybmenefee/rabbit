import { ContentType } from '../models/VideoEntry';
import { logger } from '../utils/logger';

/**
 * Service for classifying YouTube video content types
 */
class ClassifierService {
  /**
   * Determine if a video is an advertisement
   * @param videoData The video data to classify
   * @returns Boolean indicating if the video is an advertisement
   */
  isAdvertisement(videoData: any): boolean {
    logger.debug('Checking if video is advertisement', {
      title: videoData.title?.substring(0, 50) + (videoData.title?.length > 50 ? '...' : ''),
      channel: videoData.channelName?.substring(0, 30) + (videoData.channelName?.length > 30 ? '...' : ''),
      duration: videoData.durationSeconds
    });

    // Check for missing or ad-specific titles
    if (!videoData.title || videoData.title.trim() === '') {
      logger.debug('Classified as advertisement: empty title');
      return true;
    }
    
    if (
      videoData.title.toLowerCase().includes('advertisement') ||
      videoData.title.toLowerCase().includes('ad:') ||
      videoData.title.toLowerCase().includes('sponsored')
    ) {
      logger.debug('Classified as advertisement: title contains ad keywords', {
        title: videoData.title
      });
      return true;
    }
    
    // Check for very short duration (under 30 seconds)
    if (videoData.durationSeconds && videoData.durationSeconds < 30) {
      // Short duration alone isn't definitive, but combined with other factors it's indicative
      if (videoData.isSponsored || videoData.channelName === 'Advertisement') {
        logger.debug('Classified as advertisement: short duration + sponsored/ad channel', {
          duration: videoData.durationSeconds,
          isSponsored: videoData.isSponsored,
          channel: videoData.channelName
        });
        return true;
      }
    }
    
    // Check known advertisement channel patterns
    if (
      videoData.channelName === 'Advertisement' ||
      videoData.channelName === 'Ad Council' ||
      videoData.channelName?.includes('Ads')
    ) {
      logger.debug('Classified as advertisement: ad channel pattern', {
        channel: videoData.channelName
      });
      return true;
    }
    
    logger.debug('Not classified as advertisement');
    return false;
  }

  /**
   * Determine if a video is a YouTube Short
   * @param videoData The video data to classify
   * @returns Boolean indicating if the video is a Short
   */
  isYouTubeShort(videoData: any): boolean {
    logger.debug('Checking if video is YouTube Short', {
      url: videoData.url?.substring(0, 50) + (videoData.url?.length > 50 ? '...' : ''),
      duration: videoData.durationSeconds,
      isVertical: videoData.isVertical,
      isShort: videoData.isShort
    });

    // Check URL pattern
    if (videoData.url && videoData.url.includes('/shorts/')) {
      logger.debug('Classified as YouTube Short: URL contains /shorts/');
      return true;
    }
    
    // Check for typical Shorts duration (60 seconds or less)
    // Note: Regular videos can also be short, so this alone isn't definitive
    if (
      videoData.durationSeconds && 
      videoData.durationSeconds <= 60 &&
      videoData.isVertical // If we have aspect ratio data
    ) {
      logger.debug('Classified as YouTube Short: short duration + vertical format', {
        duration: videoData.durationSeconds,
        isVertical: videoData.isVertical
      });
      return true;
    }
    
    // Check for Shorts-specific metadata markers
    if (videoData.isShort || videoData.format === 'SHORT') {
      logger.debug('Classified as YouTube Short: metadata indicates Short format', {
        isShort: videoData.isShort,
        format: videoData.format
      });
      return true;
    }
    
    logger.debug('Not classified as YouTube Short');
    return false;
  }

  /**
   * Classify a video entry
   * @param videoData The video data to classify
   * @returns The content type classification
   */
  classifyContent(videoData: any): ContentType {
    logger.debug('Starting content classification', {
      title: videoData.title?.substring(0, 50) + (videoData.title?.length > 50 ? '...' : ''),
      url: videoData.url?.substring(0, 50) + (videoData.url?.length > 50 ? '...' : ''),
      duration: videoData.durationSeconds,
      channel: videoData.channelName?.substring(0, 30) + (videoData.channelName?.length > 30 ? '...' : '')
    });

    let classification: ContentType;

    if (this.isAdvertisement(videoData)) {
      classification = ContentType.ADVERTISEMENT;
      logger.debug('Final classification: ADVERTISEMENT');
    } else if (this.isYouTubeShort(videoData)) {
      classification = ContentType.SHORT;
      logger.debug('Final classification: SHORT');
    } else {
      classification = ContentType.STANDARD;
      logger.debug('Final classification: STANDARD');
    }

    logger.debug('Content classification completed', {
      finalType: classification,
      title: videoData.title?.substring(0, 50) + (videoData.title?.length > 50 ? '...' : '')
    });

    return classification;
  }
}

export default new ClassifierService(); 