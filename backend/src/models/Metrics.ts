interface VideoMetrics {
  totalVideos: number;
  watchTimeMinutes: number;
  channelDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  mostWatchedChannels: { channel: string; count: number }[];
  filteredAdsCount: number;
  filteredShortsCount: number;
  includingAds: boolean;
  includingShorts: boolean;
}

// Default empty metrics
export const emptyMetrics: VideoMetrics = {
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
  includingAds: false,
  includingShorts: false
};

export default VideoMetrics; 