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

describe('Basic API Tests', () => {
  const app = createTestApp();
  
  describe('Health Check', () => {
    test('GET / - Root endpoint returns success', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('YouTube Watch History Analytics API is running!');
    });

    test('Root endpoint returns correct content type', async () => {
      const response = await request(app).get('/');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('Error Handling', () => {
    test('Non-existent endpoint returns 404', async () => {
      const response = await request(app).get('/non-existent-endpoint');
      expect(response.status).toBe(404);
    });

    test('Invalid HTTP method returns 404', async () => {
      const response = await request(app).delete('/');
      expect(response.status).toBe(404);
    });
  });

  describe('CORS Configuration', () => {
    test('Should include CORS headers', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('Should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
    });
  });

  describe('Request Body Parsing', () => {
    test('Should parse JSON request bodies', async () => {
      // Add a test endpoint for JSON parsing
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { test: 'data', number: 123 };
      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });

    test('Should handle malformed JSON gracefully', async () => {
      app.post('/test-bad-json', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-bad-json')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });
});