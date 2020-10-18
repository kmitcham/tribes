var Discord = require('discord.js');
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

const locationDecay = [20,20,20,17,17,
					15,15,14,14,13,
					13,12,12,11,11,
					10,10,9,9,8]
const childSurvivalChance = 
	[ 8, 8, 8, 8, 9, 9,10,10,10,11  // 4 years
	,11,11,12,12,13,13,13,14,14,14  // 9 years
	,15,15,16,16,17]
var gameState = Object()
var referees = ["kevinmitcham", "@kevinmitcham"]
//var referees = require('./referees.json')
var  tribeChannel = bot.channels.cache.find(channel => channel.name === 'tribes')

var games = {}

bot.once('ready', ()=>{
	console.log('bot is alive')
	loadGame()
	alertChannel = bot.channels.cache.find(channel => channel.name === 'tribes')
	alertChannel.send('TribesBot is alive again')
	//generalChannel = bot.channels.cache.find(channel => channel.name === 'general')
	//generalChannel.send('TribesBot is spamming things again')
	// TODO send a message to the channel here?
  })   
bot.login(auth['token'])


function loadJson(fileName){
	let rawdata = fs.readFileSync(fileName);
	if (!rawdata || rawdata.byteLength == 0 ){
		return {}
	}
	return JSON.parse(rawdata, {});	
}
function loadGame(gameName){
	if (fs.existsSync('./gameState.json')) {
		gameState = loadJson('./gameState.json') 
		//tribeChannel = bot.channels.cache.find(channel => channel.name === (gameState.name+'-tribe'))
		//gameState.tribeChannel = bot.channels.cache.find(channel => channel.name === (gameState.name+'-tribe'))
		tribeChannel = bot.channels.cache.find(channel => channel.name === ('tribes'))
		gameState.tribeChannel = bot.channels.cache.find(channel => channel.name === ('tribes'))
	} else {
		initGame(gameName)
	}
	if (fs.existsSync('./population.json')) {
		population = loadJson('./population.json') 
	}  else {
		population = {}
	}
	if (fs.existsSync('./children.json')) {
		children = loadJson('./children.json') 
	} else {
		children = {}
	}
	if (!tribeChannel || !gameState.tribeChannel){
		console.log('----- ERROR WITH tribeChannel ------------')
	}
}

function initGame(gameName){
	if (!gameName){
		gameName = ''
	}
	gameState.seasonCounter = 1
	gameState.gameTrack = {}
	gameState.name = gameName
	gameState.open = true
	gameState.populationCounter = 0
	for (locationName in locations){
		gameState.gameTrack[locationName] = 0
	}
	gameState.currentLocationName = "veldt";
	gameState.graveyard = {}
	tribeChannel = bot.channels.cache.find(channel => channel.name === ('tribes'))
	gameState.tribeChannel = bot.channels.cache.find(channel => channel.name === ('tribes'))
	if (! tribeChannel){
		console.log('tribe channel not defined')
	}
	population = {}
	children = {}
	graveyard = {}
	gameState.workRound = true;
	gameState.foodRound = false;
	gameState.reproductionRound = false;
	gameState.needChanceRoll = true
	gameState.canJerky = false
	return
}
function endGame(){
	adultCount = 0
	response = 'The fate of the children:\n'
	for (childName in children){
		var child = children[childName]
		if (!child.newAdult){
			if (roll(3) <= childSurvivalChance[child.age]){
				child.newAdult = true
				response += '\t'+childName+' grows up\n'
			} else {
				response += '\t'+childName+' dies young\n'
				kill(childName, 'endgame scoring')
			}
		}
		if (child.newAdult){
			adultCount++
		}
	}
	adultCount += Object.keys(population).length
	response += 'Count of adults is:'+adultCount
	return response
}
function scoreChildren(children){
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
		message+= '\t'+parentName+': '+parentScores[parentName]
	}
	return message
}
function initTribe(game, tribeName){
	tribe = Object()
	tribe.name = tribeName
	tribe.population = {}
	tribe.children = {}
	tribe.graveyard = {}
	tribe.gameState.currentLocation = 'veldt'
	game.tribes[tribeName] = tribe
}
function isColdSeason(){
	return (gameState.seasonCounter%2 == 0);
}
function getYear(){
	return gameState.seasonCounter/2;
}
function gameStateMessage(){
	message = "Year "+(gameState.seasonCounter/2)+', '
	season = 'warm season.'
	if (isColdSeason()){
		season = 'cold season.'
	}
	var numAdults = (Object.keys(population)).length
	var numKids = (Object.keys(children)).length

	message+=season+'The '+gameState.name+' tribe has '+numAdults+' adults and '+numKids+' children'
	message+= ' The '+gameState.currentLocationName+' game track is at '+ gameState.gameTrack[gameState.currentLocationName]
	return message
}
function nextSeason(){
	if (isColdSeason()){
		for (locationName in locations){
			modifier = locations[locationName]['game_track_recover']
			oldTrack = gameState.gameTrack[locationName]
			gameState.gameTrack[locationName]  -= modifier
			if (gameState.gameTrack[locationName]< 0){
				gameState.gameTrack[locationName] = 0
			}
			console.log(locationName+' game_track moves from '+oldTrack+' to '+gameState.gameTrack[locationName])
		}
	}
	gameState.seasonCounter += 1
}
function inventoryMessage(targetName){
	person = personByName(targetName)
	if (!person){
		return 'No person '+targetName
	}
	message = person.food+' food \t'
	message += person.grain+' grain \t'
	message += person.basket+' baskets \t'
	message += person.spearhead+' spearheads \t'
	message += person.profession+' '+person.gender.substring(0,1)+'\t'+targetName
	if (person.isPregnant && person.isPregnant != ''){
		message += '\n\t\t is pregnant with '+person.isPregnant
	}
	if (person.nursing && person.nursing.length > 0 ){
		message += '\n\t\t is nursing '+person.nursing
	}
	if (person.isInjured && person.isInjured != 'false' ){
		message += '\n\t\t is injured and unable to work'
	}
	if (person.guarding){
		message += '\n\t\t is guarding '+person.guarding
	}
	return message
}
bot.on('message', msg => {
  if (!msg.content ){
	return
  }
  if (msg.content.substring(0,1) != '!'){
	return
  }
  processMessage(msg)
});

function savegameState(){
	if (gameState){
		fs.writeFile("gameState.json", JSON.stringify(gameState,null,2), err => { 
			// Checking for errors 
			if (err) throw err;  
		}); 
	}
	if (population){
		fs.writeFile("population.json", JSON.stringify(population,null, 2), err => { 
			// Checking for errors 
			if (err) throw err;  
		}); 
	}
	if (children){
		fs.writeFile("children.json", JSON.stringify(children,null, 2), err => { 
			// Checking for errors 
			if (err) throw err;  
		}); 
	}
	fs.writeFile("referees.json", JSON.stringify(referees,null, 2), err => { 
		// Checking for errors 
		if (err) throw err;  
	}); 
}

function processMessage(msg){
	author = msg.author
	actor = author.username
	bits = msg.content.split(' ')
	command = bits[0]
	command = command.toLowerCase().substring(1) // strip out the leading !
	console.log('command:'+command+' bits:'+bits+' actor:'+author.username )  
	if (!gameState ){
		msg.author.send('please wait')
		return
	}
	// handle alternate channels
	// TODO smart handling of DMs (search all tribes?)
	//if (msg.channel && gameState && gameState.name && msg.channel.name && !msg.channel.name.startsWith( gameState.name.toLowerCase())){
	//	msg.author.send('this command belongs in channel '+gameState.name+'-tribe')
	//	msg.delete({timeout: 3000}); //delete command in 3sec 
	//	return
	//}
	if (command == 'join' ){
		if ( gameState.open ){
			addToPopulation(msg, author, bits, actor, author)
		} else {
			msg.author.send('You need to be inducted by the chief to join this tribe')
			return
		}
	}
	handleCommand(msg, author, actor,  command, bits)
	return	
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
function personByName(name){
	if (name == null){
		console.log('attempt to find person for null name '+name)
		return null
	}
	if (population == null){
		console.log('no people yet')
		return
	}
	if (name.indexOf('(') != -1){
		name = name.substring(0, name.indexOf('('))
	}
	var person = null
	if (population[name] != null){
		 person = population[name]
	} else if (name && population[name.username] != null){
		person = population[name.username]
	} else if (name.indexOf('@') != -1 && population[name.substring(1)] != null){
		person = population[name.substring(1)]
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
	console.log("No such person in population:"+name)
	return null
}
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
function randomMemberName(){
	nameList = Object.keys(population)
	var random =  Math.trunc( Math.random ( ) * nameList.length )
	return nameList[random]
}
function createReproductionList(population){
	nameList = []
	var tag = '?'
	for (var name in population){
		person = personByName(name)
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
function doChance(rollValue){
	chanceRoll = Number(rollValue)
	if (!rollValue || rollValue < 3 || rollValue > 18 ){
		console.log(' invalid chance roll'+rollValue)
		chanceRoll = roll(3)
	}
	message = 'Chance '+chanceRoll+': '
	switch 	(chanceRoll){
		case 18: case 17: case 16:
			name = randomMemberName()
			person= population[name]
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
			name = randomMemberName()
			person= population[name]
			person.food = 0
			message +="Rats! All "+name+"'s food, except for grain, spoils and is lost. Others’ stored food is not affected. If there are 8 or more players, this happens to two people"
			break;
		case 13 : 
			name = randomMemberName()
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
				amount = roll(2)
				person.food -= amount
				message += "\n "+name+" loses "+amount
				if (person.food < 0) { person.food = 0}
			}
			break;
		case 10 : 
			//message += "A hyena is stalking the tribe’s children! See 'Child In Danger!' to determine what happens."
			message += hyenaAttack(children, population)
			break;
		case 9 : 
			name = randomMemberName()
			person = population[name]
			amount = roll(2)
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
			if ( isColdSeason() && (gameState.currentLocationName == 'Marsh' || gameState.currentLocationName == 'Hills')){
				message = 'Fire in the cold season in the Hills or Marsh is a re-roll'
			} else {
				gameState.gameTrack[gameState.currentLocationName] = 20
			}
			break;
		case 6: 
			name = randomMemberName()
			person = population[name]
			person.isInjured = 'true'
			message +=  name + " injured – miss next turn."
			break;
		case 5: 
			name = randomMemberName()
			person = population[name]
			person.isInjured = 'true'
			message +=  name + " got sick – lost 2 food and miss next turn."
			if (person.food <= 2){
				message += '( but they only had '+person.food+' so they need help or will die)'
			}
			person.food -= 2
			if (person.food < 0) { person.food = 0}
			break;
		case 4: 
		case 3: 
			name = randomMemberName()
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
function roll(count){
		if (!count){
			count = 3
		}
		total = 0
		for (var i = 0; i < count; i++){
			var roll = Math.trunc( Math.random ( ) * 6)+1
			total += roll
		}
		if (total == 0){
			console.log(' BAD roll zero')
		}
		return total
}
function handleCommand(msg, author, actor, command, bits){
	//channelName = msg.channel.name
	//msgChannelType = msg.channel.type
	//console.log('channel '+channelName+' type'+msgChannelType)
	// list commands
	player = personByName(actor)
	if (command === 'help'){
		text = ''
		text+='### Player commands ###\n'
		text+=' !specialize <hunter|gatherer|crafter>(at the start of the game)\n'
		text+=' !children (shows the children ages and food status)\n'
		text+=' !inventory <target|all>  (show inventory and character info (no arg means self))\n'
		text+=' !secrets <toggle the state of willingness to teach others to craft\n'
		text+=' !status (see the current location, year, season and local game)\n'
		text+=' !vote <target>  (your choice for chief)\n'
		text+=' !give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' !graveyard (list of all deceased members and children)\n'
		text+='-=Work Round Commands=-\n'
		text+=' !guard | !ignore <child>   take on child care responsibilities for the child\n'
		text+=' !leastguarded (shows the least supervised child (ties resolved randomly))\n'
		text+=' !craft <spearhead|basket>\n'
		text+=' !gather\n'
		text+=' !assist <hunter>\n'
		text+=' !hunt\n'
		text+=' !train (learn crafting, if there is a willing teacher)\n'
		text+=' !ready (list who is still available to work)\n'
		text+='-=Food Round Commands=-\n'
		text+=' !foodcheck (examine the food situation for every adult and living child)\n'
		text+=' !feed <amt> <childName>\n'
		text+='-=Reproduction Round Commands=-\n'
		text+=' !invite <target>\n'
		text+=' !pass (decline a mating, or end the members invitation turn)\n'
		text+=' !consent (agree to a mating invitation)\n'
		msg.author.send( text)

		if ((player && player.chief) || referees.includes(actor) ){
			text = '\n### Chief Commands ###\n'
			text+=' !induct|banish <player> add a member to the tribe\n'
			text+=' !open|close  (toggle if people can join with "!join" or only with "!induct" by the chief\n'
			text+=' !startwork (begins the work round, enabling work attempts and rolls)\n'
			text+=' !startfood (ends the work round; subtract food/grain; birth; child age increase)\n'
			text+=' !startreproduction (Players engage in reproduction. Also when migration happens)\n'
			text+=' !chance (after mating, chance is required to end the season)\n'
			text+=' !migrate <newlocation> <force>  (without force, just checks who would perish on the journey)\n'
			msg.author.send( text)
		}
		if (referees.includes(actor)){
			text = ''
			text+='\n### Referee Commands ###\n'
			text+=' edit <target> <canCraft|nursing|isPregnant|profession|gender|partner|worked|food|grain> <value>\n' 
			text+=' editchild <food|age|mother|father> <value>\n' 
			text+=' award <amt> <food|grain|spearhead|basket> <player>\n'
			text+=' kill <name> <message> kill a person or child\n'
			text+=' list <player>  (no arg lists all players)\n '
			text+=' promote|demote <player> to the ref list\n'
			text+=' spawn <mother> <father> add a child with parents\n'
			text+=' save the game file (automatically done at the start of every work round)\n'
			text+=' load the saved file\n'
			text+=' listnames | listchildren just the names\n'
			text+=' initgame erase the current game state and start fresh\n'
			text+=' endgame    convert all the child to corpses, or new adults\n'
			text+=' scorechildren   count number of children by parent'
			msg.author.send( text)
		}
		msg.delete({timeout: 3000}); //delete command in 3sec 
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		var child = addChild(mother, father)	
		gameState.tribeChannel.send("The referee adds a child :"+child.name)
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
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			if (!population[targetName] ) {
				msg.author.send(targetName+' is not living in the tribe')
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			gameState.tribeChannel.send('The game awards '+targetName+' with '+amount+' '+type)
			
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		return
	}
	// remove member from the tribe
	if (command === 'banish'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
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
				unsetGuardian(targetName,children)
				delete population[target.username]
				msg.reply(target.username+' is banished from the tribe')
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (gameState.reproductionRound && gameState.needChanceRoll){
			if (!referees.includes(actor) && bits[1]){
				msg.author.send('Only a referee can force the roll')
				bits[1] = roll()
			}
			if (bits.length == 1){
				bits.push(roll())
			}
			response = doChance(bits[1])
			gameState.tribeChannel.send(response)
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
				response += ' age:'+((child.age)/2)+ ' needs '+(2-child.food)+' food'
				response += ' parents:'+child.mother+'+'+child.father
				if (child.guardian && child.guardian != ''){
					response += ' guardian:'+child.guardian
				}
				if (child.newAdult){
					response += ' Full grown!'
				}
				response += ')\n'
			}
		} 
		msg.author.send(response)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}	
	if (command == 'close'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		gameState.open = true
		gameState.tribeChannel.send('The tribe is only open to those the chief inducts')
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		spawnFunction( actor, inviterName, msg, population)
		if (gameState && gameState.reproductionList && gameState.reproductionList[0].startsWith(inviterName)){
			nextMating(inviterName)
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
		var totals = {
			'veldt':[0,0,0,0,0],
			'hills':[0,0,0,0,0],
			'marsh':[0,0,0,0,0],
			'forest':[0,0,0,0,0]
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
						dataStrong = gatherDataFor(locationName, droll+1)
						totals[locationName][GATHER_STRONG]+= dataStrong[1]
						totals[locationName][GRAIN_STRONG]+= dataStrong[2]
					}
				}
			}
		}
		response = '216 Gather totals:'
		for (locationName in totals){
			response += '\n'+locationName+' food:'+totals[locationName][GATHER]+' grain:'+totals[locationName][GRAIN]
					+ ' sf:'+totals[locationName][GATHER_STRONG] +' sg:'+totals[locationName][GRAIN_STRONG]
		}
		msg.reply(response)
		totals = {
			'veldt':[0,0,0,0,0],
			'hills':[0,0,0,0,0],
			'marsh':[0,0,0,0,0],
			'forest':[0,0,0,0,0]
		}
		MAX = 6000
		for (var i = 0; i < MAX; i++){
			val = roll(3)
			for (locationName in totals){
				locationData = locations[locationName]
				data = gatherDataFor(locationName, val)
				totals[locationName][GATHER]+= data[1]
				totals[locationName][GRAIN]+= data[2]
				dataStrong = gatherDataFor(locationName, val+1)
				totals[locationName][GATHER_STRONG]+= dataStrong[1]
				totals[locationName][GRAIN_STRONG]+= dataStrong[2]
			}
		}
		response = '10x Random Gather avg:'
		for (locationName in totals){
			response += '\n'+locationName+' food:'+Math.round(10*totals[locationName][GATHER]/MAX)
									    +' grain:'+Math.round(10*totals[locationName][GRAIN]/MAX)
										+ ' sf:'  +Math.round(10*totals[locationName][GATHER_STRONG]/MAX)
										 +' sg:'  +Math.round(10*totals[locationName][GRAIN_STRONG]/MAX)
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
		} else{
			msg.author.send(target.username+' is not a referee:'+referees)
		}
	}
	if (command == 'edit'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !edit <targetname> <type> <value>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		var targetName = bits[1]
		if (msg.mentions.users && msg.mentions.users.first() ){
			targetName = msg.mentions.users.first().username
		}
		key = bits[2]
		if (!member_properties.includes(key)){
			msg.author.send('Legal properties to set are '+member_properties)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		value = bits[3]
		console.log('edit '+targetName+' '+key+' '+value )
		person = personByName(targetName)
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
	}
	if (command == 'editchild'){
		childProperties = ['mother','father','age','food','guardian','name']
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length != 4){
			msg.author.send('editchild <childname> <attribute> <value>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return		
		}
		childName = capitalizeFirstLetter(bits[1])
		attribute = bits[2]
		value = bits[3]
		child = children[childName]
		if (!child){
			msg.author.send('Could not find '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (!childProperties.includes(attribute)){
			msg.author.send('Legal properties to set are '+childProperties)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (attribute == 'mother'|| attribute == 'father' || attribute == 'guardian'){
			parent = population[value]
			if (!parent){
				msg.author.send('Could not find tribemember '+value)
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
		}
		if ((attribute == 'age'|| attribute == 'food') && isNaN(value) ){
			msg.author.send('Food and age take number values '+value)
			msg.delete({timeout: 3000}); //delete command in 3sec 
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
		gameState.tribeChannel.send(endGame())
		return
	}
  	// add food to a child
	if (command === 'feed'){
		if (bits.length != 3 || isNaN(bits[1])){
			msg.author.send('feed syntax is feed <amount>  <childname>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		childName = capitalizeFirstLetter(bits[2])
		amount = Number(bits[1])
		if ( ! (childName in children)){
			msg.author.send('feed syntax is feed <amount> <childname>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.author.send('Only the referee can reduce amounts')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (!population[actor] && !referees.includes(actor)  ){
			// this makes sure the author is in the tribe
			msg.delete({timeout: 3000}); //delete command in 3sec 
			msg.author.send("Children do not take food from strangers")
			return
		}		
		if (!children[childName]) {
			msg.author.send('no such child as '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		child = children[childName]
		if (  Number(child.food) >= 2 ){
			msg.author.send(childName+' has enough food already')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if ( (child.food + amount) > 2 ){
			msg.author.send(childName+' does not need that much food')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if ( child.newAdult && child.newAdult == true){
			msg.author.send(childName+' is all grown up and does not need food')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		var fed = 0
		if ( ( population[actor]['food']+population[actor]['grain'] ) >= amount){
			if (population[actor]['food'] >= amount){
				population[actor].food -= Number(amount)
			} else {
				fed -= population[actor].food
				population[actor].food = 0
				population[actor]['grain'] -= (amount-fed)
			}
			gameState.tribeChannel.send(actor+' fed '+amount+' to child '+childName)
			children[childName].food += Number(amount)
			if (children[childName].food != 2){
				gameState.tribeChannel.send(childName+' could eat more.')
			}
		} else {
			msg.author.send('You do not have enough food or grain to feed the child')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		return
	} 
	if (command == 'foodcheck'){
		message = checkFood()
		msg.author.send( message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (command === 'give'){
		if (bits.length < 3){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		amount = bits[1]
		type = bits[2]

		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (amount <= 0  ){
			msg.author.send('Can not give negative amounts')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}			
		if (!population[username] ) {
			msg.author.send(username+' is not a member of the tribe')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if ((type == 'spearhead' || type =='basket') && player && player.worked && player.profession != 'crafter'){
			msg.author.send('The game suspects you used that item to work with.  Ask the referee to help trade it if you did not.')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (  population[actor][type] >= amount){
			gameState.tribeChannel.send(actor+' gave '+amount+' '+type+' to '+username)
			if (!population[username][type]){
				population[username][type] = Number(amount)
			} else {
				population[username][type] += Number(amount)
			}         
			population[actor][type] -= Number(amount)
		} else {
			msg.author.send('You do not have that much '+type+': '+ population[actor][type])
			msg.delete({timeout: 3000}); //delete command in 3sec 
		}
		return
	}
	if (command == 'graveyard'){
		msg.delete({timeout: 1000}); //delete command in 3sec 
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
				response += ' age:'+person.age
			} else {
				response += ' profession:'+person.profession
			}
		}
		msg.author.send(response)
		return
	}
	if (command == 'guard' || command == 'watch'){
		if (bits.length != 2){
			msg.author.send('guard <childName>')
			return		
		}
		person = population[actor]
		if (person.guarding && person.guarding.length > 4){
			msg.author.send('You are already guarding enough children: '+person.guarding)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (person.worked == true|| gameState.workRound == false){
			msg.author.send('You can not change guard status after having worked, or outside the work round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		childName = capitalizeFirstLetter(bits[1])
		child = children[childName]
		if (!child ){
			msg.author.send('Could not find child: '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (person.guarding && person.guarding.indexOf(childName) != -1 ){
			msg.author.send('You are already guarding '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (child.age < 0){
			msg.author.send('You can not watch an unborn child ')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		child.guardian = actor
		if (person.guarding){
			person.guarding.push(childName)
		} else {
			person.guarding = [childName]
		}
		gameState.tribeChannel.send(actor+' starts guarding '+childName)
		return
	}
	if (command == 'ignore'){
		if (bits.length != 2){
			msg.author.send('ignore <childName>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return		
		}
		person = population[actor]
		childName = capitalizeFirstLetter(bits[1])
		child = children[childName]
		if (!person.guarding || person.guarding.indexOf(childName) == -1 ){
			msg.author.send('You are not guarding '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (person.worked == true){
			msg.author.send('Can not change guard status after having worked')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		childIndex = person.guarding.indexOf(childName)
		if (childIndex > -1) {
			person.guarding.splice(childIndex, 1);
		}
		if (!child ){
			msg.author.send('Could not find child: '+childName)
		} else {
			child.guardian = null
		}
		gameState.tribeChannel.send(actor+' stops guarding '+childName)
		return
	}
	// add a person to the tribe
	if (command == 'induct'){
		if (!referees.includes(actor) && (player && !player.chief)){
			msg.author.send(command+' requires referee or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first()){
			msg.author.send(command+' requires at least one @target')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		var target = msg.mentions.users.first().username
		addToPopulation(msg, author, bits, target, msg.mentions.users.first())
		return
	}
	if (command.startsWith('initg')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length > 1){
			initGame(bits[1])
		} else {
			initGame()
		}
		msg.reply('starting game with initial conditions')
		msg.reply(gameStateMessage())
		return
	}
	if (command == 'invite'){
		if (gameState.reproductionRound && gameState.reproductionList && gameState.reproductionList[0].startsWith(actor)){
			console.log('invite is legal')
		} else {
			msg.author.send(command+' is not appropriate now')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length != 2){
			msg.author.send('usage: !invite <name>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (msg.mentions && msg.mentions.users && msg.mentions.users.first()){
			target = msg.mentions.users.first().username
		} else {
			target = bits[1]
		}
		player.invite = target
		//TODO msg the invitee
		gameState.tribeChannel.send(actor+ ' invites '+bits[1]+' to reproduce.  !pass or !consent')
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
			for (var personName in population){
				response += '\n  '+inventoryMessage(personName)
			}
		}else {
			person = personByName(targetName)
			if (!person || person == null){
				msg.author.send(target+' does not seem to be a person')
				return
			}
			response = inventoryMessage(targetName)
		}
		msg.delete({timeout: 3000}); //delete command in 3sec 
		msg.author.send(response)
		return
	}	
	if (command == 'jerk' || command.startsWith('jerk') ){
		msg.delete({timeout: 3000}); //delete command in 3sec 
		if (! gameState.canJerky){
			msg.author.send(' conditions are not right to make jerky')
			return
		}
		var amount = bits[1]
		if (!amount || isNaN(amount) ){
			msg.author.send('jerk <amount>')
			return	
		}
		person = personByName(actor)
		if (person.food < amount ){
			msg.author.send('You do not have that much food')
			return	
		}
		var output = Math.trunc(amount/3)
		response = actor +' converts '+amount+' food into '+output+' grain'
		person.food -= amount
		person.grain += output
		msg.reply(response)
		return
	}
	if (command == 'kill'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		targetName = bits[1]
		target = children[targetName]
		if (!target){
			target = population[targetName]
		}
		if (!target && msg.mentions.users && msg.mentions.users.first()) {
			targetName = msg.mentions.users.first().username
			target = population[targetName]
		}
		if (!target){
			msg.author.send('Count not find target '+targetName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		kill(targetName, bits[2])
		gameState.tribeChannel.send('The referee kills '+targetName)
		return
	}
	if (command == 'leastguarded' || command == 'leastwatched'){
		response  = findLeastGuarded(children, population)
		gameState.tribeChannel.send(response )
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return 
	}
	// how much stuff does the target have?  if used by ref with no args, list whole population
	if (command == 'list' || command == 'self'){
		msg.delete({timeout: 1000}); //delete command in 1sec 
		if (referees.includes(actor)){
				big_message = 'list:\n'
				for (var target in population){
					message = target +' has '
					for (var type in population[target]) {
						if (Object.prototype.hasOwnProperty.call( population[target], type)) {
							message+= type+':'+population[target][type]+', '
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
	if (command == 'migrate' ){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		destination = bits[1]
		if (!destination){
			msg.author.send(command+' requires a destination (and optional force)')
			return
		}
		if (!gameState.reproductionRound){
			msg.author.send("migration happens in the reproduction round")
			return
		}
		force = bits[2]
		message = migrate(msg, destination, force, population, children)
		gameState.tribeChannel.send(message)
		return
	}
	if (command == 'open'){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		gameState.open = true
		gameState.tribeChannel.send('The tribe is open to all who wish to join')
	}
	if (command == 'pass'){
		if (!gameState.reproductionRound){
			// error meesssage here
			return
		}
		// pass is valid a) when the actor name is top of the reproductionlist
		// or b) when the player is invited
		if (gameState && gameState.reproductionList && gameState.reproductionList[0]
			&& gameState.reproductionList[0].startsWith(actor)){
			nextMating(actor)
			return
		}
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
		if (inviterName != ''){
			gameState.tribeChannel.send(actor+' declines a mating invitation from '+inviterName)
			delete inviter.invite
			gameState.tribeChannel.send(inviterName+' should !invite another partner, or !pass')
			return
		}
		msg.author.send('No one seems to have invited you')
		msg.delete({timeout: 3000}); //delete command in 3sec 
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
		message = "People available to work: "+listReadyToWork(population)
		msg.reply(message)
		return
	}
	if (command == 'roll'){
		gameState.tribeChannel.send(roll(bits[1]))
		return
	}
	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor)){
			savegameState()
			msg.author.send('game state saved')
		}
		return
	}	
	if (command == 'scorechildren'){
		msg.author.send(scoreChildren(children))
		return
	}
	if (command == 'scout'){
		locationName = gameState.currentLocationName
		msg.delete({timeout: 1000}); //delete command in 1sec 
		if (bits[1]){
			locationName = bits[1]
		}
		response = 'The resources are:\n'
		locationData = locations[locationName]
		if (!locationData){
			msg.author.send('Nothing known about '+locationName)
			return
		}
		response += '\tGather:\n'
		for (var index in locationData['gather']){
			entry = locationData['gather'][index]
			response += '\t\t'+entry[3]+'('+(Number(entry[1])+Number(entry[2]))+')\n'
		}
		response += '\tHunt:\n'
		for (var index in locationData['hunt']){
			entry = locationData['hunt'][index]
			response += '\t\t'+entry[2]+'('+entry[1]+')\n'
		}
		msg.author.send(response)
		return
	}
	if (command == 'secrets'){
		player = personByName(actor)
		if (player && player.canCraft){
			if (player.noTeach){
				delete player.noTeach
				msg.author.send('You will no longer teach others to craft')
			} else {
				player.noTeach = true
				msg.author.send('You will try to teach those willing to learn')
			}
		} else {
			msg.author.send('You do not know any secrets')
		}
		return
	}
	// add a child to tribe; args are parent names
	if (command === 'spawn'){
		if (!referees.includes(actor)){
			msg.author.send('requires referee ')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !spawn mother father <force>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
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
		spawnFunction(mother, father, msg, population, force)
		return
	}
	if (command.startsWith('spec')){
		person = personByName(actor)
		if (!person ){
			msg.author.send('You must be in the tribe to specialize')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (person.profession){
			msg.author.send('You already have a profession:'+person.profession)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length != 2 ){
			msg.author.send('usage: !specialize <hunter|gatherer|crafter>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return	
		}
		specialize(msg, actor, bits[1], gameState.tribeChannel)
		return
	}
	if (command == 'startwork' || command.startsWith('startw')){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
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
		startWork()
		return
	}
	if (command == 'startfood' || command.startsWith('startf')){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (gameState.foodRound == true){
			msg.author.send('already in the foodRound')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 
		}
		if(gameState.workRound == false){
			msg.author.send('Can only go to food round from work round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 
		}
		startFood()
		return
	}
	if (command == 'startreproduction' || command.startsWith('startr')){
		if (!referees.includes(actor) && !player.chief){
			msg.author.send(command+' requires referee  or chief priviliges')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (gameState.reproductionRound == true){
			msg.author.send('already in the reproductionRound ')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 
		}		
		if(gameState.foodRound == false){
			msg.author.send('Can only go to reproduction from food')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 
		}
		startReproduction()
		return
	}
	if (command == 'status'){
		message = gameStateMessage()
		if (gameState.workRound ) {message += '  (work round)'}
		if (gameState.foodRound ) {message += '  (food round)'}
		if (gameState.reproductionRound ) {message += '  (reproduction round)'}
		msg.author.send(message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (command == 'vote'){
		targetName = bits[1]
		if (msg.mentions.users.first()){
			targetName = msg.mentions.users.first().username
		}
		targetPerson = personByName(targetName)
		if (!targetPerson){
			msg.author.send(targetName+' not found in the tribe')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		player.vote = targetName
		totalVotes = countByType(population, 'vote', targetName)
		tribeSize = Object.keys(population).length
		if (totalVotes > (2/3 * tribeSize)){
			for (name in population){
				person = personByName(name)
				if (person.chief){
					delete person.chief
				}
			}
			targetPerson.chief =true
			gameState.tribeChannel.send(targetName+' is the new chief')
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
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (player == null){
			msg.author.send('Only tribe members can work.  Maybe !join')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (player.isInjured && player.isInjured != 'false'){
			msg.author.send('you can not work while you are injured')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (player.worked == true){
			msg.author.send('You cannot work (again) this round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return			
		}
		//// begin work; fail and return, or generate a success message
		if (command == 'gather'){
			if (player.guarding && player.guarding.length > 5){
				msg.author.send('You can not gather while guarding more than 5 children.  You are guarding '+player.guarding)
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			message = gather( author.username, player, roll(3))
		} 
		if (command == 'craft'){
			type = bits[1]
			if (player.canCraft == false){
				msg.author.send('You do not know how to craft')
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			if (player.guarding && player.guarding.length > 2){
				msg.author.send('You can not craft while guarding more than 2 children.  You are guarding '+player.guarding)
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			if (type != 'basket' && type != 'spearhead'){
				msg.author.send('Must craft basket or spearhead')
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return	
			}
			message = craft( author.username, player, type, roll(1))
		} 
		if (command == 'assist'){
			var target = ''
			if (bits.length > 1){
				target = bits[1]
			} 
			if (msg.mentions.users.first()){
				target= msg.mentions.users.first().username
			}
			assistedPlayer = personByName(target)
			if (!assistedPlayer){
				msg.author.send('Could not find '+target)
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return	
			}
			message = assist(author.username, player, assistedPlayer)
			message += target 
		} 
		if (command == 'train'){
			if (player.canCraft){
				msg.author.send('You already know how to craft')
				msg.delete({timeout: 3000}); //delete command in 3sec 
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
			learnRoll = roll(2)
			if ( learnRoll >= 10 ){
				player.canCraft = true
				message = actor+' learns to craft. ('+learnRoll+')'
			} else {
				message = actor+' tries to learn to craft, but does not understand it yet. ('+learnRoll+')'
			}
		} 
		if (command == 'hunt'){
			if (player.guarding && player.guarding.length > 0){
				msg.author.send('You can not go hunting while guarding '+player.guarding)
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			if (player.isPregnant && player.isPregnant != 'false'){
				msg.author.send('You can not hunt while pregnant')
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
			}
			message = hunt(actor, player, roll(3))
		}
		gameState.tribeChannel.send( message )
		player.worked = true
		slackers = listReadyToWork(population)
		if (slackers && slackers.length == 0){
			gameState.tribeChannel.send('-= Everyone available to work, has worked =-')
			startFood()
		}
		return	
	}
	msg.author.send('TribesBot did not understand the command '+bits)
	msg.author.send('Try !help ')
	msg.delete({timeout: 3000}); //delete command in 3sec 
	return	
}
function listReadyToWork(tribe){
	var unworked = []
	for (name in tribe){
		person = tribe[name]
		// edit can leave isinjured as the string 'false'
		if (person.worked || (person.isInjured && person.isInjured != 'false')){
			// do nothing
		} else {
			unworked.push(name)
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
function addChild(mother, father){
	var child = Object()
	child.mother = mother
	child.father = father
	child.age = -2
	child.food = 0
	child.gender = genders[ (Math.trunc( Math.random ( ) * genders.length))]
	child.guardian = null
	nextIndex = (gameState.populationCounter % 26 )
	child.name = getNextChildName(children, allNames, nextIndex)
	gameState.populationCounter++
	children[child.name] = child	
	person = personByName(mother)
	population[child.mother].isPregnant = child.name
	return child
}

function clearWorkFlags(population){
	console.log('clearing work flags')
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
			person.isInjured = false
		}
		person.worked = false
	}
}
function nextMating(currentInviterName){
	player = personByName(currentInviterName)
	if (!player){
		console.log('bad attempt to call nextMating, person not found '+currentInviterName)
	}
	if (player.invite){
		delete player.invite
	}
	if (!gameState.reproductionList){
		console.log (" no reproduction list yet. bad call to nextMating")
		return
	}
	gameState.reproductionList.shift()
	if (gameState.reproductionList.length > 0){
		gameState.tribeChannel.send(gameState.reproductionList[0]+ " should now !invite people to reproduce, or !pass ")
		return
	} else {
		gameState.tribeChannel.send('Reproduction round is over.  Time for the chance roll')
		return
	}
}
function spawnFunction(mother, father, msg, population, force = false){
	if (!population[mother] || !population[father]){
		msg.author.send('Parents not found in tribe')
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (population[mother].gender == population[father].gender ){
		msg.author.send("Parents must be different genders")
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (population[mother].gender != 'female'){
		temp = mother;
		mother = father;
		father = temp
	}
	if (population[mother].isPregnant  && population[mother].isPregnant != '' && population[mother].isPregnant != 'false'){
		msg.author.send(mother+' is already pregnant')
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	spawnChance = 9
	if (population[mother].nursing && population[mother].nursing.length > 0){
		spawnChance = 10
	}
	mroll = roll(1)
	droll = roll(1)
	if (force != false || (mroll+droll) >= spawnChance ){
		var child = addChild(mother, father)
		gameState.tribeChannel.send('The mating of '+mother+'('+mroll+') and '+father+'('+droll+') spawned '+child.name)
	} else {
		gameState.tribeChannel.send('The mating of '+mother+'('+mroll+') and '+father+'('+droll+') produced only good feelings')
	}
	var allPregnant = true
	for (var personName in population){
		var person = population[personName]
		if (person.gender == 'female' && ! person.isPregnant){
			allPregnant = false
			break
		}
	}
	if (allPregnant){
		gameState.tribeChannel.send('All the adult women of the tribe are pregnant')
		delete gameState.reproductionList
	}
	return
}
function specialize( msg, playerName, profession, tribeChannel){
	playerName = msg.author.username
	profession = bits[1]
	if (profession === 'h'){profession = 'hunter'}
	if (profession === 'c'){profession = 'crafter'}
	if (profession === 'g'){profession = 'gatherer'}
	if ( !profession || !professions.includes(profession)){
		msg.author.send('usage:!'+bits[0]+' [hunter|gatherer|crafter] ')
		return
	}
	var person = personByName(playerName)
	if (!person){
		msg.author.send(playerName +', you are not in this tribe.')
		return
	}
	person.profession = profession
	gameState.tribeChannel.send(playerName+ ' is a skilled '+profession)
	if (person.profession == 'crafter'){
		person.canCraft = true
	}
	return
}
function addToPopulation(msg, author, bits, target,targetObject){
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
	if (population[target]){
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
	var strRoll = roll(1)
	response = 'added '+target+' to the tribe. '
	if (strRoll == 1){
		person.strength = 'weak'
		response+= target +' is weak.'
	} else if (strRoll == 6){
		person.strength == 'strong'
		response+= target +' is strong.'
	}
	population[target] = person
	if (profession){
		specialize(msg, target, profession, gameState.tribeChannel)
	}
	gameState.tribeChannel.send(response)
	return
}
function findLeastGuarded(children, population){
	// guard score = 7 if unguarded; otherwise is the length of the guarders 'guarding' array
	var guardChildSort = []
	var leastGuarded = []
	if (Object.keys(children).length == 0){
		return 'No children to sort'
	}
	for (var childName in children){
		var child = children[childName]
		if (child.age < 1 ){
			// unborn children should be skipped
			continue
		}	
		if (! child.guardian || child.guardian == '' || child.guardian == null){
			guardChildSort.push({'name':childName, 'score':7})
		} else {
			personName = child.guardian
			person = population[personName]
			if (!person){
				console.log(childName+' has a bogus guardian:'+personName)
				child.guardian = null
				guardChildSort.push({'name':childName, 'score':7, 'age':child.age})
			} else {
				guardChildSort.push({'name':childName, 'score': (person.guarding).length, 'age':child.age})
			}
		}
	}
	guardChildSort.sort((a,b) => parseFloat(b.score) - parseFloat(a.score))
	if (guardChildSort.length == 0){
		console.log(' ERROR EMPTY LIST OF GUARD CHULDREN')
		return "Bug means all kids are guarded equally"
	}
	lowGuardValue = guardChildSort[0].score;
	for (var i = 0; i < guardChildSort.length; i++){
		if (guardChildSort[i].score == lowGuardValue){
			leastGuarded.push(guardChildSort[i])
		} else {
			// we are out of the tie, so ignore the rest
			break
		}
	}
	if (leastGuarded.length == 1){
		leastGuardedName = leastGuarded[0].name
	} else {
		// sort the least guarded by age
		leastGuarded.sort((a,b)=> parseFloat(a.age)-parseFloat(b.age))
		startAge = leastGuarded[0].age
		maxIndex = 0
		for (var j =1; j < leastGuarded.length; j++){
			if (leastGuarded[j].age > startAge)
			break;
			maxIndex = j
		}
		unluckyIndex = Math.trunc( Math.random ( ) * maxIndex)
		leastGuardedName = leastGuarded[unluckyIndex].name
	}
	return leastGuardedName+' is the least guarded child.  guard number is '+lowGuardValue
}
function hyenaAttack(children, population){
	if (!children || Object.keys(children).length == 0){
		return 'No children, no hyena problem'
	}
	// get the least guarded message
	leastGuardedMessageArray = findLeastGuarded(children, population).split(" ")
	//  this is stupid and hacky
	leastGuardedName = leastGuardedMessageArray[0]
	lowGuardValue = Number(leastGuardedMessageArray[10])
	rollValue = roll(1)
	response = 'The hyena attacks '+leastGuardedName+'!\n'
	var child = children[leastGuardedName]
	if (!child){
		console.log('hyena did not find the child somehow '+leastGuardedName)
		return response
	}
	console.log(leastGuardedName+' rollValue'+rollValue+ ' target'+lowGuardValue)
	if (rollValue >= lowGuardValue){
		guardian = child.guardian
		if (guardian){
			response += '\nFortunately, '+guardian+' chases off the beast'
		}
	} else {
		response += '\n The poor child is devoured'
		kill(leastGuardedName, 'hyena attack')
	}
	return response
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
function checkFood(){
	message = ''
	hungryAdults = []
	satedAdults = []
	hungryChildren = []
	satedChildren = []
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
		if (child.food >= 2){
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

// consume food also ages children, and handles birth
function consumeFood(){
	console.log('adults are eating')
	response = "Food round results:\n"
	perished = []
	perishedChildren = []

	for  (var target in population) {
		var hunger = 4
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
		if (countChildrenOfParentUnderAge(children, target, 2) > 1 ){
			// extra food issues here; mom needs 2 more food, or the child will die.
			population[target].food -= 2
			if (population[target].food < 0 ){
				// food is negative, so just add it to grain here
				population[target].grain = population[target].grain + population[target].food
				population[target].food = 0
				if (population[target].grain < 0){
					childname = population[target].isPregnant 
					response += target+' lost her child '+child+' due to lack of food\n'
					kill(childName, 'prenatal starvation')
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
		kill(perished[i], 'starvation')
	}
	console.log('children are eating')
	for (childName in children){
		var child = children[childName]
		if (child.age < 24 && ! child.dead){
			child.food -= 2
			if (child.food < 0){
				response += " child:"+childName+"("+child.mother+"+"+child.father+") has starved to death.\n"
				child.dead = true
				if (population[child.mother] && population[child.mother].isPregnant ) {
					delete population[child.mother].isPregnant
				}
				perishedChildren.push(childName)
			} else {
				child.age += 1
			}
			if (child.age == 0){
				birthRoll = roll(3)
				response += '\n\t'+child.mother+' gives birth to a '+child.gender+'-child, '+child.name
				if (birthRoll < 5 ){
					response += ' but the child did not survive\n'
					child.dead = true
					perishedChildren.push(childName)
				} else {
					response += '\n'
				}
				person = personByName(child.mother)
				if (!person.guarding){
					person.guarding = [child.name]
				} else {
					person.guarding.push(child.name)
				}
				
				if (birthRoll == 17){
					twin = addChild(child.mother, child.father);
					reponse += child.mother+' gives birth to a twin! Meet '+twin.name+'\n'
					person.guarding.push(twin.name)
				}
				if (population[child.mother] && population[child.mother].isPregnant){
					delete population[child.mother].isPregnant
					if (! population[child.mother].nursing){
						population[child.mother].nursing = []
					}
					population[child.mother].nursing.push( child.name)
				}
			}
			if (child.age == 4){ // 2 years in SEASONS
				if (population[child.mother] &&  population[child.mother].nursing.indexOf(childName) > -1 ){
					childIndex = population[child.mother].nursing.indexOf(childName)
					population[child.mother].nursing.splice(childIndex, 1);
					response += child.name+' is weaned.\n'
					if (population[child.mother].nursing && population[child.mother].nursing.length == 0){
						delete population[child.mother].nursing 
					}
				}
			}
		}
		if (child.age >= 24 && ! child.newAdult){
			child.newAdult = true
			response += child.name+' has reached adulthood!\n'
		}
	}
	// clean up the dead
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		kill(perishedChildren[i], 'starvation')
		console.log('removing corpse '+corpse)
	}
	if ((perishedChildren.length+perished.length) == 0 ){
		response += 'Nobody starved!'
	}
	return response
}
function kill(name, message){
	if (! message || message == ''){
		message = 'unknown causes'
	}
	if (name in population){
		unsetGuardian(name)
		person = population[name]
		person.deathMessage = message
		if (person.isPregnant ){
			kill(person.isPregnant, 'mother-died')
		}
		if (person.nursing){
			person.nursing.forEach(childName=>kill(childName, 'no-milk'))
		}
		gameState.graveyard[name] = person
		delete population[name]
	} else if (name in children){
		unguardChild(name)
		clearNursingPregnant(name)
		var child = children[name]
		child.deathMessage = message
		gameState.graveyard[name] = child
		delete children[name]
	} else {
		console.log('Tried to kill '+name+' but could not find them')
	}
	return 
}
function clearNursingPregnant(childName){
	for (personName in population){
		person = population[personName]
		if (person.nursing && person.nursing.indexOf(childName) > -1 ){
			childIndex = person.nursing.indexOf(childName)
			person.nursing.splice(childIndex, 1);
			console.log(personName+' is no longer nursing '+childName)
		}
		if (person.isPregnant && person.isPregnant == childName){
			person.isPregnant = ''
			console.log(personName+' is no longer pregnant with '+childName)
		}
	}
}

function unsetGuardian(guarderName, children){
	for (childName in children){
		var child = children[childName]
		if (child.guardian && child.guardian == guarderName){
			child.guardian = ''
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
function startWork(){
	savegameState()
	// advance the calendar; the if should only skip on the 0->1 transition
	if (gameState.workRound == false){
		nextSeason()
	}
	gameState.tribeChannel.send(gameStateMessage())
	gameState.tribeChannel.send('\nStarting the work round.  Guard your children.  Craft, gather, hunt, assist or train.')
	gameState.workRound = true
	gameState.foodRound = false
	gameState.reproductionRound = false
	canJerky = false
	return
}
function startFood(){
	clearWorkFlags(population)
	savegameState()
	message = gameStateMessage()
	gameState.tribeChannel.send(message+'\nStarting the food and trading round.  Make sure everyone has enough to eat, or they will starve')
	gameState.tribeChannel.send(checkFood())
	gameState.workRound = false
	gameState.foodRound = true
	gameState.reproductionRound = false
	return
}
function startReproduction(){
	savegameState()
	// actually consume food here
	foodMessage = consumeFood()
	gameState.needChanceRoll = true  // this magic boolean prevents starting work until we did chance roll
	gameState.tribeChannel.send(foodMessage+'\n')
	gameState.tribeChannel.send('Starting the Reproduction round; invite other tribe members to reproduce (not automated)')
	gameState.tribeChannel.send(gameStateMessage())
	gameState.tribeChannel.send('The tribe can decide to move to a new location, but the injured and children under 2 will need 2 food')
	namelist = createReproductionList(population)
	gameState.tribeChannel.send("Invitation order: "+shuffle(namelist))
	gameState.reproductionList = nameList
	gameState.tribeChannel.send(gameState.reproductionList[0]+ " should now !invite people to reproduce, or !pass ")
	gameState.workRound = false
	gameState.foodRound = false
	gameState.reproductionRound = true
	return
}
function migrate(msg, destination, force, population, children){
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
			var person = personByName(personName)
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
				kill(deceasedPeople[i],'migration hunger')
				response+= " "+deceasedPeople[i]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				kill(deceasedChildren[i],'migration hunger')
				response+= " "+deceasedChildren[i]
			}
		}
		gameState.tribeChannel.send('Setting the current location to '+destination)
		gameState.currentLocationName = destination
	} else {
		for (personName in population){
			person = personByName(personName)
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
function gather(playername, player, rollValue){
	var message = ' gathers (roll='+rollValue+')';
	var netRoll = rollValue
	modifier = 0
	if (isColdSeason()){
		message+= '(-3 season)  '
		modifier -= 3
	}
	if ( player.profession != 'gatherer'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (player.guarding){
		guardCount = player.guarding.length
		if (guardCount == 3){
			message+= '(-2 kids) '
			modifier-= 2
		}
		if (guardCount == 4){
			message+= '(-4 kids) '
			modifier-= 4
		}
		if (guardCount > 4){
			console.log(' gather with more than 4 kids should not happen')
			return ' fails to get anything, too many kids in the way'
		}
	}
	if (player.strength){
		if (player.strength.toLowerCase() == 'strong'){
			modifier += 1
		} else if (player.strength.toLowerCase() == 'weak') {
			modifier -= 1
		} else {
			console.log(playername+' has an invalid strength value '+player.strength)
		}
	}
	netRoll = rollValue + modifier
	console.log('gather roll:'+rollValue+' mod:'+modifier+' net:'+netRoll)
	gatherData = locations[gameState.currentLocationName]['gather']
	var get_message = ''
	var getFood = 0
	var getGrain = 0
	for (var i = 0; i < gatherData.length; i++){
		if (netRoll < gatherData[0][0]){
			get_message =  gatherData[0][3] +' ('+((gatherData[0][1]+gatherData[0][2])+')')
			getFood = gatherData[0][1]
			getGrain = gatherData[0][2]
			break
		} else if (netRoll == gatherData[i][0]){
			getFood = gatherData[i][1]
			getGrain = gatherData[i][2]
			get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
			break
		} else {
			getFood = gatherData[i][1]
			getGrain = gatherData[i][2]
			get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
		}
	}
	message += get_message
	player.food += getFood
	player.grain += getGrain
	if (player.basket > 0){
		var broll = roll(3)+modifier
		message+= ' basket: ('+broll+')'
		netRoll = broll+modifier
		console.log('modified basket roll '+netRoll)
		for (var i = 0; i < gatherData.length;i++){
			if (netRoll < gatherData[0][0]){
				get_message =  gatherData[0][3] +' ('+((gatherData[0][1]+gatherData[0][2])+')')
				getFood = gatherData[0][1]
				getGrain = gatherData[0][2]
				break
			} else if (netRoll == gatherData[i][0]){
				getFood = gatherData[i][1]
				getGrain = gatherData[i][2]
				get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
				break
			} else {
				getFood = gatherData[i][1]
				getGrain = gatherData[i][2]
				get_message = gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
			}
			}
		message += get_message
		player.food += getFood
		player.grain += getGrain
		
		// check for basket loss
		if (roll(1) <= 2){
			message+= ' basket breaks.'
			player.basket -= 1
		}
	}
	player.worked = true
	return message
}
function craft(playername, player, type, rollValue){
	console.log('craft type'+type+' roll '+rollValue)
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
		return playername+ ' fails at crafting a '+type
	}
	return playername+' crafts a '+type
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
	return ' goes hunting to assist '
}
function hunt(playername, player, rollValue){
	player.worked = true
	mods = 0
	message = ' goes hunting. '
	console.log(player+' hunt '+rollValue)
	var modifier = 0
	if ( player.profession != 'hunter'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (player.strength){
		if (player.strength.toLowerCase() == 'strong'){
			modifier += 1
		} else if (player.strength.toLowerCase() == 'weak') {
			modifier -= 1
		} else {
			console.log(playername+' has an invalid strength value '+player.strength)
		}
	}
	if (isColdSeason()){
		message+= '(-1 season) '
		modifier -= 1
	}
	if (player.bonus && player.bonus >0 ){
		player.bonus = Math.trunc(player.bonus)
		if (player.bonus > 3){
			modifier += 3
		} else {
			modifier += player.bonus
		}
		message += ' (with '+player.helpers+')'
	}
	if (player.spearhead > 0 && rollValue >= 9){
		modifier += 3
		message+= '(spearhead)'
	}
	message += '(rolls a '+rollValue+' ) '
	if (rollValue < 7){
		console.log('hunt under 7')
		// injury section
		if (rollValue == 6){
			if (player.profession != 'hunter'){
				message += 'Injury!'
				player.isInjured = true
			}
		} else if (rollValue ==3 ){
			message += 'Crippling injury!'
			player.isInjured = true
			if (player.strength = 'strong'){
				delete player.strength
			} else {
				player.strength = 'weak'
			}
		} else {
		// TODO: make this also possibly inure the helpers
			message += 'Injury!'
			player.isInjured = true
		}
	} else if (rollValue == 7 || rollValue == 8){
		message += ' no luck'
	} else {
		// rewards section
		netRoll = rollValue + modifier
		console.log('hunt netRoll '+netRoll)
		if (netRoll > locationDecay[locations[gameState.currentLocationName]['game_track']]){
			message += ' (no '+huntData[netRoll][2]+' tracks )'
			netRoll = locationDecay[locations[gameState.currentLocationName]['game_track']]
		}
		if (netRoll > 18){
			netRoll = 18
		}
		huntData = locations[gameState.currentLocationName]['hunt']
		for (var i = 0; i < huntData.length; i++){
			if (netRoll <= huntData[i][0]){
				message += huntData[i][2] + ' +'+huntData[i][1]+' food'
				player.food += huntData[i][1]
				break
			}
		}
	}
	// update the game track
	var huntercount = 1
	if (player.helpers ){
		huntercount += Math.min(player.helpers.length,3)
	}
	// check for spearhead loss
	if (player.spearhead > 0 && roll(1) <= 2){
		player.spearhead -= 1
		message += '(the spearhead broke)'
	}
	var oldTrack = gameState.gameTrack[gameState.currentLocationName]
	gameState.gameTrack[gameState.currentLocationName] += huntercount
	console.log('Game Track for '+gameState.currentLocationName+' advanced from '+oldTrack+' to '+gameState.gameTrack[gameState.currentLocationName])
	// clear the stuff for group hunting
	if (player.bonus && player.bonus != 0){
		player.bonus = 0
	}
	if (player.helpers){
		player.helpers = []
	}
	return message
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
