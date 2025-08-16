interface LogLevel {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private currentLevel: number;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.currentLevel = LOG_LEVELS[envLevel as keyof LogLevel] || LOG_LEVELS.INFO;
  }

  private log(level: keyof LogLevel, message: string, ...args: any[]) {
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

  debug(message: string, ...args: any[]) {
    this.log('DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('ERROR', message, ...args);
  }
}

export const logger = new Logger();
