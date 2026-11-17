# PrettyTrace

A lightweight, customizable, dependency-free logging utility for Node.js.

## Status

PrettyTrace provides production-ready core logging, terminal color support, structured formatting, automated sensitive-data redaction, and child loggers with persistent contextual metadata.

## Quick Start

```js
import { createLogger } from 'prettytrace';

const logger = createLogger({
  level: 'info',
  colors: true,
  timestamps: true
});

logger.info('Server started on port 3000');
logger.success('Database connection established');
logger.warn('High memory usage detected');
logger.error('Failed to connect to cache service');
```

---

## Child Loggers and Contextual Logging

Child loggers allow applications to attach persistent contextual metadata—such as request IDs, user IDs, service names, and environment information—to every log entry created through that logger.

### Basic Child Logger Usage

Call `logger.child(context)` to derive an independent child logger:

```js
const requestLogger = logger.child({
  requestId: 'req-8f4b2190',
  service: 'api-gateway'
});

requestLogger.info('Incoming request received');
// => 2026-11-17 18:00:00 [INFO] Incoming request received {"requestId":"req-8f4b2190","service":"api-gateway"}
```

### Persistent Context

All subsequent calls through the child logger automatically include its persistent metadata:

```js
requestLogger.info('Validating credentials');
requestLogger.warn('Slow external upstream API');
requestLogger.error('Transaction timed out');
```

### Nested Child Loggers

Child loggers can spawn further nested children, combining contextual metadata down the hierarchy:

```js
const appLogger = createLogger({ level: 'debug' });

// 1. Service-level context
const serviceLogger = appLogger.child({
  service: 'billing',
  environment: 'production'
});

// 2. Request-level context derived from the service logger
const requestLogger = serviceLogger.child({
  requestId: 'req-1234'
});

// 3. User-level context derived from the request logger
const userLogger = requestLogger.child({
  userId: 42
});

userLogger.info('User completed purchase');
// Context included: { service: "billing", environment: "production", requestId: "req-1234", userId: 42 }
```

### Context Override Behavior

When a nested child logger defines a key that already exists in its parent context, the child's value overrides the parent's value:

```js
const parent = logger.child({ service: 'api', version: 'v1' });
const child = parent.child({ service: 'auth-service' });

child.info('Service ready');
// Context included: { service: "auth-service", version: "v1" }
// Parent context remains: { service: "api", version: "v1" }
```

### Metadata Precedence

When an individual log call passes custom metadata containing a key that collides with persistent child context, the **persistent child context takes precedence**. This prevents individual log calls from accidentally spoofing or overriding critical service or request identities.

### Security and Sensitive-Data Redaction

Sensitive fields present in child context (e.g. `password`, `token`, `secret`, `authorization`, `apiKey`, or custom configured fields) are **automatically redacted** before output:

```js
const authenticatedLogger = logger.child({
  userId: 101,
  token: 'jwt.secret.bearerToken999'
});

authenticatedLogger.info('User authenticated');
// token is automatically redacted:
// => 2026-11-17 18:00:00 [INFO] User authenticated {"userId":101,"token":"[REDACTED]"}
```
