import { createConfig, shouldLog } from './config.js';
import { formatLog } from './formatter.js';

/**
 * Mapping from logger method names to the severity level used for threshold filtering.
 * Note: 'success' uses 'info' severity because success is a display style rather than a separate level.
 * @type {Readonly<Record<string, string>>}
 */
const METHOD_SEVERITY = Object.freeze({
  debug: 'debug',
  info: 'info',
  success: 'info',
  warn: 'warn',
  error: 'error'
});

/**
 * Creates and returns an independent PrettyTrace logger instance.
 *
 * Supported methods:
 * - `logger.debug(...args)`
 * - `logger.info(...args)`
 * - `logger.success(...args)`
 * - `logger.warn(...args)`
 * - `logger.error(...args)`
 *
 * @param {object} [options={}] Configuration options for this logger instance.
 * @returns {object} Logger instance with logging methods.
 */
export function createLogger(options = {}) {
  const config = createConfig(options);

  function log(method, consoleFn, args) {
    const filterLevel = METHOD_SEVERITY[method] || method;

    if (!shouldLog(config.level, filterLevel)) {
      return;
    }

    const formatted = formatLog(method, args, config);
    consoleFn(formatted);
  }

  return {
    debug(...args) {
      log('debug', console.debug, args);
    },
    info(...args) {
      log('info', console.info, args);
    },
    success(...args) {
      log('success', console.log, args);
    },
    warn(...args) {
      log('warn', console.warn, args);
    },
    error(...args) {
      log('error', console.error, args);
    }
  };
}
