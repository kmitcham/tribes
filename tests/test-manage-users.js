const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8000');
ws.on('open', () => {
  ws.send(
    JSON.stringify({
      type: 'manageUsers',
      action: 'list',
      playerName: 'Kevin',
    })
  );
});
ws.on('message', (data) => {
  console.log(data.toString());
  process.exit(0);
});
