import React, { useState, useEffect } from 'react';
import './LLMScrapingDemo.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const LLMScrapingDemo = () => {
  const [serviceStatus, setServiceStatus] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  const [scrapingResults, setScrapingResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [videoIds, setVideoIds] = useState('dQw4w9WgXcQ\nL_jWHffIx5E');
  const [provider, setProvider] = useState('anthropic');
  const [batchSize, setBatchSize] = useState(10);
  const [costLimit, setCostLimit] = useState(1.0);

  useEffect(() => {
    checkServiceHealth();
    loadConfiguration();
    loadMetrics();
  }, []);

  const makeRequest = async (endpoint, method = 'GET', body = null) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: Request failed`);
    }

    return data;
  };

  const checkServiceHealth = async () => {
    try {
      const result = await makeRequest('/api/llm-scraping/health');
      setServiceStatus(result);
    } catch (error) {
      setServiceStatus({ success: false, error: error.message });
    }
  };

  const loadConfiguration = async () => {
    try {
      const result = await makeRequest('/api/llm-scraping/config');
      setConfiguration(result.data);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const result = await makeRequest('/api/llm-scraping/metrics');
      setMetrics(result.data.metrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const estimateCost = async () => {
    try {
      setLoading(true);
      setError(null);

      const videoIdList = videoIds.split('\n').filter(id => id.trim());
      const result = await makeRequest('/api/llm-scraping/estimate-cost', 'POST', {
        videoCount: videoIdList.length,
        provider: provider
      });

      setCostEstimate(result.data.estimates);
    } catch (error) {
      setError(`Cost estimation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runScraping = async () => {
    try {
      setLoading(true);
      setError(null);
      setScrapingResults(null);

      const videoIdList = videoIds.split('\n').filter(id => id.trim());

      const result = await makeRequest('/api/llm-scraping/batch-scrape', 'POST', {
        videoIds: videoIdList,
        batchSize: batchSize,
        costLimit: costLimit,
        provider: provider
      });

      setScrapingResults(result.data);
      
      // Refresh metrics after scraping
      await loadMetrics();
    } catch (error) {
      setError(`Scraping failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    try {
      await makeRequest('/api/llm-scraping/metrics/reset', 'POST');
      await loadMetrics();
    } catch (error) {
      setError(`Failed to reset metrics: ${error.message}`);
    }
  };

  const isServiceAvailable = serviceStatus?.success === true;

  return (
    <div className="llm-scraping-demo">
      <div className="demo-header">
        <h1>🤖 LLM-Enhanced YouTube Scraping</h1>
        <p>AI-powered video data extraction using Claude or GPT</p>
      </div>

      {/* Service Status */}
      <div className={`status-card ${isServiceAvailable ? 'status-healthy' : 'status-error'}`}>
        <h3>🏥 Service Status</h3>
        {serviceStatus ? (
          <div>
            {isServiceAvailable ? (
              <div className="status-healthy">
                ✅ Service is running
                {serviceStatus.metrics && (
                  <div className="status-metrics">
                    <span>Success Rate: {serviceStatus.metrics.successRate?.toFixed(1)}%</span>
                    <span>Total Cost: ${serviceStatus.metrics.totalCost?.toFixed(4)}</span>
                    <span>Cache Hit Rate: {serviceStatus.metrics.cacheHitRate?.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="status-error">
                ❌ Service unavailable: {serviceStatus.error}
              </div>
            )}
          </div>
        ) : (
          <div>🔄 Checking status...</div>
        )}
      </div>

      {!isServiceAvailable && (
        <div className="setup-instructions">
          <h3>⚙️ Setup Instructions</h3>
          <ol>
            <li>Set <code>LLM_SCRAPING_ENABLED=true</code> in your .env file</li>
            <li>Add your API key: <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code></li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}

      {isServiceAvailable && (
        <>
          {/* Configuration */}
          {configuration && (
            <div className="config-card">
              <h3>⚙️ Configuration</h3>
              <div className="config-grid">
                <div>
                  <strong>Providers:</strong>
                  <ul>
                    {configuration.providers.map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Recommendations:</strong>
                  <ul>
                    <li>Batch Size: {configuration.recommendations.batchSize}</li>
                    <li>Daily Budget: ${configuration.recommendations.dailyBudget}</li>
                    <li>Max Cost/Video: ${configuration.recommendations.maxCostPerVideo}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Current Metrics */}
          {metrics && (
            <div className="metrics-card">
              <h3>📊 Current Metrics</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-value">{metrics.totalRequests}</span>
                  <span className="metric-label">Total Requests</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{metrics.successfulRequests}</span>
                  <span className="metric-label">Successful</span>
                </div>
                <div className="metric">
                  <span className="metric-value">${metrics.totalCost?.toFixed(4)}</span>
                  <span className="metric-label">Total Cost</span>
                </div>
                <div className="metric">
                  <span className="metric-value">${metrics.costPerVideo?.toFixed(4)}</span>
                  <span className="metric-label">Cost/Video</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{metrics.totalTokensUsed?.toLocaleString()}</span>
                  <span className="metric-label">Tokens Used</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{metrics.cacheHitRate?.toFixed(1)}%</span>
                  <span className="metric-label">Cache Hit Rate</span>
                </div>
              </div>
              <button onClick={resetMetrics} className="reset-button">
                🔄 Reset Metrics
              </button>
            </div>
          )}

          {/* Scraping Configuration */}
          <div className="scraping-config">
            <h3>🔧 Scraping Configuration</h3>
            
            <div className="form-group">
              <label>Video IDs (one per line):</label>
              <textarea
                value={videoIds}
                onChange={(e) => setVideoIds(e.target.value)}
                placeholder="dQw4w9WgXcQ&#10;L_jWHffIx5E"
                rows="5"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Provider:</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Batch Size:</label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  min="1"
                  max="50"
                />
              </div>

              <div className="form-group">
                <label>Cost Limit ($):</label>
                <input
                  type="number"
                  value={costLimit}
                  onChange={(e) => setCostLimit(parseFloat(e.target.value))}
                  step="0.10"
                  min="0.10"
                  max="100"
                />
              </div>
            </div>

            <div className="action-buttons">
              <button 
                onClick={estimateCost} 
                disabled={loading}
                className="estimate-button"
              >
                💰 Estimate Cost
              </button>
              
              <button 
                onClick={runScraping} 
                disabled={loading}
                className="scrape-button"
              >
                🚀 Start Scraping
              </button>
            </div>
          </div>

          {/* Cost Estimate */}
          {costEstimate && (
            <div className="cost-estimate">
              <h3>💰 Cost Estimate</h3>
              <div className="estimate-grid">
                <div>Total Cost: ${costEstimate.totalCost}</div>
                <div>Cost per Video: ${costEstimate.costPerVideo}</div>
                <div>Total Tokens: {costEstimate.totalTokens?.toLocaleString()}</div>
                <div>Estimated Time: {costEstimate.estimatedTimeMinutes} minutes</div>
                <div>Daily Budget Videos: {costEstimate.dailyBudgetVideos}</div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Processing videos...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}

          {/* Results */}
          {scrapingResults && (
            <div className="results">
              <h3>📋 Scraping Results</h3>
              
              <div className="summary">
                <h4>Summary</h4>
                <div className="summary-grid">
                  <div>Total Videos: {scrapingResults.summary.totalVideos}</div>
                  <div>Processed: {scrapingResults.summary.processedVideos}</div>
                  <div>Successful: {scrapingResults.summary.successfulVideos}</div>
                  <div>Success Rate: {scrapingResults.summary.successRate?.toFixed(1)}%</div>
                  <div>Total Cost: ${scrapingResults.summary.totalCost?.toFixed(4)}</div>
                  <div>Avg Cost/Video: ${scrapingResults.summary.averageCostPerVideo?.toFixed(4)}</div>
                </div>
                {scrapingResults.summary.costLimitReached && (
                  <div className="warning">⚠️ Cost limit was reached during processing</div>
                )}
              </div>

              <div className="video-results">
                <h4>Video Details</h4>
                {scrapingResults.results.slice(0, 10).map((video, index) => (
                  <div key={video.videoId} className={`video-result ${video.success ? 'success' : 'failed'}`}>
                    <div className="video-header">
                      <span className="video-index">#{index + 1}</span>
                      <span className="video-id">{video.videoId}</span>
                      <span className="video-status">
                        {video.success ? '✅' : '❌'}
                      </span>
                    </div>
                    
                    {video.success && video.data ? (
                      <div className="video-data">
                        <div><strong>Title:</strong> {video.data.title || 'N/A'}</div>
                        <div><strong>Channel:</strong> {video.data.channelName || 'N/A'}</div>
                        <div><strong>Views:</strong> {video.data.viewCount?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Duration:</strong> {video.data.duration ? `${video.data.duration}s` : 'N/A'}</div>
                        <div><strong>Cost:</strong> ${video.cost?.toFixed(4)}</div>
                        <div><strong>Tokens:</strong> {video.tokensUsed}</div>
                      </div>
                    ) : (
                      <div className="video-error">
                        Error: {video.error}
                      </div>
                    )}
                  </div>
                ))}
                
                {scrapingResults.results.length > 10 && (
                  <div className="results-truncated">
                    ... and {scrapingResults.results.length - 10} more results
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LLMScrapingDemo;