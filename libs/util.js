const violencelib = require("./violence.js");
const killlib = require("./kill.js");
const reproLib = require("./reproduction.js");
const savelib = require("./save.js");
const locations = require('./locations.json');
const text = require("./textprocess.js")
const roll = require( "./dice.js") 

var referees = ["kevinmitcham", "@kevinmitcham"]
module.exports.referees = referees;

function isColdSeason(gameState){
	return (gameState.seasonCounter%2 == 0);
}


function getYear(gameState){
	return gameState.seasonCounter/2;
}
module.exports.getYear = getYear;

function gameStateMessage(gameState) {
	var numAdults = (Object.keys(gameState.population)).length
	var numKids = (Object.keys(gameState.children)).length
	var message = "Year "+(gameState.seasonCounter/2)+', '
	season = 'warm season.'
	if (gameState.seasonCounter%2==0){
		season = 'cold season.'
	}
	message+= season+'\n';
	message+= 'The '+gameState.name+' tribe has '+numAdults+' adults and '+numKids+' children\n'
	message+= 'The '+gameState.currentLocationName+' game track is at '+ gameState.gameTrack[gameState.currentLocationName]+'\n'
	if (gameState.demand){ 
		message+= '\nThe DEMAND is:'+gameState.demand+'\n'
		//message+= violencelib.getFactionResult(gameState, bot)
	}
	if (gameState.violence){ 
		message+= '\nVIOLENCE has erupted over this demand: '+gameState.violence+'\n'
		//message+= violencelib.resolveViolence(gameState, bot)+'\n';
	}
	if (gameState.workRound ) {message += '  (work round)'}
	if (gameState.foodRound ) {message += '  (food round)'}
	if (gameState.reproductionRound){
		if (gameState.secretMating){
			if (reproLib.canStillInvite(gameState)){
				message += ' (reproduction round: awaiting invitations or !pass from '+reproLib.canStillInvite(gameState)+')'
			} else {
				message += ' (reproduction round, awaiting chance and/or migration )'
			}
		} else {
			message += ' (reproduction invitation order:'+gameState.reproductionList+')'
		}
	}
	return message
}
module.exports.gameStateMessage = gameStateMessage


function countByType(dictionary, key, value){
	count = 0
	for (elementName in dictionary){
		element = dictionary[elementName]
		if (element[key] && element[key] == value){ count++}
	}
	return count
}
module.exports.countByType = countByType;
