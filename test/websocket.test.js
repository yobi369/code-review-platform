'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { WebSocket } = require('ws');
const app = require('../app');
const attachWebSocket = require('../services/websocket');

let server;
let webSocketServer;
let baseUrl;
let previousSecret;

test.before(async () => {
  previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'websocket-test-secret-long-enough-for-security-checks';
  server = http.createServer(app);
  webSocketServer = attachWebSocket(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'ws://127.0.0.1:' + server.address().port + '/ws';
});

test.after(async () => {
  if (webSocketServer) {
    for (const client of webSocketServer.clients) client.terminate();
    await new Promise((resolve) => webSocketServer.close(resolve));
  }
  if (server && server.listening) await new Promise((resolve) => server.close(resolve));
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('WebSocket rejects unauthenticated collaboration messages', async () => {
  const socket = new WebSocket(baseUrl);
  const closed = new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.once('close', (code) => resolve(code));
  });
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ type: 'comment', text: 'must not be accepted' }));
  const code = await closed;
  assert.equal(code, 1008);
});

test('WebSocket rejects invalid bearer tokens before database access', async () => {
  const socket = new WebSocket(baseUrl);
  const closed = new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.once('close', (code) => resolve(code));
  });
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({
    type: 'authenticate',
    token: 'not-a-valid-jwt',
    reviewId: '507f1f77bcf86cd799439011'
  }));
  const code = await closed;
  assert.equal(code, 1008);
});
