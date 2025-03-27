const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Message from server:', message);
};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};

// Function to send a message
function sendMessage(msg) {
    socket.send(JSON.stringify(msg));
}
