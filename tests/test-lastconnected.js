// Test lastConnected tracking functionality
// Run this test with: node test-lastconnected.js

const WebSocket = require('ws');

// Configuration
const SERVER_URL = 'ws://localhost:8000';
const TEST_USER = 'kevinmitcham'; // Existing user in users.json
const TEST_PASSWORD = ''; // Empty password for this user

console.log('=== Testing lastConnected Tracking ===');
console.log(`Testing with user: ${TEST_USER}`);

// Read current lastConnected time before connecting
const fs = require('fs');
function readUserData() {
  try {
    const usersData = JSON.parse(fs.readFileSync('./tribe-data/users.json', 'utf8'));
    return usersData[TEST_USER];
  } catch (error) {
    console.error('Error reading user data:', error.message);
    return null;
  }
}

const initialUser = readUserData();
if (!initialUser) {
  console.error('❌ Test user not found in users.json');
  process.exit(1);
}

console.log(`📅 Initial lastConnected: ${initialUser.lastConnected}`);
console.log(`📅 Initial registeredAt: ${initialUser.registeredAt}`);
console.log(`\n🔌 Connecting to server to trigger lastConnected update...`);

const ws = new WebSocket(SERVER_URL);

ws.on('open', function open() {
  console.log('✅ Connected to server');
  
  // Send authentication request
  const authMessage = {
    type: 'registerRequest',
    playerName: TEST_USER,
    password: TEST_PASSWORD,
    email: initialUser.email,
    tribe: 'bug',
    clientId: Date.now().toString()
  };
  
  console.log('🔐 Sending authentication...');
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', function message(data) {
  const response = JSON.parse(data);
  console.log(`📨 Received: ${response.type}`);
  
  if (response.type === 'registration') {
    if (response.label === 'success') {
      console.log('✅ Authentication successful!');
      
      // Wait a moment then check the updated user data
      setTimeout(() => {
        const updatedUser = readUserData();
        if (updatedUser) {
          console.log(`\n📊 Results:`);
          console.log(`   Initial lastConnected: ${initialUser.lastConnected}`);
          console.log(`   Updated lastConnected: ${updatedUser.lastConnected}`);
          console.log(`   registeredAt (unchanged): ${updatedUser.registeredAt}`);
          
          const initialTime = new Date(initialUser.lastConnected);
          const updatedTime = new Date(updatedUser.lastConnected);
          
          if (updatedTime > initialTime) {
            console.log('✅ SUCCESS: lastConnected was updated!');
            console.log(`   Time difference: ${updatedTime - initialTime}ms`);
          } else {
            console.log('❌ FAILURE: lastConnected was not updated');
          }
        }
        
        ws.close();
      }, 500);
      
    } else {
      console.log('❌ Authentication failed:', response.content);
      ws.close();
    }
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 Connection closed');
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timed out after 15 seconds');
  ws.close();
  process.exit(1);
}, 15000);