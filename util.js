const violencelib = require("./violence.js");
const killlib = require("./kill.js");
const reproLib = require("./reproduction.js");
const savelib = require("./save.js");
const locations = require('./locations.json');

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
			var roll = Math.trunc( Math.random( ) * 6)+1
			total += roll
		}
		return total
}
function getYear(gameState){
	return gameState.seasonCounter/2;
}

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
					|| population[match].handle.displayName == name
					|| (name.username && population[match].handle.username == name.username )
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

function history (playerName, message, gameState){
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
module.exports.history = history

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
	if (player.handle && (player.handle.id || player.handle.userId)){
		playerId = player.handle.id?player.handle.id:player.handle.userId;
		playerUser = await bot.users.fetch(playerId);
		playerUser.send(message);
	} else {
		console.log(playerName+" has no handle or id- maybe a drone? ")
	}
}
module.exports.messagePlayerName = messagePlayerName

function gameStateMessage(gameState) {
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
module.exports.gameStateMessage = gameStateMessage

function getNameFromUser(actor){
	return  actor.displayName?actor.displayName:actor.username;
}
module.exports.getNameFromUser = getNameFromUser;

function addToPopulation(gameState, bot, actor, gender, profession){
    var sourceName = getNameFromUser(actor)
    console.log("actor is "+actor+" actor.username:"+actor.username)
    target = removeSpecialChars(sourceName)
    if (gameState.population[target]){
        return 'You are already in the tribe'
    }
    genders = ['male','female']
    if (gender === 'm'){gender = 'male'}
    if (gender === 'f'){gender = 'female'}
    if ( !target || !gender || !genders.includes(gender) ){
        actor.send('usage: jointribe [female|male] [hunter|gatherer|crafter]')
        return
    }
    var person = {};
    person.gender = gender;
    person.food = 10;
    person.grain = 4;
    person.basket = 0;
    person.spearhead = 0;
    person.handle = actor;
    person.name = sourceName;
    if (profession){
        person.profession = profession;
    }
    var strRoll = roll(1);
    response = 'added '+target+' '+gender+' to the tribe.';
    if (strRoll == 1){
        person.strength = 'weak'
        response+= target +' is weak.'
    } else if (strRoll == 6){
        person.strength = 'strong';
        response+= target +' is strong.';
    } 
    gameState.population[target] = person;
	console.log( 'added '+target+' '+gender+' to the tribe.strRoll:'+strRoll);
    messageChannel(response, gameState, bot);
    if (!person.strength){
        messagePlayerName(person.name, "You are of average strength", gameState, bot);
    }
    history(person.name, "Joined the tribe", gameState);
    savelib.saveTribe(gameState);
    return "The tribe accepts you"
}
module.exports.addToPopulation = addToPopulation;


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

// Side effect: if everyone has enough food, and it is foodRound, start reproduction round.
function checkFood(gameState, bot){
    message = ''
    hungryAdults = []
    happyAdults = []
    worriedAdults = []
    hungryChildren = []
    satedChildren = []
    children = gameState.children
    population = gameState.population
    for  (var targetName in population) {
        person = population[targetName]
        hunger = 4
        if (person.gender == 'female' && countChildrenOfParentUnderAge(children, targetName, 4) > 1){
            hunger = 6
        }
        if (person.food >= hunger) {
            happyAdults.push(targetName);
        } else if ( ((person.food+person.grain) >= hunger )){
            worriedAdults.push(targetName);
        } else {
            hungryAdults.push(targetName);
        }
    }
    for (var childName in children){
        var child = children[childName]
        if (child.newAdult && child.newAdult== true){
            continue;
        }
        if (child.food >= 2 ){
            satedChildren.push(childName)
        }else {
            hungryChildren.push(childName)
        }
    }
    message = 'Happy People: '+happyAdults+", "+satedChildren
    message += '\nWorried adults: '+worriedAdults
    message += '\nHungry adults: '+hungryAdults
    message += '\nHungry children: '+hungryChildren
    if (!worriedAdults.length && !hungryAdults.length && !hungryChildren.length && gameState.foodRound ){
        gameState.enoughFood = true
        messageChannel("Everyone has enough food, starting reproduction automatically.", gameState, bot)
        startReproduction(gameState,bot)
    }
    return message
}
module.exports.checkFood = checkFood

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
				birthRoll = roll(3)
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

function migrate(destination, force, gameState, bot){
	children = gameState.children
	population = gameState.population
	response = ''
	legalLocations = Object.keys(locations)
	if (!legalLocations.includes(destination) ){
		return destination+' not a valid location.  Valid locations:'+legalLocations
	}
	if (gameState.currentLocationName == destination){
		return destination+' is where the tribe already is.'
	}
	// every injured person pays 2 food, or dies.
	deceasedPeople = []
	deceasedChildren = []
	if (force){
		for (personName in population){
			var person = personByName(personName, gameState)
			if (person.isInjured && person.isInjured > 0){
				need = 2
				eaten = 0
				while (eaten < need){
					if (person.food > 0 ){
						person.food--
						eaten++
					} else if (person.grain > 0){
						person.grain--
						eaten++
					} else {
						deceasedPeople.push(personName)
					}
				}
			}
		}
		for (childName in children){
			var child = children[childName]
			// child age is in seasons
			if (child.age < 4 ){
				if (child.food < 2){
					deceasedChildren.push(childName)
				} else {
					child.food -= 2
				}
			}
		}
		if (deceasedPeople.length > 0 || deceasedChildren.length > 0){
			response = 'The following people died along the way:'
			// every child under 2 needs 2 food, or dies
			// clean up the dead
			var perishedCount = deceasedPeople.length;
			for (var i = 0; i < perishedCount; i++) {
				killlib.kill(deceasedPeople[i],'migration hunger',gameState)
				response+= " "+deceasedPeople[i]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				killlib.kill(deceasedChildren[i],'migration hunger',gameState)
				response+= " "+deceasedChildren[i]
			}
		}
		messageChannel('Setting the current location to '+destination, gameState, bot)
		gameState.currentLocationName = destination
	} else {
		for (personName in population){
			person = personByName(personName, gameState)
			if (person.isInjured && person.isInjured > 0){
				need = 2
				eaten = 0
				if ((person.food + person.grain) < 2 ){
					deceasedPeople.push(personName)
				}
			}
		}
		for (childName in children){
			var child = children[childName]
			// child age is in seasons
			if (child.age < 4){
				if (child.food < 2){
					deceasedChildren.push(childName)
				} 
			}
		}
		response += '\nThe following tribe members would die on the journey to '+destination+': '+deceasedPeople
		response += '\nThe following children would die along the way: '+deceasedChildren
	}
	return response
}
module.exports.migrate = migrate
