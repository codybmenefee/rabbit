import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Create a test app that mimics your actual server setup
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  app.get('/', (req, res) => {
    res.send('YouTube Watch History Analytics API is running!');
  });
  
  return app;
};

describe('API Tests', () => {
  const app = createTestApp();
  
  test('GET / - Root endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('YouTube Watch History Analytics API is running!');
  });
  
  test('Non-existent endpoint returns 404', async () => {
    const response = await request(app).get('/non-existent-endpoint');
    expect(response.status).toBe(404);
  });
  
  // You can add more tests for your actual API endpoints here
}); 