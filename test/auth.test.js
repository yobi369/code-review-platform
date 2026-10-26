'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');

const secret = 'unit-test-secret-that-is-longer-than-thirty-two-characters';
function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}
function request(token) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {}, userId: undefined };
}
function signedToken(claims = {}) {
  return jwt.sign({ id: '507f1f77bcf86cd799439011', ...claims }, secret, {
    expiresIn: '1m', issuer: 'code-review-platform', audience: 'code-review-platform-api', algorithm: 'HS256'
  });
}

test('auth middleware accepts a correctly scoped bearer token', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  try {
    const req = request(signedToken());
    const res = response();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.userId, '507f1f77bcf86cd799439011');
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('auth middleware rejects missing tokens', () => {
  const req = request();
  const res = response();
  let nextCalled = false;
  authenticate(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('auth middleware rejects tokens with the wrong issuer', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  try {
    const badToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, secret, { expiresIn: '1m', issuer: 'untrusted-issuer', audience: 'code-review-platform-api' });
    const res = response();
    let nextCalled = false;
    authenticate(request(badToken), res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
