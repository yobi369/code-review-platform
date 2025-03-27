const Review = require('../models/Review');

const initWebSocket = (wss) => {
  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const data = JSON.parse(message);
      if (data.type === 'comment') {
        const review = await Review.findOne({ roomId: data.roomId });
        if (!review) return;
        review.comments.push({ user: data.userId, text: data.text });
        await review.save();
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'comment',
              user: data.username,
              text: data.text,
              createdAt: new Date(),
            }));
          }
        });
      }
    });
  });
};

module.exports = { initWebSocket };
