'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/review');
const attachWebSocket = require('./services/websocket');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '256kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 100 }));
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: false, maxAge: isProduction ? '1h' : 0 }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database: ready ? 'connected' : 'disconnected' });
});
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use('/api/auth', authRoutes);
app.use('/api/review', reviewRoutes);

app.use((err, _req, res, _next) => {
  // Do not expose stack traces or provider/database details to clients.
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ error: 'Invalid JSON body' });
  console.error('Unhandled request error:', isProduction ? (err && err.message) : err);
  return res.status(500).json({ error: 'Internal server error' });
});

let server;
let webSocketServer;
async function start() {
  await connectDB();
  server = http.createServer(app);
  webSocketServer = attachWebSocket(server);
  server.listen(PORT, () => console.log(`Code Review Platform listening on port ${PORT}`));
}
function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (webSocketServer) for (const client of webSocketServer.clients) client.close(1001, 'Server shutting down');
  if (server) server.close(() => {
    if (webSocketServer) webSocketServer.close();
    mongoose.connection.close(false).finally(() => process.exit(0));
  });
  else mongoose.connection.close(false).finally(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start().catch((err) => {
    console.error('Startup failed:', err && err.message ? err.message : 'unknown error');
    process.exit(1);
  });
}
module.exports = app;
