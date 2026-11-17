import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { runCli } from '../bin/pretty.js';

const CLI_PATH = path.resolve('bin/pretty.js');

function run(args, input = undefined) {
  const cmd = `node "${CLI_PATH}" ${args}`;
  return execSync(cmd, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function runCombined(args, input = undefined) {
  const cmd = `node "${CLI_PATH}" ${args} 2>&1`;
  return execSync(cmd, {
    input,
    encoding: 'utf8'
  });
}

describe('Pretty CLI Executable (pretty)', () => {
  it('outputs help text with --help', () => {
    const out = run('--help');
    assert.ok(out.includes('Usage: pretty [options]'));
    assert.ok(out.includes('--level'));
    assert.ok(out.includes('--method'));
    assert.ok(out.includes('--json'));
    assert.ok(out.includes('--context'));
  });

  it('outputs help text with -h', () => {
    const out = run('-h');
    assert.ok(out.includes('Usage: pretty [options]'));
  });

  it('outputs version with --version and -v', () => {
    const out1 = run('--version');
    assert.equal(out1.trim(), '1.0.0');

    const out2 = run('-v');
    assert.equal(out2.trim(), '1.0.0');
  });

  it('logs a basic message with default info method', () => {
    const out = run('--no-colors "Server started"');
    assert.ok(out.includes('[INFO] Server started'));
  });

  it('supports -m flag for specific log methods', () => {
    const outSuccess = run('--no-colors -m success "All tests passed"');
    assert.ok(outSuccess.includes('[SUCCESS] All tests passed'));

    const outWarn = runCombined('--no-colors -m warn "Disk space low"');
    assert.ok(outWarn.includes('[WARN] Disk space low'));

    const outError = runCombined('--no-colors -m error "Fatal error"');
    assert.ok(outError.includes('[ERROR] Fatal error'));
  });

  it('filters messages below configured log level threshold', () => {
    const outFiltered = run('-l warn -m info "Hidden info message"');
    assert.equal(outFiltered.trim(), '');

    const outVisible = runCombined('--no-colors -l debug -m debug "Debug detail"');
    assert.ok(outVisible.includes('[DEBUG] Debug detail'));
  });

  it('supports --no-timestamps and --no-colors flags', () => {
    const out = run('--no-timestamps --no-colors "Clean message"');
    assert.equal(out.trim(), '[INFO] Clean message');
    assert.ok(!out.includes('\x1b['));
  });

  it('parses structured JSON messages and redacts sensitive data', () => {
    const jsonPayload = JSON.stringify({ user: 'alice', password: 'secret123', token: 'tok_abc' });
    const out = run(`--json '${jsonPayload}'`);
    assert.ok(out.includes('"user": "alice"'));
    assert.ok(out.includes('"password": "[REDACTED]"'));
    assert.ok(out.includes('"token": "[REDACTED]"'));
    assert.ok(!out.includes('secret123'));
    assert.ok(!out.includes('tok_abc'));
  });

  it('supports persistent contextual metadata via -c', () => {
    const context = JSON.stringify({ service: 'auth-gateway', env: 'production' });
    const out = run(`-c '${context}' "Route dispatched"`);
    assert.ok(out.includes('Route dispatched'));
    assert.ok(out.includes('"service": "auth-gateway"'));
    assert.ok(out.includes('"env": "production"'));
  });

  it('handles piped input from stdin', () => {
    const out = run('--no-timestamps --no-colors', 'Message from pipeline');
    assert.equal(out.trim(), '[INFO] Message from pipeline');
  });

  it('returns error exit code on invalid method', () => {
    try {
      run('-m invalid_method "test"');
      assert.fail('Should have failed');
    } catch (err) {
      assert.equal(err.status, 1);
      assert.ok(err.stderr.includes('Unknown logging method "invalid_method"'));
    }
  });

  it('returns error exit code on invalid level', () => {
    try {
      run('-l invalid_level "test"');
      assert.fail('Should have failed');
    } catch (err) {
      assert.equal(err.status, 1);
      assert.ok(err.stderr.includes('Invalid log level'));
    }
  });

  it('returns error exit code on invalid context JSON', () => {
    try {
      run('-c "{invalid_json" "test"');
      assert.fail('Should have failed');
    } catch (err) {
      assert.equal(err.status, 1);
      assert.ok(err.stderr.includes('Failed to parse context JSON'));
    }
  });

  it('runCli function can be invoked programmatically', async () => {
    const code = await runCli(['--version']);
    assert.equal(code, 0);
  });
});
