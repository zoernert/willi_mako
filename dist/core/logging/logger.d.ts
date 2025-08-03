import { ILogger, LogEntry, LoggerConfig, LogFilter } from './logger.interface';
export declare class Logger implements ILogger {
    private config;
    private context?;
    private userId?;
    private sessionId?;
    private requestId?;
    private performanceTimers;
    constructor(config: LoggerConfig);
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
    private log;
    private shouldLog;
    private logToConsole;
    private logToFile;
    private logToDatabase;
    private getLogsFromDatabase;
    private getLogsFromFile;
    private initializeFileLogging;
    private clone;
}
export declare function createLogger(config: LoggerConfig): ILogger;
export declare function getLogger(): ILogger;
//# sourceMappingURL=logger.d.ts.map