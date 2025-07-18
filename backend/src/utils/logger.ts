import * as winston from 'winston';
import * as path from 'path';

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

// Create custom format with structured data support
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format structured data
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = ' ' + JSON.stringify(meta, null, 0);
    }
    
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Create colored format for console
const coloredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format structured data
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = ' ' + JSON.stringify(meta, null, 0);
    }
    
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport with colors
  new winston.transports.Console({
    format: coloredFormat
  })
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const logDir = path.join(process.cwd(), 'logs');
  
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'debug.log'),
      level: 'debug',
      format
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'all.log'),
      format
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format,
  transports,
});

// Performance timing utility
interface PerformanceTimer {
  start: number;
  label: string;
  stage: (stageName: string, metadata?: object) => void;
  end: (metadata?: object) => number;
}

const createTimer = (label: string): PerformanceTimer => {
  const start = Date.now();
  logger.debug(`⏱️  Starting timer: ${label}`);
  
  return {
    start,
    label,
    stage: (stageName: string, metadata?: object) => {
      const elapsed = Date.now() - start;
      logger.debug(`⏱️  ${label} - ${stageName}`, { 
        elapsedMs: elapsed,
        ...metadata 
      });
    },
    end: (metadata?: object) => {
      const elapsed = Date.now() - start;
      logger.debug(`⏱️  Completed: ${label}`, { 
        totalMs: elapsed,
        totalSeconds: (elapsed / 1000).toFixed(2),
        ...metadata 
      });
      return elapsed;
    }
  };
};

// Debugging utilities
const debugVideoProcessing = {
  startParsing: (contentLength: number, options: any) => {
    logger.debug('🚀 Starting video processing', {
      htmlContentLength: contentLength,
      options,
      phase: 'PARSE_START'
    });
  },
  
  domParsed: (entriesFound: number, selector: string) => {
    logger.debug('📄 DOM parsing completed', {
      entriesFound,
      selectorUsed: selector,
      phase: 'DOM_PARSED'
    });
  },
  
  entriesExtracted: (rawCount: number, validCount: number) => {
    logger.debug('📝 Entry extraction completed', {
      rawEntriesFound: rawCount,
      validEntriesExtracted: validCount,
      invalidEntriesSkipped: rawCount - validCount,
      phase: 'ENTRIES_EXTRACTED'
    });
  },
  
  duplicatesRemoved: (originalCount: number, uniqueCount: number) => {
    logger.debug('🔄 Duplicate removal completed', {
      originalCount,
      uniqueCount,
      duplicatesRemoved: originalCount - uniqueCount,
      phase: 'DUPLICATES_REMOVED'
    });
  },
  
  apiEnrichmentStart: (videoIds: string[], batchCount: number) => {
    logger.debug('🌐 Starting API enrichment', {
      totalVideoIds: videoIds.length,
      batchCount,
      phase: 'API_ENRICHMENT_START'
    });
  },
  
  apiBatchProcessed: (batchIndex: number, batchSize: number, successCount: number) => {
    logger.debug('📦 API batch processed', {
      batchIndex: batchIndex + 1,
      batchSize,
      successCount,
      phase: 'API_BATCH_PROCESSED'
    });
  },
  
  metricsGeneration: (entryCount: number, metricsTypes: string[]) => {
    logger.debug('📊 Generating metrics', {
      entryCount,
      metricsTypes,
      phase: 'METRICS_GENERATION'
    });
  }
};

export { logger, createTimer, debugVideoProcessing };