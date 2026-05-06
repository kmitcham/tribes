const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8000');
ws.on('open', () => {
  ws.send(
    JSON.stringify({
      type: 'manageUsers',
      action: 'resetPassword',
      playerName: 'Kevin',
      targetUser: 'test1',
      newPassword: 'newpassword123',
    })
  );
});
ws.on('message', (data) => {
  console.log('RECEIVED', data.toString());
  process.exit(0);
});
ws.on('error', console.error);
