import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultConfig,
  createConfig,
  validateConfig,
  shouldLog,
  LOG_LEVELS,
  LOG_LEVEL_SEVERITY,
  TIMESTAMP_FORMATS
} from '../src/config.js';

describe('PrettyTrace Configuration Engine', () => {
  describe('1. Default configuration values', () => {
    it('should return expected default values', () => {
      const config = getDefaultConfig();

      assert.deepEqual(config, {
        level: 'info',
        colors: true,
        timestamps: true,
        timestampFormat: '24h',
        redact: {
          enabled: true,
          fields: [
            'password',
            'token',
            'secret',
            'authorization',
            'apiKey'
          ],
          replacement: '[REDACTED]'
        }
      });
    });

    it('should export expected severity order and supported constants', () => {
      assert.equal(LOG_LEVEL_SEVERITY.debug, 10);
      assert.equal(LOG_LEVEL_SEVERITY.info, 20);
      assert.equal(LOG_LEVEL_SEVERITY.warn, 30);
      assert.equal(LOG_LEVEL_SEVERITY.error, 40);
      assert.deepEqual(LOG_LEVELS, ['debug', 'info', 'warn', 'error']);
      assert.deepEqual(TIMESTAMP_FORMATS, ['24h']);
    });
  });

  describe('2. Fresh configuration copies', () => {
    it('calling getDefaultConfig multiple times should return distinct object references', () => {
      const c1 = getDefaultConfig();
      const c2 = getDefaultConfig();

      assert.notEqual(c1, c2);
      assert.notEqual(c1.redact, c2.redact);
      assert.notEqual(c1.redact.fields, c2.redact.fields);

      c1.level = 'error';
      c1.redact.enabled = false;
      c1.redact.fields.push('customField');

      assert.equal(c2.level, 'info');
      assert.equal(c2.redact.enabled, true);
      assert.equal(c2.redact.fields.length, 5);
      assert.equal(c2.redact.fields.includes('customField'), false);
    });

    it('mutating default config returned from getDefaultConfig does not affect future getDefaultConfig or createConfig calls', () => {
      const c1 = getDefaultConfig();
      c1.redact.fields.length = 0;
      c1.redact.replacement = '[MUTATED]';

      const c2 = getDefaultConfig();
      assert.equal(c2.redact.fields.length, 5);
      assert.equal(c2.redact.replacement, '[REDACTED]');

      const c3 = createConfig();
      assert.equal(c3.redact.fields.length, 5);
      assert.equal(c3.redact.replacement, '[REDACTED]');
    });
  });

  describe('3. Custom configuration overrides', () => {
    it('should override top-level properties and keep unspecified defaults', () => {
      const config = createConfig({
        level: 'debug',
        colors: false,
        timestamps: true
      });

      assert.equal(config.level, 'debug');
      assert.equal(config.colors, false);
      assert.equal(config.timestamps, true);
      assert.equal(config.timestampFormat, '24h');
      assert.equal(config.redact.enabled, true);
      assert.equal(config.redact.fields.length, 5);
      assert.equal(config.redact.replacement, '[REDACTED]');
    });

    it('should return complete default config when called with empty options or undefined', () => {
      const c1 = createConfig({});
      const c2 = createConfig();

      assert.deepEqual(c1, getDefaultConfig());
      assert.deepEqual(c2, getDefaultConfig());
    });
  });

  describe('4. Nested redaction configuration merging', () => {
    it('should override redact.enabled without modifying fields or replacement', () => {
      const config = createConfig({
        level: 'debug',
        redact: {
          enabled: false
        }
      });

      assert.deepEqual(config, {
        level: 'debug',
        colors: true,
        timestamps: true,
        timestampFormat: '24h',
        redact: {
          enabled: false,
          fields: [
            'password',
            'token',
            'secret',
            'authorization',
            'apiKey'
          ],
          replacement: '[REDACTED]'
        }
      });
    });

    it('should override redact.fields without modifying enabled or replacement', () => {
      const customFields = ['ssn', 'creditCard'];
      const config = createConfig({
        redact: {
          fields: customFields
        }
      });

      assert.equal(config.redact.enabled, true);
      assert.deepEqual(config.redact.fields, customFields);
      assert.notEqual(config.redact.fields, customFields); // Should be a cloned array
      assert.equal(config.redact.replacement, '[REDACTED]');
    });

    it('should override redact.replacement independently', () => {
      const config = createConfig({
        redact: {
          replacement: '***HIDDEN***'
        }
      });

      assert.equal(config.redact.enabled, true);
      assert.equal(config.redact.replacement, '***HIDDEN***');
      assert.equal(config.redact.fields.length, 5);
    });
  });

  describe('5. Invalid log levels', () => {
    it('should throw RangeError for unsupported log levels', () => {
      for (const invalid of ['verbose', 'critical', 'trace', 'INFO', 'warning']) {
        assert.throws(
          () => createConfig({ level: invalid }),
          {
            name: 'RangeError',
            message: /Invalid log level/
          }
        );
      }
    });

    it('should throw TypeError for non-string log levels', () => {
      for (const invalid of [123, true, {}, null, []]) {
        assert.throws(
          () => createConfig({ level: invalid }),
          {
            name: 'TypeError',
            message: /Log level must be a string/
          }
        );
      }
    });
  });

  describe('6. Invalid boolean settings', () => {
    it('should throw TypeError when colors is not a boolean', () => {
      for (const invalid of ['true', 1, 0, null, {}]) {
        assert.throws(
          () => createConfig({ colors: invalid }),
          {
            name: 'TypeError',
            message: /Property "colors" must be a boolean/
          }
        );
      }
    });

    it('should throw TypeError when timestamps is not a boolean', () => {
      for (const invalid of ['false', 0, 1, null, []]) {
        assert.throws(
          () => createConfig({ timestamps: invalid }),
          {
            name: 'TypeError',
            message: /Property "timestamps" must be a boolean/
          }
        );
      }
    });

    it('should throw TypeError when redact.enabled is not a boolean', () => {
      for (const invalid of ['yes', 1, null, {}]) {
        assert.throws(
          () => createConfig({ redact: { enabled: invalid } }),
          {
            name: 'TypeError',
            message: /Property "redact\.enabled" must be a boolean/
          }
        );
      }
    });
  });

  describe('7. Invalid timestamp formats', () => {
    it('should throw TypeError when timestampFormat is not a string', () => {
      assert.throws(
        () => createConfig({ timestampFormat: 123 }),
        {
          name: 'TypeError',
          message: /Property "timestampFormat" must be a string/
        }
      );
    });

    it('should throw RangeError when timestampFormat is unsupported', () => {
      for (const invalid of ['12h', 'iso', 'unix', 'YYYY-MM-DD']) {
        assert.throws(
          () => createConfig({ timestampFormat: invalid }),
          {
            name: 'RangeError',
            message: /Invalid timestamp format/
          }
        );
      }
    });
  });

  describe('8. Invalid redaction configuration', () => {
    it('should throw TypeError if redact is not an object', () => {
      for (const invalid of ['true', 123, null, []]) {
        assert.throws(
          () => createConfig({ redact: invalid }),
          {
            name: 'TypeError',
            message: /Property "redact" must be a non-null object/
          }
        );
      }
    });

    it('should throw TypeError if redact.fields is not an array', () => {
      assert.throws(
        () => createConfig({ redact: { fields: 'password' } }),
        {
          name: 'TypeError',
          message: /Property "redact\.fields" must be an array/
        }
      );
    });

    it('should throw TypeError if redact.fields contains empty or non-string elements', () => {
      assert.throws(
        () => createConfig({ redact: { fields: ['valid', ''] } }),
        {
          name: 'TypeError',
          message: /must be a non-empty string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { fields: ['valid', '   '] } }),
        {
          name: 'TypeError',
          message: /must be a non-empty string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { fields: ['valid', 123] } }),
        {
          name: 'TypeError',
          message: /must be a non-empty string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { fields: ['valid', null] } }),
        {
          name: 'TypeError',
          message: /must be a non-empty string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { fields: ['valid', '\t\n '] } }),
        {
          name: 'TypeError',
          message: /must be a non-empty string/
        }
      );
    });

    it('should throw TypeError / RangeError if redact.replacement is invalid', () => {
      assert.throws(
        () => createConfig({ redact: { replacement: 123 } }),
        {
          name: 'TypeError',
          message: /Property "redact\.replacement" must be a string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { replacement: '' } }),
        {
          name: 'RangeError',
          message: /Property "redact\.replacement" must be a non-empty string/
        }
      );

      assert.throws(
        () => createConfig({ redact: { replacement: null } }),
        {
          name: 'TypeError',
          message: /Property "redact\.replacement" must be a string/
        }
      );
    });
  });

  describe('9. Unsupported configuration properties and invalid options input', () => {
    it('should throw RangeError for unknown top-level properties', () => {
      assert.throws(
        () => createConfig({ colour: true }),
        {
          name: 'RangeError',
          message: /Unsupported configuration property: "colour"/
        }
      );

      assert.throws(
        () => createConfig({ format: 'json' }),
        {
          name: 'RangeError',
          message: /Unsupported configuration property: "format"/
        }
      );
    });

    it('should throw RangeError for unknown properties within redact', () => {
      assert.throws(
        () => createConfig({ redact: { mask: '*' } }),
        {
          name: 'RangeError',
          message: /Unsupported property in redact configuration: "mask"/
        }
      );
    });

    it('validateConfig and createConfig should reject non-object inputs (null, array, string, number)', () => {
      for (const invalid of [null, 'string', 42, 0, true, false, [1, 2], () => {}]) {
        assert.throws(
          () => validateConfig(invalid),
          {
            name: 'TypeError',
            message: /Configuration options must be a non-null object/
          }
        );
        assert.throws(
          () => createConfig(invalid),
          {
            name: 'TypeError',
            message: /Configuration options must be a non-null object/
          }
        );
      }
    });
  });

  describe('10. Independent configurations for multiple logger instances', () => {
    it('creating loggerA config must not affect loggerB config', () => {
      const loggerA = createConfig({
        level: 'debug',
        colors: true
      });

      const loggerB = createConfig({
        level: 'error',
        colors: false
      });

      assert.equal(loggerA.level, 'debug');
      assert.equal(loggerA.colors, true);

      assert.equal(loggerB.level, 'error');
      assert.equal(loggerB.colors, false);

      loggerA.redact.fields.push('loggerASpecificField');

      assert.equal(loggerB.redact.fields.includes('loggerASpecificField'), false);
    });

    it('clones redact.fields independently between multiple configs', () => {
      const sharedFields = ['token', 'secret'];
      const c1 = createConfig({ redact: { fields: sharedFields } });
      const c2 = createConfig({ redact: { fields: sharedFields } });

      c1.redact.fields.push('c1Only');
      assert.equal(sharedFields.includes('c1Only'), false);
      assert.equal(c2.redact.fields.includes('c1Only'), false);
    });
  });

  describe('11. shouldLog() behavior across all log levels', () => {
    it('should filter correctly when configured level is "debug" (all enabled)', () => {
      assert.equal(shouldLog('debug', 'debug'), true);
      assert.equal(shouldLog('debug', 'info'), true);
      assert.equal(shouldLog('debug', 'warn'), true);
      assert.equal(shouldLog('debug', 'error'), true);
    });

    it('should filter correctly when configured level is "info" (info, warn, error)', () => {
      assert.equal(shouldLog('info', 'debug'), false);
      assert.equal(shouldLog('info', 'info'), true);
      assert.equal(shouldLog('info', 'warn'), true);
      assert.equal(shouldLog('info', 'error'), true);
    });

    it('should filter correctly when configured level is "warn" (warn, error)', () => {
      assert.equal(shouldLog('warn', 'debug'), false);
      assert.equal(shouldLog('warn', 'info'), false);
      assert.equal(shouldLog('warn', 'warn'), true);
      assert.equal(shouldLog('warn', 'error'), true);
    });

    it('should filter correctly when configured level is "error" (only error)', () => {
      assert.equal(shouldLog('error', 'debug'), false);
      assert.equal(shouldLog('error', 'info'), false);
      assert.equal(shouldLog('error', 'warn'), false);
      assert.equal(shouldLog('error', 'error'), true);
    });

    it('should throw RangeError for invalid configuredLevel or messageLevel', () => {
      assert.throws(() => shouldLog('trace', 'info'), {
        name: 'RangeError',
        message: /Invalid configured log level: "trace"/
      });

      assert.throws(() => shouldLog('info', 'verbose'), {
        name: 'RangeError',
        message: /Invalid message log level: "verbose"/
      });

      assert.throws(() => shouldLog('CRITICAL', 'INFO'), {
        name: 'RangeError',
        message: /Invalid configured log level: "CRITICAL"/
      });
    });

    it('should throw TypeError for non-string arguments', () => {
      assert.throws(() => shouldLog(10, 'info'), { name: 'TypeError' });
      assert.throws(() => shouldLog('info', null), { name: 'TypeError' });
      assert.throws(() => shouldLog(undefined, 'warn'), { name: 'TypeError' });
      assert.throws(() => shouldLog('warn', {}), { name: 'TypeError' });
      assert.throws(() => shouldLog('warn', false), { name: 'TypeError' });
    });
  });

  describe('12. Input immutability & validation safety', () => {
    it('createConfig must not mutate user input options or nested objects', () => {
      const userRedact = {
        enabled: true,
        fields: ['apiKey', 'authHeader'],
        replacement: '[SECRET]'
      };
      const userOptions = {
        level: 'warn',
        redact: userRedact
      };

      const originalOptionsSnapshot = JSON.parse(JSON.stringify(userOptions));

      const config = createConfig(userOptions);

      // Verify userOptions was not mutated
      assert.deepEqual(userOptions, originalOptionsSnapshot);

      // Modify created config and verify input was not affected
      config.redact.fields.push('newField');
      assert.equal(userRedact.fields.includes('newField'), false);
    });

    it('validation does not mutate passed in arrays or objects', () => {
      const inputFields = ['apiKey', 'token'];
      const options = {
        redact: {
          fields: inputFields
        }
      };

      validateConfig(options);
      assert.deepEqual(inputFields, ['apiKey', 'token']);
    });
  });

  describe('13. Nested object isolation', () => {
    it('modifying created config does not pollute future createConfig calls', () => {
      const config1 = createConfig({
        redact: {
          fields: ['custom1']
        }
      });
      config1.redact.fields.push('custom2');

      const config2 = createConfig();
      assert.equal(config2.redact.fields.length, 5);
      assert.equal(config2.redact.fields.includes('custom1'), false);
      assert.equal(config2.redact.fields.includes('custom2'), false);
    });
  });
});
