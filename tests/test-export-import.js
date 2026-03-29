// Test export/import functionality for referees
// Run this test with: node test-export-import.js

const WebSocket = require('ws');

// Configuration
const SERVER_URL = 'ws://localhost:8000';
const TEST_REFEREE = 'kevinmitcham'; // This user is already in referees.json
const TEST_TRIBE = 'bug';

// Test data
const testMessage = {
  playerName: TEST_REFEREE,
  password: '', // Use empty password for test user
  tribe: TEST_TRIBE,
};

console.log('=== Tribes Export/Import Test ===');
console.log(`Connecting to ${SERVER_URL}...`);

const ws = new WebSocket(SERVER_URL);

ws.on('open', function open() {
  console.log('Connected to server');

  // Test 1: Export game data
  console.log('\n--- Test 1: Export Game Data ---');
  const exportMessage = {
    type: 'exportGame',
    tribeName: TEST_TRIBE,
    tribe: TEST_TRIBE,
    playerName: TEST_REFEREE,
    password: '',
    clientId: Date.now().toString(),
  };

  ws.send(JSON.stringify(exportMessage));
});

ws.on('message', function message(data) {
  const response = JSON.parse(data);
  console.log('Received response:', response.type);

  switch (response.type) {
    case 'exportGameResponse':
      if (response.success) {
        console.log('✅ Export successful!');
        console.log(`   Tribe: ${response.tribeName}`);
        console.log(`   Filename: ${response.filename}`);
        console.log(
          `   Data size: ${JSON.stringify(response.exportData).length} bytes`
        );

        // Test 2: Import the same data back
        console.log('\n--- Test 2: Import Game Data ---');
        const importMessage = {
          type: 'importGame',
          tribeName: TEST_TRIBE,
          tribe: TEST_TRIBE,
          importData: response.exportData,
          playerName: TEST_REFEREE,
          password: '',
          clientId: Date.now().toString(),
        };

        setTimeout(() => {
          ws.send(JSON.stringify(importMessage));
        }, 1000);
      } else {
        console.log('❌ Export failed:', response.message);
        process.exit(1);
      }
      break;

    case 'importGameResponse':
      if (response.success) {
        console.log('✅ Import successful!');
        console.log(`   Tribe: ${response.tribeName}`);
        console.log(`   Backup: ${response.backupFilename}`);
        console.log('✅ All tests passed!');
      } else {
        console.log('❌ Import failed:', response.message);
      }

      ws.close();
      break;

    case 'error':
      console.log('❌ Server error:', response.message);
      ws.close();
      break;

    default:
      console.log(`Unexpected response type: ${response.type}`);
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('\nConnection closed');
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('Test timed out after 30 seconds');
  ws.close();
  process.exit(1);
}, 30000);
