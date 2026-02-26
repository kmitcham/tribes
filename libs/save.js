const fs = require('fs');
const WebSocket = require('ws');
const locations = require('./locations.json');

const server = new WebSocket.Server({
  port: 8383,
});

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
    console.log('No file found for ' + fileName + ', initializing new tribe: ' + tribeName);
    
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
  ((jsonString = JSON.stringify(jsonData, null, 2)),
    (err) => {
      // Checking for errors
      if (err) {
        console.log('error with jsonification of ' + fileName + ' ' + err);
        throw err;
      }
    });
  try {
    fs.writeFileSync(fileName, jsonString, (err) => {
      if (err) throw err;
    });
    checkedData = loadJson(fileName);
    ((checkedString = JSON.stringify(checkedData, null, 2)),
      (err) => {
        // Checking for errors
        if (err) {
          console.log('error 2 with jsonification of ' + fileName + ' ' + err);
          throw err;
        }
      });
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
  archiveName = gameState.name + '-' + saveTime;
  saveFileName = './tribe-data/' + gameState.name + '/' + archiveName + '.json';
  actuallyWriteToDisk(saveFileName, gameState);
}
module.exports.archiveTribe = archiveTribe;
