import { ParserService } from '../../../../backend/src/services/ParserService';
import { IVideoEntry, ContentType, VideoCategory } from '../../../../backend/src/models/VideoEntry';

describe('ParserService', () => {
  let parserService: ParserService;

  beforeEach(() => {
    parserService = new ParserService();
  });

  describe('parseWatchHistory', () => {
    test('should parse valid YouTube takeout HTML', () => {
      const mockHTML = `
        <html>
          <body>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="header-cell mdl-cell mdl-cell--12-col">
                <p class="mdl-typography--title">YouTube</p>
              </div>
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Never Gonna Give You Up</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseWatchHistory(mockHTML);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const firstEntry = result[0];
      expect(firstEntry.title).toBe('Never Gonna Give You Up');
      expect(firstEntry.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(firstEntry.contentType).toBe(ContentType.Video);
      expect(firstEntry.watchedAt).toBeInstanceOf(Date);
    });

    test('should handle empty HTML', () => {
      const emptyHTML = '<html><body></body></html>';
      const result = parserService.parseWatchHistory(emptyHTML);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should handle malformed HTML gracefully', () => {
      const malformedHTML = '<div><a href="incomplete';
      const result = parserService.parseWatchHistory(malformedHTML);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should filter out non-YouTube URLs', () => {
      const mockHTML = `
        <html>
          <body>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://example.com/not-youtube">Not YouTube</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://www.youtube.com/watch?v=validVideo">Valid YouTube Video</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseWatchHistory(mockHTML);
      
      expect(result.length).toBe(1);
      expect(result[0].url).toBe('https://www.youtube.com/watch?v=validVideo');
      expect(result[0].title).toBe('Valid YouTube Video');
    });

    test('should parse different YouTube URL formats', () => {
      const mockHTML = `
        <html>
          <body>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://youtu.be/shortId123">Short URL Video</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://www.youtube.com/shorts/shortsId456">YouTube Shorts</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://m.youtube.com/watch?v=mobileId789">Mobile YouTube</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseWatchHistory(mockHTML);
      
      expect(result.length).toBe(3);
      
      // Check that different URL formats are parsed correctly
      const shortUrl = result.find(entry => entry.url.includes('youtu.be'));
      const shortsUrl = result.find(entry => entry.url.includes('/shorts/'));
      const mobileUrl = result.find(entry => entry.url.includes('m.youtube.com'));
      
      expect(shortUrl).toBeDefined();
      expect(shortsUrl).toBeDefined();
      expect(mobileUrl).toBeDefined();
      
      expect(shortUrl?.contentType).toBe(ContentType.Video);
      expect(shortsUrl?.contentType).toBe(ContentType.Short);
      expect(mobileUrl?.contentType).toBe(ContentType.Video);
    });
  });

  describe('parseDate', () => {
    test('should parse standard date format', () => {
      const dateString = 'Oct 25, 2023, 3:45:30 PM PDT';
      const result = parserService.parseDate(dateString);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(9); // October is month 9 (0-indexed)
    });

    test('should handle different timezone formats', () => {
      const testCases = [
        'Oct 25, 2023, 3:45:30 PM PST',
        'Oct 25, 2023, 3:45:30 PM EST',
        'Oct 25, 2023, 3:45:30 PM UTC',
        'Oct 25, 2023, 15:45:30 GMT'
      ];

      testCases.forEach(dateString => {
        const result = parserService.parseDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2023);
      });
    });

    test('should handle invalid date strings gracefully', () => {
      const invalidDates = [
        'invalid date',
        '',
        null,
        undefined,
        'Feb 30, 2023, 3:45:30 PM PDT' // Invalid date
      ];

      invalidDates.forEach(dateString => {
        const result = parserService.parseDate(dateString as any);
        expect(result).toBeInstanceOf(Date);
        // Should return current date or epoch as fallback
      });
    });
  });

  describe('extractTitle', () => {
    test('should extract clean title from anchor tag', () => {
      const html = '<a href="https://youtube.com/watch?v=123">Test Video Title</a>';
      const result = parserService.extractTitle(html);
      expect(result).toBe('Test Video Title');
    });

    test('should handle titles with special characters', () => {
      const html = '<a href="https://youtube.com/watch?v=123">Title with "quotes" & symbols</a>';
      const result = parserService.extractTitle(html);
      expect(result).toBe('Title with "quotes" & symbols');
    });

    test('should trim whitespace from titles', () => {
      const html = '<a href="https://youtube.com/watch?v=123">   Padded Title   </a>';
      const result = parserService.extractTitle(html);
      expect(result).toBe('Padded Title');
    });

    test('should handle empty or missing titles', () => {
      const testCases = [
        '<a href="https://youtube.com/watch?v=123"></a>',
        '<a href="https://youtube.com/watch?v=123">   </a>',
        'No anchor tag here'
      ];

      testCases.forEach(html => {
        const result = parserService.extractTitle(html);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('detectContentType', () => {
    test('should detect YouTube Shorts', () => {
      const shortsUrls = [
        'https://www.youtube.com/shorts/abc123',
        'https://youtube.com/shorts/def456',
        'https://m.youtube.com/shorts/ghi789'
      ];

      shortsUrls.forEach(url => {
        const result = parserService.detectContentType(url);
        expect(result).toBe(ContentType.Short);
      });
    });

    test('should detect regular videos', () => {
      const videoUrls = [
        'https://www.youtube.com/watch?v=abc123',
        'https://youtu.be/def456',
        'https://m.youtube.com/watch?v=ghi789'
      ];

      videoUrls.forEach(url => {
        const result = parserService.detectContentType(url);
        expect(result).toBe(ContentType.Video);
      });
    });

    test('should detect live streams', () => {
      const liveUrls = [
        'https://www.youtube.com/watch?v=abc123&live=1',
        'https://youtube.com/live/def456'
      ];

      liveUrls.forEach(url => {
        const result = parserService.detectContentType(url);
        expect(result).toBe(ContentType.Live);
      });
    });

    test('should default to Video for unknown formats', () => {
      const unknownUrls = [
        'https://www.youtube.com/unknown/abc123',
        'https://youtube.com/embed/def456'
      ];

      unknownUrls.forEach(url => {
        const result = parserService.detectContentType(url);
        expect(result).toBe(ContentType.Video);
      });
    });
  });

  describe('sanitizeData', () => {
    test('should sanitize video entry data', () => {
      const dirtyEntry: Partial<IVideoEntry> = {
        title: '   Title with\u0000control\u001Fchars   ',
        url: 'https://www.youtube.com/watch?v=abc123&extra=params',
        watchedAt: new Date(),
        contentType: ContentType.Video
      };

      const result = parserService.sanitizeData(dirtyEntry as IVideoEntry);
      
      expect(result.title).toBe('Title with control chars');
      expect(result.url).toBe('https://www.youtube.com/watch?v=abc123&extra=params');
      expect(result.contentType).toBe(ContentType.Video);
    });

    test('should handle null and undefined values', () => {
      const entryWithNulls: any = {
        title: null,
        url: 'https://www.youtube.com/watch?v=abc123',
        watchedAt: undefined,
        contentType: ContentType.Video
      };

      const result = parserService.sanitizeData(entryWithNulls);
      
      expect(result.title).toBe('');
      expect(result.url).toBe('https://www.youtube.com/watch?v=abc123');
      expect(result.watchedAt).toBeInstanceOf(Date);
      expect(result.contentType).toBe(ContentType.Video);
    });
  });

  describe('performance and edge cases', () => {
    test('should handle large HTML files efficiently', () => {
      // Generate a large HTML file with many entries
      const entries = Array.from({ length: 1000 }, (_, i) => `
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            <a href="https://www.youtube.com/watch?v=video${i}">Video ${i}</a><br>
            Oct 25, 2023, 3:45:30 PM PDT
          </div>
        </div>
      `).join('');

      const largeHTML = `<html><body>${entries}</body></html>`;
      
      const startTime = Date.now();
      const result = parserService.parseWatchHistory(largeHTML);
      const endTime = Date.now();
      
      expect(result.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should handle Unicode characters correctly', () => {
      const unicodeHTML = `
        <html>
          <body>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://www.youtube.com/watch?v=unicode123">🎵 音楽 Music Video 🎵</a><br>
                Oct 25, 2023, 3:45:30 PM PDT
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseWatchHistory(unicodeHTML);
      
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('🎵 音楽 Music Video 🎵');
    });

    test('should handle entries with missing timestamps', () => {
      const htmlWithoutTimestamp = `
        <html>
          <body>
            <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
              <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
                <a href="https://www.youtube.com/watch?v=notime123">Video Without Timestamp</a><br>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseWatchHistory(htmlWithoutTimestamp);
      
      expect(result.length).toBe(1);
      expect(result[0].watchedAt).toBeInstanceOf(Date);
    });
  });
});