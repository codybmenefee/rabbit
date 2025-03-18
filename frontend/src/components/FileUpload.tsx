'use client';

import { useState } from 'react';

interface FileUploadProps {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  apiBaseUrl: string;
}

export default function FileUpload({ onSuccess, onError, apiBaseUrl }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [includeAds, setIncludeAds] = useState(false);
  const [includeShorts, setIncludeShorts] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const fileInput = e.currentTarget.elements.namedItem('file') as HTMLInputElement;
    if (!fileInput?.files?.length) {
      onError('No file selected');
      return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
      onError('Please upload an HTML file');
      return;
    }

    setLoading(true);
    
    try {
      // Read file content
      const fileContent = await readFileAsText(file);
      
      // Send to API
      const response = await fetch(`${apiBaseUrl}/api/analytics/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          htmlContent: fileContent,
          includeAds,
          includeShorts 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process file');
      }
      
      const data = await response.json();
      onSuccess(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };
  
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };
  
  const handleSampleData = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/analytics/sample?includeAds=${includeAds}&includeShorts=${includeShorts}`);
      
      if (!response.ok) {
        throw new Error('Failed to get sample data');
      }
      
      const data = await response.json();
      onSuccess(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error getting sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleFileUpload} className="mb-4">
        <div className="mb-4">
          <label 
            htmlFor="file" 
            className="block w-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-500"
          >
            {fileName ? fileName : 'Click to select HTML file'}
          </label>
          <input 
            type="file" 
            id="file" 
            name="file"
            accept=".html"
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>

        <div className="mb-4 bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Content Filters:</p>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="uploadIncludeAds"
              checked={includeAds}
              onChange={() => setIncludeAds(!includeAds)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="uploadIncludeAds" className="text-sm">Include Advertisements</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="uploadIncludeShorts"
              checked={includeShorts}
              onChange={() => setIncludeShorts(!includeShorts)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="uploadIncludeShorts" className="text-sm">Include YouTube Shorts</label>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            type="submit" 
            disabled={loading || !fileName} 
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded disabled:bg-blue-300"
          >
            {loading ? 'Processing...' : 'Upload'}
          </button>
          <button 
            type="button" 
            onClick={handleSampleData}
            disabled={loading} 
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded disabled:bg-gray-300"
          >
            Use Sample Data
          </button>
        </div>
      </form>
    </div>
  );
} 