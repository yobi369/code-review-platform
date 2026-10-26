'use strict';
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');

const AUTH_TIMEOUT_MS = 5000;
const MAX_COMMENT_LENGTH = 2000;
const MAX_MESSAGES_PER_MINUTE = 10;
const MAX_CONNECTIONS = 200;

let activeServer;
function attachWebSocket(server) {
  const wss = new WebSocket.WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 16 * 1024,
    perMessageDeflate: false,
    clientTracking: true
  });

  activeServer = wss;
  wss.on('connection', (socket, request) => {
    if (wss.clients.size > MAX_CONNECTIONS) {
      socket.close(1013, 'Server is busy');
      return;
    }
    const state = {
      authenticated: false,
      userId: null,
      username: null,
      reviewId: null,
      windowStart: Date.now(),
      messageCount: 0
    };
    socket.reviewState = state;
    let tokenExpiryTimer;
    const authTimer = setTimeout(() => {
      if (!state.authenticated && socket.readyState === WebSocket.OPEN) socket.close(1008, 'Authentication timeout');
    }, AUTH_TIMEOUT_MS);
    authTimer.unref();

    socket.on('message', async (raw, isBinary) => {
      try {
        if (isBinary) return socket.close(1003, 'Text messages only');
        let message;
        try { message = JSON.parse(raw.toString()); }
        catch { return socket.close(1007, 'Invalid JSON'); }
        if (!message || typeof message !== 'object' || Array.isArray(message)) return socket.close(1008, 'Invalid message');

        if (!state.authenticated) {
          if (message.type !== 'authenticate' || typeof message.token !== 'string' || typeof message.reviewId !== 'string') {
            return socket.close(1008, 'Authenticate before sending messages');
          }
          const secret = process.env.JWT_SECRET;
          if (!secret || secret.length < 32 || secret === 'your_jwt_secret' || !mongoose.isValidObjectId(message.reviewId)) {
            return socket.close(1008, 'Invalid authentication');
          }
          let decoded;
          try {
            decoded = jwt.verify(message.token, secret, {
              algorithms: ['HS256'],
              issuer: 'code-review-platform',
              audience: 'code-review-platform-api'
            });
          } catch {
            return socket.close(1008, 'Invalid authentication');
          }
          if (!decoded || typeof decoded.id !== 'string' || !mongoose.isValidObjectId(decoded.id)) {
            return socket.close(1008, 'Invalid authentication');
          }
          const [user, review] = await Promise.all([
            User.findById(decoded.id).select('username').lean(),
            Review.findOne({ _id: message.reviewId, $or: [{ owner: decoded.id }, { collaborators: decoded.id }] }).select('title comments').lean()
          ]);
          if (!user || !review) return socket.close(1008, 'Review access denied');
          state.authenticated = true;
          state.userId = String(decoded.id);
          state.username = user.username;
          state.reviewId = String(message.reviewId);
          clearTimeout(authTimer);
          if (Number.isFinite(decoded.exp)) {
            const remaining = decoded.exp * 1000 - Date.now();
            if (remaining <= 0) return socket.close(1008, 'Token expired');
            tokenExpiryTimer = setTimeout(() => socket.close(1008, 'Token expired'), remaining);
            tokenExpiryTimer.unref();
          }
          socket.send(JSON.stringify({
            type: 'authenticated',
            reviewId: state.reviewId,
            reviewTitle: review.title,
            comments: (review.comments || []).slice(-50).map((item) => ({
              username: item.username,
              text: item.text,
              createdAt: item.createdAt
            }))
          }));
          broadcast(wss, state.reviewId, { type: 'presence', username: state.username, state: 'joined' }, socket);
          return;
        }

        if (message.type !== 'comment' || typeof message.text !== 'string') {
          return socket.send(JSON.stringify({ type: 'error', error: 'Unsupported collaboration message' }));
        }
        const now = Date.now();
        if (now - state.windowStart >= 60000) {
          state.windowStart = now;
          state.messageCount = 0;
        }
        state.messageCount += 1;
        if (state.messageCount > MAX_MESSAGES_PER_MINUTE) {
          return socket.send(JSON.stringify({ type: 'error', error: 'Comment rate limit reached. Wait a minute and try again.' }));
        }
        const text = message.text.trim();
        if (!text || text.length > MAX_COMMENT_LENGTH) {
          return socket.send(JSON.stringify({ type: 'error', error: `Comments must be between 1 and ${MAX_COMMENT_LENGTH} characters.` }));
        }
        const reviewExists = await Review.exists({ _id: state.reviewId, $or: [{ owner: state.userId }, { collaborators: state.userId }] });
        if (!reviewExists) return socket.close(1008, 'Review access denied');
        const comment = { user: state.userId, username: state.username, text, createdAt: new Date() };
        await Review.updateOne(
          { _id: state.reviewId, $or: [{ owner: state.userId }, { collaborators: state.userId }] },
          { $push: { comments: { $each: [comment], $slice: -100 } } }
        );
        broadcast(wss, state.reviewId, {
          type: 'comment',
          comment: { username: state.username, text, createdAt: comment.createdAt.toISOString() }
        });
      } catch (error) {
        console.error('WebSocket collaboration error:', error && error.message);
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'error', error: 'Could not process collaboration message' }));
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      if (tokenExpiryTimer) clearTimeout(tokenExpiryTimer);
      if (state.authenticated) broadcast(wss, state.reviewId, { type: 'presence', username: state.username, state: 'left' }, socket);
    });
    socket.on('error', (error) => console.warn('WebSocket connection error:', error.message));
  });

  wss.on('error', (error) => console.error('WebSocket server error:', error.message));
  return wss;
}

function broadcast(wss, reviewId, payload, exclude) {
  const serialized = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN &&
        client.reviewState && client.reviewState.authenticated &&
        client.reviewState.reviewId === reviewId) {
      client.send(serialized);
    }
  }
}
function revokeUserAccess(reviewId, userId) {
  if (!activeServer) return;
  for (const client of activeServer.clients) {
    const state = client.reviewState;
    if (state && state.authenticated && state.reviewId === String(reviewId) && state.userId === String(userId)) {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'access_revoked' }));
      client.close(1008, 'Review access revoked');
    }
  }
}
module.exports = attachWebSocket;
module.exports.revokeUserAccess = revokeUserAccess;
