import express from 'express';
import AnalyticsController from '../controllers/AnalyticsController';

const router = express.Router();

// Upload and process watch history file
router.post('/upload', AnalyticsController.uploadFile.bind(AnalyticsController));

// Get processed metrics for a session
router.get('/metrics', AnalyticsController.getMetrics.bind(AnalyticsController));

// Get video entries with pagination and filtering
router.get('/entries', AnalyticsController.getVideoEntries.bind(AnalyticsController));

// Update processing settings and reprocess data
router.put('/settings', AnalyticsController.updateSettings.bind(AnalyticsController));

// Get API quota usage information
router.get('/quota', AnalyticsController.getQuotaUsage.bind(AnalyticsController));

// Export data in various formats
router.get('/export', AnalyticsController.exportData.bind(AnalyticsController));

// Legacy routes for backwards compatibility
router.get('/videos', AnalyticsController.getVideoEntries.bind(AnalyticsController)); // Alias for entries
router.post('/filters', AnalyticsController.updateSettings.bind(AnalyticsController)); // Alias for settings

export default router; 