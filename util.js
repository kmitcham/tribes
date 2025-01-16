const violencelib = require("./violence.js");
const killlib = require("./kill.js");
const reproLib = require("./reproduction.js");
const { Client, EmbedBuilder } = require('discord.js');

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
		playerUser = await bot.users.fetch(playerId);
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
	if (! strVal){
		console.log("empty value to remove special chars")
		return ""
	}
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

function countChildrenOfParentUnderAge(children, parentName, age){
	var count = 0
	for (var childName in children){
		var child = children[childName]
		if (child.mother == parentName || child.father == parentName){
			if (child.age < age){
				count++
			}
		}
	}
	return count
}
module.exports.countChildrenOfParentUnderAge = countChildrenOfParentUnderAge;

function consumeFood(gameState){
	if (!gameState){
		console.log('no game state; ERROR')
		return
	}
	console.log('adults are eating')
	response = "Food round results:\n"
	//console.log('food response is '+response)
	response += consumeFoodPlayers(gameState);
	//console.log('food response is '+response)
	response += consumeFoodChildren(gameState);
	//console.log('food response is '+response)
	return response
}
module.exports.consumeFood = consumeFood;

function consumeFoodPlayers(gameState){
	perished = []
	population = gameState.population
	var response = '';
	for  (var target in population) {
		var hunger = 4
		console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
		population[target].food = population[target].food - hunger
		if (population[target].food < 0 ){
			// food is negative, so just add it to grain here
			population[target].grain = population[target].grain + population[target].food
			population[target].food = 0
			if (population[target].grain < 0){
				response += "  "+target+" has starved to death.\n"
				population[target].grain = 0
				perished.push(target)
			}
		}
		if (population[target].gender == 'female' && countChildrenOfParentUnderAge(children, target, 4 ) > 1 ){
			// extra food issues here; mom needs 2 more food, or the child will die.
			console.log(target+' needs extra food due to underage children. ')
			population[target].food -= 2
			if (population[target].food < 0 ){
				// food is negative, so just add it to grain here
				population[target].grain = population[target].grain + population[target].food
				population[target].food = 0
				if (population[target].grain < 0){
					childname = population[target].isPregnant 
					response += target+' lost her child '+child+' due to lack of food\n'
					killlib.kill(childName, 'prenatal starvation',gameState)
					delete population[target].isPregnant 
				}
			}
		}
		console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
	} 
	var perishedCount = perished.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perished[i]
		console.log('removing corpse '+corpse)
		killlib.kill(perished[i], 'starvation', gameState)
	}
	if ((perished.length) == 0 ){
		response += 'No adults starved! \n'
	}
	return response;
}
module.exports.consumeFoodPlayers = consumeFoodPlayers;

function consumeFoodChildren(gameState){
	response = '';
	perishedChildren = []
	population = gameState.population

	console.log('children are eating')
	for (childName in children){
		var child = children[childName]
		if (child.dead){
			continue;
		}
		child.age += 1
		if (child.age < 24 ){
			child.food -= 2
			if (child.food < 0){
				response += " child:"+childName+" has starved to death.\n"
				child.dead = true
				if (population[child.mother] && population[child.mother].isPregnant ) {
					delete population[child.mother].isPregnant
				}
				perishedChildren.push(childName)
				continue;
			} 
			if (child.age == 0 ){
				birthRoll = util.roll(3)
				response += '\t'+child.mother+' gives birth to a '+child.gender+'-child, '+child.name
				util.history(child.mother,child.mother+' gives birth to a '+child.gender+'-child, '+child.name, gameState)
				if (birthRoll < 5 ){
					response += ' but the child did not survive\n'
					child.dead = true
					killlib.kill(child.name, 'birth complications', gameState)
					console.log('removing stillborn '+child.name)
					continue;
				} else {
					response += '\n'
				}
				//Mothers start guarding their newborns
				person = personByName(child.mother, gameState)
				if (!person.guarding){
					person.guarding = [child.name]
				} else if (person.guarding.indexOf(child.name) == -1){
					person.guarding.push(child.name)
				}
				if (birthRoll == 17){
					twin = addChild(child.mother, child.father, gameState);
					delete child.mother.isPregnant; // this gets set by addChild, but the child was just born.
					response += child.mother+' gives birth to a twin! Meet '+twin.name+', a healthy young '+twin.gender+'-child.\n'
					util.history(child.mother,child.mother+' gives birth to a twin! Meet '+twin.name+', a healthy young '+twin.gender+'-child', gameState)
					person.guarding.push(twin.name)
					twin.age = 0
				}
			}
			// Sometimes we get bugs where pregnancy doesn't clear; this will fix it eventually
			if (child.age >= 0){
				if (population[child.mother] && population[child.mother].isPregnant
					&& population[child.mother].isPregnant == childName ){
					delete population[child.mother].isPregnant
				}
			}
			if (4 > child.age && child.age >=  0 && population[child.mother] ){
				if ( ! population[child.mother].nursing){
					population[child.mother].nursing = []
				}
				if (population[child.mother].nursing.indexOf(childName) == -1){
					population[child.mother].nursing.push( child.name)
				}
			}
			if (child.age >= 4 // 2 years in SEASONS
					&& population[child.mother] && population[child.mother].nursing 
					&&  population[child.mother].nursing.indexOf(childName) > -1 ){
				childIndex = population[child.mother].nursing.indexOf(childName)
				population[child.mother].nursing.splice(childIndex, 1);
				response += child.name+' is weaned.\n'
				if (population[child.mother].nursing && population[child.mother].nursing.length == 0){
					delete population[child.mother].nursing 
				}
			}
		}
		if (child.age >= 24 && ! child.newAdult ){
			child.newAdult = true
			response += child.name+' has reached adulthood!\n'
			// clear all guardians
			for  (var name in population) {
				player = population[name]
				if (player.guarding && player.guarding.includes(child.name)){
					const index = player.guarding.indexOf(child.name);
					if (index > -1) {
						player.guarding.splice(index, 1);
						response += name+' stops watching the new adult.\n'
					}
				}
			}
			for (var sitterName in children){
				sitter = children[sitterName]
				if (sitter.babysitting && sitter.babysitting == child.name){
					delete sitter.babysitting
					response += sitter.name +" stops watching the new adult.\n"
				}
			}
		}
	}
	// clean up the dead
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		killlib.kill(perishedChildren[i], 'starvation', gameState)
		console.log('removing child corpse '+corpse)
	}
	if ((perishedChildren.length) == 0 ){
		response += 'No children starved!'
	}
	return response;
}
module.exports.consumeFoodChildren = consumeFoodChildren

function specialize(playerName, profession, gameState){
	helpMessage = "Welcome new tribe member.  \n"
	helpMessage+= "You need to pick a profession to specialize in: hunter, gatherer or crafter. \n"

	if (profession.startsWith('h')){
		profession = 'hunter'
		helpMessage = "Welcome new hunter.  \n"
		helpMessage+= "To hunt, do !hunt and the bot rolls 3d6.  Higher numbers are bigger animals, and very low numbers are bad - you could get injured. \n"
		helpMessage+= "You cannot guard children while hunting. \n"
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you a bonus to your roll. \n"
		helpMessage+= "You can also `!gather`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";
		}
	if (profession.startsWith('c')){
		profession = 'crafter';
		helpMessage = "Welcome new crafter.  To craft, do `!craft basket` or `!craft spearhead`.  There is a 1/6 (basket) or 1/3 (spearhead) chance of failing.. \n"
		helpMessage+= "You can guard up to two children while crafting. \n"
		helpMessage+= "You can also `!gather`  or `!hunt`, but at a penalty. \n"
		helpMessage+= "By default, you will train others in crafting if they take a season to train.  To toggle this setting, use `!secrets`.";
	}
	if (profession.startsWith('g')){
		profession = 'gatherer';
		helpMessage = "Welcome new gatherer.  To gather, do `!gather`, and the bot rolls 3d6.  Higher numbers generally produce more food. \n"
		helpMessage+= "You can guard 2 children without penalty; watching 3 or 4 gives an increasing penalty; 5 is too many to gather with. \n"
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a basket which gives you an additional gather attempt. \n"
		helpMessage+= "You can also `!hunt`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";
	}

	var person = personByName(playerName, gameState)
	person.profession = profession
	if (person.profession == 'crafter'){
		person.canCraft = true
	}
	return helpMessage
}
module.exports.specialize = specialize