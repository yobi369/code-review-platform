'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const { WebSocket } = require('ws');
const app = require('../app');
const connectDB = require('../config/db');
const attachWebSocket = require('../services/websocket');
const User = require('../models/User');
const Review = require('../models/Review');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for integration tests.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('A test JWT_SECRET of at least 32 characters is required.');
  process.exit(1);
}

const suffix = Date.now().toString(36);
const ownerName = 'it-owner-' + suffix;
const collaboratorName = 'it-collab-' + suffix;
const legacyName = 'it-legacy-' + suffix;
const password = 'Integration-test-password-2026!';
let server;
let wss;
let baseUrl;
let ownerToken;
let collaboratorToken;
let reviewId;
const sockets = [];

async function request(path, options = {}, token) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) };
  const response = await fetch(baseUrl + path, { ...options, headers });
  let body = {};
  try { body = await response.json(); } catch {}
  return { status: response.status, body };
}
async function registerAndLogin(username) {
  const registration = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
  assert.equal(registration.status, 201, 'registration should succeed');
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  assert.equal(login.status, 200, 'login should succeed');
  assert.ok(login.body.token, 'login should return a bearer token');
  return login.body.token;
}
function connectRoom(token, id) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(baseUrl.replace(/^http/, 'ws') + '/ws');
    sockets.push(socket);
    const timer = setTimeout(() => reject(new Error('WebSocket authentication timed out')), 8000);
    socket.once('error', (error) => { clearTimeout(timer); reject(error); });
    socket.on('message', (raw) => {
      let payload;
      try { payload = JSON.parse(raw.toString()); } catch { return; }
      if (payload.type === 'authenticated') {
        clearTimeout(timer);
        resolve({ socket, payload });
      }
    });
    socket.once('open', () => socket.send(JSON.stringify({ type: 'authenticate', token, reviewId: id })));
  });
}
function waitForMessage(socket, type, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for WebSocket message: ' + type));
    }, timeoutMs);
    function onMessage(raw) {
      let payload;
      try { payload = JSON.parse(raw.toString()); } catch { return; }
      if (payload.type === type) {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve(payload);
      }
    }
    socket.on('message', onMessage);
  });
}
function expectRoomDenied(token, id) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(baseUrl.replace(/^http/, 'ws') + '/ws');
    sockets.push(socket);
    const timer = setTimeout(() => reject(new Error('Expected WebSocket access denial timed out')), 8000);
    socket.once('error', (error) => { clearTimeout(timer); reject(error); });
    socket.once('close', (code) => { clearTimeout(timer); resolve(code); });
    socket.once('open', () => socket.send(JSON.stringify({ type: 'authenticate', token, reviewId: id })));
    socket.on('message', (raw) => {
      let payload;
      try { payload = JSON.parse(raw.toString()); } catch { return; }
      if (payload.type === 'authenticated') {
        clearTimeout(timer);
        socket.terminate();
        reject(new Error('Revoked collaborator was incorrectly authenticated'));
      }
    });
  });
}
function waitForClose(socket, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket close timed out')), timeoutMs);
    socket.once('close', (code) => { clearTimeout(timer); resolve(code); });
  });
}

async function main() {
  await connectDB();
  server = http.createServer(app);
  wss = attachWebSocket(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port;

  try {
    // Simulate an account created by the original version, which stored plaintext passwords.
    await User.create({ username: legacyName, password });
    const legacyLogin = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: legacyName, password }) });
    assert.equal(legacyLogin.status, 200, 'legacy account should be able to log in once');
    assert.ok(legacyLogin.body.token, 'legacy login should return a bearer token');
    const migratedLegacyUser = await User.findOne({ username: legacyName }).select('+password');
    assert.match(migratedLegacyUser.password, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/, 'legacy password must be replaced with a scrypt hash');
    const badLegacyLogin = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: legacyName, password: 'wrong-password-value' }) });
    assert.equal(badLegacyLogin.status, 401, 'incorrect legacy password must be rejected after migration');

    ownerToken = await registerAndLogin(ownerName);
    const duplicate = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: ownerName, password }) });
    assert.equal(duplicate.status, 409, 'duplicate usernames should be rejected with a conflict');
    collaboratorToken = await registerAndLogin(collaboratorName);

    const created = await request('/api/review', {
      method: 'POST',
      body: JSON.stringify({ title: 'Integration review ' + suffix, description: 'End-to-end collaboration verification' })
    }, ownerToken);
    assert.equal(created.status, 201, 'owner should create a review');
    reviewId = String(created.body.review._id);

    const ownerReviews = await request('/api/review', {}, ownerToken);
    assert.ok(ownerReviews.body.some((item) => String(item._id) === reviewId), 'owner should see own review');
    const privateReviews = await request('/api/review', {}, collaboratorToken);
    assert.ok(!privateReviews.body.some((item) => String(item._id) === reviewId), 'review should be private before invitation');

    const invite = await request('/api/review/' + reviewId + '/collaborators', {
      method: 'POST', body: JSON.stringify({ username: collaboratorName })
    }, ownerToken);
    assert.equal(invite.status, 200, 'owner should invite an existing account');

    const sharedReviews = await request('/api/review', {}, collaboratorToken);
    assert.ok(sharedReviews.body.some((item) => String(item._id) === reviewId), 'collaborator should see invited review');

    const ownerRoom = await connectRoom(ownerToken, reviewId);
    const collaboratorRoom = await connectRoom(collaboratorToken, reviewId);
    assert.equal(ownerRoom.payload.reviewId, reviewId);
    assert.equal(collaboratorRoom.payload.reviewId, reviewId);

    const ownerReceivesComment = waitForMessage(ownerRoom.socket, 'comment');
    const collaboratorReceivesComment = waitForMessage(collaboratorRoom.socket, 'comment');
    collaboratorRoom.socket.send(JSON.stringify({ type: 'comment', text: 'Integration comment survives and broadcasts.' }));
    const [ownerEvent, collaboratorEvent] = await Promise.all([ownerReceivesComment, collaboratorReceivesComment]);
    assert.equal(ownerEvent.comment.text, 'Integration comment survives and broadcasts.');
    assert.equal(collaboratorEvent.comment.username, collaboratorName);

    const reconnect = await connectRoom(collaboratorToken, reviewId);
    assert.ok(reconnect.payload.comments.some((comment) => comment.text === 'Integration comment survives and broadcasts.'), 'comment should persist in MongoDB');
    reconnect.socket.close(1000, 'Test complete');

    const closeCollaborator = waitForClose(collaboratorRoom.socket);
    const revoke = await request('/api/review/' + reviewId + '/collaborators/' + encodeURIComponent(collaboratorName), { method: 'DELETE' }, ownerToken);
    assert.equal(revoke.status, 200, 'owner should revoke collaborator access');
    assert.equal(await closeCollaborator, 1008, 'revocation should terminate the live session');

    const afterRevoke = await request('/api/review', {}, collaboratorToken);
    assert.ok(!afterRevoke.body.some((item) => String(item._id) === reviewId), 'revoked collaborator should lose review access');

    assert.equal(await expectRoomDenied(collaboratorToken, reviewId), 1008, 'revoked collaborator must not reconnect');
    console.log('Integration tests passed: legacy password migration, duplicate registration, review isolation, invitation, live comment persistence/broadcast, and access revocation.');
  } finally {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.terminate();
    }
    if (wss) await new Promise((resolve) => wss.close(resolve));
    if (server && server.listening) await new Promise((resolve) => server.close(resolve));
    if (reviewId) await Review.deleteOne({ _id: reviewId });
    await User.deleteMany({ username: { $in: [ownerName, collaboratorName, legacyName] } });
    await mongoose.connection.close();
  }
}

main().catch((error) => {
  console.error('Integration tests failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
