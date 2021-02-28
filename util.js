const violencelib = require("./violence.js");


var bot;

function isColdSeason(gameState){
	return (gameState.seasonCounter%2 == 0);
}

function roll(count){
		if (!count){
			count = 3
		}
		total = 0
		for (var i = 0; i < count; i++){
			var roll = Math.trunc( Math.random ( ) * 6)+1
			total += roll
		}
		return total
}
function getYear(gameState){
	return gameState.seasonCounter/2;
}

function personByName(name, gameState){
	if (name == null){
		console.log('attempt to find person for null name '+name)
		return null
	}
	if (!gameState || gameState.population == null){
		console.log('no people yet, or gameState is otherwise null')
		return
	}
	if (name.indexOf('(') != -1){
		name = name.substring(0, name.indexOf('('))
		console.log('paren name was '+name)
	}
	var person = null
	var population = gameState.population;
	if (population[name] != null){
		 person = population[name]
	} else if (name && population[name.username] != null){
		person = population[name.username]
	} else if (name.indexOf('@') != -1 && population[name.substring(1)] != null){
		person = population[name.substring(1)]
	} else {
		for (match in population){
			if (match.toLowerCase() == name.toLowerCase()){
				person = population[match]
				break;
			}
		}
	}
	if (person != null){
		for (var type in person) {
			if (Object.prototype.hasOwnProperty.call( person, type)) {
				if (person[type] && person[type].constructor === Array && person[type].length == 0){
					console.log('deleting empty array for '+type)
					delete person[type]
				}
			}
		}
		return person
	}
	console.log("tribe "+gameState.name+" has no such person in population:"+name)
	return null
}



module.exports.gameStateMessage= (gameState) =>{
	var numAdults = (Object.keys(gameState.population)).length
	var numKids = (Object.keys(gameState.children)).length
	var message = "Year "+(gameState.seasonCounter/2)+', '
	season = 'warm season.'
	if (isColdSeason(gameState)){
		season = 'cold season.'
	}
	message+= season+'\n';
	message+= 'The '+gameState.name+' tribe has '+numAdults+' adults and '+numKids+' children\n'
	message+= 'The '+gameState.currentLocationName+' game track is at '+ gameState.gameTrack[gameState.currentLocationName]+'\n'
	if (gameState.demand){ 
		message+= '\nThe DEMAND is:'+gameState.demand+'\n'
		message+= violencelib.getFactionResult(gameState)
	}
	if (gameState.violence){ 
		message+= '\nVIOLENCE has erupted over this demand: '+gameState.violence+'\n'
		message+= violencelib.resolveViolence(gameState)+'\n';
	}
	if (gameState.workRound ) {message += '  (work round)'}
	if (gameState.foodRound ) {message += '  (food round)'}
	if (gameState.reproductionRound ) {message += '  (reproduction invitation order:'+gameState.reproductionList+')'}
	return message
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
module.exports.personByName = personByName;
module.exports.roll = roll;
module.exports.isColdSeason = isColdSeason;
module.exports.getYear = getYear;
module.exports.capitalizeFirstLetter = capitalizeFirstLetter;

function randomMemberName(population){
	nameList = Object.keys(population)
	var random =  Math.trunc( Math.random ( ) * nameList.length )
	return nameList[random]
}
module.exports.randomMemberName = randomMemberName;

function round(number){
	return Math.round(10*number)/10;
}
module.exports.round = round;

function removeSpecialChars(strVal){ 
	return strVal.replace(/[^a-zA-Z0-9_]+/g,'');
}
module.exports.removeSpecialChars = removeSpecialChars;

function messageChannel(message, gameState, argBot){
	if (!argBot){
		var Discord = require('discord.js');
		var localBot = new Discord.Client()
		argBot = localBot
		if (!argBot){
			console.log('no bot, no message to the channel')
			return;
		}
	}
	bot = argBot
	channel = argBot.channels.cache.find(channel => channel.name === gameState.name)
	if (channel){
		channel.send(message)
	} else {
		console.log('no channel found for '+gameState.name)
	}
}
module.exports.messageChannel = messageChannel;