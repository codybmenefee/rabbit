// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/rabbit-test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.YOUTUBE_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Import types for proper typing
import { IVideoEntry, ContentType, VideoCategory } from '../../../backend/src/models/VideoEntry';

// Export common test utilities
export const mockVideoEntry: IVideoEntry = {
  title: 'Test Video Title',
  channel: 'Test Channel',
  channelId: 'UC_test_channel_id',
  videoId: 'dQw4w9WgXcQ',
  watchedAt: new Date('2023-10-25T15:45:30.000Z'),
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  contentType: ContentType.VIDEO,
  category: VideoCategory.ENTERTAINMENT,
  description: 'Test video description',
  duration: 240,
  viewCount: 1000000,
  likeCount: 50000,
  commentCount: 1000,
  publishedAt: new Date('2023-01-01T00:00:00.000Z'),
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  tags: ['test', 'video'],
  enrichedWithAPI: true,
  lastUpdated: new Date('2023-10-25T15:45:30.000Z'),
};

export const mockAnalyticsData = {
  totalVideos: 100,
  totalWatchTime: 86400, // 24 hours in seconds
  averageWatchTime: 864, // 14.4 minutes
  topCategories: [
    { category: 'Entertainment', count: 40, percentage: 40 },
    { category: 'Music', count: 30, percentage: 30 },
    { category: 'Education', count: 20, percentage: 20 },
    { category: 'Gaming', count: 10, percentage: 10 },
  ],
  topChannels: [
    { channelName: 'Test Channel 1', videoCount: 15, totalWatchTime: 7200 },
    { channelName: 'Test Channel 2', videoCount: 12, totalWatchTime: 6000 },
    { channelName: 'Test Channel 3', videoCount: 10, totalWatchTime: 4800 },
  ],
  watchTimeByMonth: [
    { month: '2023-01', totalTime: 28800, videoCount: 40 },
    { month: '2023-02', totalTime: 25200, videoCount: 35 },
    { month: '2023-03', totalTime: 32400, videoCount: 45 },
  ],
};

export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

// Mock external services
export const mockYouTubeAPIResponse = {
  items: [
    {
      id: 'dQw4w9WgXcQ',
      snippet: {
        title: 'Never Gonna Give You Up',
        description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
        channelTitle: 'Rick Astley',
        publishedAt: '2009-10-25T06:57:33Z',
        categoryId: '10', // Music
        thumbnails: {
          default: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' },
        },
      },
      statistics: {
        viewCount: '1337423264',
        likeCount: '14426885',
        commentCount: '3021537',
      },
      contentDetails: {
        duration: 'PT3M33S',
      },
    },
  ],
};

export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  quit: jest.fn(),
};

export const mockMongooseModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  save: jest.fn(),
};

// Helper to create mock HTML for parser tests
export const createMockWatchHistoryHTML = (entries: Array<{
  title: string;
  url: string;
  timestamp: string;
}>) => {
  const entriesHTML = entries.map(entry => `
    <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
        <a href="${entry.url}">${entry.title}</a><br>
        ${entry.timestamp}
      </div>
    </div>
  `).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>YouTube Watch History</title>
      </head>
      <body>
        <div class="header-cell mdl-cell mdl-cell--12-col">
          <p class="mdl-typography--title">YouTube</p>
        </div>
        ${entriesHTML}
      </body>
    </html>
  `;
};

// Timeout helper for async tests
export const withTimeout = <T>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};