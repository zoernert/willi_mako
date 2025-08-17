"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};
class Logger {
    constructor() {
        var _a;
        const envLevel = ((_a = process.env.LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'INFO';
        this.currentLevel = LOG_LEVELS[envLevel] || LOG_LEVELS.INFO;
    }
    log(level, message, ...args) {
        if (LOG_LEVELS[level] >= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level}]`;
            switch (level) {
                case 'DEBUG':
                    console.debug(prefix, message, ...args);
                    break;
                case 'INFO':
                    console.info(prefix, message, ...args);
                    break;
                case 'WARN':
                    console.warn(prefix, message, ...args);
                    break;
                case 'ERROR':
                    console.error(prefix, message, ...args);
                    break;
            }
        }
    }
    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }
    info(message, ...args) {
        this.log('INFO', message, ...args);
    }
    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }
    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map