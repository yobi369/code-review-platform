require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/review');
const { initWebSocket } = require('./services/websocket');
const { connectDB } = require('./config/db');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/auth', authRoutes);
app.use('/review', reviewRoutes);

// WebSocket initialization
initWebSocket(wss);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
