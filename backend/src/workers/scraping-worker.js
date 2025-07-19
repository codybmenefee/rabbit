"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const cheerio = __importStar(require("cheerio"));
/**
 * High-performance HTML parsing worker
 * Optimized for speed over completeness
 */
function parseVideoDataFast(html, videoId) {
    const data = {};
    try {
        // Strategy 1: Fast ytInitialData extraction (highest priority)
        const ytDataMatch = html.match(/var ytInitialData = ({.+?});/s);
        if (ytDataMatch) {
            try {
                const ytData = JSON.parse(ytDataMatch[1]);
                const videoDetails = ytData?.videoDetails;
                if (videoDetails) {
                    if (videoDetails.title)
                        data.title = sanitizeTitle(videoDetails.title);
                    if (videoDetails.author)
                        data.channelName = videoDetails.author;
                    if (videoDetails.channelId)
                        data.channelId = videoDetails.channelId;
                    if (videoDetails.shortDescription)
                        data.description = videoDetails.shortDescription;
                    if (videoDetails.lengthSeconds)
                        data.duration = parseInt(videoDetails.lengthSeconds);
                    if (videoDetails.viewCount)
                        data.viewCount = parseInt(videoDetails.viewCount);
                    if (videoDetails.keywords)
                        data.tags = videoDetails.keywords;
                    const thumbnail = videoDetails.thumbnail?.thumbnails?.[0]?.url;
                    if (thumbnail)
                        data.thumbnailUrl = thumbnail;
                }
                // Extract publish date from contents
                const contents = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
                if (contents && Array.isArray(contents)) {
                    for (const content of contents) {
                        if (content.videoPrimaryInfoRenderer?.dateText?.simpleText) {
                            data.publishedAt = parsePublishDate(content.videoPrimaryInfoRenderer.dateText.simpleText);
                            break;
                        }
                    }
                }
            }
            catch (parseError) {
                // Continue to fallback strategies
            }
        }
        // Strategy 2: Fast regex-based extraction (fallback)
        if (!data.title) {
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
            if (titleMatch)
                data.title = sanitizeTitle(titleMatch[1]);
        }
        if (!data.channelName) {
            const authorMatch = html.match(/<meta itemprop="author" content="([^"]+)"/);
            if (authorMatch)
                data.channelName = authorMatch[1];
        }
        if (!data.description) {
            const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
            if (descMatch)
                data.description = descMatch[1];
        }
        if (!data.thumbnailUrl) {
            const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (thumbMatch)
                data.thumbnailUrl = thumbMatch[1];
        }
        // Strategy 3: JSON-LD extraction (only if duration missing)
        if (!data.duration && html.includes('application/ld+json')) {
            const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
            if (jsonLdMatch) {
                try {
                    const jsonData = JSON.parse(jsonLdMatch[1]);
                    const videoObj = Array.isArray(jsonData) ?
                        jsonData.find(item => item['@type'] === 'VideoObject') :
                        (jsonData['@type'] === 'VideoObject' ? jsonData : null);
                    if (videoObj?.duration) {
                        data.duration = parseDurationText(videoObj.duration);
                    }
                }
                catch (parseError) {
                    // Continue
                }
            }
        }
        return Object.keys(data).length > 0 ? data : null;
    }
    catch (error) {
        console.error(`Worker parsing failed for ${videoId}:`, error);
        return null;
    }
}
/**
 * Full HTML parsing using Cheerio (slower but more comprehensive)
 */
function parseVideoDataComplete(html, videoId) {
    const data = {};
    try {
        const $ = cheerio.load(html);
        // Extract from ytInitialData
        const scriptTags = $('script');
        for (let i = 0; i < scriptTags.length; i++) {
            const scriptContent = $(scriptTags[i]).html();
            if (scriptContent && scriptContent.includes('var ytInitialData')) {
                const match = scriptContent.match(/var ytInitialData = ({.+?});/s);
                if (match) {
                    try {
                        const ytData = JSON.parse(match[1]);
                        const videoDetails = ytData?.videoDetails;
                        if (videoDetails) {
                            if (videoDetails.title)
                                data.title = sanitizeTitle(videoDetails.title);
                            if (videoDetails.author)
                                data.channelName = videoDetails.author;
                            if (videoDetails.channelId)
                                data.channelId = videoDetails.channelId;
                            if (videoDetails.shortDescription)
                                data.description = videoDetails.shortDescription;
                            if (videoDetails.lengthSeconds)
                                data.duration = parseInt(videoDetails.lengthSeconds);
                            if (videoDetails.viewCount)
                                data.viewCount = parseInt(videoDetails.viewCount);
                            if (videoDetails.keywords)
                                data.tags = videoDetails.keywords;
                            const thumbnail = videoDetails.thumbnail?.thumbnails?.[0]?.url;
                            if (thumbnail)
                                data.thumbnailUrl = thumbnail;
                        }
                    }
                    catch (parseError) {
                        // Continue
                    }
                }
                break;
            }
        }
        // Extract from meta tags if data is missing
        if (!data.title)
            data.title = sanitizeTitle($('meta[property="og:title"]').attr('content') || '');
        if (!data.channelName)
            data.channelName = $('meta[itemprop="author"]').attr('content') || '';
        if (!data.description)
            data.description = $('meta[property="og:description"]').attr('content') || '';
        if (!data.thumbnailUrl)
            data.thumbnailUrl = $('meta[property="og:image"]').attr('content') || '';
        // Extract from JSON-LD
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const jsonText = $(element).html();
                if (!jsonText)
                    return;
                const jsonData = JSON.parse(jsonText);
                const objects = Array.isArray(jsonData) ? jsonData : [jsonData];
                for (const obj of objects) {
                    if (obj['@type'] === 'VideoObject') {
                        if (!data.title && obj.name)
                            data.title = sanitizeTitle(obj.name);
                        if (!data.description && obj.description)
                            data.description = obj.description;
                        if (!data.duration && obj.duration)
                            data.duration = parseDurationText(obj.duration);
                        if (!data.publishedAt && obj.uploadDate)
                            data.publishedAt = new Date(obj.uploadDate);
                        if (!data.thumbnailUrl && obj.thumbnailUrl) {
                            data.thumbnailUrl = Array.isArray(obj.thumbnailUrl) ? obj.thumbnailUrl[0] : obj.thumbnailUrl;
                        }
                        if (!data.channelName && obj.author) {
                            if (typeof obj.author === 'string') {
                                data.channelName = obj.author;
                            }
                            else if (obj.author.name) {
                                data.channelName = obj.author.name;
                            }
                        }
                        // Extract interaction statistics
                        if (obj.interactionStatistic) {
                            const stats = Array.isArray(obj.interactionStatistic) ? obj.interactionStatistic : [obj.interactionStatistic];
                            for (const stat of stats) {
                                if (stat.interactionType && stat.userInteractionCount) {
                                    const count = parseInt(stat.userInteractionCount);
                                    if (stat.interactionType.includes('WatchAction') && !data.viewCount) {
                                        data.viewCount = count;
                                    }
                                    else if (stat.interactionType.includes('LikeAction') && !data.likeCount) {
                                        data.likeCount = count;
                                    }
                                    else if (stat.interactionType.includes('CommentAction') && !data.commentCount) {
                                        data.commentCount = count;
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
            catch (parseError) {
                // Continue
            }
        });
        return Object.keys(data).length > 0 ? data : null;
    }
    catch (error) {
        console.error(`Worker complete parsing failed for ${videoId}:`, error);
        return null;
    }
}
/**
 * Utility functions
 */
function sanitizeTitle(title) {
    if (!title)
        return '';
    return title
        .replace(/\s+/g, ' ')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim();
}
function parseDurationText(durationText) {
    if (!durationText)
        return 0;
    // Handle ISO 8601 duration (PT1H2M3S)
    if (durationText.startsWith('PT')) {
        const match = durationText.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
        }
    }
    // Handle time format (1:23:45 or 12:34)
    const timeParts = durationText.split(':').map(part => parseInt(part) || 0);
    if (timeParts.length === 3) {
        return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    }
    else if (timeParts.length === 2) {
        return timeParts[0] * 60 + timeParts[1];
    }
    return 0;
}
function parsePublishDate(dateText) {
    try {
        if (dateText.includes('ago')) {
            const now = new Date();
            const match = dateText.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);
            if (match) {
                const amount = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                switch (unit) {
                    case 'day': return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
                    case 'week': return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
                    case 'month': return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
                    case 'year': return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
                }
            }
        }
        else {
            // Try to parse as regular date
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }
    catch (error) {
        return undefined;
    }
    return undefined;
}
/**
 * Worker message handler
 */
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', (task) => {
        try {
            const startTime = Date.now();
            let result = null;
            if (task.enableFastParsing) {
                // Use fast parsing (regex-based)
                result = parseVideoDataFast(task.html, task.videoId);
            }
            else {
                // Use complete parsing (Cheerio-based)
                result = parseVideoDataComplete(task.html, task.videoId);
            }
            const duration = Date.now() - startTime;
            if (worker_threads_1.parentPort) {
                worker_threads_1.parentPort.postMessage({
                    success: !!result,
                    data: result,
                    duration,
                    videoId: task.videoId
                });
            }
        }
        catch (error) {
            if (worker_threads_1.parentPort) {
                worker_threads_1.parentPort.postMessage({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown worker error',
                    videoId: task.videoId,
                    duration: 0
                });
            }
        }
    });
}
else {
    // Export for use in Piscina
    module.exports = (task) => {
        if (task.enableFastParsing) {
            return parseVideoDataFast(task.html, task.videoId);
        }
        else {
            return parseVideoDataComplete(task.html, task.videoId);
        }
    };
}
