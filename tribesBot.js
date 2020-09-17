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
const locationDecay = [20,20,20,17,17,
					15,15,14,14,13,
					13,12,12,11,11,
					10,10,9,9,8]
var population = require('./population.json')
var children = require('./children.json');
var referees = require('./referees.json');
var locations = require('./locations.json');
var allNames = require('./names.json')
var seasonCounter = 1;
gameTrack = {}
for (locationName in locations){
	gameTrack[locationName] = 0
}
var currentLocationName = "veldt";

var workRound = true;
var foodRound = false;
var reproductionRound = false;
var games = {}

function initGame(gameName){
	game = Object()
	game.name = gameName
	game.tribes = {}
	game.gameTrack = {}
	game.seasonCounter = 1
	for (locationName in locations){
		game.gameTrack[locationName] = 0
	}
	games[gameName]= game
}
function initTribe(game, tribeName){
	tribe = Object()
	tribe.name = tribeName
	tribe.population = {}
	tribe.children = {}
	tribe.currentLocation = 'veldt'
	game.tribes[tribeName] = tribe
}
function isColdSeason(){
	return (seasonCounter%2 == 0);
}
function getYear(){
	return seasonCounter/2;
}
function getYearMessage(){
	response = 'Year '+seasonCounter/2
	if (seasonCounter%2==0){
		response += ' cold season'
	} else {
		response += ' warm season'
	}
	return response;
}
function gameState(){
	message = "Year "+(seasonCounter/2)+', '
	season = 'warm season.'
	if (isColdSeason()){
		season = 'cold season.'
	}
	var numAdults = (Object.keys(population)).length
	var numKids = (Object.keys(children)).length

	message+=season+'The tribe has '+numAdults+' adults and '+numKids+' children'
	message+= ' The '+currentLocationName+' game track is at '+ gameTrack[currentLocationName]
	return message
}
function nextSeason(){
	if (isColdSeason()){
		for (locationName in locations){
			modifier = locations[locationName]['game_track_recover']
			oldTrack = gameTrack[locationName]
			locations[locationName]['game_track'] -= modifier
			if (gameTrack[locationName]< 0){
				gameTrack[locationName] = 0
			}
			console.log(locationName+' game_track moves from '+oldTrack+' to '+gameTrack[locationName])
		}
	}
	seasonCounter += 1
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

function saveGameState(){
	fs.writeFile("population.json", JSON.stringify(population), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done saving population"); // Success
	}); 
	
	fs.writeFile("children.json", JSON.stringify(children), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done writing children"); // Success \
	}); 
	fs.writeFile("referees.json", JSON.stringify(referees), err => { 
		// Checking for errors 
		if (err) throw err;  
		console.log("Done writing referees"); // Success \
	}); 
}

function processMessage(msg){
	author = msg.author
	actor = author.username
	bits = msg.content.split(' ')
	command = bits[0]
	command = command.toLowerCase().substring(1) // strip out the leading !
	console.log('command:'+command+' bits:'+bits+' actor:'+actor )  

	if (command == 'join'){
		 addToPopulation(msg, author, bits, actor, author)
	}
	if (!population[actor]  && !referees.includes(actor)){
		msg.author.send('You must join the tribe use commands: join <hunter|gatherer|crafter> <male|female> ')
		// disabled for alpha testing
		// return
	}
	player = population[actor]
	handleCommand(msg, author, player,  command, bits)

	return	
}

function personByName(name){
	if (population[name] != null){
		return population[name]
	}
	if (population[name.username] != null){
		return population[name.username]
	}

	console.log("No such person in population:"+name)
	return null
}
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function chanceRoll(msg){
	msg.reply('Do a chance roll!')
	return
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
function handleCommand(msg, author, player, command, bits){
	actor = author.username
	// list commands
	if (command === 'help'){
		text = ''
		text+='Player commands\n'
		text+=' !list (show inventory and character info)\n'
		text+=' !inventory (show inventory and character info)\n'
		text+=' !children (shows the children ages and food status)\n'
		text+=' !foodcheck (examine the food situation for every adult and living child'
		text+='\n-=Work Round Commands=-'
		text+=' !hunt'
		text+=' !gather'
		text+=' !craft <spearhead|basket>'
		text+=' !assist <hunter>'
		text+='\n-=Food Round Commands=-'
		text+=' !give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' !feed <amt> <food|grain> <childName>\n'
		text+='\n-=Reproduction Round Commands=-'
		text+=' !cuddle <target> (attempt to mate; if target reciprocates, make sure the referee notices'

		msg.author.send( text)

		if (referees.includes(actor)){
			text+='\nReferee Commands\n'
			text+=' edit target <canCraft|isNursing|isPregnant|profession|gender|partner|worked|food|grain> <value>\n' 
			text+=' award <amt> <food|grain|spearhead|basket> <player>\n'
			text+=' list <player>  (no arg lists all players)\n '
			text+=' induct|banish <player> add a member to the tribe\n'
			text+=' promote|demote <player> to the ref list\n'
			text+=' save the game file (automatically done at the start of every work round)\n'
			text+=' load the saved file\n'
			text+=' spawn <mother> <father>  add a child with parents\n'
			text+=' startwork (begins the work round, enabling work attempts and rolls;)'
			text+=' startfood (ends the work round; subtract food/grain; birth; child age increase)'
			text+=' startreproduction'
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
	if (command == 'cuddle'){
		if (reproductionRound != true){
			msg.author.send('Wait for the reproduction round ')
			return
		}
		target = bits[1]
		person = personByName(target)
		actingPerson = personByName(actor)
		if (!person){
			targetObject = msg.mentions.users.first()
			if (targetObject){
				person = personByName(targetObject.username)
			}
		}
		if (!person){
			msg.author.send('could not find person '+target)
			return
		}
		if (person.isPregnant){
			msg.author.send(target +' is already pregnant ')
			return
		}
		if (person.gender == actingPerson.gender){
			msg.author.send(target +' is the same gender as you')
			return
		}
		msg.reply(actor+' attempts to cuddle with '+target)
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
			if (player.watching && player.watching.leastWatched > 0){
				msg.author.send('You can not go hunting while watching '+player.watching)
				return
			}
			message = hunt(author.username, player, roll(3))
			msg.reply( message )
			return	
		}
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
		if(reproductionRound == false){
			msg.author.send('Can only go to work from reproduction')
			return 
		}
		saveGameState()
		// advance the calendar; the if should only skip on the 0->1 transition
		if (workRound == false){
			nextSeason()
		}
		chanceRoll(msg)
		message = gameState()
		msg.reply(message)
		msg.reply('\nStarting the work round.  Hunt, gather, or craft')
		workRound = true
		foodRound = false
		reproductionRound = false
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
		msg.reply('Starting the food and trading round.  Make sure everyone has enough to eat, or they will starve')
		workRound = false
		foodRound = true
		reproductionRound = false
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
		// actually consume food here
		foodMessage = consumeFood()
		msg.reply(foodMessage)
		msg.reply('Starting the Reproduction round; invite other tribe members to reproduce (not automated)')
		msg.reply(' The tribe can decide to move to a new location, but the injured and children under 2 will need 2 food')
		workRound = false
		foodRound = false
		reproductionRound = true
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
				corpse = deceasedPeople[i]
				console.log('leaving the corpse '+corpse)
				response+= " "+corpse
				delete population[corpse]
			}
			perishedCount = deceasedChildren.length;
			for (var i = 0; i < perishedCount; i++) {
				corpse = deceasedChildren[i]
				console.log('removing corpse '+corpse)
				response+= " "+corpse
				delete children[corpse]
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
		msg.reply(leastWatchedName+' is the least watched child. ' )
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
			msg.author.send('You are already watching a lot of children: '+person.watching)
			return
		}
		childName = bits[1]
		child = children[childName]
		if (!child ){
			msg.author.send('Could not find child: '+childName)
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
			return		
		}
		person = population[actor]
		childName = bits[1]
		child = children[childName]
		if (!person.watching || person.watching.indexOf(childName) == -1 ){
			msg.author.send('You are not watching '+childName)
			return
		}
		if (workRound == true){
			msg.author.send('Can not change watch status during the work round')
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
			return
		}
		if (bits.length != 4){
			msg.author.send('editchild <childname> <attribute> <value>')
			return		
		}
		childName = bits[1]
		attribute = bits[2]
		value = bits[3]
		child = children[childName]
		if (!child){
			msg.author.send('Could not find '+childName)
			return
		}
		if (!childProperties.includes(attribute)){
			msg.author.send('Legal properties to set are '+childProperties)
			return
		}
		if (attribute == 'mother'|| attribute == 'father' || attribue == 'guardian'){
			parent = population[value]
			if (!parent){
				msg.author.send('Could not find tribemember '+value)
				return
			}
		}
		if ((attribute == 'age'|| attribute == 'food') && isNaN(value) ){
			msg.author.send('Food and age take number values '+value)
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
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		var target = msg.mentions.users.first()
		if (target instanceof Discord.User ){
			console.log('target is a user')
		} else {
			console.log('target is NOT a user')
		}
		key = bits[2]
		if (!member_properties.includes(key)){
			msg.author.send('Legal properties to set are '+member_properties)
			return
		}
		value = bits[3]
		console.log('edit '+target.username+' '+key+' '+value )
		if (population[target.username]){
			targetObj = population[target.username]
			targetObj[key] = value
			targetObj['handle'] = target
			message = target.username+ ' now has value '
			for (var type in targetObj) {
				if (Object.prototype.hasOwnProperty.call( targetObj, type)) {
					message+= ' '+type+' '+targetObj[type]
				}
			}
			msg.author.send(message)
			target.send(message)
			population[target.username] = targetObj
			return
		} else{
			msg.author.send(target.username+' is not in the tribe')
			return
		}
	}
	// save the game state to file
	if (command == 'save'){
		if (referees.includes(actor)){
			saveGameState()
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
	// give stuff to a user; refs can give unlimited amounts, others are limited.
	// targets aren't checked to make sure they are valid
	if (command === 'give'){
		if (! msg.mentions || ! msg.mentions.users || ! msg.mentions.users.first() ){
			msg.author.send(command+' requires at least one @target')
			return
		}
		if (foodRound == false){
			msg.author.send(command+' happens in the food round')
			return 			
		}
		var target = msg.mentions.users.first()
		var username = target.username
		amount = bits[1]
		type = bits[2]
		
		if (isNaN(amount) || ! types.includes(type)){
			msg.author.send('Give syntax is give  <amount> <food|grain|spearhead|basket> <recipient>')
			return
		}
		if (amount <= 0  ){
			msg.author.send('Can not give negative amounts')
			return
		}			
		if (!population[username] ) {
				msg.author.send('username is not living in the tribe')
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
			target.send(actor+' gave you '+amount+' '+type)
		} else {
			msg.author.send('You do not have that much '+type+': '+ population[actor][type])
		}
		return
	}
	if (command === 'award'){
		if (referees.includes(actor)){
			var target
			if (msg.mentions.users && msg.mentions.users.first() ){
				target = msg.mentions.users.first().username
			}
			amount = bits[1]
			type = bits[2]
			if (!target){ target = bits[3]}
			targetName = resolveTarget(target)
		
			if (isNaN(amount) || ! types.includes(type)){
				msg.author.send('award syntax is award <amount> <food|grain|spearhead|basket> <recipient>')
				return
			}
			if (!population[target] ) {
				msg.author.send('target is not living in the tribe')
				return
			}
			msg.reply(actor+' awarding '+amount+' '+type+' to '+target)
			if (msg.mentions.users && msg.mentions.users.first()){
				msg.reply('The game awards '+targetName+' with '+amount+' '+type)
			}
			if (!population[target][type]){
				population[target][type] = Number(amount)
			} else {
				population[target][type] += Number(amount)
			}         
		} else {
			msg.author.send('Only referees can award ')
		}
		return
	}
	if (command == 'inventory'){
		target = bits[1]
		person = personByName(target)
		if (!person || person == null){
			msg.author.send(target+' does not seem to be a person')
			return
		}
		message = target+' has: '
		message += person.food+' food, '
		message += person.grain+' grain, '
		if (person.basket > 0 ){
			message += person.basket+' baskets, '
		}
		if (person.spearhead > 0 ){
			message += person.spearhead+' spearhead, '
		}
		if (person.isPregnant){
			message += ' is pregnant'
		}
		if (person.isNursing){
			message += ' is nursing'
		}
		if (person.isInjured){
			message += ' is injured'
		}
		msg.author.send(message)
		msg.delete({timeout: 3000}); //delete command in 3sec 
		return
	}
	// how much stuff does the target have?  if used by ref with no args, list whole population
	if (command == 'list' || command == 'inventory'){
		msg.delete({timeout: 3000}); //delete command in 3sec 
		if (bits.length == 1){
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
				// list the actor
				if (population[actor]) {
					message = ''
					for (var type in population[actor]) {
						if (Object.prototype.hasOwnProperty.call( population[actor], type)) {
							message+= type+':'+population[actor][type]+', '
						}
					}
					msg.author.send(message)
					return
				}
			}
		}
		console.log('not a simple list')
		for (var i = 1; i < bits.length; i++){
			username = resolveTarget(bits[i])
			console.log(i+' '+username)
			if ( referees.includes(actor) || actor === username){
				message = username +' stats:'
				if (population[username]) {
					for (var type in population[username]) {
						if (Object.prototype.hasOwnProperty.call( population[username], type)) {
						message+= ' '+type+' '+population[username][type]
						}
					}
				} else {
					message+=' nothing'
				}
				msg.author.send(message)
			}
		}
		return
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
				response += ' age:'+child.age+ ' needs '+(2-child.food)+' food'
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
		if (bits.length != 4 ){
			msg.author.send('feed syntax is feed <amount> <food|grain> <childname>')
			return
		}
		childName = bits[3]
		amount = bits[1]
		type = bits[2]
		childFood = ['food', 'grain']
		childName = capitalizeFirstLetter(childName)
		if (isNaN(amount) || !childFood.includes(type) || ! (childName in children)){
			msg.author.send('feed syntax is feed <amount> <food|grain> <childname>')
			return
		}
		if (amount < 0 &&  !referees.includes(actor) ){
			msg.author.send('Only the referee can reduce amounts')
			return
		}
		if (!population[actor] && !referees.includes(actor)  ){
			// this makes sure the author is in the tribe
			msg.author.send("Children do not take food from strangers")
			return
		}		
		if (!children[childName]) {
			msg.author.send('no such child as '+childName)
			return
		}
		child = children[childName]
		if ( child.food >= 2 ){
			msg.author.send(childName+' has enough food already')
			return
		}
		if ( (child.food + amount) > 2 ){
			msg.author.send(childName+' does not need that much food')
			return
		}
		if ( child.newAdult && child.newAdult == true){
			msg.author.send(childName+' is all grown up and does not need food')
			return
		}
		if ( population[actor][type] >= amount){
			msg.reply(actor+' fed '+amount+' '+type+' to child '+childName)
			children[childName].food += Number(amount)
			population[actor].food -= Number(amount)
		} else {
			msg.author.send('You do not have that much '+type+': you only have '+ population[actor][type])
		}
		return
	} 
	if (command == 'scout'){
		message = "\n<===== Year "+(seasonCounter/2)+', '
		season = 'warm season.'
		if (isColdSeason()){
			season = 'cold season.'
		}
	}
	// add a child to tribe; args are parent names
	if (command === 'spawn'){
		if (bits.length < 3 || bits.length > 4){
			msg.author.send('usage: !spawn mother father <force>')
			return
		}
		if (! msg.mentions || ! msg.mentions.users){
			msg.author.send(command+' requires at least one @target')
			return
		}
		mother = msg.mentions.users.first().username
		father = msg.mentions.users.last().username
		if (!population[mother] || !population[father]){
			msg.author.send('Parents not found in tribe')
			return
		}
		if (population[mother].gender != 'female' || population[father].gender != "male"){
			msg.author.send("First parent must be female, last parent male")
			return
		}
		if (population[mother].isPregnant){
			msg.author.send(mother+' is already pregnant')
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
	population[child.mother].isPregnant = child.name
	return child
}
// convert the target to a string in Population, if possible
function resolveTarget(target){
	if (population[target]){
		return target;
	}
	if (target.username){
		return resolve (target.username)
	}
	console.log('not sure how to resolve this target:'+target)
	return 'elephant'
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
		if (person.isNursing && person.isPregnant){
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
		if (population[target].isNursing && population[target].isPregnant){
			// extra food issues here; mom needs 2 more food, or the child will die.
			population[target].food -= 2
			if (population[target].food < 0 ){
				// food is negative, so just add it to grain here
				population[target].grain = population[target].grain + population[target].food
				population[target].food = 0
				if (population[target].grain < 0){
					childname = population[target].isPregnant 
					child = 'foo'
					response += target+' lost her child '+child+' due to lack of food\n'
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
				if (population[child.mother] && population[child.mother].isPregnant ) {
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
				if (population[child.mother] && population[child.mother].isPregnant){
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
		delete population[corpse]
	}
	perishedCount = perishedChildren.length;
	for (var i = 0; i < perishedCount; i++) {
		corpse = perishedChildren[i]
		console.log('removing corpse '+corpse)
		delete children[corpse]
	}
	
	return response
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
	gatherData = locations[currentLocationName]['gather']
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
	if (player.profession != 'crafter'){
		roll_value -= 1
	}
	if (roll_value > 1 && type == 'basket'){
			player.basket += 1
	} else if (roll_value > 2 && type == 'spearhead') {		
			player.spearhead += 1
	} else {
		return 'crafts a worthless '+type
	}
	return ' crafts a '+type
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
		if (netRoll > locationDecay[locations[currentLocationName]['game_track']]){
			message += ' (less game found)'
			netRoll = locationDecay[locations[currentLocationName]['game_track']]
		}
		huntData = locations[currentLocationName]['hunt']
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
	var oldTrack = gameTrack[currentLocationName]
	gameTrack[currentLocationName] += huntercount
	console.log('Game Track for '+currentLocationName+' advanced from '+oldTrack+' to '+gameTrack[currentLocationName])
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
  })   
bot.login(auth['token'])
