const violencelib = require("./violence.js");
const reproLib = require("./reproduction.js");
const { EmbedBuilder } = require('discord.js');

var referees = ["kevinmitcham", "@kevinmitcham"]
module.exports.referees = referees;

function isColdSeason(gameState){
	return (gameState.seasonCounter%2 == 0);
}
function cleanUpMessage(msg){
	if (msg && msg.channel && msg.channel.name ){
		console.log(' cleaning up '+msg.content.split(' ')+' in channel '+msg.channel.name )
		try {
			msg.delete({timeout: 200}); 
		} catch  (err){
			console.log("Failed to delete message; maybe a drone thing?")
		}
	}
}
module.exports.cleanUpMessage = cleanUpMessage;

function decrementSickness(population, gameState, bot){
	for (personName in population){
		person = population[personName]
		if (person.isSick && person.isSick > 0 ){
			person.isSick = person.isSick -1;
			console.log(person.name+" decrement sickness  "+person.isSick)
		}
		if (person.isInjured && person.isInjured > 0 ){
			person.isInjured = person.isInjured -1;
			console.log(person.name+" decrement injury  "+person.isSick)
		}
		if (person.isSick < 1){
			delete person.isSick
			messagePlayerName(person.name, "You have recovered from your illness.", gameState, bot)
			console.log(person.name+" recover sickness  ")
		}
		if (person.isInjured < 1){
			messagePlayerName(person.name, "You have recovered from your injury.", gameState, bot)
			delete person.isInjured
			console.log(person.name+" recover injury  ")
		}
	}
}
module.exports.decrementSickness = decrementSickness;


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

async function updateNicknames(guild, gameState){
	population = gameState.population
	if (!guild){
		return
	}
	members = guild.members
	for (personName in population){
		person = population[personName]
		if (person && person.handle && person.handle.id){
			try {
				var id = person.handle.id
				var someMember;
				await members.fetch(id)
					.then(function(value){
						someMember = value
					})
					.catch(console.error);
				nickname = someMember.nickname
				gameState.population[personName].nickname = nickname
			} catch (err){
				console.log(personName+" failure getting nickname "+err)
			}
		}
	}
	return gameState;
}
module.exports.updateNicknames = updateNicknames

function personByName(name, gameState){
	if (name == null){
		console.log('attempt to find person for null name ')
		return null
	}
	if (name.username != null){
		name = name.username
		console.log("getting username from object ")
	}
	cleaned = removeSpecialChars(name)
	if (name != cleaned ){
		console.log(name + " cleaned into "+cleaned)
		name = cleaned
	}
	if (!gameState || gameState.population == null){
		console.log('no people yet, or gameState is otherwise null')
		return null
	}
	var person = null
	var population = gameState.population;
	if (population[name] != null){
		 person = population[name]
	} else if (population[name.toLowerCase()] != null){
		person = population[name.toLowerCase()]
	} else {
		for (match in population){
			if ( (population[match] && population[match].handle) ){
				if ( population[match].handle.username == name 
					|| population[match].handle.username == name.username
					|| population[match].handle.id == name){
					person = population[match]
					break;
				}
				if (population[match].handle.id == name){
					person = population[match]
					break;
				}
			}
			if (population[match].name.toUpperCase() === name.toUpperCase()){
				person = population[match]
				break;
			}
		}
	}
	if (person != null){
		for (var type in person) {
			if (Object.prototype.hasOwnProperty.call( person, type)) {
				if (person[type] && person[type].constructor === Array && person[type].length == 0){
					//console.log('deleting empty array for '+type)
					delete person[type]
				}
			}
		}
		return person
	}
	console.log("tribe "+gameState.name+" has no such person in population. tried "+name+" and "+name.toUpperCase())
	return null
}
module.exports.history = (playerName, message, gameState)=>{
	player = personByName(playerName, gameState)
	if (player && !player.history){
		player.history = []
	}
	if (!player){
		console.log('trying to record history with no player record:'+playerName)
		return;
	}
	player.history.push(gameState.seasonCounter/2+": "+message)
}


async function messagePlayerName(playerName, message, gameState, bot){
	player = personByName(playerName, gameState);
	if ( !player){
		console.log("No player for name "+playerName)
		return
	}
	if (!message){
		console.log("Not sending empty message to "+playerName)
		return
	}
	if (!"users" in bot){
		console.log('bot has no users for message :'+message)
	}
	if (player.handle && player.handle.id){
		playerId = player.handle.id
		playerUser =  await bot.users.fetch(playerId);
		playerUser.send(message);
	} else {
		console.log(playerName+" has no handle or id- maybe a drone? ")
	}
}
module.exports.messagePlayerName = messagePlayerName

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
	return Math.round(100*number)/100;
}
module.exports.round = round;

function removeSpecialChars(strVal){ 
	return strVal.replace(/[^!a-zA-Z0-9_]+/g,'');
}
module.exports.removeSpecialChars = removeSpecialChars;

function messageChannel(message, gameState, argBot){
	if (!argBot || !argBot.channels || !argBot.channels.cache ){
		console.log('no bot, channel does not see '+message)
		return
	}
	if (!message || message.length == 0 ){
		console.log("Not sending empty message to channel:"+message)
		return
	}
	channel = argBot.channels.cache.find(channel => channel.name === gameState.name)
	if (channel){
		channel.send(message)
	} else {
		console.log('no channel found for '+gameState.name)
	}
}
module.exports.messageChannel = messageChannel;

function ephemeralResponse(interaction, response){
    interaction.user.send(response);
        const embed = new EmbedBuilder().setDescription(response);
		interaction.reply({ embeds: [embed], ephemeral: true })
			.catch(console.error);
        return
}
module.exports.ephemeralResponse = ephemeralResponse;

function countByType(dictionary, key, value){
	count = 0
	for (elementName in dictionary){
		element = dictionary[elementName]
		if (element[key] && element[key] == value){ count++}
	}
	return count
}
module.exports.countByType = countByType;