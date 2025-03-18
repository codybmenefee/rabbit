import express from 'express';
import AnalyticsController from '../controllers/AnalyticsController';

const router = express.Router();

// Upload watch history file
router.post('/upload', AnalyticsController.uploadFile.bind(AnalyticsController));

// Get metrics
router.get('/metrics', AnalyticsController.getMetrics.bind(AnalyticsController));

// Update filter settings
router.post('/filters', AnalyticsController.updateFilters.bind(AnalyticsController));

// Get sample data for demonstration
router.get('/sample', AnalyticsController.getSampleData.bind(AnalyticsController));

// Get raw video entries
router.get('/entries', AnalyticsController.getVideoEntries.bind(AnalyticsController));

export default router; 