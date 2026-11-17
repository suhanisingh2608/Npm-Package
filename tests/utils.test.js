import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimestamp,
  isPlainObject,
  cloneValue,
  safeStringify
} from '../src/utils.js';

describe('PrettyTrace Utilities', () => {
  describe('getTimestamp()', () => {
    it('returns a formatted timestamp string matching YYYY-MM-DD HH:mm:ss', () => {
      const ts = getTimestamp();
      assert.match(ts, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('correctly zero-pads month, day, hour, minute, and second', () => {
      // 2026-03-05 07:09:04
      const d = new Date(2026, 2, 5, 7, 9, 4);
      const ts = getTimestamp(d);
      assert.equal(ts, '2026-03-05 07:09:04');
    });

    it('falls back to current time when provided an invalid date', () => {
      const ts = getTimestamp(new Date('invalid'));
      assert.match(ts, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('isPlainObject()', () => {
    it('returns true for object literals and Object.create(null)', () => {
      assert.equal(isPlainObject({}), true);
      assert.equal(isPlainObject({ a: 1 }), true);
      assert.equal(isPlainObject(Object.create(null)), true);
    });

    it('returns false for arrays, null, undefined, and primitives', () => {
      assert.equal(isPlainObject([]), false);
      assert.equal(isPlainObject([1, 2, 3]), false);
      assert.equal(isPlainObject(null), false);
      assert.equal(isPlainObject(undefined), false);
      assert.equal(isPlainObject(123), false);
      assert.equal(isPlainObject('string'), false);
      assert.equal(isPlainObject(true), false);
      assert.equal(isPlainObject(Symbol('s')), false);
      assert.equal(isPlainObject(10n), false);
    });

    it('returns false for class instances, Dates, RegExps, Errors, Map, and Set', () => {
      class CustomClass {}
      assert.equal(isPlainObject(new CustomClass()), false);
      assert.equal(isPlainObject(new Date()), false);
      assert.equal(isPlainObject(/abc/), false);
      assert.equal(isPlainObject(new Error('err')), false);
      assert.equal(isPlainObject(new Map()), false);
      assert.equal(isPlainObject(new Set()), false);
      assert.equal(isPlainObject(() => {}), false);
    });
  });

  describe('cloneValue()', () => {
    it('preserves primitive values', () => {
      assert.equal(cloneValue(42), 42);
      assert.equal(cloneValue('hello'), 'hello');
      assert.equal(cloneValue(true), true);
      assert.equal(cloneValue(null), null);
      assert.equal(cloneValue(undefined), undefined);
      assert.equal(cloneValue(100n), 100n);
    });

    it('deeply clones nested plain objects and arrays', () => {
      const original = {
        name: 'test',
        count: 1,
        meta: {
          tags: ['a', 'b', { id: 99 }]
        }
      };

      const clone = cloneValue(original);

      assert.deepEqual(clone, original);
      assert.notEqual(clone, original);
      assert.notEqual(clone.meta, original.meta);
      assert.notEqual(clone.meta.tags, original.meta.tags);
      assert.notEqual(clone.meta.tags[2], original.meta.tags[2]);

      // Verify mutating the clone does not mutate the original
      clone.meta.tags[2].id = 1000;
      assert.equal(original.meta.tags[2].id, 99);
    });

    it('handles repeated references by preserving shared identity in the clone', () => {
      const shared = { token: 'abc' };
      const obj = { first: shared, second: shared };

      const clone = cloneValue(obj);
      assert.equal(clone.first, clone.second);
      assert.notEqual(clone.first, shared);

      clone.first.token = 'def';
      assert.equal(clone.second.token, 'def');
      assert.equal(shared.token, 'abc');
    });

    it('handles circular references in objects safely', () => {
      const obj = { name: 'circular' };
      obj.self = obj;

      const clone = cloneValue(obj);
      assert.equal(clone.name, 'circular');
      assert.equal(clone.self, clone);
      assert.notEqual(clone, obj);
    });

    it('handles circular references in arrays safely', () => {
      const arr = [1, 2];
      arr.push(arr);

      const clone = cloneValue(arr);
      assert.equal(clone[0], 1);
      assert.equal(clone[1], 2);
      assert.equal(clone[2], clone);
      assert.notEqual(clone, arr);
    });

    it('safely clones Dates and RegExps', () => {
      const d = new Date('2026-11-17T12:00:00Z');
      const clonedDate = cloneValue(d);
      assert.deepEqual(clonedDate, d);
      assert.notEqual(clonedDate, d);

      const r = /abc/gi;
      const clonedReg = cloneValue(r);
      assert.deepEqual(clonedReg, r);
      assert.notEqual(clonedReg, r);
    });
  });

  describe('safeStringify()', () => {
    it('stringifies regular objects and arrays with custom indentation', () => {
      const obj = { a: 1, b: [2, 3] };
      const str = safeStringify(obj, 2);
      assert.equal(str, JSON.stringify(obj, null, 2));
    });

    it('serializes repeated references to the same object normally without marking as [Circular]', () => {
      const shared = { id: 10, label: 'config' };
      const container = { propA: shared, propB: shared };

      const str = safeStringify(container);
      assert.equal(str.includes('[Circular]'), false);
      assert.match(str, /"propA":\s*\{\s*"id":\s*10,\s*"label":\s*"config"\s*\}/);
      assert.match(str, /"propB":\s*\{\s*"id":\s*10,\s*"label":\s*"config"\s*\}/);
    });

    it('handles actual circular references by outputting [Circular]', () => {
      const obj = { name: 'root' };
      obj.nested = { parent: obj };

      const str = safeStringify(obj);
      assert.match(str, /"parent":\s*"\[Circular\]"/);
    });

    it('handles circular references inside arrays', () => {
      const arr = [1];
      arr.push(arr);

      const str = safeStringify(arr);
      assert.match(str, /"\[Circular\]"/);
    });

    it('handles BigInt without crashing', () => {
      const data = { count: 9007199254740991000n };
      const str = safeStringify(data);
      assert.match(str, /"count":\s*"9007199254740991000n"/);

      assert.equal(safeStringify(123n), '123n');
    });

    it('handles Error objects capturing name, message, stack, and custom enumerable properties', () => {
      const err = new Error('Database failure');
      err.code = 'ERR_DB_TIMEOUT';
      err.status = 504;

      const str = safeStringify(err);
      assert.match(str, /"name":\s*"Error"/);
      assert.match(str, /"message":\s*"Database failure"/);
      assert.match(str, /"code":\s*"ERR_DB_TIMEOUT"/);
      assert.match(str, /"status":\s*504/);
      assert.match(str, /"stack":/);
    });

    it('handles nested Error objects within plain objects', () => {
      const data = {
        status: 'failed',
        error: new TypeError('Invalid parameter')
      };

      const str = safeStringify(data);
      assert.match(str, /"name":\s*"TypeError"/);
      assert.match(str, /"message":\s*"Invalid parameter"/);
    });

    it('handles undefined, functions, and symbols', () => {
      assert.equal(safeStringify(undefined), 'undefined');

      function testFn() {}
      assert.equal(safeStringify(testFn), '[Function: testFn]');
      assert.equal(safeStringify(() => {}), '[Function]');

      const sym = Symbol('token');
      assert.equal(safeStringify(sym), 'Symbol(token)');

      const objWithFn = {
        fn: function custom() {},
        sym: Symbol('key')
      };
      const res = safeStringify(objWithFn);
      assert.match(res, /"fn":\s*"\[Function: custom\]"/);
      assert.match(res, /"sym":\s*"Symbol\(key\)"/);
    });

    it('safely catches throwing property getters without crashing', () => {
      const obj = {
        valid: 'ok',
        get broken() {
          throw new Error('Access denied to property');
        }
      };

      const str = safeStringify(obj);
      assert.match(str, /\[Unserializable: Access denied to property\]/);
    });

    it('does not mutate the original object', () => {
      const original = {
        name: 'test',
        details: { count: 1 }
      };
      const snapshot = JSON.stringify(original);

      safeStringify(original);
      assert.equal(JSON.stringify(original), snapshot);
    });
  });
});
