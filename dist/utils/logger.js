"use strict";
// Logger utility export
// Re-exports the core logger for easy access
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.getLogger = void 0;
const logger_1 = require("../core/logging/logger");
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return logger_1.getLogger; } });
// Export a default logger instance for convenience
exports.logger = {
    info: (message, ...args) => {
        try {
            const loggerInstance = (0, logger_1.getLogger)();
            loggerInstance.info(message, ...args);
        }
        catch (error) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    error: (message, ...args) => {
        try {
            const loggerInstance = (0, logger_1.getLogger)();
            loggerInstance.error(message, ...args);
        }
        catch (error) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
    warn: (message, ...args) => {
        try {
            const loggerInstance = (0, logger_1.getLogger)();
            loggerInstance.warn(message, ...args);
        }
        catch (error) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    debug: (message, ...args) => {
        try {
            const loggerInstance = (0, logger_1.getLogger)();
            loggerInstance.debug(message, ...args);
        }
        catch (error) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};
//# sourceMappingURL=logger.js.map