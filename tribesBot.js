var Discord = require('discord.js');

const huntlib = require("./hunt.js");
const gatherlib = require("./gather.js");
const feedlib = require("./feed.js");
const guardlib = require("./guardCode.js");
const utillib = require("./util.js");
const savelib = require("./save.js");
const helplib = require("./help.js");
const reproLib = require("./reproduction.js");

var bot = new Discord.Client()
var logger = require('winston');
const { ExceptionHandler, child } = require('winston');
const fs = require('fs');
const { resolve } = require('path');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');
// Not sure what this is; it probably came with my example?
const { spawn } = require('child_process');

let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearhead']
const professions= ['hunter','gatherer', 'crafter']
const member_properties = ['canCraft','chief','nursing','isPregnant','isInjured','guarding','profession','gender','partner','worked','food','grain', 'handle']
const genders = ['male','female']
const locations = require('./locations.json');
const allNames = require('./names.json');

const locationDecay = [30,30,30,17,17,
					15,15,14,14,13,
					13,12,12,11,11,
					10,10,9,9,8]
const childSurvivalChance = 
	[ 8, 8, 8, 8, 9, 9,10,10,10,11  // 4 years
	,11,11,12,12,13,13,13,14,14,14  // 9 years
	,15,15,16,16,17]
var gameState = Object()
var allGames = Object()
var referees = ["kevinmitcham", "@kevinmitcham"]
var alertChannel;

var games = {}

bot.once('ready', ()=>{
	console.log('bot is alive')
	var d = new Date();
	var n = d.toISOString();
	alertChannel = bot.channels.cache.find(channel => channel.name === 'general')
	alertChannel.send('TribesBot is alive again. '+n)
  })   
bot.login(auth['token'])

bot.on('message', msg => {
	if (!msg.content ){
	  return
	}
	if (msg.content.substring(0,1) != '!'){
	  return
	}
	if (msg.channel && msg.channel.name ){
	  if (!msg.channel.name.toLowerCase().includes('tribe')){
		console.log('ignore command >'+msg.content+'<in channel with no tribe ')
		return
	  }
	}
	try {
		processMessage(msg)
	} catch (err){
		alertChannel = bot.channels.cache.find(channel => channel.name === 'general')
		alertChannel.send('Bot wanted to fall over:')
		alertChannel.send(' the error was:'+err.message)
	}
  });
  
  function processMessage(msg){
	  author = msg.author
	  actor = author.username
	  bits = msg.content.split(' ')
	  command = bits[0]
	  command = command.toLowerCase().substring(1) // strip out the leading !
	  console.log('command:'+command+' bits:'+bits+' actor:'+author.username )  
	  var gameState = {}
	  if (msg.channel && msg.channel.name ){
		gameState = allGames[msg.channel.name.toLowerCase()]
		if (!gameState){
			gameState = savelib.loadTribe(msg.channel.name.toLowerCase());
			if (!gameState){
				initGame(msg.channel.name.toLowerCase())
				msg.reply('starting game with initial conditions')
				gameState = allGames[msg.channel.name.toLowerCase()]
			}			
			allGames[gameState.name] = gameState;
			console.log("loading game "+msg.channel.name.toLowerCase()+" from file");
		}
	  } else {
		  gameState = findGameStateForActor(actor)
		  if (!gameState){
			console.log(author+" had no game state found")
			return
		}
	  }
	  handleCommand(msg, author, actor,  command, bits, gameState)
	  return	
  }
  
  function initGame(gameName){
	if (!gameName){
		console.log('init game without a name')
		gameName = ''
	}
	gameState.seasonCounter = 1
	gameState.gameTrack = {}
	gameState.name = gameName
	gameState.open = true
	gameState.populationCounter = 0
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
	allGames[gameName] = gameState
	savelib.saveTribe(gameState);
	return gameState
}
function endGame(gameState){
	adultCount = 0
	response = 'The fate of the children:\n'
	children = gameState.children
	population = gameState.population
	for (childName in children){
		var child = children[childName]
		if (!child.newAdult){
			roll = utillib.roll(3)
			stats = '['+child.age+'yrs, '+roll+' vs '+childSurvivalChance[child.age]+']'
			if ( roll <= childSurvivalChance[child.age]){
				child.newAdult = true
				response += '\t'+childName+' grows up '+stats+'\n'
			} else {
				response += '\t'+childName+' dies young '+stats+'\n'
				kill(childName, 'endgame scoring', gameState)
			}
		}
		if (child.newAdult){
			adultCount++
		}
	}
	adultCount += Object.keys(population).length
	response += 'Count of adults is:'+adultCount
	savelib.saveTribe(gameState);
	allGames[gameState.name] = gameState;
	return response
}
function scoreChildren(children, gameState){
	var parentScores = {}
	for (childName in children){
		var child = children[childName]
		if (parentScores[child.mother]){
			parentScores[child.mother]++
		} else {
			parentScores[child.mother] = 1
		}
		if (parentScores[child.father]){
			parentScores[child.father]++
		} else {
			parentScores[child.father] = 1
		}
	}
	message = 'Child scores:\n'
	for (parentName in parentScores){
		player = personByName(parentName, gameState)
		message+= '\t'+parentName+'('+player.gender.substring(0, 1)+'): '+parentScores[parentName]
	}
	return message
}
function cleanUpMessage(msg){
	if (msg.channel && msg.channel.name ){
		console.log(' cleaning up message in channel '+msg.channel.name )
		msg.delete({timeout: 1000}); 
	}
}

function nextSeason(gameState){
	if (utillib.isColdSeason(gameState)){
		for (locationName in locations){
			modifier = locations[locationName]['game_track_recover']
			oldTrack = gameState.gameTrack[locationName]
			gameState.gameTrack[locationName]  -= modifier
			if (gameState.gameTrack[locationName]< 1){
				gameState.gameTrack[locationName] = 1
			}
			console.log(locationName+' game_track moves from '+oldTrack+' to '+gameState.gameTrack[locationName])
		}
	}
	gameState.seasonCounter += 1
}
function inventoryMessage(person){
	if (!person){
		return 'No person '+targetName
	}
	message = person.food+' food \t'
	message += person.grain+' grain \t'
	message += person.basket+' baskets \t'
	message += person.spearhead+' spearheads \t'
	message += person.profession+' '+person.gender.substring(0,1)+'\t'+person.name
	if (person.isPregnant && person.isPregnant != ''){
		message += '\n\t\t is pregnant with '+person.isPregnant
	}
	if (person.nursing && person.nursing.length > 0 ){
		message += '\n\t\t is nursing '+person.nursing
	}
	if (person.isInjured && person.isInjured != 'false' ){
		message += '\n\t\t is injured and unable to work'
	}	
	if (person.isSick && person.isSick != 'false' ){
		message += '\n\t\t is sick and unable to work'
	}
	if (person.guarding){
		message += '\n\t\t is guarding '+person.guarding
	}
	if (person.strength){
		message += '\n\t\t is '+person.strength
	}
	if (person.chief){
		message += '\n\t\t is Chief'
	}
	return message
}

function getUserFromMention(mention) {
	if (!mention) return;
	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}
		return bot.users.cache.get(mention);
	}
}
function findGameStateForActor(actor){
	for (var gameName in allGames){
		gameState = allGames[gameName]
		if (gameState && personByName(actor, gameState)){
			console.log('found game '+gameName+' for '+actor)
			return gameState
		}
	}
	console.log('Found no game for '+actor)
	return null
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
	}
	var person = null
	if (gameState.population[name] != null){
		 person = gameState.population[name]
	} else if (name && gameState.population[name.username] != null){
		person = gameState.population[name.username]
	} else if (name.indexOf('@') != -1 && population[name.substring(1)] != null){
		person = gameState.population[name.substring(1)]
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

function createReproductionList(gameState){
	population = gameState.population
	nameList = []
	var tag = '?'
	for (var name in population){
		person = personByName(name, gameState)
		tag = person.gender
		if (person.nursing && person.nursing.length > 0){
			tag = 'nursing '+person.nursing.length
		}
		if (person.isPregnant){
			continue
		}
		nameList.push(name+'('+tag+')')
	}
	return nameList
}
function countByType(dictionary, key, value){
	count = 0
	for (name in dictionary){
		element = dictionary[name]
		if (element[key] && element[key] == value){ count++}
	}
	return count
}
function doChance(rollValue, gameState){
	population = gameState.population
	chanceRoll = Number(rollValue)
	if (!rollValue || rollValue < 3 || rollValue > 18 ){
		console.log(' invalid chance roll'+rollValue)
		chanceRoll = utillib.roll(3)
	}
	message = 'Chance '+chanceRoll+': '
	switch 	(chanceRoll){
		case 18: case 17: case 16:
			name = utillib.randomMemberName(population)
			person = population[name]
			safety = 0;
			while (person.strength == 'strong' && safety < Object.keys(population).length) {
				name = utillib.randomMemberName(population);
				person = population[name];
				safety = safety + 1;
			}
			message +=  name +" grows stronger.";
			if (person.strength && person.strength == 'weak'){
				delete person.strength
			} else {
				person.strength = 'strong'
			}
			break;
		case 15 : 
			message +="Fungus! All stored food in the whole tribe, except grain, spoils and is lost."
			for (var name in population){
				person = population[name]
				person.food = 0
			}
			break;
		case 14 : 
			name = utillib.randomMemberName(population)
			person= population[name]
			person.food = 0
			message +="Rats! All "+name+"'s food, except for grain, spoils and is lost. Others’ stored food is not affected. If there are 8 or more players, this happens to two people"
			break;
		case 13 : 
			name = utillib.randomMemberName(population)
			person= population[name]
			person.spearhead  += 1
			message += name +" finds a spearhead"
			break;
		case 12 : 
			message +="The younger tribesfolk gather food. Each child over 4 years old brings 2 Food to their mother. Each New Adult brings 4 Food to their mother."
			for (childName in children){
				var child = children[childName]
				if (child.age > 8 ){ // age in seasons
					gift = 2
					if (child.newAdult ){
						gift = 4
					}
					motherName = child.mother
					mother = population[motherName]
					mother.food += gift
					message += '\n  '+motherName+' gets '+gift+' from '+childName
				}
			}
			break;
		case 11 : 
			message +="Locusts! Each player loses two dice of stored food"
			for (var name in population){
				person = population[name]
				var amount = utillib.roll(2)
				if (amount > person.food){
					amount = person.food
				}
				person.food -= amount
				message += "\n "+name+" loses "+amount
				if (person.food < 0) { person.food = 0}
			}
			break;
		case 10 : 
			message += guardlib.hyenaAttack(children, gameState)
			// ugly hack until kill is a lib,
			// TODO move the kill to the guardlib
			if (message.indexOf('devoured') > 0 ){
				msgArray = message.split(' ')
				target = msgArray[5]  // chance 10: A hyena attacks TARGET
				kill(target, 'hyena attack', gameState)
			}
			break;
		case 9 : 
			name = utillib.randomMemberName(population)
			person = population[name]
			amount = utillib.roll(2)
			if (amount > person.food){
				amount = person.food
			}
			person.food -= amount
			if (person.food < 0) { person.food = 0}
			message += name + " loses "+amount+" food to weevils."
			break;
		case 8: 
			message +=  "Favorable weather conditions allow the tribe to make “jerky,” which keeps very well. Each person may trade Food counters for Grain counters (representing the jerky), at a rate of 3 Food for 1 Grain.  Syntax: jerk <amount>"
			gameState.canJerky = true
			break;
		case 7: 
			message +=  "FIRE! Move the Hunting Track token down to 20 (no game!) The tribe must move to another area immediately (Section 9). "
			if ( utillib.isColdSeason(gameState) && (gameState.currentLocationName == 'marsh' || gameState.currentLocationName == 'hills')){
				message = doChance(utillib.roll(3), gameState)
				return message
			} else {
				gameState.gameTrack[gameState.currentLocationName] = 20
			}
			break;
		case 6: 
			name = utillib.randomMemberName(population)
			person = population[name]
			person.isInjured = 'true'
			// TODO clear the guarding array of the injured person
			message +=  name + " injured – miss next turn."
			break;
		case 5: 
			name = utillib.randomMemberName(population)
			person = population[name]
			person.isSick = 'true'
			message +=  name + " got sick – lost 2 food and miss next turn. "
			if (person.food < 2){
				message += '( but they only had '+person.food+' so the ref might kill them if no help is given)'
			}
			person.food -= 2
			if (person.food < 0) { person.food = 0}
			if (person.guarding && person.guarding.length > 0){
				message += " They can no longer guard "+person.guarding
				delete person.guarding
			}
			break;
		case 4: 
		case 3: 
			name = utillib.randomMemberName(population)
			person = population[name]
			message +=  name +" gets a severe injury: miss next turn and become Average (if Strong) or Weak (if Average)."
			person.isInjured = 'true'
			if (person.strength && person.strength == 'strong'){
				delete person.strength
			} else {
				person.strength = 'weak'
			}
			break;
		default:
			message = 'bug in the chance system'
	}
	gameState.needChanceRoll = false
	return message
}

async function handleCommand(msg, author, actor, command, bits, gameState){
	player = personByName(actor, gameState)
	population = gameState.population
	children = gameState.children
	graveyard = gameState.graveyard
	if (command === 'help'){
		msg.author.send( helplib.playerHelp());
		if ((player && player.chief) || referees.includes(actor) ){
			msg.author.send( helplib.chiefHelp());
		}
		if (referees.includes(actor)){
			msg.author.send( helplib.refHelp());
		}
		cleanUpMessage(msg);; 
		return
	}
	if (command == 'addchild'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		var mother = 'unknown'
		var father = 'unknown'
		if (bits.length == 3 && msg.mentions.users.first() && msg.mentions.users.last() ){
			mother = getUserFromMention(bits[1]).username
			father = getUserFromMention(bits[2]).username
		} else {
			mother = bits[1]
			father = bits[2]
		}
		if (!population[mother] || !population[father]){
			msg.author.send('Parents not found in tribe')
			cleanUpMessage(msg);; 
			return
		}
		var child = addChild(mother, father, gameState)	
		messageChannel("The referee adds a child :"+child.name, gameState)
		return
	}
	if (command === 'award'){
		if (referees.includes(actor)){
			var targetName = bits[3]
			if (msg.mentions.users && msg.mentions.users.first() ){
				targetName = msg.mentions.users.first().username
			}
			amount = bits[1]
			type = bits[2]
		
			if (isNaN(amount) || ! types.includes(type)){
				msg.author.send('award syntax is award <amount> <food|grain|spearhead|basket> <recipient>')
				cleanUpMessage(msg);; 
				return
			}
			if (!population[targetName] ) {
				msg.author.send(targetName+' is not living in the tribe')
				cleanUpMessage(msg);; 
				return
			}
			messageChannel('The game awards '+targetName+' with '+amount+' '+type, gameState)
			
			if (!population[targetName][type]){
				population[targetName][type] = Number(amount)
			} else {
				population[targetName][type] += Number(amount)
			}
			if (population[targetName][type] < 0){
				population[targetName][type] = 0
			}         
		} else {
			msg.author.send('Only referees can award ')
			cleanUpMessage(msg);; 
			return
		}
		return
	}
	if (command == 'babysit'){
		if (bits.length != 3){
			msg.author.send(command+' usage: babysit <adult child> <target child>')
			cleanUpMessage(msg);; 
			return
		}
		babysitterName = utillib.capitalizeFirstLetter(bits[1]);
		targetChildName = utillib.capitalizeFirstLetter(bits[2]);
		babysitter = children[babysitterName]
		targetChild = children[targetChildName]
		response = "";
		if (!babysitter){
			msg.author.send(command+' could not find '+babysitterName)
			cleanUpMessage(msg);; 
			return
		}		
		if (!targetChild){
			msg.author.send(command+' could not find '+targetChild)
			cleanUpMessage(msg);; 
			return
		}
		if (babysitter.mother != actor){
			msg.author.send('You are not the mother of '+babysitterName)
			cleanUpMessage(msg);; 
			return
		}
		if (babysitter.newAdult){
			if (targetChild.newAdult){
				msg.author.send(targetChildName+' does not need watching');
				cleanUpMessage(msg);; 
				return
			}
			if (babysitter.babysitting){
				response += babysitterName+" stops watching "+babysitter.babysitting+".  ";
			}
			babysitter.babysitting = targetChildName;
			response += babysitterName + " starts watching "+targetChildName;
		} else {
			msg.author.send(babysitterName+' is not old enough to watch children')
			cleanUpMessage(msg);; 
			return
		}
		messageChannel(response, gameState)
		return;
	}
	// remove member from the tribe
	if (command === 'banish'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		targetName = target.username
		if (target ){
			if (population[targetName]){
				delete population[target.username]
				messageChannel(target.username+' is banished from the tribe',gameState)
				return
			}
		} else {
			msg.author.send(command+' could not find '+target)
			return
		}
	}
	if (command == 'chance'){
		if (!referees.includes(actor) && (player && !player.chief)){
			msg.author.send(command+' requires referee  or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.reproductionRound && gameState.needChanceRoll){
			if (!referees.includes(actor) && bits[1]){
				msg.author.send('Only a referee can force the roll')
				bits[1] = utillib.roll()
			}
			if (bits.length == 1){
				bits.push(utillib.roll())
			}
			response = doChance(bits[1], gameState)
			messageChannel(response, gameState)
			return
		} else {
			msg.author.send(command+' happens after reproduction attempts, before migration')
			return
		}
	}
	// list the children
	if (command == 'children'){
		response = ''
		childNames = Object.keys(children)
		response = 'There are '+childNames.length+' children \n'
		mine = 0 
		var arrayLength = childNames.length;
		for (childName in children) {
			child = children[childName]
			if (child.dead){
				response += '('+childName+' is dead)'
			} else {
				response += '('+childName+':'+child.gender
				response += ' years:'+((child.age)/2)
				if (child.newAdult){
					response += ' Full grown!'
				} else {
					response += ' needs '+(2-child.food)+' food'
				} 
				response += ' parents:'+child.mother+'+'+child.father
				if (child.age >= 0  && child.age < 24 ){
					response += ' guardValue:'+ guardlib.findGuardValueForChild(childName, population, children)
				}
				if (child.babysitting){
					response += ' watching:'+child.babysitting+' '
				}
				response += ')\n'
			}
		} 
		msg.author.send(response)
		cleanUpMessage(msg);; 
		return
	}	
	if (command == 'close'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		gameState.open = true
		messageChannel('The tribe is only open to those the chief inducts', gameState)
		return
	}
	if (command == 'consent'){
		var inviterName = ''
		var inviter = null
		for (personName in population){
			person = population[personName]
			if (person.invite == actor){
				inviterName = personName
				inviter = person
				break
			}
		}
		if (inviterName == '' ){
			msg.author.send('No current invitations')
			cleanUpMessage(msg);; 
			return
		}
		spawnFunction( actor, inviterName, msg, population, gameState)
		if (gameState && gameState.reproductionList && gameState.reproductionList[0].startsWith(inviterName)){
			nextMating(inviterName, gameState)
		}
		return
	}
	if (command == 'debug'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		GATHER = 0
		GATHER_STRONG = 1
		GRAIN = 2
		GRAIN_STRONG = 3
		HUNT = 4
		SPEAR = 5
		var totals = {
			'veldt':[0,0,0,0,0,0,0],
			'hills':[0,0,0,0,0,0,0],
			'marsh':[0,0,0,0,0,0,0],
			'forest':[0,0,0,0,0,0,0]
		}
		for (var i =1; i <= 6; i++){
			for (var j =1; j <= 6; j++){
				for (var k =1; k <= 6; k++){
					droll = i+j+k
					for (locationName in totals){
						locationData = locations[locationName]
						data = gatherDataFor(locationName, droll)
						totals[locationName][GATHER]+= data[1]
						totals[locationName][GRAIN]+= data[2]
						totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], droll)[1]
						sval = droll
						if (droll >= 9){	sval = droll+3 }
						totals[locationName][SPEAR]+= huntlib.huntDataFor(locationData['hunt'], sval)[1]
						dataStrong = gatherDataFor(locationName, droll+1)
						totals[locationName][GATHER_STRONG]+= dataStrong[1]
						totals[locationName][GRAIN_STRONG]+= dataStrong[2]
						
					}
				}
			}
		}
		response = '216 totals:'
		for (locationName in totals){
			response += '\n'+locationName+' food:'+totals[locationName][GATHER]
				+ ' grain:'+totals[locationName][GRAIN]
				+ ' sf:'+totals[locationName][GATHER_STRONG] 
				+ ' sg:'+totals[locationName][GRAIN_STRONG] 
				+ ' hunt:'+totals[locationName][HUNT]
				+ ' spear:'+totals[locationName][SPEAR]
		}
		messageChannel(response,gameState)
		totals = {
			'veldt':[0,0,0,0,0,0],
			'hills':[0,0,0,0,0,0],
			'marsh':[0,0,0,0,0,0],
			'forest':[0,0,0,0,0,0]
		}
		MAX = 6000
		for (var i = 0; i < MAX; i++){
			val = utillib.roll(3)
			for (locationName in totals){
				locationData = locations[locationName]
				data = gatherDataFor(locationName, val)
				totals[locationName][GATHER]+= data[1]
				totals[locationName][GRAIN]+= data[2]
				totals[locationName][HUNT]+= huntlib.huntDataFor(locationData['hunt'], val)[1]
				sval = val
				if (val >= 9){	sval = val+3 }
				foo = huntlib.huntDataFor(locationData['hunt'], sval)
				totals[locationName][SPEAR]+= foo[1]
				dataStrong = gatherDataFor(locationName, val+1)
				totals[locationName][GATHER_STRONG]+= dataStrong[1]
				totals[locationName][GRAIN_STRONG]+= dataStrong[2]
			}
		}
		response = MAX+'x Random avg:'
		for (locationName in totals){
			response += '\n'+locationName+' food:'+Math.round(10*totals[locationName][GATHER]/MAX)
									    +' grain:'+Math.round(10*totals[locationName][GRAIN]/MAX)
										+ ' sf:'  +Math.round(10*totals[locationName][GATHER_STRONG]/MAX)
										 +' sg:'  +Math.round(10*totals[locationName][GRAIN_STRONG]/MAX)
										 +  ' hunt:'+Math.round(10* totals[locationName][HUNT]/MAX)
										 +  ' spear:'+Math.round(10* totals[locationName][SPEAR]/MAX)
		}
		msg.reply(response)
		return
	}
	if (command === 'demote'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (referees.includes(target.username)){
			const index = referees.indexOf(target.username);
			if (index > -1) {
				referees.splice(index, 1);
				console.log('demoted '+target.username)
				msg.author.send('demoted '+target.username)
				return
			}
			console.log('did not find the ref in the list, although the include worked.')
			return
		} else{
			msg.author.send(target.username+' is not a referee:'+referees)
			return
		}
	}
	if (command == 'edit'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !edit <targetname> <type> <value>')
			cleanUpMessage(msg);; 
			return
		}
		var targetName = bits[1]
		if (msg.mentions.users && msg.mentions.users.first() ){
			targetName = msg.mentions.users.first().username
		}
		key = bits[2]
		if (!member_properties.includes(key)){
			msg.author.send('Legal properties to set are '+member_properties)
			cleanUpMessage(msg);; 
			return
		}
		value = bits[3]
		console.log('edit '+targetName+' '+key+' '+value )
		person = personByName(targetName, gameState)
		if (person){
			person[key] = value
			message = targetName+ ' now has values: '
			for (var type in person) {
				if (Object.prototype.hasOwnProperty.call( person, type)) {
					message+= ' '+type+' '+person[type]
				}
			}
			msg.author.send(message)
			population[targetName] = person
			return
		} else{
			msg.author.send(targetName+' is not in the tribe')
			cleanUpMessage(msg);; 
			return
		}
	}
	if (command == 'editchild'){
		childProperties = ['mother','father','age','food','name']
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (bits.length != 4){
			msg.author.send('editchild <childname> <attribute> <value>')
			cleanUpMessage(msg);; 
			return		
		}
		childName = utillib.capitalizeFirstLetter(bits[1])
		attribute = bits[2]
		value = bits[3]
		child = children[childName]
		if (!child){
			msg.author.send('Could not find '+childName)
			cleanUpMessage(msg);; 
			return
		}
		if (!childProperties.includes(attribute)){
			msg.author.send('Legal properties to set are '+childProperties)
			cleanUpMessage(msg);; 
			return
		}
		if (attribute == 'mother'|| attribute == 'father'){
			parent = population[value]
			if (!parent){
				msg.author.send('Could not find tribemember '+value)
				cleanUpMessage(msg);; 
				return
			}
		}
		if ((attribute == 'age'|| attribute == 'food') && isNaN(value) ){
			msg.author.send('Food and age take number values '+value)
			cleanUpMessage(msg);; 
			return
		}
		child[attribute] = value
		children[childName] = child
		message = childName +' now has values '
		for (var type in child) {
			if (Object.prototype.hasOwnProperty.call( child, type)) {
				message+= ' '+type+' '+child[type]
			}
		}
		msg.author.send(message)
		return

	}
	if (command == 'endgame'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		messageChannel(endGame(gameState), gameState)
		return
	}
  	// add food to a child
	if (command === 'feed'){
		if (bits.length < 3 || isNaN(bits[1]) || bits[1] <= 0 ){
			msg.author.send('feed syntax is feed <amount>  <childname> [<other child names>]')
			cleanUpMessage(msg);; 
			return
		}
		command = bits.shift()
		amount = bits.shift()
		childList = bits
        if (amount < 0 &&  !referees.includes(actor) ){
            msg.author.send('Only the referee can reduce amounts')
			cleanUpMessage(msg);; 
            return
        }
        if (!player ){
            // this makes sure the author is in the tribe
			cleanUpMessage(msg);; 
            msg.author.send("Children do not take food from strangers")
            return
		}	

		//module.exports.feed = ( msg, player, amount, childList,  gameState) =>{
		message = feedlib.feed(msg, player, amount, childList, gameState)
		messageChannel(message, gameState);
		savelib.saveTribe(gameState);
		return
	} 
	if (command == 'foodcheck'){
		message = checkFood(gameState)
		msg.author.send( message)
		cleanUpMessage(msg);; 
		return
	}
	if (command === 'give'){
		if (bits.length < 3){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			cleanUpMessage(msg);; 
			return
		}
		var username = ''
		if (bits.length >= 4){
			username = bits[3]
		} 
		if (msg.mentions.users.first()){
			username= msg.mentions.users.first().username
		}
		if (!username){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			cleanUpMessage(msg);; 
			return
		}
		amount = bits[1]
		type = bits[2]

		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			cleanUpMessage(msg);; 
			return
		}
		if (amount <= 0  ){
			msg.author.send('Can not give negative amounts')
			cleanUpMessage(msg);; 
			return
		}			
		if (!population[username] ) {
			msg.author.send(username+' is not a member of the tribe')
			cleanUpMessage(msg);; 
			return
		}
		if (type == 'spearhead' && player && player.activity && gameState.workRound
			&& ( player.activity == 'hunt' || player.activity == 'assist')){
			msg.author.send('The game suspects you used that item to work with.  Ask the referee to help trade it if you did not.')
			cleanUpMessage(msg);; 
			return
		}
		if ( type =='basket' && player && player.activity && player.activity == 'gather' && gameState.workRound ){
		msg.author.send('The game suspects you used that item to work with.  Ask the referee to help trade it if you did not.')
		cleanUpMessage(msg);; 
		return
	}
		if (  population[actor][type] >= amount){
			messageChannel(actor+' gave '+amount+' '+type+' to '+username, gameState)
			if (!population[username][type]){
				population[username][type] = Number(amount)
			} else {
				population[username][type] += Number(amount)
			}         
			population[actor][type] -= Number(amount)
		} else {
			msg.author.send('You do not have that many '+type+': '+ population[actor][type])
			cleanUpMessage(msg);; 
		}
		savelib.saveTribe(gameState);
		return
	}
	if (command == 'graveyard'){
		cleanUpMessage(msg);; 
		response = 'Graveyard:'
		if ( Object.keys(gameState.graveyard ).length == 0){
			response += ' is empty'
			msg.author.send(response)
			return
		}
		for (var name in gameState.graveyard){
			// TODO flesh this out
			person = gameState.graveyard[name]
			response += '\n '+name+' died of '+person.deathMessage
			if (person.mother){
				response += ' parents:'+person.mother +'-'+person.father
				response += ' age:'+person.age/2
			} else {
				response += ' profession:'+person.profession
			}
		}
		msg.author.send(response)
		return
	}
	if (command == 'guard' || command == 'watch'){
		if (bits.length < 2){
			msg.author.send('guard <childName> [<more childNames>]')
			cleanUpMessage(msg);; 
			return		
		}
		person = personByName(actor, gameState)
		if (!person){
			msg.author.send('you are not a person')
			return
		}
		if (person.guarding && person.guarding.length > 4){
			msg.author.send('You are already guarding enough children: '+person.guarding)
			cleanUpMessage(msg);; 
			return
		}
		if (person.isSick && person.isSick != false){
			msg.author.send('You are too sick to watch children')
			cleanUpMessage(msg);; 
			return
		}
		if (person.worked == true|| gameState.workRound == false){
			msg.author.send('You can not change guard status after having worked, or outside the work round')
			cleanUpMessage(msg);; 
			return
		}
		bits.shift();
		cName = bits.shift()
		safety = 1;
		while (cName && (safety < 10 )){
			childName = utillib.capitalizeFirstLetter(cName)
			child = children[childName]
			if (!child ){
				msg.author.send('Could not find child: '+childName)
			}else if (person.guarding && person.guarding.indexOf(childName) != -1 ){
				msg.author.send('You are already guarding '+childName)
			} else if (child.age < 0){
				msg.author.send('You can not watch an unborn child ')
			} else {
				if (person.guarding){
					person.guarding.push(childName)
				} else {
					person.guarding = [childName]
				}
				messageChannel(actor+' starts guarding '+childName, gameState)
			}
			cName = bits.shift()
			console.log(' cname is >'+cName+'< '+safety)
			safety += 1
		}
		return
	}
	if (command == 'ignore'){
		if (bits.length < 2){
			msg.author.send('ignore <childName> [otherNames]')
			cleanUpMessage(msg);; 
			return		
		}
		person = population[actor]
		if (person.worked == true){
			msg.author.send('You can not change guard status after having worked.')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.workRound == false){
			msg.author.send('You can not change guard status outside the work round')
			cleanUpMessage(msg);; 
			return
		}
		if (person.worked == true){
			msg.author.send('Can not change guard status after having worked')
			cleanUpMessage(msg);; 
			return
		}
		bits.shift()
		foo = bits.shift()
		while (foo) {
			childName = utillib.capitalizeFirstLetter(foo)
			child = children[childName];
			if (!child ){
				msg.author.send('Could not find child: '+childName)
			} else if (!person.guarding || person.guarding.indexOf(childName) == -1 ){
				msg.author.send('You are not guarding '+childName)
			} else {
				childIndex = person.guarding.indexOf(childName)
				if (childIndex > -1) {
					person.guarding.splice(childIndex, 1);
				}
				messageChannel(actor+' stops guarding '+childName, gameState)
			}
			foo = bits.shift()
		}
		return
	}
	// add a person to the tribe
	if (command == 'induct'){
		if (!referees.includes(actor) && (player && !player.chief)){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first()){
			msg.author.send(command+' requires at least one @target')
			cleanUpMessage(msg);; 
			return
		}
		var target = msg.mentions.users.first().username
		addToPopulation(msg, author, bits, target, msg.mentions.users.first(), gameState)
		return
	}
	if (command.startsWith('initg')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			cleanUpMessage(msg);; 
			return
		}
		gameState = initGame(msg.channel.name.toLowerCase())
		msg.reply('setting game with initial conditions')
		allGames[msg.channel.name.toLowerCase()] = gameState
		msg.reply(utillib.gameStateMessage(gameState))
		return
	} 
	if (command == 'invite'){
		inviteMessage = ''
		if (gameState.reproductionRound && gameState.reproductionList 
			&& gameState.reproductionList[0] && gameState.reproductionList[0].startsWith(actor)){
		} else {
			msg.author.send(command+' is not appropriate now')
			cleanUpMessage(msg);; 
			return
		}
		if (bits.length != 2){
			msg.author.send('usage: !invite <name>')
			cleanUpMessage(msg);; 
			return
		}
		if (player.invite){
			inviteMessage = "The invitation to "+player.invite+" is cancelled.  "
		}
		if (msg.mentions && msg.mentions.users && msg.mentions.users.first()){
			target = msg.mentions.users.first().username
		} else {
			target = bits[1]
		}
		player.invite = target

		inviteMessage += actor+ ' invites '+bits[1]+' to reproduce.  !pass or !consent'
		//TODO msg the invitee
		messageChannel(inviteMessage, gameState)
		return
	}
	if (command == 'inventory'){
		var targetName = bits[1]
		if (msg.mentions.users.first()){
			targetName = msg.mentions.users.first().username
		}
		if (!targetName){
			targetName = actor
		}
		response = 'error'
		if (targetName == 'all'){
			response = 'Whole Tribe Inventory:'
			for (var personName in gameState.population){
				person = personByName(personName, gameState)
				response += '\n  '+inventoryMessage(person)
			}
		}else {
			person = personByName(targetName, gameState)
			if (!person || person == null){
				msg.author.send(target+' does not seem to be a person')
				return
			}
			response = inventoryMessage(person)
		}
		cleanUpMessage(msg);; 
		msg.author.send(response)
		return
	}	
	if (command.startsWith('jerk') ){
		cleanUpMessage(msg);; 
		if (! gameState.canJerky){
			msg.author.send(' conditions are not right to make jerky')
			return
		}
		var amount = bits[1]
		if (!amount || isNaN(amount) ){
			msg.author.send('jerk <amount>')
			return	
		}
		person = personByName(actor, gameState)
		if (person.food < amount ){
			msg.author.send('You do not have that much food')
			return	
		}
		if (amount %3  != 0 ){
			msg.author.send('Must jerk food in multiples of three to avoid waste.')
			return
		}
		var output = Math.trunc(amount/3)
		response = actor +' converts '+amount+' food into '+output+' grain'
		person.food -= (output*3)
		person.grain += output
		messageChannel(response, gameState);
		return
	}
	if (command == 'join' ){
		if ( gameState.open ){
			addToPopulation(msg, author, bits, actor, author, gameState)
			return
		} else {
			msg.author.send('You need to be inducted by the chief to join this tribe')
			cleanUpMessage(msg);; 
			return
		}
	}	
	if (command == 'kill'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		kill(bits[1], bits[2], gameState)
		messageChannel('The referee kills '+targetName, gameState)
		return
	}
	if (command == 'leastguarded' || command == 'leastwatched'){
		response  = guardlib.findLeastGuarded(children, gameState.population)
		msg.author.send(response )
		cleanUpMessage(msg);; 
		return 
	}
	if (command.startsWith('law')){
		var response = ('The laws are:')
		laws = gameState.laws
		for (number in laws){
			response += '\n\t'+number+'\t'+laws[number]
		}
		msg.author.send(response)
		cleanUpMessage(msg);; 
		return
	}
	if (command == 'legislate'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		command = bits.shift()
		number = Number(bits.shift())
		law = ''+bits.join(' ')
		if (Number(number)){
			if (! gameState.laws){
				gameState.laws = {}
			}
			gameState.laws[number] = law;
		} else {
			msg.author.send('syntax: !legislate <number> <everything else is the law>')
			cleanUpMessage(msg);; 
			return
		}
		messageChannel("Your chief creates a new law: "+law, gameState)
		return
	}
	// how much stuff does the target have?  if used by ref with no args, list whole population
	if (command == 'list' || command == 'self'){
		cleanUpMessage(msg);; 
		if (referees.includes(actor)){
				big_message = 'list:\n'
				for (var target in gameState.population){
					message = target +' has '
					for (var type in gameState.population[target]) {
						if (Object.prototype.hasOwnProperty.call( gameState.population[target], type)) {
							message+= type+':'+gameState.population[target][type]+', '
						}
					}
					big_message += message +'\n'
				}
				msg.author.send(big_message)
				return
		} else {
			message = ''
			for (var type in player) {
				if (Object.prototype.hasOwnProperty.call( player, type)) {
					message+= type+':'+player[type]+', '
				}
			}
			msg.author.send(message)
			return
		}
	}	
	if (command == 'listchildren'){
		namelist = Object.keys(children)
		response = "Tribe children: "+namelist
		msg.author.send(response)
		return
	}
	if (command == 'listnames'){
		namelist = Object.keys(population)
		response = "Tribe members: "+shuffle(namelist)
		msg.author.send(response)
		return
	}
	if (command == 'load'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		loadedValue = savelib.loadTribe(gameState.name);
		// very redudimentary validity check
		if (loadedValue && loadedValue.population && loadedValue.population){
			allGames[gameState.name] = loadedValue;
			gameState = allGames[gameState.name] ;
			if (gameState){
				var d = new Date();
				var n = d.toISOString();
				messageChannel(' Game reloaded at '+n,gameState)
				if (gameState.lastSaved){
					messageChannel('All changes since '+gameState.lastSaved+' are lost.' , gameState);
				}
			}
		} else {
			messageChannel('Failed to load game from saved file.  This may be a problem.')
			alertChannel('Failed to load game for '+gameState.name);
		}
		return;
	}
	if (command == 'migrate'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		destination = bits[1]
		if (!destination){
			msg.author.send(command+' requires a destination (and force for chief to make it happen)')
			return
		}
		if (!gameState.reproductionRound){
			msg.author.send("migration happens in the reproduction round")
			return
		}
		force = bits[2]
		message = migrate(msg, destination, force,  gameState)
		messageChannel(message, gameState)
		return
	}
	if (command == 'open'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		gameState.open = true
		messageChannel('The tribe is open to all who wish to join', gameState)
	}
	if (command == 'pass'){
		if (!gameState.reproductionRound){
			msg.author.send('Mating happens during the reproduction round')
			// error meesssage here
			return
		}
		// pass is valid a) when the actor name is top of the reproductionlist
		// or b) when the player is invited
		if (gameState && gameState.reproductionList && gameState.reproductionList[0]
			&& gameState.reproductionList[0].startsWith(actor)){
			nextMating(actor, gameState)
			return
		}
		var inviterName = ''
		var inviter = null
		for (personName in gameState.population){
			person = gameState.population[personName]
			if (person.invite == actor){
				inviterName = personName
				inviter = person
				break
			}
		}
		if (inviterName != ''){
			messageChannel(actor+' declines a mating invitation from '+inviterName, gameState)
			delete inviter.invite
			messageChannel(inviterName+' should !invite another partner, or !pass', gameState)
			return
		}
		msg.author.send('No one seems to have invited you')
		cleanUpMessage(msg);; 
		return
	}
	// add a user to the list of referees; any ref can do this
	if (command === 'promote' ){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return 
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires one @target')
			return
		}
		var target = msg.mentions.users.first()		
		console.log('promote:'+target.username+' by '+actor)
		// disble ref checking for now
		//if (target && referees.includes(actor)){
		if (target){
			if (referees.includes(target.username)){
				msg.author.send(target.username+' is already a referee')
			} else {
				referees.push(target.username)
				msg.author.send('referee list:'+referees)
			}
		} else {
			msg.author.send('No target to promote, or you lack privileges')
		}
		return 	
	}
	if (command == 'ready'){
		message = 'Nobody seems ready for much of anything right now.'
		if (gameState.workRound){
			message = "People available to work: "+listReadyToWork(population)
		}	
		if (gameState.reproductionRound && gameState.reproductionList ){
			message = "The mating invitation order is "+gameState.reproductionList
			for (personName in population){
				if (population[personName].invite){
					message += '\n'+personName+' is awaiting a response from '+population[personName].invite;
				}
			}
		}
		messageChannel(message,gameState)
		cleanUpMessage(msg);
		return
	}
	if (command == 'romance'){
		if (gameState.reproductionRound && gameState.reproductionList ){
			msg.author.send("The mating invitation order is "+gameState.reproductionList)
			for (personName in population){
				if (population[personName].invite){
					msg.author.send(personName+' is awaiting a response from '+population[personName].invite);
				}
			}
		} else {
			msg.author.send("Only valid during reproduction round")
			return
		}
		cleanUpMessage(msg);; 
		return
	}
	if (command == 'roll'){
		messageChannel(utillib.roll(bits[1]), gameState)
		return
	}
	if (command === 'sacrifice'){
		syntaxMessage = 'Sacrifice syntax is sacrifice  <amount> <food|grain|spearhead|basket>'
		if (bits.length < 3 ){
			msg.author.send(syntaxMessage)
			cleanUpMessage(msg);; 
			return
		}
		var username = ''
		amount = bits[1]
		type = bits[2]

		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send(syntaxMessage)
			cleanUpMessage(msg);; 
			return
		}
		if (amount <= 0  ){
			msg.author.send('Can not sacrifice negative amounts')
			cleanUpMessage(msg);; 
			return
		}
		if (! population[actor] || ! population[actor][type]  ){
			msg.author.send('You have no goods in this tribe.')
			cleanUpMessage(msg);; 
			return
		}	
		if (  population[actor][type] >= amount){
			ritualResults = [
				 'You feel a vague sense of unease.'
				,'A hawk flies directly overhead.'
				,'There is the distant sound of thunder'
				,'The campfire flickers brightly.'
				,'You feel a vague sense of unease.'
				,'The sun goes behind a cloud.'
				,'The night goes very still and quiet when the ritual is complete.'
				,'An owl hoots three times.'
				,'In the distance, a wolf howls.'
				,'You remember the way your mother held you as a child.'
				,'You feel protected.'
			]
			random = utillib.roll(2);
			rndMsg = ritualResults[random-2]+'\n';
			messageChannel(actor+' deliberately destroys '+amount+' '+type+' as part of a ritual.\n'+rndMsg, gameState)
			population[actor][type] -= Number(amount)
		} else {
			msg.author.send('You do not have that many '+type+': '+ population[actor][type])
			cleanUpMessage(msg);; 
		}
		savelib.saveTribe(gameState);
		return
	}
	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor) || player.chief){
			savelib.saveTribe(gameState);
			allGames[gameState.name] = gameState;
			msg.author.send('game state saved')
		}
		return
	}	
	if (command == 'scorechildren'){
		msg.author.send(scoreChildren(children, gameState))
		cleanUpMessage(msg);;
		return
	}
	if (command == 'scout'){
		locationName = gameState.currentLocationName
		if (bits[1]){
			locationName = bits[1]
		}
		response = 'The '+locationName+' resources are:\n'
		locationData = locations[locationName]
		if (!locationData){
			msg.author.send('Valid locations are: '+Object.keys(locations))
			cleanUpMessage(msg);;
			return
		}
		response += '\tGather:\n'
		for (var index in locationData['gather']){
			entry = locationData['gather'][index]
			response += '\t\t'+entry[3]+'('+(Number(entry[1])+Number(entry[2]))+') roll '+entry[0]+'\n'
		}
		response += '\tHunt:  Game Track:'+gameState.gameTrack[locationName]+'\n'
		for (var index in locationData['hunt']){
			entry = locationData['hunt'][index]
			response += '\t\t'+entry[2]+'('+entry[1]+')\n'
			if (entry[0] <= gameState.gameTrack[locationName] ){
				response += '\t\t (game track capped)\n'
				break;
			}
		}
		msg.author.send(response)
		cleanUpMessage(msg);;
		return
	}
	if (command == 'secrets'){
		player = personByName(actor, gameState)
		if (player && player.canCraft){
			if (player.noTeach){
				delete player.noTeach
				msg.author.send('You will try to teach those willing to learn')
			} else {
				player.noTeach = true
				msg.author.send('You will no longer teach others to craft')
			}
		} else {
			msg.author.send('You do not know any secrets')
		}
		savelib.saveTribe(gameState);
		return
	}
	if (command == 'skip'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		target = bits[1]
		if (msg.mentions.users.first()){
			target = msg.mentions.users.first().username
		}
		if (!target){
			msg.author.send('usage: skip <current reproducer>')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.reproductionRound && gameState.reproductionList 
			&& gameState.reproductionList[0] && gameState.reproductionList[0].startsWith(target)){
			console.log('legal target to skip')
		} else {
			msg.author.send('it is not '+target+' turn to invite')
			cleanUpMessage(msg);; 
			return
		}
		messageChannel('The chief cancels this chance to reproduce', gameState)
		nextMating(actor, gameState)
		return
	}
	// add a child to tribe; args are parent names
	if (command === 'spawn'){
		if (!referees.includes(actor)){
			msg.author.send('requires referee ')
			cleanUpMessage(msg);; 
			return
		}
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !spawn mother father <force>')
			cleanUpMessage(msg);; 
			return
		}
		var mother = 'unknown'
		var father = 'unknown'
		var force = false
		if (bits.length ==4 ){
			force = bits[3]
		}
		if (msg.mentions.users.first() && msg.mentions.users.last() ){
			mother = msg.mentions.users.first().username
			father = msg.mentions.users.last().username
		} else {
			mother = bits[1]
			father = bits[2]
		}
		spawnFunction(mother, father, msg, gameState.population, gameState, force)
		return
	}
	if (command.startsWith('spec')){
		person = personByName(actor, gameState)
		if (!person ){
			msg.author.send('You must be in the tribe to specialize')
			cleanUpMessage(msg);; 
			return
		}
		if (person.profession){
			msg.author.send('You already have a profession:'+person.profession)
			cleanUpMessage(msg);; 
			return
		}
		if (bits.length != 2 ){
			msg.author.send('usage: !specialize <hunter|gatherer|crafter>')
			cleanUpMessage(msg);; 
			return	
		}
		specialize(msg, actor, bits[1], gameState)
		return
	}
	if (command == 'startwork' || command.startsWith('startw') || command.startsWith('work')
		|| (command.startsWith('start') && bits[1] && bits[1].startsWith('w'))){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.workRound == true){
			msg.author.send('already in the work round')
			return 
		}
		if(gameState.reproductionRound == false){
			msg.author.send('Can only go to work from reproduction')
			return 
		}
		if (gameState.needChanceRoll == true){
			msg.author.send('You still need to do the !chanceroll ')
			return
		}
		startWork(gameState)
		allGames[gameState.name] = gameState;
		return
	}
	if (command == 'startfood' || command.startsWith('startf')  
		|| (command.startsWith('start') && bits[1] && bits[1].startsWith('f'))){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.foodRound == true){
			msg.author.send('already in the foodRound')
			cleanUpMessage(msg);; 
			return 
		}
		if(gameState.workRound == false){
			msg.author.send('Can only go to food round from work round')
			cleanUpMessage(msg);; 
			return 
		}
		startFood(gameState)
		allGames[gameState.name] = gameState;
		return
	}
	if (command == 'startreproduction' || command.startsWith('startr') || command.startsWith('repro')
		|| (command.startsWith('start') && bits[1] && bits[1].startsWith('r'))){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			cleanUpMessage(msg);; 
			return
		}
		if (gameState.reproductionRound == true){
			msg.author.send('already in the reproductionRound ')
			cleanUpMessage(msg);; 
			return 
		}		
		if(gameState.foodRound == false){
			msg.author.send('Can only go to reproduction from food')
			cleanUpMessage(msg);; 
			return 
		}
		startReproduction(gameState)
		allGames[gameState.name] = gameState;
		return
	}
	if (command == 'status'){
		message = utillib.gameStateMessage(gameState)
		if (gameState.workRound ) {message += '  (work round)'}
		if (gameState.foodRound ) {message += '  (food round)'}
		if (gameState.reproductionRound ) {message += '  (reproduction invitation order:'+gameState.reproductionList+')'}
		msg.author.send(message)
		cleanUpMessage(msg);; 
		return
	}
	if (command == 'vote'){
		targetName = bits[1]
		if (msg.mentions.users.first()){
			targetName = msg.mentions.users.first().username
		}
		targetPerson = personByName(targetName, gameState)
		if (!targetPerson){
			msg.author.send(targetName+' not found in the tribe')
			cleanUpMessage(msg);; 
			return
		}
		if (!player){
			msg.author.send(targetName+'You are not a member of the tribe yet.')
			cleanUpMessage(msg);; 
			return
		}
		player.vote = targetName
		totalVotes = countByType(gameState.population, 'vote', targetName)
		tribeSize = Object.keys(gameState.population).length
		if (totalVotes > (2/3 * tribeSize)){
			for (name in gameState.population){
				person = personByName(name, gameState)
				if (person.chief && name != targetName){
					delete person.chief
				}
			}
			if (!targetPerson.chief){
				targetPerson.chief =true
				messageChannel(targetName+' is the new chief', gameState)
			}
		}
		msg.author.send(targetName+' is your choice for Chief')
		return
	}
	/////////// WORK ROUND COMMANDS  ////////////////////////////////////
	if (command == 'gather' 
		|| command == 'craft'
		|| command == 'hunt'
		|| command == 'assist'
		|| command == 'train'
		){
		var message = 'no work done'	
		//////////////////////////////
		/// shared work checks
		/////////////////////////////
		if (gameState.workRound == false ){
			msg.author.send('Can only work during the work round')
			cleanUpMessage(msg);; 
			return
		}
		if (player == null){
			msg.author.send('Only tribe members can work.  Maybe !join')
			cleanUpMessage(msg);; 
			return
		}
		if (player.isInjured && player.isInjured != 'false'){
			msg.author.send('you can not work while you are injured')
			cleanUpMessage(msg);; 
			return
		}
		if (player.isSick && player.isSick != 'false'){
			msg.author.send('you can not work while you are sick')
			cleanUpMessage(msg);; 
			return
		}
		if (player.worked == true){
			msg.author.send('You cannot work (again) this round')
			cleanUpMessage(msg);; 
			return			
		}
		//// begin work; fail and return, or generate a success message
		if (command == 'idle'){
			player.activity = 'idle'
			message = player.playerName +' does nothing for a whole season.'
		}
		if (command == 'gather'){
			if (player.guarding && player.guarding.length > 5){
				msg.author.send('You can not gather while guarding more than 5 children.  You are guarding '+player.guarding)
				cleanUpMessage(msg);; 
				return
			}
			var gatherRoll = utillib.roll(3)
			if (referees.includes(actor) && bits.length >= 2){
				gatherRoll = bits[1]
				if (gatherRoll < 3 || 18 < gatherRoll){
					msg.author.send('Roll must be 3-18')
					cleanUpMessage(msg);; 
					return
				}
			}
			message = gatherlib.gather( author.username, player, gatherRoll, gameState)
			player.activity = 'gather'
		} 
		if (command == 'craft'){
			type = bits[1]
			if (player.canCraft == false){
				msg.author.send('You do not know how to craft')
				cleanUpMessage(msg);; 
				return
			}
			if (player.guarding && player.guarding.length > 2){
				msg.author.send('You can not craft while guarding more than 2 children.  You are guarding '+player.guarding)
				cleanUpMessage(msg);; 
				return
			}
			if (type != 'basket' && type != 'spearhead'){
				msg.author.send('Must craft basket or spearhead')
				cleanUpMessage(msg);; 
				return	
			}
			var craftRoll = utillib.roll(1)
			if (referees.includes(actor) && bits.length >= 3){
				craftRoll = bits[2]
				if (craftRoll < 1 || 6 < craftRoll){
					msg.author.send('Roll must be 1-6')
					cleanUpMessage(msg);; 
					return
				}
			}
			message = craft( author.username, player, type, craftRoll)
			player.activity = 'craft'
		} 
		if (command == 'assist'){
			var target = ''
			if (bits.length > 1){
				target = bits[1]
			} 
			if (msg.mentions.users.first()){
				target= msg.mentions.users.first().username
			}
			assistedPlayer = personByName(target, gameState)
			if (!assistedPlayer){
				msg.author.send('Could not find '+target)
				cleanUpMessage(msg);; 
				return	
			}
			message = assist(author.username, player, assistedPlayer)
			player.activity = 'assist'
		} 
		if (command == 'train'){
			if (player.canCraft){
				msg.author.send('You already know how to craft')
				cleanUpMessage(msg);; 
				return
			}
			if (player.guarding && player.guarding.length > 2){
				msg.author.send('You can not learn crafting while guarding more than 2 children.  You are guarding '+player.guarding)
				return
			}
			var crafters = countByType(population, 'canCraft', true)
			var noTeachers = countByType(population, 'noTeach', true)
			if (crafters <= noTeachers){
				msg.author.send('No on in the tribe is able and willing to teach you crafting')
				return
			}
			learnRoll = utillib.roll(2)
			if ( learnRoll >= 10 ){
				player.canCraft = true
				message = actor+' learns to craft. ['+learnRoll+']'
			} else {
				message = actor+' tries to learn to craft, but does not understand it yet. ['+learnRoll+']'
			}
			player.activity = 'training'
		} 
		if (command == 'hunt'){
			if (player.guarding && player.guarding.length > 0){
				msg.author.send('You can not go hunting while guarding '+player.guarding)
				cleanUpMessage(msg);; 
				return
			}
			if (player.isPregnant && player.isPregnant != 'false'){
				msg.author.send('You can not hunt while pregnant')
				cleanUpMessage(msg);; 
				return
			}
			var huntRoll = utillib.roll(3)
			if (referees.includes(actor) && bits.length >= 2){
				huntRoll = bits[1]
				if (huntRoll < 3 || 18 < huntRoll){
					msg.author.send('Roll must be 3-18')
					cleanUpMessage(msg);; 
					return
				}
			}
			//message = hunt(actor, player, huntRoll, gameState)
			message = huntlib.hunt(actor, player, huntRoll, gameState);
			player.activity = 'hunt'
		}
		messageChannel( message , gameState)
		player.worked = true
		slackers = listReadyToWork(population)
		if (slackers && slackers.length == 0){
			messageChannel('-= All available workers have worked =-', gameState)
			startFood(gameState)
		}
		savelib.saveTribe(gameState);
		return	
	}
	msg.author.send('TribesBot did not understand the command '+bits)
	msg.author.send('Try !help ')
	cleanUpMessage(msg);; 
	return	
}
function listReadyToWork(tribe){
	var unworked = []
	for (playerName in tribe){
		person = tribe[playerName]
		// edit can leave isinjured as the string 'false'
		if (person.worked || (person.isInjured && person.isInjured != 'false')
			||(person.isSick && person.isSick != 'false')){
			// do nothing
		} else {
			unworked.push(playerName)
		}
	}
	return unworked
}
function getNextChildName(children, childNames, nextIndex){
	var currentNames = Object.keys(children)
	if (!nextIndex){
		numberOfChildren = currentNames.length
		nextIndex = (numberOfChildren % 26 )
	}
	possibles = childNames['names'][nextIndex]
	counter = 0
	possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]
	while (counter < 10 && (possibleName in currentNames) ){
		possibleName = possibles[ (Math.trunc( Math.random ( ) * possibles.length))]	
	}
	if (counter == 10){
		console.log('could not get a unique child name. '+currentNames+' tried:'+possibleName)
	}
	if (!possibleName){
		console.log('Failed to get a possible name.  counter:'+counter+' nextIndex='+nextIndex)
		possibleName = 'Bug'
	}
	return possibleName
}
function addChild(mother, father, gameState){
	var child = Object()
	child.mother = mother
	child.father = father
	child.age = -2
	child.food = 0
	child.gender = genders[ (Math.trunc( Math.random ( ) * genders.length))]
	nextIndex = (gameState.populationCounter % 26 )
	child.name = getNextChildName(gameState.children, allNames, nextIndex)
	children[child.name] = child	
	person = personByName(mother, gameState)
	gameState.population[child.mother].isPregnant = child.name
	if (gameState.reproductionList){
		const indexOfPreggers = gameState.reproductionList.indexOf(mother);
		if (indexOfPreggers > -1) {
			gameState.reproductionList.splice(indexOfPreggers, 1);
			console.log('attempting to remove pregnant woman from reproduction list')
		}
	}
	gameState.populationCounter++
	return child
}

function clearWorkFlags(population){
	// for every person
	// if injured and !worked, injured = false
	// worked = false
	for  (var targetname in population) {
		person = population[targetname]
		if (! person){
			console.log('null person for name '+targetname)
			continue
		}
		if (person.isInjured && person.isInjured != 'false' && person.worked == false){
			// did not work means rested
			delete person.isInjured
			person.activity = 'recovery'
		}
		if (person.isSick && person.isSick != 'false' && person.worked == false){
			// did not work means rested
			delete person.isSick
			person.activity = 'recovery'
		}
		person.worked = false
	}
}
function nextMating(currentInviterName, gameState){
	player = personByName(currentInviterName, gameState)
	if (!player){
		console.log('bad attempt to call nextMating, person not found '+currentInviterName)
	}
	for (var targetname in gameState['population']){
		if (gameState['population'][targetname].invite){
			console.log("deleting invite from "+targetname+" to "+gameState['population'][targetname].invite)
		}
		delete gameState['population'][targetname].invite
	}
	if (!gameState.reproductionList){
		console.log (" no reproduction list yet. bad call to nextMating")
		return
	}
	gameState.reproductionList.shift()
	if (gameState.reproductionList.length > 0){
		messageChannel(gameState.reproductionList[0]+ " should now !invite people to reproduce, or !pass ", gameState)
		eligibleMates = reproLib.eligibleMates(gameState.reproductionList[0], gameState.population)
		messageChannel("Valid targets to invite: "+reproLib.eligibleMates(), gameState)
		messageChannel("People who have not yet invited: "+gameState.reproductionList, gameState)
		return
	} else {
		messageChannel('Reproduction round is over.  Time for the chance roll', gameState)
		return
	}
}

function spawnFunction(mother, father, msg, population, gameState, force = false){
	if (!population[mother] || !population[father]){
		msg.author.send('Parents not found in tribe')
		cleanUpMessage(msg);; 
		return
	}
	if (population[mother].gender == population[father].gender ){
		msg.author.send("Parents must be different genders")
		cleanUpMessage(msg);; 
		return
	}
	if (population[mother].gender != 'female'){
		temp = mother;
		mother = father;
		father = temp
	}
	if (population[mother].isPregnant  && population[mother].isPregnant != '' && population[mother].isPregnant != 'false'){
		msg.author.send(mother+' is already pregnant')
		cleanUpMessage(msg);; 
		return
	}
	spawnChance = 9
	if (population[mother].nursing && population[mother].nursing.length > 0){
		spawnChance = 10
	}
	mroll = utillib.roll(1)
	droll = utillib.roll(1)
	if (force != false || (mroll+droll) >= spawnChance ){
		var child = addChild(mother, father, gameState)
		messageChannel('The mating of '+mother+'['+mroll+'] and '+father+'['+droll+'] spawned '+child.name, gameState)
		if (gameState.reproductionList){
			var hasNotMated = gameState.reproductionList.includes(mother)
			if (hasNotMated){
				console.log("attempting to remove pregnant woman "+mother+" from the reproduction list")
				gameState.reproductionList.delete(gameState.reproductionList.indexOf(mother))
			} else {
				console.log('did not find '+mother+' in the reproduction list')
			}
		}
	} else {
		messageChannel('The mating of '+mother+'['+mroll+'] and '+father+'['+droll+'] produced only good feelings', gameState)
	}
	var allPregnant = true
	for (var personName in population){
		var person = population[personName]
		if (person.gender == 'female' && ! person.isPregnant){
			allPregnant = false
			break
		}
	}
	if (allPregnant ){
		messageChannel('No more reproductive pairings are available.', gameState)
		delete gameState.reproductionList
	}
	savelib.saveTribe(gameState);
	return
}
function specialize( msg, playerName, profession, gameState){
	playerName = msg.author.username
	profession = bits[1]
	helpMessage = "Welcome new hunter.  \n"
	helpMessage+= "To hunt, do !hunt and the bot rolls 3d6.  Higher numbers are bigger animals, and very low numbers are bad - you could get injured. \n"
	helpMessage+= "You cannot guard children while hunting. \n"
	helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you a bonus to your roll. \n"
	helpMessage+= "You can also `!gather`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";

	if (profession.startsWith('h')){
		profession = 'hunter'
		// use default helpMessage
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
		helpMessage+= "Before you set out, you might consider waiting for a crafter to make you a spearhead which gives you an additional gather attempt. \n"
		helpMessage+= "You can also `!hunt`, but at a penalty. If your tribe has someone who knows how to craft, you can try to learn that skill with `!train`";
	}
	if ( !profession || !professions.includes(profession)){
		msg.author.send('usage:!'+bits[0]+' [hunter|gatherer|crafter] ')
		return
	}
	var person = personByName(playerName, gameState)
	if (!person){
		msg.author.send(playerName +', you are not in this tribe.')
		return
	}
	person.profession = profession
	messageChannel(playerName+ ' is a skilled '+profession, gameState)
	if (person.profession == 'crafter'){
		person.canCraft = true
	}
	msg.author.send(helpMessage);
	return
}
function addToPopulation(msg, author, bits, target,targetObject,gameState){
	gender = bits[1]
	var profession = false
	if (bits.length == 4){
		// old-style
		profession = bits[1]
		gender = bits[2]
	}
	if (!target ){
		msg.author.send('must specify: <gender> <name>')
		return
	}
	if (gameState.population[target]){
		msg.author.send(target+' is already in the tribe')
		return
	}
	if (gender === 'm'){gender = 'male'}
	if (gender === 'f'){gender = 'female'}
	if ( !target || !gender || !genders.includes(gender) ){
		msg.author.send('usage:'+bits[0]+' [female|male] name')
		return
	}
	var person = {}
	person.gender = gender
	person.food = 10
	person.grain = 4
	person.basket = 0
	person.spearhead = 0
	person.handle = targetObject
	person.name = target
	var strRoll = utillib.roll(1)
	response = 'added '+target+' '+gender+' to the tribe. '
	if (strRoll == 1){
		person.strength = 'weak'
		response+= target +' is weak.'
	} else if (strRoll == 6){
		person.strength == 'strong'
		response+= target +' is strong.'
	}
	gameState.population[target] = person
	if (profession){
		specialize(msg, target, profession, gameState)
	}
	messageChannel(response, gameState)
	savelib.saveTribe(gameState);
	return
}
function messageChannel(message, gameState){
	channel = bot.channels.cache.find(channel => channel.name === gameState.name)
	if (channel){
		channel.send(message)
	} else {
		console.log('no channel found for '+gameState.name)
		message.author.send('ERROR: failed to find channel to tell it this: '+message);
	}
}
function countAdultChildren(motherName, children){
	var adultChildren = Number(0);
	for (childName in children){
		var child = children[childName]
		if (child.mother == motherName && child.age >= 24 ){
			adultChildren += 1
		}
	}
	return adultChildren
}

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
function checkFood(gameState){
	message = ''
	hungryAdults = []
	satedAdults = []
	hungryChildren = []
	satedChildren = []
	children = gameState.children
	population = gameState.population
	for  (var targetname in population) {
		person = population[targetname]
		hunger = 4
		if (person.gender == 'female' && countChildrenOfParentUnderAge(children, targetname, 4) > 1){
			hunger = 6
		}
		snacks = person.food + person.grain
		if (snacks >= hunger) {
			satedAdults.push(targetname)
		} else {
			hungryAdults.push(targetname)
		}
	}
	for (var childName in children){
		var child = children[childName]
		if (child.food >= 2 || child.newAdult ){
			satedChildren.push(childName)
		}else {
			hungryChildren.push(childName)
		}
	}
	message = 'Happy People: '+satedAdults+", "+satedChildren
	message += '\nHungry adults: '+hungryAdults
	message += '\nHungry children: '+hungryChildren
	return message
}
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
					kill(childName, 'prenatal starvation',gameState)
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
		kill(perished[i], 'starvation', gameState)
	}
	if ((perished.length) == 0 ){
		response += 'No adults starved! \n'
	}
	return response;
}
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
				response += " child:"+childName+"("+child.mother+"+"+child.father+") has starved to death.\n"
				child.dead = true
				if (population[child.mother] && population[child.mother].isPregnant ) {
					delete population[child.mother].isPregnant
				}
				perishedChildren.push(childName)
				continue;
			} 
			if (child.age == 0 ){
				birthRoll = utillib.roll(3)
				response += '\t'+child.mother+' gives birth to a '+child.gender+'-child, '+child.name
				if (birthRoll < 5 ){
					response += ' but the child did not survive\n'
					child.dead = true
					perishedChildren.push(childName)
					continue;
				} else {
					response += '\n'
				}
				//Mothers start guarding their newborns
				person = personByName(child.mother, gameState)
				if (!person.guarding){
					person.guarding = [child.name]
				} else {
					person.guarding.push(child.name)
				}
				if (birthRoll == 17){
					twin = addChild(child.mother, child.father, gameState);
					reponse += child.mother+' gives birth to a twin! Meet '+twin.name+'\n'
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
						response += name+' stops watching the new adult.'
					}
				}

			}
		}
	}
	// clean up the dead
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		kill(perishedChildren[i], 'starvation', gameState)
		console.log('removing child corpse '+corpse)
	}
	if ((perishedChildren.length) == 0 ){
		response += 'No children starved!'
	}
	return response;
}
// consume food also ages children, and handles birth
function consumeFood(gameState){
	if (!gameState){
		console.log('no game state; ERROR')
		return
	}
	console.log('adults are eating')
	response = "Food round results:\n"
	console.log('food response is '+response)
	response += consumeFoodPlayers(gameState);
	console.log('food response is '+response)
	response += consumeFoodChildren(gameState);
	console.log('food response is '+response)
	return response
}

function kill(name, message, gameState){
	console.log("Killing "+name+" due to "+message+" at "+gameState.seasonCounter);
	population = gameState.population
	children = gameState.children
	childName = utillib.capitalizeFirstLetter(name)
	if (! message || message == ''){
		message = 'unknown causes'
	}
	person = personByName(name, gameState)
	if (person){
		person.deathMessage = message
		person.deathSeason = gameState.seasonCounter
		if (person.isPregnant ){
			kill(person.isPregnant, 'mother-died', gameState)
		}
		if (person.nursing){
			person.nursing.forEach(childName=>kill(childName, 'no-milk'))
		}
		gameState.graveyard[person.name] = person
		delete population[person.name]
	} else if (childName in children){
		unguardChild(childName, population)
		clearNursingPregnant(childName, gameState.population)
		var child = children[childName]
		child.deathMessage = message
		child.deathSeason = gameState.seasonCounter
		gameState.graveyard[childName] = child
		delete children[childName]
	} else {
		console.log('Tried to kill '+name+' but could not find them')
	}
	return 
}
function clearNursingPregnant(childName, population){
	for (personName in population){
		person = population[personName]
		if (person && person.nursing && person.nursing.indexOf(childName) > -1 ){
			childIndex = person.nursing.indexOf(childName)
			person.nursing.splice(childIndex, 1);
			console.log(personName+' is no longer nursing '+childName)
			if ((person.nursing).length == 0){
				delete person.nursing
			}
		}
		if (person.isPregnant && person.isPregnant == childName){
			person.isPregnant = ''
			console.log(personName+' is no longer pregnant with '+childName)
		}
	}
}


function unguardChild(childName, population){
	for (personName in population){
		person = population[personName]
		if (person.guarding && person.guarding.indexOf(childName) != -1){
			childIndex = person.guarding.indexOf(childName)
			person.guarding.splice(childIndex, 1);
		}
	}
}
function startWork(gameState){
	savelib.archiveTribe(gameState);
	// advance the calendar; the if should only skip on the 0->1 transition
	if (gameState.workRound == false){
		nextSeason(gameState)
	}
	// clear out old activities
	for (personName in population){
		person = population[personName]
		delete person.activity
	}
	messageChannel(utillib.gameStateMessage(gameState), gameState)
	messageChannel('\nStarting the work round.  Guard (or ignore) your children, then craft, gather, hunt, assist or train.', gameState)
	gameState.workRound = true
	gameState.foodRound = false
	gameState.reproductionRound = false
	canJerky = false
	savelib.saveTribe(gameState);
	allGames[gameState.name] = gameState;
	return
}
function startFood(gameState){
	savelib.archiveTribe(gameState);
	clearWorkFlags(population)
	message = utillib.gameStateMessage(gameState)
	messageChannel(message+'\nStarting the food and trading round.  Make sure everyone has enough to eat, or they will starve', gameState)
	foodMessage = checkFood(gameState)
	messageChannel(foodMessage, gameState)
	gameState.workRound = false
	gameState.foodRound = true
	gameState.reproductionRound = false
	savelib.saveTribe(gameState);
	allGames[gameState.name] = gameState;
	return
}
function startReproduction(gameState){
	// actually consume food here
	savelib.archiveTribe(gameState);
	foodMessage = consumeFood(gameState)
	gameState.needChanceRoll = true  // this magic boolean prevents starting work until we did chance roll
	messageChannel(foodMessage+'\n', gameState)
	messageChannel('Starting the Reproduction round; invite other tribe members to reproduce (not automated)', gameState)
	messageChannel(utillib.gameStateMessage(gameState), gameState)
	messageChannel('The tribe can decide to move to a new location, but the injured and children under 2 will need 2 food', gameState)
	namelist = createReproductionList(gameState)
	messageChannel("Invitation order: "+shuffle(namelist), gameState)
	gameState.reproductionList = nameList
	messageChannel(gameState.reproductionList[0]+ " should now !invite people to reproduce, or !pass ", gameState)
	gameState.workRound = false
	gameState.foodRound = false
	gameState.reproductionRound = true
	savelib.saveTribe(gameState);
	allGames[gameState.name] = gameState;
	return
}
function migrate(msg, destination, force, gameState){
	children = gameState.children
	population = gameState.population
	response = ''
	legalLocations = Object.keys(locations)
	if (!legalLocations.includes(destination) ){
		msg.author.send(destination+' not a valid location.  Valid locations:'+legalLocations)
		return
	}
	if (gameState.currentLocationName == destination){
		msg.author.send(destination+' is where the tribe already is.')
		return
	}
	// every injured person pays 2 food, or dies.
	deceasedPeople = []
	deceasedChildren = []
	if (force){
		for (personName in population){
			var person = personByName(personName, gameState)
			if (person.isInjured){
				need = 2
				eaten = 0
				while (eaten < need){
					if (person.food > 0 ){
						person.food--
						eaten++
					} else if (person.grain > 0){
						person.grain--
						eaten++
					}else {
						deceasedPeople.push(personName)
					}
				}
			}
		}
		for (childName in children){
			var child = children[childName]
			// child age is in seasons
			if (child.age < 5){
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
				kill(deceasedPeople[i],'migration hunger',gameState)
				response+= " "+deceasedPeople[i]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				kill(deceasedChildren[i],'migration hunger',gameState)
				response+= " "+deceasedChildren[i]
			}
		}
		messageChannel('Setting the current location to '+destination, gameState)
		gameState.currentLocationName = destination
	} else {
		for (personName in population){
			person = personByName(personName, gameState)
			if (person.isInjured){
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
			if (child.age < 5){
				if (child.food < 2){
					deceasedChildren.push(childName)
				} 
			}
		}
		response += '\nThe following tribe members would die on the journey to '+destination+': '+deceasedPeople
		response += '\nThe following children would die along the way: '+deceasedChildren
	}
	return response+'\n'
}
// blatantly lifted from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
  
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
  
	  // Pick a remaining element...
	  randomIndex = Math.floor(Math.random() * currentIndex);
	  currentIndex -= 1;
  
	  // And swap it with the current element.
	  temporaryValue = array[currentIndex];
	  array[currentIndex] = array[randomIndex];
	  array[randomIndex] = temporaryValue;
	}
  
	return array;
  }
//////////////////////////////////////////////////////////
/////  WORK SECTION   
/////////////////////////////////////////////////////////
function craft(playername, player, type, rollValue){
	console.log('craft type '+type+' roll '+rollValue)
	player.worked = true
	if (type.startsWith('spear')){
		type = 'spearhead'
	}
	if (player.profession != 'crafter'){
		rollValue -= 1
	}
	if (rollValue > 1 && type == 'basket'){
			player.basket += 1
	} else if (rollValue > 2 && type == 'spearhead') {		
			player.spearhead += 1
	} else {
		return playername+ ' fails['+rollValue+'] at crafting a '+type
	}
	return playername+' crafts['+rollValue+'] a '+type
}
function assist(playername, player, helpedPlayer){
	player.worked = true
	bonus = 0
	if (player.spearhead > 0){
		bonus += 1
	}
	if (player.profession == 'hunter'){
		bonus += 1
	} else {
		bonus += 0.5
	}
	if (helpedPlayer.bonus ){
		helpedPlayer.bonus += bonus
	} else {
		helpedPlayer.bonus = bonus	
	}
	if (!helpedPlayer.helpers){
		helpedPlayer.helpers = [playername]
	} else {
		helpedPlayer.helpers.push(playername)
	}
	return player.name + ' will assist '+helpedPlayer.name+' if they hunt'
}
function gatherDataFor(locationName, roll){
	resourceData = locations[locationName]['gather']
	maxRoll = resourceData[resourceData.length-1][0]
	minRoll = resourceData[0][0]
	if (roll > maxRoll){
		roll = maxRoll
	}
	if (roll < minRoll){
		roll = minRoll
	}
	for (var i=0; i < resourceData.length; i++){
		if (resourceData[i][0] == roll){
			return resourceData[i]
		}
	}
	console.log('error looking up resourceData for '+locationName+' '+type+' '+roll)
}
