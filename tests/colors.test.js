import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSI_CODES,
  LEVEL_COLORS,
  colorize,
  getLevelColor,
  supportsColor
} from '../src/colors.js';

describe('PrettyTrace Terminal Colors', () => {
  describe('ANSI codes and level colors constants', () => {
    it('defines all required ANSI codes and styles with correct opening and reset sequences', () => {
      assert.equal(ANSI_CODES.reset, '\x1b[0m');
      assert.equal(ANSI_CODES.bold, '\x1b[1m');
      assert.equal(ANSI_CODES.dim, '\x1b[2m');
      assert.equal(ANSI_CODES.red, '\x1b[31m');
      assert.equal(ANSI_CODES.green, '\x1b[32m');
      assert.equal(ANSI_CODES.yellow, '\x1b[33m');
      assert.equal(ANSI_CODES.blue, '\x1b[34m');
      assert.equal(ANSI_CODES.magenta, '\x1b[35m');
      assert.equal(ANSI_CODES.cyan, '\x1b[36m');
      assert.equal(ANSI_CODES.gray, '\x1b[90m');
    });

    it('maps log levels to expected colors', () => {
      assert.equal(LEVEL_COLORS.debug, 'gray');
      assert.equal(LEVEL_COLORS.info, 'cyan');
      assert.equal(LEVEL_COLORS.warn, 'yellow');
      assert.equal(LEVEL_COLORS.error, 'red');
    });
  });

  describe('colorize()', () => {
    it('wraps text with correct ANSI escape sequences and reset', () => {
      for (const [colorName, code] of Object.entries(ANSI_CODES)) {
        if (colorName === 'reset') continue;
        const result = colorize('hello', colorName, true);
        assert.equal(result, `${code}hello${ANSI_CODES.reset}`);
      }
    });

    it('returns plain text when enabled is false even for valid colors', () => {
      const result = colorize('plain text', 'red', false);
      assert.equal(result, 'plain text');
      assert.equal(result.includes('\x1b['), false);
    });

    it('defaults enabled to true when omitted', () => {
      const result = colorize('info message', 'cyan');
      assert.equal(result, `\x1b[36minfo message\x1b[0m`);
    });

    it('returns plain text for unknown or unsupported color names', () => {
      assert.equal(colorize('text', 'unknownColor'), 'text');
      assert.equal(colorize('text', ''), 'text');
      assert.equal(colorize('text', null), 'text');
      assert.equal(colorize('text', 123), 'text');
    });

    it('safely converts non-string inputs to string', () => {
      assert.equal(colorize(12345, 'blue'), `\x1b[34m12345\x1b[0m`);
      assert.equal(colorize(true, 'green'), `\x1b[32mtrue\x1b[0m`);
      assert.equal(colorize(null, 'gray'), `\x1b[90mnull\x1b[0m`);
      assert.equal(colorize(undefined, 'gray'), `\x1b[90mundefined\x1b[0m`);
      assert.equal(colorize(0, 'red'), `\x1b[31m0\x1b[0m`);
    });
  });

  describe('getLevelColor()', () => {
    it('returns expected color for supported levels (case-insensitive)', () => {
      assert.equal(getLevelColor('debug'), 'gray');
      assert.equal(getLevelColor('info'), 'cyan');
      assert.equal(getLevelColor('warn'), 'yellow');
      assert.equal(getLevelColor('error'), 'red');

      assert.equal(getLevelColor('DEBUG'), 'gray');
      assert.equal(getLevelColor('Info'), 'cyan');
      assert.equal(getLevelColor('WARN'), 'yellow');
      assert.equal(getLevelColor('ERROR'), 'red');
    });

    it('returns reset for unknown or invalid levels', () => {
      assert.equal(getLevelColor('verbose'), 'reset');
      assert.equal(getLevelColor('critical'), 'reset');
      assert.equal(getLevelColor(''), 'reset');
      assert.equal(getLevelColor(null), 'reset');
      assert.equal(getLevelColor(undefined), 'reset');
      assert.equal(getLevelColor(123), 'reset');
    });
  });

  describe('supportsColor() precedence and environment detection', () => {
    let originalEnv;
    let originalIsTTY;

    beforeEach(() => {
      originalEnv = { ...process.env };
      originalIsTTY = process.stdout ? process.stdout.isTTY : undefined;
    });

    afterEach(() => {
      process.env = originalEnv;
      if (process.stdout) {
        process.stdout.isTTY = originalIsTTY;
      }
    });

    it('FORCE_COLOR alone: returns true when FORCE_COLOR is "1" or non-zero/non-false', () => {
      delete process.env.NO_COLOR;
      delete process.env.TERM;
      process.env.FORCE_COLOR = '1';
      if (process.stdout) process.stdout.isTTY = false;

      assert.equal(supportsColor(), true);

      process.env.FORCE_COLOR = '3';
      assert.equal(supportsColor(), true);
    });

    it('FORCE_COLOR alone: returns false when FORCE_COLOR is "0" or "false"', () => {
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = '0';
      if (process.stdout) process.stdout.isTTY = true;

      assert.equal(supportsColor(), false);

      process.env.FORCE_COLOR = 'false';
      assert.equal(supportsColor(), false);
    });

    it('NO_COLOR alone: returns false when NO_COLOR is set and non-empty', () => {
      delete process.env.FORCE_COLOR;
      process.env.NO_COLOR = '1';
      if (process.stdout) process.stdout.isTTY = true;

      assert.equal(supportsColor(), false);

      process.env.NO_COLOR = 'true';
      assert.equal(supportsColor(), false);
    });

    it('precedence: FORCE_COLOR takes precedence over NO_COLOR when both are present', () => {
      // FORCE_COLOR=1 overrides NO_COLOR=1
      process.env.FORCE_COLOR = '1';
      process.env.NO_COLOR = '1';
      if (process.stdout) process.stdout.isTTY = false;

      assert.equal(supportsColor(), true);

      // FORCE_COLOR=0 explicitly disables colors even if NO_COLOR is empty
      process.env.FORCE_COLOR = '0';
      process.env.NO_COLOR = '';
      if (process.stdout) process.stdout.isTTY = true;

      assert.equal(supportsColor(), false);
    });

    it('TERM=dumb returns false when no FORCE_COLOR is set', () => {
      delete process.env.FORCE_COLOR;
      delete process.env.NO_COLOR;
      process.env.TERM = 'dumb';
      if (process.stdout) process.stdout.isTTY = true;

      assert.equal(supportsColor(), false);
    });

    it('TTY vs non-TTY: returns true for TTY and false for non-TTY when no flags set', () => {
      delete process.env.FORCE_COLOR;
      delete process.env.NO_COLOR;
      delete process.env.TERM;
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;

      if (process.stdout) {
        process.stdout.isTTY = true;
        assert.equal(supportsColor(), true);

        process.stdout.isTTY = false;
        assert.equal(supportsColor(), false);
      }
    });

    it('colorize respects explicit enabled=false independently of environment state', () => {
      process.env.FORCE_COLOR = '1';
      // Even with FORCE_COLOR=1, colorize with enabled=false must return plain text
      const result = colorize('forced off', 'red', false);
      assert.equal(result, 'forced off');
    });
  });
});
