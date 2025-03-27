const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/review');
const wss = require('./services/websocket');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api/review', reviewRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Code Review Platform API!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
