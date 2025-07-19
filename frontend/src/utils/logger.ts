type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  correlationId?: string;
  category?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
  enablePerformance: boolean;
  enableUserInteractions: boolean;
  maxLogBuffer: number;
  flushInterval: number;
}

class FrontendLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private correlationId?: string;

  constructor() {
    this.config = {
      level: (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info',
      enableConsole: process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING === 'true',
      enableRemote: process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true',
      remoteEndpoint: process.env.NEXT_PUBLIC_REMOTE_LOG_ENDPOINT,
      apiKey: process.env.NEXT_PUBLIC_LOG_API_KEY,
      enablePerformance: process.env.NEXT_PUBLIC_LOG_PERFORMANCE === 'true',
      enableUserInteractions: process.env.NEXT_PUBLIC_LOG_USER_INTERACTIONS === 'true',
      maxLogBuffer: 100,
      flushInterval: 10000 // 10 seconds
    };

    // Start flush timer if remote logging is enabled
    if (this.config.enableRemote) {
      this.startFlushTimer();
    }

    // Listen for page unload to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4
    };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.config.level);
  }

  private sanitizeMetadata(meta: any): any {
    if (!meta || typeof meta !== 'object') {
      return meta;
    }

    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /authorization/i,
      /cookie/i,
      /session/i,
      /credentials/i
    ];

    const sanitized: any = Array.isArray(meta) ? [] : {};

    for (const [key, value] of Object.entries(meta)) {
      const shouldSanitize = sensitivePatterns.some(pattern => pattern.test(key));
      
      if (shouldSanitize) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private createLogEntry(level: LogLevel, message: string, meta?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta: meta ? this.sanitizeMetadata(meta) : undefined,
      correlationId: this.correlationId,
      category: meta?.category,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: meta?.userId
    };
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${entry.level.toUpperCase()}`;
    const correlationStr = entry.correlationId ? ` [${entry.correlationId}]` : '';
    const logMessage = `${prefix}${correlationStr}: ${entry.message}`;

    const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
    
    if (entry.meta && Object.keys(entry.meta).length > 0) {
      console[consoleMethod as keyof Console](logMessage, entry.meta);
    } else {
      console[consoleMethod as keyof Console](logMessage);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    if (!this.config.enableRemote) return;

    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.maxLogBuffer) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  public clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  private async flush(): Promise<void> {
    if (!this.config.enableRemote || this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (this.config.remoteEndpoint) {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true // Important for beforeunload events
        });
      }
    } catch (error) {
      // Silently fail remote logging to avoid breaking the app
      // Optionally add failed logs back to buffer for retry
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  public trace(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('trace')) return;
    
    const entry = this.createLogEntry('trace', message, meta);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, meta);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, meta);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, meta);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;
    
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };
    
    const entry = this.createLogEntry('error', message, errorMeta);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  // API-specific logging methods
  public logApiCall(method: string, url: string, status?: number, duration?: number, error?: Error): void {
    if (!process.env.NEXT_PUBLIC_LOG_API_CALLS) return;

    const meta = {
      category: 'api_call',
      method,
      url,
      ...(status && { status }),
      ...(duration && { duration: duration + 'ms' }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message
        }
      })
    };

    if (error || (status && status >= 400)) {
      this.error(`API call failed: ${method} ${url}`, error, meta);
    } else {
      this.debug(`API call: ${method} ${url}`, meta);
    }
  }

  // User interaction logging
  public logUserInteraction(action: string, element?: string, meta?: Record<string, any>): void {
    if (!this.config.enableUserInteractions) return;

    this.debug(`User interaction: ${action}`, {
      category: 'user_interaction',
      action,
      element,
      ...meta
    });
  }

  // Performance logging
  public logPerformance(metric: string, value: number, unit: string = 'ms', meta?: Record<string, any>): void {
    if (!this.config.enablePerformance) return;

    this.debug(`Performance metric: ${metric}`, {
      category: 'performance',
      metric,
      value,
      unit,
      ...meta
    });
  }

  // Component lifecycle logging
  public logComponentMount(componentName: string, props?: Record<string, any>): void {
    this.debug(`Component mounted: ${componentName}`, {
      category: 'component_lifecycle',
      action: 'mount',
      component: componentName,
      props: this.sanitizeMetadata(props)
    });
  }

  public logComponentUnmount(componentName: string): void {
    this.debug(`Component unmounted: ${componentName}`, {
      category: 'component_lifecycle',
      action: 'unmount',
      component: componentName
    });
  }

  // Manual flush method
  public async flushLogs(): Promise<void> {
    await this.flush();
  }

  // Cleanup method
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Performance timing utility for frontend
export class PerformanceTimer {
  private start: number;
  private label: string;
  private logger: FrontendLogger;

  constructor(label: string, logger: FrontendLogger) {
    this.start = performance.now();
    this.label = label;
    this.logger = logger;
    
    this.logger.debug(`⏱️ Starting timer: ${label}`, {
      category: 'performance',
      timerStart: true
    });
  }

  public stage(stageName: string, meta?: Record<string, any>): void {
    const elapsed = performance.now() - this.start;
    this.logger.debug(`⏱️ ${this.label} - ${stageName}`, {
      category: 'performance',
      stage: stageName,
      elapsedMs: Math.round(elapsed),
      timerStage: true,
      ...meta
    });
  }

  public end(meta?: Record<string, any>): number {
    const elapsed = performance.now() - this.start;
    const roundedElapsed = Math.round(elapsed);
    
    this.logger.logPerformance(this.label, roundedElapsed, 'ms', {
      timerEnd: true,
      ...meta
    });
    
    return roundedElapsed;
  }
}

// Error boundary helper
export const logErrorBoundary = (error: Error, errorInfo: any, componentStack?: string) => {
  if (!process.env.NEXT_PUBLIC_ENABLE_ERROR_BOUNDARY_LOGGING) return;

  logger.error('React Error Boundary caught an error', error, {
    category: 'error_boundary',
    componentStack,
    errorInfo: {
      componentStack: errorInfo.componentStack
    }
  });
};

// Create singleton instance
const logger = new FrontendLogger();

// Helper function to create performance timers
export const createTimer = (label: string): PerformanceTimer => {
  return new PerformanceTimer(label, logger);
};

// Export the singleton instance and utilities
export { logger, FrontendLogger, PerformanceTimer };
export default logger;