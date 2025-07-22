/**
 * Logger Implementation
 * Implementiert strukturiertes Logging mit mehreren Ausgabezielen
 */

import {
  ILogger,
  LogLevel,
  LogEntry,
  LoggerConfig,
  LogFilter,
  PerformanceMetrics
} from './logger.interface';
import { DatabaseHelper } from '../../utils/database';
import fs from 'fs/promises';
import path from 'path';

export class Logger implements ILogger {
  private config: LoggerConfig;
  private context?: string;
  private userId?: string;
  private sessionId?: string;
  private requestId?: string;
  private performanceTimers: Map<string, Date> = new Map();

  constructor(config: LoggerConfig) {
    this.config = config;
    this.initializeFileLogging();
  }

  // Basic logging methods
  error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  // Context methods
  setContext(context: string): ILogger {
    const logger = this.clone();
    logger.context = context;
    return logger;
  }

  setUserId(userId: string): ILogger {
    const logger = this.clone();
    logger.userId = userId;
    return logger;
  }

  setSessionId(sessionId: string): ILogger {
    const logger = this.clone();
    logger.sessionId = sessionId;
    return logger;
  }

  setRequestId(requestId: string): ILogger {
    const logger = this.clone();
    logger.requestId = requestId;
    return logger;
  }

  // Structured logging methods
  logUserAction(userId: string, action: string, details?: Record<string, any>): void {
    this.log(LogLevel.INFO, `User action: ${action}`, 'user-action', {
      userId,
      action,
      ...details
    });
  }

  logApiRequest(method: string, url: string, userId?: string, duration?: number): void {
    this.log(LogLevel.INFO, `API ${method} ${url}`, 'api-request', {
      method,
      url,
      userId,
      duration
    });
  }

  logDatabaseQuery(query: string, duration: number, error?: Error): void {
    const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
    const message = error ? `Database query failed: ${error.message}` : 'Database query executed';
    
    this.log(level, message, 'database', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      error: error?.message
    });
  }

  logPluginEvent(pluginName: string, event: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, `Plugin event: ${pluginName} - ${event}`, 'plugin', {
      pluginName,
      event,
      ...data
    });
  }

  logError(error: Error, context?: string, userId?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, error.message, context || 'error', {
      errorName: error.name,
      stack: error.stack,
      userId,
      ...metadata
    });
  }

  // Performance logging
  startTimer(label: string): () => void {
    const startTime = new Date();
    this.performanceTimers.set(label, startTime);

    return () => {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      this.performanceTimers.delete(label);

      this.log(LogLevel.DEBUG, `Performance: ${label} completed`, 'performance', {
        label,
        duration,
        startTime,
        endTime
      });
    };
  }

  // Log retrieval
  async getLogs(filters?: LogFilter): Promise<LogEntry[]> {
    if (this.config.enableDatabase) {
      return this.getLogsFromDatabase(filters);
    }
    
    if (this.config.enableFile && this.config.filePath) {
      return this.getLogsFromFile(filters);
    }

    return [];
  }

  // Core logging method
  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: context || this.context,
      metadata,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId
    };

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableFile) {
      this.logToFile(entry);
    }

    if (this.config.enableDatabase) {
      this.logToDatabase(entry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= configLevelIndex;
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const userStr = entry.userId ? `{user:${entry.userId}}` : '';
    const metadataStr = entry.metadata ? JSON.stringify(entry.metadata) : '';

    const logMessage = `${timestamp} ${entry.level.toUpperCase()} ${contextStr}${userStr} ${entry.message} ${metadataStr}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }
  }

  private async logToFile(entry: LogEntry): Promise<void> {
    if (!this.config.filePath) return;

    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.config.filePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO application_logs (
          timestamp, level, message, context, metadata, 
          user_id, session_id, request_id, stack
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await DatabaseHelper.executeQuery(query, [
        entry.timestamp,
        entry.level,
        entry.message,
        entry.context,
        JSON.stringify(entry.metadata || {}),
        entry.userId,
        entry.sessionId,
        entry.requestId,
        entry.stack
      ]);
    } catch (error) {
      console.error('Failed to write to database logs:', error);
    }
  }

  private async getLogsFromDatabase(filters?: LogFilter): Promise<LogEntry[]> {
    try {
      let query = 'SELECT * FROM application_logs WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(filters.level);
      }

      if (filters?.context) {
        query += ` AND context = $${paramIndex++}`;
        params.push(filters.context);
      }

      if (filters?.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters?.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      query += ' ORDER BY timestamp DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await DatabaseHelper.executeQuery(query, params);
      return result.map((row: any) => ({
        timestamp: row.timestamp,
        level: row.level,
        message: row.message,
        context: row.context,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        userId: row.user_id,
        sessionId: row.session_id,
        requestId: row.request_id,
        stack: row.stack
      }));
    } catch (error) {
      console.error('Failed to retrieve logs from database:', error);
      return [];
    }
  }

  private async getLogsFromFile(filters?: LogFilter): Promise<LogEntry[]> {
    if (!this.config.filePath) return [];

    try {
      const content = await fs.readFile(this.config.filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let logs: LogEntry[] = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(log => log !== null);

      // Apply filters
      if (filters?.level) {
        logs = logs.filter(log => log.level === filters.level);
      }

      if (filters?.context) {
        logs = logs.filter(log => log.context === filters.context);
      }

      if (filters?.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }

      if (filters?.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate!);
      }

      if (filters?.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate!);
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      if (filters?.offset) {
        logs = logs.slice(filters.offset);
      }

      if (filters?.limit) {
        logs = logs.slice(0, filters.limit);
      }

      return logs;
    } catch (error) {
      console.error('Failed to read logs from file:', error);
      return [];
    }
  }

  private async initializeFileLogging(): Promise<void> {
    if (!this.config.enableFile || !this.config.filePath) return;

    try {
      const logDir = path.dirname(this.config.filePath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  private clone(): Logger {
    const logger = new Logger(this.config);
    logger.context = this.context;
    logger.userId = this.userId;
    logger.sessionId = this.sessionId;
    logger.requestId = this.requestId;
    return logger;
  }
}

// Singleton instance
let loggerInstance: ILogger;

export function createLogger(config: LoggerConfig): ILogger {
  loggerInstance = new Logger(config);
  return loggerInstance;
}

export function getLogger(): ILogger {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call createLogger first.');
  }
  return loggerInstance;
}
