const fs = require('fs');


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
    fileName = './'+tribeName+".json";
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
    saveFileName = './'+fileName+".json"
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
