import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatLog } from '../src/formatter.js';
import { getDefaultConfig } from '../src/config.js';
import { ANSI_CODES } from '../src/colors.js';

describe('PrettyTrace Log Formatter', () => {
  it('1. Formats correct uppercase labels', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };

    assert.equal(formatLog('debug', ['msg'], config), '[DEBUG] msg');
    assert.equal(formatLog('info', ['msg'], config), '[INFO] msg');
    assert.equal(formatLog('success', ['msg'], config), '[SUCCESS] msg');
    assert.equal(formatLog('warn', ['msg'], config), '[WARN] msg');
    assert.equal(formatLog('error', ['msg'], config), '[ERROR] msg');
  });

  it('2. Includes timestamp when enabled and matches format YYYY-MM-DD HH:mm:ss', () => {
    const config = { ...getDefaultConfig(), timestamps: true, colors: false };
    const output = formatLog('info', ['test message'], config);

    assert.match(output, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[INFO\] test message$/);
  });

  it('3. Omits timestamp completely when disabled', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const output = formatLog('info', ['test message'], config);

    assert.equal(output, '[INFO] test message');
    assert.doesNotMatch(output, /^\d{4}-\d{2}-\d{2}/);
  });

  it('4. Formats multiple arguments separated by space', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const output = formatLog('info', ['User', 'John', 'logged in with role', 'admin'], config);

    assert.equal(output, '[INFO] User John logged in with role admin');
  });

  it('5. Objects and arrays are readable (not [object Object])', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const user = { id: 101, username: 'suhani' };
    const tags = ['dev', 'admin'];

    const output = formatLog('info', ['User data:', user, 'Tags:', tags], config);

    assert.equal(output.includes('[object Object]'), false);
    assert.match(output, /"username":\s*"suhani"/);
    assert.match(output, /"tags":|\[\s*"dev",\s*"admin"\s*\]/);
  });

  it('6. Error objects retain name, message, and stack trace information', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const err = new Error('Connection refused');

    const output = formatLog('error', ['Database connection failed:', err], config);

    assert.match(output, /Database connection failed:/);
    assert.match(output, /Error: Connection refused/);
    assert.match(output, /at /);
  });

  it('7. Success uses green label styling when colors are enabled', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: true };
    const output = formatLog('success', ['Operation complete'], config);

    const expectedLabel = `${ANSI_CODES.green}[SUCCESS]${ANSI_CODES.reset}`;
    assert.equal(output, `${expectedLabel} Operation complete`);
  });

  it('8. Other levels use their mapped colors on the label only', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: true };

    const debugOut = formatLog('debug', ['msg'], config);
    assert.equal(debugOut, `${ANSI_CODES.gray}[DEBUG]${ANSI_CODES.reset} msg`);

    const infoOut = formatLog('info', ['msg'], config);
    assert.equal(infoOut, `${ANSI_CODES.cyan}[INFO]${ANSI_CODES.reset} msg`);

    const warnOut = formatLog('warn', ['msg'], config);
    assert.equal(warnOut, `${ANSI_CODES.yellow}[WARN]${ANSI_CODES.reset} msg`);

    const errorOut = formatLog('error', ['msg'], config);
    assert.equal(errorOut, `${ANSI_CODES.red}[ERROR]${ANSI_CODES.reset} msg`);
  });

  it('9. Disabled colors produce no ANSI codes', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    for (const level of ['debug', 'info', 'success', 'warn', 'error']) {
      const output = formatLog(level, ['sample message'], config);
      assert.equal(output.includes('\x1b['), false);
    }
  });

  it('10. Formatting does not mutate input arguments', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const originalObj = { count: 1, nested: { status: 'active' } };
    const originalArr = [1, 2, 3];
    const objSnapshot = JSON.stringify(originalObj);
    const arrSnapshot = JSON.stringify(originalArr);

    formatLog('info', ['Obj:', originalObj, 'Arr:', originalArr], config);

    assert.equal(JSON.stringify(originalObj), objSnapshot);
    assert.equal(JSON.stringify(originalArr), arrSnapshot);
  });

  it('11. Undefined, null, booleans, BigInt, and numbers are handled cleanly', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const output = formatLog('info', [undefined, null, true, false, 42, 100n], config);

    assert.equal(output, '[INFO] undefined null true false 42 100n');
  });

  it('12. Circular references in objects and arrays are formatted safely as [Circular]', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const circObj = { name: 'cyclic' };
    circObj.self = circObj;

    const output = formatLog('info', ['Cyclic:', circObj], config);
    assert.match(output, /"self":\s*"\[Circular\]"/);

    const circArr = ['item'];
    circArr.push(circArr);
    const arrOutput = formatLog('info', ['Arr:', circArr], config);
    assert.match(arrOutput, /"\[Circular\]"/);
  });

  it('13. Works gracefully when called with no arguments', () => {
    const config = { ...getDefaultConfig(), timestamps: false, colors: false };
    const output = formatLog('info', [], config);

    assert.equal(output, '[INFO]');
  });
});
