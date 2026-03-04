const WebSocket = require('ws');
const fs = require('fs');

console.log('=== WebSocket Authentication Test ===');

// Read initial user data
let users = {};
try {
    const userData = fs.readFileSync('./tribe-data/users.json', 'utf8');
    users = JSON.parse(userData);
} catch (err) {
    console.error('❌ Failed to load users.json:', err.message);
    process.exit(1);
}

const kevinUser = users['kevinmitcham'];
if (!kevinUser) {
    console.error('❌ User kevinmitcham not found in users.json');
    process.exit(1);
}

const initialLastConnected = kevinUser.lastConnected;
console.log('📖 Initial lastConnected:', initialLastConnected);

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
    console.log('🔌 Connected to WebSocket server');
    
    // Simulate authentication request
    const authMessage = {
        type: 'registerRequest',
        username: 'kevinmitcham',
        password: '', // Empty password for legacy path
        tribe: 'bug'
    };
    
    console.log('📤 Sending authentication request...');
    ws.send(JSON.stringify(authMessage));
});

ws.on('message', function message(data) {
    const response = JSON.parse(data.toString());
    console.log('📨 Received response:', response.type);
    
    if (response.type === 'auth') {
        if (response.status === 'success') {
            console.log('✅ Authentication successful');
        } else {
            console.log('❌ Authentication failed:', response.message);
        }
        
        // Close connection and check results
        ws.close();
    }
});

ws.on('close', function close() {
    console.log('🔒 WebSocket connection closed');
    
    // Wait a moment for file writes to complete
    setTimeout(() => {
        // Check if lastConnected was updated
        try {
            const updatedUserData = fs.readFileSync('./tribe-data/users.json', 'utf8');
            const updatedUsers = JSON.parse(updatedUserData);
            const updatedKevin = updatedUsers['kevinmitcham'];
            
            if (!updatedKevin) {
                console.error('❌ User kevinmitcham not found after authentication');
                process.exit(1);
            }
            
            const finalLastConnected = updatedKevin.lastConnected;
            
            console.log('\n📊 Results:');
            console.log('   Initial lastConnected: ', initialLastConnected);
            console.log('   Final lastConnected:   ', finalLastConnected);
            console.log('   Was updated:           ', finalLastConnected !== initialLastConnected);
            
            if (finalLastConnected !== initialLastConnected) {
                console.log('✅ SUCCESS: lastConnected was updated during authentication!');
            } else {
                console.log('❌ FAILURE: lastConnected was not updated');
            }
            
        } catch (err) {
            console.error('❌ Failed to read updated users.json:', err.message);
        }
    }, 1000); // Wait 1 second for file operations to complete
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
    process.exit(1);
});