'use client';

import { useState } from 'react';

interface FilterControlsProps {
  apiBaseUrl: string;
  onFiltersUpdated: (data: any) => void;
  onError: (error: string) => void;
  initialFilters: {
    includingAds: boolean;
    includingShorts: boolean;
    adsFiltered: number;
    shortsFiltered: number;
  };
}

export default function FilterControls({
  apiBaseUrl,
  onFiltersUpdated,
  onError,
  initialFilters,
}: FilterControlsProps) {
  const [includingAds, setIncludingAds] = useState(initialFilters.includingAds);
  const [includingShorts, setIncludingShorts] = useState(initialFilters.includingShorts);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/analytics/filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeAds: includingAds,
          includeShorts: includingShorts,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update filters');
      }
      
      const data = await response.json();
      onFiltersUpdated(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error updating filters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mb-6 bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Content Filters</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="flex items-center mr-8">
              <input
                type="checkbox"
                id="includeAds"
                checked={includingAds}
                onChange={() => setIncludingAds(!includingAds)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="includeAds">Include Advertisements</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeShorts"
                checked={includingShorts}
                onChange={() => setIncludingShorts(!includingShorts)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="includeShorts">Include YouTube Shorts</label>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Excluded content: {initialFilters.adsFiltered} ads and {initialFilters.shortsFiltered} shorts
          </div>
        </div>
        
        <button
          onClick={handleFilterChange}
          disabled={loading}
          className="bg-blue-500 text-white py-2 px-4 rounded disabled:bg-blue-300"
        >
          {loading ? 'Updating...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
} 