import { ContentType } from '../models/VideoEntry';

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
    // Check for missing or ad-specific titles
    if (!videoData.title || videoData.title.trim() === '') {
      return true;
    }
    
    if (
      videoData.title.toLowerCase().includes('advertisement') ||
      videoData.title.toLowerCase().includes('ad:') ||
      videoData.title.toLowerCase().includes('sponsored')
    ) {
      return true;
    }
    
    // Check for very short duration (under 30 seconds)
    if (videoData.durationSeconds && videoData.durationSeconds < 30) {
      // Short duration alone isn't definitive, but combined with other factors it's indicative
      if (videoData.isSponsored || videoData.channelName === 'Advertisement') {
        return true;
      }
    }
    
    // Check known advertisement channel patterns
    if (
      videoData.channelName === 'Advertisement' ||
      videoData.channelName === 'Ad Council' ||
      videoData.channelName?.includes('Ads')
    ) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine if a video is a YouTube Short
   * @param videoData The video data to classify
   * @returns Boolean indicating if the video is a Short
   */
  isYouTubeShort(videoData: any): boolean {
    // Check URL pattern
    if (videoData.url && videoData.url.includes('/shorts/')) {
      return true;
    }
    
    // Check for typical Shorts duration (60 seconds or less)
    // Note: Regular videos can also be short, so this alone isn't definitive
    if (
      videoData.durationSeconds && 
      videoData.durationSeconds <= 60 &&
      videoData.isVertical // If we have aspect ratio data
    ) {
      return true;
    }
    
    // Check for Shorts-specific metadata markers
    if (videoData.isShort || videoData.format === 'SHORT') {
      return true;
    }
    
    return false;
  }

  /**
   * Classify a video entry
   * @param videoData The video data to classify
   * @returns The content type classification
   */
  classifyContent(videoData: any): ContentType {
    if (this.isAdvertisement(videoData)) {
      return ContentType.ADVERTISEMENT;
    }
    
    if (this.isYouTubeShort(videoData)) {
      return ContentType.SHORT;
    }
    
    return ContentType.STANDARD;
  }
}

export default new ClassifierService(); 