import { getTimestamp, safeStringify } from './utils.js';
import { colorize, getLevelColor } from './colors.js';

/**
 * Log label mappings.
 * @type {Readonly<Record<string, string>>}
 */
const LOG_LABELS = Object.freeze({
  debug: 'DEBUG',
  info: 'INFO',
  success: 'SUCCESS',
  warn: 'WARN',
  error: 'ERROR'
});

/**
 * Log level to color name mapping, including the display style 'success'.
 * @type {Readonly<Record<string, string>>}
 */
const LABEL_COLORS = Object.freeze({
  debug: 'gray',
  info: 'cyan',
  success: 'green',
  warn: 'yellow',
  error: 'red'
});

/**
 * Formats a single argument into a human-readable string representation.
 * - Strings are converted directly without JSON quotes.
 * - Errors display their name, message, and stack trace if available.
 * - Objects and arrays are formatted via safeStringify.
 * - BigInt, symbols, functions, undefined, null, and primitives are formatted safely.
 *
 * @param {unknown} arg The argument to format.
 * @returns {string} Formatted string.
 */
function formatArg(arg) {
  if (typeof arg === 'string') {
    return arg;
  }

  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }

  if (typeof arg === 'object' && arg !== null) {
    return safeStringify(arg);
  }

  if (typeof arg === 'bigint') {
    return `${arg.toString()}n`;
  }

  if (typeof arg === 'symbol') {
    return arg.toString();
  }

  if (typeof arg === 'function') {
    return arg.name ? `[Function: ${arg.name}]` : '[Function]';
  }

  return String(arg);
}

/**
 * Formats a log call into a formatted output string according to the logger configuration.
 *
 * Output layout:
 * `[YYYY-MM-DD HH:mm:ss] [LABEL] message...`
 * or (without timestamps):
 * `[LABEL] message...`
 *
 * @param {string} level The log level/style (debug, info, success, warn, error).
 * @param {unknown[]} args Array of arguments passed to the logger method.
 * @param {object} config Resolved PrettyTrace configuration object.
 * @returns {string} Fully formatted log string.
 */
export function formatLog(level, args, config) {
  const parts = [];

  // 1. Timestamps
  if (config && config.timestamps) {
    parts.push(getTimestamp());
  }

  // 2. Log label with brackets
  const rawLabel = LOG_LABELS[level] || String(level).toUpperCase();
  const bracketedLabel = `[${rawLabel}]`;

  const colorEnabled = Boolean(config && config.colors);
  const colorName = LABEL_COLORS[level] || getLevelColor(level);
  const styledLabel = colorize(bracketedLabel, colorName, colorEnabled);

  parts.push(styledLabel);

  // 3. Arguments
  if (args && args.length > 0) {
    const formattedArgs = args.map((arg) => formatArg(arg)).join(' ');
    parts.push(formattedArgs);
  }

  return parts.join(' ');
}
