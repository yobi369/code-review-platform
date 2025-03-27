const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'comment') {
    const commentsDiv = document.getElementById('comments');
    commentsDiv.innerHTML += `<p><strong>${data.user}:</strong> ${data.text} <em>(${data.createdAt})</em></p>`;
  }
};

function sendComment() {
  const text = document.getElementById('commentInput').value;
  if (!text) return;
  ws.send(JSON.stringify({
    type: 'comment',
    roomId: roomId,
    userId: userId,
    username: username,
    text: text,
  }));
  document.getElementById('commentInput').value = '';
}
