import { isPlainObject } from './utils.js';

/**
 * Recursively redacts sensitive properties from values based on redaction configuration.
 * - Matching is case-insensitive and exact (e.g., 'password' matches 'Password', but not 'myPassword').
 * - Handles nested objects, arrays, Maps, Sets, Errors, Dates, RegExps, and primitives.
 * - Circular references are preserved safely using a WeakMap.
 * - Shared references preserve their shared identity in the resulting structure.
 * - Never mutates the original input.
 * - Property-access failures (such as throwing getters) are safely handled.
 *
 * @param {unknown} value The value to redact.
 * @param {object} [redactConfig] The redact configuration object.
 * @param {boolean} [redactConfig.enabled=true] Whether redaction is enabled.
 * @param {string[]} [redactConfig.fields=[]] Sensitive field names to redact.
 * @param {string} [redactConfig.replacement='[REDACTED]'] Replacement string for redacted values.
 * @param {WeakMap<object, unknown>} [seen=new WeakMap()] Map to track already-redacted objects for cycle and shared-reference preservation.
 * @returns {unknown} Redacted copy of the value (or original value if primitive or redaction disabled).
 */
export function redactSensitiveData(value, redactConfig, seen = new WeakMap()) {
  // If redaction is disabled or value is a primitive/null, return directly
  if (!redactConfig || redactConfig.enabled === false) {
    return value;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Preserve circular references and shared object identities
  if (seen.has(value)) {
    return seen.get(value);
  }

  const replacement = typeof redactConfig.replacement === 'string'
    ? redactConfig.replacement
    : '[REDACTED]';

  // Build a lookup set of lowercase field names for O(1) case-insensitive exact matching
  const fieldsSet = new Set(
    Array.isArray(redactConfig.fields)
      ? redactConfig.fields.map((f) => String(f).toLowerCase())
      : []
  );

  // Helper to determine if a key is sensitive
  function isSensitiveKey(key) {
    if (typeof key !== 'string') {
      return false;
    }
    return fieldsSet.has(key.toLowerCase());
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (let i = 0; i < value.length; i++) {
      try {
        copy[i] = redactSensitiveData(value[i], redactConfig, seen);
      } catch (err) {
        copy[i] = `[Unreadable: ${err && err.message ? err.message : String(err)}]`;
      }
    }
    return copy;
  }

  // Handle Dates and RegExps
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  // Handle Error instances
  if (value instanceof Error) {
    // Create a copy of the Error preserving name, message, stack
    const errorCopy = new (value.constructor || Error)(value.message);
    errorCopy.name = value.name;
    errorCopy.stack = value.stack;
    seen.set(value, errorCopy);

    // Inspect custom enumerable and own properties
    const propertyNames = Object.getOwnPropertyNames(value);
    for (const key of propertyNames) {
      if (key === 'name' || key === 'message' || key === 'stack') {
        continue;
      }
      if (isSensitiveKey(key)) {
        errorCopy[key] = replacement;
      } else {
        try {
          errorCopy[key] = redactSensitiveData(value[key], redactConfig, seen);
        } catch (err) {
          errorCopy[key] = `[Unreadable: ${err && err.message ? err.message : String(err)}]`;
        }
      }
    }
    return errorCopy;
  }

  // Handle Maps
  if (value instanceof Map) {
    const mapCopy = new Map();
    seen.set(value, mapCopy);
    for (const [key, val] of value.entries()) {
      // Map keys: if key is an object, redact its sensitive properties; if key name matches sensitive key, redact value
      const redactedKey = typeof key === 'object' && key !== null
        ? redactSensitiveData(key, redactConfig, seen)
        : key;
      const redactedVal = isSensitiveKey(key)
        ? replacement
        : redactSensitiveData(val, redactConfig, seen);
      mapCopy.set(redactedKey, redactedVal);
    }
    return mapCopy;
  }

  // Handle Sets
  if (value instanceof Set) {
    const setCopy = new Set();
    seen.set(value, setCopy);
    for (const val of value.values()) {
      setCopy.add(redactSensitiveData(val, redactConfig, seen));
    }
    return setCopy;
  }

  // Handle Plain Objects and other generic object types
  const copy = isPlainObject(value) ? {} : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);

  // Read own enumerable properties
  const keys = Object.keys(value);
  for (const key of keys) {
    if (isSensitiveKey(key)) {
      copy[key] = replacement;
    } else {
      try {
        const val = value[key];
        copy[key] = redactSensitiveData(val, redactConfig, seen);
      } catch (err) {
        // If a getter throws an error, record safely without leaking unredacted data
        copy[key] = `[Unreadable: ${err && err.message ? err.message : String(err)}]`;
      }
    }
  }

  return copy;
}
