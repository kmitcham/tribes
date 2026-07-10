const fs = require('fs');
const path = require('path');
const locations = require('./locations.json');
const jsonUtils = require('./jsonUtils.js');
const populationLib = require('./population.js');
const pathSafety = require('./pathSafety.js');

// NOTE: Removed unused WebSocket server creation that was causing test failures
// const server = new WebSocket.Server({ port: 8383 });

function initGame(gameName) {
  const gameState = {};
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
  gameState.messages = {};
  for (const locationName in locations) {
    gameState.gameTrack[locationName] = 1;
  }
  gameState.currentLocationName = 'veldt';
  gameState.round = 'work';
  gameState.workRound = true;
  gameState.foodRound = false;
  gameState.reproductionRound = false;
  gameState.needChanceRoll = true;
  gameState.matingComplete = false;
  gameState.canJerky = false;
  // Only persist when the tribe name is a safe path segment.
  if (pathSafety.isSafeTribeName(gameName)) {
    saveTribe(gameState);
  }
  return gameState;
}
module.exports.initGame = initGame;

const loadJson = jsonUtils.loadJson;
module.exports.loadJson = loadJson;

function removeChildNameFields(children) {
  if (!children) {
    return;
  }
  for (const childName in children) {
    const child = children[childName];
    if (child && child['name']) {
      delete child['name'];
    }
  }
}

const VALID_ROUNDS = new Set(['work', 'food', 'reproduction']);

// Runtime historically used the boolean flags as the source of truth for
// which round is active, while `round` was often left stale as 'work'.
// Prefer a single exclusive flag when present so restarts don't snap back
// to work mid-season (see GitHub issue #141).
function exclusiveRoundFromFlags(gameState) {
  const work = gameState.workRound === true;
  const food = gameState.foodRound === true;
  const reproduction = gameState.reproductionRound === true;
  const trueCount = Number(work) + Number(food) + Number(reproduction);
  if (trueCount !== 1) {
    return null;
  }
  if (reproduction) {
    return 'reproduction';
  }
  if (food) {
    return 'food';
  }
  return 'work';
}

function syncRoundFields(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return;
  }

  const fromFlags = exclusiveRoundFromFlags(gameState);
  const roundValid = VALID_ROUNDS.has(gameState.round);

  if (fromFlags) {
    // Exclusive flags win, including when they disagree with a stale round.
    gameState.round = fromFlags;
  } else if (!roundValid) {
    gameState.round = 'work';
  }

  gameState.workRound = gameState.round === 'work';
  gameState.foodRound = gameState.round === 'food';
  gameState.reproductionRound = gameState.round === 'reproduction';
}

function normalizeLoadedGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return;
  }

  const parsedSeasonCounter = Number(gameState.seasonCounter);
  if (!Number.isFinite(parsedSeasonCounter) || parsedSeasonCounter < 1) {
    gameState.seasonCounter = 1;
  } else {
    gameState.seasonCounter = Math.floor(parsedSeasonCounter);
  }

  syncRoundFields(gameState);
}
module.exports.normalizeLoadedGameState = normalizeLoadedGameState;

function loadTribe(tribeName) {
  pathSafety.assertSafeTribeName(tribeName);
  const fileName = pathSafety.tribeMainFile(tribeName);
  if (fs.existsSync(fileName)) {
    try {
      const gameState = loadJson(fileName);
      normalizeLoadedGameState(gameState);
      removeChildNameFields(gameState.children);
      populationLib.normalizePopulationResources(gameState);
      try {
        const guardlib = require('./guardCode.js');
        guardlib.normalizeGuardAssignments(
          gameState.population,
          gameState.children
        );
      } catch (_err) {
        // Guard cleanup is best-effort on load.
      }
      return gameState;
    } catch (err) {
      // Fail closed: never init/overwrite when a main save exists but is unreadable.
      console.error(
        'the json file load of ' +
          fileName +
          ' failed ' +
          err +
          '; refusing to create a new game over existing save'
      );
      const loadError = new Error(
        `Failed to load tribe '${tribeName}' from ${fileName}: ${err.message}. Existing save was not overwritten; restore from a snapshot or ${fileName}.bak if available.`
      );
      loadError.code = 'TRIBE_LOAD_FAILED';
      loadError.tribeName = tribeName;
      loadError.fileName = fileName;
      throw loadError;
    }
  }

  console.log(
    'No file found for ' + fileName + ', initializing new tribe: ' + tribeName
  );

  // Ensure tribe directory exists
  const dir = pathSafety.tribeDir(tribeName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory: ' + dir);
  }

  // Initialize new tribe using existing initGame function
  return initGame(tribeName);
}
module.exports.loadTribe = loadTribe;

function actuallyWriteToDisk(fileName, jsonData) {
  removeChildNameFields(jsonData.children);
  populationLib.normalizePopulationResources(jsonData);
  syncRoundFields(jsonData);
  try {
    jsonUtils.writeJson(fileName, jsonData);
    const checkedData = loadJson(fileName);
    const jsonString = JSON.stringify(jsonData, null, 2);
    const checkedString = JSON.stringify(checkedData, null, 2);
    if (checkedString !== jsonString) {
      throw new Error(
        'Save verification failed for ' +
          fileName +
          ': on-disk JSON does not match in-memory state'
      );
    }
    console.log('checked data match');
  } catch (err) {
    console.log('save failed. ' + err);
    throw err;
  }
  console.log(fileName + ' saved!');
}

function saveGameState(gameState, tribeName) {
  pathSafety.assertSafeTribeName(tribeName);
  const d = new Date();
  let saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  gameState.lastSaved = saveTime;
  console.log('trying to save ' + tribeName);
  const saveFileName = pathSafety.tribeMainFile(tribeName);
  console.log('trying to save ' + tribeName + ' as ' + saveFileName);
  actuallyWriteToDisk(saveFileName, gameState);
  console.log('saved file :' + saveFileName + ' at ' + saveTime);
}
function saveTribe(gameState) {
  const tribeName = gameState.name;
  saveGameState(gameState, tribeName);
}
module.exports.saveTribe = saveTribe;

function archiveTribe(gameState) {
  pathSafety.assertSafeTribeName(gameState.name);
  const d = new Date();
  let saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  gameState.lastSaved = saveTime;

  // If game has ended, create final archive and clear main game file
  if (gameState.ended) {
    saveFinalGameState(gameState);
    clearMainGameFile(gameState.name);
    return;
  }

  // Otherwise, create regular snapshot and manage snapshot count
  const archiveBase = gameState.name + '-' + saveTime;
  const saveFileName = pathSafety.tribeSnapshotFile(
    gameState.name,
    archiveBase + '.json'
  );
  actuallyWriteToDisk(saveFileName, gameState);

  // Manage snapshots - keep only 3 most recent
  manageSnapshots(gameState.name);
}
module.exports.archiveTribe = archiveTribe;

// Save final game state with date-based filename
function saveFinalGameState(gameState) {
  pathSafety.assertSafeTribeName(gameState.name);
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
  const finalFileName = pathSafety.tribeSnapshotFile(
    gameState.name,
    `${gameState.name}-final-${dateStr}.json`
  );

  // Mark this as a final save
  gameState.finalSave = true;
  gameState.finalSaveDate = dateStr;

  actuallyWriteToDisk(finalFileName, gameState);
  console.log(`Saved final game state: ${finalFileName}`);
}
module.exports.saveFinalGameState = saveFinalGameState;

// Clear the main game file so tribe is ready for a new game
function clearMainGameFile(tribeName) {
  const mainGameFile = pathSafety.tribeMainFile(tribeName);

  if (fs.existsSync(mainGameFile)) {
    try {
      fs.unlinkSync(mainGameFile);
      console.log(`Cleared main game file for ${tribeName} - ready for new game`);
    } catch (err) {
      console.error(`Failed to clear main game file for ${tribeName}: ${err.message}`);
      throw new Error(`Failed to clear game file: ${err.message}`);
    }
  }
}
module.exports.clearMainGameFile = clearMainGameFile;

// Manage snapshots to keep only 3 most recent
function manageSnapshots(tribeName) {
  const dir = pathSafety.tribeDir(tribeName);

  if (!fs.existsSync(dir)) {
    return;
  }

  // Get all snapshot files (exclude main game file and final saves)
  const files = fs
    .readdirSync(dir)
    .filter((file) => {
      return (
        file.includes('-') &&
        file.endsWith('.json') &&
        !file.includes('-final-') &&
        file !== `${tribeName}.json`
      );
    })
    .map((file) => {
      const filePath = path.join(dir, file);
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
