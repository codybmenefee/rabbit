'use client';

interface ChannelCount {
  channel: string;
  count: number;
}

interface Metrics {
  totalVideos: number;
  watchTimeMinutes: number;
  channelDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  mostWatchedChannels: ChannelCount[];
  filteredAdsCount: number;
  filteredShortsCount: number;
  includingAds: boolean;
  includingShorts: boolean;
}

interface MetricsDisplayProps {
  metrics: Metrics;
}

export default function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Analytics Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Summary Stats */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Videos</p>
              <p className="text-3xl font-bold text-blue-600">{metrics.totalVideos}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Watch Time</p>
              <p className="text-3xl font-bold text-green-600">{formatTime(metrics.watchTimeMinutes)}</p>
            </div>
          </div>
          
          {/* Filtered Content Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">Content Breakdown:</p>
            <div className="flex justify-between mt-1 text-sm">
              <span>Standard Videos:</span>
              <span className="font-semibold">
                {metrics.totalVideos - 
                  (metrics.includingShorts ? metrics.filteredShortsCount : 0) - 
                  (metrics.includingAds ? metrics.filteredAdsCount : 0)}
              </span>
            </div>
            {metrics.includingShorts && (
              <div className="flex justify-between mt-1 text-sm">
                <span>YouTube Shorts:</span>
                <span className="font-semibold">{metrics.filteredShortsCount}</span>
              </div>
            )}
            {metrics.includingAds && (
              <div className="flex justify-between mt-1 text-sm">
                <span>Advertisements:</span>
                <span className="font-semibold">{metrics.filteredAdsCount}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Most Watched Channels */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Top Channels</h3>
          <ul className="space-y-2">
            {metrics.mostWatchedChannels.map((item, index) => (
              <li key={index} className="flex justify-between items-center">
                <span className="truncate max-w-[70%]">{item.channel}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  {item.count} videos
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Day of Week Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Viewing by Day of Week</h3>
          <div className="grid grid-cols-7 gap-2 text-center">
            {Object.entries(metrics.dayOfWeekDistribution).map(([day, count]) => (
              <div key={day} className="flex flex-col items-center">
                <div 
                  className="w-full bg-purple-100 rounded-t-lg" 
                  style={{ 
                    height: `${Math.max(20, (count / Math.max(1, metrics.totalVideos)) * 200)}px`
                  }}
                ></div>
                <p className="text-xs mt-1">{day.substring(0, 3)}</p>
                <p className="text-sm font-semibold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 