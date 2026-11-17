/**
 * ANSI escape sequences for terminal colors and text formatting styles.
 * @type {Readonly<Record<string, string>>}
 */
export const ANSI_CODES = Object.freeze({
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
});

/**
 * Mapping of supported log levels to their corresponding ANSI colors.
 * @type {Readonly<Record<string, string>>}
 */
export const LEVEL_COLORS = Object.freeze({
  debug: 'gray',
  info: 'cyan',
  warn: 'yellow',
  error: 'red'
});

/**
 * Detects whether the current runtime environment supports colored terminal output.
 * - Respects FORCE_COLOR (when set and not "0", enables colors).
 * - Respects NO_COLOR (when set and non-empty, disables colors unless FORCE_COLOR overrides).
 * - Checks process.stdout.isTTY.
 * - Safely handles non-terminal environments or environments lacking process/stdout.
 *
 * @returns {boolean} True if terminal colors are supported, false otherwise.
 */
export function supportsColor() {
  if (typeof process === 'undefined' || !process || !process.env) {
    return false;
  }

  const env = process.env;

  // 1. Check FORCE_COLOR
  if ('FORCE_COLOR' in env) {
    const forceColor = env.FORCE_COLOR;
    if (forceColor !== '0' && forceColor !== 'false') {
      return true;
    }
    return false;
  }

  // 2. Check NO_COLOR (standard: any non-empty string disables color)
  if ('NO_COLOR' in env && env.NO_COLOR !== '') {
    return false;
  }

  // 3. Check for dumb terminal
  if (env.TERM === 'dumb') {
    return false;
  }

  // 4. Check if stdout is an interactive TTY
  if (process.stdout && Boolean(process.stdout.isTTY)) {
    return true;
  }

  // 5. Check CI environment variables where color is commonly supported
  if (env.CI && (env.GITHUB_ACTIONS || env.GITLAB_CI || env.TRAVIS || env.CIRCLECI)) {
    return true;
  }

  return false;
}

/**
 * Returns the corresponding color name for a given log level.
 * Falls back to 'reset' for unknown or unspecified log levels.
 *
 * @param {string} level The log level (e.g. 'debug', 'info', 'warn', 'error').
 * @returns {string} The color name associated with the level or 'reset' fallback.
 */
export function getLevelColor(level) {
  if (typeof level !== 'string') {
    return 'reset';
  }

  const normalized = level.toLowerCase();
  return LEVEL_COLORS[normalized] || 'reset';
}

/**
 * Wraps text in ANSI color escape codes if coloring is enabled and the color is supported.
 * Appends ANSI reset code to ensure formatting does not leak to subsequent terminal text.
 *
 * @param {unknown} text The content to colorize. Will be safely converted to string.
 * @param {string} color The name of the color or style (e.g. 'red', 'cyan', 'bold').
 * @param {boolean} [enabled=true] Whether coloring is enabled.
 * @returns {string} Colorized text or plain text string.
 */
export function colorize(text, color, enabled = true) {
  const content = text === undefined ? 'undefined' : text === null ? 'null' : String(text);

  if (!enabled || !color || typeof color !== 'string') {
    return content;
  }

  const openCode = ANSI_CODES[color];
  if (!openCode) {
    return content;
  }

  return `${openCode}${content}${ANSI_CODES.reset}`;
}
