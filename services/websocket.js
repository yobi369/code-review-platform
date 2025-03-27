const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log('Received:', message);
        // Handle incoming messages and broadcast to other clients if needed
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

module.exports = wss;
