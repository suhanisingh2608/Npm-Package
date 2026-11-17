/**
 * Severity weight mapping for supported log levels.
 * Higher values indicate higher severity.
 * @type {Readonly<Record<string, number>>}
 */
export const LOG_LEVEL_SEVERITY = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
});

/**
 * List of supported log levels.
 * @type {ReadonlyArray<string>}
 */
export const LOG_LEVELS = Object.freeze(Object.keys(LOG_LEVEL_SEVERITY));

/**
 * List of supported timestamp formats.
 * @type {ReadonlyArray<string>}
 */
export const TIMESTAMP_FORMATS = Object.freeze(['24h']);

/**
 * Allowed top-level configuration property keys.
 * @type {ReadonlySet<string>}
 */
const ALLOWED_CONFIG_KEYS = new Set([
  'level',
  'colors',
  'timestamps',
  'timestampFormat',
  'redact'
]);

/**
 * Allowed nested property keys for the redact configuration object.
 * @type {ReadonlySet<string>}
 */
const ALLOWED_REDACT_KEYS = new Set([
  'enabled',
  'fields',
  'replacement'
]);

/**
 * Internal canonical default configuration template.
 */
const BASE_DEFAULT_CONFIG = Object.freeze({
  level: 'info',
  colors: true,
  timestamps: true,
  timestampFormat: '24h',
  redact: Object.freeze({
    enabled: true,
    fields: Object.freeze([
      'password',
      'token',
      'secret',
      'authorization',
      'apiKey'
    ]),
    replacement: '[REDACTED]'
  })
});

/**
 * Returns a fresh, independent copy of the default PrettyTrace configuration.
 * Nested objects and arrays are deeply cloned so modifying the returned object
 * never mutates internal defaults or subsequent calls.
 *
 * @returns {object} Fresh default configuration object.
 */
export function getDefaultConfig() {
  return {
    level: BASE_DEFAULT_CONFIG.level,
    colors: BASE_DEFAULT_CONFIG.colors,
    timestamps: BASE_DEFAULT_CONFIG.timestamps,
    timestampFormat: BASE_DEFAULT_CONFIG.timestampFormat,
    redact: {
      enabled: BASE_DEFAULT_CONFIG.redact.enabled,
      fields: [...BASE_DEFAULT_CONFIG.redact.fields],
      replacement: BASE_DEFAULT_CONFIG.redact.replacement
    }
  };
}

/**
 * Validates configuration options against schema rules and supported values.
 * Throws descriptive TypeError or RangeError on invalid input.
 *
 * @param {object} options Configuration object to validate.
 * @throws {TypeError} If options or any option property is of the incorrect type.
 * @throws {RangeError} If a value is of correct type but outside supported set/range.
 */
export function validateConfig(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Configuration options must be a non-null object.');
  }

  // Reject unsupported top-level configuration properties
  for (const key of Object.keys(options)) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      throw new RangeError(
        `Unsupported configuration property: "${key}". Supported properties are: ${Array.from(ALLOWED_CONFIG_KEYS).join(', ')}.`
      );
    }
  }

  // Validate 'level' if provided
  if ('level' in options) {
    if (typeof options.level !== 'string') {
      throw new TypeError(`Log level must be a string. Received: ${typeof options.level}.`);
    }
    if (!LOG_LEVELS.includes(options.level)) {
      throw new RangeError(
        `Invalid log level: "${options.level}". Supported levels are: ${LOG_LEVELS.join(', ')}.`
      );
    }
  }

  // Validate 'colors' if provided
  if ('colors' in options) {
    if (typeof options.colors !== 'boolean') {
      throw new TypeError(`Property "colors" must be a boolean. Received: ${typeof options.colors}.`);
    }
  }

  // Validate 'timestamps' if provided
  if ('timestamps' in options) {
    if (typeof options.timestamps !== 'boolean') {
      throw new TypeError(`Property "timestamps" must be a boolean. Received: ${typeof options.timestamps}.`);
    }
  }

  // Validate 'timestampFormat' if provided
  if ('timestampFormat' in options) {
    if (typeof options.timestampFormat !== 'string') {
      throw new TypeError(`Property "timestampFormat" must be a string. Received: ${typeof options.timestampFormat}.`);
    }
    if (!TIMESTAMP_FORMATS.includes(options.timestampFormat)) {
      throw new RangeError(
        `Invalid timestamp format: "${options.timestampFormat}". Supported formats are: ${TIMESTAMP_FORMATS.join(', ')}.`
      );
    }
  }

  // Validate 'redact' if provided
  if ('redact' in options) {
    const redact = options.redact;
    if (redact === null || typeof redact !== 'object' || Array.isArray(redact)) {
      throw new TypeError('Property "redact" must be a non-null object.');
    }

    // Reject unsupported redact properties
    for (const key of Object.keys(redact)) {
      if (!ALLOWED_REDACT_KEYS.has(key)) {
        throw new RangeError(
          `Unsupported property in redact configuration: "${key}". Supported properties are: ${Array.from(ALLOWED_REDACT_KEYS).join(', ')}.`
        );
      }
    }

    if ('enabled' in redact) {
      if (typeof redact.enabled !== 'boolean') {
        throw new TypeError(`Property "redact.enabled" must be a boolean. Received: ${typeof redact.enabled}.`);
      }
    }

    if ('fields' in redact) {
      if (!Array.isArray(redact.fields)) {
        throw new TypeError('Property "redact.fields" must be an array of non-empty strings.');
      }
      for (let i = 0; i < redact.fields.length; i++) {
        const field = redact.fields[i];
        if (typeof field !== 'string' || field.trim() === '') {
          throw new TypeError(
            `Property "redact.fields[${i}]" must be a non-empty string. Received: ${JSON.stringify(field)}.`
          );
        }
      }
    }

    if ('replacement' in redact) {
      if (typeof redact.replacement !== 'string') {
        throw new TypeError(`Property "redact.replacement" must be a string. Received: ${typeof redact.replacement}.`);
      }
      if (redact.replacement.length === 0) {
        throw new RangeError('Property "redact.replacement" must be a non-empty string.');
      }
    }
  }
}

/**
 * Creates a validated configuration by deeply combining user options with default settings.
 *
 * @param {object} [options={}] Custom configuration options to apply.
 * @returns {object} Validated and fully resolved configuration object.
 * @throws {TypeError} If options or any value violates type requirements.
 * @throws {RangeError} If values or keys violate range or allowed-set requirements.
 */
export function createConfig(options = {}) {
  validateConfig(options);

  const config = getDefaultConfig();

  if ('level' in options) {
    config.level = options.level;
  }

  if ('colors' in options) {
    config.colors = options.colors;
  }

  if ('timestamps' in options) {
    config.timestamps = options.timestamps;
  }

  if ('timestampFormat' in options) {
    config.timestampFormat = options.timestampFormat;
  }

  if ('redact' in options && options.redact) {
    if ('enabled' in options.redact) {
      config.redact.enabled = options.redact.enabled;
    }
    if ('fields' in options.redact) {
      config.redact.fields = [...options.redact.fields];
    }
    if ('replacement' in options.redact) {
      config.redact.replacement = options.redact.replacement;
    }
  }

  return config;
}

/**
 * Determines whether a message of a given level should be displayed based on
 * the currently configured threshold log level.
 *
 * @param {string} configuredLevel The logger's configured threshold level (e.g. "info").
 * @param {string} messageLevel The level of the specific log message (e.g. "debug", "warn").
 * @returns {boolean} True if the message should be logged, false otherwise.
 * @throws {TypeError} If either argument is not a string.
 * @throws {RangeError} If either argument is not a valid log level.
 */
export function shouldLog(configuredLevel, messageLevel) {
  if (typeof configuredLevel !== 'string') {
    throw new TypeError(
      `configuredLevel must be a string. Received: ${typeof configuredLevel}.`
    );
  }
  if (typeof messageLevel !== 'string') {
    throw new TypeError(
      `messageLevel must be a string. Received: ${typeof messageLevel}.`
    );
  }

  const configuredSeverity = LOG_LEVEL_SEVERITY[configuredLevel];
  if (configuredSeverity === undefined) {
    throw new RangeError(
      `Invalid configured log level: "${configuredLevel}". Supported levels are: ${LOG_LEVELS.join(', ')}.`
    );
  }

  const messageSeverity = LOG_LEVEL_SEVERITY[messageLevel];
  if (messageSeverity === undefined) {
    throw new RangeError(
      `Invalid message log level: "${messageLevel}". Supported levels are: ${LOG_LEVELS.join(', ')}.`
    );
  }

  return messageSeverity >= configuredSeverity;
}
