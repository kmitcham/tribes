const fs = require('fs');
const WebSocket = require('ws');
const locations = require('./locations.json');

const server = new WebSocket.Server({
  port: 8383,
});

function initGame(gameName){
	gameState = {}
	if (!gameName){
		console.log('init game without a name')
		gameName = ''
	}
	gameState.seasonCounter = 1
	gameState.gameTrack = {}
	gameState.name = gameName
	var d = new Date();
    var startStamp = d.toISOString();
	gameState.startStamp = startStamp;
	gameState.secretMating = true
	gameState.open = true
	gameState.conceptionCounter = 0
	gameState.population = {}
	gameState.graveyard = {}
	gameState.children = {}
	for (locationName in locations){
		gameState.gameTrack[locationName] = 1
	}
	gameState.currentLocationName = "veldt";
	gameState.round = "work"
	gameState.workRound = true;
	gameState.foodRound = false;
	gameState.reproductionRound = false;
	gameState.needChanceRoll = true
	gameState.canJerky = false
	console.log('Adding game '+gameName+' to the list of games')
	saveTribe(gameState);
	return gameState
}
module.exports.initGame = initGame;

function sendJson(json) {
	server.clients.forEach((client) => {
	  if (client.readyState === WebSocket.OPEN) {
		client.send(JSON.stringify(json));
	  }
	});
  }
  
  server.on('connection', (socket) => {
	console.log('Client connected');
  
	socket.on('close', () => {
	  console.log('Client disconnected');
	});
  });
  
function loadJson(fileName) {
	let rawdata = fs.readFileSync(fileName);
	if (!rawdata || rawdata.byteLength == 0 ){
		return {}
	}
	var parsedData = {}
	try {
		parsedData = JSON.parse(rawdata, {});	
	} catch (err){
		console.log('error parsing gamefile:'+err)
		throw err
	}
	return parsedData;
}
module.exports.loadJson = loadJson;

function loadTribe(tribeName){
    fileName = './'+tribeName+'/'+tribeName+".json";
    if (fs.existsSync(fileName)) {
        try {
            gameState = loadJson(fileName)
            return gameState;
		} catch(err){
            console.log('the json file load of '+fileName+' failed '+err)
        }
    } else {
        console.log("No file found for "+fileName);
    }
    return null
}
module.exports.loadTribe = loadTribe;

function redundantSave(fileName, jsonData){
	jsonString = JSON.stringify(jsonData,null,2), err => { 
		// Checking for errors 
		if (err) {
			console.log('error with jsonification of '+fileName+' '+err)
			throw err;
		}  
	}
	try {
		fs.writeFileSync(fileName, jsonString, (err) => {
			if (err) throw err;
		});
		checkedData = loadJson(fileName);
		checkedString = JSON.stringify(checkedData,null,2), err => { 
			// Checking for errors 
			if (err) {
				console.log('error 2 with jsonification of '+fileName+' '+err)
				throw err;
			}  
		}
		if ( checkedString === jsonString ){
			console.log('checked data match')
		} else {
			console.log('checked data did not match')
			redundantSave(fileName, jsonData)
		}
	} catch (err){
		console.log('save failed. '+err)
		console.log('redundant save unlinking file and trying again')
		redundantSave(fileName, jsonData)
	}
    console.log(fileName+" saved!");
}
async function saveGameState(gameState, fileName){
    var d = new Date();
    var saveTime = d.toISOString();
    gameState.lastSaved = saveTime;
    saveFileName = './'+fileName+'/'+fileName+".json"
	redundantSave(saveFileName, gameState)
    try {
        checkGame = loadJson(saveFileName) 
    } catch(err){
        console.log('Failed to load saved file for '+saveFileName )
        console.log(err)
    }
    console.log('saved file :'+saveFileName+' at '+saveTime)
}
async function saveTribe(gameState){
    tribeName = gameState.name;
    saveGameState(gameState, tribeName);
}
module.exports.saveTribe = saveTribe;

async function archiveTribe(gameState){
    var d = new Date();
    var saveTime = d.toISOString();
    gameState.lastSaved = saveTime
    archiveName = gameState.name+'-'+saveTime;
    saveGameState(gameState, archiveName);
}
module.exports.archiveTribe = archiveTribe;
