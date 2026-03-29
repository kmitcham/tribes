const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const locations = require('./locations.json');

// NOTE: Removed unused WebSocket server creation that was causing test failures
// const server = new WebSocket.Server({ port: 8383 });

function initGame(gameName) {
  gameState = {};
  if (!gameName) {
    console.log('init game without a name');
    gameName = '';
  }
  gameState.seasonCounter = 1;
  gameState.gameTrack = {};
  gameState.name = gameName;
  var d = new Date();
  var startStamp = d.toISOString();
  gameState.startStamp = startStamp;
  gameState.secretMating = true;
  gameState.open = true;
  gameState.conceptionCounter = 0;
  gameState.consumed = 0;
  gameState.spoiled = 0;
  gameState.foodAcquired = 0;
  gameState.population = {};
  gameState.graveyard = {};
  gameState.children = {};
  messages = {};
  for (locationName in locations) {
    gameState.gameTrack[locationName] = 1;
  }
  gameState.currentLocationName = 'veldt';
  gameState.round = 'work';
  gameState.workRound = true;
  gameState.foodRound = false;
  gameState.reproductionRound = false;
  gameState.needChanceRoll = true;
  gameState.canJerky = false;
  saveTribe(gameState);
  return gameState;
}
module.exports.initGame = initGame;

function loadJson(fileName) {
  let rawdata = fs.readFileSync(fileName);
  if (!rawdata || rawdata.byteLength == 0) {
    return {};
  }
  var parsedData = {};
  try {
    parsedData = JSON.parse(rawdata, {});
  } catch (err) {
    console.log('error parsing gamefile:' + err);
    throw err;
  }
  return parsedData;
}
module.exports.loadJson = loadJson;

function loadTribe(tribeName) {
  fileName = './tribe-data/' + tribeName + '/' + tribeName + '.json';
  if (fs.existsSync(fileName)) {
    try {
      gameState = loadJson(fileName);
      return gameState;
    } catch (err) {
      console.log('the json file load of ' + fileName + ' failed ' + err);
    }
  } else {
    console.log(
      'No file found for ' + fileName + ', initializing new tribe: ' + tribeName
    );

    // Ensure tribe directory exists
    const tribeDir = './tribe-data/' + tribeName;
    if (!fs.existsSync(tribeDir)) {
      fs.mkdirSync(tribeDir, { recursive: true });
      console.log('Created directory: ' + tribeDir);
    }

    // Initialize new tribe using existing initGame function
    return initGame(tribeName);
  }
  return null;
}
module.exports.loadTribe = loadTribe;

function actuallyWriteToDisk(fileName, jsonData) {
  (jsonString = JSON.stringify(jsonData, null, 2)),
    (err) => {
      // Checking for errors
      if (err) {
        console.log('error with jsonification of ' + fileName + ' ' + err);
        throw err;
      }
    };
  try {
    fs.writeFileSync(fileName, jsonString, (err) => {
      if (err) throw err;
    });
    checkedData = loadJson(fileName);
    (checkedString = JSON.stringify(checkedData, null, 2)),
      (err) => {
        // Checking for errors
        if (err) {
          console.log('error 2 with jsonification of ' + fileName + ' ' + err);
          throw err;
        }
      };
    if (checkedString === jsonString) {
      console.log('checked data match');
    } else {
      console.log('checked data did not match');
    }
  } catch (err) {
    console.log('save failed. ' + err);
  }
  console.log(fileName + ' saved!');
}

async function saveGameState(gameState, tribeName) {
  var d = new Date();
  var saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  gameState.lastSaved = saveTime;
  console.log('trying to save ' + tribeName);
  saveFileName = './tribe-data/' + tribeName + '/' + tribeName + '.json';
  console.log('trying to save ' + tribeName + ' as ' + saveFileName);
  actuallyWriteToDisk(saveFileName, gameState);
  try {
    checkGame = loadJson(saveFileName);
  } catch (err) {
    console.log('Failed to load saved file for ' + saveFileName);
    console.log(err);
  }
  console.log('saved file :' + saveFileName + ' at ' + saveTime);
}
async function saveTribe(gameState) {
  tribeName = gameState.name;
  saveGameState(gameState, tribeName);
}
module.exports.saveTribe = saveTribe;

async function archiveTribe(gameState) {
  var d = new Date();
  var saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  gameState.lastSaved = saveTime;

  // If game has ended, create final archive and clear main game file
  if (gameState.ended) {
    await saveFinalGameState(gameState);
    await clearMainGameFile(gameState.name);
    return;
  }

  // Otherwise, create regular snapshot and manage snapshot count
  archiveName = gameState.name + '-' + saveTime;
  saveFileName = './tribe-data/' + gameState.name + '/' + archiveName + '.json';
  actuallyWriteToDisk(saveFileName, gameState);

  // Manage snapshots - keep only 3 most recent
  await manageSnapshots(gameState.name);
}
module.exports.archiveTribe = archiveTribe;

// Save final game state with date-based filename
async function saveFinalGameState(gameState) {
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
  const finalFileName = `./tribe-data/${gameState.name}/${gameState.name}-final-${dateStr}.json`;

  // Mark this as a final save
  gameState.finalSave = true;
  gameState.finalSaveDate = dateStr;

  actuallyWriteToDisk(finalFileName, gameState);
  console.log(`Saved final game state: ${finalFileName}`);
}
module.exports.saveFinalGameState = saveFinalGameState;

// Clear the main game file so tribe is ready for a new game
async function clearMainGameFile(tribeName) {
  const mainGameFile = `./tribe-data/${tribeName}/${tribeName}.json`;

  if (fs.existsSync(mainGameFile)) {
    fs.unlinkSync(mainGameFile);
    console.log(`Cleared main game file for ${tribeName} - ready for new game`);
  }
}
module.exports.clearMainGameFile = clearMainGameFile;

// Manage snapshots to keep only 3 most recent
async function manageSnapshots(tribeName) {
  const tribeDir = `./tribe-data/${tribeName}`;

  if (!fs.existsSync(tribeDir)) {
    return;
  }

  // Get all snapshot files (exclude main game file and final saves)
  const files = fs
    .readdirSync(tribeDir)
    .filter((file) => {
      return (
        file.includes('-') &&
        file.endsWith('.json') &&
        !file.includes('-final-') &&
        file !== `${tribeName}.json`
      );
    })
    .map((file) => {
      const filePath = path.join(tribeDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        mtime: stats.mtime,
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

  // Keep only 3 most recent snapshots
  if (files.length > 3) {
    const filesToDelete = files.slice(3);
    filesToDelete.forEach((file) => {
      fs.unlinkSync(file.path);
      console.log(`Deleted old snapshot: ${file.name}`);
    });
  }
}
module.exports.manageSnapshots = manageSnapshots;
