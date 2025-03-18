import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analyticsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow both default Next.js ports
  methods: ['GET', 'POST'],
  credentials: true
}));

// Increase limit for large HTML files and set timeout
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    // Add request timeout handling
    req.setTimeout(60000); // 60 second timeout
  }
}));

// Root route - used for connection testing
app.get('/', (req, res) => {
  res.send('YouTube Watch History Analytics API is running!');
});

// API routes
app.use('/api/analytics', analyticsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; // Export for testing 