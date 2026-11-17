# @suhanyyysm/pretty

A lightweight, customizable, dependency-free logging utility and CLI for Node.js.

[![npm version](https://img.shields.io/npm/v/@suhanyyysm/pretty.svg)](https://www.npmjs.com/package/@suhanyyysm/pretty)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

**@suhanyyysm/pretty** is designed for Node.js applications and command-line workflows that need clean, readable terminal logs, robust structured metadata, automated sensitive-data redaction, and child loggers with persistent context—all with **zero external dependencies** and native ES module support.

It includes both a programmatic logging library and the **`pretty`** CLI executable.

## Key Features

- **5 Standard Log Levels**: `debug`, `info`, `success`, `warn`, and `error`.
- **CLI Executable (`pretty`)**: Format messages, inspect JSON, or pipe stream logs directly in the terminal.
- **Numerical Severity Filtering**: Easily set log level thresholds; filtered messages bypass formatting and console output entirely.
- **Terminal Colors**: High-contrast ANSI styling with automatic environment detection (`FORCE_COLOR`, `NO_COLOR`, TTY).
- **Readable Timestamps**: Formatted 24-hour timestamps (`YYYY-MM-DD HH:mm:ss`), toggleable per logger instance.
- **Structured Object Logging**: Readable multi-argument object and array formatting with circular-reference protection (`[Circular]`).
- **Automated Sensitive-Data Redaction**: Recursive, case-insensitive redaction of credentials, tokens, and custom fields.
- **Child Loggers & Context**: Persistent metadata inheritance across request or service lifecycles via `logger.child()`.
- **Zero Dependencies**: Pure modern JavaScript built exclusively for Node.js 18+.

---

## Installation

### As a project dependency:

```bash
npm install @suhanyyysm/pretty
```

### Globally for the `pretty` CLI:

```bash
npm install -g @suhanyyysm/pretty
```

---

## CLI Usage (`pretty`)

Pretty provides the `pretty` command-line tool for formatting terminal messages, structured JSON logs, and piped streams.

```bash
pretty [options] [message...]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-m, --method <method>` | Logging method to use (`debug`, `info`, `success`, `warn`, `error`) | `info` |
| `-l, --level <level>` | Minimum log level threshold (`debug`, `info`, `warn`, `error`) | `info` |
| `--no-colors` | Disable ANSI terminal color codes | `false` |
| `--no-timestamps` | Disable timestamp prefix | `false` |
| `-j, --json` | Parse message arguments as JSON objects | `false` |
| `-c, --context <json>` | Attach persistent contextual metadata as JSON | `null` |
| `-v, --version` | Output CLI version | — |
| `-h, --help` | Display help and usage information | — |

### CLI Examples

```bash
# Basic log
pretty "Server started on port 3000"

# Specific severity methods
pretty -m success "Build completed successfully"
pretty -m warn "Memory consumption threshold reached (82%)"
pretty -m error "Database connection failed"

# Debug logging with custom threshold
pretty -l debug -m debug "Connection pool initialized"

# Structured JSON logging
pretty -j '{"user":"alice","token":"secret123"}'
# (Notice: "token" is automatically redacted!)

# Contextual metadata
pretty -c '{"service":"api-gateway","env":"production"}' "Incoming request"

# Pipe logs from stdin
echo '{"status":"ok","latency":42}' | pretty --json
```

---

## Programmatic Usage

### Basic Example

```js
import { createLogger } from '@suhanyyysm/pretty';

const logger = createLogger();

logger.debug('Debugging application startup (hidden by default "info" level)');
logger.info('Server started on port 3000');
logger.success('Database connection established');
logger.warn('High memory consumption detected (78%)');
logger.error('Failed to connect to secondary cache');
```

Output:
```text
2026-11-17 18:00:00 [INFO] Server started on port 3000
2026-11-17 18:00:01 [SUCCESS] Database connection established
2026-11-17 18:00:02 [WARN] High memory consumption detected (78%)
2026-11-17 18:00:03 [ERROR] Failed to connect to secondary cache
```

---

## Configuration Options

Configure loggers by passing options to `createLogger(options)`:

```js
import { createLogger } from '@suhanyyysm/pretty';

const logger = createLogger({
  level: 'debug',             // 'debug' | 'info' | 'warn' | 'error' (default: 'info')
  colors: true,               // boolean (default: auto-detected from terminal/environment)
  timestamps: true,           // boolean (default: true)
  timestampFormat: '24h',     // '24h' (default: '24h')
  redact: {
    enabled: true,            // boolean (default: true)
    fields: ['password', 'token', 'secret', 'authorization', 'apiKey'], // array of strings
    replacement: '[REDACTED]' // string (default: '[REDACTED]')
  }
});
```

### Log Levels & Filtering

Pretty uses numerical severity weighting:

| Level | Severity Weight | Visible When Configured Level Is |
| :--- | :---: | :--- |
| **`debug`** | 10 | `debug` |
| **`info`** *(default)* | 20 | `debug`, `info` |
| **`warn`** | 30 | `debug`, `info`, `warn` |
| **`error`** | 40 | `debug`, `info`, `warn`, `error` |

*Note: `logger.success()` shares the `info` level severity weight (20) and outputs via `console.log`.*

---

## Structured Object Logging & Multi-Arguments

Accepts multiple arguments of any JavaScript type, including objects, arrays, Error stacks, numbers, booleans, and BigInt:

```js
logger.info('User action', {
  userId: 'usr_102',
  roles: ['admin', 'billing'],
  timestamp: new Date()
});
```

---

## Automated Sensitive-Data Redaction

Automatically traverses nested objects, arrays, Maps, Sets, and Errors to mask sensitive properties before formatting or printing:

```js
const logger = createLogger({
  redact: {
    fields: ['password', 'token', 'secret', 'authorization', 'apiKey'],
    replacement: '[REDACTED]'
  }
});

logger.info('User login payload', {
  username: 'alice',
  password: 'superSecretPassword123',
  metadata: {
    apiKey: 'sk_live_987234981723'
  }
});
```

Output:
```text
2026-11-17 18:00:00 [INFO] User login payload {
  "username": "alice",
  "password": "[REDACTED]",
  "metadata": {
    "apiKey": "[REDACTED]"
  }
}
```

---

## Child Loggers and Contextual Logging

Child loggers allow request-scoped or service-scoped loggers to attach persistent contextual metadata to all log entries.

### Basic Child Logger

```js
const requestLogger = logger.child({
  requestId: 'req-8f4b2190',
  service: 'api-gateway'
});

requestLogger.info('Incoming request received');
// => 2026-11-17 18:00:00 [INFO] Incoming request received {"requestId":"req-8f4b2190","service":"api-gateway"}
```

### Nested Child Loggers & Precedence

Child loggers can be derived from existing child loggers:

```js
const serviceLogger = logger.child({ service: 'billing', env: 'production' });
const userLogger = serviceLogger.child({ requestId: 'req-101', userId: 'usr_500' });

userLogger.info('Charge completed', { amount: 29.99 });
// Output includes combined context: service, env, requestId, userId, and amount
```

- **Child Overrides**: A child logger's context overrides conflicting parent keys.
- **Metadata Precedence**: Persistent context keys take precedence over conflicting call-time metadata keys (`{ ...callMetadata, ...persistentContext }`), ensuring core service and request identifiers cannot be overwritten.
- **Redaction**: Context metadata passes through the same redaction pipeline as log arguments.

---

## API Reference

### `createLogger(options?)`
Creates a root logger instance.
- **Parameters**: `options` (Object, optional) — logger configuration.
- **Returns**: Logger instance.

### Logger Instance Methods
- `logger.debug(...args)`: Emits a log with `[DEBUG]` label via `console.debug`.
- `logger.info(...args)`: Emits a log with `[INFO]` label via `console.info`.
- `logger.success(...args)`: Emits a log with green `[SUCCESS]` label via `console.log`.
- `logger.warn(...args)`: Emits a log with `[WARN]` label via `console.warn`.
- `logger.error(...args)`: Emits a log with `[ERROR]` label via `console.error`.
- `logger.child(context)`: Derives an independent child logger with persistent metadata. Throws `TypeError` if `context` is not a plain object or `undefined`.

*All logging methods return `undefined`.*

---

## Requirements & License

- **Node.js**: Requires Node.js `>=18.0.0`
- **Dependencies**: 0 external runtime or development dependencies
- **License**: [MIT](LICENSE) © Suhani Singh
