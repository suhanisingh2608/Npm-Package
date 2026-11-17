import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../src/logger.js';

describe('PrettyTrace Child Loggers & Contextual Metadata', () => {
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

  describe('Child logger functionality', () => {
    it('1. child() returns a new logger instance', () => {
      const parent = createLogger();
      const child = parent.child({ service: 'api' });

      assert.equal(typeof child, 'object');
      assert.notEqual(child, null);
      assert.notEqual(child, parent);
    });

    it('2. Child supports all five existing logging methods and child()', () => {
      const logger = createLogger().child({ service: 'auth' });

      assert.equal(typeof logger.debug, 'function');
      assert.equal(typeof logger.info, 'function');
      assert.equal(typeof logger.success, 'function');
      assert.equal(typeof logger.warn, 'function');
      assert.equal(typeof logger.error, 'function');
      assert.equal(typeof logger.child, 'function');
    });

    it('3. Child includes persistent context in log output', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      const requestLogger = logger.child({ requestId: 'req-123' });

      requestLogger.info('Request started');

      assert.equal(captured.info.length, 1);
      const out = captured.info[0][0];
      assert.match(out, /Request started/);
      assert.match(out, /"requestId":\s*"req-123"/);
    });

    it('4. Parent logger remains unchanged without child context', () => {
      const parent = createLogger({ timestamps: false, colors: false });
      parent.child({ requestId: 'req-456' });

      parent.info('Parent message');

      const out = captured.info[0][0];
      assert.equal(out, '[INFO] Parent message');
      assert.equal(out.includes('req-456'), false);
    });

    it('5. Child logger can create another child', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const child1 = root.child({ service: 'api' });
      const child2 = child1.child({ requestId: 'req-999' });

      child2.info('Deep child message');

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"api"/);
      assert.match(out, /"requestId":\s*"req-999"/);
    });

    it('6. Nested context is merged correctly', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const serviceLogger = root.child({ service: 'billing', env: 'production' });
      const requestLogger = serviceLogger.child({ requestId: 'req-777', userId: 101 });

      requestLogger.info('Processing payment');

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"billing"/);
      assert.match(out, /"env":\s*"production"/);
      assert.match(out, /"requestId":\s*"req-777"/);
      assert.match(out, /"userId":\s*101/);
    });

    it('7. Child context overrides parent context for conflicting keys', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const parent = root.child({ service: 'api', version: 'v1' });
      const child = parent.child({ service: 'auth-service' });

      child.info('Service check');

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"auth-service"/);
      assert.match(out, /"version":\s*"v1"/);
    });

    it('8. Parent context is not modified by child overrides', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const parent = root.child({ service: 'api' });
      parent.child({ service: 'override-service' });

      parent.info('Parent check');

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"api"/);
      assert.equal(out.includes('override-service'), false);
    });

    it('9. Sibling child loggers remain isolated', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const siblingA = root.child({ requestId: 'sibling-A' });
      const siblingB = root.child({ requestId: 'sibling-B' });

      siblingA.info('Msg A');
      siblingB.info('Msg B');

      const outA = captured.info[0][0];
      const outB = captured.info[1][0];

      assert.match(outA, /"requestId":\s*"sibling-A"/);
      assert.equal(outA.includes('sibling-B'), false);

      assert.match(outB, /"requestId":\s*"sibling-B"/);
      assert.equal(outB.includes('sibling-A'), false);
    });

    it('10. Context object mutation after child creation does not alter stored context', () => {
      const mutableContext = { requestId: 'orig-id', tags: ['init'] };
      const logger = createLogger({ timestamps: false, colors: false });
      const child = logger.child(mutableContext);

      // Mutate original context object
      mutableContext.requestId = 'mutated-id';
      mutableContext.tags.push('polluted');

      child.info('Check isolation');

      const out = captured.info[0][0];
      assert.match(out, /"requestId":\s*"orig-id"/);
      assert.equal(out.includes('mutated-id'), false);
      assert.equal(out.includes('polluted'), false);
    });

    it('11. Empty context or undefined behaves consistently without error', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const child1 = root.child({});
      const child2 = root.child(undefined);
      const child3 = root.child();

      child1.info('Child 1');
      child2.info('Child 2');
      child3.info('Child 3');

      assert.equal(captured.info[0][0], '[INFO] Child 1');
      assert.equal(captured.info[1][0], '[INFO] Child 2');
      assert.equal(captured.info[2][0], '[INFO] Child 3');
    });

    it('12. Invalid context values throw expected TypeError', () => {
      const root = createLogger();

      assert.throws(() => root.child(null), { name: 'TypeError' });
      assert.throws(() => root.child('invalid'), { name: 'TypeError' });
      assert.throws(() => root.child(42), { name: 'TypeError' });
      assert.throws(() => root.child(true), { name: 'TypeError' });
      assert.throws(() => root.child(['array']), { name: 'TypeError' });
    });
  });

  describe('Logging argument compatibility', () => {
    it('13. Context appears when only a message string is supplied', () => {
      const logger = createLogger({ timestamps: false, colors: false }).child({ requestId: 'r1' });
      logger.info('Only string message');

      const out = captured.info[0][0];
      assert.match(out, /\[INFO\] Only string message \{\s*"requestId":\s*"r1"\s*\}/);
    });

    it('14. Context appears when an object is supplied alone', () => {
      const logger = createLogger({ timestamps: false, colors: false }).child({ service: 'orders' });
      logger.info({ orderId: 55 });

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"orders"/);
      assert.match(out, /"orderId":\s*55/);
    });

    it('15. Context appears when a string and object are supplied', () => {
      const logger = createLogger({ timestamps: false, colors: false }).child({ service: 'auth' });
      logger.info('User login', { username: 'suhani' });

      const out = captured.info[0][0];
      assert.match(out, /\[INFO\] User login/);
      assert.match(out, /"service":\s*"auth"/);
      assert.match(out, /"username":\s*"suhani"/);
    });

    it('16. Multiple metadata objects are preserved and combined cleanly', () => {
      const logger = createLogger({ timestamps: false, colors: false }).child({ service: 'api' });
      logger.info('Request done', { status: 200 }, { duration: 145 });

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"api"/);
      assert.match(out, /"status":\s*200/);
      assert.match(out, /"duration":\s*145/);
    });

    it('17. Log-specific metadata does not override persistent context (persistent context takes precedence)', () => {
      const logger = createLogger({ timestamps: false, colors: false }).child({
        service: 'persistent-service',
        requestId: 'req-original'
      });

      // Individual log call attempts to override persistent context
      logger.info('Overriding attempt', {
        service: 'malicious-override',
        requestId: 'req-fake',
        customField: 'valid'
      });

      const out = captured.info[0][0];
      assert.match(out, /"service":\s*"persistent-service"/);
      assert.match(out, /"requestId":\s*"req-original"/);
      assert.match(out, /"customField":\s*"valid"/);
      assert.equal(out.includes('malicious-override'), false);
      assert.equal(out.includes('req-fake'), false);
    });

    it('18. Existing logging argument behavior remains intact across all 5 methods', () => {
      const child = createLogger({ level: 'debug', timestamps: false, colors: false }).child({ env: 'test' });

      child.debug('d', 1);
      child.info('i', true);
      child.success('s', null);
      child.warn('w', undefined);
      child.error('e', 100n);

      assert.match(captured.debug[0][0], /\[DEBUG\] d 1/);
      assert.match(captured.info[0][0], /\[INFO\] i true/);
      assert.match(captured.log[0][0], /\[SUCCESS\] s null/);
      assert.match(captured.warn[0][0], /\[WARN\] w undefined/);
      assert.match(captured.error[0][0], /\[ERROR\] e 100n/);
    });
  });

  describe('Configuration inheritance', () => {
    it('19. Child inherits the parent configured log level', () => {
      const parent = createLogger({ level: 'warn' });
      const child = parent.child({ service: 'api' });

      child.debug('debug hidden');
      child.info('info hidden');
      child.warn('warn visible');

      assert.equal(captured.debug.length, 0);
      assert.equal(captured.info.length, 0);
      assert.equal(captured.warn.length, 1);
    });

    it('20. Child inherits color settings', () => {
      const uncoloredParent = createLogger({ colors: false });
      const uncoloredChild = uncoloredParent.child({ env: 'test' });
      uncoloredChild.info('plain info');

      assert.equal(captured.info[0][0].includes('\x1b['), false);

      const coloredParent = createLogger({ colors: true });
      const coloredChild = coloredParent.child({ env: 'test' });
      coloredChild.info('colored info');

      assert.equal(captured.info[1][0].includes('\x1b['), true);
    });

    it('21. Child inherits timestamp settings', () => {
      const noTimestampParent = createLogger({ timestamps: false, colors: false });
      const noTimestampChild = noTimestampParent.child({ id: 1 });
      noTimestampChild.info('message');

      assert.equal(captured.info[0][0].startsWith('[INFO]'), true);
      assert.doesNotMatch(captured.info[0][0], /^\d{4}-\d{2}-\d{2}/);

      const timestampParent = createLogger({ timestamps: true, colors: false });
      const timestampChild = timestampParent.child({ id: 2 });
      timestampChild.info('message');

      assert.match(captured.info[1][0], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[INFO\]/);
    });

    it('22. Child inherits timestamp format', () => {
      const parent = createLogger({ timestampFormat: '24h' });
      const child = parent.child({ app: 'main' });
      child.info('format test');

      assert.equal(captured.info.length, 1);
    });

    it('23. Child inherits redaction settings', () => {
      const parent = createLogger({
        timestamps: false,
        colors: false,
        redact: {
          enabled: true,
          fields: ['customSecret'],
          replacement: '[SHH]'
        }
      });
      const child = parent.child({ customSecret: 'leakedInContext' });

      child.info('Redaction inherited');

      const out = captured.info[0][0];
      assert.equal(out.includes('leakedInContext'), false);
      assert.match(out, /"customSecret":\s*"\[SHH\]"/);
    });

    it('24. Child configuration remains independent of parent mutation', () => {
      const options = { level: 'debug', colors: false, timestamps: false };
      const parent = createLogger(options);
      const child = parent.child({ service: 'api' });

      // Mutate caller options
      options.level = 'error';

      child.info('Should still log because config was cloned');
      assert.equal(captured.info.length, 1);
    });
  });

  describe('Security and redaction in child loggers', () => {
    it('25. Sensitive values in child context are redacted', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      const child = logger.child({
        service: 'payment',
        password: 'mySuperSecretPassword',
        token: 'auth-token-123'
      });

      child.info('Starting transaction');

      const out = captured.info[0][0];
      assert.equal(out.includes('mySuperSecretPassword'), false);
      assert.equal(out.includes('auth-token-123'), false);
      assert.match(out, /"password":\s*"\[REDACTED\]"/);
      assert.match(out, /"token":\s*"\[REDACTED\]"/);
    });

    it('26. Nested sensitive child-context values are redacted', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      const child = logger.child({
        auth: {
          credentials: {
            apiKey: 'live_secret_key_999'
          }
        }
      });

      child.info('Nested check');

      const out = captured.info[0][0];
      assert.equal(out.includes('live_secret_key_999'), false);
      assert.match(out, /"apiKey":\s*"\[REDACTED\]"/);
    });

    it('27. Custom redaction fields work in child context', () => {
      const logger = createLogger({
        timestamps: false,
        colors: false,
        redact: {
          enabled: true,
          fields: ['ssn', 'taxId'],
          replacement: '[PRIVATE]'
        }
      });
      const child = logger.child({ ssn: '000-11-2222', taxId: '99-8877' });

      child.info('Tax verification');

      const out = captured.info[0][0];
      assert.equal(out.includes('000-11-2222'), false);
      assert.equal(out.includes('99-8877'), false);
      assert.match(out, /"ssn":\s*"\[PRIVATE\]"/);
      assert.match(out, /"taxId":\s*"\[PRIVATE\]"/);
    });

    it('28. Custom replacement strings work in child context', () => {
      const logger = createLogger({
        timestamps: false,
        colors: false,
        redact: {
          enabled: true,
          fields: ['token'],
          replacement: '***HIDDEN***'
        }
      });
      const child = logger.child({ token: 'jwt-xyz' });

      child.info('Auth check');

      const out = captured.info[0][0];
      assert.match(out, /"token":\s*"\*\*\*HIDDEN\*\*\*"/);
    });

    it('29. Nested child context is redacted at every generation', () => {
      const root = createLogger({ timestamps: false, colors: false });
      const child1 = root.child({ password: 'secret1' });
      const child2 = child1.child({ token: 'secret2' });

      child2.info('Generations test');

      const out = captured.info[0][0];
      assert.equal(out.includes('secret1'), false);
      assert.equal(out.includes('secret2'), false);
      assert.match(out, /"password":\s*"\[REDACTED\]"/);
      assert.match(out, /"token":\s*"\[REDACTED\]"/);
    });

    it('30. Original context remains unchanged after logging', () => {
      const context = {
        password: 'rawPassword',
        nested: { token: 'rawToken' }
      };
      const snapshot = JSON.stringify(context);

      const logger = createLogger();
      const child = logger.child(context);

      child.info('Check mutation');

      assert.equal(JSON.stringify(context), snapshot);
      assert.equal(context.password, 'rawPassword');
      assert.equal(context.nested.token, 'rawToken');
    });

    it('31. Critical security assertion: Captured console output never contains sensitive context values', () => {
      const cleartextSensitive = 'TOP_SECRET_CLEAR_TEXT_PASSWD!';
      const logger = createLogger();
      const child = logger.child({ password: cleartextSensitive });

      child.debug(cleartextSensitive);
      child.info('Login event', { user: 'bob', password: cleartextSensitive });
      child.success('Connected', { token: cleartextSensitive });
      child.warn('Warning', { secret: cleartextSensitive });
      child.error('Failure', { apiKey: cleartextSensitive });

      for (const stream of [captured.debug, captured.info, captured.log, captured.warn, captured.error]) {
        for (const callArgs of stream) {
          for (const arg of callArgs) {
            assert.equal(
              typeof arg === 'string' && arg.includes(cleartextSensitive),
              false,
              `Output in stream must not contain: ${cleartextSensitive}`
            );
          }
        }
      }
    });
  });

  describe('Regression tests', () => {
    it('32. Existing createLogger() behavior remains unchanged without child context', () => {
      const logger = createLogger({ timestamps: false, colors: false });
      logger.info('Ordinary log call', { key: 'val' });

      const out = captured.info[0][0];
      assert.match(out, /\[INFO\] Ordinary log call/);
      assert.match(out, /"key":\s*"val"/);
    });

    it('33. Existing log-level filtering still works on root and child loggers', () => {
      const root = createLogger({ level: 'error' });
      const child = root.child({ id: 1 });

      child.info('Hidden info');
      child.error('Visible error');

      assert.equal(captured.info.length, 0);
      assert.equal(captured.error.length, 1);
    });

    it('34. Existing circular-reference formatting still works on child loggers', () => {
      const child = createLogger({ timestamps: false, colors: false }).child({ app: 'circularApp' });
      const cyclic = { name: 'cyclic' };
      cyclic.self = cyclic;

      child.info('Cyclic test', cyclic);

      const out = captured.info[0][0];
      assert.match(out, /"app":\s*"circularApp"/);
      assert.match(out, /"self":\s*"\[Circular\]"/);
    });

    it('35. Existing console dispatch behavior remains unchanged across all levels', () => {
      const child = createLogger({ level: 'debug' }).child({ tag: 'dispatch' });

      child.debug('d');
      child.info('i');
      child.success('s');
      child.warn('w');
      child.error('e');

      assert.equal(captured.debug.length, 1);
      assert.equal(captured.info.length, 1);
      assert.equal(captured.log.length, 1);
      assert.equal(captured.warn.length, 1);
      assert.equal(captured.error.length, 1);
    });
  });
});
