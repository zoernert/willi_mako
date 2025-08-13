// Logger utility export
// Re-exports the core logger for easy access

import { getLogger } from '../core/logging/logger';

export { getLogger };

// Export a default logger instance for convenience
export const logger = {
  info: (message: string, ...args: any[]) => {
    try {
      const loggerInstance = getLogger();
      loggerInstance.info(message, ...args);
    } catch (error) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    try {
      const loggerInstance = getLogger();
      loggerInstance.error(message, ...args);
    } catch (error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    try {
      const loggerInstance = getLogger();
      loggerInstance.warn(message, ...args);
    } catch (error) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    try {
      const loggerInstance = getLogger();
      loggerInstance.debug(message, ...args);
    } catch (error) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};
