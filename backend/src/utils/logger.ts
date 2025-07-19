import * as winston from 'winston';
import * as path from 'path';
import * as crypto from 'crypto';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
  trace: 'gray'
};

// Add colors to winston
winston.addColors(colors);

// Sensitive data patterns to sanitize
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credentials/i,
  /apikey/i,
  /api_key/i
];

// Function to sanitize sensitive data
const sanitizeData = (obj: any): any => {
  if (!process.env.LOG_SANITIZE_SENSITIVE || process.env.LOG_SANITIZE_SENSITIVE === 'false') {
    return obj;
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const shouldSanitize = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    
    if (shouldSanitize) {
      (sanitized as any)[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeData(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }
  
  return sanitized;
};

// Correlation ID management
let currentCorrelationId: string | null = null;

const generateCorrelationId = (): string => {
  return crypto.randomUUID();
};

const setCorrelationId = (id: string): void => {
  currentCorrelationId = id;
};

const getCorrelationId = (): string | null => {
  return currentCorrelationId;
};

const clearCorrelationId = (): void => {
  currentCorrelationId = null;
};

// Create custom format with structured data support and correlation IDs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Add correlation ID if available and enabled
    const correlationId = process.env.ENABLE_CORRELATION_IDS === 'true' ? getCorrelationId() : null;
    
    // Sanitize metadata
    const sanitizedMeta = sanitizeData(meta);
    
    // Build log object
    const logObject: any = {
      timestamp,
      level,
      message,
      ...(correlationId && { correlationId }),
      ...(Object.keys(sanitizedMeta).length > 0 && { meta: sanitizedMeta })
    };
    
    // Return JSON or formatted string based on LOG_FORMAT
    if (process.env.LOG_FORMAT === 'json') {
      return JSON.stringify(logObject);
    } else {
      let metaString = '';
      if (Object.keys(sanitizedMeta).length > 0) {
        metaString = ' ' + JSON.stringify(sanitizedMeta, null, 0);
      }
      const correlationStr = correlationId ? ` [${correlationId}]` : '';
      return `${timestamp} ${level}:${correlationStr} ${message}${metaString}`;
    }
  })
);

// Create colored format for console
const coloredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Add correlation ID if available and enabled
    const correlationId = process.env.ENABLE_CORRELATION_IDS === 'true' ? getCorrelationId() : null;
    
    // Sanitize metadata
    const sanitizedMeta = sanitizeData(meta);
    
    // Format structured data
    let metaString = '';
    if (Object.keys(sanitizedMeta).length > 0) {
      metaString = ' ' + JSON.stringify(sanitizedMeta, null, 0);
    }
    
    const correlationStr = correlationId ? ` [${correlationId}]` : '';
    return `${timestamp} ${level}:${correlationStr} ${message}${metaString}`;
  })
);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport with colors
  new winston.transports.Console({
    format: coloredFormat
  })
];

// Add file transport based on environment settings
if (process.env.LOG_TO_FILE === 'true' || process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const logDir = path.join(process.cwd(), 'logs');
  
  // Application log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'application.log'),
      format
    })
  );
  
  // Separate error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format
    })
  );
}

// Add monitoring service integrations
// Note: These would require additional packages to be installed
// For now, we'll provide the structure for future implementation

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format,
  transports,
});

// Enhanced performance timing utility
interface PerformanceTimer {
  start: number;
  label: string;
  correlationId: string | null;
  stages: Array<{ name: string; timestamp: number; metadata?: object }>;
  stage: (stageName: string, metadata?: object) => void;
  end: (metadata?: object) => number;
}

const createTimer = (label: string): PerformanceTimer => {
  const start = Date.now();
  const correlationId = getCorrelationId();
  
  logger.debug(`⏱️  Starting timer: ${label}`, {
    timerStart: true,
    correlationId
  });
  
  return {
    start,
    label,
    correlationId,
    stages: [],
    stage: (stageName: string, metadata?: object) => {
      const elapsed = Date.now() - start;
      const timestamp = Date.now();
      
      // Store stage information
      const timer = createTimer as any;
      if (!timer.stages) timer.stages = [];
      timer.stages.push({ name: stageName, timestamp, metadata });
      
      logger.debug(`⏱️  ${label} - ${stageName}`, { 
        elapsedMs: elapsed,
        stage: stageName,
        timerStage: true,
        correlationId,
        ...metadata 
      });
    },
    end: (metadata?: object) => {
      const elapsed = Date.now() - start;
      
      // Check if this is a slow operation
      const slowThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');
      const isSlow = elapsed > slowThreshold;
      
      logger[isSlow ? 'warn' : 'debug'](`⏱️  ${isSlow ? '🐌 SLOW' : 'Completed'}: ${label}`, { 
        totalMs: elapsed,
        totalSeconds: (elapsed / 1000).toFixed(2),
        timerEnd: true,
        isSlow,
        correlationId,
        performance: {
          threshold: slowThreshold,
          actualTime: elapsed,
          slowRatio: elapsed / slowThreshold
        },
        ...metadata 
      });
      
      return elapsed;
    }
  };
};

// Enhanced debugging utilities with better categorization
const debugVideoProcessing = {
  startParsing: (contentLength: number, options: any) => {
    logger.debug('🚀 Starting video processing', {
      htmlContentLength: contentLength,
      options: sanitizeData(options),
      phase: 'PARSE_START',
      category: 'video_processing'
    });
  },
  
  domParsed: (entriesFound: number, selector: string) => {
    logger.debug('📄 DOM parsing completed', {
      entriesFound,
      selectorUsed: selector,
      phase: 'DOM_PARSED',
      category: 'video_processing'
    });
  },
  
  entriesExtracted: (rawCount: number, validCount: number) => {
    const extractionRate = rawCount > 0 ? ((validCount / rawCount) * 100).toFixed(1) : '0';
    
    logger.debug('📝 Entry extraction completed', {
      rawEntriesFound: rawCount,
      validEntriesExtracted: validCount,
      invalidEntriesSkipped: rawCount - validCount,
      extractionSuccessRate: extractionRate + '%',
      phase: 'ENTRIES_EXTRACTED',
      category: 'video_processing'
    });
  },
  
  duplicatesRemoved: (originalCount: number, uniqueCount: number) => {
    const duplicateRate = originalCount > 0 ? (((originalCount - uniqueCount) / originalCount) * 100).toFixed(1) : '0';
    
    logger.debug('🔄 Duplicate removal completed', {
      originalCount,
      uniqueCount,
      duplicatesRemoved: originalCount - uniqueCount,
      duplicateRate: duplicateRate + '%',
      phase: 'DUPLICATES_REMOVED',
      category: 'video_processing'
    });
  },
  
  apiEnrichmentStart: (videoIds: string[], batchCount: number) => {
    logger.debug('🌐 Starting API enrichment', {
      totalVideoIds: videoIds.length,
      batchCount,
      avgBatchSize: videoIds.length / batchCount,
      phase: 'API_ENRICHMENT_START',
      category: 'api_enrichment'
    });
  },
  
  apiBatchProcessed: (batchIndex: number, batchSize: number, successCount: number) => {
    const successRate = batchSize > 0 ? ((successCount / batchSize) * 100).toFixed(1) : '0';
    
    logger.debug('📦 API batch processed', {
      batchIndex: batchIndex + 1,
      batchSize,
      successCount,
      failureCount: batchSize - successCount,
      batchSuccessRate: successRate + '%',
      phase: 'API_BATCH_PROCESSED',
      category: 'api_enrichment'
    });
  },
  
  metricsGeneration: (entryCount: number, metricsTypes: string[]) => {
    logger.debug('📊 Generating metrics', {
      entryCount,
      metricsTypes,
      metricsCount: metricsTypes.length,
      phase: 'METRICS_GENERATION',
      category: 'analytics'
    });
  }
};

// Request logging middleware helper
export const logRequest = (req: any, res: any, next: any) => {
  if (process.env.ENABLE_REQUEST_LOGGING !== 'true') {
    return next();
  }

  const correlationId = generateCorrelationId();
  setCorrelationId(correlationId);
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  const startTime = Date.now();
  
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId,
    category: 'http_request'
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isSlowRequest = duration > parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');
    
    logger[isSlowRequest ? 'warn' : 'http'](`${isSlowRequest ? '🐌 SLOW ' : ''}Request completed`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration + 'ms',
      correlationId,
      isSlow: isSlowRequest,
      category: 'http_response'
    });
    
    // Clear correlation ID after request
    clearCorrelationId();
  });
  
  next();
};

// Database operation logging helper
export const logDatabaseOperation = (operation: string, collection: string, query?: any, options?: any) => {
  if (process.env.LOG_DATABASE_OPERATIONS !== 'true') {
    return;
  }

  logger.debug('Database operation', {
    operation,
    collection,
    query: sanitizeData(query),
    options: sanitizeData(options),
    correlationId: getCorrelationId(),
    category: 'database'
  });
};

// External service call logging helper
export const logExternalServiceCall = (service: string, endpoint: string, method: string, metadata?: any) => {
  if (process.env.LOG_EXTERNAL_SERVICE_CALLS !== 'true') {
    return;
  }

  logger.debug('External service call', {
    service,
    endpoint,
    method,
    correlationId: getCorrelationId(),
    category: 'external_service',
    ...sanitizeData(metadata || {})
  });
};

// Error logging with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    correlationId: getCorrelationId(),
    category: 'error',
    context: sanitizeData(context || {})
  });
};

export { 
  logger, 
  createTimer, 
  debugVideoProcessing,
  sanitizeData,
  generateCorrelationId,
  setCorrelationId,
  getCorrelationId,
  clearCorrelationId
};