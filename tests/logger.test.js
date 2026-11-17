import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../src/logger.js';
import { createLogger as createLoggerFromIndex } from '../src/index.js';

describe('PrettyTrace Core Logger', () => {
  let captured;
  let originalConsole;

  beforeEach(() => {
    captured = {
      debug: [],
      info: [],
      log: [],
      warn: [],
      error: []
    };

    originalConsole = {
      debug: console.debug,
      info: console.info,
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    console.debug = (...args) => captured.debug.push(args);
    console.info = (...args) => captured.info.push(args);
    console.log = (...args) => captured.log.push(args);
    console.warn = (...args) => captured.warn.push(args);
    console.error = (...args) => captured.error.push(args);
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('1. createLogger() creates a usable logger exported also by index.js', () => {
    assert.equal(typeof createLogger, 'function');
    assert.equal(typeof createLoggerFromIndex, 'function');
    const logger = createLogger();
    assert.equal(typeof logger, 'object');
    assert.notEqual(logger, null);
  });

  it('2. All five methods exist on the logger instance', () => {
    const logger = createLogger();
    assert.equal(typeof logger.debug, 'function');
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.success, 'function');
    assert.equal(typeof logger.warn, 'function');
    assert.equal(typeof logger.error, 'function');
  });

  it('3. Each method accepts multiple arguments', () => {
    const logger = createLogger({ level: 'debug', timestamps: false, colors: false });

    logger.debug('arg1', 'arg2', 3);
    logger.info('arg1', 'arg2', 3);
    logger.success('arg1', 'arg2', 3);
    logger.warn('arg1', 'arg2', 3);
    logger.error('arg1', 'arg2', 3);

    assert.equal(captured.debug[0][0], '[DEBUG] arg1 arg2 3');
    assert.equal(captured.info[0][0], '[INFO] arg1 arg2 3');
    assert.equal(captured.log[0][0], '[SUCCESS] arg1 arg2 3');
    assert.equal(captured.warn[0][0], '[WARN] arg1 arg2 3');
    assert.equal(captured.error[0][0], '[ERROR] arg1 arg2 3');
  });

  it('4. Calls the correct console method for each log level', () => {
    const logger = createLogger({ level: 'debug', timestamps: false, colors: false });

    logger.debug('debug msg');
    assert.equal(captured.debug.length, 1);
    assert.equal(captured.info.length, 0);

    logger.info('info msg');
    assert.equal(captured.info.length, 1);

    logger.success('success msg');
    assert.equal(captured.log.length, 1);

    logger.warn('warn msg');
    assert.equal(captured.warn.length, 1);

    logger.error('error msg');
    assert.equal(captured.error.length, 1);
  });

  it('5. Correct severity filtering works for every configured level', () => {
    // Level: debug -> debug, info, success, warn, error
    const debugLogger = createLogger({ level: 'debug', timestamps: false, colors: false });
    debugLogger.debug('d');
    debugLogger.info('i');
    debugLogger.success('s');
    debugLogger.warn('w');
    debugLogger.error('e');
    assert.equal(captured.debug.length, 1);
    assert.equal(captured.info.length, 1);
    assert.equal(captured.log.length, 1);
    assert.equal(captured.warn.length, 1);
    assert.equal(captured.error.length, 1);

    // Reset captured
    captured.debug = [];
    captured.info = [];
    captured.log = [];
    captured.warn = [];
    captured.error = [];

    // Level: info (default) -> info, success, warn, error (debug filtered out)
    const infoLogger = createLogger({ level: 'info', timestamps: false, colors: false });
    infoLogger.debug('d');
    infoLogger.info('i');
    infoLogger.success('s');
    infoLogger.warn('w');
    infoLogger.error('e');
    assert.equal(captured.debug.length, 0);
    assert.equal(captured.info.length, 1);
    assert.equal(captured.log.length, 1);
    assert.equal(captured.warn.length, 1);
    assert.equal(captured.error.length, 1);

    // Reset captured
    captured.info = [];
    captured.log = [];
    captured.warn = [];
    captured.error = [];

    // Level: warn -> warn, error (debug, info, success filtered out)
    const warnLogger = createLogger({ level: 'warn', timestamps: false, colors: false });
    warnLogger.debug('d');
    warnLogger.info('i');
    warnLogger.success('s');
    warnLogger.warn('w');
    warnLogger.error('e');
    assert.equal(captured.debug.length, 0);
    assert.equal(captured.info.length, 0);
    assert.equal(captured.log.length, 0);
    assert.equal(captured.warn.length, 1);
    assert.equal(captured.error.length, 1);

    // Reset captured
    captured.warn = [];
    captured.error = [];

    // Level: error -> only error (debug, info, success, warn filtered out)
    const errorLogger = createLogger({ level: 'error', timestamps: false, colors: false });
    errorLogger.debug('d');
    errorLogger.info('i');
    errorLogger.success('s');
    errorLogger.warn('w');
    errorLogger.error('e');
    assert.equal(captured.debug.length, 0);
    assert.equal(captured.info.length, 0);
    assert.equal(captured.log.length, 0);
    assert.equal(captured.warn.length, 0);
    assert.equal(captured.error.length, 1);
  });

  it('6. Success follows info-level filtering', () => {
    // When level is 'info', success is visible
    const infoLogger = createLogger({ level: 'info' });
    infoLogger.success('visible');
    assert.equal(captured.log.length, 1);

    // When level is 'warn', success is hidden
    const warnLogger = createLogger({ level: 'warn' });
    warnLogger.success('hidden');
    assert.equal(captured.log.length, 1); // still 1 from previous call
  });

  it('7. Custom configuration is respected', () => {
    const logger = createLogger({
      level: 'debug',
      timestamps: false,
      colors: false
    });

    logger.debug('custom config check');
    assert.equal(captured.debug[0][0], '[DEBUG] custom config check');
  });

  it('8. Two logger instances maintain independent configurations', () => {
    const loggerA = createLogger({ level: 'debug', timestamps: false, colors: false });
    const loggerB = createLogger({ level: 'error', timestamps: false, colors: false });

    loggerA.debug('debug on A');
    loggerB.debug('debug on B');

    assert.equal(captured.debug.length, 1);
    assert.equal(captured.debug[0][0], '[DEBUG] debug on A');
  });

  it('9. Invalid configuration throws validation errors', () => {
    assert.throws(
      () => createLogger({ level: 'invalid_level' }),
      { name: 'RangeError' }
    );
    assert.throws(
      () => createLogger({ colors: 'yes' }),
      { name: 'TypeError' }
    );
  });

  it('10. Original options objects remain unchanged', () => {
    const options = { level: 'debug', colors: false };
    const snapshot = JSON.stringify(options);

    createLogger(options);
    assert.equal(JSON.stringify(options), snapshot);
  });

  it('11. Filtered messages never reach console methods or formatting', () => {
    const errorOnlyLogger = createLogger({ level: 'error' });
    errorOnlyLogger.debug('should be dropped');
    errorOnlyLogger.info('should be dropped');
    errorOnlyLogger.success('should be dropped');
    errorOnlyLogger.warn('should be dropped');

    assert.equal(captured.debug.length, 0);
    assert.equal(captured.info.length, 0);
    assert.equal(captured.log.length, 0);
    assert.equal(captured.warn.length, 0);
    assert.equal(captured.error.length, 0);
  });

  it('12. Each call produces exactly one console invocation with one formatted string', () => {
    const logger = createLogger({ level: 'info' });
    logger.info('single', 'invocation', { a: 1 });

    assert.equal(captured.info.length, 1);
    assert.equal(captured.info[0].length, 1);
    assert.equal(typeof captured.info[0][0], 'string');
  });

  it('13. All logger methods return undefined', () => {
    const logger = createLogger({ level: 'debug' });

    assert.equal(logger.debug('msg'), undefined);
    assert.equal(logger.info('msg'), undefined);
    assert.equal(logger.success('msg'), undefined);
    assert.equal(logger.warn('msg'), undefined);
    assert.equal(logger.error('msg'), undefined);
  });
});
