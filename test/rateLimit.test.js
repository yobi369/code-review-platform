'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../middleware/rateLimit');

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('rate limiter allows requests within the configured limit', () => {
  const limit = createRateLimiter({ windowMs: 60000, max: 2 });
  for (let i = 0; i < 2; i++) {
    const res = response(); let called = false;
    limit({ ip: 'test-client', socket: {} }, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(res.statusCode, 200);
  }
});

test('rate limiter rejects excess requests and supplies retry metadata', () => {
  const limit = createRateLimiter({ windowMs: 60000, max: 1, message: 'Slow down' });
  const req = { ip: 'rate-limit-test-client', socket: {} };
  limit(req, response(), () => {});
  const res = response(); let called = false;
  limit(req, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error, 'Slow down');
  assert.ok(Number(res.headers['Retry-After']) >= 1);
});
