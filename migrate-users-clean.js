// Improved migration script to clean up and standardize user data structure
// Run this script with: node migrate-users-clean.js

const fs = require('fs');
const path = require('path');

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

function writeJson(fileName, jsonData) {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(fileName, jsonString);
    console.log(fileName + ' updated!');
  } catch (err) {
    console.log('Save failed for ' + fileName + ': ' + err);
  }
}

function cleanAndMigrateUsers() {
  const usersFile = './tribe-data/users.json';
  console.log('=== User Data Cleanup & Migration ===');
  console.log('Loading users from:', usersFile);

  if (!fs.existsSync(usersFile)) {
    console.log('No users.json file found. Creating empty structure.');
    if (!fs.existsSync('./tribe-data')) {
      fs.mkdirSync('./tribe-data', { recursive: true });
    }
    writeJson(usersFile, {});
    return;
  }

  const oldUsers = loadJson(usersFile);
  const newUsers = {};
  let migrationCount = 0;
  const currentTime = new Date().toISOString();

  console.log(`Processing ${Object.keys(oldUsers).length} users...`);

  for (const [username, oldUserData] of Object.entries(oldUsers)) {
    console.log(`🔄 Processing user: ${username}`);

    // Create clean user structure based on current registerUser format
    const cleanUser = {
      name: oldUserData.name || username,
      email: oldUserData.email || `${username}@tribes.local`,
      password: oldUserData.password || '',
      registeredAt: oldUserData.registeredAt || currentTime,
      lastConnected: oldUserData.lastConnected || currentTime,
    };

    // Ensure email doesn't have invalid values
    if (cleanUser.email === 'asdf' || cleanUser.email === '') {
      cleanUser.email = `${username}@tribes.local`;
      console.log(`   📧 Fixed invalid email for ${username}`);
    }

    // Log what we're preserving/changing
    const oldFieldCount = Object.keys(oldUserData).length;
    const newFieldCount = Object.keys(cleanUser).length;

    if (oldFieldCount !== newFieldCount) {
      console.log(
        `   🧹 Cleaned structure: ${oldFieldCount} → ${newFieldCount} fields`
      );
    }

    newUsers[username] = cleanUser;
    migrationCount++;
  }

  // Create backup before writing
  const backupFile = `${usersFile}.backup-clean.${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  fs.copyFileSync(usersFile, backupFile);
  console.log(`💾 Backup created: ${backupFile}`);

  // Write cleaned users
  writeJson(usersFile, newUsers);

  console.log(`✅ Cleanup & migration completed!`);
  console.log(`   - ${migrationCount} users processed and cleaned`);
  console.log(`   - Total users: ${Object.keys(newUsers).length}`);

  // Show sample of new structure
  console.log('\n📋 Sample user structure:');
  const sampleUser = Object.values(newUsers)[0];
  console.log(JSON.stringify(sampleUser, null, 2));
}

if (require.main === module) {
  cleanAndMigrateUsers();
}
