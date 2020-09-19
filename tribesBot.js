var Discord = require('discord.js');
var bot = new Discord.Client()
var logger = require('winston');
const { ExceptionHandler, child } = require('winston');
const fs = require('fs');
const { resolve } = require('path');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');

let rawdata = fs.readFileSync('./auth.json');
let auth = JSON.parse(rawdata);

const types = ['food', 'grain', 'basket', 'spearhead']
const professions= ['hunter','gatherer', 'crafter']
const member_properties = ['canCraft','isNursing','isPregnant','isInjured','guarding','profession','gender','partner','worked','food','grain', 'handle']
const genders = ['male','female']
const locations = require('./locations.json');
const allNames = require('./names.json')
const locationDecay = [20,20,20,17,17,
					15,15,14,14,13,
					13,12,12,11,11,
					10,10,9,9,8]

var gameState = Object()
var referees = ["kevinmitcham", "@kevinmitcham"]
//var referees = require('./referees.json')

var workRound = true;
var foodRound = false;
var reproductionRound = false;
var chanceRound = false;
var games = {}

function loadJson(fileName){
	let rawdata = fs.readFileSync(fileName);
	return JSON.parse(rawdata);	
}
function loadGame(gameName){
	if (fs.existsSync('./gameState.json')) {
		gameState = loadJson('./gameState.json') 
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
}

function initGame(gameName){
	gameState.seasonCounter = 1
	gameState.gameTrack = {}
	gameState.name = gameName
	for (locationName in locations){
		gameState.gameTrack[locationName] = 0
	}
	gameState.currentLocationName = "veldt";
	gameState.graveyard = {}
	population = {}
	children = {}
	graveyard = {}
	return
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
function getYearMessage(){
	response = 'Year '+gameState.seasonCounter/2
	if (gameState.seasonCounter%2==0){
		response += ' cold season'
	} else {
		response += ' warm season'
	}
	return response;
}
function gameStateMessage(){
	message = "Year "+(gameState.seasonCounter/2)+', '
	season = 'warm season.'
	if (isColdSeason()){
		season = 'cold season.'
	}
	var numAdults = (Object.keys(population)).length
	var numKids = (Object.keys(children)).length

	message+=season+'The tribe has '+numAdults+' adults and '+numKids+' children'
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
	fs.writeFile("gameState.json", JSON.stringify(gameState), err => { 
		// Checking for errors 
		if (err) throw err;  
	}); 
	fs.writeFile("population.json", JSON.stringify(population), err => { 
		// Checking for errors 
		if (err) throw err;  
	}); 
	
	fs.writeFile("children.json", JSON.stringify(children), err => { 
		// Checking for errors 
		if (err) throw err;  
	}); 
	fs.writeFile("referees.json", JSON.stringify(referees), err => { 
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
	handleCommand(msg, author, actor,  command, bits)
	return	
}

function personByName(name){
	if (name == null){
		console.log('attempt to find person for null name '+name)
		return null
	}
	if (population[name] != null){
		return population[name]
	}
	if (name && population[name.username] != null){
		return population[name.username]
	}

	console.log("No such person in population:"+name)
	return null
}
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
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
function handleCommand(msg, author, actor, command, bits){
	player = personByName(actor)
	//channelName = msg.channel.name
	//msgChannelType = msg.channel.type
	//console.log('channel '+channelName+' type'+msgChannelType)
	// list commands
	if (command === 'help'){
		text = ''
		text+='Player commands\n'
		text+=' !inventory <target>  (show inventory and character info (no arg means self))\n'
		text+=' !children (shows the children ages and food status)\n'
		text+=' !leastwatched (shows the least supervised child (ties resolved randomly))\n'
		text+=' !foodcheck (examine the food situation for every adult and living child'
		text+=' !graveyard (list of all deceased members and children)'
		text+=' !scout (see the current location, year, season and local game)'
		text+='\n-=Work Round Commands=-'
		text+=' !hunt'
		text+=' !gather'
		text+=' !craft <spearhead|basket>'
		text+=' !assist <hunter>'
		text+='\n-=Food Round Commands=-'
		text+=' !give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' !feed <amt> <childName>\n'
		text+='\n-=Reproduction Round Commands=-'
		text+=' tell the referee who you would like to cuddle with'

		msg.author.send( text)

		if (referees.includes(actor)){
			text+='\nReferee Commands\n'
			text+=' edit target <canCraft|isNursing|isPregnant|profession|gender|partner|worked|food|grain> <value>\n' 
			text+=' editchild <food|age|mother|father> <value>\n' 
			text+=' award <amt> <food|grain|spearhead|basket> <player>\n'
			text+=' kill <name> <message> kill a person or child'
			text+=' list <player>  (no arg lists all players)\n '
			text+=' induct|banish <player> add a member to the tribe\n'
			text+=' promote|demote <player> to the ref list\n'
			text+=' spawn <mother> <father> add a child with parents\n'
			text+=' save the game file (automatically done at the start of every work round)\n'
			text+=' load the saved file\n'
			text+=' changelocation <newlocation> <force> \n'
			text+=' startwork (begins the work round, enabling work attempts and rolls)\n'
			text+=' startfood (ends the work round; subtract food/grain; birth; child age increase)\n'
			text+=' startreproduction (Players verbally express intentions, use spawn.  Also when location can change)\n'
			text+=' startchance (Chance roll, and its effects, get processed)\n'
			msg.author.send( text)
		}
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (command == 'roll'){
		msg.reply(roll(bits[1]))
		return
	}

	if (command == 'foodcheck'){
		message = checkFood()
		msg.author.send( message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	if (command == 'graveyard'){
		response = 'Graveyard:'
		for (var name in graveyard){
			// TODO flesh this out
			person = graveyard[name]
			response += ' name'
		}
		msg.author.send(response)
		msg.delete({timeout: 3000}); //delete command in 3sec 
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
			msg.reply('Count not find target '+targetName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		kill(targetName, bits[2])
		msg.reply('The referee kills '+targetName)
		return
	}
	// WORK ROUND COMMANDS
	if (command == 'gather' 
		|| command == 'craft'
		|| command == 'hunt'
		|| command == 'assist'
		|| command == 'train'
		){
		if (workRound == false ){
			msg.author.send('Can only work during the work round')
			return
		}
		if (player == null){
			msg.author.send('Only tribe members can work.  Maybe !join')
			return
		}
		if (player.isInjured == true){
			msg.author.send('you can not work while you are injured')
			return
		}
		if (player.worked == true){
			msg.author.send('You cannot work (again) this round')
			return			
		}
		if (command == 'gather'){
			if (player.watching && player.watching.length > 5){
				msg.author.send('You can not gather while watching more than 5 children.  You are watching '+player.watching)
				return
			}
			message = gather( author.username, player, roll(3))
			msg.reply( message )// this should go to the channel!
			return
		} else if (command == 'craft'){
			type = bits[1]
			if (player.canCraft == false){
				msg.author.send('You do not know how to craft')
				return
			}
			if (player.watching && player.watching.length > 2){
				msg.author.send('You can not craft while watching more than 2 children.  You are watching '+player.watching)
				return
			}
			if (type != 'basket' && type != 'spearhead'){
				msg.author.send('Must craft basket or spearhead')
				return	
			}
			message = craft( author.username, player, type, roll(1))
			msg.reply( message )
			return	
		} else if (command == 'assist'){
			target = msg.mentions.users.first()
			message = assist(author.username, player, target)
			msg.reply( message )
			return	
		} else if (command == 'train'){
			if (player.canCraft){
				msg.author.send('You already know how to craft')
				return
			}
			if (player.watching && player.watching.length > 2){
				msg.author.send('You can not learn crafting while watching more than 2 children.  You are watching '+player.watching)
				return
			}
			if ( roll(2) >=10 ){
				player.canCraft = true
				msg.reply(playername+' learns to craft.')
				return
			} else {
				msg.reply(playername+' watches a crafter, trying to learn.')
			}
			player.worked = true
			return	
		} else if (command == 'hunt'){
			if (player.watching && player.watching.length > 0){
				msg.author.send('You can not go hunting while watching '+player.watching)
				return
			}
			message = hunt(author.username, player, roll(3))
			msg.reply( message )
			return	
		}
	}
	if (command.startsWith('initg')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
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
	if (command == 'startwork' || command.startsWith('startw')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if (workRound == true){
			msg.author.send('already in the work round')
			return 
		}
		if(chanceRound == false){
			msg.author.send('Can only go to work from chance')
			return 
		}
		savegameState()
		// advance the calendar; the if should only skip on the 0->1 transition
		if (workRound == false){
			nextSeason()
		}
		message = gameStateMessage()
		msg.reply(message)
		msg.reply('\nStarting the work round.  Hunt, gather, or craft')
		workRound = true
		foodRound = false
		reproductionRound = false
		chanceRound = false
		return
	}
	if (command == 'startfood' || command.startsWith('startf')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if (foodRound == true){
			msg.author.send('already in the foodRound')
			return 
		}
		if(workRound == false){
			msg.author.send('Can only go to food round from work round')
			return 
		}
		clearWorkFlags(population)
		savegameState()
		message = gameStateMessage()
		msg.reply(message+' \nStarting the food and trading round.  Make sure everyone has enough to eat, or they will starve')
		workRound = false
		foodRound = true
		reproductionRound = false
		chanceRound = false
		return
	}
	if (command == 'startreproduction' || command.startsWith('startr')){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if (reproductionRound == true){
			msg.author.send('already in the reproductionRound ')
			return 
		}		
		if(foodRound == false){
			msg.author.send('Can only go to reproduction from food')
			return 
		}
		savegameState()
		// actually consume food here
		foodMessage = consumeFood()
		msg.reply(foodMessage+'\n')
		msg.reply('The tribe can decide to move to a new location, but the injured and children under 2 will need 2 food')
		msg.reply('Starting the Reproduction round; invite other tribe members to reproduce (not automated)')
		msg.reply(gameStateMessage())
		workRound = false
		foodRound = false
		reproductionRound = true
		chanceRound = false
		return
	}
	if (command == 'startchance' || command.startsWith('startc')){
		savegameState()
		gameStateMessage()
		response = "Chance round.  Roll is "+roll()
		//TODO lookup on the chance roll.
		workRound = false
		foodRound = false
		reproductionRound = false
		chanceRound = true
		msg.reply(response)
		return
	}
	if (command == 'changelocation' ){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		newLocation = bits[1]
		legalLocations = Object.keys(locations)
		if (!legalLocations.includes(newLocation) ){
			msg.author.send(newLocation+' not a valid location.  Valid locations:'+legalLocations)
			return
		}
		msg.reply('Setting the current location to '+newLocation)
		currentLocation = newLocation
		// every injured person pays 2 food, or dies.
		deceasedPeople = []
		deceasedChildren = []
		for (personName in population){
			person = personByName(personName)
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
		for (childName in children){
			child = children[childName]
			// child age is in seasons
			if (child.age < 5){
				if (child.food < 2){
					deceasedChildren.push(childName)
				}
			}
		}
		if (deceasedPeople.length > 0 || deceasedChildren.length > 0){
			response = 'The following people died along the way:'
			// every child under 2 needs 2 food, or dies
			// clean up the dead
			var perishedCount = deceasedPeople.length;
			for (var i = 0; i < perishedCount; i++) {
				kill(deceasedPeople[i])
				response+= " "+deceasedPeople[i]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				kill(deceasedChildren[i])
				response+= " "+deceasedChildren[i]
			}
			msg.reply(response)
		}
		return
	}
	if (command == 'leastwatched'){
		// watch score = 6 if unwatched; otherwise is the length of the watchers 'watching' array
		var watchChildSort = []
		var leastWatched = []
		if (Object.keys(children).length == 0){
			msg.author.send('No children to sort')
			return
		}
		for (var childName in children){
			child = children[childName]
			if (child.age < 0 ){
				// unborn children should be skipped
				continue
			}	
			if (! child.guardian || child.guardian == '' || child.guardian == null){
				watchChildSort.push({'name':childName, 'score':6})
			} else {
				personName = child.guardian
				person = population[personName]
				if (!person){
					console.log(childName+' has a bogus guardian:'+personName)
					child.guardian = null
					watchChildSort.push({'name':childName, 'score':6})
				} else {
					watchChildSort.push({'name':childName, 'score': (person.watching).length})
				}
			}
		}
		watchChildSort.sort((a,b) => parseFloat(b.score) - parseFloat(a.score))
		startValue = watchChildSort[0].score;
		for (var i = 0; i < watchChildSort.length; i++){
			if (watchChildSort[i].score == startValue){
				leastWatched.push(watchChildSort[i])
			} else {
				// we are out of the tie, so ignore the rest
				break
			}
		}
		unluckyIndex = Math.trunc( Math.random ( ) * leastWatched.length)
		leastWatchedName = leastWatched[unluckyIndex].name
		msg.reply(leastWatchedName+' is the least watched child.  Watch number is '+startValue )
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return 
	}
	if (command == 'watch'){
		if (bits.length != 2){
			msg.author.send('watch <childName>')
			return		
		}
		person = population[actor]
		if (person.watching && person.watching.length > 4){
			msg.author.send('You are already watching enough children: '+person.watching)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (workRound == true){
			msg.author.send('You can not change watch status during the work round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		childName = bits[1]
		child = children[childName]
		if (!child ){
			msg.author.send('Could not find child: '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (!person.watching || person.watching.indexOf(childName) != -1 ){
			msg.author.send('You are already watching '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		child.guardian = person.name
		if (person.watching){
			person.watching.push(childName)
		} else {
			person.watching = [childName]
		}
		msg.reply(actor+' starts watching '+childName)
		return
	}
	if (command == 'ignore'){
		if (bits.length != 2){
			msg.author.send('ignore <childName>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return		
		}
		person = population[actor]
		childName = bits[1]
		child = children[childName]
		if (!person.watching || person.watching.indexOf(childName) == -1 ){
			msg.author.send('You are not watching '+childName)
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (workRound == true){
			msg.author.send('Can not change watch status during the work round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		childIndex = person.watching.indexOf(childName)
		if (childIndex > -1) {
			person.watching.splice(childIndex, 1);
		}
		if (!child ){
			msg.author.send('Could not find child: '+childName)
		} else {
			child.guardian = null
		}
		msg.reply(actor+' stops watching '+childName)
		return
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
		childName = bits[1]
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
		if (attribute == 'mother'|| attribute == 'father' || attribue == 'guardian'){
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
		if (population[targetName]){
			targetObj = population[targetName]
			targetObj[key] = value
			message = target.username+ ' now has values: '
			for (var type in targetObj) {
				if (Object.prototype.hasOwnProperty.call( targetObj, type)) {
					message+= ' '+type+' '+targetObj[type]
				}
			}
			msg.author.send(message)
			population[targetName] = targetObj
			return
		} else{
			msg.author.send(targetName+' is not in the tribe')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
	}
	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor)){
			savegameState()
			msg.author.send('game state saved')
		}
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
	// remove member from the tribe
	if (command === 'banish'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (target ){
			if (population[target.username]){
				delete population[target.username]
				msg.reply(target.username+' is banished from the tribe')
				return
			}
		} else {
			msg.author.send(command+' could not find '+target)
			return
		}
	}
	// add a person to the tribe
  	if (command === 'induct'){
		if (!referees.includes(actor)){
			msg.author.send(command+' requires referee priviliges')
			return
		}
		if ( !referees.includes(actor) ){
			console.log(actor +" list:"+referees)
			msg.author.send('Only a referee can add tribe members')
			return
		}
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first()){
			msg.author.send(command+' requires at least one @target')
		return
		}
		var target = msg.mentions.users.first().username
		addToPopulation(msg, author, bits, target, msg.mentions.users.first())
		return
	}

	if (command === 'give'){
		if (foodRound == false){
			msg.author.send(command+' happens in the food round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 			
		}
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
				msg.author.send('username is not living in the tribe')
				msg.delete({timeout: 3000}); //delete command in 3sec 
				return
		}
		if (  population[actor][type] >= amount){
			msg.reply(actor+' gave '+amount+' '+type+' to '+username)
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
			msg.reply('The game awards '+targetName+' with '+amount+' '+type)
			
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
	if (command == 'inventory'){
		var targetName = bits[1]
		if (msg.mentions.users.first()){
			targetName = msg.mentions.users.first().username
		}
		if (!targetName){
			targetName = actor
		}
		person = personByName(targetName)
		if (!person || person == null){
			msg.author.send(target+' does not seem to be a person')
			return
		}
		message = targetName+' has: '
		message += person.food+' food, '
		message += person.grain+' grain, '
		if (person.basket > 0 ){
			message += person.basket+' baskets, '
		}
		if (person.spearhead > 0 ){
			message += person.spearhead+' spearhead, '
		}
		if (person.isPregnant && person.isPregnant != ''){
			message += '\n is pregnant with '+person.isPregnant
		}
		if (person.isNursing && person.isNursing != '' ){
			message += '\n is nursing '+person.isNursing
		}
		if (person.isInjured && person.isInjured != 'false' ){
			message += '\n is injured and unable to work this season'
		}
		msg.author.send(message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	// how much stuff does the target have?  if used by ref with no args, list whole population
	if (command == 'list'){
		msg.delete({timeout: 3000}); //delete command in 3sec 
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
			msg.author.send('ref only')
			return
		}
	}
	// list the children
	if (command == 'children'){
		response = ''
		childNames = Object.keys(children)
		response = 'There are '+childNames.length+' children '
		mine = 0 
		var arrayLength = childNames.length;
		for (var i = 0; i < arrayLength; i++) {
			childName = childNames[i]
			child = children[childName]
			if (child.dead){
				response += '('+childName+' is dead)'
			} else {
				response += '('+childName+':'
				if (referees.includes(actor) || (actor === child.mother || actor === child.father) ){
					response += ' parents:'+child.mother+'+'+child.father
				}
				response += ' age:'+(child.age/2)+ ' needs '+(2-child.food)+' food'
				if (child.guardian && child.guardian != ''){
					response += ' guardian:'+child.guardian
				}
				response += ')\n'
			}
		} 
		msg.author.send(response)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
  	// add food to a child
	if (command === 'feed'){
		if (bits.length != 3){
			msg.author.send('feed syntax is feed <amount>  <childname>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (! foodRound){
			msg.author.send('Can only feed children during the food or reproduction round')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return 
		}
		childName = bits[2]
		amount = bits[1]
		childName = capitalizeFirstLetter(childName)
		if (isNaN(amount) || ! (childName in children)){
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
		if ( child.food >= 2 ){
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
		var fed = amount
		if ( ( population[actor]['food']+population[actor]['grain'] ) >= amount){
			if (population[actor]['food'] >= amount){
				population[actor].food -= Number(amount)
			} else {
				fed -= population[actor].food
				population[actor].food = 0
				population[actor]['grain'] -= (amount-fed)
			}
			msg.reply(actor+' fed '+amount+' to child '+childName)
			children[childName].food += Number(amount)
		} else {
			msg.author.send('You do not have enough food or grain to feed the child')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		return
	} 
	if (command == 'scout'){
		message = gameStateMessage()
		msg.author.send(message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	// add a child to tribe; args are parent names
	if (command === 'spawn'){
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !spawn mother father <force>')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		var mother = 'unknown'
		var father = 'unknown'
		if (msg.mentions.users.first() && msg.mentions.users.last() ){
			mother = msg.mentions.users.first().username
			father = msg.mentions.users.last().username
		} else {
			mother = bits[1]
			father = bits[2]
		}
		if (!population[mother] || !population[father]){
			msg.author.send('Parents not found in tribe')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (population[mother].gender != 'female' || population[father].gender != "male"){
			msg.author.send("First parent must be female, last parent male")
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (population[mother].isPregnant  && population[mother].isPregnant != ''){
			msg.author.send(mother+' is already pregnant')
			msg.delete({timeout: 3000}); //delete command in 3sec 
			return
		}
		if (bits.length == 4 || roll(2) > 8 ){
			var child = addChild(mother, father)
			msg.reply('The mating of '+mother+ ' and '+father+' spawned '+child.name)
		} else {
			msg.reply('The mating of '+mother+ ' and '+father+' was not productive')
		}	
		return
	}
	if (command === 'foodcheck'){
		msg.author.send(foodCheck())
		return
	}
	msg.author.send('TribesBot did not understand the command '+bits)
	msg.author.send('Try !help ')
	msg.delete({timeout: 3000}); //delete command in 3sec 
	return	
}

function getNextChildName(children, childNames){
	currentNames = Object.keys(children)
	numberOfChildren = currentNames.length
	nextIndex = (numberOfChildren % 26 )
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
	child.name = getNextChildName(children, allNames)
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
		if (person.isInjured && person.isInjured == true && person.worked == false){
			// did not work means rested
			person.isInjured = false
		}
		person.worked = false
	}
}
function addToPopulation(msg, author, bits, target,targetObject){
	profession = bits[1]
	gender = bits[2]
	if (!target ){
		msg.author.send('must specify: <profession> <gender> <name>')
		return
	}
	if (population[target]){
		msg.author.send(target+' is already in the tribe')
		return
	}
	if (profession === 'h'){profession = 'hunter'}
	if (profession === 'c'){profession = 'crafter'}
	if (profession === 'g'){profession = 'gatherer'}
	if (gender === 'm'){gender = 'male'}
	if (gender === 'f'){gender = 'female'}
	if ( !target || !profession || !gender || !genders.includes(gender) || !professions.includes(profession)){
		msg.author.send('usage:!induct [hunter|gatherer|crafter] [female|male] name')
		return
	}
	var person = {}
	person.gender = gender
	person.food = 10
	person.grain = 4
	person.basket = 0
	person.spearhead = 0
	person.profession = profession
	person.handle = targetObject
	person.name = target
	if (profession === 'crafter'){
		person.canCraft = true
	} else {
		person.canCraft = false
	}
	population[target] = person
	msg.reply('added '+target+' to the tribe')
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
		if (person.isNursing && person.isPregnant != ''){
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
		if (population[target].isNursing && population[target].isPregnant != ''){
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
					population[target].isPregnant  = ''
				}
			}
		}
		console.log(target+' f:'+population[target].food+' g:'+population[target].grain)
	} 
	console.log('children are eating')
	for (childName in children){
		var child = children[childName]
		if (child.age < 24 && ! child.dead){
			child.food -= 2
			if (child.food < 0){
				response += " child:"+childName+"("+child.mother+"+"+child.father+") has starved to death.\n"
				child.dead = true
				if (population[child.mother] && population[child.mother].isPregnant != '' ) {
					population[child.mother].isPregnant = ''
				}
				perishedChildren.push(childName)
			} else {
				child.age += 1
			}
			if (child.age == 0){
				birthRoll = roll(3)
				response += child.mother+' gives birth to '+child.name+' '
				if (birthRoll < 5 ){
					response += 'but the child did not survive\n'
					child.dead = true
					perishedChildren.push(childName)
				}
				if (birthRoll == 17){
					twin = addChild(child.mother, child.father);
					reponse += child.mother+' gives birth to a twin! Meet '+twin.name+'\n'
				}
				if (population[child.mother] && population[child.mother].isPregnant != ''){
					population[child.mother].isPregnant = ''
					population[child.mother].isNursing = child.name
				}
			}
			if (child.age == 4){ // 2 years in SEASONS
				if (population[child.mother] && population[child.mother].isNursing){
					population[child.mother].isNursing = ''
					response += child.name+' is weaned.\n'
				}
			}
		}
		if (child.age >= 24){
			child.newAdult = true
			response += child.name+' has reached adulthood!\n'
		}
	}
	// clean up the dead
	var perishedCount = perished.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perished[i]
		console.log('removing corpse '+corpse)
		kill(perished[i])
	}
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		kill(perishedChildren[i])
		console.log('removing corpse '+corpse)
	}
	if ((perishedChildren.length+perished.length) == 0 ){
		response += 'nobody starved!'
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
		if (person.isNursing){
			// TODO confirm this
			kill(person.isNursing, 'no-milk')
		}
		gameState.graveyard[name] = person

		delete population[name]
	} else if (name in children){
		unwatchChild(name)
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
		if (person.isNursing && person.isNursing == childName){
			person.isNursing = ''
		}
		if (person.isPregnant && person.isPregnant == childName){
			person.isPregnant = ''
		}
	}
}

function unsetGuardian(watcherName, children){
	for (childName in children){
		child = children[childName]
		if (child.guardian && child.guardian == watcherName){
			child.guardian = ''
		}
	}
}
function unwatchChild(childName, population){
	for (personName in population){
		person = population[personName]
		if (person.watching && person.watching.indexOf(childName) != -1){
			childIndex = person.watching.indexOf(childName)
			person.watching.splice(childIndex, 1);
		}
	}
}
//////////////////////////////////////////////////////////
/////  WORK SECTION   
/////////////////////////////////////////////////////////
function gather(playername, player, roll_value){
	var message = ' gathers ';
	netRoll = roll_value
	modifier = 0
	if (isColdSeason()){
		message+= '(-3 season)  '
		modifier -= 3
	}
	if ( player.profession != 'gatherer'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (player.watching){
		watchCount = player.watching.length
		if (watchCount == 3){
			message+= '(-2 kids) '
			modifier-= 2
		}
		if (watchCount == 4){
			message+= '(-4 kids) '
			modifier-= 4
		}
		if (watchCount > 4){
			console.log(' gather with more than 4 kids shoild not happen')
			return ' fails to get anything, too many kids in the way'
		}
	}
	netRoll = roll_value + modifier
	console.log('gather roll:'+roll_value+' mod:'+modifier+' net:'+netRoll)
	gatherData = locations[gameState.currentLocationName]['gather']
	for (var i = 0; i < gatherData.length; i++){
		if (netRoll <= gatherData[i][0]){
			player.food += gatherData[i][1]
			player.grain += gatherData[i][2]
			message += gatherData[i][3] +' ('+((gatherData[i][1]+gatherData[i][2])+')')
			break
		}
	}
	if (player.basket > 0){
		var broll = roll(3)+modifier
		message+= ' basket:'
		console.log('modified basket roll'+broll)
		for (var i = 0; i < gatherData.length;i++){
			if (netRoll <= gatherData[i][0]){
				message += gatherData[i][3]
				player.food += gatherData[i][1]
				player.grain += gatherData[i][2]
				break
			}
		}
		// check for basket loss
		if (roll(1) == 1){
			message+= ' basket broke!'
			player.basket -= 1
		}
	}
	player.worked = true
	return message
}
function craft(playername, player, type, roll_value){
	console.log('craft type'+type+' roll '+roll_value)
	player.worked = true
	if (type.startsWith('spear')){
		type = 'spearhead'
	}
	if (player.profession != 'crafter'){
		roll_value -= 1
	}
	if (roll_value > 1 && type == 'basket'){
			player.basket += 1
	} else if (roll_value > 2 && type == 'spearhead') {		
			player.spearhead += 1
	} else {
		return playername+ ' crafts a worthless '+type
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
	return ' goes hunting to assist '+helpedPlayer
}
function hunt(playername, player, roll_value){
	player.worked = true
	mods = 0
	message = ' goes hunting. '
	console.log(player+' hunt '+roll_value)
	var modifier = 0
	if ( player.profession != 'hunter'){
		message+=('(-3 skill) ')
		modifier -= 3
	}
	if (isColdSeason()){
		message+= '(-1 season) '
		modifier -= 1
	}
	if (player.bonus && player.bonus >0 ){
		if (player.bonus > 3){
		  mods += 3
		} else {
		  mods += player.bonus
		}
		message += ' (with '+player.helpers+')'
	}
	if (player.spearhead > 0 && roll_value >= 9){
		mods += 3
	}
	if (roll_value < 7){
		console.log('hunt under 7')
		// injury section
		if (roll_value == 6){
			if (player.profession != 'hunter'){
				message += 'Injury!'
				player.isInjured = true
			}
		} else {
		// TODO: make this also possibly inure the helpers
			message += 'Injury!'
			player.isInjured = true
		}
	} else {
		// rewards section
		netRoll = roll_value + mods
		console.log('hunt netRoll '+netRoll)
		if (netRoll > locationDecay[locations[gameState.currentLocationName]['game_track']]){
			message += ' (less game found)'
			netRoll = locationDecay[locations[gameState.currentLocationName]['game_track']]
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
		huntercount += length(player.helpers)
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
bot.once('ready', ()=>{
	console.log('bot is alive')
	loadGame('default')
  })   
bot.login(auth['token'])
