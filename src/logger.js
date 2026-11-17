import { createConfig, shouldLog } from './config.js';
import { formatLog } from './formatter.js';
import { redactSensitiveData } from './redact.js';
import { cloneValue, isPlainObject } from './utils.js';

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
 * Validates child contextual metadata.
 * - `undefined` is treated as empty context.
 * - Plain objects are accepted.
 * - `null`, arrays, and primitives throw TypeError.
 *
 * @param {unknown} context Context to validate.
 * @throws {TypeError} If context is not a plain object or undefined.
 */
function validateChildContext(context) {
  if (context === undefined) {
    return;
  }
  if (!isPlainObject(context)) {
    throw new TypeError(
      `Child logger context must be a plain object. Received: ${context === null ? 'null' : Array.isArray(context) ? 'array' : typeof context}.`
    );
  }
}

/**
 * Internal logger instance constructor that supports persistent context and child derivation.
 *
 * @param {object} config Resolved PrettyTrace configuration object.
 * @param {object} [context={}] Persistent contextual metadata for this logger instance.
 * @returns {object} Logger instance with logging methods and `child()`.
 */
function createLoggerInstance(config, context = {}) {
  // Validate and deeply clone initial context so external mutations do not affect logger state
  validateChildContext(context);
  const persistentContext = context ? cloneValue(context) : {};

  function log(method, consoleFn, args) {
    const filterLevel = METHOD_SEVERITY[method] || method;

    // 1. Severity threshold check
    if (!shouldLog(config.level, filterLevel)) {
      return;
    }

    // 2. Prepare arguments including persistent contextual metadata if present
    const preparedArgs = [];
    const hasContext = persistentContext && Object.keys(persistentContext).length > 0;

    if (hasContext) {
      // Find plain object arguments in the log call to merge or append
      // If there is an object argument, merge context with it, giving persistent context precedence
      // If there are multiple objects or only messages, append combined metadata
      let mergedWithFirstObject = false;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!mergedWithFirstObject && isPlainObject(arg)) {
          // Merge: log-specific metadata first, persistent context takes precedence
          const combined = { ...arg, ...persistentContext };
          preparedArgs.push(combined);
          mergedWithFirstObject = true;
        } else {
          preparedArgs.push(arg);
        }
      }

      // If no plain object argument was present in the call, append persistent context
      if (!mergedWithFirstObject) {
        preparedArgs.push(cloneValue(persistentContext));
      }
    } else {
      for (let i = 0; i < args.length; i++) {
        preparedArgs.push(args[i]);
      }
    }

    // 3. Sensitive data redaction
    const processedArgs = config.redact && config.redact.enabled !== false
      ? preparedArgs.map((arg) => redactSensitiveData(arg, config.redact))
      : preparedArgs;

    // 4. Format and output
    const formatted = formatLog(method, processedArgs, config);
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
    },
    /**
     * Creates a new child logger that inherits this logger's configuration and merges
     * additional persistent contextual metadata with any existing context.
     *
     * @param {object} [childContext={}] Additional contextual metadata for the child logger.
     * @returns {object} A new independent child logger instance.
     * @throws {TypeError} If childContext is not a plain object or undefined.
     */
    child(childContext = {}) {
      validateChildContext(childContext);
      const clonedChildContext = childContext ? cloneValue(childContext) : {};
      // Child context overrides parent context for conflicting keys
      const mergedContext = { ...persistentContext, ...clonedChildContext };
      // Child inherits parent configuration (cloned deeply to ensure complete isolation)
      const inheritedConfig = cloneValue(config);
      return createLoggerInstance(inheritedConfig, mergedContext);
    }
  };
}

/**
 * Creates and returns an independent PrettyTrace logger instance.
 *
 * Supported methods:
 * - `logger.debug(...args)`
 * - `logger.info(...args)`
 * - `logger.success(...args)`
 * - `logger.warn(...args)`
 * - `logger.error(...args)`
 * - `logger.child(context)`
 *
 * @param {object} [options={}] Configuration options for this logger instance.
 * @returns {object} Logger instance with logging methods and child derivation.
 */
export function createLogger(options = {}) {
  const config = createConfig(options);
  return createLoggerInstance(config, {});
}
