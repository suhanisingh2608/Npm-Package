import { createLogger } from '../src/index.js';

// Create a logger with default configuration
const logger = createLogger();

console.log('--- PrettyTrace Basic Demonstration ---\n');

// 1. All five logger methods
logger.debug('Debugging application state (hidden by default "info" level)');
logger.info('Server started on port 3000');
logger.success('Database connected successfully');
logger.warn('High memory usage detected (78%)');
logger.error('Failed to connect to secondary cache');

// 2. Logging with multiple arguments
logger.info('User', 'alice_dev', 'logged in from IP', '192.168.1.5');

// 3. Logging structured objects
logger.info('Active session details:', {
  sessionId: 'sess_9823412',
  authenticated: true,
  roles: ['developer', 'admin'],
  lastActive: new Date().toISOString()
});
