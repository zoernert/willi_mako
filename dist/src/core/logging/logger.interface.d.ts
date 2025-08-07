/**
 * Enhanced Logging System
 * Erweitert das bestehende Error-Handling um strukturierte Logs
 */
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: string;
    metadata?: Record<string, any>;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    stack?: string;
}
export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    enableDatabase: boolean;
    filePath?: string;
    maxFileSize?: number;
    maxFiles?: number;
    dateFormat?: string;
}
export interface ILogger {
    error(message: string, context?: string, metadata?: Record<string, any>): void;
    warn(message: string, context?: string, metadata?: Record<string, any>): void;
    info(message: string, context?: string, metadata?: Record<string, any>): void;
    debug(message: string, context?: string, metadata?: Record<string, any>): void;
    setContext(context: string): ILogger;
    setUserId(userId: string): ILogger;
    setSessionId(sessionId: string): ILogger;
    setRequestId(requestId: string): ILogger;
    logUserAction(userId: string, action: string, details?: Record<string, any>): void;
    logApiRequest(method: string, url: string, userId?: string, duration?: number): void;
    logDatabaseQuery(query: string, duration: number, error?: Error): void;
    logPluginEvent(pluginName: string, event: string, data?: Record<string, any>): void;
    logError(error: Error, context?: string, userId?: string, metadata?: Record<string, any>): void;
    startTimer(label: string): () => void;
    getLogs(filters?: LogFilter): Promise<LogEntry[]>;
}
export interface LogFilter {
    level?: LogLevel;
    context?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
export interface PerformanceMetrics {
    label: string;
    duration: number;
    timestamp: Date;
    context?: string;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=logger.interface.d.ts.map