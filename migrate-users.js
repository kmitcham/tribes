// Migration script to update existing users.json with new fields
// Run this script with: node migrate-users.js

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

function migrateUsers() {
  const usersFile = './tribe-data/users.json';
  console.log('=== User Data Migration ===');
  console.log('Loading users from:', usersFile);

  if (!fs.existsSync(usersFile)) {
    console.log('No users.json file found. Creating empty structure.');
    if (!fs.existsSync('./tribe-data')) {
      fs.mkdirSync('./tribe-data', { recursive: true });
    }
    writeJson(usersFile, {});
    return;
  }

  const users = loadJson(usersFile);
  let migrationCount = 0;
  let cleanupCount = 0;
  const currentTime = new Date().toISOString();

  console.log(`Processing ${Object.keys(users).length} users...`);

  for (const [username, userData] of Object.entries(users)) {
    let needsUpdate = false;

    // Check if this is a properly structured user object
    if (!userData.name) {
      console.log(`⚠️  User '${username}' has invalid structure - cleaning up`);

      // Try to reconstruct a proper user object from available data
      const newUserData = {
        name: username,
        email: userData.email || `${username}@tribes.local`,
        password: userData.password || '',
        registeredAt: currentTime,
        lastConnected: currentTime,
      };

      users[username] = newUserData;
      cleanupCount++;
      continue;
    }

    // Add missing registeredAt field
    if (!userData.registeredAt) {
      userData.registeredAt = currentTime;
      needsUpdate = true;
      console.log(`📅 Added registeredAt for user: ${username}`);
    }

    // Add missing lastConnected field
    if (!userData.lastConnected) {
      userData.lastConnected = currentTime;
      needsUpdate = true;
      console.log(`🔌 Added lastConnected for user: ${username}`);
    }

    // Ensure email is set
    if (!userData.email) {
      userData.email = `${username}@tribes.local`;
      needsUpdate = true;
      console.log(`📧 Added default email for user: ${username}`);
    }

    if (needsUpdate) {
      migrationCount++;
    }
  }

  // Create backup before writing
  const backupFile = `${usersFile}.backup.${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  fs.copyFileSync(usersFile, backupFile);
  console.log(`💾 Backup created: ${backupFile}`);

  // Write updated users
  writeJson(usersFile, users);

  console.log(`✅ Migration completed!`);
  console.log(`   - ${migrationCount} users migrated with new fields`);
  console.log(`   - ${cleanupCount} users cleaned up and restructured`);
  console.log(`   - Total users: ${Object.keys(users).length}`);
}

if (require.main === module) {
  migrateUsers();
}
