import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitiveData } from '../src/redact.js';

describe('PrettyTrace Sensitive Data Redaction Utility', () => {
  const defaultRedactConfig = {
    enabled: true,
    fields: ['password', 'token', 'secret', 'authorization', 'apiKey'],
    replacement: '[REDACTED]'
  };

  it('1. Redacts default sensitive fields', () => {
    const input = {
      user: 'alice',
      password: 'mypassword',
      token: 'jwt-12345',
      secret: 'mysecret',
      authorization: 'Bearer xyz',
      apiKey: 'key-999'
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.user, 'alice');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.secret, '[REDACTED]');
    assert.equal(redacted.authorization, '[REDACTED]');
    assert.equal(redacted.apiKey, '[REDACTED]');
  });

  it('2. Redacts nested object properties', () => {
    const input = {
      service: 'payment',
      config: {
        timeout: 5000,
        credentials: {
          apiKey: 'secret-key-1'
        }
      }
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.service, 'payment');
    assert.equal(redacted.config.timeout, 5000);
    assert.equal(redacted.config.credentials.apiKey, '[REDACTED]');
  });

  it('3. Redacts objects inside arrays', () => {
    const input = {
      users: [
        { id: 1, password: 'p1' },
        { id: 2, password: 'p2' }
      ]
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.users[0].id, 1);
    assert.equal(redacted.users[0].password, '[REDACTED]');
    assert.equal(redacted.users[1].id, 2);
    assert.equal(redacted.users[1].password, '[REDACTED]');
  });

  it('4. Handles deeply nested arrays and objects', () => {
    const input = {
      matrix: [
        [
          { token: 'deepToken' }
        ]
      ]
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);
    assert.equal(redacted.matrix[0][0].token, '[REDACTED]');
  });

  it('5. Matches field names case-insensitively', () => {
    const input = {
      PASSWORD: 'p1',
      Password: 'p2',
      pAsSwOrD: 'p3',
      APIKEY: 'k1',
      ApiKey: 'k2',
      AUTHORIZATION: 'auth1'
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.PASSWORD, '[REDACTED]');
    assert.equal(redacted.Password, '[REDACTED]');
    assert.equal(redacted.pAsSwOrD, '[REDACTED]');
    assert.equal(redacted.APIKEY, '[REDACTED]');
    assert.equal(redacted.ApiKey, '[REDACTED]');
    assert.equal(redacted.AUTHORIZATION, '[REDACTED]');
  });

  it('6. Uses exact property-name matching rather than substring matching', () => {
    const customConfig = {
      enabled: true,
      fields: ['key'],
      replacement: '[REDACTED]'
    };

    const input = {
      key: 'exact-match',
      apiKey: 'leave-alone',
      monkey: 'leave-alone',
      keyring: 'not-redacted'
    };

    const redacted = redactSensitiveData(input, customConfig);

    assert.equal(redacted.key, '[REDACTED]');
    assert.equal(redacted.apiKey, 'leave-alone');
    assert.equal(redacted.monkey, 'leave-alone');
    assert.equal(redacted.keyring, 'not-redacted');
  });

  it('7. Supports custom sensitive field names', () => {
    const customConfig = {
      enabled: true,
      fields: ['creditCard', 'ssn', 'cvv'],
      replacement: '[REDACTED]'
    };

    const input = {
      creditCard: '4111-1111',
      ssn: '000-00-0000',
      cvv: 123,
      password: 'unconfigured-password'
    };

    const redacted = redactSensitiveData(input, customConfig);

    assert.equal(redacted.creditCard, '[REDACTED]');
    assert.equal(redacted.ssn, '[REDACTED]');
    assert.equal(redacted.cvv, '[REDACTED]');
    assert.equal(redacted.password, 'unconfigured-password');
  });

  it('8. Supports custom replacement strings', () => {
    const customConfig = {
      enabled: true,
      fields: ['token'],
      replacement: '***MASKED***'
    };

    const input = { token: 'secret-val' };
    const redacted = redactSensitiveData(input, customConfig);

    assert.equal(redacted.token, '***MASKED***');
  });

  it('9. Leaves values unchanged when redaction is disabled', () => {
    const disabledConfig = {
      enabled: false,
      fields: ['password'],
      replacement: '[REDACTED]'
    };

    const input = { password: 'mySecretPassword' };
    const result = redactSensitiveData(input, disabledConfig);

    assert.equal(result.password, 'mySecretPassword');
    assert.equal(result, input);
  });

  it('10. Preserves ordinary non-sensitive properties', () => {
    const input = {
      name: 'PrettyTrace',
      version: '1.0.0',
      count: 42,
      active: true,
      tags: ['fast', 'zero-dep']
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.deepEqual(redacted, input);
  });

  it('11. Handles primitive values safely', () => {
    assert.equal(redactSensitiveData('string', defaultRedactConfig), 'string');
    assert.equal(redactSensitiveData(12345, defaultRedactConfig), 12345);
    assert.equal(redactSensitiveData(true, defaultRedactConfig), true);
    assert.equal(redactSensitiveData(false, defaultRedactConfig), false);
    assert.equal(redactSensitiveData(null, defaultRedactConfig), null);
    assert.equal(redactSensitiveData(undefined, defaultRedactConfig), undefined);
    assert.equal(redactSensitiveData(100n, defaultRedactConfig), 100n);

    const sym = Symbol('id');
    assert.equal(redactSensitiveData(sym, defaultRedactConfig), sym);
  });

  it('12. Handles circular references without crashing', () => {
    const user = {
      name: 'suhani',
      password: 'plainPassword'
    };
    user.self = user;

    const redacted = redactSensitiveData(user, defaultRedactConfig);

    assert.equal(redacted.name, 'suhani');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.self, redacted);
    assert.notEqual(redacted, user);
  });

  it('13. Preserves shared object references without incorrectly treating them as circular', () => {
    const shared = {
      role: 'admin',
      token: 'jwt-999'
    };
    const input = {
      sessionA: shared,
      sessionB: shared
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.sessionA, redacted.sessionB);
    assert.notEqual(redacted.sessionA, shared);
    assert.equal(redacted.sessionA.token, '[REDACTED]');
    assert.equal(redacted.sessionB.token, '[REDACTED]');
    assert.equal(redacted.sessionA.role, 'admin');
  });

  it('14. Does not mutate the original input or its nested objects', () => {
    const original = {
      user: 'alice',
      password: 'clearTextPassword',
      nested: {
        token: 'secretToken',
        items: [{ apiKey: 'secretApiKey' }]
      }
    };

    const snapshot = JSON.stringify(original);

    redactSensitiveData(original, defaultRedactConfig);

    assert.equal(JSON.stringify(original), snapshot);
    assert.equal(original.password, 'clearTextPassword');
    assert.equal(original.nested.token, 'secretToken');
    assert.equal(original.nested.items[0].apiKey, 'secretApiKey');
  });

  it('15. Handles Date and RegExp safely', () => {
    const d = new Date('2026-11-17T12:00:00Z');
    const r = /pattern/gi;
    const input = { timestamp: d, pattern: r };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.deepEqual(redacted.timestamp, d);
    assert.notEqual(redacted.timestamp, d);
    assert.deepEqual(redacted.pattern, r);
    assert.notEqual(redacted.pattern, r);
  });

  it('16. Handles Error objects and their custom properties safely', () => {
    const err = new Error('Auth failed');
    err.code = 'ERR_AUTH';
    err.password = 'leakedPasswordInError';
    err.details = { token: 'leakedToken' };

    const redacted = redactSensitiveData(err, defaultRedactConfig);

    assert.equal(redacted.name, 'Error');
    assert.equal(redacted.message, 'Auth failed');
    assert.equal(redacted.code, 'ERR_AUTH');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.details.token, '[REDACTED]');
    assert.equal(err.password, 'leakedPasswordInError'); // Original not mutated
  });

  it('17. Handles Map and Set safely without breaking existing serialization', () => {
    const map = new Map();
    map.set('user', 'bob');
    map.set('password', 'secretBob');

    const set = new Set();
    set.add({ token: 'tokenInSet' });

    const input = { map, set };
    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.map.get('user'), 'bob');
    assert.equal(redacted.map.get('password'), '[REDACTED]');

    const setArray = Array.from(redacted.set);
    assert.equal(setArray[0].token, '[REDACTED]');
  });

  it('18. Handles throwing getters safely without crashing or leaking', () => {
    const input = {
      safe: 'ok',
      password: 'secretPassword',
      get broken() {
        throw new Error('Access denied to property');
      }
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);

    assert.equal(redacted.safe, 'ok');
    assert.equal(redacted.password, '[REDACTED]');
    assert.match(redacted.broken, /\[Unreadable: Access denied to property\]/);
  });

  it('19. Does not leak sensitive values when property access fails', () => {
    const input = {
      password: 'clearPassword',
      child: {
        get faulty() {
          throw new Error('Failure');
        }
      }
    };

    const redacted = redactSensitiveData(input, defaultRedactConfig);
    assert.equal(redacted.password, '[REDACTED]');
    assert.match(redacted.child.faulty, /\[Unreadable:/);
  });

  it('20. Handles undefined/empty redact configuration safely', () => {
    const input = { password: 'pass' };
    assert.equal(redactSensitiveData(input, null), input);
    assert.equal(redactSensitiveData(input, undefined), input);
  });

  it('21. Handles Map keys and values containing sensitive objects', () => {
    const map = new Map();
    const keyObj = { username: 'admin', apiKey: 'keyInMapKey' };
    const valObj = { secret: 'secretInMapVal', status: 'ready' };
    map.set(keyObj, valObj);

    const redacted = redactSensitiveData(map, defaultRedactConfig);

    let inspectedEntries = 0;
    for (const [k, v] of redacted.entries()) {
      inspectedEntries++;
      assert.equal(k.username, 'admin');
      assert.equal(k.apiKey, '[REDACTED]');
      assert.equal(v.secret, '[REDACTED]');
      assert.equal(v.status, 'ready');
    }
    assert.equal(inspectedEntries, 1);
  });

  it('22. Handles circular references involving Maps and Sets safely', () => {
    const map = new Map();
    const set = new Set();
    const obj = { token: 'circularToken', map, set };

    map.set('root', obj);
    set.add(obj);

    const redacted = redactSensitiveData(obj, defaultRedactConfig);

    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.map.get('root'), redacted);
    assert.equal(Array.from(redacted.set)[0], redacted);
  });

  it('23. Preserves shared references across Map and Set entries', () => {
    const shared = { password: 'sharedPassword', id: 77 };
    const map = new Map();
    const set = new Set();

    map.set('entry1', shared);
    map.set('entry2', shared);
    set.add(shared);

    const container = { map, set };
    const redacted = redactSensitiveData(container, defaultRedactConfig);

    const mapVal1 = redacted.map.get('entry1');
    const mapVal2 = redacted.map.get('entry2');
    const setVal = Array.from(redacted.set)[0];

    assert.equal(mapVal1, mapVal2);
    assert.equal(mapVal1, setVal);
    assert.equal(mapVal1.password, '[REDACTED]');
    assert.equal(mapVal1.id, 77);
  });

  it('24. Does not invoke getter on sensitive property names', () => {
    let getterCalled = false;
    const obj = {
      get password() {
        getterCalled = true;
        return 'unaccessedSecret';
      }
    };

    const redacted = redactSensitiveData(obj, defaultRedactConfig);

    assert.equal(getterCalled, false, 'Getter on sensitive property must not be executed');
    assert.equal(redacted.password, '[REDACTED]');
  });
});
