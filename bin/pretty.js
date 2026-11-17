#!/usr/bin/env node

import { createLogger } from '../src/index.js';

const VERSION = '1.0.0';

const HELP_TEXT = `Usage: pretty [options] [message...]

A lightweight, customizable, dependency-free logging utility for Node.js.

Options:
  -l, --level <level>        Log level: debug, info, warn, error (default: "info")
  -m, --method <method>      Logging method to use: debug, info, success, warn, error (default: "info")
  --no-colors                Disable ANSI color styling
  --no-timestamps            Disable timestamp prefixes
  -j, --json                 Output message as parsed JSON / structured object
  -c, --context <json>       Persistent context metadata as JSON object
  -v, --version              Output version number
  -h, --help                 Display this help message

Examples:
  pretty "Server started on port 3000"
  pretty -m success "Build completed successfully"
  pretty -l debug -m debug "Connection pool initialized"
  pretty -m warn "Memory threshold reached (80%)"
  pretty -m error "Failed to connect to database"
  pretty -j '{"user":"alice","token":"secret123"}'
  pretty -c '{"service":"auth","env":"production"}' "User authenticated"
  echo '{"event":"login"}' | pretty --json
`;

async function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

export async function runCli(argv = process.argv.slice(2)) {
  let level = 'info';
  let method = 'info';
  let colors = undefined;
  let timestamps = undefined;
  let isJson = false;
  let contextJson = null;
  const messages = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      console.log(HELP_TEXT);
      return 0;
    }

    if (arg === '-v' || arg === '--version') {
      console.log(VERSION);
      return 0;
    }

    if (arg === '--no-colors') {
      colors = false;
      continue;
    }

    if (arg === '--colors') {
      colors = true;
      continue;
    }

    if (arg === '--no-timestamps') {
      timestamps = false;
      continue;
    }

    if (arg === '--timestamps') {
      timestamps = true;
      continue;
    }

    if (arg === '-j' || arg === '--json') {
      isJson = true;
      continue;
    }

    if (arg === '-l' || arg === '--level') {
      i++;
      if (i >= argv.length) {
        console.error('Error: Option "-l, --level" requires an argument.');
        return 1;
      }
      level = argv[i];
      continue;
    }

    if (arg.startsWith('--level=')) {
      level = arg.slice('--level='.length);
      continue;
    }

    if (arg === '-m' || arg === '--method') {
      i++;
      if (i >= argv.length) {
        console.error('Error: Option "-m, --method" requires an argument.');
        return 1;
      }
      method = argv[i];
      continue;
    }

    if (arg.startsWith('--method=')) {
      method = arg.slice('--method='.length);
      continue;
    }

    if (arg === '-c' || arg === '--context') {
      i++;
      if (i >= argv.length) {
        console.error('Error: Option "-c, --context" requires an argument.');
        return 1;
      }
      contextJson = argv[i];
      continue;
    }

    if (arg.startsWith('--context=')) {
      contextJson = arg.slice('--context='.length);
      continue;
    }

    messages.push(arg);
  }

  // Read from stdin if no messages given on CLI
  const stdinContent = await readStdin();
  if (messages.length === 0 && stdinContent) {
    messages.push(stdinContent);
  }

  // Validate method
  const validMethods = ['debug', 'info', 'success', 'warn', 'error'];
  if (!validMethods.includes(method)) {
    console.error(`Error: Unknown logging method "${method}". Valid methods: ${validMethods.join(', ')}.`);
    return 1;
  }

  // Build logger options
  const loggerOpts = { level };
  if (colors !== undefined) loggerOpts.colors = colors;
  if (timestamps !== undefined) loggerOpts.timestamps = timestamps;

  let logger;
  try {
    logger = createLogger(loggerOpts);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }

  // Parse context if provided
  if (contextJson) {
    try {
      const parsedContext = JSON.parse(contextJson);
      logger = logger.child(parsedContext);
    } catch (err) {
      console.error(`Error: Failed to parse context JSON: ${err.message}`);
      return 1;
    }
  }

  // Prepare arguments to log
  if (messages.length === 0) {
    console.log(HELP_TEXT);
    return 0;
  }

  const logArgs = messages.map((msg) => {
    if (isJson) {
      try {
        return JSON.parse(msg);
      } catch {
        return msg;
      }
    }
    return msg;
  });

  logger[method](...logArgs);
  return 0;
}

// Auto-run if executed directly as CLI
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('/bin/pretty.js') ||
  process.argv[1].endsWith('/bin/pretty') ||
  process.argv[1].endsWith('/pretty')
);

if (isDirectExecution) {
  runCli().then((code) => {
    if (code !== 0) {
      process.exit(code);
    }
  }).catch((err) => {
    console.error(`Unexpected CLI Error: ${err.message}`);
    process.exit(1);
  });
}
