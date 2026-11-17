/**
 * Returns the current local date and time as a formatted 24-hour string.
 * Format: YYYY-MM-DD HH:mm:ss
 *
 * @param {Date} [date=new Date()] Date object to format. Defaults to current date/time.
 * @returns {string} Formatted 24-hour timestamp.
 */
export function getTimestamp(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Checks whether a given value is a plain JavaScript object.
 * Returns true only for objects created by the Object constructor or with an Object.prototype or null prototype.
 * Returns false for arrays, null, undefined, primitives, Dates, Errors, RegExps, Map, Set, and class instances.
 *
 * @param {unknown} value The value to inspect.
 * @returns {boolean} True if the value is a plain object, false otherwise.
 */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deeply clones a value supporting plain objects, arrays, and primitive values.
 * Safely handles circular references by reusing the cloned instance.
 * Preserves common primitives without modifying the original input.
 *
 * @param {unknown} value The value to clone.
 * @param {WeakMap<object, unknown>} [seen=new WeakMap()] Tracking map for circular reference detection.
 * @returns {unknown} Deep clone of the value.
 */
export function cloneValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Handle circular references and shared identities
  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (let i = 0; i < value.length; i++) {
      copy[i] = cloneValue(value[i], seen);
    }
    return copy;
  }

  if (isPlainObject(value)) {
    const copy = {};
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
      copy[key] = cloneValue(value[key], seen);
    }
    return copy;
  }

  // For non-plain objects (e.g. Date, RegExp, or other instances), handle common types gracefully
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  return value;
}

/**
 * Safely converts JavaScript values into readable JSON strings.
 * - Handles circular references gracefully with `[Circular]`.
 * - Allows repeated references to the same object across different branches.
 * - Handles BigInt values by converting to string representation.
 * - Handles Error objects by capturing name, message, stack, and custom properties.
 * - Handles undefined, functions, and symbols cleanly.
 * - Safely catches throwing property getters and serializes with a descriptive fallback.
 * - Avoids mutating the original input.
 *
 * @param {unknown} value The value to stringify.
 * @param {number|string} [spacing=2] JSON indentation spacing.
 * @returns {string} Safe JSON string or stringified representation.
 */
export function safeStringify(value, spacing = 2) {
  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'function') {
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (value instanceof Error) {
    const errObj = {
      name: value.name || 'Error',
      message: value.message || '',
      stack: value.stack
    };
    // Include custom properties if attached to error
    for (const key of Object.keys(value)) {
      if (!(key in errObj)) {
        errObj[key] = value[key];
      }
    }
    return safeStringify(errObj, spacing);
  }

  // Track active ancestor chain in depth-first traversal to detect true circularity
  // without false-flagging sibling/repeated references to the same object.
  const ancestors = [];

  try {
    const result = JSON.stringify(
      value,
      function replacer(key, val) {
        // Handle BigInt
        if (typeof val === 'bigint') {
          return `${val.toString()}n`;
        }

        // Handle Errors within structures
        if (val instanceof Error) {
          const errObj = {
            name: val.name || 'Error',
            message: val.message || '',
            stack: val.stack
          };
          for (const k of Object.keys(val)) {
            if (!(k in errObj)) {
              errObj[k] = val[k];
            }
          }
          return errObj;
        }

        // Handle functions and symbols inside objects/arrays
        if (typeof val === 'function') {
          return val.name ? `[Function: ${val.name}]` : '[Function]';
        }

        if (typeof val === 'symbol') {
          return val.toString();
        }

        // Handle circular references along the active ancestor path
        if (val !== null && typeof val === 'object') {
          while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
            ancestors.pop();
          }
          if (ancestors.includes(val)) {
            return '[Circular]';
          }
          ancestors.push(val);
        }

        return val;
      },
      spacing
    );

    return result === undefined ? 'undefined' : result;
  } catch (err) {
    // If a getter throws or unexpected serialization error occurs
    const errMsg = err && err.message ? err.message : String(err);
    return `[Unserializable: ${errMsg}]`;
  }
}
