import request from 'supertest';
import express from 'express';

// Create a mock app for testing
const app = express();
app.get('/', (req, res) => {
  res.send('YouTube Watch History Analytics API is running!');
});

describe('Server API Tests', () => {
  test('Root endpoint should return success message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('YouTube Watch History Analytics API is running!');
  });
}); 