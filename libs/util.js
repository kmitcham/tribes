const violencelib = require("./violence.js");
const killlib = require("./kill.js");
const reproLib = require("./reproduction.js");
const savelib = require("./save.js");
const locations = require('./locations.json');
const messenger = require("./messaging.js");
const text = require("./textprocess.js")
const roll = require( "./dice.js") 

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


function startReproduction(gameState, bot){
	// actually consume food here
	savelib.archiveTribe(gameState);
	gameState.needChanceRoll = true  // this magic boolean prevents starting work until we did chance roll
	gameState.workRound = false
	gameState.foodRound = false
	gameState.reproductionRound = true
	delete gameState.enoughFood 
	foodMessage = consumeFood(gameState)
	savelib.saveTribe(gameState);
	messageChannel(foodMessage+'\n', gameState, bot)
	messageChannel('\n==> Starting the Reproduction round; invite other tribe members to reproduce.<==', gameState, bot)
	messageChannel('After chance, the tribe can decide to move to a new location, but the injured and children under 2 will need 2 food', gameState, bot)
	reproLib.rememberInviteLists(gameState, bot);
	gameState.doneMating = false;
	reproLib.globalMatingCheck(gameState, bot)
	if (reproLib.canStillInvite(gameState)){		
		messageChannel('(awaiting invitations or !pass from '+reproLib.canStillInvite(gameState)+')', gameState, bot)
	}
	decrementSickness(gameState.population, gameState, bot)
	savelib.saveTribe(gameState);
	return gameState.doneMating
}
module.exports.startReproduction = startReproduction

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
	children = gameState.children
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
	children = gameState.children

	console.log('children are eating')
	for (childName in children){
		var child = children[childName]
		if (child.dead){
			continue;
		}
		console.log(childName+" object "+child)
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
				birthRoll = roll.roll(3)
				response += '\t'+child.mother+' gives birth to a '+child.gender+'-child, '+child.name
				history(child.mother,child.mother+' gives birth to a '+child.gender+'-child, '+child.name, gameState)
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
					history(child.mother,child.mother+' gives birth to a twin! Meet '+twin.name+', a healthy young '+twin.gender+'-child', gameState)
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


