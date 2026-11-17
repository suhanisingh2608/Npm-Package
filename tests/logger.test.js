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

  describe('Redaction Integration in Logger', () => {
    it('14. logger.info() redacts sensitive fields from output', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.info('User info:', { password: 'secretPassword123', name: 'Alice' });

      const output = captured.info[0][0];
      assert.equal(output.includes('secretPassword123'), false);
      assert.match(output, /"password":\s*"\[REDACTED\]"/);
      assert.match(output, /"name":\s*"Alice"/);
    });

    it('15. logger.error() redacts sensitive fields from output', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.error('DB Error:', { apiKey: 'key_live_98234', query: 'SELECT 1' });

      const output = captured.error[0][0];
      assert.equal(output.includes('key_live_98234'), false);
      assert.match(output, /"apiKey":\s*"\[REDACTED\]"/);
      assert.match(output, /"query":\s*"SELECT 1"/);
    });

    it('16. logger.debug() redacts sensitive fields from output', () => {
      const logger = createLogger({ level: 'debug', timestamps: false, colors: false });
      logger.debug('Debug payload:', { token: 'jwt_secret_token' });

      const output = captured.debug[0][0];
      assert.equal(output.includes('jwt_secret_token'), false);
      assert.match(output, /"token":\s*"\[REDACTED\]"/);
    });

    it('17. logger.warn() redacts sensitive fields from output', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.warn('Security warning:', { secret: 'topSecretPhrase' });

      const output = captured.warn[0][0];
      assert.equal(output.includes('topSecretPhrase'), false);
      assert.match(output, /"secret":\s*"\[REDACTED\]"/);
    });

    it('18. logger.success() redacts sensitive fields from output', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.success('Auth success:', { authorization: 'Bearer secretAuthToken' });

      const output = captured.log[0][0];
      assert.equal(output.includes('secretAuthToken'), false);
      assert.match(output, /"authorization":\s*"\[REDACTED\]"/);
    });

    it('19. Redaction works when an object is the only argument', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.info({ password: 'lonePassword', service: 'auth' });

      const output = captured.info[0][0];
      assert.equal(output.includes('lonePassword'), false);
      assert.match(output, /"password":\s*"\[REDACTED\]"/);
      assert.match(output, /"service":\s*"auth"/);
    });

    it('20. Redaction works when an object is passed alongside strings and numbers', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.info('Status:', 200, { token: 'myToken' }, 'finished');

      const output = captured.info[0][0];
      assert.equal(output.includes('myToken'), false);
      assert.match(output, /Status: 200/);
      assert.match(output, /"token":\s*"\[REDACTED\]"/);
      assert.match(output, /finished$/);
    });

    it('21. Redaction works with multiple objects in one logging call', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.info(
        { user: 'u1', password: 'p1' },
        { user: 'u2', apiKey: 'k2' }
      );

      const output = captured.info[0][0];
      assert.equal(output.includes('p1'), false);
      assert.equal(output.includes('k2'), false);
      assert.match(output, /"password":\s*"\[REDACTED\]"/);
      assert.match(output, /"apiKey":\s*"\[REDACTED\]"/);
    });

    it('22. Custom redaction fields and custom replacement are honored', () => {
      const logger = createLogger({
        timestamps: false,
        colors: false,
        redact: {
          enabled: true,
          fields: ['creditCard', 'pin'],
          replacement: '<CONFIDENTIAL>'
        }
      });

      logger.info({ creditCard: '1234-5678-9012', pin: 9999, nonSensitive: 'ok' });

      const output = captured.info[0][0];
      assert.equal(output.includes('1234-5678-9012'), false);
      assert.equal(output.includes('9999'), false);
      assert.match(output, /"creditCard":\s*"<CONFIDENTIAL>"/);
      assert.match(output, /"pin":\s*"<CONFIDENTIAL>"/);
      assert.match(output, /"nonSensitive":\s*"ok"/);
    });

    it('23. Disabled redaction preserves original values in output', () => {
      const logger = createLogger({
        timestamps: false,
        colors: false,
        redact: {
          enabled: false
        }
      });

      logger.info({ password: 'unredactedPassword' });

      const output = captured.info[0][0];
      assert.equal(output.includes('unredactedPassword'), true);
      assert.match(output, /"password":\s*"unredactedPassword"/);
    });

    it('24. Filtered-out messages do not leak to output or execute unnecessary formatting', () => {
      const logger = createLogger({ level: 'error' });
      logger.debug({ password: 'debugPassword' });
      logger.info({ password: 'infoPassword' });

      assert.equal(captured.debug.length, 0);
      assert.equal(captured.info.length, 0);
    });

    it('25. Original logged objects are never mutated by the logger', () => {
      const logger = createLogger();
      const originalObj = {
        user: 'alice',
        password: 'rawPassword',
        nested: { token: 'rawToken' }
      };

      const snapshot = JSON.stringify(originalObj);
      logger.info('Logging obj:', originalObj);

      assert.equal(JSON.stringify(originalObj), snapshot);
      assert.equal(originalObj.password, 'rawPassword');
      assert.equal(originalObj.nested.token, 'rawToken');
    });

    it('26. Critical security assertion: captured output never contains cleartext sensitive values', () => {
      const sensitivePassword = 'SUPER_SECRET_VALUE_999!';
      const sensitiveApiKey = 'API_KEY_LIVE_123456789!';
      const sensitiveToken = 'JWT_SECRET_BEARER_9999!';

      const logger = createLogger();

      logger.info('Log entry', {
        credentials: {
          password: sensitivePassword,
          nested: {
            apiKey: sensitiveApiKey,
            list: [{ token: sensitiveToken }]
          }
        }
      });

      const output = captured.info[0][0];
      assert.equal(output.includes(sensitivePassword), false, 'Password must not appear in output');
      assert.equal(output.includes(sensitiveApiKey), false, 'API key must not appear in output');
      assert.equal(output.includes(sensitiveToken), false, 'Token must not appear in output');
    });
  });
});
