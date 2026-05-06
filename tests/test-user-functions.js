// Direct test of the user tracking functions
// Run this test with: node test-user-functions.js

const fs = require('fs');

function loadJson(fileName) {
  try {
    const rawdata = fs.readFileSync(fileName);
    if (!rawdata || rawdata.byteLength === 0) {
      return {};
    }
    return JSON.parse(rawdata);
  } catch (err) {
    console.log('Error parsing file ' + fileName + ': ' + err);
    return {};
  }
}

function actuallyWriteToDisk(fileName, jsonData) {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(fileName, jsonString);
    console.log(fileName + ' saved!');
  } catch (err) {
    console.log('Save failed for ' + fileName + ': ' + err);
  }
}

async function testUserTracking() {
  console.log('=== Direct User Function Test ===');

  const usersFile = './tribe-data/users.json';
  const testUser = 'kevinmitcham';

  // Read current user data
  console.log('📖 Loading user data...');
  const usersDict = loadJson(usersFile);

  if (!usersDict[testUser]) {
    console.error(`❌ User ${testUser} not found!`);
    return;
  }

  const user = usersDict[testUser];
  const originalLastConnected = user.lastConnected;

  console.log('📅 Original user data:');
  console.log(`   name: ${user.name}`);
  console.log(`   email: ${user.email}`);
  console.log(`   password: "${user.password}"`);
  console.log(`   registeredAt: ${user.registeredAt}`);
  console.log(`   lastConnected: ${user.lastConnected}`);

  // Simulate the lastConnected update
  console.log('\\n🔄 Simulating lastConnected update...');
  const newTimestamp = new Date().toISOString();
  user.lastConnected = newTimestamp;

  console.log(`📝 Setting lastConnected to: ${newTimestamp}`);

  // Write to disk
  console.log('💾 Writing to disk...');
  actuallyWriteToDisk(usersFile, usersDict);

  // Read back to verify
  console.log('🔍 Reading back from disk to verify...');
  const verifyUsers = loadJson(usersFile);
  const verifyUser = verifyUsers[testUser];

  console.log('\\n📊 Results:');
  console.log(`   Original lastConnected: ${originalLastConnected}`);
  console.log(`   New lastConnected:      ${verifyUser.lastConnected}`);
  console.log(
    `   Timestamps match:       ${verifyUser.lastConnected === newTimestamp}`
  );

  if (verifyUser.lastConnected === newTimestamp) {
    console.log('✅ SUCCESS: Direct file update works correctly!');
  } else {
    console.log('❌ FAILURE: File update failed');
  }

  // Test the empty password path logic
  console.log('\\n🧪 Testing empty password logic...');
  if (!user.password || user.password === '') {
    console.log('✅ User has empty password - should use legacy path');
  } else {
    console.log('❌ User has password - will use authentication path');
  }
}

if (require.main === module) {
  testUserTracking().catch(console.error);
}
