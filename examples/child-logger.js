import { createLogger } from '../src/index.js';

// 1. Root application logger
const appLogger = createLogger({
  level: 'debug'
});

console.log('--- PrettyTrace Child Loggers & Contextual Logging ---\n');

appLogger.info('Application bootstrap initialized');

// 2. Derive a child logger with persistent service context
const apiLogger = appLogger.child({
  service: 'api-gateway',
  environment: 'production'
});

apiLogger.info('Gateway routes registered');

// 3. Derive a request-specific child logger from the service logger
const requestLogger = apiLogger.child({
  requestId: 'req-8f4b2190',
  userId: 'usr_5501'
});

requestLogger.info('Incoming HTTP request received', {
  method: 'POST',
  endpoint: '/v1/payments/charge'
});

// 4. Log structured payload with sensitive data (automatically redacted)
requestLogger.info('Payment authorization initiated', {
  amount: 49.99,
  currency: 'USD',
  password: 'userSuppliedPassword123',
  token: 'tok_live_secretToken999'
});

// 5. Warnings and errors carry the full contextual metadata
requestLogger.warn('Slow payment gateway response', {
  latencyMs: 1420
});

requestLogger.success('Transaction approved and recorded');
