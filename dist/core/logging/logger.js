"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const logger_interface_1 = require("./logger.interface");
const database_1 = require("../../utils/database");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class Logger {
    constructor(config) {
        this.performanceTimers = new Map();
        this.config = config;
        this.initializeFileLogging();
    }
    error(message, context, metadata) {
        this.log(logger_interface_1.LogLevel.ERROR, message, context, metadata);
    }
    warn(message, context, metadata) {
        this.log(logger_interface_1.LogLevel.WARN, message, context, metadata);
    }
    info(message, context, metadata) {
        this.log(logger_interface_1.LogLevel.INFO, message, context, metadata);
    }
    debug(message, context, metadata) {
        this.log(logger_interface_1.LogLevel.DEBUG, message, context, metadata);
    }
    setContext(context) {
        const logger = this.clone();
        logger.context = context;
        return logger;
    }
    setUserId(userId) {
        const logger = this.clone();
        logger.userId = userId;
        return logger;
    }
    setSessionId(sessionId) {
        const logger = this.clone();
        logger.sessionId = sessionId;
        return logger;
    }
    setRequestId(requestId) {
        const logger = this.clone();
        logger.requestId = requestId;
        return logger;
    }
    logUserAction(userId, action, details) {
        this.log(logger_interface_1.LogLevel.INFO, `User action: ${action}`, 'user-action', {
            userId,
            action,
            ...details
        });
    }
    logApiRequest(method, url, userId, duration) {
        this.log(logger_interface_1.LogLevel.INFO, `API ${method} ${url}`, 'api-request', {
            method,
            url,
            userId,
            duration
        });
    }
    logDatabaseQuery(query, duration, error) {
        const level = error ? logger_interface_1.LogLevel.ERROR : logger_interface_1.LogLevel.DEBUG;
        const message = error ? `Database query failed: ${error.message}` : 'Database query executed';
        this.log(level, message, 'database', {
            query: query.substring(0, 200),
            duration,
            error: error?.message
        });
    }
    logPluginEvent(pluginName, event, data) {
        this.log(logger_interface_1.LogLevel.INFO, `Plugin event: ${pluginName} - ${event}`, 'plugin', {
            pluginName,
            event,
            ...data
        });
    }
    logError(error, context, userId, metadata) {
        this.log(logger_interface_1.LogLevel.ERROR, error.message, context || 'error', {
            errorName: error.name,
            stack: error.stack,
            userId,
            ...metadata
        });
    }
    startTimer(label) {
        const startTime = new Date();
        this.performanceTimers.set(label, startTime);
        return () => {
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            this.performanceTimers.delete(label);
            this.log(logger_interface_1.LogLevel.DEBUG, `Performance: ${label} completed`, 'performance', {
                label,
                duration,
                startTime,
                endTime
            });
        };
    }
    async getLogs(filters) {
        if (this.config.enableDatabase) {
            return this.getLogsFromDatabase(filters);
        }
        if (this.config.enableFile && this.config.filePath) {
            return this.getLogsFromFile(filters);
        }
        return [];
    }
    log(level, message, context, metadata) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
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
    shouldLog(level) {
        const levels = [logger_interface_1.LogLevel.ERROR, logger_interface_1.LogLevel.WARN, logger_interface_1.LogLevel.INFO, logger_interface_1.LogLevel.DEBUG];
        const configLevelIndex = levels.indexOf(this.config.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= configLevelIndex;
    }
    logToConsole(entry) {
        const timestamp = entry.timestamp.toISOString();
        const contextStr = entry.context ? `[${entry.context}]` : '';
        const userStr = entry.userId ? `{user:${entry.userId}}` : '';
        const metadataStr = entry.metadata ? JSON.stringify(entry.metadata) : '';
        const logMessage = `${timestamp} ${entry.level.toUpperCase()} ${contextStr}${userStr} ${entry.message} ${metadataStr}`;
        switch (entry.level) {
            case logger_interface_1.LogLevel.ERROR:
                console.error(logMessage);
                if (entry.stack) {
                    console.error(entry.stack);
                }
                break;
            case logger_interface_1.LogLevel.WARN:
                console.warn(logMessage);
                break;
            case logger_interface_1.LogLevel.INFO:
                console.info(logMessage);
                break;
            case logger_interface_1.LogLevel.DEBUG:
                console.debug(logMessage);
                break;
        }
    }
    async logToFile(entry) {
        if (!this.config.filePath)
            return;
        try {
            const logLine = JSON.stringify(entry) + '\n';
            await promises_1.default.appendFile(this.config.filePath, logLine);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async logToDatabase(entry) {
        try {
            const query = `
        INSERT INTO application_logs (
          timestamp, level, message, context, metadata, 
          user_id, session_id, request_id, stack
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
            await database_1.DatabaseHelper.executeQuery(query, [
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
        }
        catch (error) {
            console.error('Failed to write to database logs:', error);
        }
    }
    async getLogsFromDatabase(filters) {
        try {
            let query = 'SELECT * FROM application_logs WHERE 1=1';
            const params = [];
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
            const result = await database_1.DatabaseHelper.executeQuery(query, params);
            return result.map((row) => ({
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
        }
        catch (error) {
            console.error('Failed to retrieve logs from database:', error);
            return [];
        }
    }
    async getLogsFromFile(filters) {
        if (!this.config.filePath)
            return [];
        try {
            const content = await promises_1.default.readFile(this.config.filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            let logs = lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter(log => log !== null);
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
                logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate);
            }
            if (filters?.endDate) {
                logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate);
            }
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (filters?.offset) {
                logs = logs.slice(filters.offset);
            }
            if (filters?.limit) {
                logs = logs.slice(0, filters.limit);
            }
            return logs;
        }
        catch (error) {
            console.error('Failed to read logs from file:', error);
            return [];
        }
    }
    async initializeFileLogging() {
        if (!this.config.enableFile || !this.config.filePath)
            return;
        try {
            const logDir = path_1.default.dirname(this.config.filePath);
            await promises_1.default.mkdir(logDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to initialize file logging:', error);
        }
    }
    clone() {
        const logger = new Logger(this.config);
        logger.context = this.context;
        logger.userId = this.userId;
        logger.sessionId = this.sessionId;
        logger.requestId = this.requestId;
        return logger;
    }
}
exports.Logger = Logger;
let loggerInstance;
function createLogger(config) {
    loggerInstance = new Logger(config);
    return loggerInstance;
}
function getLogger() {
    if (!loggerInstance) {
        throw new Error('Logger not initialized. Call createLogger first.');
    }
    return loggerInstance;
}
//# sourceMappingURL=logger.js.map