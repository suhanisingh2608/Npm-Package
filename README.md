# PrettyTrace

A lightweight, customizable, dependency-free logging utility for Node.js.

## Overview

PrettyTrace is designed for Node.js applications that need clean, readable terminal logs, robust structured metadata, automated sensitive-data redaction, and child loggers with persistent context—all with **zero external dependencies** and native ES module support.

## Key Features

- **5 Standard Log Levels**: `debug`, `info`, `success`, `warn`, and `error`.
- **Numerical Severity Filtering**: Easily set log level thresholds; filtered messages bypass formatting and console output entirely.
- **Terminal Colors**: High-contrast ANSI styling with automatic environment detection (`FORCE_COLOR`, `NO_COLOR`, TTY).
- **Readable Timestamps**: Formatted 24-hour timestamps (`YYYY-MM-DD HH:mm:ss`), toggleable per logger instance.
- **Structured Object Logging**: Readable multi-argument object and array formatting with circular-reference protection (`[Circular]`).
- **Automated Sensitive-Data Redaction**: Recursive, case-insensitive redaction of credentials, tokens, and custom fields.
- **Child Loggers & Context**: Persistent metadata inheritance across request or service lifecycles via `logger.child()`.
- **Zero Dependencies**: Pure modern JavaScript built exclusively for Node.js 18+.

---

## Installation

```bash
npm install prettytrace
```

---

## Basic Usage

```js
import { createLogger } from 'prettytrace';

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

Configure behavior by passing an options object to `createLogger(options)`:

```js
const logger = createLogger({
  level: 'debug',              // Threshold: 'debug' | 'info' | 'warn' | 'error' (default: 'info')
  colors: true,                // Enable/disable ANSI terminal colors (default: true)
  timestamps: true,            // Include timestamps in output (default: true)
  timestampFormat: '24h',      // Timestamp format (default: '24h')
  redact: {
    enabled: true,             // Enable/disable redaction (default: true)
    fields: [                  // Array of sensitive field names (case-insensitive exact match)
      'password',
      'token',
      'secret',
      'authorization',
      'apiKey'
    ],
    replacement: '[REDACTED]'  // Replacement string (default: '[REDACTED]')
  }
});
```

### Log Levels & Severity Thresholds

Severity order is defined as follows:

| Level | Severity Weight | Visible Output |
|---|---|---|
| `debug` | 10 | `debug`, `info`, `success`, `warn`, `error` |
| `info` (default) | 20 | `info`, `success`, `warn`, `error` |
| `warn` | 30 | `warn`, `error` |
| `error` | 40 | `error` |

*Note: `success()` uses `info` severity (20) for threshold filtering.*

---

## Structured Object Logging

PrettyTrace accepts multiple arguments of any JavaScript type, including objects, arrays, Error stacks, numbers, booleans, and BigInt:

```js
logger.info('User session event', {
  userId: 'usr_42',
  authenticated: true,
  roles: ['developer', 'admin']
});
```

Output:
```text
2026-11-17 18:00:00 [INFO] User session event {
  "userId": "usr_42",
  "authenticated": true,
  "roles": [
    "developer",
    "admin"
  ]
}
```

---

## Sensitive-Data Redaction

PrettyTrace automatically traverses nested objects, arrays, Maps, Sets, and Errors to mask sensitive properties before formatting or printing:

```js
logger.info('Authentication payload', {
  username: 'alice',
  password: 'mySuperSecretPassword',
  metadata: {
    apiKey: 'live_key_98234710',
    publicId: 'pub_99'
  }
});
```

Output:
```text
2026-11-17 18:00:00 [INFO] Authentication payload {
  "username": "alice",
  "password": "[REDACTED]",
  "metadata": {
    "apiKey": "[REDACTED]",
    "publicId": "pub_99"
  }
}
```

- **Case-Insensitive Exact Matching**: `password`, `Password`, `PASSWORD`, `apiKey`, and `APIKEY` are all redacted. Substrings (such as `monkey` or `keyring`) are not matched.
- **Custom Fields & Replacements**: Configure custom sensitive keys (e.g. `['creditCard', 'ssn']`) and custom replacement markers (e.g. `'***HIDDEN***'`).

---

## Child Loggers & Contextual Metadata

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
